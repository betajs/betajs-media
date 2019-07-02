Scoped.define("module:WebRTC.RecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Async",
    "base:Promise",
    "module:WebRTC.Support",
    "module:Recorder.Support",
    "base:Time",
    "module:Recorder.PixelSampleMixin"
], function(ConditionalInstance, EventsMixin, Objs, Async, Promise, Support, RecorderSupport, Time, PixelSampleMixin, scoped) {
    return ConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, PixelSampleMixin, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this, options);
                this._video = options.video;
                this._localPlaybackRequested = options.localPlaybackRequested;
                this._recording = false;
                this._bound = false;
                this._hasAudio = false;
                this._hasVideo = false;
                this._screen = options.screen;
                this._flip = !!options.flip;
            },

            _getConstraints: function() {
                return {
                    audio: this._options.recordAudio ? {
                        sourceId: this._options.audioId
                    } : false,
                    video: this._options.recordVideo ? {
                        frameRate: this._options.framerate,
                        sourceId: this._options.videoId,
                        width: this._options.recordResolution.width,
                        height: this._options.recordResolution.height,
                        cameraFaceFront: this._options.cameraFaceFront
                    } : false,
                    screen: this._screen
                };
            },

            /**
             * Will add a new Stream to Existing one
             *
             * @param {object} device
             * @param {object} options
             */
            addNewSingleStream: function(device, options) {
                this._initMultiStreamSettings();
                // this._videoElements.push(this._video);
                var _options, _positionX, _positionY, _height, _width, _aspectRatio, _constraints;
                _constraints = {};
                _aspectRatio = this._options.video.aspectRatio;
                _positionX = options.positionX || 0;
                _positionY = options.positionY || 0;
                _width = options.width || (this._options.recordResolution.width * 0.20) || 120;
                _height = options.height || _aspectRatio ? Math.floor(_width * _aspectRatio) : Math.floor(_width / 1.33);
                _videoElement = options.videoElement;
                _options = {
                    frameRate: this._options.framerate,
                    sourceId: device.id,
                    width: _width,
                    height: _height,
                    cameraFaceFront: this._options.cameraFaceFront
                };
                _constraints = {
                    video: _options
                };
                this._prepareMultiStreamCanvas();
                this.drawing = false;
                this._multiSteamConstraints = _constraints;
                this.__addedStreamOptions = Objs.tree_merge(_options, {
                    positionX: _positionX,
                    positionY: _positionY
                });
                return this.addNewMediaStream();
            },

            /**
             * Add new stream to existing one
             * @return {Promise}
             */
            addNewMediaStream: function() {
                var promise = Promise.create();
                if (this._multiStreams.length < 1)
                    this._multiStreams.push(this._stream);
                return Support.userMedia2(this._multiSteamConstraints, this).success(function(stream) {
                    this._multiStreams.push(stream);
                    this._addNewVideoElement(promise);

                    this.on("multistream-canvas-drawn", function() {
                        console.log('DRAWN');
                        return promise.asyncSuccess();
                    }, this);

                }, this);
            },


            recordDelay: function(opts) {
                return 0;
            },

            stream: function() {
                return this._stream;
            },

            isWebrtcStreaming: function() {
                return false;
            },

            bindMedia: function() {
                if (this._bound)
                    return;
                return Support.userMedia2(this._getConstraints()).success(function(stream) {
                    this._hasAudio = this._options.recordAudio && stream.getAudioTracks().length > 0;
                    this._hasVideo = this._options.recordVideo && stream.getVideoTracks().length > 0;
                    this._bound = true;
                    this._stream = stream;
                    Support.bindStreamToVideo(stream, this._video, this._flip);
                    this.trigger("bound", stream);
                    this._setLocalTrackSettings(stream);
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

            selectCameraFace: function(faceFront) {
                this._options.cameraFaceFront = faceFront;
                if (this._bound) {
                    this.unbindMedia();
                    this.bindMedia();
                }
            },

            startRecord: function(options) {
                if (this._recording)
                    return Promise.value(true);
                this._recording = true;
                var promise = this._startRecord(options);
                promise.success(function() {
                    this._startTime = Time.now();
                }, this);
                return promise;
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
                Support.stopUserMediaStream(this._stream, this._soruceTracks);
                this._bound = false;
                this.trigger("unbound");
                this._unboundMedia();
            },

            createSnapshot: function(type) {
                return RecorderSupport.createSnapshot(type, this._video);
            },

            _pixelSample: function(samples, callback, context) {
                samples = samples || 100;
                var w = this._video.videoWidth || this._video.clientWidth;
                var h = this._video.videoHeight || this._video.clientHeight;
                var wc = Math.ceil(Math.sqrt(w / h * samples));
                var hc = Math.ceil(Math.sqrt(h / w * samples));
                var canvas = document.createElement('canvas');
                canvas.width = wc;
                canvas.height = hc;
                var ctx = canvas.getContext('2d');
                ctx.drawImage(this._video, 0, 0, wc, hc);
                for (var i = 0; i < samples; ++i) {
                    var x = i % wc;
                    var y = Math.floor(i / wc);
                    var data = ctx.getImageData(x, y, 1, 1).data;
                    callback.call(context || this, data[0], data[1], data[2]);
                }
            },

            /**
             * Initialize multi-stream related variables
             * @private
             */
            _initMultiStreamSettings: function() {
                this._multiStreams = [];
                this._videoElements = [];
                this._audioInputs = [];
                this._soruceTracks = [];
                this._multiSteamConstraints = {};
            },

            /**
             * Will prepare canvas element, to merge video streams
             * @private
             */
            _prepareMultiStreamCanvas: function() {
                var _height = this._video.clientHeight || this._video.videoHeight;
                var _width = this._video.clientWidth || this._video.videoWidth;
                this.__multiStreamCanvas = document.createElement('canvas');
                this.__multiStreamCanvas.setAttribute('width', _width);
                this.__multiStreamCanvas.setAttribute('height', _height);
                this.__multiStreamCanvas.setAttribute('style', 'position:fixed; left: 200%; pointer-events: none'); // Out off from the screen
                this.__multiStreamCtx = this.__multiStreamCanvas.getContext('2d');
                // document.body.append(this.__multiStreamCanvas);
            },

            /**
             * Set local track setting values
             * @param {MediaStream} stream
             * @private
             */
            _setLocalTrackSettings: function(stream) {
                if (typeof stream.getVideoTracks() !== 'undefined') {
                    if (stream.getVideoTracks()[0]) {
                        this._videoTrack = stream.getVideoTracks()[0];
                        // Will fix Chrome Cropping
                        if (this._options.screen) {
                            var _self = this;
                            this._videoTrack.applyConstraints({
                                resizeMode: 'none'
                            }).then(function() {
                                if (typeof _self._videoTrack.getSettings() !== 'undefined')
                                    _self._videoTrackSettings = _self._videoTrack.getSettings();
                            });
                        } else {
                            if (typeof this._videoTrack.getSettings() !== 'undefined')
                                this._videoTrackSettings = this._videoTrack.getSettings();
                        }
                    }
                }
                if (typeof stream.getAudioTracks() !== 'undefined') {
                    if (stream.getAudioTracks()[0]) {
                        this._audioTrack = stream.getAudioTracks()[0];
                        if (typeof this._audioTrack.getSettings() !== 'undefined')
                            this._audioTrackSettings = this._audioTrack.getSettings();
                    }
                }
            },

            /**
             * Will add new video DOM Element to draw inside Multi-Stream Canvas
             * @param promise
             * @private
             */
            _addNewVideoElement: function(promise) {
                Objs.iter(this._multiStreams, function(stream, index) {
                    var _tracks = stream.getTracks();
                    Objs.iter(_tracks, function(track) {
                        // Will require to stop all existing tracks after recorder stop
                        this._soruceTracks.push(track);
                        if (track.kind === 'video') {
                            if (track.id !== this._videoTrack.id)
                                this._videoElements.push(this._singleVideoElement(this.__addedStreamOptions, stream));
                            else
                                this._videoElements.push(this._singleVideoElement(this._getConstraints().video, stream));
                        }
                        if (track.kind === 'audio') {
                            this._audioInputs.push(track);
                        }
                    }, this);
                    if ((this._videoElements.length + this._audioInputs.length) === _tracks.length) {
                        try {
                            this.drawing = true;
                            this._drawTracksToCanvas();
                            this._startMultiStreaming();
                        } catch (e) {
                            console.warn(e);
                        }
                    }

                    // If After 1 seconds, if we can not get required tracks, something wrong
                    Async.eventually(function() {
                        if (!this.drawing)
                            return promise.asyncError({
                                message: 'Could not be able to get required tracks'
                            });
                    }, this, 1000);
                }, this);
            },

            /**
             * Merge streams and draw Canvas.
             * @private
             */
            _drawTracksToCanvas: function() {
                if (!this.drawing)
                    return;
                var _videosCount = this._videoElements.length;
                for (var _i = 0; _i < this._videoElements.length; _i++) {
                    var video = this._videoElements[_i];
                    var _constraints = _i !== 0 ? this.__addedStreamOptions : {};
                    var _positionX = _constraints.positionX || 0;
                    var _positionY = _constraints.positionY || 0;
                    var _width = _constraints.width || this.__multiStreamCanvas.width || 360;
                    var _height = _constraints.height || this.__multiStreamCanvas.height || 240;
                    this.__multiStreamCtx.drawImage(video, _positionX, _positionY, _width, _height);
                    _videosCount--;
                    if (_videosCount === 0) {
                        Async.eventually(this._drawTracksToCanvas, [], this, 1000 / 30); // drawing at 30 fps
                    }
                }
            },

            /**
             * Start streaming from merged Canvas Element
             * @private
             */
            _startMultiStreaming: function() {
                var stream = this.__multiStreamCanvas.captureStream(25);
                stream.addTrack(this._audioInputs[0]);
                this._stream = stream;
                Support.bindStreamToVideo(stream, this._video, this._flip);
                this.trigger("bound", stream);
                this.trigger("multistream-canvas-drawn");
                this._setLocalTrackSettings(stream);
                this._boundMedia(stream);
            },

            /**
             * Generate single video DOM element to draw inside canvas
             * @param {object} options
             * @param stream
             * @return {HTMLElement}
             * @private
             */
            _singleVideoElement: function(options, stream) {
                var video = Support.bindStreamToVideo(stream);
                video.className = 'betajs-multistream-element';
                video.muted = true;
                video.volume = 0;
                video.width = options.width || 360;
                video.height = options.height || 240;
                video.play();
                return video;
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

            _dataAvailable: function(videoBlob, audioBlob, noUploading) {
                if (this.destroyed())
                    return;
                this.trigger("data", videoBlob, audioBlob, noUploading);
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
    "module:WebRTC.PeerRecorder",
    "module:WebRTC.MediaRecorder",
    "browser:Info",
    "base:Async"
], function(RecorderWrapper, PeerRecorder, MediaRecorder, Info, Async, scoped) {
    return RecorderWrapper.extend({
        scoped: scoped
    }, {

        _boundMedia: function() {
            this._recorder = new PeerRecorder(this._stream, {
                recorderWidth: this._options.recordResolution.width,
                recorderHeight: this._options.recordResolution.height,
                videoBitrate: this._options.videoBitrate,
                audioBitrate: this._options.audioBitrate,
                audioonly: !this._options.recordVideo
            });
            if (this._localPlaybackRequested && MediaRecorder.supported())
                this.__localMediaRecorder = new MediaRecorder(this._stream);
            this._recorder.on("error", this._error, this);
        },

        _unboundMedia: function() {
            this._recorder.destroy();
            if (this.__localMediaRecorder)
                this.__localMediaRecorder.weakDestroy();
        },

        _startRecord: function(options) {
            if (this.__localMediaRecorder)
                this.__localMediaRecorder.start();
            return this._recorder.start(options.webrtcStreaming);
        },

        isWebrtcStreaming: function() {
            return true;
        },

        _stopRecord: function() {
            this._recorder.stop();
            var localBlob = null;
            if (this.__localMediaRecorder) {
                this.__localMediaRecorder.once("data", function(blob) {
                    localBlob = blob;
                });
                this.__localMediaRecorder.stop();
            }
            Async.eventually(function() {
                this._dataAvailable(localBlob, null, true);
            }, this, this.__stopDelay || this._options.webrtcStreaming.stopDelay || 0);
        },

        recordDelay: function(opts) {
            this.__stopDelay = opts.webrtcStreaming.stopDelay;
            return opts.webrtcStreaming.delay || 0;
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
                /*
                if (!options.recordVideo)
                    return false;
                    */
                if (options.screen && Info.isFirefox())
                    return false;
                return options.webrtcStreaming && PeerRecorder.supported() && !options.webrtcStreamingIfNecessary;
            }

        };
    });
});


Scoped.define("module:WebRTC.PeerRecorderWrapperIfNecessary", [
    "module:WebRTC.PeerRecorderWrapper",
    "base:Objs"
], function(PeerRecorderWrapper, Objs, scoped) {
    return PeerRecorderWrapper.extend({
        scoped: scoped
    }, {}, function(inherited) {
        return {

            supported: function(options) {
                if (options.webrtcStreamingIfNecessary) {
                    options = Objs.clone(options, 1);
                    options.webrtcStreamingIfNecessary = false;
                    options.webrtcStreaming = true;
                }
                return inherited.supported.call(this, options);
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

        _boundMedia: function(stream) {
            stream = stream || this._stream;
            this._recorder = new MediaRecorder(stream, {
                videoBitrate: this._options.videoBitrate,
                audioBitrate: this._options.audioBitrate,
                audioonly: !this._options.recordVideo
            });
            this._recorder.on("data", function(blob) {
                this._dataAvailable(blob);
            }, this);
        },

        _unboundMedia: function() {
            this._recorder.destroy();
        },

        _startRecord: function() {
            return this._recorder.start();
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
                if (options.recordFakeVideo)
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
    "browser:Info",
    "base:Promise"
], function(RecorderWrapper, AudioRecorder, WhammyRecorder, Info, Promise, scoped) {
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
            } else {
                this._whammyRecorder = new WhammyRecorder(null, {
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
            //if (this._hasVideo) {
            this._whammyRecorder.on("data", function(blob) {
                this._videoBlob = blob;
                if (this._audioBlob || !this._hasAudio)
                    this._dataAvailable(this._videoBlob, this._audioBlob);
            }, this);
            //}
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
            //if (this._hasVideo)
            this._whammyRecorder.destroy();
        },

        _startRecord: function() {
            var promises = [];
            //if (this._hasVideo)
            promises.push(this._whammyRecorder.start());
            if (this._hasAudio)
                promises.push(this._audioRecorder.start());
            return Promise.and(promises);
        },

        _stopRecord: function() {
            //if (this._hasVideo)
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
            return this._whammyRecorder.averageFrameRate();
            //return this._hasVideo ? this._whammyRecorder.averageFrameRate() : 0;
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
                return AudioRecorder.supported() && WhammyRecorder.supported(!options.recordVideo);
            }

        };
    });
});


Scoped.extend("module:WebRTC.RecorderWrapper", [
    "module:WebRTC.RecorderWrapper",
    "module:WebRTC.PeerRecorderWrapper",
    "module:WebRTC.MediaRecorderWrapper",
    "module:WebRTC.WhammyAudioRecorderWrapper",
    "module:WebRTC.PeerRecorderWrapperIfNecessary"
], function(RecorderWrapper, PeerRecorderWrapper, MediaRecorderWrapper, WhammyAudioRecorderWrapper, PeerRecorderWrapperIfNecessary) {
    RecorderWrapper.register(PeerRecorderWrapper, 4);
    RecorderWrapper.register(MediaRecorderWrapper, 3);
    RecorderWrapper.register(WhammyAudioRecorderWrapper, 2);
    RecorderWrapper.register(PeerRecorderWrapperIfNecessary, 1);
    return {};
});