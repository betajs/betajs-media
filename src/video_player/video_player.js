Scoped.define("module:Player.VideoPlayerWrapper", [
    "base:Classes.OptimisticConditionalInstance",
    "base:Events.EventsMixin",
    "base:MediaTypes",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "browser:Events"
], function(OptimisticConditionalInstance, EventsMixin, MediaTypes, Types, Objs, Strings, DomEvents, scoped) {
    return OptimisticConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options, transitionals) {
                inherited.constructor.call(this);
                options = Objs.extend(Objs.clone(options || {}, 1), transitionals);
                this._poster = options.poster || null;
                var sources = options.source || options.sources || [];
                if (Types.is_string(sources))
                    sources = sources.split(" ");
                else if (!Types.is_array(sources))
                    sources = [sources];
                this._onlyAudio = false;
                if (typeof options.onlyaudio !== 'undefined')
                    this._onlyAudio = options.onlyaudio;
                var sourcesMapped = [];
                Objs.iter(sources, function(source) {
                    if (Types.is_string(source))
                        source = {
                            src: source.trim()
                        };
                    else if (typeof Blob !== 'undefined' && source instanceof Blob)
                        source = {
                            src: source
                        };
                    if (source.ext && !source.type)
                        source.type = MediaTypes.getType(source.ext);
                    if (!source.ext && source.type)
                        source.ext = MediaTypes.getExtension(source.type);
                    if (!source.ext && !source.type && Types.is_string(source.src)) {
                        var temp = Strings.splitFirst(source.src, "?").head;
                        if (temp.indexOf(".") >= 0) {
                            source.ext = Strings.last_after(temp, ".");
                            source.type = MediaTypes.getType(source.ext);
                        }
                    }
                    if (source.ext)
                        source.ext = source.ext.toLowerCase();
                    if (source.type)
                        source.type = source.type.toLowerCase();
                    var audioSource = null;
                    if (typeof source.audiosrc !== 'undefined')
                        audioSource = source.audiosrc;
                    if (typeof Blob !== 'undefined' && source.src instanceof Blob)
                        source.src = (this._onlyAudio && audioSource) ?
                        (window.URL || window.webkitURL).createObjectURL(audioSource) :
                        (window.URL || window.webkitURL).createObjectURL(source.src);
                    if (typeof Blob !== 'undefined' && source.audiosrc instanceof Blob)
                        source.audiosrc = (window.URL || window.webkitURL).createObjectURL(source.audiosrc);
                    sourcesMapped.push(source);
                }, this);
                this._sources = sourcesMapped;
                this._element = options.element;
                this._preload = options.preload || false;
                this._reloadonplay = options.reloadonplay || false;
                this._options = options;
                this._loop = options.loop || false;
                this._fullscreenedElement = options.fullscreenedElement;
                this._preloadMetadata = options.loadmetadata || false;
                this._loaded = false;
                this._postererror = false;
                this._error = 0;
                this._domEvents = new DomEvents();
                this._broadcastingState = {
                    googleCastConnected: false,
                    airplayConnected: false
                };
            },

            destroy: function() {
                this._domEvents.destroy();
                inherited.destroy.call(this);
            },

            poster: function() {
                return this._poster;
            },

            sources: function() {
                return this._sources;
            },

            loaded: function() {
                return this._loaded;
            },

            postererror: function() {
                return this._postererror;
            },

            buffered: function() {},

            /**
             * @param {Event} ev
             * @private
             */
            _eventLoaded: function(ev) {
                this._loaded = true;
                this.trigger("loaded");
            },

            /**
             * @param {Event} ev
             * @private
             */
            _eventLoadedMetaData: function(ev) {
                this._hasMetadata = true;
                this.trigger("loadedmetadata", ev);
            },

            /**
             * @param {HTMLImageElement} image
             * @private
             */
            _eventPosterLoaded: function(image) {
                this.trigger("posterloaded", image);
            },


            _eventPlaying: function() {
                if (!this._loaded)
                    this._eventLoaded();
                this.trigger("playing");
            },

            _eventPaused: function() {
                if (this.duration() && this.duration() === this.position())
                    return;
                this.trigger("paused");
            },

            _eventEnded: function() {
                this.trigger("ended");
            },

            _eventError: function(error) {
                this._error = error;
                this.trigger("error", error);
            },

            _eventPosterError: function() {
                this._postererror = true;
                this.trigger("postererror");
            },

            supportsFullscreen: function() {
                return false;
            },

            duration: function() {
                return this._element.duration;
            },

            position: function() {
                return this._element.currentTime;
            },

            enterFullscreen: function() {},

            exitFullscreen: function() {},

            isFullscreen: function() {
                return false;
            },

            supportsPIP: function() {
                return false;
            },

            enterPIPMode: function() {},

            exitPIPMode: function() {},

            isInPIPMode: function() {
                return false;
            },

            error: function() {
                return this._error;
            },

            play: function() {
                if (this._reloadonplay) {
                    if (this._hls) this._hls.startLoad();
                    else this._element.load();
                }
                this._reloadonplay = false;
                try {
                    var result = this._element.play();
                    if (result['catch'])
                        result['catch'](function() {});
                } catch (e) {}
            },

            pause: function() {
                this._element.pause();
            },

            setPosition: function(position) {
                this._element.currentTime = position;
            },

            muted: function() {
                return this._element.muted;
            },

            setMuted: function(muted) {
                this._element.muted = muted;
            },

            volume: function() {
                return this._element.volume;
            },

            setVolume: function(volume) {
                this._element.volume = volume;
            },

            videoWidth: function() {},

            videoHeight: function() {},

            createSnapshotPromise: function(type) {}

        };
    }], {

        ERROR_NO_PLAYABLE_SOURCE: 1

    });
});


