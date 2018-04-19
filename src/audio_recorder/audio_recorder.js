Scoped.define("module:AudioRecorder.AudioRecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Promise"
], function(ConditionalInstance, EventsMixin, Objs, Promise, scoped) {
    return ConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                this._element = this._options.element;
                this.ready = Promise.create();
            },

            destroy: function() {
                inherited.destroy.call(this);
            },

            bindMedia: function() {
                return this._bindMedia();
            },

            _bindMedia: function() {},

            unbindMedia: function() {
                return this._unbindMedia();
            },

            _unbindMedia: function() {},

            softwareDependencies: function() {
                return this._softwareDependencies();
            },

            _softwareDependencies: function() {},

            soundLevel: function() {},
            testSoundLevel: function(activate) {},

            getVolumeGain: function() {},
            setVolumeGain: function(volumeGain) {},

            enumerateDevices: function() {},
            currentDevices: function() {},
            setCurrentDevices: function(devices) {},

            startRecord: function(options) {},
            stopRecord: function(options) {},

            isFlash: function() {
                return false;
            },

            supportsLocalPlayback: function() {
                return false;
            },

            localPlaybackSource: function() {
                return null;
            },

            recordDelay: function(opts) {
                return 0;
            }

        };
    }], {

        _initializeOptions: function(options) {
            return Objs.extend({
                forceflash: false,
                noflash: false,
                recordVideo: false,
                recordAudio: true
            }, options);
        }

    });
});


Scoped.define("module:AudioRecorder.WebRTCAudioRecorderWrapper", [
    "module:AudioRecorder.AudioRecorderWrapper",
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.Support",
    "module:WebRTC.AudioAnalyser",
    "browser:Dom",
    "browser:Info",
    "base:Time",
    "base:Objs",
    "browser:Upload.FileUploader",
    "browser:Upload.MultiUploader",
    "base:Promise"
], function(AudioRecorderWrapper, RecorderWrapper, Support, AudioAnalyser, Dom, Info, Time, Objs, FileUploader, MultiUploader, Promise, scoped) {
    return AudioRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "audio")
                    this._element = Dom.changeTag(this._element, "audio");
                this._recorder = RecorderWrapper.create({
                    video: this._element,
                    recordVideo: false,
                    recordAudio: this._options.recordAudio,
                    audioBitrate: this._options.audioBitrate,
                    webrtcStreaming: this._options.webrtcStreaming,
                    localPlaybackRequested: this._options.localPlaybackRequested
                });
                this._recorder.on("bound", function() {
                    if (this._analyser)
                        this.testSoundLevel(true);
                }, this);
                this._recorder.on("error", function(errorName, errorData) {
                    this.trigger("error", errorName, errorData);
                }, this);
                this.ready.asyncSuccess(true);
            },

            destroy: function() {
                if (this._analyser)
                    this._analyser.weakDestroy();
                this._recorder.destroy();
                inherited.destroy.call(this);
            },

            recordDelay: function(opts) {
                return this._recorder.recordDelay(opts);
            },

            _bindMedia: function() {
                return this._recorder.bindMedia();
            },

            _unbindMedia: function() {
                return this._recorder.unbindMedia();
            },

            getVolumeGain: function() {
                return this._recorder.getVolumeGain();
            },

            setVolumeGain: function(volumeGain) {
                this._recorder.setVolumeGain(volumeGain);
            },

            soundLevel: function() {
                if (!this._analyser && this._recorder && this._recorder.stream())
                    this._analyser = new AudioAnalyser(this._recorder.stream());
                return this._analyser ? this._analyser.soundLevel() : 0.0;
            },

            testSoundLevel: function(activate) {
                if (this._analyser) {
                    this._analyser.weakDestroy();
                    delete this._analyser;
                }
                if (activate)
                    this._analyser = new AudioAnalyser(this._recorder.stream());
            },

            currentDevices: function() {
                return {
                    audio: this._currentAudio
                };
            },

            enumerateDevices: function() {
                return Support.enumerateMediaSources().success(function(result) {
                    if (!this._currentAudio)
                        this._currentAudio = Objs.ithKey(result.audio);
                }, this);
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.audio)
                    this._recorder.selectMicrophone(devices.audio);
            },

            startRecord: function(options) {
                this.__localPlaybackSource = null;
                return this._recorder.startRecord(options);
            },

            stopRecord: function(options) {
                var promise = Promise.create();
                this._recorder.once("data", function(videoBlob, audioBlob, noUploading) {
                    this.__localPlaybackSource = {
                        src: audioBlob || videoBlob
                    };
                    var multiUploader = new MultiUploader();
                    if (!this._options.simulate && !noUploading) {
                        if (videoBlob) {
                            multiUploader.addUploader(FileUploader.create(Objs.extend({
                                source: audioBlob || videoBlob
                            }, options.audio)));
                        }
                    }
                    promise.asyncSuccess(multiUploader);
                }, this);
                this._recorder.stopRecord();
                return promise;
            },

            supportsLocalPlayback: function() {
                return !!this.__localPlaybackSource.src;
            },

            localPlaybackSource: function() {
                return this.__localPlaybackSource;
            },

            _softwareDependencies: function() {
                return Promise.value(true);
            }

        };
    }, {

        supported: function(options) {
            if (options.forceflash)
                return false;
            if (!RecorderWrapper.anySupport(options))
                return false;
            return true;
        }

    });
});



