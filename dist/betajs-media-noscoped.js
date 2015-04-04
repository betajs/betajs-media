/*!
betajs-media - v0.0.1 - 2015-04-04
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
		version: '6.1428181200851'
	};
});


Scoped.define("module:Player.Flash", [
    "base:Flash.FlashClassRegistry",
    "base:Flash.FlashEmbedding",
    "base:Browser.Dom",
    "base:Strings",
    "base:Async",
    "base:Ids",
    "jquery:"
], function (FlashClassRegistry, FlashEmbedding, Dom, Strings, Async, Ids, $) {
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
		
		__flashRegistrySingleton: function () {
			if (!this.__flashRegistry) {
				this.__flashRegistry = new FlashClassRegistry();
				this.__flashRegistry.register("flash.media.Video", ["attachNetStream"]);
				this.__flashRegistry.register("flash.display.Sprite", ["addChild"]);
				this.__flashRegistry.register("flash.display.Stage", []);
				this.__flashRegistry.register("flash.net.NetStream", ["play", "addEventListener"]);
				this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
			}
			return this.__flashRegistry;
		},
		
		attach: function (element) {
			var event_id = Ids.uniqueId("flashembedding");
			
			var $element = $(element);
			if (!$element.css("display") || $element.css("display") == "inline")
				$element.css("display", "inline-block");
			var preferred = [".mp4", ".flv"];
			var sources = [];
			for (var i = 0; i < element.childNodes.length; ++i) {
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
			
			var embedding = new FlashEmbedding(element, {
				registry: this.__flashRegistrySingleton(),
				wrap: true
			});
			
			var main;
			var stage;
			var video;
			var connection;
			var stream;
			var meta;
			var currentWidth;
			var currentHeight;
			
			var updateSize = function () {
				if (!meta)
					return;
				var newWidth = $element.width();
				if ($element.width() < meta.width && !element.style.width) {
					element.style.width = meta.width + "px";
					newWidth = $element.width();
					delete element.style.width;
				}
				var newHeight = Math.round(newWidth * meta.height / meta.width);
				if (newWidth != currentWidth) {
					currentWidth = newWidth;
					currentHeight = newHeight;
					$element.find("object").css("width", currentWidth + "px");
					$element.find("embed").css("width", currentWidth + "px");
					$element.find("object").css("height", currentHeight + "px");
					$element.find("embed").css("height", currentHeight + "px");
					video.set("width", currentWidth);
					video.set("height", currentHeight);
				}
			};
			
			var status = "idle";
			
			embedding.ready(function () {
				main = embedding.flashMain();
				stage = main.get("stage");
				stage.set("scaleMode", "noScale");
				stage.set("align", "TL");
				video = embedding.newObject("flash.media.Video", stage.get("stageWidth"), stage.get("stageHeight"));
				main.addChildVoid(video);
				connection = embedding.newObject("flash.net.NetConnection");
				
				connection.addEventListener("netStatus", embedding.newCallback(function () {
					stream = embedding.newObject("flash.net.NetStream", connection);
					stream.set("client", embedding.newCallback("onMetaData", function (info) {
						meta = info;
						Async.eventually(updateSize);
					}));
					stream.addEventListener("netStatus", embedding.newCallback(function (event) {
						var code = event.get("info").code;
						if (code == "NetStream.Play.Start")
							status = "start";
						if (code == "NetStream.Play.Stop")
							status = "stopping";
						if (code == "NetStream.Buffer.Empty" && status == "stopping")
							status = "stopped";
						if (status == "stopped" && element.attributes.loop) {
							status = "idle";
							element.play();
						}
					}));
					video.attachNetStreamVoid(stream);
					if (element.attributes.autoplay)
						element.play();
				}));
				connection.connectVoid(connectionUrl);
			});

			element.play = function () {
				stream.playVoid(playUrl);
			};
			
			var destroy = function () {
				$(window).off("." + event_id);
				$(document).off("." + event_id);
			};
						
			$(document).on("DOMNodeRemoved", function (event) {
				if (event.target == element)
					destroy();
			});
			
			$(window).on("resize", updateSize);
			// TODO: refactor, poster, other

		}

	};
});

}).call(Scoped);