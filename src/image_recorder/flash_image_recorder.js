Scoped.define("module:Flash.FlashImageRecorder", [
    "browser:DomExtend.DomExtension",
    "browser:Dom",
    "browser:Info",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "base:Types",
    "base:Timers.Timer",
    "base:Time",
    "base:Promise",
    "base:Events.EventsMixin",
    "module:Recorder.PixelSampleMixin"
], function(Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Timer, Time, Promise, EventsMixin, PixelSampleMixin, scoped) {
    var Cls = Class.extend({
        scoped: scoped
    }, [EventsMixin, PixelSampleMixin, function(inherited) {
        return {

            constructor: function(element, attrs) {
                inherited.constructor.call(this, element, attrs);
                this._embedding = this.auto_destroy(new FlashEmbedding(element, {
                    registry: this.cls.flashRegistry(),
                    wrap: true,
                    debug: false,
                    hasEmbedding: this.readAttr("hasembedding") || false,
                    namespace: this.readAttr("embednamespace") || null
                }, {
                    parentBgcolor: true,
                    fixHalfPixels: true
                }));
                this._flashObjs = {};
                this.ready = Promise.create();
                this.__videoRate = this.readAttr('videorate') || 0;
                this.__videoQuality = this.readAttr('videoquality') || 90;
                this.__cameraWidth = this.readAttr('camerawidth') || 640;
                this.__cameraHeight = this.readAttr('cameraheight') || 480;
                this._flip = Types.parseBool(this.readAttr("flip") || false);
                this._embedding.ready(this.__initializeEmbedding, this);
            },

            __initializeEmbedding: function() {
                this._flashObjs.main = this._embedding.flashMain();
                this._flashObjs.stage = this._flashObjs.main.get("stage");
                this._flashObjs.stage.set("scaleMode", "noScale");
                this._flashObjs.stage.set("align", "TL");
                this._flashObjs.video = this._embedding.newObject(
                    "flash.media.Video",
                    this._flashObjs.stage.get("stageWidth"),
                    this._flashObjs.stage.get("stageHeight")
                );
                this._flashObjs.cameraVideo = this._embedding.newObject(
                    "flash.media.Video",
                    this.__cameraWidth,
                    this.__cameraHeight
                );
                this._flashObjs.main.addChildVoid(this._flashObjs.video);
                this._flashObjs.Camera = this._embedding.getClass("flash.media.Camera");
                this._flashObjs.camera = this._flashObjs.Camera.getCamera(0);
                this._currentCamera = 0;
                this._flashObjs.Security = this._embedding.getClass("flash.system.Security");
                this.recomputeBB();
                this.ready.asyncSuccess(this);
                this.auto_destroy(new Timer({
                    delay: 100,
                    fire: this._fire,
                    context: this
                }));
            },

            isAccessGranted: function() {
                try {
                    return (!this._flashObjs.camera || !this._flashObjs.camera.get('muted'));
                } catch (e) {
                    return false;
                }
            },

            isSecurityDialogOpen: function() {
                var dummy = this._embedding.newObject("flash.display.BitmapData", 1, 1);
                var open = false;
                try {
                    dummy.draw(this._flashObjs.stage);
                } catch (e) {
                    open = true;
                }
                dummy.dispose();
                dummy.destroy();
                return open;
            },

            openSecurityDialog: function(fullSecurityDialog) {
                this.trigger("require_display");
                if (fullSecurityDialog)
                    this._flashObjs.Security.showSettings("privacy");
                else {
                    this._flashObjs.video.attachCamera(null);
                    this._flashObjs.video.attachCamera(this._flashObjs.camera);
                }
            },

            grantAccess: function(fullSecurityDialog, allowDeny) {
                var promise = Promise.create();
                var timer = new Timer({
                    fire: function() {
                        if (this.destroyed()) {
                            timer.destroy();
                            return;
                        }
                        if (this.isSecurityDialogOpen())
                            return;
                        if (this.isAccessGranted()) {
                            timer.destroy();
                            promise.asyncSuccess(true);
                        } else {
                            if (allowDeny) {
                                timer.destroy();
                                promise.asyncError(true);
                            } else
                                this.openSecurityDialog(fullSecurityDialog);
                        }
                    },
                    context: this,
                    delay: 10,
                    start: true
                });
                return promise;
            },

            bindMedia: function(fullSecurityDialog, allowDeny) {
                return this.grantAccess(fullSecurityDialog, allowDeny).mapSuccess(function() {
                    this._mediaBound = true;
                    this._attachCamera();
                }, this);
            },

            unbindMedia: function() {
                this._detachCamera();
                this._mediaBound = false;
            },

            _attachCamera: function() {
                if (this._flashObjs.camera) {
                    this._flashObjs.camera.setMode(this.__cameraWidth, this.__cameraHeight, this.__fps);
                    this._flashObjs.camera.setQuality(this.__videoRate, this.__videoQuality);
                    this._flashObjs.camera.setKeyFrameInterval(5);
                    this._flashObjs.video.attachCamera(this._flashObjs.camera);
                    this._flashObjs.cameraVideo.attachCamera(this._flashObjs.camera);
                }
                if (this._flip) {
                    if (this._flashObjs.video.get("scaleX") > 0)
                        this._flashObjs.video.set("scaleX", -this._flashObjs.video.get("scaleX"));
                    this._flashObjs.video.set("x", this._flashObjs.video.get("width"));
                }
            },

            _detachCamera: function() {
                this._flashObjs.video.attachCamera(null);
                this._flashObjs.cameraVideo.attachCamera(null);
            },

            enumerateDevices: function() {
                return {
                    videos: this._flashObjs.Camera.get('names')
                };
            },

            selectCamera: function(index) {
                if (this._flashObjs.camera)
                    this._flashObjs.camera.weakDestroy();
                this.__cameraActivityTime = null;
                this._flashObjs.camera = this._flashObjs.Camera.getCamera(index);
                this._currentCamera = index;
                if (this._mediaBound)
                    this._attachCamera();
            },

            currentCamera: function() {
                return this._currentCamera;
            },

            cameraInfo: function() {
                if (!this._flashObjs.camera)
                    return {};
                return {
                    muted: this._flashObjs.camera.get("muted"),
                    name: this._flashObjs.camera.get("name"),
                    activityLevel: this._flashObjs.camera.get("activityLevel"),
                    fps: this._flashObjs.camera.get("fps"),
                    width: this._flashObjs.camera.get("width"),
                    height: this._flashObjs.camera.get("height"),
                    inactivityTime: this.__cameraActivityTime ? Time.now() - this.__cameraActivityTime : null
                };
            },

            _pixelSample: function(samples, callback, context) {
                samples = samples || 100;
                var w = this._flashObjs.cameraVideo.get("width");
                var h = this._flashObjs.cameraVideo.get("height");
                var wc = Math.ceil(Math.sqrt(w / h * samples));
                var hc = Math.ceil(Math.sqrt(h / w * samples));
                var lightLevelBmp = this._embedding.newObject("flash.display.BitmapData", wc, hc);
                var scaleMatrix = this._embedding.newObject("flash.geom.Matrix");
                scaleMatrix.scale(wc / w, hc / h);
                lightLevelBmp.draw(this._flashObjs.cameraVideo, scaleMatrix);
                for (var i = 0; i < samples; ++i) {
                    var x = i % wc;
                    var y = Math.floor(i / wc);
                    var rgb = lightLevelBmp.getPixel(x, y);
                    callback.call(context || this, rgb % 256, (rgb / 256) % 256, (rgb / 256 / 256) % 256);
                }
                scaleMatrix.destroy();
                lightLevelBmp.destroy();
            },

            _fire: function() {
                if (!this._mediaBound)
                    return;
                if (this._flashObjs.camera) {
                    var currentCameraActivity = this._flashObjs.camera.get("activityLevel");
                    if (!this.__lastCameraActivity || this.__lastCameraActivity !== currentCameraActivity)
                        this.__cameraActivityTime = Time.now();
                    this.__lastCameraActivity = currentCameraActivity;
                }
            },

            createSnapshot: function() {
                var bmp = this._embedding.newObject(
                    "flash.display.BitmapData",
                    this._flashObjs.cameraVideo.get("videoWidth"),
                    this._flashObjs.cameraVideo.get("videoHeight")
                );
                bmp.draw(this._flashObjs.cameraVideo);
                return bmp;
            },

            postSnapshot: function(bmp, url, type, quality) {
                var promise = Promise.create();
                quality = quality || 90;
                var header = this._embedding.newObject("flash.net.URLRequestHeader", "Content-type", "application/octet-stream");
                var request = this._embedding.newObject("flash.net.URLRequest", url);
                request.set("requestHeaders", [header]);
                request.set("method", "POST");
                if (type === "jpg") {
                    var jpgEncoder = this._embedding.newObject("com.adobe.images.JPGEncoder", quality);
                    request.set("data", jpgEncoder.encode(bmp));
                    jpgEncoder.destroy();
                } else {
                    var PngEncoder = this._embedding.getClass("com.adobe.images.PNGEncoder");
                    request.set("data", PngEncoder.encode(bmp));
                }
                var poster = this._embedding.newObject("flash.net.URLLoader");
                poster.set("dataFormat", "BINARY");

                // In case anybody is wondering, no, the progress event does not work for uploads:
                // http://stackoverflow.com/questions/2106682/a-progress-event-when-uploading-bytearray-to-server-with-as3-php/2107059#2107059

                poster.addEventListener("complete", this._embedding.newCallback(Functions.as_method(function() {
                    promise.asyncSuccess(true);
                }, this)));
                poster.addEventListener("ioError", this._embedding.newCallback(Functions.as_method(function() {
                    promise.asyncError("IO Error");
                }, this)));
                poster.load(request);
                promise.callback(function() {
                    poster.destroy();
                    request.destroy();
                    header.destroy();
                });
                return promise;
            },

            createSnapshotDisplay: function(bmpData, x, y, w, h) {
                var bmp = this._embedding.newObject("flash.display.Bitmap", bmpData);
                this.updateSnapshotDisplay(bmpData, bmp, x, y, w, h);
                this._flashObjs.main.addChildVoid(bmp);
                return bmp;
            },

            updateSnapshotDisplay: function(bmpData, bmp, x, y, w, h) {
                bmp.set("x", x);
                bmp.set("y", y);
                bmp.set("scaleX", w / bmpData.get("width"));
                bmp.set("scaleY", h / bmpData.get("height"));
            },

            removeSnapshotDisplay: function(snapshot) {
                this._flashObjs.main.removeChildVoid(snapshot);
                snapshot.destroy();
            },

            idealBB: function() {
                return {
                    width: this.__cameraWidth,
                    height: this.__cameraHeight
                };
            },

            setActualBB: function(actualBB) {
                ["object", "embed"].forEach(function(tag) {
                    var container = this._element.getElementsByTagName(tag.toUpperCase())[0];
                    if (container) {
                        ["width", "height"].forEach(function(attr) {
                            container.style[attr] = actualBB[attr] + "px";
                        });
                    }
                }, this);
                var video = this._flashObjs.video;
                if (video) {
                    video.set("width", actualBB.width);
                    video.set("height", actualBB.height);
                    if (this._flip) {
                        if (video.get("scaleX") > 0)
                            video.set("scaleX", -video.get("scaleX"));
                        video.set("x", video.get("width"));
                    }
                }
            },

            _error: function(s) {
                this.__status = "error";
                this.trigger("error", s);
            }

        };
    }], {

        flashRegistry: function() {
            if (!this.__flashRegistry) {
                this.__flashRegistry = new FlashClassRegistry();
                this.__flashRegistry.register("flash.media.Camera", ["setMode", "setQuality", "setKeyFrameInterval", "addEventListener"], ["getCamera"]);
                this.__flashRegistry.register("flash.media.Video", ["attachCamera", "attachNetStream"]);
                this.__flashRegistry.register("flash.net.URLRequest", []);
                this.__flashRegistry.register("flash.net.URLRequestHeader", []);
                this.__flashRegistry.register("flash.net.URLLoader", ["addEventListener", "load"]);
                this.__flashRegistry.register("flash.display.Sprite", ["addChild", "removeChild", "setChildIndex"]);
                this.__flashRegistry.register("flash.display.Stage", []);
                this.__flashRegistry.register("flash.display.Loader", ["load"]);
                this.__flashRegistry.register("flash.display.LoaderInfo", ["addEventListener"]);
                this.__flashRegistry.register("flash.display.BitmapData", ["draw", "getPixel", "dispose"]);
                this.__flashRegistry.register("flash.display.Bitmap", []);
                this.__flashRegistry.register("flash.geom.Matrix", ["scale"]);
                this.__flashRegistry.register("flash.system.Security", [], ["allowDomain", "showSettings"]);
                this.__flashRegistry.register("com.adobe.images.PNGEncoder", [], ["encode"]);
                this.__flashRegistry.register("com.adobe.images.JPGEncoder", ["encode"]);
            }
            return this.__flashRegistry;
        },

        attach: function(element, attrs) {
            var cls = new Cls(element, attrs);
            return element;
        }


    });
    return Cls;
});