Scoped.define("module:WebRTC.MediaRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Functions",
    "base:Promise",
    "browser:Info",
    "module:WebRTC.Support",
    "base:Async"
], function(Class, EventsMixin, Functions, Promise, Info, Support, Async, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(stream, options) {
                options = options || {};
                inherited.constructor.call(this);
                this._stream = stream;
                this._started = false;
                var MediaRecorder = Support.globals().MediaRecorder;
                /*
                 * This is supposed to work according to the docs, but it is not:
                 *
                 * https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder#Example
                 */
                var mediaRecorderOptions = {
                    mimeType: ""
                };
                //mediaRecorderOptions.mimeType = "video/mp4";
                try {
                    if (options.audioonly) {
                        if (MediaRecorder.isTypeSupported('audio/mp3')) {
                            mediaRecorderOptions = {
                                mimeType: 'audio/mp3'
                            };
                        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                            mediaRecorderOptions = {
                                mimeType: 'audio/ogg;codecs=opus'
                            };
                        }
                    } else {
                        if (typeof MediaRecorder.isTypeSupported === "undefined") {
                            mediaRecorderOptions = {
                                mimeType: 'video/webm'
                            };
                        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                            mediaRecorderOptions = {
                                mimeType: 'video/webm;codecs=vp9'
                            };
                        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8') && (Info.isFirefox() && Info.firefoxVersion() < 71)) {
                            // https://bugzilla.mozilla.org/show_bug.cgi?id=1594466
                            // firefox71 + fixed
                            mediaRecorderOptions = {
                                mimeType: 'video/webm;codecs=vp8' + (Info.isFirefox() && Info.firefoxVersion() >= 71 ? ",opus" : "")
                            };
                        } else if (MediaRecorder.isTypeSupported('video/webm')) {
                            mediaRecorderOptions = {
                                mimeType: 'video/webm'
                            };
                        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                            // Safari should support webm format after macOS Big Sur 11.3
                            mediaRecorderOptions = {
                                mimeType: 'video/mp4'
                            };
                        }
                    }
                } catch (e) {
                    mediaRecorderOptions = {};
                }
                if (options.videoBitrate)
                    mediaRecorderOptions.videoBitsPerSecond = options.videoBitrate * 1000;
                if (options.audioBitrate)
                    mediaRecorderOptions.audioBitsPerSecond = options.audioBitrate * 1000;
                this.__audioonly = options.audioonly;
                this.__mediaRecorderOptions = mediaRecorderOptions;
                this._mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
                this._mediaRecorder.ondataavailable = Functions.as_method(this._dataAvailable, this);
                this._mediaRecorder.onstop = Functions.as_method(this._dataStop, this);
                this._mediaRecorder.onpause = Functions.as_method(this._hasPaused, this);
                this._mediaRecorder.onresume = Functions.as_method(this._hasResumed, this);
                this._mediaRecorder.onstart = Functions.as_method(this._recorderStarted, this);
                this._mediaRecorder.onerror = Functions.as_method(this.onErrorMethod, this);
            },

            _recorderStarted: function(ev) {
                this._started = true;
                this.trigger("started");
                this._startRecPromise.asyncSuccess();
            },

            onErrorMethod: function(err) {
                this._startRecPromise.asyncError(err);
                this.trigger("error", err);
            },


            destroy: function() {
                this.stop();
                inherited.destroy.call(this);
            },

            start: function() {
                if (this._started)
                    return Promise.value(true);
                this._startRecPromise = Promise.create();
                this._chunks = [];
                // Safari Release 73 implemented non-timeslice mode encoding for MediaRecorder
                // https://developer.apple.com/safari/technology-preview/release-notes/
                this._mediaRecorder.start(10);
                if (Info.isSafari() && !("onstart" in MediaRecorder.prototype)) {
                    this._started = true;
                    this.trigger("started");
                    Async.eventually(function() {
                        if (this._mediaRecorder.state === 'recording') {
                            this._startRecPromise.asyncSuccess();
                        } else {
                            this._startRecPromise.asyncError('Could not start recording');
                        }
                    }, this, 1000);
                }
                return this._startRecPromise;
            },

            pause: function() {
                if (this._paused || !this._started)
                    return;
                this._paused = true;
                this._mediaRecorder.pause();
                this.trigger("pause");
            },

            _hasPaused: function() {
                this.trigger("paused");
            },

            resume: function() {
                if (!this._paused || !this._started)
                    return;
                this._paused = false;
                this._mediaRecorder.resume();
                this.trigger("resume");
            },

            _hasResumed: function() {
                this.trigger("resumed");
            },

            stop: function() {
                if (!this._started)
                    return;
                this._started = false;
                this._mediaRecorder.stop();
                this.trigger("stopped");
            },

            _dataAvailable: function(e) {
                if (e.data && e.data.size > 0)
                    this._chunks.push(e.data);
            },

            _dataStop: function(e) {
                this._data = new Blob(this._chunks, {
                    type: (this.__mediaRecorderOptions.mimeType.split(";"))[0] || (this.__audioonly ? "audio/ogg" : "video/webm")
                });
                this._chunks = [];
                if (Info.isFirefox()) {
                    var self = this;
                    var fileReader = new FileReader();
                    fileReader.onload = function() {
                        self._data = new Blob([this.result], {
                            type: self._data.type
                        });
                        self.trigger("data", self._data);
                    };
                    fileReader.readAsArrayBuffer(this._data);
                } else
                    this.trigger("data", this._data);
            }

        };
    }], {

        supported: function() {
            if (!Support.globals().MediaRecorder)
                return false;
            if (document.location.href.indexOf("https://") !== 0 && document.location.hostname !== "localhost") {
                if (Info.isOpera() || Info.isChrome())
                    return false;
            }
            if (Info.isOpera() && Info.operaVersion() < 44)
                return false;
            if (Info.isChrome() && Info.chromeVersion() < 57)
                return false;
            return true;
        }

    });
});
