Scoped.define("module:WebRTC.RecorderWrapper", [
    "base:Classes.ConditionalInstance",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Async",
    "base:Promise",
    "base:Time",
    "module:WebRTC.Support",
    "module:Recorder.Support",
    "module:Recorder.PixelSampleMixin",
    "browser:Events"
], function(ConditionalInstance, EventsMixin, Objs, Async, Promise, Time, Support, RecorderSupport, PixelSampleMixin, DomEvents, scoped) {
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
                this._resizeMode = options.resizeMode;
                this._flip = !!options.flip;
                if (this._screen && !options.flipscreen)
                    this._flip = false;
                this._videoTrackSettings = {
                    slippedFromOrigin: {
                        height: 1.00,
                        width: 1.00
                    }
                };
                if (this._options.fittodimensions) {
                    if (this._screen === null) {
                        this._initCanvasStreamSettings();
                        this._prepareRecorderStreamCanvas(true);
                    } else {
                        this._options.fittodimensions = false;
                    }
                }
            },

            _getConstraints: function() {
                return {
                    // Seems sourceId was deprecated, deviceId is most supported constraint (Fix changing audio source)
                    audio: this._options.recordAudio ? {
                        deviceId: this._options.audioId
                    } : false,
                    video: this._options.recordVideo ? {
                        frameRate: this._options.framerate,
                        sourceId: this._options.videoId,
                        width: this._options.recordResolution.width,
                        height: this._options.recordResolution.height,
                        cameraFaceFront: this._options.cameraFaceFront,
                        resizeMode: this._resizeMode
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
                this._initCanvasStreamSettings();
                var _options, _positionX, _positionY, _height, _width, _aspectRatio, _constraints;
                var _isTrueHeight = true;
                _aspectRatio = this._options.video.aspectRatio;
                _positionX = options.positionX || 0;
                _positionY = options.positionY || 0;
                _width = options.width || (this._options.recordResolution.width * 0.20) || 120;
                _height = options.height;
                if (!_height) {
                    _height = _aspectRatio ? Math.floor(_width * _aspectRatio) : Math.floor(_width / 1.33);
                    _isTrueHeight = false;
                }
                _options = {
                    frameRate: this._options.framerate,
                    sourceId: device.id,
                    cameraFaceFront: this._options.cameraFaceFront
                };
                _constraints = {
                    video: _options
                };
                this._prepareRecorderStreamCanvas();
                this._multiStreamConstraints = _constraints;
                this.__addedStreamOptions = Objs.tree_merge(_options, {
                    positionX: _positionX,
                    positionY: _positionY,
                    width: _width,
                    height: _height,
                    isTrueHeight: _isTrueHeight
                });
                return this.addNewMediaStream();
            },

            /**
             * Update small screen dimensions and position
             *
             * @param x
             * @param y
             * @param w
             * @param h
             */
            updateMultiStreamPosition: function(x, y, w, h) {
                this.__addedStreamOptions.positionX = x || this.__addedStreamOptions.positionX;
                this.__addedStreamOptions.positionY = y || this.__addedStreamOptions.positionY;
                this.__addedStreamOptions.width = w || this.__addedStreamOptions.width;
                this.__addedStreamOptions.height = h || this.__addedStreamOptions.height;
            },


            /**
             * Add new stream to existing one
             * @return {Promise}
             */
            addNewMediaStream: function() {
                var promise = Promise.create();
                if (this._canvasStreams.length < 1)
                    this._canvasStreams.push(this._stream);
                return Support.userMedia2(this._multiStreamConstraints, this).success(function(stream) {
                    this._canvasStreams.push(stream);
                    this._buildVideoElementsArray(promise);
                    this.on("stream-canvas-drawn", function() {
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

            canPause: function() {
                return false;
            },

            bindMedia: function() {
                if (this._bound)
                    return;
                return Support.userMedia2(this._getConstraints()).success(function(stream) {
                    if (!this._options) return;
                    this._hasAudio = this._options.recordAudio && stream.getAudioTracks().length > 0;
                    this._hasVideo = this._options.recordVideo && stream.getVideoTracks().length > 0;
                    var applyConstraints = {};
                    var settings = null;
                    var setConstraints = null;
                    var capabilities = null;
                    var vTrack = stream.getVideoTracks()[0] || {};

                    if (this._hasVideo && typeof vTrack.getSettings === 'function') {
                        settings = vTrack.getSettings();

                        if (typeof vTrack.onended !== 'undefined') {
                            var _onEndedEvent = this.auto_destroy(new DomEvents());
                            _onEndedEvent.on(vTrack, "ended", function(ev) {
                                this.trigger("mainvideostreamended");
                            }, this);
                        }
                    }

                    // Purpose is fix Overconstrained dimensions to correct one
                    // Firefox still not supports getCapabilities
                    // More details: https://bugzilla.mozilla.org/show_bug.cgi?id=1179084
                    if (this._hasVideo && typeof vTrack.getCapabilities === 'function' && settings) {
                        capabilities = vTrack.getCapabilities();
                        setConstraints = this._getConstraints().video;

                        if (capabilities.width.max && capabilities.height.max)
                            applyConstraints = this.__checkAndApplyCorrectConstraints(vTrack, capabilities, setConstraints, stream);
                    }

                    // If Browser will set aspect ratio correctly no need draw into canvas
                    if (settings && setConstraints && this._options.fittodimensions) {
                        var _setRatio = setConstraints.width / setConstraints.height;
                        var _appliedRatio = settings.width / settings.height;
                        if (Math.abs(_setRatio - _appliedRatio) <= 0.1) {
                            this._options.fittodimensions = false;
                        }
                    }

                    if (this._options.fittodimensions && settings) {
                        this._canvasStreams.push(stream);
                        if (!this.__initialVideoTrackSettings)
                            this.__calculateVideoTrackSettings(settings, this._video, true);
                        this._videoTrackSettings.capabilities = capabilities;
                        this._videoTrackSettings.constrainsts = this._getConstraints().video;
                        this._buildVideoElementsArray();
                    } else {
                        this._bound = true;
                        this._stream = stream;
                        this._setLocalTrackSettings(stream);
                        Support.bindStreamToVideo(stream, this._video, this._flip);
                        this.trigger("bound", stream);
                        this._boundMedia();
                    }
                }, this);
            },

            selectCamera: function(cameraId) {
                this._options.videoId = cameraId;
                if (this._bound) {
                    this.unbindMedia();
                    this.bindMedia();
                    this.trigger("rebound");
                }
            },

            selectMicrophone: function(microphoneId) {
                this._options.audioId = microphoneId;
                if (this._bound) {
                    this.unbindMedia();
                    this.bindMedia();
                    this.trigger("rebound");
                }
            },

            selectCameraFace: function(faceFront) {
                this._options.cameraFaceFront = faceFront;
                if (this._bound) {
                    this.unbindMedia();
                    this.bindMedia();
                    this.trigger("rebound");
                }
            },

            getCameraFacingMode: function() {
                if (this._options.cameraFaceFront === true)
                    return "user";
                if (this._options.cameraFaceFront === false)
                    return "environment";
                return undefined;
            },

            startRecord: function(options) {
                if (this._recording)
                    return Promise.value(true);
                this._recording = true;
                var promise = this._startRecord(options);
                promise.success(function() {
                    this._pausedDuration = 0;
                    this._startTime = Time.now();
                }, this);
                return promise;
            },

            pauseRecord: function() {
                if (!this.canPause() || this._paused)
                    return;
                this._paused = true;
                this._recorder.once("paused", function() {
                    this.trigger("paused");
                    this.__pauseStartTime = Time.now();
                }, this);
                this._recorder.pause();
            },

            resumeRecord: function() {
                if (!this.canPause() || !this._paused)
                    return;
                this._paused = false;
                this._recorder.once("resumed", function() {
                    this.trigger("resumed");
                    this._pausedDuration += Time.now() - this.__pauseStartTime;
                    delete this.__pauseStartTime;
                }, this);
                this._recorder.resume();
            },

            stopRecord: function() {
                if (!this._recording)
                    return;
                this._recording = false;
                this._stopRecord();
                this._stopTime = Time.now();
            },

            duration: function() {
                return (this._recording || !this._stopTime ? Time.now() : this._stopTime) - this._startTime -
                    this._pausedDuration -
                    (this.__pauseStartTime !== undefined ? Time.now() - this.__pauseStartTime : 0);
            },

            unbindMedia: function() {
                if (!this._bound || this._recording)
                    return;
                Support.stopUserMediaStream(this._stream, this._sourceTracks);
                this._bound = false;
                this.trigger("unbound");
                this._unboundMedia();
            },

            createSnapshot: function(type) {
                return RecorderSupport.createSnapshot(type, this._video);
            },

            _pixelSample: function(samples, callback, context) {
                if (!this._video.videoWidth) {
                    callback.call(context || this, 0, 0, 0);
                    return;
                }
                samples = samples || 100;
                var w = this._video.videoWidth;
                var h = this._video.videoHeight;
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
            _initCanvasStreamSettings: function() {
                this._canvasStreams = [];
                this._videoElements = [];
                this._audioInputs = [];
                this._sourceTracks = [];
                this._multiStreamConstraints = {};
                this._drawingStream = false;
            },

            /**
             * Will prepare canvas element, to draw video streams inside
             * @param {Boolean =} feetDimension
             * @private
             */
            _prepareRecorderStreamCanvas: function(feetDimension) {
                if (this.__recorderStreamCanvas && this.__recorderStreamCtx)
                    return;
                var height = this._videoTrackSettings.height || this._video.clientHeight || this._video.videoHeight;
                var width = this._videoTrackSettings.width || this._video.clientWidth || this._video.videoWidth;
                if (typeof this.__recorderStreamCanvas === 'undefined') {
                    this.__recorderStreamCanvas = document.createElement('canvas');
                }
                this.__recorderStreamCanvas.setAttribute('width', width);
                this.__recorderStreamCanvas.setAttribute('height', height);
                this.__recorderStreamCanvas.setAttribute('style', 'position:fixed; left: 200%; pointer-events: none'); // Out off from the screen
                this.__recorderStreamCtx = this.__recorderStreamCanvas.getContext('2d');
                this._drawerSetting = {
                    fittodimensions: feetDimension || false,
                    streamsReversed: false,
                    isMultiStream: false
                };
                // document.body.append(this.__recorderStreamCanvas);
            },

            /**
             * Set local track setting values
             * @param {MediaStream} stream
             * @private
             */
            _setLocalTrackSettings: function(stream) {
                if (typeof stream.getVideoTracks() !== 'undefined') {
                    if (stream.getVideoTracks()[0]) {
                        var self = this;
                        this._videoTrack = stream.getVideoTracks()[0];
                        // Will fix older version Chrome Cropping
                        if (!this._options.getDisplayMediaSupported) {
                            if (typeof this._resizeMode === 'undefined')
                                this._resizeMode = 'none';
                            this._videoTrack.applyConstraints({
                                resizeMode: this._resizeMode
                            }).then(function() {
                                if (typeof self._videoTrack.getSettings !== 'undefined')
                                    self._videoTrackSettings = Objs.extend(sourceVideoSettings, self._videoTrackSettings);
                            });
                        } else {
                            if (typeof this._videoTrack.getSettings !== 'undefined') {
                                var sourceVideoSettings = this._videoTrack.getSettings();
                                if (typeof this._videoTrackSettings.videoInnerFrame === 'undefined')
                                    this._videoTrackSettings = Objs.extend(sourceVideoSettings, this._videoTrackSettings);

                                this._video.onloadedmetadata = function(ev) {
                                    self.__calculateVideoTrackSettings(sourceVideoSettings, ev.target, true);
                                };
                            }
                        }
                    }
                }
                if (typeof stream.getAudioTracks !== 'undefined') {
                    if (stream.getAudioTracks()[0]) {
                        this._audioTrack = stream.getAudioTracks()[0];
                        if (typeof this._audioTrack.getSettings() !== 'undefined')
                            this._audioTrackSettings = this._audioTrack.getSettings();
                    }
                }
            },

            /**
             *
             * @param videoTrack
             * @param capabilities
             * @param setConstraints
             * @private
             */
            __checkAndApplyCorrectConstraints: function(videoTrack, capabilities, setConstraints) {
                var maxWidth = capabilities.width.max;
                var maxHeight = capabilities.height.max;

                if (setConstraints.width > maxWidth || setConstraints.height > maxHeight) {
                    var _ar = maxWidth / maxHeight;
                    var _newWidth, _newHeight;
                    var _desiredAr = setConstraints.width / setConstraints.height;

                    if (capabilities.aspectRatio.min && capabilities.aspectRatio.max) {
                        var _minAr, _maxAr;
                        _desiredAr = setConstraints.width / setConstraints.height;
                        _minAr = capabilities.aspectRatio.min;
                        _maxAr = capabilities.aspectRatio.max;
                        if (_desiredAr > 1 && _desiredAr > _maxAr) {
                            _desiredAr = _maxAr;
                        } else if (_desiredAr < 1 && _desiredAr < _minAr) {
                            _desiredAr = _minAr;
                        }
                    } else {
                        _desiredAr = _ar;
                    }

                    if (setConstraints.width > maxWidth && setConstraints.height > maxHeight) {
                        _newWidth = _desiredAr > 1 ? maxWidth : maxHeight * _desiredAr;
                        _newHeight = _desiredAr > 1 ? maxWidth / _desiredAr : maxHeight;

                        // Only possible in below if above not fit correctly
                        if (_newHeight > maxHeight && _desiredAr > 1) {
                            _newHeight = maxHeight;
                            _newWidth = maxHeight / _desiredAr;
                        }
                        if (_newWidth > maxWidth && _desiredAr < 1) {
                            _newWidth = maxWidth;
                            _newHeight = maxWidth / _desiredAr;
                        }
                    } else if (setConstraints.width > maxWidth) {
                        _newHeight = _desiredAr > 1 ? maxWidth / _desiredAr : Math.min(maxHeight, setConstraints.height);
                        _newWidth = _desiredAr > 1 ? maxWidth : _newHeight * _desiredAr;
                    } else if (setConstraints.height > maxHeight) {
                        _newWidth = _desiredAr > 1 ? Math.min(maxWidth, setConstraints.width) : maxHeight * _desiredAr;
                        _newHeight = _desiredAr > 1 ? _newWidth / _desiredAr : maxHeight;
                    }

                    return {
                        width: _newWidth,
                        height: _newHeight
                    };
                }
            },

            /**
             * Calculate Video Element Settings Settings
             * @param {MediaTrackSettings} sourceVideoSettings
             * @param {HTMLVideoElement=} videoElement
             * @param {Boolean =} setInitialSettings
             * @private
             */
            __calculateVideoTrackSettings: function(sourceVideoSettings, videoElement, setInitialSettings) {
                videoElement = videoElement || this._video;
                var _lookedWidth, _lookedHeight, _slippedWidth, _slippedHeight, _dimensions;
                var _asR = sourceVideoSettings.aspectRatio || (sourceVideoSettings.width / sourceVideoSettings.height);
                if (!isNaN(_asR)) {
                    var _maxWidth = videoElement.offsetWidth;
                    var _maxHeight = videoElement.offsetHeight;
                    // FireFox don't calculates aspectRatio like Chrome does
                    _lookedWidth = _maxWidth <= _maxHeight * _asR ? _maxWidth : Math.round(_maxHeight * _asR);
                    _lookedHeight = _maxWidth > _maxHeight * _asR ? _maxHeight : Math.round(_maxWidth / _asR);

                    _slippedWidth = sourceVideoSettings.width > _lookedWidth ? sourceVideoSettings.width / _lookedWidth : _lookedWidth / sourceVideoSettings.width;
                    _slippedHeight = sourceVideoSettings.height > _lookedHeight ? sourceVideoSettings.height / _lookedHeight : _lookedHeight / sourceVideoSettings.height;

                    _dimensions = Objs.extend(sourceVideoSettings, {
                        videoElement: {
                            width: _maxWidth,
                            height: _maxHeight
                        },
                        videoInnerFrame: {
                            width: _lookedWidth,
                            height: _lookedHeight
                        },
                        slippedFromOrigin: {
                            width: _slippedWidth,
                            height: _slippedHeight
                        }
                    });

                    if (setInitialSettings) this.__initialVideoTrackSettings = _dimensions;
                    this._videoTrackSettings = _dimensions;
                    return _dimensions;
                }
            },

            /**
             * Will add new video DOM Element to draw inside Multi-Stream Canvas
             * @param {Promise =} promise
             * @private
             */
            _buildVideoElementsArray: function(promise) {
                this.__multiStreamVideoSettings = {
                    isMainStream: true,
                    mainStream: {},
                    smallStream: {}
                };
                Objs.iter(this._canvasStreams, function(stream, index) {
                    var _tracks = stream.getTracks();
                    var _additionalStream = false;
                    Objs.iter(_tracks, function(track) {
                        // Will require to stop all existing tracks after recorder stop
                        this._sourceTracks.push(track);
                        if (track.kind === 'video') {
                            if (this._videoTrack) {
                                _additionalStream = track.id !== this._videoTrack.id;
                                this._drawerSetting.isMultiStream = true;
                            }
                            this._videoElements.push(this._arraySingleVideoElement(this.__addedStreamOptions, stream, _additionalStream, track));
                        }
                        if (track.kind === 'audio') {
                            this._audioInputs.push(track);
                        }
                    }, this);
                    if ((this._videoElements.length + this._audioInputs.length) === _tracks.length) {
                        this._startDrawRecorderToCanvas(stream);
                    }

                    // If After 1 seconds, if we can not get required tracks, something wrong
                    Async.eventually(function() {
                        if (!this._drawingStream) {
                            if (promise)
                                return promise.asyncError({
                                    message: 'Could not be able to get required tracks'
                                });
                            return false;
                        }
                    }, this, 1000);
                }, this);
            },

            /**
             *
             * @param {MediaStream} stream
             * @private
             */
            _startDrawRecorderToCanvas: function(stream) {
                try {
                    var streamSettings = stream.getVideoTracks()[0].getSettings();
                    if (streamSettings.aspectRatio) {
                        if (Math.abs(streamSettings.aspectRatio - this._videoTrackSettings.aspectRatio) > 0.1) {
                            this._videoTrackSettings.aspectRatio = streamSettings.aspectRatio;
                            this.__calculateVideoTrackSettings(streamSettings, null, true);
                            this.__recorderStreamCanvas.setAttribute('width', streamSettings.width);
                            this.__recorderStreamCanvas.setAttribute('height', streamSettings.height);
                        }
                    }

                    this._drawingStream = true;

                    if (this._drawerSetting.fittodimensions && typeof this._videoTrackSettings.videoInnerFrame !== 'undefined') {
                        // Stream dimensions
                        var crop = false;
                        var settings = {};
                        var width = this._videoTrackSettings.width;
                        var height = this._videoTrackSettings.height;
                        this.__recorderStreamCanvas.width = width;
                        this.__recorderStreamCanvas.height = height;
                        var _settingRatio = width / height;

                        var innerFrame = this._videoTrackSettings.videoInnerFrame;
                        var videoElement = this._videoTrackSettings.videoElement;

                        var setConstraints = this._videoTrackSettings.constrainsts;
                        var _desiredRatio = setConstraints.width / setConstraints.height;

                        var _baseIsWidth = innerFrame.width === videoElement.width;
                        // var _baseIsHeight = innerFrame.height === videoElement.height;

                        // Dimensions what is expected
                        if (Math.abs(_settingRatio - _desiredRatio) >= 0.1) {
                            crop = true;
                            if (_baseIsWidth) {
                                settings.ch = Math.round(width / _desiredRatio);
                                if (settings.ch > height)
                                    _baseIsWidth = false;
                            } else {
                                settings.cw = _settingRatio > 1 ? Math.round(height * _desiredRatio) : Math.round(height / _desiredRatio);
                                if (settings.cw > width)
                                    _baseIsWidth = true;
                            }

                            if (_baseIsWidth) {
                                settings.cw = width;
                                settings.ch = Math.round(width / _desiredRatio);
                                settings.cx = 0;
                                settings.cy = (height - settings.ch) / 2;

                                settings.w = settings.cw;
                                settings.h = settings.ch;
                                settings.x = 0;
                                settings.y = (height - settings.h) / 2;

                            } else {
                                settings.ch = height;
                                settings.cw = _settingRatio > 1 ? Math.round(height * _desiredRatio) : Math.round(height / _desiredRatio);
                                settings.cy = 0;
                                settings.cx = (width - settings.cw) / 2;

                                settings.w = settings.cw;
                                settings.h = settings.ch;
                                settings.y = 0;
                                settings.x = (width - settings.w) / 2;
                            }
                        }
                        this.__cropSettings = settings;
                    }

                    this._drawTracksToCanvas();
                    this._startCanvasStreaming();
                } catch (e) {
                    console.warn(e);
                }
            },


            /**
             *
             * Merge streams and draw Canvas.
             * @private
             */
            _drawTracksToCanvas: function() {
                if (!this._drawingStream)
                    return;
                var videosCount = this._videoElements.length;
                var reversed = false;

                if (typeof this._drawerSetting !== 'undefined') {
                    if (this._drawerSetting.streamsReversed)
                        reversed = true;
                }

                for (var _i = 0; _i < this._videoElements.length; _i++) {
                    var video, constraints, width, height, positionX, positionY;
                    video = this._videoElements[_i];

                    if (this._drawerSetting.fittodimensions) {
                        // .videoInnerFrame
                        var _cropSettings = this.__cropSettings;
                        width = _cropSettings.w;
                        height = _cropSettings.h;
                        positionX = _cropSettings.x;
                        positionY = _cropSettings.y;
                        this.__recorderStreamCtx.drawImage(
                            video, _cropSettings.cx, _cropSettings.cy, _cropSettings.cw, _cropSettings.ch,
                            positionX, positionY, width, height
                        );
                    } else {
                        constraints = _i !== 0 ? this.__addedStreamOptions : {};
                        positionX = constraints.positionX || 0;
                        positionY = constraints.positionY || 0;
                        if (video.__multistreamElement) {
                            width = reversed ? this._drawerSetting.smallStreamWidth : constraints.width || 360;
                            height = reversed ? this._drawerSetting.smallStreamHeight : constraints.height || 240;
                        } else {
                            if (reversed) {
                                positionX = this._drawerSetting.positionX;
                                positionY = this._drawerSetting.positionY;
                                width = this._drawerSetting.width;
                                height = this._drawerSetting.height;
                                if (this.__multiStreamVideoSettings.mainStream) {
                                    if (Objs.keys(this.__multiStreamVideoSettings.mainStream).length > 0) {
                                        this.__recorderStreamCtx.fillStyle = "#000000";
                                        this.__recorderStreamCtx.fillRect(0, 0, this.__recorderStreamCanvas.width, this.__recorderStreamCanvas.height);
                                        this.__recorderStreamCtx.restore();
                                    }
                                }
                            } else {
                                width = this.__recorderStreamCanvas.width || constraints.width || 360;
                                height = this.__recorderStreamCanvas.height || constraints.height || 240;
                            }
                        }
                        this.__recorderStreamCtx.drawImage(video, positionX, positionY, width, height);
                    }

                    videosCount--;
                    if (videosCount === 0) {
                        Async.eventually(this._drawTracksToCanvas, this, 1000 / 50); // drawing at 50 fps
                    }
                }
            },

            /**
             * Will change screen sources during multi-record
             */
            reverseVideos: function() {
                var _self = this;
                var _isMainBecomeSmall = this.__multiStreamVideoSettings.isMainStream;
                this.__multiStreamVideoSettings.isMainStream = !_isMainBecomeSmall;

                // Get initial core information about stream dimensions
                var _mainStream = this.__multiStreamVideoSettings.mainStream.settings;
                var _smallStream = this.__multiStreamVideoSettings.smallStream.settings;

                var _x = 0,
                    _y = 0,
                    _w, _h, _smW, _smH;

                if (_isMainBecomeSmall) {
                    var _smallStreamAspectRatio = _smallStream.aspectRatio;
                    var _mainAspectRatio = this._videoTrackSettings.aspectRatio || (this._videoTrackSettings.width / this._videoTrackSettings.height);
                    var _fitFullWidth = this._videoTrackSettings.videoElement.width === this._videoTrackSettings.videoInnerFrame.width;
                    if (_fitFullWidth) {
                        _h = _mainStream.streamHeight;
                        _w = _h * _smallStreamAspectRatio;
                        _smW = _smallStream.videoWidth;
                        _smH = _smW / _mainAspectRatio;
                    } else {
                        _w = _mainStream.streamWidth;
                        _h = _w / _smallStreamAspectRatio;
                        _smH = _smallStream.videoHeight;
                        _smW = _smH * _mainAspectRatio;
                    }
                    _x = (_mainStream.streamWidth - _w) / 2;
                    _y = (_mainStream.streamHeight - _h) / 2;
                    this._drawerSetting = {
                        streamsReversed: true,
                        width: _w,
                        height: _h,
                        positionX: _x,
                        positionY: _y,
                        smallStreamHeight: _smH,
                        smallStreamWidth: _smW
                    };
                } else {
                    this._drawerSetting.streamsReversed = false;
                    _smW = _smallStream.videoWidth;
                    _smH = _smallStream.videoHeight;
                }

                if (this._drawingStream) {
                    var _temp_video = document.createElement('video');
                    for (var _i = 0; _i < this._videoElements.length; _i++) {
                        if (!_temp_video.srcObject) {
                            _temp_video.srcObject = this._videoElements[_i].srcObject;
                            this._videoElements[_i].srcObject = this._videoElements[_i + 1].srcObject;
                            this._videoElements[_i].load();
                            this._videoElements[_i].oncanplay = function() {
                                this.play();
                            };
                        } else if (_temp_video.srcObject) {
                            this._videoElements[_i].srcObject = _temp_video.srcObject;
                            this._videoElements[_i].load();
                            this._videoElements[_i].oncanplay = function() {
                                this.play();
                            };
                            var _dimensions = {
                                width: _smW,
                                height: _smH
                            };
                            if (_isMainBecomeSmall) {
                                _self.__calculateVideoTrackSettings(_dimensions);
                            } else {
                                _self._videoTrackSettings = _self.__initialVideoTrackSettings;
                            }
                            _self.trigger("multistream-camera-switched", _dimensions, _isMainBecomeSmall);
                            _temp_video.remove();
                        }
                    }
                }
            },

            /**
             * Start streaming from merged Canvas Element
             * @private
             */
            _startCanvasStreaming: function() {
                var stream = this.__recorderStreamCanvas.captureStream(25);
                if (this._audioInputs[0])
                    stream.addTrack(this._audioInputs[0]);
                this._stream = stream;
                Support.bindStreamToVideo(stream, this._video, this._flip);
                this.trigger("bound", stream);
                this.trigger("stream-canvas-drawn");
                this._setLocalTrackSettings(stream);
                this._boundMedia(stream);
            },

            /**
             * Generate single video DOM element to draw inside canvas
             * @param {object} options
             * @param stream
             * @param {Boolean=} additionalStream // This is newly added stream, small screen
             * @param {MediaStreamTrack=} videoTrack
             * @return {HTMLElement}
             * @private
             */
            _arraySingleVideoElement: function(options, stream, additionalStream, videoTrack) {
                var self = this;
                var video = Support.bindStreamToVideo(stream);
                additionalStream = additionalStream || false;
                if (additionalStream) {
                    video.__multistreamElement = true;
                    video.width = this.__addedStreamOptions.width || options.width || 360;
                    video.height = this.__addedStreamOptions.height || options.height || 240;
                } else {
                    var visibleDimensions = self._videoTrackSettings.videoInnerFrame;
                    var aspectRatio = self._videoTrackSettings.aspectRatio;
                }
                var slippedFromOrigin = self._videoTrackSettings.slippedFromOrigin;
                video.muted = true;
                video.volume = 0;
                video.oncanplay = function() {
                    var s = videoTrack.getSettings();
                    var width = this.width;
                    var height = this.height;
                    var aspectRatio = additionalStream ? (s.aspectRatio || (s.width / s.height)) : aspectRatio;
                    if (typeof self.__addedStreamOptions !== 'undefined') {
                        if (!self.__addedStreamOptions._isTrueHeight && additionalStream && aspectRatio) {
                            height = aspectRatio > 1.00 ?
                                (width / aspectRatio).toFixed(2) :
                                (width * aspectRatio).toFixed(2);
                            self.__addedStreamOptions.height = height;
                            self.updateMultiStreamPosition();
                        }
                    }
                    var values = {
                        track: videoTrack,
                        isMainScreen: additionalStream,
                        settings: {
                            videoWidth: additionalStream ? width : self._videoTrackSettings.videoElement.width,
                            videoHeight: additionalStream ? height : self._videoTrackSettings.videoElement.height,
                            streamWidth: additionalStream ? s.width : self._videoTrackSettings.width,
                            streamHeight: additionalStream ? s.height : self._videoTrackSettings.height,
                            visibleWidth: additionalStream ? (width / slippedFromOrigin.width) : visibleDimensions.width,
                            visibleHeight: additionalStream ? (height / slippedFromOrigin.height) : visibleDimensions.height,
                            deviceId: s.deviceId,
                            aspectRatio: aspectRatio
                        }
                    };

                    if (additionalStream)
                        self.__multiStreamVideoSettings.smallStream = values;
                    else
                        self.__multiStreamVideoSettings.mainStream = values;
                    this.play();
                };
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
                framerate: this._options.framerate,
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
                return options.webrtcStreaming && PeerRecorder.supported();
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
                audioonly: !this._options.recordVideo,
                cpuFriendly: this._options.cpuFriendly
            });
            this._recorder.on("dataavailable", function(e) {
                this.trigger("dataavailable", e);
            }, this);
            this._recorder.on("data", function(blob) {
                this._dataAvailable(blob);
            }, this);
        },

        _unboundMedia: function() {
            this._recorder.destroy();
            if (this._drawingStream)
                this._initCanvasStreamSettings();
        },

        _startRecord: function() {
            return this._recorder.start();
        },

        _stopRecord: function() {
            this._recorder.stop();
        },

        canPause: function() {
            return true;
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