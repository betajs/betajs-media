Scoped.define("module:WebRTC.Support", [
    "base:Promise.Promise"
], function (Promise) {
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
				audioContextScriptProcessor: audioContextScriptProcessor,
				webpSupport: this.canvasSupportsImageFormat("image/webp") 
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
		
		/*
		 * audio: {} | undefined
		 * video: {} | undefined
		 * 	  width, height, aspectRatio
		 */
		userMedia2: function (options) {
			var opts = {};
			if (options.audio)
				opts.audio = true;
			if (options.video) {
				opts.video = {
					mandatory: {}
				};
				if (options.video.width) {
					opts.video.mandatory.minWidth = options.video.width;
					opts.video.mandatory.maxWidth = options.video.width;
				}
				if (options.video.height) {
					opts.video.mandatory.minHeight = options.video.height;
					opts.video.mandatory.maxHeight = options.video.height;
				}
				var as = options.video.aspectRatio ? options.video.aspectRatio : (options.video.width && options.video.height ? options.video.width/options.video.height : null);
				if (as) {
					opts.video.mandatory.minAspectRatio = as;
					opts.video.mandatory.maxAspectRatio = as;
				}
			}
			var probe = function () {
				return this.userMedia(opts).mapError(function (e) {
					if (e.name !== "ConstraintNotSatisfiedError")
						return e;
					var c = e.constraintName;
					var flt = c.indexOf("aspect") > 0;
					var d = c.indexOf("min") === 0 ? -1 : 1;
					var u = Math.max(0, opts[c] * (1.0 + d / 10));
					opts[c] = flt ? u : Math.round(u);
					return probe.call(this);
				});
			};
			return probe.call(this);
		},
		
		stopUserMediaStream: function (stream) {
			stream.stop();
		},
		
		bindStreamToVideo: function (stream, video) {
			video.volume = 0;
			video.muted = true;
			if (video.mozSrcObject !== undefined)
                video.mozSrcObject = stream;
            else
            	video.src = this.globals().URL.createObjectURL(stream);
			video.autoplay = true;
			video.play();
		}

	};
});




