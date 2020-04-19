Scoped.define("module:WebRTC.Support", [
    "base:Promise",
    "base:Objs",
    "browser:Info",
    "browser:Dom",
    "base:Time"
], function(Promise, Objs, Info, Dom, Time) {
    return {

        canvasSupportsImageFormat: function(imageFormat) {
            try {
                var data = document.createElement('canvas').toDataURL(imageFormat);
                var headerIdx = data.indexOf(";");
                return data.substring(0, data.indexOf(";")).indexOf(imageFormat) != -1;
            } catch (e) {
                return false;
            }
        },

        getGlobals: function() {
            var getUserMedia = null;
            var getUserMediaCtx = null;

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                getUserMedia = navigator.mediaDevices.getUserMedia;
                getUserMediaCtx = navigator.mediaDevices;
            } else {
                getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
                getUserMediaCtx = navigator;
            }

            var URL = window.URL || window.webkitURL;
            var MediaRecorder = window.MediaRecorder;
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                Dom.userInteraction(function() {
                    if (!this.__globals)
                        return;
                    this.__globals.audioContext = new AudioContext();
                }, this);
            }
            var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
            var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
            var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
            return {
                getUserMedia: getUserMedia,
                getUserMediaCtx: getUserMediaCtx,
                URL: URL,
                MediaRecorder: MediaRecorder,
                AudioContext: AudioContext,
                audioContextScriptProcessor: function() {
                    return (this.createScriptProcessor || this.createJavaScriptNode).apply(this, arguments);
                },
                webpSupport: this.canvasSupportsImageFormat("image/webp"),
                RTCPeerConnection: RTCPeerConnection,
                RTCIceCandidate: RTCIceCandidate,
                RTCSessionDescription: RTCSessionDescription,
                WebSocket: window.WebSocket,
                supportedConstraints: navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints ? navigator.mediaDevices.getSupportedConstraints() : {}
            };
        },

        globals: function() {
            if (!this.__globals)
                this.__globals = this.getGlobals();
            return this.__globals;
        },

        userMediaSupported: function() {
            return !!this.globals().getUserMedia;
        },

        enumerateMediaSources: function() {
            var promise = Promise.create();
            var promiseCallback = function(sources) {
                var result = {
                    audio: {},
                    audioCount: 0,
                    video: {},
                    videoCount: 0
                };
                Objs.iter(sources, function(source) {
                    // Capabilities method which will show more detailed information about device
                    // https://www.chromestatus.com/feature/5145556682801152 - Status of the feature
                    var _sourceCapabilities;
                    if (source.kind.indexOf("video") === 0) {
                        result.videoCount++;
                        if (typeof source.getCapabilities !== 'undefined')
                            _sourceCapabilities = source.getCapabilities();
                        result.video[source.id || source.deviceId] = {
                            id: source.id || source.deviceId,
                            label: source.label,
                            capabilities: _sourceCapabilities
                        };
                    }
                    if (source.kind.indexOf("audio") === 0) {
                        result.audioCount++;
                        if (typeof source.getCapabilities !== 'undefined')
                            _sourceCapabilities = source.getCapabilities();
                        result.audio[source.id || source.deviceId] = {
                            id: source.id || source.deviceId,
                            label: source.label,
                            capabilities: _sourceCapabilities
                        };
                    }
                });
                promise.asyncSuccess(result);
            };
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
                    navigator.mediaDevices.enumerateDevices().then(promiseCallback);
                else if (MediaStreamTrack && MediaStreamTrack.getSources)
                    MediaStreamTrack.getSources(promiseCallback);
                else
                    promise.asyncError("Unsupported");
            } catch (e) {
                promise.asyncError(e);
            }
            return promise;
        },

        streamQueryResolution: function(stream) {
            var promise = Promise.create();
            var video = this.bindStreamToVideo(stream);
            video.addEventListener("playing", function() {
                setTimeout(function() {
                    promise.asyncSuccess({
                        stream: stream,
                        width: video.videoWidth,
                        height: video.videoHeight
                    });
                    video.remove();
                }, 500);
            });
            return promise;
        },

        chromeExtensionMessage: function(extensionId, data) {
            var promise = Promise.create();
            chrome.runtime.sendMessage(extensionId, data, promise.asyncSuccessFunc());
            return promise;
        },

        chromeExtensionExtract: function(meta) {
            var result = {};
            if (Info.isChrome()) {
                result.extensionId = meta.chromeExtensionId;
                result.extensionInstallLink = meta.chromeExtensionInstallLink;
            } else if (Info.isOpera()) {
                result.extensionId = meta.operaExtensionId;
                result.extensionInstallLink = meta.operaExtensionInstallLink;
            }
            return result;
        },

        userMedia: function(options) {
            var promise = Promise.create();
            var result = this.globals().getUserMedia.call(this.globals().getUserMediaCtx, options, function(stream) {
                promise.asyncSuccess(stream);
            }, function(e) {
                promise.asyncError(e);
            });
            try {
                if (result.then) {
                    result.then(function(stream) {
                        promise.asyncSuccess(stream);
                    });
                }
                if (result["catch"]) {
                    result["catch"](function(e) {
                        promise.asyncError(e);
                    });
                }
            } catch (e) {}
            return promise;
        },

        /*
         * audio: {} | undefined
         * video: {} | undefined
         * 	  width, height, aspectRatio
         * screen: true | {chromeExtensionId, operaExtensionId} | false
         */
        userMedia2: function(options) {
            var opts = {};
            var promise;
            if (options.audio)
                opts.audio = options.audio;
            if (options.screen && !options.video)
                options.video = {};
            if (!options.video)
                return this.userMedia(opts);
            if (options.screen) {
                options.video.width = options.video.width || window.innerWidth || document.body.clientWidth;
                options.video.height = options.video.height || window.innerHeight || document.body.clientHeight;
            }
            if (Info.isiOS()) {
                opts.video = {};
                if (options.video.width)
                    opts.video.width = options.video.width;
                if (options.video.height)
                    opts.video.height = options.video.height;
                if (options.video.frameRate)
                    opts.video.frameRate = options.video.frameRate;
                if (options.video.cameraFaceFront !== undefined)
                    opts.video.facingMode = {
                        exact: options.video.cameraFaceFront ? "user" : "environment"
                    };
                return this.userMedia(opts);
            } else if (options.screen && typeof navigator.mediaDevices.getDisplayMedia !== 'undefined') {
                /**
                 * https://w3c.github.io/mediacapture-screen-share/#constrainable-properties-for-captured-display-surfaces
                 * partial interface MediaDevices {
                 *    Promise<MediaStream> getDisplayMedea(optional DisplayMediaStreamConstraints constraints = {});
                 * };
                 * enum DisplayCaptureSurfaceType { "monitor", "window", "application", "browser"};
                 * enum CursorCaptureConstraint { "never", "always", "motion" };
                 */
                promise = Promise.create();
                var _self = this;
                if (typeof options.video.resizeMode === 'undefined')
                    options.video.resizeMode = 'none';
                var videoOptions = {
                    cursor: 'motion',
                    resizeMode: options.video.resizeMode,
                    displaySurface: 'application'
                };
                if (parseInt(options.video.width, 10) > 0) {
                    videoOptions.width = parseInt(options.video.width, 10);
                }
                if (parseInt(options.video.height, 10) > 0) {
                    videoOptions.height = parseInt(options.video.height, 10);
                }
                var displayMediaPromise = navigator.mediaDevices.getDisplayMedia({
                    video: videoOptions,
                    audio: true
                });
                displayMediaPromise.then(function(videoStream) {
                    if (videoStream.getAudioTracks().length < 1) {
                        _self.userMedia({
                                video: false,
                                audio: true
                            })
                            .mapError(function(err) {
                                promise.asyncSuccess(videoStream);
                            })
                            .mapSuccess(function(audioStream) {
                                promise.asyncSuccess(new MediaStream([videoStream.getTracks()[0], audioStream.getAudioTracks()[0]]));
                            });
                    } else {
                        promise.asyncSuccess(videoStream);
                    }
                });

                // Declaring catch this way will fix IE8 related `SCRIPT1010: Expected identifier`
                displayMediaPromise['catch'](function(err) {
                    promise.asyncError(err);
                });
                return promise;
            } else if (Info.isFirefox()) {
                opts.video = {};
                if (options.screen) {
                    opts.video.mediaSource = "screen";
                    if (!navigator.mediaDevices || !navigator.mediaDevices.getSupportedConstraints || !navigator.mediaDevices.getSupportedConstraints().mediaSource)
                        return Promise.error("This browser does not support screen recording.");
                }
                if (options.video.aspectRatio && !(options.video.width && options.video.height)) {
                    if (options.video.width)
                        options.video.height = Math.round(options.video.width / options.video.aspectRatio);
                    else if (options.video.height)
                        options.video.width = Math.round(options.video.height * options.video.aspectRatio);
                }
                if (options.video.width) {
                    opts.video.width = {
                        ideal: options.video.width
                    };
                }
                if (options.video.height) {
                    opts.video.height = {
                        ideal: options.video.height
                    };
                }
                if (options.video.frameRate) {
                    opts.video.frameRate = {
                        ideal: options.video.frameRate
                    };
                }
                if (options.video.sourceId)
                    opts.video.sourceId = options.video.sourceId;
                if (options.video.cameraFaceFront !== undefined && Info.isMobile())
                    opts.video.facingMode = {
                        exact: options.video.cameraFaceFront ? "user" : "environment"
                    };
                return this.userMedia(opts);
            } else if (Info.isEdge() && options.screen) {
                if (navigator.getDisplayMedia) {
                    promise = Promise.create();
                    var pr = navigator.getDisplayMedia({
                        video: true
                    });
                    pr.then(promise.asyncSuccessFunc());
                    pr['catch'](promise.asyncErrorFunc());
                    return promise;
                } else
                    return Promise.error("This browser does not support screen recording.");
            } else {
                opts.video = {
                    mandatory: {}
                };
                if (options.video.width) {
                    opts.video.mandatory.minWidth = options.video.width;
                    opts.video.mandatory.maxWidth = options.video.width;
                }
                if (!options.video.width && options.video.height) {
                    opts.video.mandatory.minHeight = options.video.height;
                    opts.video.mandatory.maxHeight = options.video.height;
                }
                var as = options.video.aspectRatio ? options.video.aspectRatio : (options.video.width && options.video.height ? options.video.width / options.video.height : null);
                if (as) {
                    opts.video.mandatory.minAspectRatio = as;
                    opts.video.mandatory.maxAspectRatio = as;
                }
                if (options.video.sourceId)
                    opts.video.mandatory.sourceId = options.video.sourceId;
                if (options.video.cameraFaceFront !== undefined && Info.isMobile())
                    // The { exact: } syntax means the constraint is required, and things fail if the user doesn't have the right camera.
                    // If you leave it out then the constraint is optional, which in Firefox for Android means it only changes the default
                    // in the camera chooser in the permission prompt.
                    opts.video.mandatory.facingMode = {
                        exact: options.video.cameraFaceFront ? "user" : "environment"
                    };
                if (options.video.frameRate) {
                    opts.video.mandatory.minFrameRate = options.video.frameRate;
                    opts.video.mandatory.maxFrameRate = options.video.frameRate;
                }
                var probe = function(count) {
                    var mandatory = opts.video.mandatory;
                    return this.userMedia(opts).mapError(function(e) {
                        count--;
                        if (e.name !== "ConstraintNotSatisfiedError" && e.name !== "OverconstrainedError")
                            return e;
                        var c = (e.constraintName || e.constraint).toLowerCase();
                        Objs.iter(mandatory, function(value, key) {
                            var lkey = key.toLowerCase();
                            if (lkey.indexOf(c) >= 0) {
                                var flt = lkey.indexOf("aspect") > 0;
                                var d = lkey.indexOf("min") === 0 ? -1 : 1;
                                var u = Math.max(0, mandatory[key] * (1.0 + d / 10));
                                mandatory[key] = flt ? u : Math.round(u);
                                if (count < 0) {
                                    delete mandatory[key];
                                    count = 100;
                                }
                            }
                        }, this);
                        return probe.call(this, count);
                    }, this);
                };
                if (options.screen) {
                    var extensionId = this.chromeExtensionExtract(options.screen).extensionId;
                    if (!extensionId)
                        return Promise.error("This browser does not support screen recording.");
                    var pingTest = Time.now();
                    return this.chromeExtensionMessage(extensionId, {
                        type: "ping",
                        data: pingTest
                    }).mapSuccess(function(pingResponse) {
                        promise = Promise.create();
                        if (!pingResponse || pingResponse.type !== "success" || pingResponse.data !== pingTest)
                            return Promise.error("This browser does not support screen recording.");
                        else
                            promise.asyncSuccess(true);
                        return promise.mapSuccess(function() {
                            return this.chromeExtensionMessage(extensionId, {
                                type: "acquire",
                                sources: ['window', 'screen', 'tab'],
                                url: window.self !== window.top ? window.location.href : null // if recorder is inside of iframe
                            }).mapSuccess(function(acquireResponse) {
                                if (!acquireResponse || acquireResponse.type !== 'success')
                                    return Promise.error("Could not acquire permission to access screen.");
                                opts.video.mandatory.chromeMediaSource = 'desktop';
                                opts.video.mandatory.chromeMediaSourceId = acquireResponse.streamId;
                                delete opts.audio;
                                return probe.call(this, 100).mapSuccess(function(videoStream) {
                                    return !options.audio ? videoStream : this.userMedia({
                                        audio: true
                                    }).mapError(function() {
                                        return Promise.value(videoStream);
                                    }).mapSuccess(function(audioStream) {
                                        try {
                                            return new MediaStream([videoStream.getVideoTracks()[0], audioStream.getAudioTracks()[0]]);
                                        } catch (e) {
                                            return videoStream;
                                        }
                                    });
                                }, this);
                            }, this);
                        }, this);
                    }, this);
                }
                return probe.call(this, 100);
            }
        },

        /**
         * @param {MediaStream} stream
         * @param {Array} sourceTracks
         */
        stopUserMediaStream: function(stream, sourceTracks) {
            var stopped = false;
            try {
                if (stream.getTracks) {
                    stream.getTracks().forEach(function(track) {
                        track.stop();
                        stopped = true;
                    });
                }
                // In multi stream above stream contains newly generated canvas stream
                // but missing source streams which generated that canvas stream
                // So, we have to stop them also
                if (sourceTracks.length > 0) {
                    Objs.iter(sourceTracks, function(track) {
                        track.stop();
                        stopped = true;
                    }, this);
                }
            } catch (e) {}
            try {
                if (!stopped && stream.stop)
                    stream.stop();
            } catch (e) {}
        },

        bindStreamToVideo: function(stream, video, flip) {
            if (!video)
                video = document.createElement("video");
            video.volume = 0;
            video.muted = true;
            if ('mozSrcObject' in video)
                video.mozSrcObject = stream;
            else if ('srcObject' in video)
                video.srcObject = stream;
            else
                video.src = this.globals().URL.createObjectURL(stream);
            if (flip) {
                video.style["-moz-transform"] = "scale(-1, 1)";
                video.style["-webkit-transform"] = "scale(-1, 1)";
                video.style["-o-transform"] = "scale(-1, 1)";
                video.style.transform = "scale(-1, 1)";
                video.style.filter = "FlipH";
            } else {
                delete video.style["-moz-transform"];
                delete video.style["-webkit-transform"];
                delete video.style["-o-transform"];
                delete video.style.transform;
                delete video.style.filter;
            }
            video.autoplay = true;
            video.play();
            return video;
        },

        dataURItoBlob: function(dataURI) {
            // If dataURI is empty return empty
            if (dataURI === '') return;
            // convert base64 to raw binary data held in a string
            var byteString = atob(dataURI.split(',')[1]);

            // separate out the mime component
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

            // write the bytes of the string to an ArrayBuffer
            var arrayBuffer = new ArrayBuffer(byteString.length);
            var _ia = new Uint8Array(arrayBuffer);
            for (var i = 0; i < byteString.length; i++)
                _ia[i] = byteString.charCodeAt(i);
            var dataView = new DataView(arrayBuffer);
            var blob = new Blob([dataView], {
                type: mimeString
            });
            return blob;
        },

        errorHandler: function(err) {
            switch (err) {
                case 'NotReadableError':
                case 'TrackStartError':
                    return {
                        key: 'device-already-in-use',
                        message: 'Web camera or microphone are already in use',
                        userLevel: true
                    };
                case 'NotFoundError':
                case 'DevicesNotFoundError':
                    return {
                        key: 'missing-track',
                        message: 'Required audio or video track is missing',
                        userLevel: true
                    };
                case 'OverconstrainedError':
                case 'ConstraintNotSatisfiedError':
                    return {
                        key: 'constrains-error',
                        message: 'Constraints can not be satisfied by available devices',
                        userLevel: false
                    };
                case 'NotAllowedError':
                case 'PermissionDeniedError':
                    return {
                        key: 'browser-permission-denied',
                        message: 'Permission denied by browser, please grant access to proceed',
                        userLevel: true
                    };
                case 'TypeError':
                    return {
                        key: 'empty-constraints',
                        message: 'Empty constraints object',
                        userLevel: false
                    };
                default:
                    return {
                        key: 'unknown-error',
                        message: 'Unknown Error',
                        userLevel: false
                    };
            }
        }
    };
});