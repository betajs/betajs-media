var testasset = function (s) {
	return BetaJS.Strings.splitLast(document.location.href, "/").head + "/tests/" + s;
};

test("test playback mp4", function() {
	stop();
	$("#qunit-fixture").html('<video><source src="' + testasset("movie.mp4") + '" type="video/mp4" /></video>');
	BetaJS.Media.Player.FlashPlayer.polyfill($("video").get(0), "videopoly", true, true);
	setTimeout(function () {
		QUnit.equal($("embed").length, 1);
		start();
	}, 0);
});


test("wrapper native video and poster", function () {
	stop();
	$("#qunit-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("movie.png"),
    	source: testasset("movie.mp4"),
    	noflash: true
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(false);
    		start();
    	});
    	instance.on("playing", function () {
    		ok(true);
    		start();
    	});
        instance.on("error", function (error) {
        	ok(false);
        	start();
        });
    	instance.play();
        if (instance.error()) {
        	ok(false);
        	start();
        }        	
    }).error(function () {
    	ok(false);
    	start();
    });
});


test("wrapper flash video and poster", function () {
	stop();
	$("#qunit-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("movie.png"),
    	source: testasset("movie.mp4"),
    	forceflash: true
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(false);
    		start();
    	});
    	instance.on("playing", function () {
    		ok(true);
    		start();
    	});
        instance.on("error", function (error) {
        	ok(false);
        	start();
        });
    	instance.play();
        if (instance.error()) {
        	ok(false);
        	start();
        }        	
    }).error(function () {
    	ok(false);
    	start();
    });
});


test("wrapper native no video but poster", function () {
	stop();
	$("#qunit-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("movie.png"),
    	source: testasset("movie.flv"),
    	noflash: true
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(false);
    		start();
    	});
    	instance.on("playing", function () {
    		ok(false);
    		start();
    	});
        instance.on("error", function (error) {
        	ok(true);
        	start();
        });
    	instance.play();
        if (instance.error()) {
        	ok(true);
        	start();
        }        	
    }).error(function () {
    	ok(true);
    	start();
    });
});


test("wrapper flash no video but poster", function () {
	stop();
	$("#qunit-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("movie.png"),
    	source: testasset("error.flv"),
    	noflash: true
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(false);
    		start();
    	});
    	instance.on("playing", function () {
    		ok(false);
    		start();
    	});
        instance.on("error", function (error) {
        	ok(true);
        	start();
        });
    	instance.play();
        if (instance.error()) {
        	ok(true);
        	start();
        }        	
    }).error(function () {
    	ok(true);
    	start();
    });
});


test("wrapper fallback video and poster", function () {
	stop();
	$("#qunit-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("movie.png"),
    	source: testasset("movie.flv")
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(false);
    		start();
    	});
    	instance.on("playing", function () {
    		ok(true);
    		start();
    	});
        instance.on("error", function (error) {
        	ok(false);
        	start();
        });
    	instance.play();
        if (instance.error()) {
        	ok(false);
        	start();
        }        	
    }).error(function () {
    	ok(false);
    	start();
    });
});


test("wrapper native video but no poster", function () {
	stop();
	$("#qunit-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("error.png"),
    	source: testasset("movie.mp4"),
    	noflash: true
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(true);
    		start();
    	});
        instance.on("error", function (error) {
        	ok(false);
        	start();
        });
        if (instance.error()) {
        	ok(false);
        	start();
        }        	
    }).error(function () {
    	ok(false);
    	start();
    });
});


test("wrapper flash video but no poster", function () {
	stop();
	$("#qunit-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("error.png"),
    	source: testasset("movie.mp4"),
    	forceflash: true
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(true);
    		start();
    	});
        instance.on("error", function (error) {
        	ok(false);
        	start();
        });
        if (instance.error()) {
        	ok(false);
        	start();
        }        	
    }).error(function () {
    	ok(false);
    	start();
    });
});
