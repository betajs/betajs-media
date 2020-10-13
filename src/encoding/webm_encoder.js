Scoped.define("module:Encoding.WebmEncoder.Support", [
    "base:Promise",
    "base:Scheduling.Helper",
    "base:Types"
], function(Promise, SchedulingHelper, Types) {
    return {

        parseWebP: function(riff) {
            var VP8 = riff.RIFF[0].WEBP[0];

            var frame_start = VP8.indexOf('\x9d\x01\x2a'); // A VP8 keyframe starts with the 0x9d012a header
            for (var i = 0, c = []; i < 4; i++) c[i] = VP8.charCodeAt(frame_start + 3 + i);

            var width, height, tmp;

            //the code below is literally copied verbatim from the bitstream spec
            tmp = (c[1] << 8) | c[0];
            width = tmp & 0x3FFF;
            tmp = (c[3] << 8) | c[2];
            height = tmp & 0x3FFF;
            return {
                width: width,
                height: height,
                data: VP8,
                riff: riff
            };
        },

        parseRIFF: function(string) {
            var offset = 0;
            var chunks = {};

            var f = function(i) {
                var unpadded = i.charCodeAt(0).toString(2);
                return (new Array(8 - unpadded.length + 1)).join('0') + unpadded;
            };

            while (offset < string.length) {
                var id = string.substr(offset, 4);
                var len = parseInt(string.substr(offset + 4, 4).split('').map(f).join(''), 2);
                var data = string.substr(offset + 4 + 4, len);
                offset += 4 + 4 + len;
                chunks[id] = chunks[id] || [];

                if (id == 'RIFF' || id == 'LIST')
                    chunks[id].push(this.parseRIFF(data));
                else
                    chunks[id].push(data);
            }
            return chunks;
        },

        /**
         *
         * @param {HTMLCanvasElement} canvas
         * @param {object} frame
         * @param {number} _pixTolerance - 0 - only black pixel color; 1 - all
         * @param {number} _frameTolerance - 0 - only black frame color; 1 - all
         * @return {boolean}
         */
        isBlankFrame: function(canvas, frame, _pixTolerance, _frameTolerance) {
            if (typeof Array.prototype.some === "function") {
                return !canvas.getContext('2d')
                    .getImageData(0, 0, canvas.width, canvas.height).data
                    .some(function(channel) {
                        return channel !== 0;
                    });
            } else {
                var localCanvas = document.createElement('canvas');
                localCanvas.width = canvas.width;
                localCanvas.height = canvas.height;
                var context2d = localCanvas.getContext('2d');

                var sampleColor = {
                    r: 0,
                    g: 0,
                    b: 0
                };
                var maxColorDifference = Math.sqrt(
                    Math.pow(255, 2) +
                    Math.pow(255, 2) +
                    Math.pow(255, 2)
                );
                var pixTolerance = _pixTolerance && _pixTolerance >= 0 && _pixTolerance <= 1 ? _pixTolerance : 0;
                var frameTolerance = _frameTolerance && _frameTolerance >= 0 && _frameTolerance <= 1 ? _frameTolerance : 0;

                var matchPixCount, endPixCheck, maxPixCount;

                var image = new Image();
                image.src = frame.image;
                context2d.drawImage(image, 0, 0, canvas.width, canvas.height);
                var imageData = context2d.getImageData(0, 0, canvas.width, canvas.height);
                matchPixCount = 0;
                endPixCheck = imageData.data.length;
                maxPixCount = imageData.data.length / 4;

                for (var pix = 0; pix < endPixCheck; pix += 4) {
                    var currentColor = {
                        r: imageData.data[pix],
                        g: imageData.data[pix + 1],
                        b: imageData.data[pix + 2]
                    };
                    var colorDifference = Math.sqrt(
                        Math.pow(currentColor.r - sampleColor.r, 2) +
                        Math.pow(currentColor.g - sampleColor.g, 2) +
                        Math.pow(currentColor.b - sampleColor.b, 2)
                    );
                    if (colorDifference <= maxColorDifference * pixTolerance)
                        matchPixCount++;
                }

                return maxPixCount - matchPixCount <= maxPixCount * frameTolerance;
            }
        },

        makeSimpleBlock: function(data) {
            var flags = 0;
            if (data.keyframe) flags |= 128;
            if (data.invisible) flags |= 8;
            if (data.lacing) flags |= (data.lacing << 1);
            if (data.discardable) flags |= 1;
            if (data.trackNum > 127)
                throw "TrackNumber > 127 not supported";
            var out = [data.trackNum | 0x80, data.timecode >> 8, data.timecode & 0xff, flags].map(function(e) {
                return String.fromCharCode(e);
            }).join('') + data.frame;
            return out;
        },

        generateEBMLHeader: function(duration, width, height) {

            var doubleToString = function(num) {
                return [].slice.call(
                    new Uint8Array((new Float64Array([num])).buffer), 0).map(function(e) {
                    return String.fromCharCode(e);
                }).reverse().join('');
            };

            return [{
                "id": 0x1a45dfa3, // EBML
                "data": [{
                    "data": 1,
                    "id": 0x4286 // EBMLVersion
                }, {
                    "data": 1,
                    "id": 0x42f7 // EBMLReadVersion
                }, {
                    "data": 4,
                    "id": 0x42f2 // EBMLMaxIDLength
                }, {
                    "data": 8,
                    "id": 0x42f3 // EBMLMaxSizeLength
                }, {
                    "data": "webm",
                    "id": 0x4282 // DocType
                }, {
                    "data": 2,
                    "id": 0x4287 // DocTypeVersion
                }, {
                    "data": 2,
                    "id": 0x4285 // DocTypeReadVersion
                }]
            }, {
                "id": 0x18538067, // Segment
                "data": [{
                    "id": 0x1549a966, // Info
                    "data": [{
                        "data": 1e6, //do things in millisecs (num of nanosecs for duration scale)
                        "id": 0x2ad7b1 // TimecodeScale
                    }, {
                        "data": "whammy",
                        "id": 0x4d80 // MuxingApp
                    }, {
                        "data": "whammy",
                        "id": 0x5741 // WritingApp
                    }, {
                        "data": doubleToString(duration),
                        "id": 0x4489 // Duration
                    }]
                }, {
                    "id": 0x1654ae6b, // Tracks
                    "data": [{
                        "id": 0xae, // TrackEntry
                        "data": [{
                            "data": 1,
                            "id": 0xd7 // TrackNumber
                        }, {
                            "data": 1,
                            "id": 0x63c5 // TrackUID
                        }, {
                            "data": 0,
                            "id": 0x9c // FlagLacing
                        }, {
                            "data": "und",
                            "id": 0x22b59c // Language
                        }, {
                            "data": "V_VP8",
                            "id": 0x86 // CodecID
                        }, {
                            "data": "VP8",
                            "id": 0x258688 // CodecName
                        }, {
                            "data": 1,
                            "id": 0x83 // TrackType
                        }, {
                            "id": 0xe0, // Video
                            "data": [{
                                "data": width,
                                "id": 0xb0 // PixelWidth
                            }, {
                                "data": height,
                                "id": 0xba // PixelHeight
                            }]
                        }]
                    }]
                }]
            }];
        },

        __numToBuffer: function(num) {
            var parts = [];
            while (num > 0) {
                parts.push(num & 0xff);
                num = num >> 8;
            }
            return new Uint8Array(parts.reverse());
        },

        __strToBuffer: function(str) {
            return new Uint8Array(str.split('').map(function(e) {
                return e.charCodeAt(0);
            }));
        },

        __bitsToBuffer: function(bits) {
            var data = [];
            var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
            bits = pad + bits;
            for (var i = 0; i < bits.length; i += 8)
                data.push(parseInt(bits.substr(i, 8), 2));
            return new Uint8Array(data);
        },

        serializeEBML: function(json) {
            if (!Types.is_array(json))
                return json;
            var ebml = [];
            json.forEach(function(entry) {
                var data = entry.data;
                var tp = typeof data;
                if (tp === "object")
                    data = this.serializeEBML(data);
                else if (tp === "number")
                    data = this.__bitsToBuffer(data.toString(2));
                else if (tp === "string")
                    data = this.__strToBuffer(data);
                var len = data.size || data.byteLength || data.length;
                var zeroes = Math.ceil(Math.ceil(Math.log(len) / Math.log(2)) / 8);
                var size_str = len.toString(2);
                var padded = (new Array((zeroes * 7 + 7 + 1) - size_str.length)).join('0') + size_str;
                var size = (new Array(zeroes)).join('0') + '1' + padded;
                ebml.push(this.__numToBuffer(entry.id));
                ebml.push(this.__bitsToBuffer(size));
                ebml.push(data);
            }, this);
            return new Blob(ebml, {
                type: "video/webm"
            });
        },

        makeTimecodeDataBlock: function(data, clusterDuration) {
            return {
                data: this.makeSimpleBlock({
                    discardable: 0,
                    frame: data.slice(4),
                    invisible: 0,
                    keyframe: 1,
                    lacing: 0,
                    trackNum: 1,
                    timecode: Math.round(clusterDuration)
                }),
                id: 0xa3
            };
        },

        makeCluster: function(clusterFrames, clusterTimecode) {
            clusterFrames.unshift({
                "data": clusterTimecode,
                "id": 0xe7 // Timecode
            });
            return {
                "id": 0x1f43b675, // Cluster
                "data": clusterFrames
            };
        }

    };
});