Scoped.define("module:Player.Html5VideoPlayerWrapper", [
    "module:HlsSupportMixin",
    "module:Common.Video.PixelSampleMixin",
    "module:Player.VideoPlayerWrapper",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "base:Strings",
    "base:Async",
    "browser:Dom",
    "browser:Events"
], function(HlsSupportMixin, PixelSampleMixin, VideoPlayerWrapper, Info, Promise, Objs, Timer, Strings, Async, Dom, DomEvents, scoped) {
    return VideoPlayerWrapper.extend({
        scoped: scoped
    }, [HlsSupportMixin, PixelSampleMixin, function(inherited) {
        return {

            _initialize: function() {
                if (this._options.nohtml5)
                    return Promise.error(true);
                if (this._sources.length < 1)
                    return Promise.error(true);
                if (Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)
                    return Promise.error(true);
                var promise = Promise.create();
                this._element.innerHTML = "";
                var sources = this.sources();
                var blobSource = sources[0].src.indexOf("blob:") === 0 ? sources[0].src : false;
                var ie9 = (Info.isInternetExplorer() && Info.internetExplorerVersion() == 9) || Info.isWindowsPhone();
                if (this._element.tagName.toLowerCase() !== "video") {
                    this._element = Dom.changeTag(this._element, "video");
                    this._transitionals.element = this._element;
                } else if (ie9) {
                    var str = Strings.splitLast(this._element.outerHTML, "</video>").head;
                    Objs.iter(sources, function(source) {
                        str += "<source" + (source.type ? " type='" + source.type + "'" : "") + " src='" + source.src + "' />";
                    });
                    str += "</video>";
                    var replacement = Dom.elementByTemplate(str);
                    Dom.elementInsertAfter(replacement, this._element);
                    this._element.parentNode.removeChild(this._element);
                    this._element = replacement;
                    this._transitionals.element = this._element;
                }
                if (Info.isSafari() && Info.safariVersion() < 6) {
                    this._element.src = sources[0].src;
                    this._preload = true;
                }
                /*
                var loadevent = "loadedmetadata";
                if (Info.isSafari() && Info.safariVersion() < 9)
                	loadevent = "loadstart";
                	*/
                var loadevent = "loadstart";
                this._domEvents.on(this._element, loadevent, function() {
                    if ( /*loadevent === "loadstart" && */ this._element.networkState === this._element.NETWORK_NO_SOURCE) {
                        promise.asyncError(true);
                        return;
                    }
                    promise.asyncSuccess(true);
                }, this);
                var nosourceCounter = 10;
                var timer = new Timer({
                    context: this,
                    fire: function() {
                        if (this._element.networkState === this._element.NETWORK_NO_SOURCE) {
                            nosourceCounter--;
                            if (nosourceCounter <= 0)
                                promise.asyncError(true);
                        } else if (this._element.networkState === this._element.NETWORK_IDLE)
                            promise.asyncSuccess(true);
                        else if (this._element.networkState === this._element.NETWORK_LOADING) {
                            if (Info.isEdge() || Info.isInternetExplorer())
                                promise.asyncSuccess(true);
                            else if (Info.isFirefox() && !!blobSource)
                                promise.asyncSuccess(true);
                        }
                    },
                    delay: 50
                });
                var _preloadOption = this._preloadMetadata ? "metadata" : "none";
                this._element.preload = this._preload ? "auto" : _preloadOption;
                // Replaced with ended -> play way, to be able get ended listener
                // Left here to inform don't do on this way in the future
                // if (this._loop)
                //     this._element.loop = "loop";
                var errorCount = 0;
                this._audioElement = null;
                var errorEvents = new DomEvents();
                if (blobSource) {
                    this._element.src = blobSource;
                } else if (!ie9) {
                    Objs.iter(sources, function(source) {
                        var sourceEl = document.createElement("source");
                        if (source.ext === "m3u8" && !this._element.canPlayType(source.type || "application/vnd.apple.mpegURL")) {
                            this._lazyLoadHls().success(function(isSupported) {
                                if (isSupported)
                                    this._loadHls(source).forwardSuccess(promise);
                            }, this);
                            return;
                            /*
                            if (this._hlsIsSupported()) {
                                this._loadHls(source).forwardSuccess(promise);
                                return;
                            }
                            if (this._element instanceof HTMLMediaElement)
                                if (!this._element.canPlayType(source.type)) return;
                                else return;

                             */
                        }
                        if (source.type)
                            sourceEl.type = source.type;
                        this._element.appendChild(sourceEl);
                        errorEvents.on(sourceEl, "error", function() {
                            errorCount++;
                            if (errorCount === sources.length)
                                promise.asyncError(true);
                        });
                        sourceEl.src = source.src;
                        if (source.audiosrc) {
                            if (!this._audioElement) {
                                this._audioElement = document.createElement("audio");
                                Dom.elementInsertAfter(this._audioElement, this._element);
                            }
                            var audioSourceEl = document.createElement("source");
                            if (source.type)
                                audioSourceEl.type = source.type;
                            this._audioElement.appendChild(audioSourceEl);
                            audioSourceEl.src = source.audiosrc;
                        }
                    }, this);
                } else {
                    var sourceEls = this._element.getElementsByTagName("SOURCE");
                    var cb = function() {
                        errorCount++;
                        if (errorCount === sources.length)
                            promise.asyncError(true);
                    };
                    for (var i = 0; i < sourceEls.length; ++i) {
                        errorEvents.on(sourceEls[i], "error", cb);
                    }
                }
                if (this.poster())
                    this._element.poster = this.posterURL();
                promise.callback(function() {
                    errorEvents.weakDestroy();
                    timer.destroy();
                }, this);
                promise.success(function() {
                    this._setup();
                }, this);
                try {
                    if (!Info.isChrome())
                        this._element.load();
                } catch (e) {}
                return promise;
            },

            posterURL: function() {
                var poster = this.poster();
                if (poster && typeof Blob !== 'undefined' && poster instanceof Blob)
                    return (window.URL || window.webkitURL).createObjectURL(poster);
                return poster;
            },

            destroy: function() {
                if (this._hls) this._hls.destroy();
                if (this._audioElement)
                    this._audioElement.remove();
                if (this.supportsFullscreen() && this.__fullscreenListener)
                    Dom.elementOffFullscreenChange(this._element, this.__fullscreenListener);
                if (this.supportsPIP() && this.__pipListener)
                    Dom.videoRemovePIPChangeListeners(this._element, this.__pipListener);
                if (!Info.isInternetExplorer() || Info.internetExplorerVersion() > 8)
                    this._element.innerHTML = "";
                inherited.destroy.call(this);
            },

            _eventEnded: function() {
                // As during loop we will play player after ended event fire, need initial cover will be hidden
                if (this._loop)
                    this.play();
                inherited._eventEnded.call(this);
            },

            _setup: function() {
                this._loaded = false;
                this._domEvents.on(this._element, "canplay", this._eventLoaded, this);
                this._domEvents.on(this._element, "loadedmetadata", this._eventLoadedMetaData, this);
                this._domEvents.on(this._element, "playing", this._eventPlaying, this);
                this._domEvents.on(this._element, "pause", this._eventPaused, this);
                this._domEvents.on(this._element, "ended", this._eventEnded, this);
                var self = this;
                var sourceEls = this._element.getElementsByTagName("SOURCE");
                var cb = function() {
                    this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                };
                for (var i = 0; i < sourceEls.length; ++i) {
                    this._domEvents.on(sourceEls[i], "error", cb, this);
                }
                if (this.poster()) {
                    var image = new Image();
                    image.onerror = function() {
                        delete self._element.poster;
                        delete self._element.preload;
                        self._eventPosterError();
                    };
                    image.src = this.posterURL();
                    image.onload = function() {
                        self.__imageWidth = image.width;
                        self.__imageHeight = image.height;
                        self._eventPosterLoaded(this);
                    };
                }
                if (Info.isSafari() && (Info.safariVersion() > 5 || Info.safariVersion() < 9)) {
                    if (this._element.networkState === this._element.NETWORK_LOADING) {
                        Async.eventually(function() {
                            if (!this.destroyed() && this._element.networkState === this._element.NETWORK_LOADING && this._element.buffered.length === 0)
                                this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                        }, this, 10000);
                    }
                }
                if (this.supportsFullscreen()) {
                    this.__videoClassBackup = "";
                    var fullscreenedElement = this._fullscreenedElement || this._element;
                    this.__fullscreenListener = Dom.elementOnFullscreenChange(fullscreenedElement, function(element, inFullscreen) {
                        this.trigger("fullscreen-change", inFullscreen);
                        if (inFullscreen) {
                            this.__videoClassBackup = this._element.className;
                            this._element.className = "";
                        } else {
                            this._element.className = this.__videoClassBackup;
                            this.__videoClassBackup = "";
                        }
                    }, this);
                }
                if (this.supportsPIP() && ('pictureInPictureElement' in document)) {
                    this.__pipListener = Dom.videoAddPIPChangeListeners(this._element, function(element, inPIPMode) {
                        this.trigger("pip-mode-change", element, inPIPMode);
                    }, this);
                }
            },

            buffered: function() {
                return this._element.buffered.end(0);
            },

            // Element argument or this._element.parent* has to be top layer (https://fullscreen.spec.whatwg.org/#top-layer)
            // The z-index property has no effect in the top layer.
            _fullscreenElement: function(element) {
                //fullscreen issue was present on Chromium based browsers. Could recreate on Iron and Chrome.
                if (Info.isChromiumBased() && !Info.isMobile()) {
                    return element || this._element.parentNode;
                }

                return Info.isFirefox() ?
                    element || this._element.parentElement :
                    element || this._element;
            },

            supportsFullscreen: function(element) {
                return Dom.elementSupportsFullscreen(this._fullscreenElement(element));
            },

            enterFullscreen: function(element) {
                Dom.elementEnterFullscreen(this._fullscreenElement(element));
            },

            exitFullscreen: function() {
                Dom.documentExitFullscreen();
            },

            isFullscreen: function(element) {
                return Dom.elementIsFullscreen(this._fullscreenElement(element));
            },
            supportsPIP: function() {
                return Dom.browserSupportsPIP(this._element);
            },

            enterPIPMode: function(element) {
                Dom.videoElementEnterPIPMode(this._element);
            },

            exitPIPMode: function() {
                Dom.videoElementExitPIPMode(this._element);
            },

            isInPIPMode: function() {
                return Dom.videoIsInPIPMode(this._element);
            },

            videoWidth: function() {
                return this._element.width || this.__imageWidth || NaN;
            },

            videoHeight: function() {
                return this._element.height || this.__imageHeight || NaN;
            },

            play: function() {
                inherited.play.call(this);
                if (this._audioElement) {
                    if (this._reloadonplay)
                        this._audioElement.load();
                    this._audioElement.play();
                }
            },

            pause: function() {
                this._element.pause();
                if (this._audioElement)
                    this._audioElement.pause();
            },

            setPosition: function(position) {
                this._element.currentTime = position;
                if (this._audioElement)
                    this._audioElement.currentTime = position;
            },

            setSpeed: function(speed) {
                if (speed < 0.5 && speed > 4.0) {
                    console.warn('Maximum allowed speed range is from 0.5 to 4.0');
                    return;
                }
                this._element.playbackRate = speed;
                if (this._audioElement)
                    this._audioElement.playbackRate = speed;
            },

            muted: function() {
                return (this._audioElement ? this._audioElement : this._element).muted;
            },

            setMuted: function(muted) {
                (this._audioElement ? this._audioElement : this._element).muted = muted;
            },

            volume: function() {
                return (this._audioElement ? this._audioElement : this._element).volume;
            },

            setVolume: function(volume) {
                (this._audioElement ? this._audioElement : this._element).volume = volume;
            },

            /**
             * Create snapshot of current frame.
             * @param {string} [type] - String representing the image format.
             * @return {Promise<Blob>}
             */
            createSnapshotPromise: function(type) {
                var video = this._element;
                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                function isCanvasBlank(canvas) {
                    var context = canvas.getContext('2d');

                    var pixelBuffer = new Uint32Array(
                        context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
                    );

                    return !pixelBuffer.some(function(color) {
                        return color !== 0;
                    });
                }

                if (!isCanvasBlank(canvas)) {
                    var promise = Promise.create();
                    canvas.toBlob(function(blob) {
                        promise.asyncSuccess(blob);
                    }, type);
                    return promise;
                } else {
                    return Promise.error(true);
                }
            }

        };
    }]);
});


Scoped.extend("module:Player.VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "module:Player.Html5VideoPlayerWrapper"
], function(VideoPlayerWrapper, Html5VideoPlayerWrapper) {
    VideoPlayerWrapper.register(Html5VideoPlayerWrapper, 2);
    return {};
});