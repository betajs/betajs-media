Scoped.define("module:Flash.Support", [
    "base:Promise",
    "base:Timers.Timer",
    "base:Async",
    "base:Objs",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "browser:Info"
], function (Promise, Timer, Async, Objs, FlashClassRegistry, FlashEmbedding, Info) {
	return {
		
		flashCanConnect: function (url, timeout) {
			if (!Info.flash().installed())
				return Promise.error(false);
			var promise = Promise.create();
			var registry = new FlashClassRegistry();
			registry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
			var embedding = new FlashEmbedding(null, {
				registry: registry,
				wrap: true
			});
			embedding.ready(function () {
				var connection = embedding.newObject("flash.net.NetConnection");
				connection.addEventListener("netStatus", embedding.newCallback(function (event) {
					if (event.get("info") && event.get("info").code === "NetConnection.Connect.Success")
						promise.asyncSuccess(true);
					else
						promise.asyncError(false);
				}));
				connection.connectVoid(url);
			});
			var timer = null;
			if (timeout) {
				timer = new Timer({
					delay: timeout,
					once: true,
					start: true,
					fire: function () {
						promise.asyncError();
					}
				});
			}
			promise.callback(function () {
				if (timer)
					timer.destroy();
				Async.eventually(function () {
					embedding.destroy();
				});				
			});
			return promise;
		},
		
		enumerateMediaSources: function () {
			if (!Info.flash().installed())
				return Promise.error(false);
			var promise = Promise.create();
			var registry = new FlashClassRegistry();
			registry.register("flash.media.Microphone");
			registry.register("flash.media.Camera");
			var embedding = new FlashEmbedding(null, {
				registry: registry,
				wrap: true
			});
			embedding.ready(function () {
				var videos = embedding.getClass("flash.media.Camera").get("names");
				var audios = embedding.getClass("flash.media.Microphone").get("names");
				promise.asyncSuccess({
					videoCount: Objs.count(videos),
					audioCount: Objs.count(audios),
					video: Objs.map(videos, function (value, key) {
						return {
							id: key,
							label: value
						};
					}),
					audio: Objs.map(audios, function (value, key) {
						return {
							id: key,
							label: value
						};
					})
				});
			});
			promise.callback(function () {
				Async.eventually(function () {
					embedding.destroy();
				});				
			});
			return promise;
		}

	};
});




