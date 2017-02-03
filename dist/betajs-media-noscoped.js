/*!
betajs-media - v0.0.42 - 2017-02-03
Copyright (c) Ziggeo,Oliver Friedmann
Apache-2.0 Software License.
*/

(function () {
var Scoped = this.subScope();
Scoped.binding('module', 'global:BetaJS.Media');
Scoped.binding('base', 'global:BetaJS');
Scoped.binding('browser', 'global:BetaJS.Browser');
Scoped.binding('flash', 'global:BetaJS.Flash');
Scoped.binding('jquery', 'global:jQuery');
Scoped.define("module:", function () {
	return {
    "guid": "8475efdb-dd7e-402e-9f50-36c76945a692",
    "version": "0.0.42"
};
});
Scoped.assumeVersion('base:version', '~1.0.96');
Scoped.assumeVersion('browser:version', '~1.0.61');
Scoped.assumeVersion('flash:version', '~0.0.18');

Scoped.define("module:Encoding.WaveEncoder.Support", [
    "base:Promise",
    "base:Scheduling.Helper"
], function (Promise, SchedulingHelper) {
	return {
		
		dumpInputBuffer: function (inputBuffer, audioChannels, bufferSize, offset) {
			return {
				left: new Float32Array(inputBuffer.getChannelData(0)),
				right: audioChannels > 1 ? new Float32Array(inputBuffer.getChannelData(1)) : null,
				offset: offset || 0,
				endOffset: bufferSize
			};
		},
		
		waveChannelTransform: function (dumpedInputBuffer, volume, schedulable, schedulableCtx) {
			var promise = Promise.create();
			var volumeFactor = 0x7FFF * (volume || 1);
			var offset = dumpedInputBuffer.offset;
			var endOffset = dumpedInputBuffer.endOffset;
			var left = dumpedInputBuffer.left;
			var right = dumpedInputBuffer.right;
			var result = new Int16Array((endOffset - offset) * (right ? 2 : 1));
			var resultOffset = 0;
			SchedulingHelper.schedulable(function (steps) {
				while (steps > 0) {
					steps--;
					if (offset >= endOffset) {
						promise.asyncSuccess(result);
						return true;
					}
 					result[resultOffset] = left[offset] * volumeFactor;
 					resultOffset++;
 					if (right) {
 	 					result[resultOffset] = right[offset] * volumeFactor;
 	 					resultOffset++;
 					}
 					offset++;
				}
				return false;
			} , 100, schedulable, schedulableCtx);
			return promise;
		},
		
		generateHeader: function (totalSize, audioChannels, sampleRate, buffer) {
			buffer = buffer || new ArrayBuffer(44);
			var view = new DataView(buffer);
			view.writeUTFBytes = function (offset, string) {
				for (var i = 0; i < string.length; i++)
					this.setUint8(offset + i, string.charCodeAt(i));
			};
			// RIFF chunk descriptor
			view.writeUTFBytes(0, 'RIFF');
			view.setUint32(4, 44 + totalSize, true);
			view.writeUTFBytes(8, 'WAVE');
			// FMT sub-chunk
			view.writeUTFBytes(12, 'fmt ');
			view.setUint32(16, 16, true);
			view.setUint16(20, 1, true);
			// stereo (2 channels)
			view.setUint16(22, audioChannels, true);
			view.setUint32(24, sampleRate, true);
			view.setUint32(28, sampleRate * 4, true);
			view.setUint16(32, audioChannels * 2, true);
			view.setUint16(34, 16, true);
			// data sub-chunk
			view.writeUTFBytes(36, 'data');
			view.setUint32(40, totalSize, true);
			return buffer;
		}

	};
});

/*
Scoped.define("module:Encoding.WaveEncoder.InputBufferDataTransformer", [
	"module:Encoding.WaveEncoder.Support",
	"base:Packetizer.DataTransformer"
], function (Support, DataTransformer, scoped) {
	return DataTransformer.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (audioChannels, bufferSize) {
				inherited.constructor.call(this);
				this.__audioChannels = audioChannels;
				this.__bufferSize = bufferSize;
			},
			
			_consume: function (inputBuffer, packetNumber) {
				this._produce(Support.dumpInputBuffer(inputBuffer, this.__audioChannels, this.__bufferSize), packetNumber);
			}
						
		};
	});
});


Scoped.define("module:Encoding.WaveEncoder.WaveChannelDataTransformer", [
 	"module:Encoding.WaveEncoder.Support",
 	"base:Packetizer.DataTransformer",
 	"base:Scheduling.SchedulableMixin"
], function (Support, DataTransformer, SchedulableMixin, scoped) {
 	return DataTransformer.extend({scoped: scoped}, [SchedulableMixin, function (inherited) {
 		return {
 			
			constructor: function (volume) {
				inherited.constructor.call(this);
				this.__volume = volume || 1;
			},

			_consume: function (data, packetNumber) {
				Support.waveChannelTransform(data, this.__volume, this.schedulable, this).success(function (result) {
					this._produce(result, packetNumber);
				}, this);
 			}
 			
 		};
 	}]);
});



Scoped.define("module:Encoding.WaveEncoder.WaveHeaderPacketDataTransformer", [
   	"module:Encoding.WaveEncoder.Support",
	"base:Packetizer.HeaderPacketDataTransformer"
], function (Support, HeaderPacketDataTransformer, scoped) {
	return HeaderPacketDataTransformer.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (audioChannels, sampleRate) {
				inherited.constructor.call(this);
				this.__audioChannels = audioChannels;
				this.__sampleRate = sampleRate;
				this.__totalSize = 0;
			},
			
			_reset: function () {
				this.__totalSize = 0;
			},
			
			_registerPacket: function (packet, packetNumber) {
				this.__totalSize += packet.length * packet.BYTES_PER_ELEMENT;
			},
			
			_headerPacket: function (totalPackets) {
				return Support.generateHeader(totalSize, this.__audioChannels, this.__sampleRate);
			}		

		};
	});
});


Scoped.define("module:Encoding.WaveEncoder.WaveDataPacketAssembler", [
	"module:Packetizer.PacketAssembler"
], function (PacketAssembler, scoped) {
 	return PacketAssembler.extend({scoped: scoped}, function (inherited) {
 		return {
 			
			_packetSegmentizer: function (packetNumber) {
				return packetNumber > 0 ? 1 : 0;
			},
			
			_packetDesegmentizer: function (packetNumberInSegment, segmentNumber) {
				return packetNumberInSegment + segmentNumber;
			},
			
			_packetSize: function (packet, packetNumber) {
				return packet.length * packet.BYTES_PER_ELEMENT;
			},
			
			_packetSerialize: function (packet, packetNumber, offset, length, dataView) {
				if (packetNumber > 0) {
					for (var i = 0; i < length / 2; ++i)
						dataView.setInt16(i * 2, packet[offset / 2 + i], true);
				} else {
					var packetView = new Uint8Array(packet);
					for (var i = 0; i < length; ++i)
						dataView.setUint8(i, packetView.get(i + offset));
				}
			}
			
 		};
 	});
});
*/

Scoped.define("module:Encoding.WebmEncoder.Support", [
    "base:Promise",
    "base:Scheduling.Helper",
    "base:Types"
], function (Promise, SchedulingHelper, Types) {
	return {

	    parseWebP: function (riff) {
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
	    
		parseRIFF: function (string) {
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
	    
	    isBlankFrame: function (canvas, frame, _pixTolerance, _frameTolerance) {
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
	    },
	    
	    makeSimpleBlock: function (data) {
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
	    
	    generateEBMLHeader: function (duration, width, height) {
	    	
			var doubleToString = function (num) {
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
	    
	    __numToBuffer: function (num) {
	        var parts = [];
	        while (num > 0) {
	            parts.push(num & 0xff);
	            num = num >> 8;
	        }
	        return new Uint8Array(parts.reverse());
	    },

	    __strToBuffer: function (str) {
	        return new Uint8Array(str.split('').map(function(e) {
	            return e.charCodeAt(0);
	        }));
	    },

	    __bitsToBuffer: function (bits) {
	        var data = [];
	        var pad = (bits.length % 8) ? (new Array(1 + 8 - (bits.length % 8))).join('0') : '';
	        bits = pad + bits;
	        for (var i = 0; i < bits.length; i += 8)
	            data.push(parseInt(bits.substr(i, 8), 2));
	        return new Uint8Array(data);
	    },

	    serializeEBML: function (json) {
	    	if (!Types.is_array(json))
	    		return json;
	        var ebml = [];
	        json.forEach(function (entry) {
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
	        return new Blob(ebml, { type: "video/webm" });
	    },
	    
		makeTimecodeDataBlock: function (data, clusterDuration) {
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
		
    	makeCluster: function (clusterFrames, clusterTimecode) {
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

Scoped.define("module:Player.FlashPlayer", [
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
    "jquery:",
    "base:Promise"
], function (Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, $, Promise, scoped) {
	var Cls = Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (element, attrs) {
				inherited.constructor.call(this, element, attrs);
				this._source = this.__preferedSource();
				this._embedding = this.auto_destroy(new FlashEmbedding(element, {
					registry: this.cls.flashRegistry(),
					wrap: true,
					debug: false
				}));
				this._flashObjs = {};
				this._flashData = {
					status: 'idle'
				};
				this.ready = Promise.create();
				this._embedding.ready(this.__initializeEmbedding, this);
			},
			
			__preferedSource: function () {
				var preferred = [".mp4", ".flv"];
				var sources = [];
				if (this.readAttr("src") || this.readAttr("source") || this.readAttr("sources")) {
					var src = this.readAttr("src") || this.readAttr("source") || this.readAttr("sources");
					if (Types.is_array(src))
						sources = src;
					else
						sources.push(src);
				}
				var element = this._element;
				if (!(Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)) {
					for (var i = 0; i < this._element.childNodes.length; ++i) {
						if (element.childNodes[i].tagName && element.childNodes[i].tagName.toLowerCase() == "source" && element.childNodes[i].src)
							sources.push(element.childNodes[i].src.toLowerCase());
					}
				} else {
					var $current = $(this._element);
					while (true) {
						var $next = $current.next();
						var next = $next.get(0);
						if (!next || next.tagName.toLowerCase() != "source") 
							break;
						sources.push($next.attr("src").toLowerCase());
						$current = $next;
					}
				}
				sources = Objs.map(sources, function (source) {
					return source.src || source;
				});
				var source = sources[0];
				var currentExtIndex = preferred.length - 1;
				for (var k = sources.length - 1; k >= 0; --k) {
					for (var j = 0; j <= currentExtIndex; ++j) {
						if (Strings.ends_with(sources[k], preferred[j])) {
							source = sources[k];
							currentExtIndex = j;
							break;
						}
					}
				}
				if (source.indexOf("://") == -1)
					source = document.location.href + "/../" + source;
				
				var connectionUrl = null;
				var playUrl = source;
				if (Strings.starts_with(source, "rtmp")) {
					var spl = Strings.splitLast(source, "/");
					connectionUrl = spl.head;
					playUrl = spl.tail;
				}
				return {
					sourceUrl: source,
					connectionUrl: connectionUrl,
					playUrl: playUrl
				};
			},
			
			__initializeEmbedding: function () {
				this._flashObjs.main = this._embedding.flashMain();
				this._flashObjs.stage = this._flashObjs.main.get("stage");
				this._flashObjs.stage.set("scaleMode", "noScale");
				this._flashObjs.stage.set("align", "TL");
				
				if (this.readAttr("poster")) {
					this._flashObjs.imageLoader = this._embedding.newObject("flash.display.Loader");
					var contentLoaderInfo = this._flashObjs.imageLoader.get("contentLoaderInfo");
					contentLoaderInfo.addEventListener("complete", this._embedding.newCallback(Functions.as_method(function () {
						this.__imageLoaded = {
							width: this._flashObjs.imageLoader.get("width"),
							height: this._flashObjs.imageLoader.get("height")
						};
						if (!this.__metaLoaded)
							this.recomputeBB();
					}, this)));
					contentLoaderInfo.addEventListener("ioError", this._embedding.newCallback(Functions.as_method(function () {
						this.domEvent("postererror");
					}, this)));
					this._flashObjs.imageUrlRequest = this._embedding.newObject("flash.net.URLRequest", this.readAttr("poster"));
					this._flashObjs.imageLoader.load(this._flashObjs.imageUrlRequest);
					this._flashObjs.main.addChildVoid(this._flashObjs.imageLoader);
				}
				this._flashObjs.video = this._embedding.newObject(
					"flash.media.Video",
					this._flashObjs.stage.get("stageWidth"),
					this._flashObjs.stage.get("stageHeight")
				);
				this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
				this._flashObjs.connection.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__connectionStatusEvent, this)));
				this._flashObjs.connection.connectVoid(this._source.connectionUrl);
			},
			
			__connectionStatusEvent: function () {
				this._flashObjs.stream = this._embedding.newObject("flash.net.NetStream", this._flashObjs.connection);
				this._flashObjs.stream.set("client", this._embedding.newCallback("onMetaData", Functions.as_method(function (info) {
					this._flashData.meta = info;
					this._element.duration = info.duration;
					this.__metaLoaded = true;
					Async.eventually(this.recomputeBB, this);
				}, this)));
				this._flashObjs.stream.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__streamStatusEvent, this)));
				this._flashObjs.soundTransform = this._embedding.newObject("flash.media.SoundTransform");
				this._flashObjs.stream.set("soundTransform", this._flashObjs.soundTransform);				
				this._flashObjs.video.attachNetStreamVoid(this._flashObjs.stream);
				this.writeAttr("volume", 1.0);
				if (this.hasAttr("muted")) {
					this._flashObjs.soundTransform.set("volume", 0.0);
					this._flashObjs.stream.set("soundTransform", null);				
					this._flashObjs.stream.set("soundTransform", this._flashObjs.soundTransform);
					this.writeAttr("volume", 0.0);
				}
				this._flashObjs.main.addChildVoid(this._flashObjs.video);
				if (this.hasAttr("autoplay"))
					this._element.play();
				this.ready.asyncSuccess(this);
			},
			
			__streamStatusEvent: function (event) {
				var code = event.get("info").code;
				if (code == "NetStream.Play.StreamNotFound") {
					this._flashData.status = "error";
					this.domEvent("videoerror");
				}
				if (code == "NetStream.Play.Start")
					this._flashData.status = "start";
				if (code == "NetStream.Play.Stop")
					this._flashData.status = "stopping";
				if (code == "NetStream.Buffer.Empty" && this._flashData.status == "stopping") {
					this._flashData.status = "stopped";
					this.domEvent("ended");
				}
				if (this._flashData.status == "stopped" && this.hasAttr("loop")) {
					this._flashData.status = "idle";
					this._element.play();
				}
			},
			
			idealBB: function () {
				if (!this.__imageLoaded && !this.__metaLoaded)
					return null;
				return {
					width: this.__metaLoaded ? this._flashData.meta.width : this.__imageLoaded.width,
					height: this.__metaLoaded ? this._flashData.meta.height : this.__imageLoaded.height
				};
			},
			
			setActualBB: function (actualBB) {
				$(this._element).find("object").css("width", actualBB.width + "px");
				$(this._element).find("embed").css("width", actualBB.width + "px");
				$(this._element).find("object").css("height", actualBB.height + "px");
				$(this._element).find("embed").css("height", actualBB.height + "px");
				if (this.__metaLoaded) {
					this._flashObjs.video.set("width", actualBB.width);
					this._flashObjs.video.set("height", actualBB.height);
				}
				if (this.__imageLoaded) {
					this._flashObjs.imageLoader.set("width", actualBB.width);
					this._flashObjs.imageLoader.set("height", actualBB.height);
				}
			},
			
			videoWidth: function () {
				return this.__metaLoaded ? this._flashData.meta.width : (this.__imageLoaded ? this.__imageLoaded.width : NaN);
			},
			
			videoHeight: function () {
				return this.__metaLoaded ? this._flashData.meta.height : (this.__imageLoaded ? this.__imageLoaded.height : NaN);
			},

			_domMethods: ["play", "pause", "load"],
			
			_domAttrs: {
				"volume": {
					set: "_setVolume"
				},
				"currentTime": {
					get: "_getCurrentTime",
					set: "_setCurrentTime"
				}				
			},
			
			load: function () {},
			
			play: function () {
				if (this._flashObjs.main.imageLoader)
					this._flashObjs.main.setChildIndex(this._flashObjs.video, 1);
				if (this._flashData.status === "paused")
					this._flashObjs.stream.resumeVoid();
				else
					this._flashObjs.stream.playVoid(this._source.playUrl);
				this._flashData.status = "playing";
				this.domEvent("playing");
			},
			
			pause: function () {
				if (this._flashData.status === "paused")
					return;
				this._flashData.status = "paused";
				this._flashObjs.stream.pauseVoid();
				this.domEvent("pause");
			},
			
			_setVolume: function (volume) {
				this._flashObjs.soundTransform.set("volume", volume);
				this._flashObjs.stream.set("soundTransform", null);				
				this._flashObjs.stream.set("soundTransform", this._flashObjs.soundTransform);
				this.domEvent("volumechange");
			},
			
			_getCurrentTime: function () {
				return this._flashObjs.stream.get("time");
			},
			
			_setCurrentTime: function (time) {
				this._flashObjs.stream.seek(time);
			}
		
		};		
	}, {
		
		flashRegistry: function () {
			if (!this.__flashRegistry) {
				this.__flashRegistry = new FlashClassRegistry();
				this.__flashRegistry.register("flash.media.Video", ["attachNetStream"]);
				this.__flashRegistry.register("flash.display.Sprite", ["addChild", "setChildIndex"]);
				this.__flashRegistry.register("flash.display.Stage", []);
				this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener", "seek"]);
				this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
				this.__flashRegistry.register("flash.media.SoundTransform", []);
				this.__flashRegistry.register("flash.display.Loader", ["load"]);
				this.__flashRegistry.register("flash.net.URLRequest", []);
				this.__flashRegistry.register("flash.display.LoaderInfo", ["addEventListener"]);
			}
			return this.__flashRegistry;
		},
		
		polyfill: function (element, polyfilltag, force, eventual) {
			if (eventual) {
				var promise = Promise.create();
				Async.eventually(function () {
					promise.asyncSuccess(Cls.polyfill(element, polyfilltag, force));
				});
				return promise; 
			}
			if (element.tagName.toLowerCase() != "video" || !("networkState" in element))
				return Cls.attach(element);
			else if (element.networkState == element.NETWORK_NO_SOURCE || force)
				return Cls.attach(Dom.changeTag(element, polyfilltag || "videopoly"));
			return element;
		},
		
		attach: function (element, attrs) {
			var cls = new Cls(element, attrs);
			return element;
		}
		
		
	});
	return Cls;
});
Scoped.define("module:Player.Support", function () {
	return {
		
		resolutionToLabel: function (width, height) {
			if (height < 300)
				return "SD";
			if (height < 400)
				return "360p";
			if (height < 500)
				return "480p";
			return "HD";
		}
		
	};
});
Scoped.define("module:Player.VideoPlayerWrapper", [
    "base:Classes.OptimisticConditionalInstance",
    "base:Events.EventsMixin",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "jquery:"
], function (OptimisticConditionalInstance, EventsMixin, Types, Objs, Strings, $, scoped) {
	return OptimisticConditionalInstance.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (options, transitionals) {
				inherited.constructor.call(this);
				options = Objs.extend(Objs.clone(options || {}, 1), transitionals);
				this._poster = options.poster || null;
				var sources = options.source || options.sources || [];
				if (Types.is_string(sources))
					sources = sources.split(" ");
				else if (!Types.is_array(sources))
					sources = [sources];
				var sourcesMapped = [];
				Objs.iter(sources, function (source) {
					if (Types.is_string(source))
						source = {src: source.trim()};
					else if (typeof Blob !== 'undefined' && source instanceof Blob)
						source = {src: source};
					if (source.ext && !source.type)
						source.type = "video/" + source.ext;
					if (!source.ext && source.type)
						source.ext = Strings.last_after(source.type, "/");
					if (!source.ext && !source.type && Types.is_string(source.src)) {
						var temp = Strings.splitFirst(source.src, "?").head;
						if (temp.indexOf(".") >= 0) {
							source.ext = Strings.last_after(temp, ".");
							source.type = "video/" + source.ext;
						}
					}
					if (source.ext)
						source.ext = source.ext.toLowerCase();
					if (source.type)
						source.type = source.type.toLowerCase();
					if (typeof Blob !== 'undefined' && source.src instanceof Blob)
						source.src = (window.URL || window.webkitURL).createObjectURL(source.src);
					if (typeof Blob !== 'undefined' && source.audiosrc instanceof Blob)
						source.audiosrc = (window.URL || window.webkitURL).createObjectURL(source.audiosrc);
					sourcesMapped.push(source);
				}, this);
				this._sources = sourcesMapped;
				this._element = options.element;
				this._$element = $(options.element);
				this._preload = options.preload || false;
				this._reloadonplay = options.reloadonplay || false;
				this._options = options;
				this._loop = options.loop || false;
				this._loaded = false;
				this._postererror = false;
				this._error = 0;
			},
			
			destroy: function () {
				this._$element.off("." + this.cid());
				inherited.destroy.call(this);
			},
			
			poster: function () {
				return this._poster;
			},
			
			sources: function () {
				return this._sources;
			},
			
			loaded: function () {
				return this._loaded;
			},
			
			postererror: function () {
				return this._postererror;
			},
			
			buffered: function () {},
			
			_eventLoaded: function () {
				this._loaded = true;
				this.trigger("loaded");
			},
			
			_eventPlaying: function () {
				this.trigger("playing");
			},
			
			_eventPaused: function () {
				this.trigger("paused");
			},
			
			_eventEnded: function () {
				this.trigger("ended");
			},
			
			_eventError: function (error) {
				this._error = error;
				this.trigger("error", error);
			},

			_eventPosterError: function () {
				this._postererror = true;
				this.trigger("postererror");
			},
			
			supportsFullscreen: function () {
				return false;
			},
			
			duration: function () {
				return this._element.duration;
			},
			
			position: function () {
				return this._element.currentTime;
			},
			
			enterFullscreen: function () {},

      enterParentFullscreen: function () {},

      exitFullscreen: function () {},

			error: function () {
				return this._error;
			},
			
      play: function () {
        if (this._reloadonplay)
          this._element.load();
        this._element.play();
      },

      pause: function () {
        this._element.pause();
      },

      setPosition: function (position) {
        this._element.currentTime = position;
      },

      muted: function () {
        return this._element.muted;
      },

      setMuted: function (muted) {
        this._element.muted = muted;
      },

      volume: function () {
        return this._element.volume;
      },

      setVolume: function (volume) {
        this._element.volume = volume;
      },

      videoWidth: function () {},

      videoHeight: function () {}
			
		};
	}], {
		
		ERROR_NO_PLAYABLE_SOURCE: 1,		
		ERROR_FLASH_NOT_INSTALLED: 2
		
	});
});


Scoped.define("module:Player.Html5VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "base:Strings",
    "base:Async",
    "jquery:",
    "browser:Dom"
], function (VideoPlayerWrapper, Info, Promise, Objs, Timer, Strings, Async, $, Dom, scoped) {
	return VideoPlayerWrapper.extend({scoped: scoped}, function (inherited) {
		return {
			
			_initialize: function () {
				if (this._options.nohtml5)
					return Promise.error(true);
				if (this._sources.length < 1)
					return Promise.error(true);
				if (Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)
					return Promise.error(true);
				if (this._options.forceflash)
					return Promise.error(true);
				var self = this;
				var promise = Promise.create();
				this._$element.html("");
				var sources = this.sources();
				var ie9 = Info.isInternetExplorer() && Info.internetExplorerVersion() == 9;
				if (this._element.tagName.toLowerCase() !== "video") {
					this._element = Dom.changeTag(this._element, "video");
					this._$element = $(this._element);
					this._transitionals.element = this._element;
				} else if (ie9) {
					var str = Strings.splitLast(this._element.outerHTML, "</video>").head;
					Objs.iter(sources, function (source) {
						str += "<source" + (source.type ? " type='" + source.type + "'" : "") + " src='" + source.src + "' />";
					});
					str += "</video>";
					var $str = $(str);
					this._$element.replaceWith($str);
					this._$element = $str;
					this._element = this._$element.get(0);
					this._transitionals.element = this._element;
				}
				/*
				var loadevent = "loadedmetadata";
				if (Info.isSafari() && Info.safariVersion() < 9)
					loadevent = "loadstart";
					*/
				var loadevent = "loadstart";
				this._$element.on(loadevent + "." + this.cid(), function () {
					if (/*loadevent === "loadstart" && */self._element.networkState === self._element.NETWORK_NO_SOURCE) {
						promise.asyncError(true);
						return;
					}
					promise.asyncSuccess(true);
				});
				var nosourceCounter = 10;
				var timer = new Timer({
					context: this,
					fire: function () {
						if (this._element.networkState === this._element.NETWORK_NO_SOURCE) {
							nosourceCounter--;
							if (nosourceCounter <= 0) 
								promise.asyncError(true);
						} else if (this._element.networkState === this._element.NETWORK_IDLE) 
							promise.asyncSuccess(true);
					},
					delay: 50
				});				
				if (!this._preload)
					this._$element.attr("preload", "none");
				if (this._loop)
					this._$element.attr("loop", "loop");
				var errorCount = 0;
				this._audioElement = null;
				if (!ie9) {
					Objs.iter(sources, function (source) {
						var $source = $("<source" + (source.type ? " type='" + source.type + "'" : "") + " />").appendTo(this._$element);
						$source.on("error", function () {
							errorCount++;
							if (errorCount === sources.length)
								promise.asyncError(true);
						});
						$source.get(0).src = source.src;
						if (source.audiosrc) {
							if (!this._audioElement)
								this._audioElement = $("<audio></audio>").insertAfter(this._$element).get(0);
							$source = $("<source" + (source.type ? " type='" + source.type + "'" : "") + " />").appendTo(this._audioElement);
							$source.get(0).src = source.audiosrc;
						}
					}, this);
				} else {
					this._$element.find("source").on("error", function () {
						errorCount++;
						if (errorCount === sources.length)
							promise.asyncError(true);
					});
				}
				if (this.poster())
					this._element.poster = this.posterURL();
				promise.callback(function () {
					this._$element.find("source").off("error");
					timer.destroy();
				}, this);
				promise.success(function () {
					this._setup();
				}, this);
				try {
					if (!Info.isChrome())
						this._$element.get(0).load();
				} catch (e) {}
				return promise;
			},
			
			posterURL: function () {
				var poster = this.poster();			
				if (poster && typeof Blob !== 'undefined' && poster instanceof Blob)
					return (window.URL || window.webkitURL).createObjectURL(poster);
				return poster;
			},
			
			destroy: function () {
				if (this._audioElement)
					this._audioElement.remove();
				if (this.supportsFullscreen() && this.__fullscreenListener)
					Dom.elementOffFullscreenChange(this._element, this.__fullscreenListener);
				this._$element.html("");
				inherited.destroy.call(this);
			},
			
			_setup: function () {
				this._loaded = false;
				var self = this;
				var videoOn = function (event, handler) {
					self._$element.on(event + "." + self.cid(), function () {
						handler.apply(self, arguments);
					});
				};
				videoOn("canplay", this._eventLoaded);
				videoOn("playing", this._eventPlaying);
				videoOn("pause", this._eventPaused);
				videoOn("ended", this._eventEnded);
				self._$element.find("source").on("error" + "." + self.cid(), function () {
					self._eventError(self.cls.ERROR_NO_PLAYABLE_SOURCE);
				});
				if (this.poster()) {
					var image = new Image();
					image.onerror = function () {
						self._$element.attr("poster", "");
						self._$element.attr("preload", "");
						self._eventPosterError();
					};
					image.src = this.posterURL();
					image.onload = function () {
						self.__imageWidth = image.width;
						self.__imageHeight = image.height;
					};
				}
				if (Info.isSafari() && (Info.safariVersion() > 5 || Info.safariVersion() < 9)) {
					if (this._element.networkState === this._element.NETWORK_LOADING) {
						Async.eventually(function () {
							if (!this.destroyed() && this._element.networkState === this._element.NETWORK_LOADING && this._element.buffered.length === 0)
								this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
						}, this, 10000);
					}
				}
				if (this.supportsFullscreen()) {
					this.__videoClassBackup = "";
					this.__fullscreenListener = Dom.elementOnFullscreenChange(this._element, function (element, inFullscreen) {
						if (inFullscreen) {
							this.__videoClassBackup = this._$element.attr("class");
							this._$element.attr("class", "");
						} else {
							this._$element.attr("class", this.__videoClassBackup);
							this.__videoClassBackup = "";
						}
					}, this);
				}
			},
			
			buffered: function () {
				return this._element.buffered.end(0);
			},
			
			supportsFullscreen: function () {
				return Dom.elementSupportsFullscreen(this._element);
			},
			
      enterFullscreen: function () {
        Dom.elementEnterFullscreen(this._element);
      },

      enterParentFullscreen: function () {
        Dom.elementEnterFullscreen(this._element.parentElement);
      },

      exitFullscreen: function() {
        Dom.documentExitFullscreen();
      },

      videoWidth: function () {
        return this._$element.get(0).width || this.__imageWidth || NaN;
      },

      videoHeight: function () {
        return this._$element.get(0).height || this.__imageHeight || NaN;
      },

      play: function () {
        inherited.play.call(this);
        if (this._audioElement) {
          if (this._reloadonplay)
            this._audioElement.load();
          this._audioElement.play();
        }
      },

      pause: function () {
        this._element.pause();
        if (this._audioElement)
          this._audioElement.pause();
      },

      setPosition: function (position) {
        this._element.currentTime = position;
          if (this._audioElement)
            this._audioElement.currentTime = position;
      },

      muted: function () {
        return (this._audioElement ? this._audioElement : this._element).muted;
      },

      setMuted: function (muted) {
        (this._audioElement ? this._audioElement : this._element).muted = muted;
      },

      volume: function () {
        return (this._audioElement ? this._audioElement : this._element).volume;
      },

      setVolume: function (volume) {
        (this._audioElement ? this._audioElement : this._element).volume = volume;
      }

		};		
	});	
});


