// Credits: http://typedarray.org/wp-content/projects/WebAudioRecorder/script.js
// Co-Credits: https://github.com/streamproc/MediaStreamRecorder/blob/master/MediaStreamRecorder-standalone.js

Scoped.define("module:WebRTC.AudioRecorder", [
                                              "base:Class",
                                              "base:Events.EventsMixin",
                                              "base:Objs",
                                              "base:Functions",
                                              "module:WebRTC.Support"
                                              ], function (Class, EventsMixin, Objs, Functions, Support, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {

			constructor: function (stream, options) {
				inherited.constructor.call(this);
				this._requestDataInvoked = false;
				this._started = false;
				this._leftChannel = [];
				this._rightChannel = [];
				this._recordingLength = 0;
				this._options = Objs.extend({
					audioChannels: 2,
					bufferSize: 2048,
					sampleRate: 44100				 
				}, options);
				this._stream = stream;
				this._started = false;
				var AudioContext = Support.globals().AudioContext;
				this._audioContext = new AudioContext();
				this._volumeGain = this._audioContext.createGain();
				this._audioInput = this._audioContext.createMediaStreamSource(stream);
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

			_audioProcess: function (e) {
				if (!this.started)
					return;
				this._leftChannel.push(new Float32Array(e.inputBuffer.getChannelData(0)));
				if (this._options.audioChannels > 1)
					this._rightChannel.push(new Float32Array(e.inputBuffer.getChannelData(1)));
				this._recordingLength += this._actualBufferSize;
			},

			destroy: function () {
				this.stop();
				inherited.destroy.call(this);
			},

			start: function () {
				if (this._started)
					return;
				this._started = true;
				this._recordingLength = 0;
				this._leftChannel = [];
				this._rightChannel = [];
				this.trigger("started");
			},

			stop: function () {
				if (!this._started)
					return;
				this._started = false;
				this.trigger("stopped");
				this._generateData();
			},

			_generateData: function () {
				var leftBuffer = this.__mergeBuffers(this._leftChannel, this._recordingLength);
				var rightBuffer = this.__mergeBuffers(this._rightChannel, this._recordingLength);
				var interleaved = leftBuffer;
				if (this._options.audioChannels > 1) {
					interleaved = new Float32Array(leftBuffer.length + rightBuffer.length);
					for (var i = 0; i < leftBuffer.length; ++i) {
						interleaved[2 * i] = leftBuffer[i];
						interleaved[2 * i + 1] = rightBuffer[i];
					}
				}
				// we create our wav file
				var buffer = new ArrayBuffer(44 + interleaved.length * 2);
				var view = new DataView(buffer);
				// RIFF chunk descriptor
				this.__writeUTFBytes(view, 0, 'RIFF');
				view.setUint32(4, 44 + interleaved.length * 2, true);
				this.__writeUTFBytes(view, 8, 'WAVE');
				// FMT sub-chunk
				this.__writeUTFBytes(view, 12, 'fmt ');
				view.setUint32(16, 16, true);
				view.setUint16(20, 1, true);
				// stereo (2 channels)
				view.setUint16(22, this._options.audioChannels, true);
				view.setUint32(24, this._options.sampleRate, true);
				view.setUint32(28, this._options.sampleRate * 4, true);
				view.setUint16(32, this._options.audioChannels * 2, true);
				view.setUint16(34, 16, true);
				// data sub-chunk
				this.__writeUTFBytes(view, 36, 'data');
				view.setUint32(40, interleaved.length * 2, true);
				// write the PCM samples
				var lng = interleaved.length;
				var index = 44;
				var volume = 1;
				for (var j = 0; j < lng; j++) {
					view.setInt16(index, interleaved[j] * (0x7FFF * volume), true);
					index += 2;
				}
				// our final binary blob
				this._data = new Blob([view], {
					type: 'audio/wav'
				});
				this._leftChannel = [];
				this._rightChannel = [];
				this._recordingLength = 0;
				this.trigger("data", this._data);
			},

			__mergeBuffers: function (channelBuffer, recordingLength) {
				var result = new Float32Array(recordingLength);
				var offset = 0;
				var lng = channelBuffer.length;
				for (var i = 0; i < lng; i++) {
					var buffer = channelBuffer[i];
					result.set(buffer, offset);
					offset += buffer.length;
				}
				return result;
			},

			__writeUTFBytes: function (view, offset, string) {
				for (var i = 0; i < string.length; i++)
					view.setUint8(offset + i, string.charCodeAt(i));
			}


		};		
	}], {

		supported: function () {
			return !!Support.globals().AudioContext && !!Support.globals().audioContextScriptProcessor;
		}

	});
});
