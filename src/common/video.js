Scoped.define("module:Common.Video.PixelSampler", [
    "base:Class",
    "base:Maths"
], function(Class, Maths, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {
            constructor: function(video, options) {
                inherited.constructor.call(this);
                this._video = video;
                this._areas = options && options.areas || [
                    [
                        [0, 1], // x0, x1
                        [0, 1] // y0, y1
                    ]
                ];
                this._samples = options && options.samples || 100;
            },
            _prepareCanvas: function() {
                if (!this._video.videoWidth) return;
                if (!this._canvas) {
                    this._canvas = document.createElement("canvas");
                    this._canvas.width = this._video.videoWidth;
                    this._canvas.height = this._video.videoHeight;
                }
                this._getCanvasCtx().drawImage(this._video, 0, 0, this._video.videoWidth, this._video.videoHeight);
            },
            _getCanvasCtx: function() {
                if (!this._canvas) return;
                return this._canvas.getContext("2d", {
                    willReadFrequently: true
                });
            },
            _pixelSample: function(samples, area, callback, context) {
                var ctx = this._getCanvasCtx();
                if (!ctx) {
                    callback.call(context || this, 0, 0, 0);
                    return;
                }
                samples = samples || this._samples;
                area = area || this._areas[0];
                var w = this._video.videoWidth;
                var h = this._video.videoHeight;
                for (var i = 0; i < samples; i++) {
                    var x = Maths.randomInt(area[0][0] * w, Math.min(area[0][1] * w, w - 1));
                    var y = Maths.randomInt(area[1][0] * h, Math.min(area[1][1] * h, h - 1));
                    data = ctx.getImageData(x, y, 1, 1).data;
                    callback.call(context || this, data[0], data[1], data[2]);
                }
            },
            _materializePixelSample: function(samples, area) {
                var result = [];
                this._pixelSample(samples, area, function(r, g, b) {
                    result.push([r, g, b]);
                });
                return result;
            },
            lightLevel: function(samples, areas) {
                this._prepareCanvas();
                areas = areas || this._areas;
                if (areas.length === 1) return this._singleLightLevel(samples, areas[0]);
                var result = [];
                for (var i = 0; i < areas.length; i++) {
                    result.push(this._singleLightLevel(samples, areas[i]));
                }
                return result;
            },
            _singleLightLevel: function(samples, area) {
                var total_light = 0.0;
                samples = samples || this._samples;
                this._pixelSample(samples, area, function(r, g, b) {
                    total_light += r + g + b;
                });
                return total_light / (3 * samples);
            },
            blankLevel: function(samples, areas) {
                this._prepareCanvas();
                areas = areas || this._areas;
                if (areas.length === 1) return this._singleBlankLevel(samples, areas[0]);
                var result = [];
                for (var i = 0; i < areas.length; i++) {
                    result.push(this._singleBlankLevel(samples, areas[i]));
                }
                return result;
            },
            _singleBlankLevel: function(samples, area) {
                var total_light = 0.0;
                samples = samples || this._samples;
                this._pixelSample(samples, area, function(r, g, b) {
                    total_light += Math.pow(r, 2) + Math.pow(g, 2) + Math.pow(b, 2);
                });
                return Math.sqrt(total_light / (3 * samples));
            },
            deltaCoefficient: function(samples, areas) {
                this._prepareCanvas();
                areas = areas || this._areas;
                if (areas.length === 1) return this._singleDeltaCoefficient(samples, areas[0]);
                var result = [];
                for (var i = 0; i < areas.length; i++) {
                    result.push(this._singleDeltaCoefficient(samples, areas[i]));
                }
                return result;
            },
            _singleDeltaCoefficient: function(samples, area) {
                samples = samples || this._samples;
                var current = this._materializePixelSample(samples, area);
                if (!this.__deltaSample) {
                    this.__deltaSample = current;
                    return null;
                }
                var delta_total = 0.0;
                for (var i = 0; i < current.length; i++)
                    for (var j = 0; j < 3; j++)
                        delta_total += Math.pow(current[i][j] - this.__deltaSample[i][j], 2);
                this.__deltaSample = current;
                return Math.sqrt(delta_total / (3 * samples));
            }
        };
    });
});

Scoped.define("module:Common.Video.PixelSampleMixin", [
    "module:Common.Video.PixelSampler"
], function(PixelSampler) {
    return {
        _createPixelSampler: function() {
            return this.__pixelSampler = this.auto_destroy(new PixelSampler(this._video || this._element, this._options.pixelSamplerOptions));
        },
        _getPixelSampler: function() {
            return this.__pixelSampler || this._createPixelSampler();
        },
        lightLevel: function(samples, areas) {
            return this._getPixelSampler().lightLevel(samples, areas);
        },
        blankLevel: function(samples, areas) {
            return this._getPixelSampler().blankLevel(samples, areas);
        },
        deltaCoefficient: function(samples, areas) {
            return this._getPixelSampler().deltaCoefficient(samples, areas);
        }
    };
});