Scoped.define("module:Player.FlashPlayerWrapper", [
     "module:Player.VideoPlayerWrapper",
     "module:Player.FlashPlayer",
     "browser:Info",
     "base:Promise",
     "browser:Dom",
     "jquery:"
], function (VideoPlayerWrapper, FlashPlayer, Info, Promise, Dom, $, scoped) {
	return VideoPlayerWrapper.extend({scoped: scoped}, function (inherited) {
		return {
		
			_initialize: function () {
				if (this._options.noflash)
					return Promise.error(true);
				if (this._sources.length < 1)
					return Promise.error(true);
				if (Info.isMobile() || !Info.flash().supported())
					return Promise.error(true);
				if (!Info.flash().installed() && this._options.flashinstallrequired)
					return Promise.error(true);				
				if (!Info.flash().installed()) { 
					this._eventError(this.cls.ERROR_NO_FLASH_INSTALLED);
					return Promise.value(true);
				}
				var self = this;
				var promise = Promise.create();
				if (this._element.tagName.toLowerCase() !== "div") {
					this._element = Dom.changeTag(this._element, "div");
					this._$element = $(this._element);
					this._transitionals.element = this._element;
				}
				var opts = {
					poster: this.poster(),
					sources: this.sources()
				};
				if (this._loop)
					opts.loop = true;
				this._flashPlayer = new FlashPlayer(this._element, opts);
				return this._flashPlayer.ready.success(function () {
					this._setup();
				}, this);
			},
			
			destroy: function () {
				if (this._flashPlayer)
					this._flashPlayer.weakDestroy();
				this._$element.html("");
				inherited.destroy.call(this);
			},
			
			_setup: function () {
				this._loaded = true;
				this._eventLoaded();
				var self = this;
				var videoOn = function (event, handler) {
					self._$element.on(event + "." + self.cid(), function () {
						handler.apply(self, arguments);
					});
				};
				videoOn("playing", this._eventPlaying);
				videoOn("pause", this._eventPaused);
				videoOn("ended", this._eventEnded);
				videoOn("videoerror", function () {
					this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
				});
				videoOn("postererror", this._eventPosterError);
			},
			
			position: function () {
				return this._element.get("currentTime");
			},
			
			buffered: function () {
				return this.position();
			},
			
      setPosition: function (position) {
        this._element.set("currentTime", position);
      },

      setVolume: function (volume) {
        this._element.set("volume", volume);
      },

      videoWidth: function () {
        return this._flashPlayer ? this._flashPlayer.videoWidth() : null;
      },

      videoHeight: function () {
        return this._flashPlayer ? this._flashPlayer.videoHeight() : null;
      }

		};		
	});	
});



