Scoped.define("module:Player.VideoPlayerWrapper", [
    "base:Classes.OptimisticConditionalInstance",
    "base:Events.EventsMixin",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "browser:Events"
], function(OptimisticConditionalInstance, EventsMixin, Types, Objs, Strings, DomEvents, scoped) {
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
                        source.type = "video/" + source.ext;
                    if (!source.ext && source.type)
                        source.ext = Strings.last_after(source.type, "/");
                    if (!source.ext && !source.type && Types.is_string(source.src)) {
                        var temp = Strings.splitFirst(source.src, "?").head;
                        if (temp.indexOf(".") >= 0) {
                            source.ext = Strings.last_after(temp, ".");
                            source.type = "video/" + source.ext;
                        }
                    }
                    if (source.ext)
                        source.ext = source.ext.toLowerCase();
                    if (source.type)
                        source.type = source.type.toLowerCase();
                    if (typeof Blob !== 'undefined' && source.src instanceof Blob)
                        source.src = (window.URL || window.webkitURL).createObjectURL(source.src);
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

            _eventLoaded: function() {
                this._loaded = true;
                this.trigger("loaded");
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

            error: function() {
                return this._error;
            },

            play: function() {
                if (this._reloadonplay)
                    this._element.load();
                this._reloadonplay = false;
                this._element.play();
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

            videoHeight: function() {}

        };
    }], {

        ERROR_NO_PLAYABLE_SOURCE: 1,
        ERROR_FLASH_NOT_INSTALLED: 2

    });
});


Scoped.define("module:Player.Html5VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "base:Strings",
    "base:Async",
    "browser:Dom",
    "browser:Events"
], function(VideoPlayerWrapper, Info, Promise, Objs, Timer, Strings, Async, Dom, DomEvents, scoped) {
    return VideoPlayerWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _initialize: function() {
                if (this._options.nohtml5)
                    return Promise.error(true);
                if (this._sources.length < 1)
                    return Promise.error(true);
                if (Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)
                    return Promise.error(true);
                if (this._options.forceflash)
                    return Promise.error(true);
                var self = this;
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
                this._domEvents.on(this._element, "loadevent", function() {
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
                this._element.preload = this._preload ? "auto" : "none";
                if (this._loop)
                    this._element.loop = "loop";
                var errorCount = 0;
                this._audioElement = null;
                var errorEvents = new DomEvents();
                if (blobSource) {
                    this._element.src = blobSource;
                } else if (!ie9) {
                    Objs.iter(sources, function(source) {
                        var sourceEl = document.createElement("source");
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
                if (this._audioElement)
                    this._audioElement.remove();
                if (this.supportsFullscreen() && this.__fullscreenListener)
                    Dom.elementOffFullscreenChange(this._element, this.__fullscreenListener);
                if (!Info.isInternetExplorer() || Info.internetExplorerVersion() > 8)
                    this._element.innerHTML = "";
                inherited.destroy.call(this);
            },

            _setup: function() {
                this._loaded = false;
                this._domEvents.on(this._element, "canplay", this._eventLoaded, this);
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
                    this.__fullscreenListener = Dom.elementOnFullscreenChange(this._element, function(element, inFullscreen) {
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
            },

            buffered: function() {
                return this._element.buffered.end(0);
            },

            _fullscreenElement: function() {
                //fullscreen issue was present on Chromium based browsers. Could recreate on Iron and Chrome.
                if (Info.isChromiumBased() && !Info.isMobile()) {
                    return this._element.parentNode;
                }

                return Info.isFirefox() ? this._element.parentElement : this._element;
            },

            supportsFullscreen: function() {
                return Dom.elementSupportsFullscreen(this._fullscreenElement());
            },

            enterFullscreen: function() {
                Dom.elementEnterFullscreen(this._fullscreenElement());
            },

            exitFullscreen: function() {
                Dom.documentExitFullscreen();
            },

            isFullscreen: function() {
                return Dom.elementIsFullscreen(this._fullscreenElement());
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
            }

        };
    });
});


Scoped.define("module:Player.FlashPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "module:Player.FlashPlayer",
    "browser:Info",
    "base:Promise",
    "browser:Dom"
], function(VideoPlayerWrapper, FlashPlayer, Info, Promise, Dom, scoped) {
    return VideoPlayerWrapper.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _initialize: function() {
                if (this._options.noflash)
                    return Promise.error(true);
                if (this._sources.length < 1)
                    return Promise.error(true);
                if (Info.isMobile() || !Info.flash().supported())
                    return Promise.error(true);
                if (!Info.flash().installed() && this._options.flashinstallrequired)
                    return Promise.error(true);
                if (!Info.flash().installed()) {
                    this._eventError(this.cls.ERROR_NO_FLASH_INSTALLED);
                    return Promise.value(true);
                }
                var self = this;
                var promise = Promise.create();
                if (this._element.tagName.toLowerCase() !== "div") {
                    this._element = Dom.changeTag(this._element, "div");
                    this._transitionals.element = this._element;
                }
                var opts = {
                    poster: this.poster(),
                    sources: this.sources()
                };
                if (this._loop)
                    opts.loop = true;
                this._flashPlayer = new FlashPlayer(this._element, opts);
                return this._flashPlayer.ready.success(function() {
                    this._setup();
                }, this);
            },

            destroy: function() {
                if (this._flashPlayer)
                    this._flashPlayer.weakDestroy();
                this._element.innerHTML = "";
                inherited.destroy.call(this);
            },

            _setup: function() {
                this._loaded = true;
                this._eventLoaded();
                this._domEvents.on(this._element, "playing", this._eventPlaying, this);
                this._domEvents.on(this._element, "pause", this._eventPaused, this);
                this._domEvents.on(this._element, "ended", this._eventEnded, this);
                this._domEvents.on(this._element, "videoerror", function() {
                    this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                }, this);
                this._domEvents.on(this._element, "postererror", this._eventPosterError, this);
            },

            position: function() {
                return this._element.get("currentTime");
            },

            buffered: function() {
                return this.position();
            },

            setPosition: function(position) {
                this._element.set("currentTime", position);
            },

            setVolume: function(volume) {
                this._element.set("volume", volume);
            },

            videoWidth: function() {
                return this._flashPlayer ? this._flashPlayer.videoWidth() : null;
            },

            videoHeight: function() {
                return this._flashPlayer ? this._flashPlayer.videoHeight() : null;
            }

        };
    });
});



Scoped.extend("module:Player.VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "module:Player.Html5VideoPlayerWrapper"
], function(VideoPlayerWrapper, Html5VideoPlayerWrapper) {
    VideoPlayerWrapper.register(Html5VideoPlayerWrapper, 2);
    return {};
});


Scoped.extend("module:Player.VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "module:Player.FlashPlayerWrapper"
], function(VideoPlayerWrapper, FlashPlayerWrapper) {
    VideoPlayerWrapper.register(FlashPlayerWrapper, 1);
    return {};
});