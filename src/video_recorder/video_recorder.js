Scoped.define("module:Recorder.PixelSampleMixin", [], function() {
    return {

        lightLevel: function(samples) {
            samples = samples || 100;
            var total_light = 0.0;
            this._pixelSample(samples, function(r, g, b) {
                total_light += r + g + b;
            });
            return total_light / (3 * samples);
        },

        blankLevel: function(samples) {
            samples = samples || 100;
            var total_light = 0.0;
            this._pixelSample(samples, function(r, g, b) {
                total_light += Math.pow(r, 2) + Math.pow(g, 2) + Math.pow(b, 2);
            });
            return Math.sqrt(total_light / (3 * samples));
        },

        _materializePixelSample: function(sample) {
            var result = [];
            this._pixelSample(sample, function(r, g, b) {
                result.push([r, g, b]);
            });
            return result;
        },

        deltaCoefficient: function(samples) {
            samples = samples || 100;
            var current = this._materializePixelSample(samples);
            if (!this.__deltaSample) {
                this.__deltaSample = current;
                return null;
            }
            var delta_total = 0.0;
            for (var i = 0; i < current.length; ++i)
                for (var j = 0; j < 3; ++j)
                    delta_total += Math.pow(current[i][j] - this.__deltaSample[i][j], 2);
            this.__deltaSample = current;
            return Math.sqrt(delta_total / (3 * samples));
        }

    };
});

Scoped.define("module:Recorder.VideoRecorderWrapper", [
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

            cameraWidth: function() {
                return this._options.recordingWidth;
            },

            cameraHeight: function() {
                return this._options.recordingHeight;
            },

            lightLevel: function() {},
            soundLevel: function() {},
            testSoundLevel: function(activate) {},
            blankLevel: function() {},
            deltaCoefficient: function() {},

            getVolumeGain: function() {},
            setVolumeGain: function(volumeGain) {},

            enumerateDevices: function() {},
            currentDevices: function() {},
            setCurrentDevices: function(devices) {},
            setCameraFace: function(faceFront) {},

            addMultiStream: function(device, options) {},
            updateMultiStreamPosition: function(x, y, w, h) {},
            reverseCameraScreens: function() {},

            createSnapshot: function() {},
            removeSnapshot: function(snapshot) {},
            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {},
            updateSnapshotDisplay: function(snapshot, display, x, y, w, h) {},
            removeSnapshotDisplay: function(display) {},
            createSnapshotUploader: function(snapshot, type, uploaderOptions) {},

            startRecord: function(options) {},
            pauseRecord: function() {},
            resumeRecord: function() {},
            stopRecord: function(options) {},

            errorHandler: function(error) {},

            isWebrtcStreaming: function() {
                return false;
            },

            canPause: function() {
                return false;
            },

            supportsLocalPlayback: function() {
                return false;
            },

            supportsCameraFace: function() {
                return false;
            },

            snapshotToLocalPoster: function(snapshot) {
                return null;
            },

            localPlaybackSource: function() {
                return null;
            },

            averageFrameRate: function() {
                return null;
            },

            recordDelay: function(opts) {
                return 0;
            }

        };
    }], {

        _initializeOptions: function(options) {
            return Objs.extend({
                recordingWidth: 640,
                recordingHeight: 480,
                recordVideo: true,
                recordAudio: true
            }, options);
        }

    });
});


