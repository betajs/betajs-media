The `WebRTC Recorder` abstraction is based on `MediaRecorder` on browsers that support it and manual encoding to `webm` on all others.

Given a `video` element in the DOM, it is initialized as follows:

```javascript
    var view = BetaJS.Media.WebRTC.RecorderWrapper.create({
        video: $("video").get(0)
    });
    view.on("bound", function (stream) {
    	view.startRecord();
    	...
    	view.stopRecord();
    });
    view.on("data", function (video_blob, audio_blob) {
    	// Handle data
    });
    view.bindMedia();
```