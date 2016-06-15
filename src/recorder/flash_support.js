Scoped.define("module:Flash.Support", [
    "base:Promise",
    "base:Timers.Timer",
    "base:Async",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding"
], function (Promise, Timer, Async, FlashClassRegistry, FlashEmbedding) {
	return {
		
		flashCanConnect: function (url, timeout) {
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
		}
		
	};
});




