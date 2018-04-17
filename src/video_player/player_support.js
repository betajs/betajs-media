Scoped.define("module:Player.Support", [
    "base:Promise"
], function(Promise) {
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

        videoFileInfo: function(file) {
            try {
                var video = document.createElement("video");
                video.volume = 0;
                video.muted = true;
                video.preload = true;
                var promise = Promise.create();
                var failed = false;
                var timer = setTimeout(function() {
                    failed = true;
                    promise.asyncError("Timeout");
                }, 1000);
                video.onloadeddata = function() {
                    if (failed)
                        return;
                    clearTimeout(timer);
                    promise.asyncSuccess({
                        width: video.videoWidth,
                        height: video.videoHeight,
                        duration: video.duration
                    });
                };
                video.src = (window.URL || window.webkitURL).createObjectURL(file);
                return promise;
            } catch (e) {
                return Promise.error(e);
            }
        }

    };
});