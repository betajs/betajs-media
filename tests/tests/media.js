test("test playback mp4", function() {
	stop();
	$("#qunit-fixture").html('<video><source src="' + document.location + "/../tests/movie.mp4" + '" type="video/mp4" /></video>');
	BetaJS.Flash.options = {
		flashFile: window.BrowserStack ? "//files.betajs.com/betajs-flash.swf" : "../vendors/betajs-flash.swf",
		forceReload: true
	};
	BetaJS.Media.Player.Flash.polyfill($("video").get(0), "videopoly", true, true);
	setTimeout(function () {
		QUnit.equal($("embed").length, 1);
		start();
	}, 0);
});