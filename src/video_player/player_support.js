Scoped.define("module:Player.Support", [
    "base:Promise",
    "base:Objs"
], function(Promise, Objs) {
    return {

        resolutionToLabel: function(width, height) {
            if (height < 300)
                return "SD";
            if (height < 400)
                return "360p";
            if (height < 500)
                return "480p";
            return "HD";
        },

        elementFileInfo: function(elementType, elementEvent, elementAttrs, file) {
            try {
                var element = document.createElement(elementType);
                Objs.iter(elementAttrs, function(value, key) {
                    element[key] = value;
                });
                var promise = Promise.create();
                var failed = false;
                var timer = setTimeout(function() {
                    failed = true;
                    if (element.error != undefined) {
                        promise.asyncError(element.error);
                    } else {
                        promise.asyncError("Timeout");
                    }
                }, 1000);
                element[elementEvent] = function() {
                    if (failed)
                        return;
                    clearTimeout(timer);
                    promise.asyncSuccess(element);
                };
                element.src = (window.URL || window.webkitURL).createObjectURL(file);
                return promise;
            } catch (e) {
                return Promise.error(e);
            }
        },

        videoFileInfo: function(file) {
            return this.elementFileInfo("video", "onloadeddata", {
                volume: 0,
                muted: true,
                preload: true
            }, file).mapSuccess(function(video) {
                return {
                    width: video.videoWidth,
                    height: video.videoHeight,
                    duration: video.duration
                };
            }).mapError(function(error) {
                return error;
            });
        },

        audioFileInfo: function(file) {
            return this.elementFileInfo("audio", "onloadeddata", {
                volume: 0,
                muted: true,
                preload: true
            }, file).mapSuccess(function(audio) {
                return {
                    duration: audio.duration
                };
            });
        },

        imageFileInfo: function(file) {
            return this.elementFileInfo("img", "onload", {}, file).mapSuccess(function(image) {
                return {
                    width: image.width,
                    height: image.height
                };
            });
        }

    };
});