Scoped.extend("module:Player.VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "module:Player.Html5VideoPlayerWrapper"
], function (VideoPlayerWrapper, Html5VideoPlayerWrapper) {
	VideoPlayerWrapper.register(Html5VideoPlayerWrapper, 2);
	return {};
});


Scoped.extend("module:Player.VideoPlayerWrapper", [
	"module:Player.VideoPlayerWrapper",
	"module:Player.FlashPlayerWrapper"
], function (VideoPlayerWrapper, FlashPlayerWrapper) {
	VideoPlayerWrapper.register(FlashPlayerWrapper, 1);
	return {};
});

Scoped.define("module:Flash.FlashRecorder", [
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
    "jquery:",
    "base:Promise",
    "base:Events.EventsMixin",
    "module:Recorder.PixelSampleMixin"
], function (Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Timer, Time, $, Promise, EventsMixin, PixelSampleMixin, scoped) {
	var Cls = Class.extend({scoped: scoped}, [EventsMixin, PixelSampleMixin, function (inherited) {
		return {
			
			constructor: function (element, attrs) {
				inherited.constructor.call(this, element, attrs);
				this._embedding = this.auto_destroy(new FlashEmbedding(element, {
					registry: this.cls.flashRegistry(),
					wrap: true,
					debug: false
				}, {
					parentBgcolor: true,
					fixHalfPixels: true
				}));
				this._flashObjs = {};
				this.ready = Promise.create();
				this.__status = "idle";
				this.__disableAudio = this.readAttr('disableaudio') || false;
				this.__cameraWidth = this.readAttr('camerawidth') || 640;
				this.__cameraHeight = this.readAttr('cameraheight') || 480;
				this.__streamType = this.readAttr("streamtype") || 'mp4';
				this.__microphoneCodec = this.readAttr("microphonecodec") || 'speex';
				this.__fps = this.readAttr('fps') || 20;				
				this.__defaultGain = 55;
				this._flip = Types.parseBool(this.readAttr("flip") || false);
				this._embedding.ready(this.__initializeEmbedding, this);
			},
			
			averageFrameRate: function () {
				return this.__fps;
			},
			
			__initializeEmbedding: function () {
				this.__hasMicrophoneActivity = false;
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
				this._flashObjs.Microphone = this._embedding.getClass("flash.media.Microphone");
				this._flashObjs.Camera = this._embedding.getClass("flash.media.Camera");
				this._flashObjs.microphone = this._flashObjs.Microphone.getMicrophone(0);
				this.setMicrophoneProfile();
				this._flashObjs.camera = this._flashObjs.Camera.getCamera(0);
				this._currentCamera = 0;
				this._currentMicrophone = 0;
				this._flashObjs.Security = this._embedding.getClass("flash.system.Security");
				this.recomputeBB();
				this.ready.asyncSuccess(this);
				this.auto_destroy(new Timer({
					delay: 100,
					fire: this._fire,
					context: this
				}));
			},
			
			isAccessGranted: function () {
				return ((!this._flashObjs.camera || !this._flashObjs.camera.get('muted')) &&
						(!this._flashObjs.microphone || !this._flashObjs.microphone.get('muted')));
			},
			
			isSecurityDialogOpen: function () {
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
			
			openSecurityDialog: function (fullSecurityDialog) {
				this.trigger("require_display");
				if (fullSecurityDialog)
					this._flashObjs.Security.showSettings("privacy");
				else {
					this._flashObjs.video.attachCamera(null);
					this._flashObjs.video.attachCamera(this._flashObjs.camera);
				}
			},
			
			grantAccess: function (fullSecurityDialog, allowDeny) {
				var promise = Promise.create();
				var timer = new Timer({
					fire: function () {
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
			
			bindMedia: function (fullSecurityDialog, allowDeny) {
				return this.grantAccess(fullSecurityDialog, allowDeny).mapSuccess(function () {
					this._mediaBound = true;
					this._attachCamera();
				}, this);
			},
			
			unbindMedia: function () {
				this._detachCamera();
				this._mediaBound = false;
			},
			
			_attachCamera: function () {
				this._flashObjs.camera.setMode(this.__cameraWidth, this.__cameraHeight, this.__fps);
				this._flashObjs.camera.setQuality(0, 90);
				this._flashObjs.camera.setKeyFrameInterval(5);
				this._flashObjs.video.attachCamera(this._flashObjs.camera);
				this._flashObjs.cameraVideo.attachCamera(this._flashObjs.camera);
				if (this._flip) {
					if (this._flashObjs.video.get("scaleX") > 0)
						this._flashObjs.video.set("scaleX", -this._flashObjs.video.get("scaleX"));
					this._flashObjs.video.set("x", this._flashObjs.video.get("width"));
				}
			},
			
			_detachCamera: function () {
				this._flashObjs.video.attachCamera(null);
				this._flashObjs.cameraVideo.attachCamera(null);
			},
			
			enumerateDevices: function () {
				return {
					audios: this._flashObjs.Microphone.get('names'),
					videos: this._flashObjs.Camera.get('names')
				};
			},
			
			selectMicrophone: function (index) {
				if (this._flashObjs.microphone)
					this._flashObjs.microphone.weakDestroy();
				this.__hasMicrophoneActivity = false;
				this.__microphoneActivityTime = null;
				this._flashObjs.microphone = this._flashObjs.Microphone.getMicrophone(index);
				this._currentMicrophone = index;
				this.setMicrophoneProfile(this._currentMicrophoneProfile);
			},
						
			selectCamera: function (index) {
				if (this._flashObjs.camera)
					this._flashObjs.camera.weakDestroy();
				this.__cameraActivityTime = null;
				this._flashObjs.camera = this._flashObjs.Camera.getCamera(index);
				this._currentCamera = index;
				if (this._mediaBound) 
					this._attachCamera();
			},
			
			currentCamera: function () {
				return this._currentCamera;
			},
			
			currentMicrophone: function () {
				return this._currentMicrophone;
			},
			
			microphoneInfo: function () {
				return {
					muted: this._flashObjs.microphone.get("muted"),
					name: this._flashObjs.microphone.get("name"),
					activityLevel: this._flashObjs.microphone.get("activityLevel"),
					gain: this._flashObjs.microphone.get("gain"),
					rate: this._flashObjs.microphone.get("rate"),
					encodeQuality: this._flashObjs.microphone.get("encodeQuality"),
					codec: this._flashObjs.microphone.get("codec"),
					hadActivity: this.__hadMicrophoneActivity,
					inactivityTime: this.__microphoneActivityTime ? Time.now() - this.__microphoneActivityTime : null
				};
			},

			cameraInfo: function () {
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
			
			setMicrophoneProfile: function(profile) {
				profile = profile || {};
				this._flashObjs.microphone.setLoopBack(profile.loopback || false);
				this._flashObjs.microphone.set("gain", profile.gain || this.__defaultGain);
				this._flashObjs.microphone.setSilenceLevel(profile.silenceLevel || 0);
				this._flashObjs.microphone.setUseEchoSuppression(profile.echoSuppression || false);
				this._flashObjs.microphone.set("rate", profile.rate || 44);
				this._flashObjs.microphone.set("encodeQuality", profile.encodeQuality || 10);
				this._flashObjs.microphone.set("codec", profile.codec || this.__microphoneCodec);
				this._currentMicrophoneProfile = profile;
			},
			
			getVolumeGain: function () {
				var gain = this._mediaBound ? this._flashObjs.micropone.get("gain") : 55;
				return gain / 55.0;
			},
			
			setVolumeGain: function (volumeGain) {
				this.__defaultGain = Math.max(Math.min(0, Math.round(volumeGain * 55)), 100);
				if (this._mediaBound)
					this._flashObjs.microphone.set("gain", this.__defaultGain);
			},
			
			_pixelSample: function (samples, callback, context) {
				samples = samples || 100;
				var w = this._flashObjs.cameraVideo.get("width");
				var h = this._flashObjs.cameraVideo.get("height");
				var lightLevelBmp = this._embedding.newObject("flash.display.BitmapData", w, h);
				lightLevelBmp.draw(this._flashObjs.cameraVideo);
				var multiple = 2;
				while (samples > 0) {
					for (var i = 1; i < multiple; ++i) {
						for (var j = 1; j < multiple; ++j) {
							var rgb = lightLevelBmp.getPixel(Math.floor(i * w / multiple), Math.floor(j * h / multiple));
							callback.call(context || this, rgb % 256, (rgb / 256) % 256, (rgb / 256 / 256) % 256);
							--samples;
							if (samples <= 0)
								break;
						}
						if (samples <= 0)
							break;
					}
					++multiple;
				}
				lightLevelBmp.destroy();
			},
			
			testSoundLevel: function (activate) {
				this.setMicrophoneProfile(activate ? {
					loopback: true,
					gain: 55,
					silenceLevel: 100,
					echoSuppression: true
				} : {});
			},
			
			soundLevel: function () {
				return this._flashObjs.microphone.get("activityLevel");
			},
			
			_fire: function () {
				if (!this._mediaBound)
					return;
				this.__hadMicrophoneActivity = this.__hadMicrophoneActivity || (this._flashObjs.microphone && this._flashObjs.microphone.get("activityLevel") > 0);
				if (this._flashObjs.microphone && this._flashObjs.microphone.get("activityLevel") > 0)
					this.__microphoneActivityTime = Time.now();				
				if (this._flashObjs.camera) {
					var currentCameraActivity = this._flashObjs.camera.get("activityLevel");
					if (!this.__lastCameraActivity || this.__lastCameraActivity !== currentCameraActivity)
						this.__cameraActivityTime = Time.now();
					this.__lastCameraActivity = currentCameraActivity;
				}
			},
			
			createSnapshot: function () {
				var bmp = this._embedding.newObject(
					"flash.display.BitmapData",
					this._flashObjs.cameraVideo.get("videoWidth"),
					this._flashObjs.cameraVideo.get("videoHeight")
				);
				bmp.draw(this._flashObjs.cameraVideo);
				return bmp;
			},
			
			postSnapshot: function (bmp, url, type, quality) {
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

		    	poster.addEventListener("complete", this._embedding.newCallback(Functions.as_method(function () {
		    		promise.asyncSuccess(true);
		    	}, this)));
		    	poster.addEventListener("ioError", this._embedding.newCallback(Functions.as_method(function () {
		    		promise.asyncError("IO Error");
		    	}, this)));
				poster.load(request);
				promise.callback(function () {
					poster.destroy();
					request.destroy();
					header.destroy();
				});
				return promise;
			},
			
			createSnapshotDisplay: function (bmpData, x, y, w, h) {
				var bmp = this._embedding.newObject("flash.display.Bitmap", bmpData);
				this.updateSnapshotDisplay(bmpData, bmp, x, y, w, h);
				this._flashObjs.main.addChildVoid(bmp);
				return bmp;
			},
			
			updateSnapshotDisplay: function (bmpData, bmp, x, y, w, h) {
				bmp.set("x", x);
				bmp.set("y", y);
				bmp.set("scaleX", w / bmpData.get("width"));
				bmp.set("scaleY", h / bmpData.get("height"));
			},

			removeSnapshotDisplay: function (snapshot) {
				this._flashObjs.main.removeChildVoid(snapshot);
				snapshot.destroy();
			},

			idealBB: function () {
				return {
					width: this.__cameraWidth,
					height: this.__cameraHeight
				};
			},
			
			setActualBB: function (actualBB) {
				$(this._element).find("object").css("width", actualBB.width + "px");
				$(this._element).find("embed").css("width", actualBB.width + "px");
				$(this._element).find("object").css("height", actualBB.height + "px");
				$(this._element).find("embed").css("height", actualBB.height + "px");
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
			
			_error: function (s) {
				this.__status = "error";
				this.trigger("error", s);
			},
			
			_status: function (s) {
				if (s && s !== this.__status) {
					this.__status = s;
					this.trigger("status", s);
					this.trigger(s);
				}
				return this.__status;
			},
			
			startRecord: function (serverUrl, streamName) {
				this._status("connecting");
				this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
				this._flashObjs.connection.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(function (event) {
					var code = event.get("info").code;
					if (code === "NetConnection.Connect.Closed" && this._status() === 'recording') {
						this._error("Connection to server interrupted.");
						return;
					}
					if (code === "NetConnection.Connect.Success" && this._status() !== 'connecting') {
						this._error("Could not connect to server");
						return;
					}
					if (code === "NetConnection.Connect.Success" && this._status() === 'connecting') {
						if (this.__streamType === 'mp4')
							this._flashObjs.connection.callVoid("setStreamType", null, "live");
						this._flashObjs.stream = this._embedding.newObject("flash.net.NetStream", this._flashObjs.connection);
						this._flashObjs.stream.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(function (event) {
							var code = event.get("info").code;
							if (code === "NetStream.Record.Start") {
								this._status('recording');
								return;
							}
							if (code === "NetStream.Play.StreamNotFound") {
								this._flashObjs.stream.closeVoid();
								if (this._status() !== "none")
									this._error("Stream not found");
								return;
							}
							// buffer empty and stopped means OK to close stream
							if (code === "NetStream.Buffer.Empty") {
								if (this._status() === "uploading" && this.__streamType === 'mp4') {
									this._flashObjs.stream.publish(null);
								}
							}
							if (code === "NetStream.Unpublish.Success" ||
							    (this._status() === "uploading" && code === "NetStream.Buffer.Empty" &&
							     this.__streamType === "flv" && this._flashObjs.stream.get('bufferLength') === 0)) {
								this._flashObjs.stream.closeVoid();
								this._flashObjs.stream.destroy();
								this._flashObjs.stream = null;
								this._flashObjs.connection.closeVoid();
								this._flashObjs.connection.destroy();
								this._flashObjs.connection = null;
								this._status('finished');
							}
						}, this)));
						this._flashObjs.stream.set("bufferTime", 120);
						if (this.__streamType === 'mp4') {
							this._flashObjs.h264Settings = this._embedding.newObject("flash.media.H264VideoStreamSettings");
							this._flashObjs.h264Settings.setProfileLevel("baseline", "3.1");
							this._flashObjs.stream.set("videoStreamSettings", this._flashObjs.h264Settings);
						}
						this._flashObjs.stream.attachCameraVoid(this._flashObjs.camera);
						if (!this.__disableAudio)
							this._flashObjs.stream.attachAudioVoid(this._flashObjs.microphone);
						this._flashObjs.stream.publish(streamName, "record");
					}
				}, this)));
				this._flashObjs.connection.connectVoid(serverUrl);
			},
			
			stopRecord: function () {
				if (this._status() !== "recording")
					return;
				this.__initialBufferLength = 0;
				this._status("uploading");
				this.__initialBufferLength = this._flashObjs.stream.get("bufferLength");
				//this._flashObjs.stream.attachAudioVoid(null);
				this._flashObjs.stream.attachCameraVoid(null);
			},
			
			uploadStatus: function () {
				return {
					total: this.__initialBufferLength,
					remaining: this._flashObjs.stream.get("bufferLength")
				};
			}
		
		};		
	}], {
		
		flashRegistry: function () {
			if (!this.__flashRegistry) {
				this.__flashRegistry = new FlashClassRegistry();
				this.__flashRegistry.register("flash.media.Microphone", ["setLoopBack", "setSilenceLevel", "setUseEchoSuppression"], ["getMicrophone"]);
				this.__flashRegistry.register("flash.media.Camera", ["setMode", "setQuality", "setKeyFrameInterval", "addEventListener"], ["getCamera"]);
				this.__flashRegistry.register("flash.media.Video", ["attachCamera", "attachNetStream"]);
				this.__flashRegistry.register("flash.media.SoundTransform", []);
				this.__flashRegistry.register("flash.media.H264VideoStreamSettings", ["setProfileLevel"]);
				this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener", "seek", "attachCamera", "attachAudio", "publish", "close"]);
				this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener", "call", "close"]);
				this.__flashRegistry.register("flash.net.URLRequest", []);
				this.__flashRegistry.register("flash.net.URLRequestHeader", []);
				this.__flashRegistry.register("flash.net.URLLoader", ["addEventListener", "load"]);
				this.__flashRegistry.register("flash.display.Sprite", ["addChild", "removeChild", "setChildIndex"]);
				this.__flashRegistry.register("flash.display.Stage", []);
				this.__flashRegistry.register("flash.display.Loader", ["load"]);
				this.__flashRegistry.register("flash.display.LoaderInfo", ["addEventListener"]);
				this.__flashRegistry.register("flash.display.BitmapData", ["draw", "getPixel", "dispose"]);
				this.__flashRegistry.register("flash.display.Bitmap", []);
				this.__flashRegistry.register("flash.system.Security", [], ["allowDomain", "showSettings"]);
				this.__flashRegistry.register("com.adobe.images.PNGEncoder", [], ["encode"]);
				this.__flashRegistry.register("com.adobe.images.JPGEncoder", ["encode"]);
			}
			return this.__flashRegistry;
		},
		
		attach: function (element, attrs) {
			var cls = new Cls(element, attrs);
			return element;
		}
		
		
	});
	return Cls;
});


Scoped.define("module:Flash.Support", [
    "base:Promise",
    "base:Timers.Timer",
    "base:Async",
    "base:Objs",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "browser:Info"
], function (Promise, Timer, Async, Objs, FlashClassRegistry, FlashEmbedding, Info) {
	return {
		
		flashCanConnect: function (url, timeout) {
			if (!Info.flash().installed())
				return Promise.error(false);
			var promise = Promise.create();
			var registry = new FlashClassRegistry();
			registry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
			var embedding = new FlashEmbedding(null, {
				registry: registry,
				wrap: true
			});
			embedding.ready(function () {
				var connection = embedding.newObject("flash.net.NetConnection");
				connection.addEventListener("netStatus", embedding.newCallback(function (event) {
					if (event.get("info") && event.get("info").code === "NetConnection.Connect.Success")
						promise.asyncSuccess(true);
					else
						promise.asyncError(false);
				}));
				connection.connectVoid(url);
			});
			var timer = null;
			if (timeout) {
				timer = new Timer({
					delay: timeout,
					once: true,
					start: true,
					fire: function () {
						promise.asyncError();
					}
				});
			}
			promise.callback(function () {
				if (timer)
					timer.destroy();
				Async.eventually(function () {
					embedding.destroy();
				});				
			});
			return promise;
		},
		
		enumerateMediaSources: function () {
			if (!Info.flash().installed())
				return Promise.error(false);
			var promise = Promise.create();
			var registry = new FlashClassRegistry();
			registry.register("flash.media.Microphone");
			registry.register("flash.media.Camera");
			var embedding = new FlashEmbedding(null, {
				registry: registry,
				wrap: true
			});
			embedding.ready(function () {
				var videos = embedding.getClass("flash.media.Camera").get("names");
				var audios = embedding.getClass("flash.media.Microphone").get("names");
				promise.asyncSuccess({
					videoCount: Objs.count(videos),
					audioCount: Objs.count(audios),
					video: Objs.map(videos, function (value, key) {
						return {
							id: key,
							label: value
						};
					}),
					audio: Objs.map(audios, function (value, key) {
						return {
							id: key,
							label: value
						};
					})
				});
			});
			promise.callback(function () {
				Async.eventually(function () {
					embedding.destroy();
				});				
			});
			return promise;
		}

	};
});





Scoped.define("module:Recorder.PixelSampleMixin", [
], function () {
	return {
		
		lightLevel: function (samples) {
			samples = samples || 100;
			var total_light = 0.0;
			this._pixelSample(samples, function (r, g, b) {
				total_light += r + g + b;
			});
			return total_light / (3 * samples);
		},
		
		blankLevel: function (samples) {
			samples = samples || 100;
			var total_light = 0.0;
			this._pixelSample(samples, function (r, g, b) {
				total_light += Math.pow(r, 2) + Math.pow(g, 2) + Math.pow(b, 2);
			});
			return Math.sqrt(total_light / (3 * samples));
		},
		
		_materializePixelSample: function (sample) {
			var result = [];
			this._pixelSample(sample, function (r,g,b) {
				result.push([r,g,b]);
			});
			return result;
		},
		
		deltaCoefficient: function (samples) {
			samples = samples || 100;
			var current = this._materializePixelSample(samples);
			if (!this.__deltaSample) {
				this.__deltaSample = current;
				return null;
			}
			var delta_total = 0.0;
			for (var i = 0; i < current.length; ++i)
				for (var j = 0; j < 3; ++j)
					delta_total += Math.pow(current[i][j] - this.__deltaSample[i][j], 2);
			this.__deltaSample = current;
			return Math.sqrt(delta_total / (3 * samples));
		}

	};
});


Scoped.define("module:Recorder.VideoRecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Promise"
], function (ConditionalInstance, EventsMixin, Objs, Promise, scoped) {
	return ConditionalInstance.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (options) {
				inherited.constructor.call(this, options);
				this._element = this._options.element;
				this.ready = Promise.create();
			},
			
			destroy: function () {
				inherited.destroy.call(this);
			},
			
			bindMedia: function () {
				return this._bindMedia();
			},
			
			_bindMedia: function () {},
			
			unbindMedia: function () {
				return this._unbindMedia();
			},
			
			_unbindMedia: function () {},

			cameraWidth: function () {
				return this._options.recordingWidth;
			},
			
			cameraHeight: function () {
				return this._options.recordingHeight;
			},
			
			lightLevel: function () {},			
			soundLevel: function () {},
			testSoundLevel: function (activate) {},
			blankLevel: function () {},			
			deltaCoefficient: function () {},
			
			getVolumeGain: function () {},
			setVolumeGain: function (volumeGain) {},
			
			enumerateDevices: function () {},
			currentDevices: function () {},
			setCurrentDevices: function (devices) {},
			
			createSnapshot: function () {},
			removeSnapshot: function (snapshot) {},
			createSnapshotDisplay: function (parent, snapshot, x, y, w, h) {},
			updateSnapshotDisplay: function (snapshot, display, x, y, w, h) {},
			removeSnapshotDisplay: function (display) {},
			createSnapshotUploader: function (snapshot, type, uploaderOptions) {},
			
			startRecord: function (options) {},
			stopRecord: function (options) {},
			
			isFlash: function () {
				return false;
			},
			
			supportsLocalPlayback: function () {
				return false;
			},
			
			snapshotToLocalPoster: function (snapshot) {
				return null;
			},
			
			localPlaybackSource: function () {
				return null;
			},
			
			averageFrameRate: function () {
				return null;
			}
			
		};
	}], {
		
		_initializeOptions: function (options) {
			return Objs.extend({
				forceflash: false,
				noflash: false,
				recordingWidth: 640,
				recordingHeight: 480,
				recordVideo: true,
				recordAudio: true
			}, options);
		}
		
	});
});


