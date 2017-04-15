// Credits: https://github.com/antimatter15/whammy/blob/master/whammy.js
// Co-Credits: https://github.com/streamproc/MediaStreamRecorder/blob/master/MediaStreamRecorder-standalone.js

Scoped.define("module:WebRTC.WhammyRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Time",
    "base:Functions",
    "base:Async",
    "module:WebRTC.Support",
    "module:Encoding.WebmEncoder.Support"
], function(Class, EventsMixin, Objs, Time, Functions, Async, Support, WebmSupport, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {

        var CLUSTER_MAX_DURATION = 30000;

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
                    return;
                this._started = true;
                if (this._options.video) {
                    this._options.recordWidth = this._options.video.videoWidth || this._options.video.clientWidth;
                    this._options.recordHeight = this._options.video.videoHeight || this._options.video.clientHeight;
                }
                this._video = document.createElement('video');
                this._video.width = this._options.recordWidth;
                this._video.height = this._options.recordHeight;
                Support.bindStreamToVideo(this._stream, this._video);
                this._canvas = document.createElement('canvas');
                this._canvas.width = this._options.recordWidth;
                this._canvas.height = this._options.recordHeight;
                this._context = this._canvas.getContext('2d');
                this._frames = [];
                //this._isOnStartedDrawingNonBlankFramesInvoked = false;
                this._lastTime = Time.now();
                this._startTime = this._lastTime;
                this.trigger("started");
                Async.eventually(this._process, [], this);
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
                    image: this._canvas.toDataURL('image/webp', this._options.quality)
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
                this._data = this.__compile(this.__dropBlackFrames(this._canvas, this._frames));
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

        supported: function() {
            return Support.globals().webpSupport;
        }

    });
});