Scoped.define("module:Recorder.WebRTCVideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.Support",
    "module:WebRTC.AudioAnalyser",
    "browser:Dom",
    "browser:Info",
    "base:Time",
    "base:Objs",
    "base:Timers.Timer",
    "base:Comparators",
    "browser:Upload.FileUploader",
    "browser:Upload.MultiUploader",
    "base:Promise"
], function(VideoRecorderWrapper, RecorderWrapper, Support, AudioAnalyser, Dom, Info, Time, Objs, Timer, Comparators, FileUploader, MultiUploader, Promise, scoped) {
    return VideoRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "video")
                    this._element = Dom.changeTag(this._element, "video");
                this._recorder = RecorderWrapper.create({
                    video: this._element,
                    flip: !!this._options.flip,
                    flipscreen: !!this._options.flipscreen,
                    framerate: this._options.framerate,
                    recordVideo: this._options.recordVideo,
                    recordFakeVideo: !this._options.recordVideo,
                    recordAudio: this._options.recordAudio,
                    recordResolution: {
                        width: this._options.recordingWidth,
                        height: this._options.recordingHeight
                    },
                    resizeMode: this._options.resizeMode,
                    videoBitrate: this._options.videoBitrate,
                    audioBitrate: this._options.audioBitrate,
                    webrtcStreaming: this._options.webrtcStreaming,
                    webrtcStreamingIfNecessary: this._options.webrtcStreamingIfNecessary,
                    localPlaybackRequested: this._options.localPlaybackRequested,
                    screen: this._options.screen,
                    getDisplayMediaSupported: typeof navigator.mediaDevices.getDisplayMedia !== 'undefined',
                    fittodimensions: this._options.fittodimensions
                });
                this._recorder.on("bound", function() {
                    if (this._analyser)
                        this.testSoundLevel(true);
                }, this);
                this._recorder.on("error", function(errorName, errorData) {
                    this.trigger("error", errorName, errorData);
                }, this);
                this._recorder.on("mainvideostreamended", function() {
                    this.trigger("mainvideostreamended");
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

            lightLevel: function() {
                return this._recorder.lightLevel();
            },

            blankLevel: function() {
                return this._recorder.blankLevel();
            },

            getVolumeGain: function() {
                return this._recorder.getVolumeGain();
            },

            setVolumeGain: function(volumeGain) {
                this._recorder.setVolumeGain(volumeGain);
            },

            deltaCoefficient: function() {
                return this._recorder.deltaCoefficient();
            },

            isWebrtcStreaming: function() {
                return this._recorder.isWebrtcStreaming();
            },

            canPause: function() {
                return this._recorder.canPause();
            },

            soundLevel: function() {
                if (!this._analyser && this._recorder && this._recorder.stream() && AudioAnalyser.supported())
                    this._analyser = new AudioAnalyser(this._recorder.stream());
                // Just so unsupported analysers don't lead to displaying that the microphone is not working
                return this._analyser ? this._analyser.soundLevel() : 1.1;
            },

            testSoundLevel: function(activate) {
                if (this._analyser) {
                    this._analyser.weakDestroy();
                    delete this._analyser;
                }
                if (activate && AudioAnalyser.supported())
                    this._analyser = new AudioAnalyser(this._recorder.stream());
            },

            currentDevices: function() {
                return {
                    video: this._currentVideo,
                    audio: this._currentAudio
                };
            },

            /**
             * Promise which will return available devices with their counts also will set
             * current video and audio devices for the recorder
             * @return {*}
             */
            enumerateDevices: function() {
                return Support.enumerateMediaSources().success(function(result) {

                    this._detectCurrentDeviceId(result.video, result.videoCount, true);
                    this._detectCurrentDeviceId(result.audio, result.audioCount, false);

                    var timer = this.auto_destroy(new Timer({
                        start: true,
                        delay: 100,
                        context: this,
                        destroy_on_stop: true,
                        fire: function() {
                            if (this._currentVideo && this._currentAudio) {
                                this.trigger("currentdevicesdetected", {
                                    video: this._currentVideo,
                                    audio: this._currentAudio
                                });
                                timer.stop();
                            }
                        }
                    }));

                }, this);
            },

            /**
             * Will Recorder function to bind all Streams
             *
             * @param {object} device
             * @param {object} options
             */
            addMultiStream: function(device, options) {
                return this._recorder.addNewSingleStream(device, options);
            },

            /**
             * Update small stream screen dimensions
             *
             * @param x
             * @param y
             * @param w
             * @param h
             * @return {*|void}
             */
            updateMultiStreamPosition: function(x, y, w, h) {
                return this._recorder.updateMultiStreamPosition(x, y, w, h);
            },


            /**
             * Will switch between video screen in multiple stream recorder
             * @return {*|void}
             */
            reverseCameraScreens: function() {
                return this._recorder.reverseVideos();
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.video)
                    this._recorder.selectCamera(devices.video);
                if (devices && devices.audio)
                    this._recorder.selectMicrophone(devices.audio);
            },

            setCameraFace: function(faceFront) {
                if (Info.isMobile())
                    this._recorder.selectCameraFace(faceFront);
            },

            createSnapshot: function(type) {
                return this._recorder.createSnapshot(type);
            },

            removeSnapshot: function(snapshot) {},

            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {
                var url = Support.globals().URL.createObjectURL(snapshot);
                var image = document.createElement("img");
                image.style.position = "absolute";
                this.updateSnapshotDisplay(snapshot, image, x, y, w, h);
                image.src = url;
                if (parent.tagName.toLowerCase() === "video")
                    Dom.elementInsertAfter(image, parent);
                else
                    Dom.elementPrependChild(parent, image);
                return image;
            },

            updateSnapshotDisplay: function(snapshot, image, x, y, w, h) {
                image.style.left = x + "px";
                image.style.top = y + "px";
                image.style.width = w + "px";
                image.style.height = h + "px";
            },

            removeSnapshotDisplay: function(image) {
                image.remove();
            },

            createSnapshotUploader: function(snapshot, type, uploaderOptions) {
                return FileUploader.create(Objs.extend({
                    source: snapshot
                }, uploaderOptions));
            },

            startRecord: function(options) {
                this.__localPlaybackSource = null;
                return this._recorder.startRecord(options);
            },

            pauseRecord: function() {
                return this._recorder.pauseRecord();
            },

            resumeRecord: function() {
                return this._recorder.resumeRecord();
            },

            stopRecord: function(options) {
                var promise = Promise.create();
                this._recorder.once("data", function(videoBlob, audioBlob, noUploading) {
                    this.__localPlaybackSource = {
                        src: videoBlob,
                        audiosrc: audioBlob
                    };
                    var multiUploader = new MultiUploader();
                    if (!this._options.simulate && !noUploading) {
                        if (videoBlob) {
                            multiUploader.addUploader(FileUploader.create(Objs.extend({
                                source: videoBlob
                            }, options.video)));
                        }
                        if (audioBlob) {
                            multiUploader.addUploader(FileUploader.create(Objs.extend({
                                source: audioBlob
                            }, options.audio)));
                        }
                    }
                    promise.asyncSuccess(multiUploader);
                }, this);
                this._recorder.stopRecord();
                return promise;
            },

            supportsLocalPlayback: function() {
                return !(Info.isSafari() && this.isWebrtcStreaming()) && !!this.__localPlaybackSource.src;
            },

            supportsCameraFace: function() {
                return Info.isMobile();
            },

            snapshotToLocalPoster: function(snapshot) {
                return snapshot;
            },

            localPlaybackSource: function() {
                return this.__localPlaybackSource;
            },

            averageFrameRate: function() {
                return this._recorder.averageFrameRate();
            },

            _softwareDependencies: function() {
                if (!this._options.screen || (this._options.screen && typeof navigator.mediaDevices.getDisplayMedia !== 'undefined') || Support.globals().supportedConstraints.mediaSource)
                    return Promise.value(true);
                var ext = Support.chromeExtensionExtract(this._options.screen);
                var err = [{
                    title: "Screen Recorder Extension",
                    execute: function() {
                        window.open(ext.extensionInstallLink);
                    }
                }];
                var pingTest = Time.now();
                return Support.chromeExtensionMessage(ext.extensionId, {
                    type: "ping",
                    data: pingTest
                }).mapError(function() {
                    return err;
                }).mapSuccess(function(pingResponse) {
                    if (pingResponse && pingResponse.type === "success" && pingResponse.data === pingTest)
                        return true;
                    return Promise.error(err);
                });
            },

            /**
             * Reason why set this._currentVideo & _currentAudio based on return value is that Firefox returns 'undefined'
             * before waiting Objs.iter methods callback
             * @param devices
             * @param devicesCount
             * @param isVideo
             * @return {*}
             * @private
             */
            _detectCurrentDeviceId: function(devices, devicesCount, isVideo) {
                var _currentDeviceTrack, _currentDeviceSettings, _counter;
                if (isVideo) {
                    _currentDeviceTrack = this._recorder._videoTrack;
                    _currentDeviceSettings = this._recorder._videoTrackSettings;
                } else {
                    _currentDeviceTrack = this._recorder._audioTrack;
                    _currentDeviceSettings = this._recorder._audioTrackSettings;
                }

                // First will check if browser could provide device ID via device settings
                if (_currentDeviceSettings && _currentDeviceTrack) {
                    if (_currentDeviceSettings.deviceId && devices[_currentDeviceSettings.deviceId]) {
                        if (isVideo)
                            this._currentVideo = devices[_currentDeviceSettings.deviceId].id;
                        else
                            this._currentAudio = devices[_currentDeviceSettings.deviceId].id;
                        return devices[_currentDeviceSettings.deviceId].id;
                    }
                    // If browser can provide label of the current device will compare based on label
                    else if (_currentDeviceTrack.label) {
                        _counter = 1;
                        Objs.iter(devices, function(device, index) {
                            // If determine label will return device ID
                            if (Comparators.byValue(device.label, _currentDeviceTrack.label) === 0) {
                                if (isVideo)
                                    this._currentVideo = index;
                                else
                                    this._currentAudio = index;
                                return index;
                            }

                            if (_counter >= devicesCount) {
                                if (isVideo)
                                    this._currentVideo = Objs.ithKey(devices);
                                else
                                    this._currentAudio = Objs.ithKey(devices);
                                return Objs.ithKey(devices);
                            }

                            _counter++;
                        }, this);
                    } else {
                        if (isVideo)
                            this._currentVideo = Objs.ithKey(devices);
                        else
                            this._currentAudio = Objs.ithKey(devices);
                        return Objs.ithKey(devices);
                    }
                } else {
                    if (isVideo)
                        this._currentVideo = Objs.ithKey(devices);
                    else
                        this._currentAudio = Objs.ithKey(devices);
                    return Objs.ithKey(devices);
                }
            },

            errorHandler: function(error) {
                return Support.errorHandler(error);
            }
        };
    }, {

        supported: function(options) {
            if (!RecorderWrapper.anySupport(options))
                return false;
            if (options.screen) {
                if ((Info.isChrome() || Info.isFirefox() || Info.isOpera()) && typeof navigator.mediaDevices.getDisplayMedia !== 'undefined')
                    return true;
                if (Support.globals().supportedConstraints.mediaSource && Info.isFirefox() && Info.firefoxVersion() > 55)
                    return true;
                if (Info.isChrome() && options.screen.chromeExtensionId)
                    return true;
                if (Info.isOpera() && options.screen.operaExtensionId)
                    return true;
                return false;
            }
            return true;
        }

    });
});




Scoped.extend("module:Recorder.WebRTCVideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:Recorder.WebRTCVideoRecorderWrapper"
], function(VideoRecorderWrapper, WebRTCVideoRecorderWrapper) {
    VideoRecorderWrapper.register(WebRTCVideoRecorderWrapper, 2);
    return {};
});
