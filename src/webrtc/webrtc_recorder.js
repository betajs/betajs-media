Scoped.define("module:WebRTC.RecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "module:WebRTC.Support",
    "base:Time",
    "module:Recorder.PixelSampleMixin"
], function(ConditionalInstance, EventsMixin, Objs, Support, Time, PixelSampleMixin, scoped) {
    return ConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, PixelSampleMixin, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                this._video = options.video;
                this._recording = false;
                this._bound = false;
                this._hasAudio = false;
                this._hasVideo = false;
                this._flip = !!options.flip;
            },

            _getConstraints: function() {
                return {
                    audio: this._options.recordAudio ? {
                        sourceId: this._options.audioId
                    } : false,
                    video: this._options.recordVideo ? {
                        /*
                        mandatory: {
                        	minWidth: this._options.recordResolution.width,
                        	maxWidth: this._options.recordResolution.width,
                        	minHeight: this._options.recordResolution.height,
                        	maxHeight: this._options.recordResolution.height
                        }
                        */
                        sourceId: this._options.videoId,
                        width: this._options.recordResolution.width,
                        height: this._options.recordResolution.height
                    } : false
                };
            },

            stream: function() {
                return this._stream;
            },

            bindMedia: function() {
                if (this._bound)
                    return;
                return Support.userMedia2(this._getConstraints()).success(function(stream) {
                    // console.log('before', stream);
                    // if(this._options.onlyaudio)
                    //   stream = this._options.canvas.captureStream();
                    // console.log('after', stream);
                    this._hasAudio = this._options.recordAudio && stream.getAudioTracks().length > 0;
                    this._hasVideo = this._options.recordVideo && stream.getVideoTracks().length > 0;
                    this._bound = true;
                    this._stream = stream;
                    Support.bindStreamToVideo(stream, this._video, this._flip);
                    this.trigger("bound", stream);
                    this._boundMedia();
                }, this);
            },

            selectCamera: function(cameraId) {
                this._options.videoId = cameraId;
                if (this._bound) {
                    this.unbindMedia();
                    this.bindMedia();
                }
            },

            selectMicrophone: function(microphoneId) {
                this._options.audioId = microphoneId;
                if (this._bound) {
                    this.unbindMedia();
                    this.bindMedia();
                }
            },

            startRecord: function(options) {
                if (this._recording)
                    return;
                this._recording = true;
                this._startRecord(options);
                this._startTime = Time.now();
            },

            stopRecord: function() {
                if (!this._recording)
                    return;
                this._recording = false;
                this._stopRecord();
                this._stopTime = Time.now();
            },

            duration: function() {
                return (this._recording || !this._stopTime ? Time.now() : this._stopTime) - this._startTime;
            },

            unbindMedia: function() {
                if (!this._bound || this._recording)
                    return;
                Support.stopUserMediaStream(this._stream);
                this._bound = false;
                this.trigger("unbound");
                this._unboundMedia();
            },

            createSnapshot: function(type) {
                return Support.dataURItoBlob(this._createSnapshot(type));
            },

            _createSnapshot: function(type) {
                var canvas = document.createElement('canvas');
                canvas.width = this._video.videoWidth || this._video.clientWidth;
                canvas.height = this._video.videoHeight || this._video.clientHeight;
                var context = canvas.getContext('2d');
                context.drawImage(this._video, 0, 0, canvas.width, canvas.height);
                var data = canvas.toDataURL(type);
                return data;
            },

            _pixelSample: function(samples, callback, context) {
                samples = samples || 100;
                var canvas = document.createElement('canvas');
                var w = this._video.videoWidth || this._video.clientWidth;
                var h = this._video.videoHeight || this._video.clientHeight;
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(this._video, 0, 0, w, h);
                var multiple = 2;
                while (samples > 0) {
                    for (var i = 1; i < multiple; ++i) {
                        for (var j = 1; j < multiple; ++j) {
                            var data = ctx.getImageData(Math.floor(i * w / multiple), Math.floor(j * h / multiple), 1, 1).data;
                            callback.call(context || this, data[0], data[1], data[2]);
                            --samples;
                            if (samples <= 0)
                                break;
                        }
                        if (samples <= 0)
                            break;
                    }
                    ++multiple;
                }
            },

            _boundMedia: function() {},

            _unboundMedia: function() {},

            _startRecord: function(options) {},

            _stopRecord: function() {},

            _error: function(errorType, errorData) {
                this.trigger("error", errorType, errorData);
            },

            getVolumeGain: function() {},

            setVolumeGain: function(volumeGain) {},

            _dataAvailable: function(videoBlob, audioBlob) {
                if (this.destroyed())
                    return;
                this.trigger("data", videoBlob, audioBlob);
            },

            destroy: function() {
                this.stopRecord();
                this.unbindMedia();
                inherited.destroy.call(this);
            },

            averageFrameRate: function() {
                return null;
            }

        };
    }], {

        _initializeOptions: function(options) {
            return Objs.extend({
                // video: null,
                recordAudio: true,
                recordVideo: true,
                recordResolution: {
                    width: 320,
                    height: 200
                }
            }, options);
        },

        supported: function(options) {
            return !!Support.globals().getUserMedia && !!Support.globals().URL;
        }

    });
});


