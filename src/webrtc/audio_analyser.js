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
				this._audioInput = this._audioContext.createMediaStreamSource(stream);
				this._audioInput.connect(this._analyserNode);
			},
			
			destroy: function () {
				this._analyserNode.disconnect();
				delete this._analyserNode;
				this._audioContext.close();
				delete this._audioContext;
				inherited.destroy.call(this);
			},
				
			soundLevel: function () {
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
