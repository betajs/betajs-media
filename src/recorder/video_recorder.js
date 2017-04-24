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

            supportsLocalPlayback: function() {
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
            }

        };
    }], {

        _initializeOptions: function(options) {
            return Objs.extend({
                forceflash: false,
                noflash: false,
                onlyaudio: false,
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
    "base:Objs",
    "browser:Upload.FileUploader",
    "browser:Upload.MultiUploader",
    "base:Promise"
], function(VideoRecorderWrapper, RecorderWrapper, Support, AudioAnalyser, Dom, Objs, FileUploader, MultiUploader, Promise, scoped) {
    return VideoRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "video")
                    this._element = Dom.changeTag(this._element, "video");

                if (this._options.onlyaudio && this._element) {
                    if (Support.canvasCaptureStream()) {
                        this._canvasElement = Support.canvasCaptureStream();
                        this._canvasElement.setAttribute('width', '100%');
                        this._canvasElement.setAttribute('height', '100%');
                        this._element.style.display = 'none';
                        var ctx = this._canvasElement.getContext("2d");
                        var imageObject = new Image();
                        imageObject.src = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABIAEgDASIAAhEBAxEB/8QAGgABAQEAAwEAAAAAAAAAAAAAAAIHAwQGCP/EADoQAAEDAQQJAgMECwEAAAAAAAEAAgMEBQYREgchM0FRUnGRsRMxFCJhMoGhwRYjNTc4QmJyc4Kis//EABoBAQADAQEBAAAAAAAAAAAAAAABAgMFBAb/xAAkEQACAgEDBAIDAAAAAAAAAAAAAQIDEQQSITFBUXEFE3KB0f/aAAwDAQACEQMRAD8AzuR7/Ud859zvPFTnfznuUk2j+p8qV2j4QrO/nPcpnfznuVKIQVnfznuUzv5z3KlEBWd/Oe5TO/nPcqUQHJG9/qN+c+43niimPaM6jyiEpiTaP6nypVSbR/U+VKEBc9HTT1lVFTUkMk9RK4MZGwEueeAXsbu6MbyXgsmntKzYaV1JPjkc+cNOpxacRhq1grfdG2jqz7m0wmdlqrXkbhLVOH2Rvawbh+J38FhZfGC46nQ03x9t7WViPk+TJGOjkcx4yuaS0jgcfZeq0e3NkvnWVlLBaFPSzwwmRjJTi6V24AcOJ14atSWDc61r1VtsvsmGOUUTnyPa9+BkOY4MbhvIB4D6rQrRp6K3rkUt8LoUzLJt2wMG1FPCMMAwDMCN+A14nWRiDipss7Irp9Nl7pLjx5XfHoxy1LPqrLtCeitCF0FVA8skjduP5jfjvC6i2XTHBT3lufYV+KGIMlmaKeqa3XgdeGJ/pc1zcfqFjSvXPcsmOpp+me1crqvRUe0Z1HlEj2jOo8ormCEm0f1PlSqk2j+p8qUIPrXQd+7Cxekv/q9e8XyRdvSjeO71j01l2c+k+Fp8cglgzHW4uOJx4krftG+kOzr50oY0tpbVjbjLSuOs8XMP8zfxG9c26mUW5dj6rQ62qyMak+UkYnoUNYNLLBR5/TJn+JAxw9LA/a/2yfeve3JEX6VaUg39lYu9TDDLmwkzYf8ASyO718rVunXWy2yXxM+Nc+Nz5GYmM5jg9v1GJ1ax9Fodpz0d27i0t07r1TLWt+8ODp54TjmDwMSTuBGoY68MScFvZF594/pztJZFQ/HL/b4SR07M/hptD1vYVf6rH/Mz88yxtbLpfmguxcywbk0crXzRtbUVZbvIxIx/ueXH7gsaW1PKb8s8mu4nGHeKSfsqPaM6jyiR7RnUeUWp4kJNo/qfKlVJtH9T5UoQFz0VXUUNXDVUc0kNRC4OZIwkOaVwIhKbTyipHukke95xe5xcTxJK9Xo7vibmV1ZVxWbTVk80JjifJiHRO3EHhxAwJ4rySKJRUlhl67JVy3x6ncta0au17RqK+0ZjPVTvL5HneeAG4YasNwXTRFKWCjbbyyo9ozqPKJHtGdR5RAipGP8AUd8h9zuPFTkfyHsURBgZH8h7FMj+Q9iiIMDI/kPYpkfyHsURBgZH8h7FMj+Q9iiIMFRsf6jfkPuNx4oiISkf/9k=";
                        imageObject.onload = function() {
                            ctx.drawImage(imageObject, 10, 10);
                        };
                        this._element.parentNode.insertBefore(this._canvasElement, this._element.nextSibling);
                    } else {
                        console.log('Not supported by browser');
                        return;
                    }
                }

                this._recorder = RecorderWrapper.create({
                    video: this._element,
                    canvas: this._canvasElement || null,
                    onlyaudio: this._options.onlyaudio,
                    flip: !!this._options.flip,
                    framerate: this._options.framerate,
                    recordVideo: this._options.recordVideo,
                    recordAudio: this._options.recordAudio,
                    recordResolution: {
                        width: this._options.recordingWidth,
                        height: this._options.recordingHeight
                    },
                    videoBitrate: this._options.videoBitrate,
                    audioBitrate: this._options.audioBitrate,
                    webrtcStreaming: this._options.webrtcStreaming
                });
                this._recorder.on("bound", function() {
                    if (this._analyser)
                        this.testSoundLevel(true);
                }, this);
                this.ready.asyncSuccess(true);
            },

            destroy: function() {
                if (this._analyser)
                    this._analyser.weakDestroy();
                this._recorder.destroy();
                inherited.destroy.call(this);
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
                    video: this._currentVideo,
                    audio: this._currentAudio
                };
            },

            enumerateDevices: function() {
                return Support.enumerateMediaSources().success(function(result) {
                    if (!this._currentVideo)
                        this._currentVideo = Objs.ithKey(result.video);
                    if (!this._currentAudio)
                        this._currentAudio = Objs.ithKey(result.audio);
                }, this);
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.video)
                    this._recorder.selectCamera(devices.video);
                if (devices && devices.audio)
                    this._recorder.selectMicrophone(devices.audio);
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
                this._recorder.startRecord(options);
                return Promise.value(true);
            },

            stopRecord: function(options) {
                var promise = Promise.create();
                this._recorder.once("data", function(videoBlob, audioBlob) {
                    this.__localPlaybackSource = {
                        src: videoBlob,
                        audiosrc: audioBlob
                    };
                    var multiUploader = new MultiUploader();
                    if (!this._options.simulate) {
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

            snapshotToLocalPoster: function(snapshot) {
                return snapshot;
            },

            localPlaybackSource: function() {
                return this.__localPlaybackSource;
            },

            averageFrameRate: function() {
                return this._recorder.averageFrameRate();
            }

        };
    }, {

        supported: function(options) {
            return RecorderWrapper.anySupport(options) && !options.forceflash;
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
                this._recorder.startRecord(options.rtmp.serverUrl, options.rtmp.streamName);
                return promise;
            },

            stopRecord: function(options) {
                if (this._options.simulate)
                    return Promise.value(new MultiUploader());
                var self = this;
                var ctx = {};
                var uploader = new CustomUploader();
                var timer = new Timer({
                    delay: 100,
                    context: this,
                    fire: function() {
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
            }

        };
    }, {

        supported: function(options) {
            return !Info.isMobile() && !options.noflash && Info.flash().installed();
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