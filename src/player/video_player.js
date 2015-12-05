Scoped.define("module:Player.VideoPlayerWrapper", [
    "base:Classes.OptimisticConditionalInstance",
    "base:Events.EventsMixin",
    "base:Types",
    "base:Objs",
    "base:Strings",
    "jquery:"
], function (OptimisticConditionalInstance, EventsMixin, Types, Objs, Strings, $, scoped) {
	return OptimisticConditionalInstance.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (options, transitionals) {
				inherited.constructor.call(this);
				options = Objs.extend(Objs.clone(options || {}, 1), transitionals);
				this._poster = options.poster || null;
				var sources = options.source || options.sources || [];
				if (Types.is_string(sources))
					sources = sources.split(" ");
				var sourcesMapped = [];
				Objs.iter(sources, function (source) {
					if (Types.is_string(source))
						source = {src: Strings.trim(source)};
					if (source.ext && !source.type)
						source.type = "video/" + source.ext;
					if (!source.ext && source.type)
						source.ext = Strings.last_after(source.type, "/");
					if (!source.ext && !source.type && source.src.indexOf(".") >= 0) {
						source.ext = Strings.last_after(source.src, ".");
						source.type = "video/" + source.ext;
					}
					if (!source.type)
						source.type = "video";
					source.ext = source.ext.toLowerCase();
					source.type = source.type.toLowerCase();
					sourcesMapped.push(source);
				}, this);
				this._sources = sourcesMapped;
				this._element = options.element;
				this._$element = $(options.element);
				this._preload = options.preload || false;
				this._options = options;
				this._loaded = false;
				this._error = 0;
			},
			
			destroy: function () {
				this._$element.off("." + this.cid());
				inherited.destroy.call(this);
			},
			
			poster: function () {
				return this._poster;
			},
			
			sources: function () {
				return this._sources;
			},
			
			loaded: function () {
				return this._loaded;
			},
			
			buffered: function () {},
			
			_eventLoaded: function () {
				this._loaded = true;
				this.trigger("loaded");
			},
			
			_eventPlaying: function () {
				this.trigger("playing");
			},
			
			_eventPaused: function () {
				this.trigger("paused");
			},
			
			_eventEnded: function () {
				this.trigger("ended");
			},
			
			_eventError: function (error) {
				this._error = error;
				this.trigger("error", error);
			},
			
			supportsFullscreen: function () {
				return false;
			},
			
			duration: function () {
				return this._element.duration;
			},
			
			position: function () {
				return this._element.currentTime;
			},
			
			enterFullscreen: function () {},
			
			error: function () {
				return this._error;
			},
			
            play: function () {
            	this._element.play();
            },
            
            pause: function () {
            	this._element.pause();
	        },
	        
	        setPosition: function (position) {
	        	this._element.currentTime = position;
	        },
	        
	        muted: function () {
	        	return this._element.muted;
	        },
	        
	        setMuted: function (muted) {
	        	this._element.muted = muted;
	        },
	        
	        volume: function () {
	        	return this._element.volume;
	        },
	        
	        setVolume: function (volume) {
	        	this._element.volume = volume;
	        }
			
		};
	}], {
		
		ERROR_NO_PLAYABLE_SOURCE: 1,		
		ERROR_FLASH_NOT_INSTALLED: 2
		
	});
});


