# betajs-media 0.0.143
[![Code Climate](https://codeclimate.com/github/betajs/betajs-media/badges/gpa.svg)](https://codeclimate.com/github/betajs/betajs-media)
[![NPM](https://img.shields.io/npm/v/betajs-media.svg?style=flat)](https://www.npmjs.com/package/betajs-media)
[![Gitter Chat](https://badges.gitter.im/betajs/betajs-media.svg)](https://gitter.im/betajs/betajs-media)

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
| Homepage   | [https://betajs.com](https://betajs.com) |
| Git        | [git://github.com/betajs/betajs-media.git](git://github.com/betajs/betajs-media.git) |
| Repository | [https://github.com/betajs/betajs-media](https://github.com/betajs/betajs-media) |
| Blog       | [https://blog.betajs.com](https://blog.betajs.com) | 
| Twitter    | [https://twitter.com/thebetajs](https://twitter.com/thebetajs) | 
| Gitter     | [https://gitter.im/betajs/betajs-media](https://gitter.im/betajs/betajs-media) | 



## Compatability
| Target | Versions |
| :----- | -------: |
| Firefox | 32 - Latest |
| Chrome | 18 - Latest |
| Safari | 4 - Latest |
| Opera | 25 - Latest |
| Internet Explorer | 8 - Latest |
| Edge | 12 - Latest |
| iOS | 4.0 - Latest |
| Android | 2.3 - Latest |


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
| betajs-shims | [Open](https://github.com/betajs/betajs-shims) |


## Main Contributors

- Ziggeo
- Oliver Friedmann
- Rashad Aliyev

## License

Apache-2.0


## Credits

This software may include modified and unmodified portions of:
- TypedArray, From microphone to .WAV with: getUserMedia and Web Audio, (c) Thibault Imbert
- Media Stream Recorder, https://github.com/streamproc/MediaStreamRecorder
- Whammy Recorder, https://github.com/antimatter15/whammy




## Sponsors

- Ziggeo
- Browserstack


