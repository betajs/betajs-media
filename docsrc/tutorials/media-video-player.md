Polyfilling with Flash helps to make videos play across more browser, but the access to the native video element
is not ideal and also not reliable in terms of emitted events and behaviour.

The `VideoPlayerWrapper` class provides a completely uniform interface to all video playback systems:

```html
	<video>
	</video>
```

```javascript
    BetaJS.Media.Player.VideoPlayerWrapper.create({
    	element: $("video").get(0),
    	poster: "movie.png",
    	source: "movie.mp4",
    	//forceflash: true
    }).success(function (instance) {
		// instance.play();
        // instance.pause();
        // instance.enterFullscreen();
    }).error(function (error) {
    });
```