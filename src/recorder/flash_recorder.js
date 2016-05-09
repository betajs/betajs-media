Scoped.define("module:Player.FlashRecorderWorkInProgress", [
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
    "jquery:",
    "base:Promise"
], function (Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Timer, $, Promise, scoped) {
	var Cls = Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (element, attrs) {
				inherited.constructor.call(this, element, attrs);
				this._embedding = this.auto_destroy(new FlashEmbedding(element, {
					registry: this.cls.flashRegistry(),
					wrap: true,
					debug: false
				}));
				this._flashObjs = {};
				this._snapshots = [];
				this.ready = Promise.create();
				this.__cameraWidth = this.readAttr('camerawidth') || 640;
				this.__cameraHeight = this.readAttr('cameraheight') || 480;
				this.__fps = this.readAttr('fps') || 20;				
				this._embedding.ready(this.__initializeEmbedding, this);
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
				this._flashObjs.lightLevelBmp = this._embedding.newObject(
					"flash.display.BitmapData",
					this._flashObjs.stage.get("stageWidth"),
					this._flashObjs.stage.get("stageHeight")
				);
				this._flashObjs.main.addChildVoid(this._flashObjs.video);
				this._flashObjs.Microphone = this._embedding.getClass("flash.media.Microphone");
				this._flashObjs.Camera = this._embedding.getClass("flash.media.Camera");
				this._flashObjs.microphone = this._flashObjs.Microphone.getMicrophone(0);
				this._flashObjs.camera = this._flashObjs.Camera.getCamera(0);
				this._flashObjs.Security = this._embedding.getClass("flash.system.Security");
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
				if (fullSecurityDialog)
					this._flashObjs.Security.showSettings("privacy");
				else {
					this._flashObjs.video.attachCamera(null);
					this._flashObjs.video.attachCamera(this._flashObjs.camera);
				}
			},
			
			grantAccess: function (fullSecurityDialog, allowDeny) {
				if (this.isAccessGranted())
					return Promise.value(true);
				if (!this.isSecurityDialogOpen())
					this.openSecurityDialog(fullSecurityDialog);
				var promise = Promise.create();
				var timer = new Timer({
					fire: function () {
						if (this.isAccessGranted()) {
							timer.destroy();
							promise.asyncSuccess(true);
						} else if (!this.isSecurityDialogOpen()) {
							if (allowDeny || !fullSecurityDialog) {
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
			
			bindMedia: function () {
				this._flashObjs.camera.setMode(this.__cameraWidth, this.__cameraHeight, this.__fps);
				this._flashObjs.camera.setQuality(0, 90);
				this._flashObjs.camera.setKeyFrameInterval(5);
				this._flashObjs.video.attachCamera(this._flashObjs.camera);
				this._flashObjs.cameraVideo.attachCamera(this._flashObjs.camera);
			},
			
			unbindMedia: function () {
				this._flashObjs.video.attachCamera(null);
				this._flashObjs.cameraVideo.attachCamera(null);
			},
			
			enumerateDevices: function () {
				return {
					microphones: this._flashObjs.Microphone.get('names'),
					cameras: this._flashObjs.Camera.get('names')
				};
			},
			
			selectMicrophone: function (index) {
				if (this._flashObjs.microphone)
					this._flashObjs.microphone.weakDestroy();
				this.__hasMicrophoneActivity = false;
				this._flashObjs.microphone = this._flashObjs.Microphone.getMicrophone(index);
			},
						
			selectCamera: function (index) {
				if (this._flashObjs.camera)
					this._flashObjs.camera.weakDestroy();
				this._flashObjs.camera = this._flashObjs.Camera.getCamera(index);
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
					hasActivity: this.__hasMicrophoneActivity
				};
			},

			cameraInfo: function () {
				return {
					muted: this._flashObjs.camera.get("muted"),
					name: this._flashObjs.camera.get("name"),
					activityLevel: this._flashObjs.camera.get("activityLevel"),
					fps: this._flashObjs.camera.get("fps"),
					width: this._flashObjs.camera.get("width"),
					height: this._flashObjs.camera.get("height")
					// TODO: active
				};
			},
			
			setMicrophoneProfile: function(profile) {
				profile = profile || {};
				this._flashObjs.microphone.setLoopBack(profile.loopback);
				this._flashObjs.microphone.set("gain", profile.gain || 55);
				this._flashObjs.microphone.setSilenceLevel(profile.silenceLevel || 0);
				this._flashObjs.microphone.setUseEchoSuppression(profile.echoSuppression || false);
			},

			setMicrophoneCodec: function (codec, params) {
				this._flashObjs.microphone.set("codec", codec);
				for (var key in params || {})
					this._flashObjs.microphone.set(key, params[key]);
			},
			
			lightLevel: function (samples) {
				this._flashObjs.lightLevelBmp.draw(this._flashObjs.video);
				var w = this._flashObjs.stage.get("stageWidth");
				var h = this._flashObjs.stage.get("stageHeight");
				samples = samples || 10;
				var total_samples = samples * samples;
				var total_light = 0;
				for (var i = 0; i < samples; ++i)
					for (var j = 0; j < samples; ++j) {
						var rgb = this._flashObjs.lightLevelBmp.getPixel(i * w / samples, j * h / samples);
						var light = ((rgb % 256) + ((rgb / 256) % 256) + ((rgb / 256 / 256) % 256)) / 3;
						total_light += light; 
					}
				return total_light / total_samples;
			},
			
			_fire: function () {
				if (this._flashObjs.microphone && !this.__hasMicrophoneActivity)
					this.__hasMicrophoneActivity = this._flashObjs.microphone.get("activityLevel") > 0;
			},
			
			createSnapshot: function () {
				var bmp = this._embedding.newObject(
					"flash.display.BitmapData",
					this._flashObjs.video.get("videoWidth"),
					this._flashObjs.video.get("videoHeight")
				);
				bmp.draw(this._flashObjs.video);
				this._snapshots.push(bmp);
				return this._snapshots.length - 1;
			},
			
			postSnapshot: function (index, url, type, quality) {
				var promise = Promise.create();
				quality = quality || 90;
				var bmp = this._snapshots[index];
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
		    		PngEncoder.destroy();
		    	}
		    	var poster = this._embedding.newObject("flash.net.URLLoader");
		    	poster.set("dataFormat", "BINARY");

		    	// In case anybody is wondering, no, the progress event does not work for uploads:
				// http://stackoverflow.com/questions/2106682/a-progress-event-when-uploading-bytearray-to-server-with-as3-php/2107059#2107059

		    	poster.addEventListener("COMPLETE", this._embedding.newCallback(Functions.as_method(function () {
		    		promise.asyncSuccess(true);
		    	}, this)));
		    	poster.addEventListener("IO_ERROR", this._embedding.newCallback(Functions.as_method(function () {
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
			
			showSnapshot: function (index, x, y, w, h) {
				var bmpData = this._snapshots[index];
				var bmp = this._embedding.newObject("flash.display.Bitmap", bmpData);
				bmp.set("x", x);
				bmp.set("y", y);
				bmp.set("scaleX", w / bmpData.get("width"));
				bmp.set("scaleY", h / bmpData.get("height"));
				this._flashObjs.stage.addChild(bmp);
				return bmp;
			},
			
			hideSnapshot: function (snapshot) {
				this._flashObjs.stage.removeChild(snapshot);
				snapshot.destroy();
			},

			idealBB: function () {
				// TODO
				return null;
			},
			
			setActualBB: function (actualBB) {
				// TODO
			}
		
		};		
	}, {
		
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



/*

startRecording: function () {
	var status = 'connecting';
	var connection = new NetConnection();
	connection.addEventListener("NET_STATUS", function (event) {
		if (event.info.code == "NetConnection.Connect.Closed" && status != 'stopping') {
			error("Connection to server interrupted.");
			return;
		}
		if (event.info.code == "NetConnection.Connect.Success" && status != 'connecting') {
			error("Could not connect to server");
			return;
		}
		if (event.info.code == "NetConnection.Connect.Success" && status == 'connecting') {
		}
	});
	connection.connect(serverUrl);
	
	if (streamFileType == "mp4")
		connection.call("setStreamType", null, "live");
	
	stream = new NetStream(connection);			
	stream.addEventListener(NetStatusEvent.NET_STATUS, function (event) {
		if (event.info.code == "NetStream.Record.Start") {
			status = 'recording';
			return;
		}
		if (event.info.code == "NetStream.Play.StreamNotFound") {
			stream.close();
			if (status != "none")
				throw_error("Stream not found");
			return;
		}
		
		// buffer empty and stopped means OK to close stream
		else if (event.info.code == "NetStream.Buffer.Empty") {
			if (status == "uploading" && config.recordStreamFileType() == "mp4") {
				stream.publish(null);
			}
		}
		
		if (event.info.code == "NetStream.Unpublish.Success" || (status == "uploading" && event.info.code == "NetStream.Buffer.Empty" && config.recordStreamFileType() == "flv" && stream.bufferLength == 0)) {
			if (stream_timer) {
				stream_timer.stop();
				stream_timer = null;
			}
			stream.close();
			stream = null;
			connection.close();
			connection = null;
			update_status("finished");
		}
	});

	stream.bufferTime = 120;
	if (streamFileType == "mp4" || streamCodec == 'h264) {
		var h264Settings: H264VideoStreamSettings = new H264VideoStreamSettings();
		h264Settings.setProfileLevel(H264Profile.BASELINE, H264Level.LEVEL_3_1);
		stream.videoStreamSettings = h264Settings;
	}

	stream.attachCamera(camera);
	stream.attachAudio(microphone);
	stream.publish(StreamFileName, "record");


}

public function uploading_transferred(): Number {
	return uploading_initial_buffer_length - stream.bufferLength;
}


----

uploading_initial_buffer_length = stream.bufferLength;
if (stream) {
	stream.attachCamera(null);
	stream.attachAudio(null);
	stream.close();
	stream = null;
}
if (connection) {
	connection.close();
	connection = null;
}



*/