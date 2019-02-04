Scoped.define("module:Recorder.Support", [
    "module:WebRTC.Support",
    "browser:Upload.FileUploader",
    "browser:Upload.CustomUploader",
    "browser:Dom",
    "base:Objs"
], function(Support, FileUploader, CustomUploader, Dom, Objs) {
    return {

        /**
         *
         * @param {string} type
         * @param {HTMLVideoElement} video
         * @param {int|undefined} h
         * @param {int|undefined} w
         * @param {int|undefined} x
         * @param {int|undefined} y
         * @param {int|undefined} quality
         * @return {Data URL}
         */
        createSnapshot: function(type, video, h, w, x, y, quality) {
            return Support.dataURItoBlob(this._createSnapshot(type, video));
        },

        /**
         *
         * @param {string} type
         * @param {HTMLVideoElement} video
         * @param {int|undefined} h
         * @param {int|undefined} w
         * @param {int|undefined} x
         * @param {int|undefined} y
         * @param {int|undefined} quality
         * @return {Data URL}
         */
        _createSnapshot: function(type, video, h, w, x, y, quality) {
            x = x || 0;
            y = y || 0;
            quality = quality || 1.0;
            var canvas = document.createElement('canvas');
            canvas.width = w || (video.videoWidth || video.clientWidth);
            canvas.height = h || (video.videoHeight || video.clientHeight);
            var context = canvas.getContext('2d');
            context.drawImage(video, x, y, canvas.width, canvas.height);
            var data = canvas.toDataURL(type, quality);
            return data;
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
         * @param {Data URL} snapshot
         * @param {string} type
         * @param {Object} uploaderOptions
         * @return {*}
         */
        createSnapshotUploader: function(isFlash, snapshot, type, uploaderOptions) {
            if (isFlash) {
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
            } else {
                return FileUploader.create(Objs.extend({
                    source: snapshot
                }, uploaderOptions));
            }
        }
    };
});