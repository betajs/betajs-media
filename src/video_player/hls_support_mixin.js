Scoped.define("module:HlsSupportMixin", [
    "base:Promise",
    "base:Async",
    "browser:Loader"
], function(Promise, Async, Loader) {
    var lazyLoadUrl = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.1.5/hls.light.min.js";
    var lazyLoaded = false;
    return {

        _hlsObj: function() {
            return window.Hls;
        },

        _hlsIsSupported: function() {
            return !!this._hlsObj() && this._hlsObj().isSupported();
        },

        _lazyLoadHls: function() {
            if (!lazyLoaded) {
                var promise = Promise.create();
                Loader.loadScript(lazyLoadUrl, function() {
                    lazyLoaded = true;
                    Async.eventually(function() {
                        promise.asyncSuccess(this._hlsIsSupported());
                    }, this);
                }, this);
                return promise;
            } else
                return Promise.value(this._hlsIsSupported());
        },

        _loadHls: function(source) {
            var promise = Promise.create();
            var Hls = this._hlsObj();
            this._hls = new Hls();
            this._hls.on(Hls.Events.MEDIA_ATTACHED, function() {
                this._hls.loadSource(source.src);
                this._hls.on(Hls.Events.MANIFEST_PARSED, function(_, data) {
                    this._qualityOptions = data.levels.map(function(level, index) {
                        return {
                            id: index,
                            label: level.width + "x" + level.height + " (" + Math.round(level.bitrate / 1024) + " kbps)"
                        };
                    });
                    this._currentQuality = this._qualityOptions[this._hls.startLevel];
                    this._hls.on(Hls.Events.LEVEL_SWITCHED, function(_, data) {
                        this._currentQuality = this._qualityOptions[data.level];
                        this.trigger("qualityswitched", this._qualityOptions[data.level]);
                    }.bind(this));
                    this.on("setsourcequality", function(quality) {
                        this._hls.currentLevel = quality;
                    });
                    promise.asyncSuccess(true);
                }.bind(this));
            }.bind(this));
            this._hls.on(Hls.Events.ERROR, function(e, data) {
                var error;
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            this._hls.startLoad();
                            error = "HLS Network Error";
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            this._hls.recoverMediaError();
                            error = "HLS Media Error";
                            break;
                        default:
                            this._hls.destroy();
                            error = "HLS Fatal Error";
                    }
                }
                promise.asyncError(error);
            }.bind(this));
            this._hls.attachMedia(this._element);
            return promise;
        }
    };
});