Scoped.define("module:AudioRecorder.FlashAudioRecorderWrapper", [
    "module:AudioRecorder.AudioRecorderWrapper",
    "module:Flash.FlashAudioRecorder",
    "browser:Dom",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "browser:Upload.CustomUploader",
    "browser:Upload.MultiUploader"
], function(AudioRecorderWrapper, FlashAudioRecorder, Dom, Info, Promise, Objs, Timer, CustomUploader, MultiUploader, scoped) {
    return AudioRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "div")
                    this._element = Dom.changeTag(this._element, "div");
                this._recorder = new FlashAudioRecorder(this._element, {
                    microphonecodec: this._options.rtmpMicrophoneCodec,
                    audioRate: this._options.audioBitrate ? Math.floor(this._options.audioBitrate / 1000) : undefined
                });
                this._recorder.ready.forwardCallback(this.ready);
                this._recorder.on("require_display", function() {
                    this.trigger("require_display");
                }, this);
                this._recorder.on("endpoint_connectivity", function(endpoint, connectivity) {
                    this.trigger("endpoint_connectivity", endpoint, connectivity);
                }, this);
            },

            destroy: function() {
                this._recorder.destroy();
                inherited.destroy.call(this);
            },

            _bindMedia: function() {
                return this._recorder.bindMedia(this._options.flashFullSecurityDialog);
            },

            _unbindMedia: function() {
                return this._recorder.unbindMedia();
            },

            soundLevel: function() {
                var sl = this._recorder.soundLevel();
                return sl <= 1 ? 1.0 : (1.0 + (sl - 1) / 100);
            },

            getVolumeGain: function() {
                return this._recorder.getVolumeGain();
            },

            setVolumeGain: function(volumeGain) {
                this._recorder.setVolumeGain(volumeGain);
            },

            testSoundLevel: function(activate) {
                this._recorder.testSoundLevel(activate);
            },

            enumerateDevices: function() {
                var result = this._recorder.enumerateDevices();
                return Promise.value({
                    audioCount: Objs.count(result.audios),
                    audio: Objs.map(result.audios, function(value, key) {
                        return {
                            id: key,
                            label: value
                        };
                    })
                });
            },

            currentDevices: function() {
                return {
                    audio: this._recorder.currentMicrophone()
                };
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.audio)
                    this._recorder.selectMicrophone(devices.audio);
            },

            startRecord: function(options) {
                if (this._options.simulate)
                    return Promise.value(true);
                var self = this;
                var ctx = {};
                var promise = Promise.create();
                this._recorder.on("recording", function() {
                    promise.asyncSuccess();
                    self._recorder.off(null, null, ctx);
                }, ctx).on("error", function(s) {
                    promise.asyncError(s);
                    self._recorder.off(null, null, ctx);
                }, ctx);
                this._recorder.startRecord(options.rtmp);
                return promise;
            },

            stopRecord: function(options) {
                if (this._options.simulate)
                    return Promise.value(new MultiUploader());
                var self = this;
                var ctx = {};
                var uploader = new CustomUploader();
                var timer = null;
                timer = new Timer({
                    delay: 100,
                    context: this,
                    fire: function() {
                        if (!this._recorder || this._recorder.destroyed()) {
                            timer.destroy();
                            return;
                        }
                        var status = this._recorder.uploadStatus();
                        uploader.progressCallback(status.total - status.remaining, status.total);
                    }
                });
                this._recorder.on("finished", function() {
                    uploader.successCallback(true);
                    self._recorder.off(null, null, ctx);
                    timer.weakDestroy();
                }, ctx).on("error", function(s) {
                    uploader.errorCallback(s);
                    self._recorder.off(null, null, ctx);
                    timer.weakDestroy();
                }, ctx);
                this._recorder.stopRecord();
                return Promise.create(uploader);
            },

            isFlash: function() {
                return true;
            },

            _softwareDependencies: function() {
                return Info.flash().installed() ? Promise.value(true) : Promise.error([{
                    "title": "Adobe Flash",
                    "execute": function() {
                        window.open("https://get.adobe.com/flashplayer");
                    }
                }]);
            }

        };
    }, {

        supported: function(options) {
            return !Info.isMobile() && !options.noflash && Info.flash().supported() && !options.screen;
        }

    });
});


Scoped.extend("module:AudioRecorder.AudioRecorderWrapper", [
    "module:AudioRecorder.AudioRecorderWrapper",
    "module:AudioRecorder.WebRTCAudioRecorderWrapper"
], function(AudioRecorderWrapper, WebRTCAudioRecorderWrapper) {
    AudioRecorderWrapper.register(WebRTCAudioRecorderWrapper, 2);
    return {};
});


Scoped.extend("module:AudioRecorder.AudioRecorderWrapper", [
    "module:AudioRecorder.AudioRecorderWrapper",
    "module:AudioRecorder.FlashAudioRecorderWrapper"
], function(AudioRecorderWrapper, FlashAudioRecorderWrapper) {
    AudioRecorderWrapper.register(FlashAudioRecorderWrapper, 1);
    return {};
});