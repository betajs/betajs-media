# betajs-media 0.0.19
[![Code Climate](https://codeclimate.com/github/betajs/betajs-media/badges/gpa.svg)](https://codeclimate.com/github/betajs/betajs-media)


BetaJS-Media is a JavaScript media framework



## Getting Started


You can use the library in the browser and compile it as well.

#### Browser

```javascript
	<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js"></script>
	<script src="betajs/dist/betajs.min.js"></script>
	<script src="betajs-browser/dist/betajs-browser.min.js"></script>
	<script src="betajs-flash/dist/betajs-flash.min.js"></script>
	<script src="betajs-media/dist/betajs-media.min.js"></script>
``` 

#### Compile

```javascript
	git clone https://github.com/betajs/betajs-media.git
	npm install
	grunt
```



## Basic Usage


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


## Links
| Resource   | URL |
| :--------- | --: |
| Homepage   | [http://betajs.com](http://betajs.com) |
| Git        | [git://github.com/betajs/betajs-media.git](git://github.com/betajs/betajs-media.git) |
| Repository | [http://github.com/betajs/betajs-media](http://github.com/betajs/betajs-media) |
| Blog       | [http://blog.betajs.com](http://blog.betajs.com) | 
| Twitter    | [http://twitter.com/thebetajs](http://twitter.com/thebetajs) | 



## Compatability
| Target | Versions |
| :----- | -------: |
| Firefox | 4 - Latest |
| Chrome | 15 - Latest |
| Safari | 4 - Latest |
| Opera | 12 - Latest |
| Internet Explorer | 8 - Latest |
| Edge | 12 - Latest |
| iOS | 7.0 - Latest |
| Android | 4.0 - Latest |


## CDN
| Resource | URL |
| :----- | -------: |
| betajs-media.js | [http://cdn.rawgit.com/betajs/betajs-media/master/dist/betajs-media.js](http://cdn.rawgit.com/betajs/betajs-media/master/dist/betajs-media.js) |
| betajs-media.min.js | [http://cdn.rawgit.com/betajs/betajs-media/master/dist/betajs-media.min.js](http://cdn.rawgit.com/betajs/betajs-media/master/dist/betajs-media.min.js) |
| betajs-media-noscoped.js | [http://cdn.rawgit.com/betajs/betajs-media/master/dist/betajs-media-noscoped.js](http://cdn.rawgit.com/betajs/betajs-media/master/dist/betajs-media-noscoped.js) |
| betajs-media-noscoped.min.js | [http://cdn.rawgit.com/betajs/betajs-media/master/dist/betajs-media-noscoped.min.js](http://cdn.rawgit.com/betajs/betajs-media/master/dist/betajs-media-noscoped.min.js) |


## Unit Tests
| Resource | URL |
| :----- | -------: |
| Test Suite | [Run](http://rawgit.com/betajs/betajs-media/master/tests/tests.html) |


## Dependencies
| Name | URL |
| :----- | -------: |
| betajs | [Open](https://github.com/betajs/betajs) |
| betajs-browser | [Open](https://github.com/betajs/betajs-browser) |
| betajs-flash | [Open](https://github.com/betajs/betajs-flash) |


## Weak Dependencies
| Name | URL |
| :----- | -------: |
| betajs-scoped | [Open](https://github.com/betajs/betajs-scoped) |


## Contributors

- Ziggeo
- Oliver Friedmann


## License

Apache-2.0


## Credits

This software may include modified and unmodified portions of:
- TypedArray, From microphone to .WAV with: getUserMedia and Web Audio, (c) Thibault Imbert
- Media Stream Recorder, https://github.com/streamproc/MediaStreamRecorder
- Whammy Recorder, https://github.com/antimatter15/whammy