Scoped.define("module:Player.Html5VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "base:Browser.Info",
    "base:Promise",
    "base:Objs",
    "base:Timers.Timer",
    "jquery:",
    "base:Browser.Dom"
], function (VideoPlayerWrapper, Info, Promise, Objs, Timer, $, Dom, scoped) {
	var Cls = VideoPlayerWrapper.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (options, transitionals) {
				inherited.constructor.call(this, options, transitionals);
			},

			_initialize: function () {
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
				this._$element.html("");
				if (this._element.tagName.toLowerCase() !== "video") {
					this._element = Dom.changeTag(this._element, "video");
					this._$element = $(this._element);
					this._transitionals.element = this._element;
				}

				this._element.poster = this.poster();
				this._$element.on("loadedmetadata", function () {
					promise.asyncSuccess(true);
				});
				var timer = new Timer({
					context: this,
					fire: function () {
						if (this._element.networkState === this._element.NETWORK_NO_SOURCE)
							promise.asyncError(true);
						else if (this._element.networkState === this._element.NETWORK_IDLE) 
							promise.asyncSuccess(true);
					},
					delay: 50
				});				
				if (!this._preload)
					this._$element.attr("preload", "none");
				var errorCount = 0;
				var sources = this.sources();
				Objs.iter(sources, function (source) {
					$source = $("<source type='" + source.type + "' />").appendTo(this._$element);
					$source.on("error", function () {
						errorCount++;
						if (errorCount === sources.length)
							promise.asyncError(true);
					});
					$source.get(0).src = source.src;
				}, this);
				promise.callback(function () {
					this._$element.find("source").off("error");
					timer.destroy();
				}, this);
				promise.success(function () {
					this._setup();
				}, this);
				return promise;
			},
			
			destroy: function () {
				this._$element.html("");
				inherited.destroy.call(this);
			},
			
			_setup: function () {
				this._loaded = false;
				var self = this;
				var videoOn = function (event, handler) {
					self._$element.on(event + "." + self.cid(), function () {
						handler.apply(self, arguments);
					});
				};
				videoOn("canplay", this._eventLoaded);
				videoOn("playing", this._eventPlaying);
				videoOn("pause", this._eventPaused);
				videoOn("ended", this._eventEnded);
			},
			
			buffered: function () {
				return this._element.buffered.end(0);
			},
			
			supportsFullscreen: function () {
				return "webkitEnterFullscreen" in this._element || "mozRequestFullScreen" in this._element;
			},
			
            enterFullscreen: function () {
                if ("webkitEnterFullscreen" in this._element)
                    this._element.webkitEnterFullscreen();
                else if ("mozRequestFullScreen" in this._element)
                    this._element.mozRequestFullScreen();
            }
		
		};		
	});	
	
	VideoPlayerWrapper.register(Cls, 2);
	
	return Cls;
});


Scoped.define("module:Player.FlashPlayerWrapper", [
     "module:Player.VideoPlayerWrapper",
     "module:Player.FlashPlayer",
     "base:Browser.Info",
     "base:Promise",
     "base:Browser.Dom"
], function (VideoPlayerWrapper, FlashPlayer, Info, Promise, Dom, scoped) {
	var Cls = VideoPlayerWrapper.extend({scoped: scoped}, function (inherited) {
		return {
		
			_initialize: function () {
				if (this._options.noflash)
					return Promise.error(true);
				if (this._sources.length < 1)
					return Promise.error(true);
				if (Info.isMobile() || !Info.flash().supported())
					return Promise.error(true);
				if (!Info.flash().installed() && this._options.flashinstallrequired)
					return Promise.error(true);				
				if (!Info.flash().installed()) { 
					this._errorEvent(this.cls.ERROR_NO_FLASH_INSTALLED);
					return Promise.value(true);
				}
				var self = this;
				var promise = Promise.create();
				if (this._element.tagName.toLowerCase() !== "div") {
					this._element = Dom.changeTag(this._element, "div");
					this._$element = $(this._element);
					this._transitionals.element = this._element;
				}
				this._flashPlayer = this.auto_destroy(new FlashPlayer(this._element, {
					poster: this.poster(),
					sources: this.sources()
				}));
				return this._flashPlayer.ready.success(function () {
					this._setup();
				}, this);
			},
			
			destroy: function () {
				this._$element.html("");
				inherited.destroy.call(this);
			},
			
			_setup: function () {
				this._loaded = true;
				this._eventLoaded();
				var self = this;
				var videoOn = function (event, handler) {
					self._$element.on(event + "." + self.cid(), function () {
						handler.apply(self, arguments);
					});
				};
				videoOn("playing", this._eventPlaying);
				videoOn("pause", this._eventPaused);
				videoOn("ended", this._eventEnded);
				videoOn("error", function () {
					this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
				});
			},
			
			position: function () {
				return this._element.get("currentTime");
			},
			
			buffered: function () {
				return this.position();
			},
			
            setPosition: function (position) {
            	this._element.set("currentTime", position);
            },
            
            setVolume: function (volume) {
            	this._element.set("volume", volume);
            }		
            
		};		
	});	
	
	VideoPlayerWrapper.register(Cls, 1);
	
	return Cls;
});
