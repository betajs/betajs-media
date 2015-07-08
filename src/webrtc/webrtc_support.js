Scoped.define("module:WebRTC.Support", [
    "base:Promise.Promise"
], function (Promise) {
	return {
		
		getGlobals: function () {
			var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
			var URL = window.URL || window.webkitURL;
			var MediaRecorder = window.MediaRecorder;
			var AudioContext = window.AudioContext || window.webkitAudioContext;
			var audioContextScriptProcessor = null;
			if (AudioContext) {
				var audioContext = new AudioContext();
				audioContextScriptProcessor = audioContext.createJavaScriptNode || audioContext.createScriptProcessor;
			}
			return {
				getUserMedia: getUserMedia,
				URL: URL,
				MediaRecorder: MediaRecorder,
				AudioContext: AudioContext,
				audioContextScriptProcessor: audioContextScriptProcessor
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
		
		userMedia: function (options) {
			var promise = new Promise();
			this.globals().getUserMedia.call(navigator, options, function (stream) {
				promise.asyncSuccess(stream);
			}, function (e) {
				promise.asyncError(e);
			});
			return promise;
		},		
		
		stopUserMediaStream: function (stream) {
			stream.stop();
		},
		
		bindStreamToVideo: function (stream, video) {
			video.volume = 0;
			video.src = this.globals().URL.createObjectURL(stream);
			video.play();
		}

	};
});




