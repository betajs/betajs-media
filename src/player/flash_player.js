
Scoped.define("module:Player.Flash", [
    "base:Flash.FlashClassRegistry",
    "base:Flash.Helper",
    "base:Flash.FlashEmbedding",
    "base:Browser.Dom",
    "base:Strings",
    "jquery:"
], function (FlashClassRegistry, FlashHelper, FlashEmbedding, Dom, Strings, $) {
	return {
		
		polyfill: function (element, polyfilltag, force) {
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
				this.__flashRegistry.register("flash.net.NetStream", ["play"]);
				this.__flashRegistry.register("flash.net.NetConnection", ["connect"]);
			}
			return this.__flashRegistry;
		},
		
		attach: function (element) {
			var preferred = [".mp4", ".flv"];
			var sources = [];
			for (var i = 0; i < element.childNodes.length; ++i)
				if (element.childNodes[i].tagName && element.childNodes[i].tagName.toLowerCase() == "source" && element.childNodes[i].src)
					sources.push(element.childNodes[i].src.toLowerCase());
			var source = sources[0];
			var currentExtIndex = preferred.length - 1;
			for (var i = sources.length - 1; i >= 0; --i) {
				for (var j = 0; j <= currentExtIndex; ++j)
					if (Strings.ends_with(sources[i], preferred[j])) {
						source = sources[i];
						currentExtIndex = j;
						break;
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
			
			$(element).html(FlashHelper.embedTemplate());
			
			var embedding = new FlashEmbedding($(element).find("embed").get(0), {
				registry: this.__flashRegistrySingleton(),
				wrap: true
			});
			
			var stream;
			
			embedding.ready(function () {
				var main = embedding.flashMain();
				var stage = main.get("stage");
				stage.set("scaleMode", "noScale");
				stage.set("align", "TL");
				var video = embedding.newObject("flash.media.Video", stage.get("stageWidth"), stage.get("stageHeight"));
				main.addChildVoid(video);
				var connection = embedding.newObject("flash.net.NetConnection");
				connection.addEventListener("netStatus", function () {
					stream = embedding.newObject("flash.net.NetStream", connection);
					video.attachNetStreamVoid(stream);
					if (element.attributes.autoplay)
						element.play();
				});
				connection.connectVoid(connectionUrl);
			});

			element.play = function () {
				stream.playVoid(playUrl);
			};
			
			// TODO: size, poster, other

		}

	};
});
