Scoped.define("module:ImageRecorder.ImageRecorderWrapper", [
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
            blankLevel: function() {},
            deltaCoefficient: function() {},

            enumerateDevices: function() {},
            currentDevices: function() {},
            setCurrentDevices: function(devices) {},

            createSnapshot: function() {},
            removeSnapshot: function(snapshot) {},
            createSnapshotDisplay: function(parent, snapshot, x, y, w, h) {},
            updateSnapshotDisplay: function(snapshot, display, x, y, w, h) {},
            removeSnapshotDisplay: function(display) {},
            createSnapshotUploader: function(snapshot, type, uploaderOptions) {},

            isFlash: function() {
                return false;
            },

            snapshotToLocalPoster: function(snapshot) {
                return null;
            }

        };
    }], {

        _initializeOptions: function(options) {
            return Objs.extend({
                forceflash: false,
                noflash: false,
                recordingWidth: 640,
                recordingHeight: 480
            }, options);
        }

    });
});


Scoped.define("module:ImageRecorder.WebRTCImageRecorderWrapper", [
    "module:ImageRecorder.ImageRecorderWrapper",
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.Support",
    "browser:Dom",
    "browser:Info",
    "base:Time",
    "base:Objs",
    "browser:Upload.FileUploader",
    "browser:Upload.MultiUploader",
    "base:Promise"
], function(ImageRecorderWrapper, RecorderWrapper, Support, Dom, Info, Time, Objs, FileUploader, MultiUploader, Promise, scoped) {
    return ImageRecorderWrapper.extend({
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
                    recordVideo: true,
                    recordAudio: false,
                    recordResolution: {
                        width: this._options.recordingWidth,
                        height: this._options.recordingHeight
                    },
                    videoBitrate: this._options.videoBitrate,
                    screen: this._options.screen
                });
                this._recorder.on("error", function(errorName, errorData) {
                    this.trigger("error", errorName, errorData);
                }, this);
                this.ready.asyncSuccess(true);
            },

            destroy: function() {
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

            deltaCoefficient: function() {
                return this._recorder.deltaCoefficient();
            },

            currentDevices: function() {
                return {
                    video: this._currentVideo
                };
            },

            enumerateDevices: function() {
                return Support.enumerateMediaSources().success(function(result) {
                    if (!this._currentVideo)
                        this._currentVideo = Objs.ithKey(result.video);
                }, this);
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.video)
                    this._recorder.selectCamera(devices.video);
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

            snapshotToLocalPoster: function(snapshot) {
                return snapshot;
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



Scoped.define("module:ImageRecorder.FlashImageRecorderWrapper", [
    "module:ImageRecorder.ImageRecorderWrapper",
    "module:Flash.FlashImageRecorder",
    "browser:Dom",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "browser:Upload.CustomUploader",
    "browser:Upload.MultiUploader"
], function(FlashImageRecorderWrapper, FlashRecorder, Dom, Info, Promise, Objs, Timer, CustomUploader, MultiUploader, scoped) {
    return FlashImageRecorderWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                if (this._element.tagName.toLowerCase() !== "div")
                    this._element = Dom.changeTag(this._element, "div");
                this._recorder = new FlashRecorder(this._element, {
                    flip: !!this._options.flip,
                    camerawidth: this._options.recordingWidth,
                    cameraheight: this._options.recordingHeight,
                    fps: this._options.framerate,
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

            enumerateDevices: function() {
                var result = this._recorder.enumerateDevices();
                return Promise.value({
                    videoCount: Objs.count(result.videos),
                    video: Objs.map(result.videos, function(value, key) {
                        return {
                            id: key,
                            label: value
                        };
                    })
                });
            },

            currentDevices: function() {
                return {
                    video: this._recorder.currentCamera()
                };
            },

            setCurrentDevices: function(devices) {
                if (devices && devices.video)
                    this._recorder.selectCamera(devices.video);
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


Scoped.extend("module:ImageRecorder.ImageRecorderWrapper", [
    "module:ImageRecorder.ImageRecorderWrapper",
    "module:ImageRecorder.WebRTCImageRecorderWrapper"
], function(ImageRecorderWrapper, WebRTCImageRecorderWrapper) {
    ImageRecorderWrapper.register(WebRTCImageRecorderWrapper, 2);
    return {};
});


Scoped.extend("module:ImageRecorder.ImageRecorderWrapper", [
    "module:ImageRecorder.ImageRecorderWrapper",
    "module:ImageRecorder.FlashImageRecorderWrapper"
], function(ImageRecorderWrapper, FlashImageRecorderWrapper) {
    ImageRecorderWrapper.register(FlashImageRecorderWrapper, 1);
    return {};
});