Scoped.define("module:Recorder.WebRTCVideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.Support",
    "module:WebRTC.AudioAnalyser",
    "browser:Dom",
    "base:Objs",
    "browser:Upload.FileUploader",
    "browser:Upload.MultiUploader",
    "base:Promise",
    "jquery:"
], function (VideoRecorderWrapper, RecorderWrapper, Support, AudioAnalyser, Dom, Objs, FileUploader, MultiUploader, Promise, $, scoped) {
	return VideoRecorderWrapper.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (options) {
				inherited.constructor.call(this, options);
				if (this._element.tagName.toLowerCase() !== "video")
					this._element = Dom.changeTag(this._element, "video");
				this._recorder = RecorderWrapper.create({
		            video: this._element,
		            flip: !!this._options.flip,
		            framerate: this._options.framerate,
		            recordVideo: this._options.recordVideo,
		            recordAudio: this._options.recordAudio,
		            recordResolution: {
		            	width: this._options.recordingWidth,
		            	height: this._options.recordingHeight
		            },
		            webrtcStreaming: this._options.webrtcStreaming
		        });
				this._recorder.on("bound", function () {
					if (this._analyser)
						this.testSoundLevel(true);
				}, this);
				this.ready.asyncSuccess(true);
			},
			
			destroy: function () {
				if (this._analyser)
					this._analyser.weakDestroy();
				this._recorder.destroy();
				inherited.destroy.call(this);
			},
			
			_bindMedia: function () {
				return this._recorder.bindMedia();
			},
			
			_unbindMedia: function () {
				return this._recorder.unbindMedia();
			},

			lightLevel: function () {
				return this._recorder.lightLevel();
			},
			
			blankLevel: function () {
				return this._recorder.blankLevel();
			},			
			
			getVolumeGain: function () {
				return this._recorder.getVolumeGain();
			},
			
			setVolumeGain: function (volumeGain) {
				this._recorder.setVolumeGain(volumeGain);
			},

			deltaCoefficient: function () {
				return this._recorder.deltaCoefficient();
			},

			soundLevel: function () {
				if (!this._analyser && this._recorder && this._recorder.stream())
					this._analyser = new AudioAnalyser(this._recorder.stream());
				return this._analyser ? this._analyser.soundLevel() : 0.0;
			},
			
			testSoundLevel: function (activate) {
				if (this._analyser) {
					this._analyser.weakDestroy();
					delete this._analyser;
				}
				if (activate)
					this._analyser = new AudioAnalyser(this._recorder.stream());
			},
			
			currentDevices: function () {
				return {
					video: this._currentVideo,
					audio: this._currentAudio
				};
			},
			
			enumerateDevices: function () {
				return Support.enumerateMediaSources().success(function (result) {
					if (!this._currentVideo)
						this._currentVideo = Objs.ithKey(result.video);
					if (!this._currentAudio)
						this._currentAudio = Objs.ithKey(result.audio);
				}, this);
			},
			
			setCurrentDevices: function (devices) {
				if (devices && devices.video)
					this._recorder.selectCamera(devices.video);
				if (devices && devices.audio)
					this._recorder.selectMicrophone(devices.audio);
			},
			
			createSnapshot: function (type) {
				return this._recorder.createSnapshot(type);
			},
			
			removeSnapshot: function (snapshot) {},
			
			createSnapshotDisplay: function (parent, snapshot, x, y, w, h) {
				var url = Support.globals().URL.createObjectURL(snapshot);
				var image = document.createElement("img");
				image.style.position = "absolute";
				this.updateSnapshotDisplay(snapshot, image, x, y, w, h);
				image.src = url;
				$(parent).prepend(image);
				return image;
			},
			
			updateSnapshotDisplay: function (snapshot, image, x, y, w, h) {
				image.style.left = x + "px";
				image.style.top = y + "px";
				image.style.width = w + "px";
				image.style.height = h + "px";
			},
			
			removeSnapshotDisplay: function (image) {
				image.remove();
			},
			
			createSnapshotUploader: function (snapshot, type, uploaderOptions) {
				return FileUploader.create(Objs.extend({
					source: snapshot
				}, uploaderOptions));
			},
			
			startRecord: function (options) {
				this.__localPlaybackSource = null;
				this._recorder.startRecord(options);
				return Promise.value(true);
			},
			
			stopRecord: function (options) {
				var promise = Promise.create();
				this._recorder.once("data", function (videoBlob, audioBlob) {
					this.__localPlaybackSource = {
						src: videoBlob,
						audiosrc: audioBlob
					};
					var multiUploader = new MultiUploader();
					if (!this._options.simulate) {
						if (videoBlob) {
							multiUploader.addUploader(FileUploader.create(Objs.extend({
								source: videoBlob
							}, options.video)));
						}
						if (audioBlob) {
							multiUploader.addUploader(FileUploader.create(Objs.extend({
								source: audioBlob
							}, options.audio)));
						}
					}
					promise.asyncSuccess(multiUploader);
				}, this);
				this._recorder.stopRecord();
				return promise;
			},
			
			supportsLocalPlayback: function () {
				return !!this.__localPlaybackSource.src;
			},
			
			snapshotToLocalPoster: function (snapshot) {
				return snapshot;
			},
			
			localPlaybackSource: function () {
				return this.__localPlaybackSource;
			},
			
			averageFrameRate: function () {
				return this._recorder.averageFrameRate();
			}			
			
		};		
	}, {
		
		supported: function (options) {
			return RecorderWrapper.anySupport(options) && !options.forceflash;
		}
		
	});	
});



