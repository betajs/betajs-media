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

            createSnapshot: function() {},
            removeSnapshot: function(snapshot) {},
            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {},
            updateSnapshotDisplay: function(snapshot, display, x, y, w, h) {},
            removeSnapshotDisplay: function(display) {},
            createSnapshotUploader: function(snapshot, type, uploaderOptions) {},

            startRecord: function(options) {},
            stopRecord: function(options) {},

            isFlash: function() {
                return false;
            },

            isWebrtcStreaming: function() {
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
                forceflash: false,
                noflash: false,
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
                    framerate: this._options.framerate,
                    recordVideo: this._options.recordVideo,
                    recordFakeVideo: !this._options.recordVideo,
                    recordAudio: this._options.recordAudio,
                    recordResolution: {
                        width: this._options.recordingWidth,
                        height: this._options.recordingHeight
                    },
                    videoBitrate: this._options.videoBitrate,
                    audioBitrate: this._options.audioBitrate,
                    webrtcStreaming: this._options.webrtcStreaming,
                    webrtcStreamingIfNecessary: this._options.webrtcStreamingIfNecessary,
                    localPlaybackRequested: this._options.localPlaybackRequested,
                    screen: this._options.screen
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

            soundLevel: function() {
                if (!this._analyser && this._recorder && this._recorder.stream() && AudioAnalyser.supported())
                    this._analyser = new AudioAnalyser(this._recorder.stream());
                return this._analyser ? this._analyser.soundLevel() : 0.0;
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
                return !!this.__localPlaybackSource.src;
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
                if (!this._options.screen || Support.globals().supportedConstraints.mediaSource)
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
            }
        };
    }, {

        supported: function(options) {
            if (options.forceflash)
                return false;
            if (!RecorderWrapper.anySupport(options))
                return false;
            if (options.screen) {
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



Scoped.define("module:Recorder.FlashVideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:Flash.FlashRecorder",
    "browser:Dom",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "browser:Upload.CustomUploader",
    "browser:Upload.MultiUploader"
], function(VideoRecorderWrapper, FlashRecorder, Dom, Info, Promise, Objs, Timer, CustomUploader, MultiUploader, scoped) {
    return VideoRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "div")
                    this._element = Dom.changeTag(this._element, "div");
                this._recorder = new FlashRecorder(this._element, {
                    flip: !!this._options.flip,
                    disableaudio: !this._options.recordAudio,
                    disablevideo: !this._options.recordVideo,
                    streamtype: this._options.rtmpStreamType,
                    camerawidth: this._options.recordingWidth,
                    cameraheight: this._options.recordingHeight,
                    microphonecodec: this._options.rtmpMicrophoneCodec,
                    fps: this._options.framerate,
                    audioRate: this._options.audioBitrate ? Math.floor(this._options.audioBitrate / 1000) : undefined,
                    videoRate: this._options.videoBitrate ? this._options.videoBitrate * 1000 : undefined
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

            blankLevel: function() {
                return this._recorder.blankLevel();
            },

            deltaCoefficient: function() {
                return this._recorder.deltaCoefficient();
            },

            lightLevel: function() {
                return this._recorder.lightLevel();
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
                    videoCount: Objs.count(result.videos),
                    audioCount: Objs.count(result.audios),
                    video: Objs.map(result.videos, function(value, key) {
                        return {
                            id: key,
                            label: value
                        };
                    }),
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
                    video: this._recorder.currentCamera(),
                    audio: this._recorder.currentMicrophone()
                };
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.video)
                    this._recorder.selectCamera(devices.video);
                if (devices && devices.audio)
                    this._recorder.selectMicrophone(devices.audio);
            },

            createSnapshot: function(type) {
                return this._recorder.createSnapshot();
            },

            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {
                return this._recorder.createSnapshotDisplay(snapshot, x, y, w, h);
            },

            updateSnapshotDisplay: function(snapshot, display, x, y, w, h) {
                return this._recorder.updateSnapshotDisplay(snapshot, display, x, y, w, h);
            },

            removeSnapshotDisplay: function(display) {
                this._recorder.removeSnapshotDisplay(display);
            },

            createSnapshotUploader: function(snapshot, type, uploaderOptions) {
                var uploader = new CustomUploader(Objs.extend({
                    source: snapshot,
                    type: type,
                    recorder: this._recorder
                }, uploaderOptions));
                uploader.on("upload", function(options) {
                    options.recorder.postSnapshot(
                            options.source,
                            options.url,
                            options.type
                        )
                        .success(uploader.successCallback, uploader)
                        .error(uploader.errorCallback, uploader);
                });
                return uploader;
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

            averageFrameRate: function() {
                return this._recorder.averageFrameRate();
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


Scoped.extend("module:Recorder.WebRTCVideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:Recorder.WebRTCVideoRecorderWrapper"
], function(VideoRecorderWrapper, WebRTCVideoRecorderWrapper) {
    VideoRecorderWrapper.register(WebRTCVideoRecorderWrapper, 2);
    return {};
});


Scoped.extend("module:Recorder.VideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:Recorder.FlashVideoRecorderWrapper"
], function(VideoRecorderWrapper, FlashVideoRecorderWrapper) {
    VideoRecorderWrapper.register(FlashVideoRecorderWrapper, 1);
    return {};
});