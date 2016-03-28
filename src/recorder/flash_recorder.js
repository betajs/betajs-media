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
				this.ready = Promise.create();
				this._embedding.ready(this.__initializeEmbedding, this);
			},
			
			__initializeEmbedding: function () {
				this._flashObjs.main = this._embedding.flashMain();
				this._flashObjs.stage = this._flashObjs.main.get("stage");
				this._flashObjs.stage.set("scaleMode", "noScale");
				this._flashObjs.stage.set("align", "TL");
				this._flashObjs.video = this._embedding.newObject(
					"flash.media.Video",
					this._flashObjs.stage.get("stageWidth"),
					this._flashObjs.stage.get("stageHeight")
				);
				this._flashObjs.Microphone = this._embedding.getClass("flash.media.Microphone");
				this._flashObjs.Camera = this._embedding.getClass("flash.media.Camera");
				this._flashObjs.microphone = this._flashObjs.Microphone.getMicrophone();
				this._flashObjs.camera = this._flashObjs.Camera.getCamera();
				this._flashObjs.Security = this._embedding.getClass("flash.system.Security");
				// TODO
				
				this.ready.asyncSuccess(this);
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
				this.__flashRegistry.register("flash.display.Sprite", ["addChild", "removeChild", "setChildIndex"]);
				this.__flashRegistry.register("flash.display.Stage", []);
				this.__flashRegistry.register("flash.display.Loader", ["load"]);
				this.__flashRegistry.register("flash.display.LoaderInfo", ["addEventListener"]);
				this.__flashRegistry.register("flash.display.BitmapData", ["draw", "getPixel", "dispose"]);
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