Scoped.define("module:Recorder.FlashVideoRecorderWrapper", [
	"module:Recorder.VideoRecorderWrapper",
	"module:Flash.FlashRecorder",
	"browser:Dom",
	"browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "browser:Upload.CustomUploader",
    "browser:Upload.MultiUploader"
], function (VideoRecorderWrapper, FlashRecorder, Dom, Info, Promise, Objs, Timer, CustomUploader, MultiUploader, scoped) {
	return VideoRecorderWrapper.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (options) {
				inherited.constructor.call(this, options);
				if (this._element.tagName.toLowerCase() !== "div")
					this._element = Dom.changeTag(this._element, "div");
				this._recorder = new FlashRecorder(this._element, {
		            flip: !!this._options.flip,
		            disableaudio: !this._options.recordAudio,
					streamtype: this._options.rtmpStreamType,
	            	camerawidth: this._options.recordingWidth,
	            	cameraheight: this._options.recordingHeight,
	            	microphonecodec: this._options.rtmpMicrophoneCodec,
	            	fps: this._options.framerate
		        });
				this._recorder.ready.forwardCallback(this.ready);
				this._recorder.on("require_display", function () {
					this.trigger("require_display");
				}, this);
			},
			
			destroy: function () {
				this._recorder.destroy();
				inherited.destroy.call(this);
			},
			
			_bindMedia: function () {
				return this._recorder.bindMedia(this._options.flashFullSecurityDialog);
			},
			
			_unbindMedia: function () {
				return this._recorder.unbindMedia();
			},

			blankLevel: function () {
				return this._recorder.blankLevel();
			},			
			
			deltaCoefficient: function () {
				return this._recorder.deltaCoefficient();
			},

			lightLevel: function () {
				return this._recorder.lightLevel();
			},
			
			soundLevel: function () {
				var sl = this._recorder.soundLevel();
				return sl <= 1 ? 1.0 : (1.0 + (sl-1)/100);
			},

			getVolumeGain: function () {
				return this._recorder.getVolumeGain();
			},
			
			setVolumeGain: function (volumeGain) {
				this._recorder.setVolumeGain(volumeGain);
			},

			testSoundLevel: function (activate) {
				this._recorder.testSoundLevel(activate);
			},

			enumerateDevices: function () {
				var result = this._recorder.enumerateDevices();
				return Promise.value({
					videoCount: Objs.count(result.videos),
					audioCount: Objs.count(result.audios),
					video: Objs.map(result.videos, function (value, key) {
						return {
							id: key,
							label: value
						};
					}),
					audio: Objs.map(result.audios, function (value, key) {
						return {
							id: key,
							label: value
						};
					})
				});
			},
			
			currentDevices: function () {
				return {
					video: this._recorder.currentCamera(),
					audio: this._recorder.currentMicrophone()
				};
			},
			
			setCurrentDevices: function (devices) {
				if (devices && devices.video)
					this._recorder.selectCamera(devices.video);
				if (devices && devices.audio)
					this._recorder.selectMicrophone(devices.audio);
			},
			
			createSnapshot: function (type) {
				return this._recorder.createSnapshot();
			},
			
			createSnapshotDisplay: function (parent, snapshot, x, y, w, h) {
				return this._recorder.createSnapshotDisplay(snapshot, x, y, w, h);
			},
			
			updateSnapshotDisplay: function (snapshot, display, x, y, w, h) {
				return this._recorder.updateSnapshotDisplay(snapshot, display, x, y, w, h);
			},

			removeSnapshotDisplay: function (display) {
				this._recorder.removeSnapshotDisplay(display);
			},
			
			createSnapshotUploader: function (snapshot, type, uploaderOptions) {
				var uploader = new CustomUploader(Objs.extend({
					source: snapshot,
					type: type,
					recorder: this._recorder
				}, uploaderOptions));
				uploader.on("upload", function (options) {
					options.recorder.postSnapshot(
						options.source,
						options.url,
						options.type
					)
					.success(uploader.successCallback, uploader)
					.error(uploader.errorCallback, uploader);
				});
				return uploader;
			},
			
			startRecord: function (options) {
				if (this._options.simulate)
					return Promise.value(true);
				var self = this;
				var ctx = {};
				var promise = Promise.create();
				this._recorder.on("recording", function () {
					promise.asyncSuccess();
					self._recorder.off(null, null, ctx);
				}, ctx).on("error", function (s) {
					promise.asyncError(s);
					self._recorder.off(null, null, ctx);
				}, ctx);
				this._recorder.startRecord(options.rtmp.serverUrl, options.rtmp.streamName);
				return promise;
			},
			
			stopRecord: function (options) {
				if (this._options.simulate)
					return Promise.value(new MultiUploader());
				var self = this;
				var ctx = {};
				var uploader = new CustomUploader();
				var timer = new Timer({
					delay: 100,
					context: this,
					fire: function () {
						var status = this._recorder.uploadStatus();
						uploader.progressCallback(status.total - status.remaining, status.total);
					}
				});
				this._recorder.on("finished", function () {
					uploader.successCallback(true);
					self._recorder.off(null, null, ctx);
					timer.weakDestroy();
				}, ctx).on("error", function (s) {
					uploader.errorCallback(s);
					self._recorder.off(null, null, ctx);
					timer.weakDestroy();
				}, ctx);
				this._recorder.stopRecord();
				return Promise.create(uploader);
			},
			
			isFlash: function () {
				return true;
			},
			
			averageFrameRate: function () {
				return this._recorder.averageFrameRate();
			}
		
		};		
	}, {
		
		supported: function (options) {
			return !Info.isMobile() && !options.noflash && Info.flash().installed();
		}
		
	});	
});


