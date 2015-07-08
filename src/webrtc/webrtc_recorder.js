Scoped.define("module:WebRTC.RecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "module:WebRTC.Support"
], function (ConditionalInstance, EventsMixin, Objs, Support, scoped) {
	return ConditionalInstance.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (options) {
				inherited.constructor.call(this, options);
				this._video = options.video;
				this._recording = false;
				this._bound = false;
			},
			
			_getConstraints: function () {
				return {
					audio: this._options.recordAudio,
					video: this._options.recordVideo ? this._options.recordResolution : false
				};
			},
			
			bindMedia: function () {
				if (this._bound)
					return;
				return Support.userMedia(this._getConstraints()).success(function (stream) {
					this._bound = true;
					this._stream = stream;
					Support.bindStreamToVideo(stream, this._video);
					this.trigger("bound");
					this._boundMedia();
				}, this);
			},
			
			startRecord: function () {
				if (this._recording)
					return;
				this._recording = true;
				this._startRecord();
			},
			
			stopRecord: function () {
				if (!this._recording)
					return;
				this._recording = false;
				this._stopRecord();
			},
			
			unbindMedia: function () {
				if (!this._bound || this._recording)
					return;
				Support.stopUserMediaStream(this._stream);
				this._bound = false;
				this.trigger("unbound");
				this._unboundMedia();
			},
			
			separateAudioData: function () {
				return false;
			},
			
			_boundMedia: function () {},
			
			_unboundMedia: function () {},
			
			_startRecord: function () {},
			
			_stopRecord: function () {},
			
			_videoDataAvailable: function (blob) {
				this.trigger("video_data", blob);
			},
			
			_audioDataAvailable: function (blob) {
				this.trigger("audio_data", blob);
			},

			destroy: function () {
				this.stopRecord();
				this.unbindMedia();
				inherited.destroy.call(this);
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


Scoped.define("module:WebRTC.MediaRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.MediaRecorder"
], function (RecorderWrapper, MediaRecorder, scoped) {
	var Cls = RecorderWrapper.extend({scoped: scoped}, {

		_boundMedia: function () {
			this._recorder = new MediaRecorder(this._stream);
			this._recorder.on("data", function (blob) {
				this._videoDataAvailable(blob);
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
	
	RecorderWrapper.register(Cls, 2);
	
	return Cls;
});

/*
Scoped.define("module:WebRTC.WhammyAudioRecorderWrapper", [
     "module:WebRTC.RecorderWrapper",
     "module:WebRTC.AudioRecorder",
     "module:WebRTC.WhammyRecorder"
], function (RecorderWrapper, AudioRecorder, WhammyRecorder, scoped) {
	var Cls = RecorderWrapper.extend({scoped: scoped}, {

		_getConstraints: function () {
			return {
				audio: this._options.recordAudio,
				video: this._options.recordVideo
			}
		},

		_boundMedia: function () {
			this._whammyRecorder = new WhammyRecorder(this._stream, {
				recorderWidth: this._options.recordResolution.width,
				recorderHeight: this._options.recordResolution.height
			});
			this._audioRecorder = new AudioRecorder(this._stream);
			this._whammyRecorder.on("data", function (blob) {
				this._videoDataAvailable(blob);
			}, this);
			this._whammyRecorder.on("onStartedDrawingNonBlankFrames", function () {
				if (this._recording)
					this._audioRecorder.start();
			}, this);
		},
		
		_unboundMedia: function () {
			this._audioRecorder.destroy();
			this._whammyRecorder.destroy();
		},
		
		_startRecord: function () {
			this._whammyRecorder.start();
		},
		
		_stopRecord: function () {
			this._audioRecorder.stop();
			this._whammyRecorder.stop();
		},
		
		separateAudioData: function () {
			return true;
		}		
		
	}, function (inherited) {
		return {
			
			supported: function (options) {
				if (!inherited.supported.call(this, options))
					return false;
				return AudioRecorder.supported() && WhammyRecorder.supported();
			}
		
		};		
	});	
	
	RecorderWrapper.register(Cls, 1);
	
	return Cls;
});
*/