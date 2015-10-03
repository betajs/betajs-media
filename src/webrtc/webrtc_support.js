Scoped.define("module:WebRTC.Support", [
    "base:Promise.Promise",
    "base:Objs"
], function (Promise, Objs) {
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
		
		mediaStreamTrackSourcesSupported: function () {
			return MediaStreamTrack && MediaStreamTrack.getSources;
		},
		
		mediaStreamTrackSources: function () {
			if (!this.mediaStreamTrackSourcesSupported())
				return Promise.error("Unsupported");
			var promise = new Promise();
			try {
				MediaStreamTrack.getSources(function (sources) {
					var result = {
						audio: {},
						audioCount: 0,
						video: {},
						videoCount: 0
					};
					Objs.iter(sources, function (source) {
						if (source.kind === "video") {
							result.videoCount++;
							result.video[source.id] = {
								id: source.id,
								label: source.label
							};
						}
						if (source.kind === "audio") {
							result.audioCount++;
							result.audio[source.id] = {
								id: source.id,
								label: source.label
							};
						}
					});
					promise.asyncSuccess(result);
				});
				return promise;
			} catch (e) {
				return Promise.error(e);
			}
		},
		
		streamQueryResolution: function (stream) {
			var promise = new Promise();
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
				if (!options.video.width && options.video.height) {
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
				var mandatory = opts.video.mandatory;
				return this.userMedia(opts).mapError(function (e) {
					if (e.name !== "ConstraintNotSatisfiedError")
						return e;
					var c = e.constraintName;
					var flt = c.indexOf("aspect") > 0;
					var d = c.indexOf("min") === 0 ? -1 : 1;
					var u = Math.max(0, mandatory[c] * (1.0 + d / 10));
					mandatory[c] = flt ? u : Math.round(u);
					return probe.call(this);
				}, this);
			};
			return opts.video.mandatory ? probe.call(this) : this.userMedia(opts);
		},
		
		stopUserMediaStream: function (stream) {
			stream.stop();
		},
		
		bindStreamToVideo: function (stream, video) {
			if (!video)
				video = document.createElement("video");
			video.volume = 0;
			video.muted = true;
			if (video.mozSrcObject !== undefined)
                video.mozSrcObject = stream;
            else
            	video.src = this.globals().URL.createObjectURL(stream);
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