Scoped.extend("module:Recorder.WebRTCVideoRecorderWrapper", [
    "module:Recorder.VideoRecorderWrapper",
    "module:Recorder.WebRTCVideoRecorderWrapper"
], function (VideoRecorderWrapper, WebRTCVideoRecorderWrapper) {
	VideoRecorderWrapper.register(WebRTCVideoRecorderWrapper, 2);
	return {};
});


Scoped.extend("module:Recorder.VideoRecorderWrapper", [
	"module:Recorder.VideoRecorderWrapper",
	"module:Recorder.FlashVideoRecorderWrapper"
], function (VideoRecorderWrapper, FlashVideoRecorderWrapper) {
	VideoRecorderWrapper.register(FlashVideoRecorderWrapper, 1);
	return {};
});

Scoped.define("module:WebRTC.AudioAnalyser", [
                                              "base:Class",
                                              "module:WebRTC.Support"
                                              ], function (Class, Support, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (stream) {
				inherited.constructor.call(this);
				var AudioContext = Support.globals().AudioContext;
				this._audioContext = new AudioContext();
				this._analyserNode = Support.globals().createAnalyser.call(this._audioContext);
				this._analyserNode.fftSize = 32;
				if (stream.getAudioTracks().length > 0) {
					this._audioInput = this._audioContext.createMediaStreamSource(stream);
					this._audioInput.connect(this._analyserNode);
				}
			},
			
			destroy: function () {
				this._analyserNode.disconnect();
				delete this._analyserNode;
				this._audioContext.close();
				delete this._audioContext;
				inherited.destroy.call(this);
			},
				
			soundLevel: function () {
				if (!this._audioInput)
					return 0.0;
				var bufferLength = this._analyserNode.fftSize;
				var dataArray = new Uint8Array(bufferLength);
				this._analyserNode.getByteTimeDomainData(dataArray);
				var mx = 0.0;
			    for (var i = 0; i < bufferLength; i++)
			        mx = Math.max(mx, Math.abs(dataArray[i] / 128.0));
			    return mx;
			}

		};		
	}, {

		supported: function () {
			return !!Support.globals().AudioContext && !!Support.globals().createAnalyser;
		}

	});
});

// Credits: http://typedarray.org/wp-content/projects/WebAudioRecorder/script.js
// Co-Credits: https://github.com/streamproc/MediaStreamRecorder/blob/master/MediaStreamRecorder-standalone.js

Scoped.define("module:WebRTC.AudioRecorder", [
  "base:Class",
  "base:Events.EventsMixin",
  "base:Objs",
  "base:Functions",
  "module:WebRTC.Support",
  "module:Encoding.WaveEncoder.Support"
], function (Class, EventsMixin, Objs, Functions, Support, WaveEncoder, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {

			constructor: function (stream, options) {
				inherited.constructor.call(this);
				this._channels = [];
				this._recordingLength = 0;
				this._options = Objs.extend({
					audioChannels: 2,
					bufferSize: 16384,
					sampleRate: 44100				 
				}, options);
				this._stream = stream;
				this._started = false;
				this._stopped = false;
				this._volumeGainValue = 1.0;
				//this.__initializeContext();
			},

			_audioProcess: function (e) {
				if (!this._started)					
					return;
				this._channels.push(WaveEncoder.dumpInputBuffer(e.inputBuffer, this._options.audioChannels, this._actualBufferSize));
				this._recordingLength += this._actualBufferSize;
				/*
				var sampleStartTime = e.playbackTime;
				var sampleStopTime = e.playbackTime + this._actualBufferSize / this._actualSampleRate;
				//var sampleStopTime = e.playbackTime;
				//var sampleStartTime = e.playbackTime - this._actualBufferSize / this._actualSampleRate;
				if (sampleStopTime <= this._startContextTime)
					return;
				if (this._stopped && sampleStartTime > this._stopContextTime) {
					this._started = false;
					this._generateData();
					return;
				}
				var offset = 0;
				var endOffset = this._actualBufferSize;
				if (sampleStartTime < this._startContextTime)
					offset = Math.round((this._startContextTime - sampleStartTime) * this._actualSampleRate);
				if (this._stopped && sampleStopTime > this._stopContextTime)
					endOffset = Math.round((this._stopContextTime - sampleStartTime) * this._actualSampleRate);
				this._channels.push(WaveEncoder.dumpInputBuffer(e.inputBuffer, this._options.audioChannels, endOffset, offset));
				this._recordingLength += endOffset - offset;
				if (this._stopped && sampleStopTime > this._stopContextTime) {
					this._started = false;
					this._generateData();
					return;
				}
				*/
			},

			destroy: function () {
				this.stop();
				//this.__finalizeContext();
				inherited.destroy.call(this);
			},
			
			getVolumeGain: function () {
				return this._volumeGainValue;
			},
			
			setVolumeGain: function (volumeGain) {
				this._volumeGainValue = volumeGain;
				if (this._volumeGain)
					this._volumeGain.value.gain = volumeGain;
			},

			__initializeContext: function () {
				var AudioContext = Support.globals().AudioContext;
				this._audioContext = new AudioContext();
				this._actualSampleRate = this._audioContext.sampleRate || this._options.sampleRate;
				this._volumeGain = this._audioContext.createGain();
				this._volumeGain.gain.value = this._volumeGainValue;
				this._audioInput = this._audioContext.createMediaStreamSource(this._stream);
				this._audioInput.connect(this._volumeGain);
				this._scriptProcessor = Support.globals().audioContextScriptProcessor.call(
						this._audioContext,
						this._options.bufferSize,
						this._options.audioChannels,
						this._options.audioChannels
				);
				this._actualBufferSize = this._scriptProcessor.bufferSize;
				this._scriptProcessor.onaudioprocess = Functions.as_method(this._audioProcess, this);
				this._volumeGain.connect(this._scriptProcessor);
				this._scriptProcessor.connect(this._audioContext.destination);
			},
			
			__finalizeContext: function () {
				this._scriptProcessor.disconnect();
				this._volumeGain.disconnect();
				this._audioInput.disconnect();
				this._scriptProcessor.onaudioprocess = null;
				this._audioContext.close();
				delete this._scriptProcessor;
				delete this._volumeGain;
				delete this._audioInput;				
				delete this._audioContext;
			},

			start: function () {
				if (this._started)
					return;
				this.__initializeContext();
				this._startContextTime = this._audioContext.currentTime;
				this._started = true;
				this._stopped = false;
				this._recordingLength = 0;
				this._channels = [];
				this.trigger("started");
			},

			stop: function () {
				if (!this._started || this._stopped)
					return;
				this._stopContextTime = this._audioContext.currentTime;
				this._stopped = true;
				this.trigger("stopped");
				this.__finalizeContext();
				this._started = false;
				this._generateData();
			},

			_generateData: function () {
				var volume = 1;
				var index = 44;
				var totalSize = this._recordingLength * this._options.audioChannels * 2 + 44;
				var buffer = new ArrayBuffer(totalSize);
				var view = new DataView(buffer);
				WaveEncoder.generateHeader(totalSize, this._options.audioChannels, this._actualSampleRate, buffer);
				this._channels.forEach(function (channel) {
					WaveEncoder.waveChannelTransform(channel, volume).value().forEach(function (v) {
						view.setInt16(index, v, true);
						index += 2;
					});
				});
				this._data = new Blob([view], { type: 'audio/wav' });
				this._leftChannel = [];
				this._rightChannel = [];
				this._recordingLength = 0;
				this.trigger("data", this._data);
			}

		};		
	}], {

		supported: function () {
			return !!Support.globals().AudioContext && !!Support.globals().audioContextScriptProcessor;
		}

	});
});

Scoped.define("module:WebRTC.MediaRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Functions",
    "browser:Info",
    "module:WebRTC.Support"
], function (Class, EventsMixin, Functions, Info, Support, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (stream) {
				inherited.constructor.call(this);
				this._stream = stream;
				this._started = false;
				var MediaRecorder = Support.globals().MediaRecorder;
				/*
				 * This is supposed to work according to the docs, but it is not:
				 * 
				 * https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder#Example
				 */
				/*
				var mediaRecorderOptions = {};
				mediaRecorderOptions.mimeType = "video/mp4";
				if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
				  options = {mimeType: 'video/webm, codecs=vp9'};
				} else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
				   options = {mimeType: 'video/webm, codecs=vp8'};
				} else {
				  // ...
				}
				this._mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
				*/
				this._mediaRecorder = new MediaRecorder(stream);
				this._mediaRecorder.ondataavailable = Functions.as_method(this._dataAvailable, this);
				this._mediaRecorder.onstop = Functions.as_method(this._dataStop, this);
			},
			
			destroy: function () {
				this.stop();
				inherited.destroy.call(this);
			},
			
			start: function () {
				if (this._started)
					return;
				this._started = true;
				this._chunks = [];
				this._mediaRecorder.start();
				this.trigger("started");
			},
			
			stop: function () {
				if (!this._started)
					return;
				this._started = false;
				this._mediaRecorder.stop();
				this.trigger("stopped");
			},
			
			_dataAvailable: function (e) {
				this._chunks.push(e.data);
			},

			_dataStop: function (e) {
				this._data = new Blob(this._chunks, { type: "video/webm" });
				this._chunks = [];
				if (Info.isFirefox()) {
					var self = this;
					var fileReader = new FileReader();
					fileReader.onload = function() {
					    self._data = new Blob([this.result], {type: self._data.type});
						self.trigger("data", self._data);
					};
					fileReader.readAsArrayBuffer(this._data);
				} else
					this.trigger("data", this._data);
			}
						
		};		
	}], {
		
		supported: function () {
			return !!Support.globals().MediaRecorder && !Info.isChrome() && !Info.isOpera();
		}
		
	});
});
		

