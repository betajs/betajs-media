// Credits: https://github.com/antimatter15/whammy/blob/master/whammy.js
// Co-Credits: https://github.com/streamproc/MediaStreamRecorder/blob/master/MediaStreamRecorder-standalone.js

Scoped.define("module:WebRTC.WhammyRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Time",
    "base:Functions",
    "base:Promise",
    "base:Async",
    "module:WebRTC.Support",
    "module:Encoding.WebmEncoder.Support"
], function(Class, EventsMixin, Objs, Time, Functions, Promise, Async, Support, WebmSupport, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {

        var CLUSTER_MAX_DURATION = 30000;
        /*
        var NO_STREAM_WIDTH = 40;
        var NO_STREAM_HEIGHT = 30;
        var NO_STREAM_WEBP = "data:image/webp;base64,UklGRjQAAABXRUJQVlA4ICgAAADwAgCdASooAB4APpFGnkslo6KhpWgAsBIJaQAAKUNt8AD++E0AAAAA";

        See: https://stackoverflow.com/questions/57132690/cloudfront-mp4-not-playing-on-some-android-and-iphone-browsers/58314774#58314774
        To re-create webp file:
        1. Create 80x60 colored white-background png in e.g. Gimp
        2. Convert to webp via cwebp command line tool.
        3. Base64 it.
         */
        var NO_STREAM_WIDTH = 80;
        var NO_STREAM_HEIGHT = 60;
        var NO_STREAM_WEBP = "data:image/webp;base64,UklGRjwAAABXRUJQVlA4IDAAAADQAwCdASpQADwAPpFIoUylpCMiIagAsBIJaQAADHThw4cOHDhwrAAA/vhNAAAAAAA=";

        return {

            constructor: function(stream, options) {
                inherited.constructor.call(this);
                this._stream = stream;
                this._options = Objs.extend({
                    recordWidth: 320,
                    recordHeight: 240,
                    quality: undefined,
                    video: null,
                    framerate: null
                }, options);
                this._started = false;
            },

            destroy: function() {
                this._started = false;
                this.trigger("stopped");
                inherited.destroy.call(this);
            },

            start: function() {
                if (this._started)
                    return Promise.value(true);
                this._started = true;
                if (this._options.video) {
                    this._options.recordWidth = this._options.video.videoWidth || this._options.video.clientWidth;
                    this._options.recordHeight = this._options.video.videoHeight || this._options.video.clientHeight;
                }
                this._video = document.createElement('video');
                this._video.width = this._options.recordWidth || NO_STREAM_WIDTH;
                this._video.height = this._options.recordHeight || NO_STREAM_HEIGHT;
                if (this._stream)
                    Support.bindStreamToVideo(this._stream, this._video);
                this._canvas = document.createElement('canvas');
                this._canvas.width = this._options.recordWidth || NO_STREAM_WIDTH;
                this._canvas.height = this._options.recordHeight || NO_STREAM_HEIGHT;
                this._context = this._canvas.getContext('2d');
                this._frames = [];
                //this._isOnStartedDrawingNonBlankFramesInvoked = false;
                this._lastTime = Time.now();
                this._startTime = this._lastTime;
                this.trigger("started");
                Async.eventually(this._process, [], this);
                return Promise.value(true);
            },

            stop: function() {
                if (!this._started)
                    return;
                this._started = false;
                this.trigger("stopped");
                this._generateData();
            },

            _process: function() {
                if (!this._started)
                    return;
                var now = Time.now();
                var duration = now - this._lastTime;
                this._lastTime = now;
                this._context.drawImage(this._video, 0, 0, this._canvas.width, this._canvas.height);
                this._frames.push({
                    duration: duration,
                    image: this._stream ? this._canvas.toDataURL('image/webp', this._options.quality) : NO_STREAM_WEBP
                });
                /*
		        if (!this._isOnStartedDrawingNonBlankFramesInvoked && !WebmSupport.isBlankFrame(this._canvas, this._frames[this._frames.length - 1])) {
		            this._isOnStartedDrawingNonBlankFramesInvoked = true;
		            this.trigger("onStartedDrawingNonBlankFrames");
		        }
		        */
                var maxTime = this._options.framerate ? 1000 / this._options.framerate : 10;
                Async.eventually(this._process, [], this, Math.max(1, maxTime - (Time.now() - now)));
            },

            averageFrameRate: function() {
                return this._frames.length > 0 ? (this._frames.length / (Time.now() - this._startTime) * 1000) : null;
            },

            _generateData: function() {
                if (!this._frames.length)
                    return;
                this._data = this.__compile(this._stream ? this.__dropBlackFrames(this._canvas, this._frames) : this._frames);
                this.trigger("data", this._data);
            },

            __compile: function(frames) {
                var totalDuration = 0;
                var width = null;
                var height = null;
                var clusters = [];

                var clusterTimecode = 0;

                var clusterFrames = null;
                var clusterDuration = null;

                frames.forEach(function(frame) {
                    if (!clusterFrames) {
                        clusterFrames = [];
                        clusterDuration = 0;
                    }

                    var webp = WebmSupport.parseWebP(WebmSupport.parseRIFF(atob(frame.image.slice(23))));

                    clusterFrames.push(WebmSupport.serializeEBML(WebmSupport.makeTimecodeDataBlock(webp.data, clusterDuration)));

                    clusterDuration += frame.duration;
                    totalDuration += frame.duration;
                    width = width || webp.width;
                    height = height || webp.height;

                    if (clusterDuration >= CLUSTER_MAX_DURATION) {
                        clusters.push(WebmSupport.serializeEBML(WebmSupport.makeCluster(clusterFrames, clusterTimecode)));
                        clusterTimecode = totalDuration;
                        clusterFrames = null;
                        clusterDuration = 0;
                    }
                }, this);

                if (clusterFrames)
                    clusters.push(WebmSupport.serializeEBML(WebmSupport.makeCluster(clusterFrames, clusterTimecode)));

                var EBML = WebmSupport.generateEBMLHeader(totalDuration, width, height);
                EBML[1].data = EBML[1].data.concat(clusters);
                return WebmSupport.serializeEBML(EBML);
            },

            __dropBlackFrames: function(canvas, _frames, _pixTolerance, _frameTolerance) {
                var idx = 0;
                while (idx < _frames.length) {
                    if (!WebmSupport.isBlankFrame(canvas, _frames[idx], _pixTolerance, _frameTolerance))
                        break;
                    idx++;
                }
                return _frames.slice(idx);
            },

            createSnapshot: function(type) {
                this._context.drawImage(this._video, 0, 0, this._canvas.width, this._canvas.height);
                return this._canvas.toDataURL(type);
            }

        };
    }], {

        supported: function(nostream) {
            return nostream || Support.globals().webpSupport;
        }

    });
});