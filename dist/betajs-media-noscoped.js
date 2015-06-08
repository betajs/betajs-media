/*!
betajs-media - v0.0.1 - 2015-06-08
Copyright (c) Oliver Friedmann
MIT Software License.
*/
(function () {

var Scoped = this.subScope();

Scoped.binding("module", "global:BetaJS.Media");
Scoped.binding("base", "global:BetaJS");

Scoped.binding("jquery", "global:jQuery");

Scoped.define("module:", function () {
	return {
		guid: "8475efdb-dd7e-402e-9f50-36c76945a692",
		version: '8.1433781928579'
	};
});


Scoped.define("module:Player.Flash", [
    "base:Browser.Dom",
    "base:Async",
    "module:Player.FlashPlayer"
], function (Dom, Async, FlashPlayer) {
	return {
		
		polyfill: function (element, polyfilltag, force, eventual) {
			if (eventual) {
				Async.eventually(function () {
					this.polyfill(element, polyfilltag, force);
				}, this);
				return element; 
			}
			if (element.tagName.toLowerCase() != "video" || !("networkState" in element))
				return this.attach(element);
			else if (element.networkState == element.NETWORK_NO_SOURCE || force)
				return this.attach(Dom.changeTag(element, polyfilltag || "videopoly"));
			return element;
		},
		
		attach: function (element) {
			var cls = new FlashPlayer(element);
			return element;
		}

	};
});



Scoped.define("module:Player.FlashPlayer", [
    "base:Class",
    "base:Flash.FlashClassRegistry",
    "base:Flash.FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "jquery:"    
], function (Class, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, $, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (element) {
				inherited.constructor.call(this);
				this._element = element;
				this._$element = $(element);
				this._currentWidth = null;
				this._currentHeight = null;
				this.__initCss();
				this._source = this.__preferedSource();
				this._embedding = new FlashEmbedding(element, {
					registry: this.cls.flashRegistry(),
					wrap: true
				});
				this._flashObjs = {};
				this._flashData = {
					status: 'idle'
				};
				this._embedding.ready(this.__initializeEmbedding, this);
				this.__initEvents();
				Objs.iter(this.__elementMethods, function (func, key) {
					this._element[key] = Functions.as_method(func, this);
				}, this);
			},
			
			destroy: function () {
				$(window).off("." + this.cid());
				$(document).off("." + this.cid());
				this._embedding.destroy();
				inherited.destroy.call(this);
			},
			
			__initEvents: function () {
				var self = this;
				$(document).on("DOMNodeRemoved." + this.cid(), function (event) {
					if (event.target == self._element)
						self.weakDestroy();
				});
				$(window).on("resize", function () {
					self.updateSize();
				});
			},
			
			__initCss: function () {
				if (!this._$element.css("display") || this._$element.css("display") == "inline")
					this._$element.css("display", "inline-block");
			},
			
			__preferedSource: function () {
				var preferred = [".mp4", ".flv"];
				var sources = [];
				var element = this._element;
				for (var i = 0; i < this._element.childNodes.length; ++i) {
					if (element.childNodes[i].tagName && element.childNodes[i].tagName.toLowerCase() == "source" && element.childNodes[i].src)
						sources.push(element.childNodes[i].src.toLowerCase());
				}
				var source = sources[0];
				var currentExtIndex = preferred.length - 1;
				for (i = sources.length - 1; i >= 0; --i) {
					for (var j = 0; j <= currentExtIndex; ++j) {
						if (Strings.ends_with(sources[i], preferred[j])) {
							source = sources[i];
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
				this._flashObjs.video = this._embedding.newObject(
					"flash.media.Video",
					this._flashObjs.stage.get("stageWidth"),
					this._flashObjs.stage.get("stageHeight")
				);
				this._flashObjs.main.addChildVoid(this._flashObjs.video);
				this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
				this._flashObjs.connection.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__connectionStatusEvent, this)));
				this._flashObjs.connection.connectVoid(this._source.connectionUrl);
			},
			
			__connectionStatusEvent: function () {
				this._flashObjs.stream = this._embedding.newObject("flash.net.NetStream", this._flashObjs.connection);
				this._flashObjs.stream.set("client", this._embedding.newCallback("onMetaData", Functions.as_method(function (info) {
					this._flashData.meta = info;
					Async.eventually(this.updateSize, this);
				}, this)));
				this._flashObjs.stream.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(this.__streamStatusEvent, this)));
				this._flashObjs.video.attachNetStreamVoid(this._flashObjs.stream);
				if (this._element.attributes.autoplay)
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
				if (this._flashData.status == "stopped" && this._element.attributes.loop) {
					this._flashData.status = "idle";
					this._element.play();
				}
			},
			
			updateSize: function () {
				if (!this._flashData.meta)
					return;
				var $el = this._$element;
				var el = this._element;
				var meta = this._flashData.meta;
				
				var newWidth = $el.width();
				if ($el.width() < meta.width && !el.style.width) {
					element.style.width = meta.width + "px";
					newWidth = $el.width();
					delete element.style.width;
				}
				var newHeight = Math.round(newWidth * meta.height / meta.width);
				if (newWidth != this._currentWidth) {
					this._currentWidth = newWidth;
					this._currentHeight = newHeight;
					$el.find("object").css("width", this._currentWidth + "px");
					$el.find("embed").css("width", this._currentWidth + "px");
					$el.find("object").css("height", this._currentHeight + "px");
					$el.find("embed").css("height", this._currentHeight + "px");
					this._flashObjs.video.set("width", this._currentWidth);
					this._flashObjs.video.set("height", this._currentHeight);
				}
			},
			
			__elementMethods: {
				
				play: function () {
					if (this._flashData.status === "paused")
						this._flashObjs.stream.resumeVoid();
					else
						this._flashObjs.stream.playVoid(this._source.playUrl);
				},
				
				pause: function () {
					this._flashObjs.stream.pauseVoid();
					this._flashData.status = "paused";
				},
				
				load: function () {
					this._flashObjs.stream.pauseVoid();
					this._flashObjs.stream.set("seek", 0);
					this._flashData.status = "stopped";
				}			
			
			}			
		
		};		
	}, {
		
		flashRegistry: function () {
			if (!this.__flashRegistry) {
				this.__flashRegistry = new FlashClassRegistry();
				this.__flashRegistry.register("flash.media.Video", ["attachNetStream"]);
				this.__flashRegistry.register("flash.display.Sprite", ["addChild"]);
				this.__flashRegistry.register("flash.display.Stage", []);
				this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "stop", "addEventListener"]);
				this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
			}
			return this.__flashRegistry;
		}
		
	});
});


//TODO: poster, other

}).call(Scoped);