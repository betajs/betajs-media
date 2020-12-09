The `VideoPlayerWrapper` class provides a completely uniform interface to all video playback systems:

```html
	<video>
	</video>
```

```javascript
    BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: "movie.png",
    	source: "movie.mp4"
    }).success(function (instance) {
		// instance.play();
        // instance.pause();
        // instance.enterFullscreen();
    }).error(function (error) {
    });
```