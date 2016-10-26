Scoped.define("module:WebRTC.MediaRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Functions",
    "browser:Info",
    "module:WebRTC.Support"
], function (Class, EventsMixin, Functions, Info, Support, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (stream) {
				inherited.constructor.call(this);
				this._stream = stream;
				this._started = false;
				var MediaRecorder = Support.globals().MediaRecorder;
				/*
				 * This is supposed to work according to the docs, but it is not:
				 * 
				 * https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder#Example
				 */
				/*
				var mediaRecorderOptions = {};
				mediaRecorderOptions.mimeType = "video/mp4";
				if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
				  options = {mimeType: 'video/webm, codecs=vp9'};
				} else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
				   options = {mimeType: 'video/webm, codecs=vp8'};
				} else {
				  // ...
				}
				this._mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
				*/
				this._mediaRecorder = new MediaRecorder(stream);
				this._mediaRecorder.ondataavailable = Functions.as_method(this._dataAvailable, this);
				this._mediaRecorder.onstop = Functions.as_method(this._dataStop, this);
			},
			
			destroy: function () {
				this.stop();
				inherited.destroy.call(this);
			},
			
			start: function () {
				if (this._started)
					return;
				this._started = true;
				this._chunks = [];
				this._mediaRecorder.start();
				this.trigger("started");
			},
			
			stop: function () {
				if (!this._started)
					return;
				this._started = false;
				this._mediaRecorder.stop();
				this.trigger("stopped");
			},
			
			_dataAvailable: function (e) {
				this._chunks.push(e.data);
			},

			_dataStop: function (e) {
				this._data = new Blob(this._chunks, { type: "video/webm" });
				this._chunks = [];
				if (Info.isFirefox()) {
					var self = this;
					var fileReader = new FileReader();
					fileReader.onload = function() {
					    self._data = new Blob([this.result], {type: self._data.type});
						self.trigger("data", self._data);
					};
					fileReader.readAsArrayBuffer(this._data);
				} else
					this.trigger("data", this._data);
			}
						
		};		
	}], {
		
		supported: function () {
			return !!Support.globals().MediaRecorder && !Info.isChrome() && !Info.isOpera();
		}
		
	});
});
		
