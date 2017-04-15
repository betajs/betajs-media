Scoped.define("module:Encoding.WaveEncoder.Support", [
    "base:Promise",
    "base:Scheduling.Helper"
], function(Promise, SchedulingHelper) {
    return {

        dumpInputBuffer: function(inputBuffer, audioChannels, bufferSize, offset) {
            return {
                left: new Float32Array(inputBuffer.getChannelData(0)),
                right: audioChannels > 1 ? new Float32Array(inputBuffer.getChannelData(1)) : null,
                offset: offset || 0,
                endOffset: bufferSize
            };
        },

        waveChannelTransform: function(dumpedInputBuffer, volume, schedulable, schedulableCtx) {
            var promise = Promise.create();
            var volumeFactor = 0x7FFF * (volume || 1);
            var offset = dumpedInputBuffer.offset;
            var endOffset = dumpedInputBuffer.endOffset;
            var left = dumpedInputBuffer.left;
            var right = dumpedInputBuffer.right;
            var result = new Int16Array((endOffset - offset) * (right ? 2 : 1));
            var resultOffset = 0;
            SchedulingHelper.schedulable(function(steps) {
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
            }, 100, schedulable, schedulableCtx);
            return promise;
        },

        generateHeader: function(totalSize, audioChannels, sampleRate, buffer) {
            buffer = buffer || new ArrayBuffer(44);
            var view = new DataView(buffer);
            view.writeUTFBytes = function(offset, string) {
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