Scoped.define("module:WebRTC.PeerRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Functions",
    "base:Objs",
    "browser:Info",
    "module:WebRTC.Support"
], function (Class, EventsMixin, Functions, Objs, Info, Support, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (stream, options) {
				inherited.constructor.call(this);
				this._stream = stream;
				this._videoBitrate = options.videoBitrate || 360;
				this._audioBitrate = options.audioBitrate || 64;
				this._started = false;
			},
			
			destroy: function () {
				this.stop();
				inherited.destroy.call(this);
			},
			
			start: function (options) {
				if (this._started)
					return;
				this._wssUrl = options.wssUrl;
				this._streamInfo = options.streamInfo;
				this._userData = options.userData || {};
				this._started = true;
				this._wsConnection = new (Support.globals()).WebSocket(this._wssUrl);
				this._wsConnection.binaryType = 'arraybuffer';
				this._wsConnection.onopen = Functions.as_method(this._wsOnOpen, this);
				this._wsConnection.onmessage = Functions.as_method(this._wsOnMessage, this);
				this._wsConnection.onclose = Functions.as_method(this._wsOnClose, this);
				this._wsConnection.onerror = this._errorCallback("WS_CONNECTION");
				this.trigger("started");
			},
			
			stop: function () {
				if (!this._started)
					return;
				this._started = false;
				if (this._peerConnection)
					this._peerConnection.close();
				this._peerConnection = null;
				if (this._wsConnection)
					this._wsConnection.close();
				this._wsConnection = null;
				this.trigger("stopped");
			},
			
			_wsOnOpen: function () {
				this._peerConnection = new (Support.globals()).RTCPeerConnection({ 'iceServers' : [] });
				if (this._stream.getTracks && this._peerConnection.addTrack) {
					Objs.iter(this._stream.getTracks(), function (localTrack) {
						this._peerConnection.addTrack(localTrack, localStream);
					}, this);
				} else
					this._peerConnection.addStream(this._stream);
				this._peerConnection.createOffer(Functions.as_method(this._offerGotDescription, this), this._errorCallback("PEER_CREATE_OFFER"));
			},			
			
			_wsOnMessage: function (evt) {
				var data = JSON.parse(evt.data);
				var status = parseInt(data.status, 10);
				var command = data.command;
				if (status !== 200) {
					this._error("MESSAGE_ERROR", {status: status, description: data.statusDescription});
				} else {
					if (data.sdp !== undefined) {
						this._peerConnection.setRemoteDescription(new (Support.globals()).RTCSessionDescription(data.sdp), function() {
							// peerConnection.createAnswer(gotDescription, errorHandler);
						}, this._errorCallback("PEER_REMOTE_DESCRIPTION"));
					}
					if (data.iceCandidates) {
						Objs.iter(data.iceCandidates, function (iceCandidate) {
							this._peerConnection.addIceCandidate(new (Support.globals()).RTCIceCandidate(iceCandidate));
						}, this);
					}
				}
				if (this._wsConnection)
					this._wsConnection.close();
				this._wsConnection = null;		
			},

			_offerGotDescription: function (description) {
				var enhanceData = {};
				if (this._audioBitrate)
					enhanceData.audioBitrate = this._audioBitrate;
				if (this._videoBitrate)
					enhanceData.videoBitrate = this._videoBitrate;
				description.sdp = this._enhanceSDP(description.sdp, enhanceData);
				this._peerConnection.setLocalDescription(description, Functions.as_method(function () {
					this._wsConnection.send(JSON.stringify({
						direction: "publish",
						command: "sendOffer",
						streamInfo: this._streamInfo,
						sdp: description,
						userData: this._userData
					}));
				}, this), this._errorCallback("PEER_LOCAL_DESCRIPTION"));
			},
			
			_enhanceSDP: function (sdpStr, enhanceData) {
				var sdpLines = sdpStr.split(/\r\n/);
				var sdpSection = 'header';
				var hitMID = false;
				var sdpStrRet = '';
				Objs.iter(sdpLines, function (sdpLine) {
					if (sdpLine.length <= 0)
						return;
					sdpStrRet += sdpLine + '\r\n';
					if (sdpLine.indexOf("m=audio") === 0) {
						sdpSection = 'audio';
						hitMID = false;
					} else if (sdpLine.indexOf("m=video") === 0) {
						sdpSection = 'video';
						hitMID = false;
					}
					if (sdpLine.indexOf("a=mid:") !== 0)
						return;
					if (hitMID)
						return;
					if ('audio'.localeCompare(sdpSection) === 0) {
						if (enhanceData.audioBitrate !== undefined) {
							sdpStrRet += 'b=AS:' + enhanceData.audioBitrate + '\r\n';
							sdpStrRet += 'b=TIAS:' + (enhanceData.audioBitrate * 1024) + '\r\n';
						}
					} else if ('video'.localeCompare(sdpSection) === 0) {
						if (enhanceData.videoBitrate !== undefined) {
							sdpStrRet += 'b=AS:' + enhanceData.videoBitrate + '\r\n';
							sdpStrRet += 'b=TIAS:' + (enhanceData.videoBitrate * 1024) + '\r\n';
						}
					}
					hitMID = true;
				}, this);
				return sdpStrRet;
			},
			
			_wsOnClose: function () {},
			
			_error: function (errorName, errorData) {
				this.trigger("error", errorName, errorData);
				this.stop();
			},
			
			_errorCallback: function (errorName) {
				return Functions.as_method(function (errorData) {
					this._error(errorName, errorData);
				}, this);
			}
						
		};		
	}], {
		
		supported: function () {
			return (Support.globals()).RTCPeerConnection &&
			       (Support.globals()).RTCIceCandidate &&
			       (Support.globals()).RTCSessionDescription &&
			       (Support.globals()).WebSocket;
		}
		
	});
});
		

Scoped.define("module:WebRTC.RecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "module:WebRTC.Support",
    "base:Time",
    "module:Recorder.PixelSampleMixin"
], function (ConditionalInstance, EventsMixin, Objs, Support, Time, PixelSampleMixin, scoped) {
	return ConditionalInstance.extend({scoped: scoped}, [EventsMixin, PixelSampleMixin, function (inherited) {
		return {
			
			constructor: function (options) {
				inherited.constructor.call(this, options);
				this._video = options.video;
				this._recording = false;
				this._bound = false;
				this._hasAudio = false;
				this._hasVideo = false;
				this._flip = !!options.flip;
			},
			
			_getConstraints: function () {
				return {
					audio: this._options.recordAudio ? {
						sourceId: this._options.audioId
					} : false,
					video: this._options.recordVideo ? {
						/*
						mandatory: {
							minWidth: this._options.recordResolution.width,
							maxWidth: this._options.recordResolution.width,
							minHeight: this._options.recordResolution.height,
							maxHeight: this._options.recordResolution.height
						}
						*/
						sourceId: this._options.videoId,
						width: this._options.recordResolution.width,
						height: this._options.recordResolution.height
					} : false
				};
			},
			
			stream: function () {
				return this._stream;
			},
			
			bindMedia: function () {
				if (this._bound)
					return;
				return Support.userMedia2(this._getConstraints()).success(function (stream) {
					this._hasAudio = this._options.recordAudio && stream.getAudioTracks().length > 0;
					this._hasVideo = this._options.recordVideo && stream.getVideoTracks().length > 0;
					this._bound = true;
					this._stream = stream;
					Support.bindStreamToVideo(stream, this._video, this._flip);
					this.trigger("bound", stream);
					this._boundMedia();
				}, this);
			},
			
			selectCamera: function (cameraId) {
				this._options.videoId = cameraId;
				if (this._bound) {
					this.unbindMedia();
					this.bindMedia();
				}
			},
			
			selectMicrophone: function (microphoneId) {
				this._options.audioId = microphoneId;
				if (this._bound) {
					this.unbindMedia();
					this.bindMedia();
				}
			},

			startRecord: function (options) {
				if (this._recording)
					return;
				this._recording = true;
				this._startRecord(options);
				this._startTime = Time.now();
			},
			
			stopRecord: function () {
				if (!this._recording)
					return;
				this._recording = false;
				this._stopRecord();
				this._stopTime = Time.now();
			},
			
			duration: function () {
				return (this._recording || !this._stopTime ? Time.now() : this._stopTime) - this._startTime;
			},
			
			unbindMedia: function () {
				if (!this._bound || this._recording)
					return;
				Support.stopUserMediaStream(this._stream);
				this._bound = false;
				this.trigger("unbound");
				this._unboundMedia();
			},
			
			createSnapshot: function (type) {
				return Support.dataURItoBlob(this._createSnapshot(type));
			},
			
			_createSnapshot: function (type) {
			    var canvas = document.createElement('canvas');
				canvas.width = this._video.videoWidth || this._video.clientWidth;
				canvas.height = this._video.videoHeight || this._video.clientHeight;
			    var context = canvas.getContext('2d');
	        	context.drawImage(this._video, 0, 0, canvas.width, canvas.height);
	        	var data = canvas.toDataURL(type);
	        	return data;
			},
			
			_pixelSample: function (samples, callback, context) {
				samples = samples || 100;
			    var canvas = document.createElement('canvas');
				var w = this._video.videoWidth || this._video.clientWidth;
				var h = this._video.videoHeight || this._video.clientHeight;
				canvas.width = w;
				canvas.height = h;
			    var ctx = canvas.getContext('2d');
			    ctx.drawImage(this._video, 0, 0, w, h);
				var multiple = 2;
				while (samples > 0) {
					for (var i = 1; i < multiple; ++i) {
						for (var j = 1; j < multiple; ++j) {
							var data = ctx.getImageData(Math.floor(i * w / multiple), Math.floor(j * h / multiple), 1, 1).data;
							callback.call(context || this, data[0], data[1], data[2]);
							--samples;
							if (samples <= 0)
								break;
						}
						if (samples <= 0)
							break;
					}
					++multiple;
				}
			},

			_boundMedia: function () {},
			
			_unboundMedia: function () {},
			
			_startRecord: function (options) {},
			
			_stopRecord: function () {},
			
			_error: function (errorType, errorData) {
				this.trigger("error", errorType, errorData);
			},
			
			getVolumeGain: function () {},
			
			setVolumeGain: function (volumeGain) {},

			_dataAvailable: function (videoBlob, audioBlob) {
				if (this.destroyed())
					return;
				this.trigger("data", videoBlob, audioBlob);
			},
			
			destroy: function () {
				this.stopRecord();
				this.unbindMedia();
				inherited.destroy.call(this);
			},
			
			averageFrameRate: function () {
				return null;
			}
			
		};
	}], {
		
		_initializeOptions: function (options) {
			return Objs.extend({
				// video: null,
				recordAudio: true,
				recordVideo: true,
				recordResolution: {
					width: 320,
					height: 200
				}
			}, options);
		},
		
		supported: function (options) {
			return !!Support.globals().getUserMedia && !!Support.globals().URL;
		}		
		
	});
});


Scoped.define("module:WebRTC.PeerRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.PeerRecorder"
], function (RecorderWrapper, PeerRecorder, scoped) {
	return RecorderWrapper.extend({scoped: scoped}, {

		_boundMedia: function () {
			this._recorder = new PeerRecorder(this._stream, this._options.webrtcStreaming);
			this._recorder.on("error", this._error, this);
		},
		
		_unboundMedia: function () {
			this._recorder.destroy();
		},
		
		_startRecord: function (options) {
			this._recorder.start(options.webrtcStreaming);
		},
		
		_stopRecord: function () {
			this._recorder.stop();
			this._dataAvailable();
		},
		
		getVolumeGain: function () {
		},
		
		setVolumeGain: function (volumeGain) {
		},

		averageFrameRate: function () {
			return null;
		}

	}, function (inherited) {
		return {
			
			supported: function (options) {
				if (!inherited.supported.call(this, options))
					return false;
				return options.webrtcStreaming && PeerRecorder.supported();
			}
		
		};		
	});	
});


Scoped.define("module:WebRTC.MediaRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.MediaRecorder"
], function (RecorderWrapper, MediaRecorder, scoped) {
	return RecorderWrapper.extend({scoped: scoped}, {

		_boundMedia: function () {
			this._recorder = new MediaRecorder(this._stream);
			this._recorder.on("data", function (blob) {
				this._dataAvailable(blob);
			}, this);
		},
		
		_unboundMedia: function () {
			this._recorder.destroy();
		},
		
		_startRecord: function () {
			this._recorder.start();
		},
		
		_stopRecord: function () {
			this._recorder.stop();
		},
		
		getVolumeGain: function () {
		},
		
		setVolumeGain: function (volumeGain) {
		},

		averageFrameRate: function () {
			return null;
		}

	}, function (inherited) {
		return {
			
			supported: function (options) {
				if (!inherited.supported.call(this, options))
					return false;
				return MediaRecorder.supported();
			}
		
		};		
	});	
});


