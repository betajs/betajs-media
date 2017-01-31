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
				this.__audioRate = this.readAttr('audiorate') || 44;
				this.__audioQuality = this.readAttr('audioquality') || 10;
				this.__videoRate = this.readAttr('videorate') || 0;
				this.__videoQuality = this.readAttr('videoquality') || 90;
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
				this._flashObjs.camera.setQuality(this.__videoRate, this.__videoQuality);
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
				this._flashObjs.microphone.set("rate", profile.rate || this.__audioRate);
				this._flashObjs.microphone.set("encodeQuality", profile.encodeQuality || this.__audioQuality);
				this._flashObjs.microphone.set("codec", profile.codec || this.__microphoneCodec);
				this._currentMicrophoneProfile = profile;
			},
			
			getVolumeGain: function () {
				var gain = this._mediaBound ? this._flashObjs.micropone.get("gain") : 55;
				return gain / 55.0;
			},
			
			setVolumeGain: function (volumeGain) {
				this.__defaultGain = Math.min(Math.max(0, Math.round(volumeGain * 55)), 100);
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

