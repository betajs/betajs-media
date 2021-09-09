Scoped.define("module:AudioPlayer.AudioPlayerWrapper", [
    "base:Classes.OptimisticConditionalInstance",
    "base:Events.EventsMixin",
    "base:Types",
    "base:Objs",
    "base:Promise",
    "base:Strings",
    "browser:Events"
], function(OptimisticConditionalInstance, EventsMixin, Types, Objs, Promise, Strings, DomEvents, scoped) {
    return OptimisticConditionalInstance.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(options, transitionals) {
                inherited.constructor.call(this);
                options = Objs.extend(Objs.clone(options || {}, 1), transitionals);
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
                        source.type = "audio/" + source.ext;
                    if (!source.ext && source.type)
                        source.ext = Strings.last_after(source.type, "/");
                    if (!source.ext && !source.type && Types.is_string(source.src)) {
                        var temp = Strings.splitFirst(source.src, "?").head;
                        if (temp.indexOf(".") >= 0) {
                            source.ext = Strings.last_after(temp, ".");
                            source.type = "audio/" + source.ext;
                        }
                    }
                    if (source.ext)
                        source.ext = source.ext.toLowerCase();
                    if (source.type)
                        source.type = source.type.toLowerCase();
                    if (typeof Blob !== 'undefined' && source.src instanceof Blob)
                        source.src = (window.URL || window.webkitURL).createObjectURL(source.src);
                    sourcesMapped.push(source);
                }, this);
                this._sources = sourcesMapped;
                this._element = options.element;
                this._preload = options.preload || false;
                this._reloadonplay = options.reloadonplay || false;
                this._options = options;
                this._loop = options.loop || false;
                this._loaded = false;
                this._error = 0;
                this._domEvents = new DomEvents();
            },

            destroy: function() {
                this._domEvents.destroy();
                inherited.destroy.call(this);
            },

            sources: function() {
                return this._sources;
            },

            loaded: function() {
                return this._loaded;
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
                this.trigger("paused");
            },

            _eventEnded: function() {
                // As during loop we will play player after ended event fire, need initial cover will be hidden
                if (this._loop)
                    this.play();
                this.trigger("ended");
            },

            _eventError: function(error) {
                this._error = error;
                this.trigger("error", error);
            },

            duration: function() {
                return this._element.duration;
            },

            position: function() {
                return this._element.currentTime;
            },

            error: function() {
                return this._error;
            },

            play: function() {
                if (this._reloadonplay)
                    this._element.load();
                this._reloadonplay = false;
                var promise = this._element.play();
                if (promise) return Promise.fromNativePromise(promise);
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
            }

        };
    }], {

        ERROR_NO_PLAYABLE_SOURCE: 1

    });
});


Scoped.define("module:AudioPlayer.Html5AudioPlayerWrapper", [
    "module:AudioPlayer.AudioPlayerWrapper",
    "browser:Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "base:Strings",
    "base:Async",
    "browser:Dom",
    "browser:Events"
], function(AudioPlayerWrapper, Info, Promise, Objs, Timer, Strings, Async, Dom, DomEvents, scoped) {
    return AudioPlayerWrapper.extend({
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
                var promise = Promise.create();
                this._element.innerHTML = "";
                var sources = this.sources();
                var ie9 = (Info.isInternetExplorer() && Info.internetExplorerVersion() == 9) || Info.isWindowsPhone();
                if (this._element.tagName.toLowerCase() !== "audio") {
                    this._element = Dom.changeTag(this._element, "audio");
                    this._transitionals.element = this._element;
                } else if (ie9) {
                    var str = Strings.splitLast(this._element.outerHTML, "</audio>").head;
                    Objs.iter(sources, function(source) {
                        str += "<source" + (source.type ? " type='" + source.type + "'" : "") + " src='" + source.src + "' />";
                    });
                    str += "</audio>";
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
                            else if (Info.isFirefox() && sources[0].src.indexOf("blob:") === 0)
                                promise.asyncSuccess(true);
                        }
                    },
                    delay: 50
                });
                this._element.preload = this._preload ? "auto" : "none";
                // Replaced with ended -> play way, to be able get ended listener
                // Left here to inform don't do on this way in the future
                // if (this._loop)
                //     this._element.loop = "loop";
                var errorCount = 0;
                var errorEvents = new DomEvents();
                if (!ie9) {
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

            destroy: function() {
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
                var sourceEls = this._element.getElementsByTagName("SOURCE");
                var cb = function() {
                    this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                };
                for (var i = 0; i < sourceEls.length; ++i) {
                    this._domEvents.on(sourceEls[i], "error", cb, this);
                }
                if (Info.isSafari() && (Info.safariVersion() > 5 || Info.safariVersion() < 9)) {
                    if (this._element.networkState === this._element.NETWORK_LOADING) {
                        Async.eventually(function() {
                            if (!this.destroyed() && this._element.networkState === this._element.NETWORK_LOADING && this._element.buffered.length === 0)
                                this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
                        }, this, 10000);
                    }
                }
            },

            buffered: function() {
                return this._element.buffered.end(0);
            },

            play: function() {
                return inherited.play.call(this);
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
            }

        };
    });
});




Scoped.extend("module:AudioPlayer.AudioPlayerWrapper", [
    "module:AudioPlayer.AudioPlayerWrapper",
    "module:AudioPlayer.Html5AudioPlayerWrapper"
], function(AudioPlayerWrapper, Html5AudioPlayerWrapper) {
    AudioPlayerWrapper.register(Html5AudioPlayerWrapper, 2);
    return {};
});