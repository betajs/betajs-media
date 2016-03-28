The `Flash Player` component allows you to either polyfill an existing video element if necessary or to directly embed
a Flash polyfill into the DOM.

For polyfilling a video element, the polyfill call is invoked as follows:

```html
	<video autoplay loop poster="movie.png" style="width:50%" muted>
		<source src="movie.mp4" type="video/mp4" />
	</video>
```

```javascript
	BetaJS.Media.Player.FlashPlayer.polyfill($("video").get(0)).success(function (video) {
		// video has been successfully polyfilled or kept they way it was if possible
	});
```

You can even impose styles and typical attributes on the video element.

The Flash polyfill also allows you to use typical Flash protocols like `RTMP`:

```html
	<video poster="movie.png">
		<source src="rtmp://localhost:1935/vod/video.flv" type="video/flv" />
	</video>
```

Instead of polyfilling an element, you can also explicitly embed the player:

```html
   <div id='element'>
   </div>
```

```javascript
	var player = BetaJS.Media.Player.FlashPlayer.attach($("#element").get(0), {
		autoplay : true,
		loop : true,
		muted: true,
		poster : "movie.png",
		sources: [{src: "movie.mp4"}]
	});
```

The `player` object itself understands the typical `video`-element methods and emits the typical dom events as well.


