mytest("test flash playback mp4", function() {
	$("#visible-fixture").html('<video src="' + testasset("movie.mp4") + '"></video>');
	BetaJS.Media.Player.FlashPlayer.polyfill($("video").get(0), "videopoly", true, true);
	setTimeout(function () {
		QUnit.equal(Math.max($("object").length, $("embed").length), 1);
		start();
	}, 0);
}, {flash: true});


mytest("wrapper native video and poster", function () {
	$("#visible-fixture").html('<video></video>');
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
    	var playing = false;
    	instance.on("playing", function () {
    		if (playing)
    			return;
    		playing = true;
    		ok(true);
    		start();
    	});
        instance.on("error", function (error) {
        	ok(false);
        	start();
        });
        QUnit.launcher(instance.play, instance);
        if (instance.error()) {
        	ok(false);
        	start();
        }        	
    }).error(function () {
    	ok(false);
    	start();
    });
}, {native_video: true, selenium_if_mobile: true});


mytest("wrapper flash video and poster", function () {
	$("#visible-fixture").html('<video></video>');
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
    		setTimeout(function () {
        		instance.destroy();
    		}, 1);
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
}, {flash: true});


mytest("wrapper native no video but poster", function () {
	$("#visible-fixture").html('<video></video>');
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
    		setTimeout(function () {
        		instance.destroy();
    		}, 1);
        	start();
        });
        QUnit.launcher(instance.play, instance);
        if (instance.error()) {
        	ok(true);
        	start();
        }        	
    }).error(function () {
    	ok(true);
    	start();
    });
}, {native_video: true});


mytest("wrapper flash no video but poster", function () {
	$("#visible-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("movie.png"),
    	source: testasset("error.flv")
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(false);
    		start();
    	});
        instance.on("error", function (error) {
        	ok(true);
    		setTimeout(function () {
        		instance.destroy();
    		}, 1);
        	start();
        });
    	instance.play();
        if (instance.error()) {
        	ok(true);
    		setTimeout(function () {
        		instance.destroy();
    		}, 1);
        	start();
        }        	
    }).error(function () {
    	ok(true);
    	start();
    });
}, {flash: true});


mytest("wrapper fallback video and poster", function () {
	$("#visible-fixture").html('<video></video>');
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
    		setTimeout(function () {
	    		instance.destroy();
    		}, 10);
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
}, {flash: true});


mytest("wrapper native video but no poster", function () {
	$("#visible-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("error.png"),
    	source: testasset("movie.mp4"),
    	noflash: true
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(true);
    		setTimeout(function () {
        		instance.destroy();
    		}, 1);
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
}, {native_video: true});


mytest("wrapper flash video but no poster", function () {
	$("#visible-fixture").html('<video></video>');
	BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: testasset("error.png"),
    	source: testasset("movie.mp4"),
    	forceflash: true
    }).success(function (instance) {
    	instance.on("postererror", function () {
    		ok(true);
    		setTimeout(function () {
        		instance.destroy();
    		}, 1);
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
}, {flash: true});
