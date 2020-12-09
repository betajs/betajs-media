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

            isWebrtcStreaming: function() {
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
                    webrtcStreamingIfNecessary: this._options.webrtcStreamingIfNecessary,
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

            isWebrtcStreaming: function() {
                return this._recorder.isWebrtcStreaming();
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
            if (!RecorderWrapper.anySupport(options))
                return false;
            return true;
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