Scoped.define("module:WebRTC.WhammyAudioRecorderWrapper", [
     "module:WebRTC.RecorderWrapper",
     "module:WebRTC.AudioRecorder",
     "module:WebRTC.WhammyRecorder",
     "browser:Info"
], function (RecorderWrapper, AudioRecorder, WhammyRecorder, Info, scoped) {
	return RecorderWrapper.extend({scoped: scoped}, {
/*
		_getConstraints: function () {
			return {
				audio: this._options.recordAudio,
				video: this._options.recordVideo
			}
		},
*/
		_createSnapshot: function (type) {
			return this._whammyRecorder.createSnapshot(type);
		},

		_boundMedia: function () {
			this._videoBlob = null;
			this._audioBlob = null;
			if (this._hasVideo) {
				this._whammyRecorder = new WhammyRecorder(this._stream, {
					//recorderWidth: this._options.recordResolution.width,
					//recorderHeight: this._options.recordResolution.height,
					video: this._video,
					framerate: this._options.framerate
				});
			}
			if (this._hasAudio) {
				this._audioRecorder = new AudioRecorder(this._stream);
				this._audioRecorder.on("data", function (blob) {
					this._audioBlob = blob;
					if (this._videoBlob || !this._hasVideo)
						this._dataAvailable(this._videoBlob, this._audioBlob);
				}, this);
			}
			if (this._hasVideo) {
				this._whammyRecorder.on("data", function (blob) {
					this._videoBlob = blob;
					if (this._audioBlob || !this._hasAudio)
						this._dataAvailable(this._videoBlob, this._audioBlob);
				}, this);
			}
			/*
			this._whammyRecorder.on("onStartedDrawingNonBlankFrames", function () {
				if (this._recording)
					this._audioRecorder.start();
			}, this);
			*/
		},
		
		_unboundMedia: function () {
			if (this._hasAudio)
				this._audioRecorder.destroy();
			if (this._hasVideo)
				this._whammyRecorder.destroy();
		},
		
		_startRecord: function () {
			if (this._hasVideo)
				this._whammyRecorder.start();
			if (this._hasAudio)
				this._audioRecorder.start();
		},
		
		_stopRecord: function () {
			if (this._hasVideo)
				this._whammyRecorder.stop();
			if (this._hasAudio)
				this._audioRecorder.stop();
		},
		
		getVolumeGain: function () {
			return this._audioRecorder ? this._audioRecorder.getVolumeGain() : 1.0;
		},
		
		setVolumeGain: function (volumeGain) {
			if (this._audioRecorder)
				this._audioRecorder.setVolumeGain(volumeGain);
		},
		
		averageFrameRate: function () {
			return this._hasVideo ? this._whammyRecorder.averageFrameRate() : 0;
		}
		
		
	}, function (inherited) {
		return {
			
			supported: function (options) {
				if (!inherited.supported.call(this, options))
					return false;
				if (document.location.href.indexOf("https://") !== 0 && document.location.hostname !== "localhost") {
					if (Info.isChrome() && Info.chromeVersion() >= 47)
						return false;
					if (Info.isOpera() && Info.operaVersion() >= 34)
						return false;
				}
				return AudioRecorder.supported() && WhammyRecorder.supported();
			}
		
		};		
	});	
});


Scoped.extend("module:WebRTC.RecorderWrapper", [
	"module:WebRTC.RecorderWrapper",
	"module:WebRTC.PeerRecorderWrapper",
	"module:WebRTC.MediaRecorderWrapper",
	"module:WebRTC.WhammyAudioRecorderWrapper"
], function (RecorderWrapper, PeerRecorderWrapper, MediaRecorderWrapper, WhammyAudioRecorderWrapper) {
	RecorderWrapper.register(PeerRecorderWrapper, 3);
	RecorderWrapper.register(MediaRecorderWrapper, 2);
	RecorderWrapper.register(WhammyAudioRecorderWrapper, 1);
	return {};
});

Scoped.define("module:WebRTC.Support", [
    "base:Promise",
    "base:Objs",
    "browser:Info"
], function (Promise, Objs, Info) {
	return {
		
		canvasSupportsImageFormat: function (imageFormat) {
			try {
				var data = document.createElement('canvas').toDataURL(imageFormat);
				var headerIdx = data.indexOf(";");
				return data.substring(0, data.indexOf(";")).indexOf(imageFormat) != -1;
			} catch (e) {
				return false;
			}
		},
		
		getGlobals: function () {
			var getUserMedia = null;
			var getUserMediaCtx = null;
			/*
			if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
				getUserMedia = navigator.mediaDevices.getUserMedia;
				getUserMediaCtx = navigator.mediaDevices;
			} else { */
				getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
				getUserMediaCtx = navigator;
			//}
			var URL = window.URL || window.webkitURL;
			var MediaRecorder = window.MediaRecorder;
			var AudioContext = window.AudioContext || window.webkitAudioContext;
			var audioContextScriptProcessor = null;
			var createAnalyser = null;
			if (AudioContext) {
				var audioContext = new AudioContext();
				audioContextScriptProcessor = audioContext.createJavaScriptNode || audioContext.createScriptProcessor;
				createAnalyser = audioContext.createAnalyser;
			}
			var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
			var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
			var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
			var WebSocket = window.WebSocket;
			return {
				getUserMedia: getUserMedia,
				getUserMediaCtx: getUserMediaCtx,
				URL: URL,
				MediaRecorder: MediaRecorder,
				AudioContext: AudioContext,
				createAnalyser: createAnalyser,
				audioContextScriptProcessor: audioContextScriptProcessor,
				webpSupport: this.canvasSupportsImageFormat("image/webp"),
				RTCPeerConnection: RTCPeerConnection,
				RTCIceCandidate: RTCIceCandidate,
				RTCSessionDescription: RTCSessionDescription,
				WebSocket: WebSocket
			};
		},
		
		globals: function () {
			if (!this.__globals)
				this.__globals = this.getGlobals();
			return this.__globals;
		},
		
		userMediaSupported: function () {
			return !!this.globals().getUserMedia;
		},
		
		enumerateMediaSources: function () {
			var promise = Promise.create();
			var promiseCallback = function (sources) {
				var result = {
					audio: {},
					audioCount: 0,
					video: {},
					videoCount: 0
				};
				Objs.iter(sources, function (source) {
					if (source.kind.indexOf("video") === 0) {
						result.videoCount++;
						result.video[source.id || source.deviceId] = {
							id: source.id || source.deviceId,
							label: source.label
						};
					}
					if (source.kind.indexOf("audio") === 0) {
						result.audioCount++;
						result.audio[source.id || source.deviceId] = {
							id: source.id || source.deviceId,
							label: source.label
						};
					}
				});
				promise.asyncSuccess(result);
			};
			try {
				if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
					navigator.mediaDevices.enumerateDevices().then(promiseCallback);
				else if (MediaStreamTrack && MediaStreamTrack.getSources)
					MediaStreamTrack.getSources(promiseCallback);
				else
					promise.asyncError("Unsupported");
			} catch (e) {
				promise.asyncError(e);
			}
			return promise;
		},
		
		streamQueryResolution: function (stream) {
			var promise = Promise.create();
			var video = this.bindStreamToVideo(stream);			
            video.addEventListener("playing", function () {
                setTimeout(function () {
                	promise.asyncSuccess({
                		stream: stream,
                		width: video.videoWidth,
                		height: video.videoHeight
                	});
                	video.remove();
                }, 500);
            });
			return promise;
		},
		
		userMedia: function (options) {
			var promise = Promise.create();
			this.globals().getUserMedia.call(this.globals().getUserMediaCtx, options, function (stream) {
				promise.asyncSuccess(stream);
			}, function (e) {
				promise.asyncError(e);
			});
			return promise;
		},
		
		/*
		 * audio: {} | undefined
		 * video: {} | undefined
		 * 	  width, height, aspectRatio
		 */
		userMedia2: function (options) {
			var opts = {};
			if (options.audio)
				opts.audio = options.audio;
			if (!options.video)
				return this.userMedia(opts);
			if (Info.isFirefox()) {
				opts.video = {};
				if (options.video.aspectRatio && !(options.video.width && options.video.height)) {
					if (options.video.width)
						options.video.height = Math.round(options.video.width / options.video.aspectRatio);
					else if (options.video.height)
						options.video.width = Math.round(options.video.height * options.video.aspectRatio);
				}
				if (options.video.width) {
					opts.video.width = {
						ideal: options.video.width
					};
				}
				if (options.video.height) {
					opts.video.height = {
						ideal: options.video.height
					};
				}
				/* This is supposed to work according to docs, but it is not:
				 * https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Frame_rate
				 */
				/*
				if (options.video.frameRate) {
					opts.video.frameRate = {
						ideal: options.video.frameRate
					};
				}
				*/
				if (options.video.sourceId)
					opts.video.sourceId = options.video.sourceId; 
				return this.userMedia(opts);
			} else {
				opts.video = {
					mandatory: {}
				};
				if (options.video.width) {
					opts.video.mandatory.minWidth = options.video.width;
					opts.video.mandatory.maxWidth = options.video.width;
				}
				if (!options.video.width && options.video.height) {
					opts.video.mandatory.minHeight = options.video.height;
					opts.video.mandatory.maxHeight = options.video.height;
				}
				var as = options.video.aspectRatio ? options.video.aspectRatio : (options.video.width && options.video.height ? options.video.width/options.video.height : null);
				if (as) {
					opts.video.mandatory.minAspectRatio = as;
					opts.video.mandatory.maxAspectRatio = as;
				}
				if (options.video.sourceId)
					opts.video.mandatory.sourceId = options.video.sourceId;

				var probe = function (count) {
					var mandatory = opts.video.mandatory;
					return this.userMedia(opts).mapError(function (e) {
						count--;
						if (e.name !== "ConstraintNotSatisfiedError")
							return e;
						var c = e.constraintName.toLowerCase();
						Objs.iter(mandatory, function (value, key) {
							var lkey = key.toLowerCase();
							if (lkey.indexOf(c) >= 0) {
								var flt = lkey.indexOf("aspect") > 0;
								var d = lkey.indexOf("min") === 0 ? -1 : 1;
								var u = Math.max(0, mandatory[key] * (1.0 + d / 10));
								mandatory[key] = flt ? u : Math.round(u);
								if (count < 0) {
									delete mandatory[key];
									count = 100;
								}
							}
						}, this);
						return probe.call(this, count);
					}, this);
				};
				return probe.call(this, 100);
			}
		},
		
		stopUserMediaStream: function (stream) {
			try {
				if (stream.stop) {
					stream.stop();
				} else if (stream.getTracks) {
					stream.getTracks().forEach(function (track) {
						track.stop();
					});
				}
			} catch (e) {}
		},
		
		bindStreamToVideo: function (stream, video, flip) {
			if (!video)
				video = document.createElement("video");
			video.volume = 0;
			video.muted = true;
			if (video.mozSrcObject !== undefined)
                video.mozSrcObject = stream;
            else
            	video.src = this.globals().URL.createObjectURL(stream);
			if (flip) {
				video.style["-moz-transform"] = "scale(-1, 1)";
				video.style["-webkit-transform"] = "scale(-1, 1)";
				video.style["-o-transform"] = "scale(-1, 1)";
				video.style.transform = "scale(-1, 1)";
				video.style.filter = "FlipH";
			} else {
				delete video.style["-moz-transform"];
				delete video.style["-webkit-transform"];
				delete video.style["-o-transform"];
				delete video.style.transform;
				delete video.style.filter;
			}
			video.autoplay = true;
			video.play();
			return video;
		},
		
		dataURItoBlob: function (dataURI) {
		    // convert base64 to raw binary data held in a string
		    var byteString = atob(dataURI.split(',')[1]);

		    // separate out the mime component
		    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

		    // write the bytes of the string to an ArrayBuffer
		    var arrayBuffer = new ArrayBuffer(byteString.length);
		    var _ia = new Uint8Array(arrayBuffer);
		    for (var i = 0; i < byteString.length; i++)
		        _ia[i] = byteString.charCodeAt(i);
		    var dataView = new DataView(arrayBuffer);
		    var blob = new Blob([dataView], { type: mimeString });
		    return blob;
		}

	};
});





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
], function (Class, EventsMixin, Objs, Time, Functions, Async, Support, WebmSupport, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {

		var CLUSTER_MAX_DURATION = 30000;

		return {

			constructor: function (stream, options) {
				inherited.constructor.call(this);
				this._stream = stream;
				this._options = Objs.extend({
					recordWidth: 320,
					recordHeight: 240,
					video: null,
					framerate: null
				}, options);
				this._started = false;
			},

			destroy: function () {
				this._started = false;
				this.trigger("stopped");
				inherited.destroy.call(this);
			},

			start: function () {
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
			
			stop: function () {
				if (!this._started)
					return;
				this._started = false;
				this.trigger("stopped");
				this._generateData();
			},
			
			_process: function () {
				if (!this._started)
					return;
				var now = Time.now();
				var duration = now - this._lastTime;
		        this._lastTime = now;
		        this._context.drawImage(this._video, 0, 0, this._canvas.width, this._canvas.height);
			    this._frames.push({
		            duration: duration,
		            image: this._canvas.toDataURL('image/webp')
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
			
			averageFrameRate: function () {
				return this._frames.length > 0 ? (this._frames.length / (Time.now() - this._startTime) * 1000) : null;
			},
			
			_generateData: function () {
		        if (!this._frames.length)
		            return;
		        this._data = this.__compile(this.__dropBlackFrames(this._canvas, this._frames));
		        this.trigger("data", this._data);
			},
			
		    __compile: function (frames) {
		    	var totalDuration = 0;
		    	var width = null;
		    	var height = null;
		    	var clusters = [];

	            var clusterTimecode = 0;

	            var clusterFrames = null;
	            var clusterDuration = null;
		    	
		    	frames.forEach(function (frame) {
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

		    __dropBlackFrames: function (canvas, _frames, _pixTolerance, _frameTolerance) {
		    	var idx = 0;
		    	while (idx < _frames.length) {
		    		if (!WebmSupport.isBlankFrame(canvas, _frames[idx], _pixTolerance, _frameTolerance))
		    			break;
		    		idx++;
		    	}
		    	return _frames.slice(idx);
		    },		    

			createSnapshot: function (type) {
				this._context.drawImage(this._video, 0, 0, this._canvas.width, this._canvas.height);
				return this._canvas.toDataURL(type);
			}

		};		
	}], {

		supported: function () {
			return Support.globals().webpSupport;
		}

	});
});


}).call(Scoped);