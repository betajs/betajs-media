```html

	<video></video>

```

```js

    var webrtc = BetaJS.Media.WebRTC.RecorderWrapper.create({
        video: $("video").get(0)
    });
    
```

```html

	<video autoplay loop poster="movie.png">
		<source src="movie.mp4" type="video/mp4" />
	</video>

```

```js

	BetaJS.Media.Player.FlashPlayer.polyfill($("video").get(0)).success(function (video) {
	});

```