Scoped.define("module:WebRTC.PeerRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.PeerRecorder"
], function(RecorderWrapper, PeerRecorder, scoped) {
    return RecorderWrapper.extend({
        scoped: scoped
    }, {

        _boundMedia: function() {
            this._recorder = new PeerRecorder(this._stream, {
                videoBitrate: this._options.videoBitrate,
                audioBitrate: this._options.audioBitrate
            });
            this._recorder.on("error", this._error, this);
        },

        _unboundMedia: function() {
            this._recorder.destroy();
        },

        _startRecord: function(options) {
            this._recorder.start(options.webrtcStreaming);
        },

        _stopRecord: function() {
            this._recorder.stop();
            this._dataAvailable();
        },

        getVolumeGain: function() {},

        setVolumeGain: function(volumeGain) {},

        averageFrameRate: function() {
            return null;
        }

    }, function(inherited) {
        return {

            supported: function(options) {
                if (!inherited.supported.call(this, options))
                    return false;
                return options.webrtcStreaming && PeerRecorder.supported();
            }

        };
    });
});


Scoped.define("module:WebRTC.MediaRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.MediaRecorder"
], function(RecorderWrapper, MediaRecorder, scoped) {
    return RecorderWrapper.extend({
        scoped: scoped
    }, {

        _boundMedia: function() {
            this._recorder = new MediaRecorder(this._stream, {
                videoBitrate: this._options.videoBitrate,
                audioBitrate: this._options.audioBitrate
            });
            this._recorder.on("data", function(blob) {
                this._dataAvailable(blob);
            }, this);
        },

        _unboundMedia: function() {
            this._recorder.destroy();
        },

        _startRecord: function() {
            this._recorder.start();
        },

        _stopRecord: function() {
            this._recorder.stop();
        },

        getVolumeGain: function() {},

        setVolumeGain: function(volumeGain) {},

        averageFrameRate: function() {
            return null;
        }

    }, function(inherited) {
        return {

            supported: function(options) {
                if (!inherited.supported.call(this, options))
                    return false;
                return MediaRecorder.supported();
            }

        };
    });
});


Scoped.define("module:WebRTC.WhammyAudioRecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.AudioRecorder",
    "module:WebRTC.WhammyRecorder",
    "browser:Info"
], function(RecorderWrapper, AudioRecorder, WhammyRecorder, Info, scoped) {
    return RecorderWrapper.extend({
        scoped: scoped
    }, {
        /*
        		_getConstraints: function () {
        			return {
        				audio: this._options.recordAudio,
        				video: this._options.recordVideo
        			}
        		},
        */
        _createSnapshot: function(type) {
            return this._whammyRecorder.createSnapshot(type);
        },

        _boundMedia: function() {
            this._videoBlob = null;
            this._audioBlob = null;
            if (this._hasVideo) {
                this._whammyRecorder = new WhammyRecorder(this._stream, {
                    //recorderWidth: this._options.recordResolution.width,
                    //recorderHeight: this._options.recordResolution.height,
                    video: this._video,
                    framerate: this._options.framerate
                });
            }
            if (this._hasAudio) {
                this._audioRecorder = new AudioRecorder(this._stream);
                this._audioRecorder.on("data", function(blob) {
                    this._audioBlob = blob;
                    if (this._videoBlob || !this._hasVideo)
                        this._dataAvailable(this._videoBlob, this._audioBlob);
                }, this);
            }
            if (this._hasVideo) {
                this._whammyRecorder.on("data", function(blob) {
                    this._videoBlob = blob;
                    if (this._audioBlob || !this._hasAudio)
                        this._dataAvailable(this._videoBlob, this._audioBlob);
                }, this);
            }
            /*
            this._whammyRecorder.on("onStartedDrawingNonBlankFrames", function () {
            	if (this._recording)
            		this._audioRecorder.start();
            }, this);
            */
        },

        _unboundMedia: function() {
            if (this._hasAudio)
                this._audioRecorder.destroy();
            if (this._hasVideo)
                this._whammyRecorder.destroy();
        },

        _startRecord: function() {
            if (this._hasVideo)
                this._whammyRecorder.start();
            if (this._hasAudio)
                this._audioRecorder.start();
        },

        _stopRecord: function() {
            if (this._hasVideo)
                this._whammyRecorder.stop();
            if (this._hasAudio)
                this._audioRecorder.stop();
        },

        getVolumeGain: function() {
            return this._audioRecorder ? this._audioRecorder.getVolumeGain() : 1.0;
        },

        setVolumeGain: function(volumeGain) {
            if (this._audioRecorder)
                this._audioRecorder.setVolumeGain(volumeGain);
        },

        averageFrameRate: function() {
            return this._hasVideo ? this._whammyRecorder.averageFrameRate() : 0;
        }


    }, function(inherited) {
        return {

            supported: function(options) {
                if (!inherited.supported.call(this, options))
                    return false;
                if (document.location.href.indexOf("https://") !== 0 && document.location.hostname !== "localhost") {
                    if (Info.isChrome() && Info.chromeVersion() >= 47)
                        return false;
                    if (Info.isOpera() && Info.operaVersion() >= 34)
                        return false;
                }
                return AudioRecorder.supported() && WhammyRecorder.supported();
            }

        };
    });
});


Scoped.extend("module:WebRTC.RecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.PeerRecorderWrapper",
    "module:WebRTC.MediaRecorderWrapper",
    "module:WebRTC.WhammyAudioRecorderWrapper"
], function(RecorderWrapper, PeerRecorderWrapper, MediaRecorderWrapper, WhammyAudioRecorderWrapper) {
    RecorderWrapper.register(PeerRecorderWrapper, 3);
    RecorderWrapper.register(MediaRecorderWrapper, 2);
    RecorderWrapper.register(WhammyAudioRecorderWrapper, 1);
    return {};
});