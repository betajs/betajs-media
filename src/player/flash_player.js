Scoped.define("module:Player.FlashPlayer", [
    "base:Browser.DomExtend.DomExtension",
	"base:Browser.Dom",
	"base:Browser.Info",
    "base:Flash.FlashClassRegistry",
    "base:Flash.FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "base:Types",
    "jquery:"    
], function (Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, $, scoped) {
	var Cls = Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (element, attrs) {
				inherited.constructor.call(this, element, attrs);
				this._source = this.__preferedSource();
				this._embedding = this.auto_destroy(new FlashEmbedding(element, {
					registry: this.cls.flashRegistry(),
					wrap: true,
					debug: false
				}));
				this._flashObjs = {};
				this._flashData = {
					status: 'idle'
				};
				this._embedding.ready(this.__initializeEmbedding, this);
			},
			
			__preferedSource: function () {
				var preferred = [".mp4", ".flv"];
				var sources = [];
				if (this.readAttr("src")) {
					var src = this.readAttr("src");
					if (Types.is_array(src))
						sources = src;
					else
						sources.push(src);
				}
				var element = this._element;
				if (!(Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)) {
					for (var i = 0; i < this._element.childNodes.length; ++i) {
						if (element.childNodes[i].tagName && element.childNodes[i].tagName.toLowerCase() == "source" && element.childNodes[i].src)
							sources.push(element.childNodes[i].src.toLowerCase());
					}
				} else {
					var $current = this._$element;
					while (true) {
						var $next = $current.next();
						var next = $next.get(0);
						if (!next || next.tagName.toLowerCase() != "source") 
							break;
						sources.push($next.attr("src").toLowerCase());
						$current = $next;
					}
				}
				var source = sources[0];
				var currentExtIndex = preferred.length - 1;
				for (var k = sources.length - 1; k >= 0; --k) {
					for (var j = 0; j <= currentExtIndex; ++j) {
						if (Strings.ends_with(sources[k], preferred[j])) {
							source = sources[k];
							currentExtIndex = j;
							break;
						}
					}
				}
				if (source.indexOf("://") == -1)
					source = document.location.href + "/../" + source;
				
				var connectionUrl = null;
				var playUrl = source;
				if (Strings.starts_with(source, "rtmp")) {
					var spl = Strings.splitLast(source, "/");
					connectionUrl = spl.head;
					playUrl = spl.tail;
				}
				return {
					sourceUrl: source,
					connectionUrl: connectionUrl,
					playUrl: playUrl
				};
			},
			
			__initializeEmbedding: function () {
				this._flashObjs.main = this._embedding.flashMain();
				this._flashObjs.stage = this._flashObjs.main.get("stage");
				this._flashObjs.stage.set("scaleMode", "noScale");
				this._flashObjs.stage.set("align", "TL");
				
				if (this.readAttr("poster")) {
					this._flashObjs.imageLoader = this._embedding.newObject("flash.display.Loader");
					this._flashObjs.imageLoader.get("contentLoaderInfo").addEventListener("complete", this._embedding.newCallback(Functions.as_method(function () {
						this.__imageLoaded = true;
						if (!this.__metaLoaded)
							this.recomputeBB();
					}, this)));
					this._flashObjs.imageUrlRequest = this._embedding.newObject("flash.net.URLRequest", this.readAttr("poster"));
					this._flashObjs.imageLoader.load(this._flashObjs.imageUrlRequest);
					this._flashObjs.main.addChildVoid(this._flashObjs.imageLoader);
				}
				this._flashObjs.video = this._embedding.newObject(
					"flash.media.Video",
					this._flashObjs.stage.get("stageWidth"),
					this._flashObjs.stage.get("stageHeight")
				);
				this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
				this._flashObjs.connection.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__connectionStatusEvent, this)));
				this._flashObjs.connection.connectVoid(this._source.connectionUrl);
			},
			
			__connectionStatusEvent: function () {
				this._flashObjs.stream = this._embedding.newObject("flash.net.NetStream", this._flashObjs.connection);
				this._flashObjs.stream.set("client", this._embedding.newCallback("onMetaData", Functions.as_method(function (info) {
					this._flashData.meta = info;
					this._element.duration = info.duration;
					this.__metaLoaded = true;
					Async.eventually(this.recomputeBB, this);
				}, this)));
				this._flashObjs.stream.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__streamStatusEvent, this)));
				this._flashObjs.soundTransform = this._embedding.newObject("flash.media.SoundTransform");
				this._flashObjs.stream.set("soundTransform", this._flashObjs.soundTransform);				
				this._flashObjs.video.attachNetStreamVoid(this._flashObjs.stream);
				this.writeAttr("volume", 1.0);
				if (this.readAttr("muted")) {
					this._flashObjs.soundTransform.set("volume", 0.0);
					this._flashObjs.stream.set("soundTransform", null);				
					this._flashObjs.stream.set("soundTransform", this._flashObjs.soundTransform);
					this.writeAttr("volume", 0.0);
				}
				this._flashObjs.main.addChildVoid(this._flashObjs.video);
				if (this.readAttr("autoplay"))
					this._element.play();
			},
			
			__streamStatusEvent: function (event) {
				var code = event.get("info").code;
				if (code == "NetStream.Play.Start")
					this._flashData.status = "start";
				if (code == "NetStream.Play.Stop")
					this._flashData.status = "stopping";
				if (code == "NetStream.Buffer.Empty" && this._flashData.status == "stopping")
					this._flashData.status = "stopped";
				if (this._flashData.status == "stopped" && this.readAttr("loop")) {
					this._flashData.status = "idle";
					this._element.play();
				}
			},
			
			idealBB: function () {
				if (!this.__imageLoaded && !this.__metaLoaded)
					return null;
				return {
					width: this.__metaLoaded ? this._flashData.meta.width : this._flashObjs.imageLoader.get("width"),
					height: this.__metaLoaded ? this._flashData.meta.height : this._flashObjs.imageLoader.get("height")
				};
			},
			
			setActualBB: function (actualBB) {
				this._$element.find("object").css("width", actualBB.width + "px");
				this._$element.find("embed").css("width", actualBB.width + "px");
				this._$element.find("object").css("height", actualBB.height + "px");
				this._$element.find("embed").css("height", actualBB.height + "px");
				if (this.__metaLoaded) {
					this._flashObjs.video.set("width", actualBB.width);
					this._flashObjs.video.set("height", actualBB.height);
				}
				if (this.__imageLoaded) {
					this._flashObjs.imageLoader.set("width", actualBB.width);
					this._flashObjs.imageLoader.set("height", actualBB.height);
				}
			},
			
			_domMethods: ["play", "pause"],
			
			_domAttrs: {
				"volume": {
					set: "_setVolume"
				},
				"currentTime": {
					get: "_getCurrentTime",
					set: "_setCurrentTime"
				}				
			},
			
			play: function () {
				this._flashObjs.main.setChildIndex(this._flashObjs.video, 1);
				if (this._flashData.status === "paused")
					this._flashObjs.stream.resumeVoid();
				else
					this._flashObjs.stream.playVoid(this._source.playUrl);
			},
			
			pause: function () {
				this._flashObjs.stream.pauseVoid();
				this._flashData.status = "paused";
			},
			
			_setVolume: function (volume) {
				this._flashObjs.soundTransform.set("volume", volume);
				this._flashObjs.stream.set("soundTransform", null);				
				this._flashObjs.stream.set("soundTransform", this._flashObjs.soundTransform);
				this.domEvent("volumechange");
			},
			
			_getCurrentTime: function () {
				return this._flashObjs.stream.get("time");
			},
			
			_setCurrentTime: function (time) {
				this._flashObjs.stream.seek(time);
			}
		
		};		
	}, {
		
		flashRegistry: function () {
			if (!this.__flashRegistry) {
				this.__flashRegistry = new FlashClassRegistry();
				this.__flashRegistry.register("flash.media.Video", ["attachNetStream"]);
				this.__flashRegistry.register("flash.display.Sprite", ["addChild", "setChildIndex"]);
				this.__flashRegistry.register("flash.display.Stage", []);
				this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener", "seek"]);
				this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
				this.__flashRegistry.register("flash.media.SoundTransform", []);
				this.__flashRegistry.register("flash.display.Loader", ["load"]);
				this.__flashRegistry.register("flash.net.URLRequest", []);
				this.__flashRegistry.register("flash.display.LoaderInfo", ["addEventListener"]);
			}
			return this.__flashRegistry;
		},
		
		polyfill: function (element, polyfilltag, force, eventual) {
			if (eventual) {
				Async.eventually(function () {
					Cls.polyfill(element, polyfilltag, force);
				});
				return element; 
			}
			if (element.tagName.toLowerCase() != "video" || !("networkState" in element))
				return Cls.attach(element);
			else if (element.networkState == element.NETWORK_NO_SOURCE || force)
				return Cls.attach(Dom.changeTag(element, polyfilltag || "videopoly"));
			return element;
		},
		
		attach: function (element, attrs) {
			var cls = new Cls(element, attrs);
			return element;
		}
		
		
	});
	return Cls;
});