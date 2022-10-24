Scoped.define("module:Recorder.Support", [
    "module:WebRTC.Support",
    "browser:Upload.FileUploader",
    "browser:Upload.CustomUploader",
    "browser:Dom",
    "browser:Events",
    "browser:Info",
    "base:Promise",
    "base:Objs"
], function(Support, FileUploader, CustomUploader, Dom, Events, Info, Promise, Objs) {
    return {

        /**
         *
         * @param {string} type
         * @param {HTMLVideoElement} video
         * @param {boolean} isUploader
         * @param {int|undefined} h
         * @param {int|undefined} w
         * @param {int|undefined} x
         * @param {int|undefined} y
         * @param {int|undefined} quality
         * @return {Data URL}
         */
        createSnapshot: function(type, video, isUploader, h, w, x, y, quality) {
            var _data = this._createSnapshot(type, video, isUploader, h, w, x, y, quality);
            return _data ? Support.dataURItoBlob(_data) : _data;
        },

        /**
         * 
         * @param {string} videoSource
         * @param {string} [type]
         * @param {string} [time=0]
         * @param {boolean} [isUploader]
         * @param {int} [h]
         * @param {int} [w]
         * @param {int} [x]
         * @param {int} [quality]
         * @return {Promise<Blob>}
         */
        createSnapshotFromSource: function(videoSource, type, time, isUploader, h, w, x, y, quality) {
            var promise = Promise.create();
            var video = document.createElement("video");
            video.src = videoSource;

            var events = new Events();

            events.on(video, "loadedmetadata", function() {
                video.currentTime = time || 0;
            });

            events.on(video, "seeked", function() {
                window.requestAnimationFrame(function() {
                    window.requestAnimationFrame(function() {
                        var snapshot = this.createSnapshot(type, video, isUploader, h, w, x, y, quality);
                        if (snapshot) {
                            promise.asyncSuccess(snapshot);
                        } else {
                            promise.asyncError("Could not capture snapshot");
                        }
                    }.bind(this));
                }.bind(this));
                events.destroy();
            }, this);

            events.on(video, "error", function() {
                promise.asyncError("Could not load video to capture snapshot");
                events.destroy();
            });

            video.load();

            return promise;
        },

        /**
         *
         * @param {string} type
         * @param {HTMLVideoElement} video
         * @param {boolean} isUploader
         * @param {int|undefined} h
         * @param {int|undefined} w
         * @param {int|undefined} x
         * @param {int|undefined} y
         * @param {int|undefined} quality
         * @return {Data URL}
         */
        _createSnapshot: function(type, video, isUploader, h, w, x, y, quality) {
            var width = w || (video.videoWidth || video.clientWidth);
            var height = h || (video.videoHeight || video.clientHeight);
            if (!width || !height) return null;
            x = x || 0;
            y = y || 0;
            quality = quality || 1.0;
            isUploader = isUploader || false;
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            var ratio = +(canvas.width / canvas.height);
            var orientation = ratio > 1.00 ? 'landscape' : 'portrait';
            var _isWebKit = (Info.isSafari() || (Info.isMobile() && Info.isiOS()));
            var _rotationRequired = (orientation === 'portrait') && isUploader && (Info.isFirefox() || _isWebKit);
            var context = canvas.getContext('2d');

            if (_rotationRequired && this.__detectVerticalSquash(video, canvas.width, canvas.height) !== 1) {
                this.__rotateToPortrait(video, canvas, context);
            }
            // Seems Safari Was fixed Canvas draw related bug which were existed before
            // else if (_isWebKit && orientation === 'portrait') {
            //     context.drawImage(video, 0, -canvas.width, canvas.height, canvas.width); }
            else {
                context.drawImage(video, x, y, canvas.width, canvas.height);
            }

            var data = canvas.toDataURL(type, quality);

            if (this.__isCanvasBlank(canvas)) return null;
            return data;
        },

        /**
         *
         * @param {HTMLMediaElement} video
         * @param {HTMLCanvasElement} canvas
         * @param {CanvasRenderingContext2D} ctx
         * @private
         */
        __rotateToPortrait: function(video, canvas, ctx) {
            var diff = Math.abs(canvas.height - canvas.width);
            var maxSize = canvas.width > canvas.height ? canvas.width : canvas.height;
            canvas.height = canvas.width = maxSize;
            ctx.drawImage(video, 0, 0, canvas.height, canvas.width);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            canvas.width -= diff;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(90 * (Math.PI / 180));
            if (Info.isFirefox())
                ctx.drawImage(video, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width);
            else
                ctx.drawImage(video, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width + diff);
            ctx.restore();
        },

        /**
         * Check if snapshot image is blank image
         *
         * @param canvas
         * @return {boolean}
         * @private
         */
        __isCanvasBlank: function(canvas) {
            var canvasContext = canvas.getContext('2d');
            if (canvasContext && canvas.width <= 0 && canvas.height <= 0) {
                return true;
            }
            return !canvasContext
                .getImageData(0, 0, canvas.width, canvas.height).data
                .some(function(channel) {
                    return channel !== 0;
                });
        },

        /**
         * Detecting vertical squash in loaded image.
         * Fixes a bug which squash image vertically while drawing into canvas for some images.
         * This is a bug in iOS6 devices. This function from https://github.com/stomita/ios-imagefile-megapixel
         *
         */
        __detectVerticalSquash: function(media, w, h) {
            var iw = w || (media.naturalWidth || media.width),
                ih = h || (media.naturalHeight || media.height);
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = ih;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(media, 0, 0);
            var data = ctx.getImageData(0, 0, 1, ih).data;
            // search image edge pixel position in case it is squashed vertically.
            var sy = 0;
            var ey = ih;
            var py = ih;
            while (py > sy) {
                var alpha = data[(py - 1) * 4 + 3];
                if (alpha === 0) {
                    ey = py;
                } else {
                    sy = py;
                }
                py = (ey + sy) >> 1;
            }
            var ratio = (py / ih);
            return (ratio === 0) ? 1 : ratio;
        },

        removeSnapshot: function(snapshot) {},

        /**
         *
         * @param {HTMLImageElement} image
         */
        removeSnapshotDisplay: function(image) {
            image.remove();
        },

        /**
         *
         * @param {HTMLElement} parent
         * @param {Data URL} snapshot
         * @param {int} x
         * @param {int} y
         * @param {int} w
         * @param {int} h
         * @return {HTMLImageElement}
         */
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

        /**
         *
         * @param {Data URL} snapshot
         * @return {Promise}
         */
        snapshotMetaData: function(snapshot) {
            var promise = Promise.create();
            var url = Support.globals().URL.createObjectURL(snapshot);
            var image = new Image();
            image.src = url;

            image.onload = function(ev) {
                var _imgHeight = image.naturalHeight || image.height;
                var _imgWidth = image.naturalWidth || image.width;
                var _ratio = +(_imgWidth / _imgHeight).toFixed(2);

                promise.asyncSuccess({
                    width: _imgWidth,
                    height: _imgHeight,
                    orientation: _ratio > 1.00 ? 'landscape' : 'portrait',
                    ratio: _ratio
                });
            };

            return promise;
        },

        /**
         * @param {Data URL} snapshot
         * @param {HTMLImageElement} image
         * @param {int} x
         * @param {int} y
         * @param {int} w
         * @param {int} h
         * @private
         * @return {void}
         */
        updateSnapshotDisplay: function(snapshot, image, x, y, w, h) {
            image.style.left = x + "px";
            image.style.top = y + "px";
            image.style.width = w + "px";
            image.style.height = h + "px";
        },

        /**
         * @param {URI} snapshot
         * @param {string} type
         * @param {Object} uploaderOptions
         * @return {*}
         */
        createSnapshotUploader: function(snapshot, type, uploaderOptions) {
            return FileUploader.create(Objs.extend({
                source: snapshot
            }, uploaderOptions));
        }
    };
});