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
				else if (!Types.is_array(sources))
					sources = [sources];
				var sourcesMapped = [];
				Objs.iter(sources, function (source) {
					if (Types.is_string(source))
						source = {src: source.trim()};
					else if (typeof Blob !== 'undefined' && source instanceof Blob)
						source = {src: source};
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
				this._$element = $(options.element);
				this._preload = options.preload || false;
				this._reloadonplay = options.reloadonplay || false;
				this._options = options;
				this._loop = options.loop || false;
				this._loaded = false;
				this._postererror = false;
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
			
			postererror: function () {
				return this._postererror;
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

			_eventPosterError: function () {
				this._postererror = true;
				this.trigger("postererror");
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

      enterParentFullscreen: function () {},

      exitFullscreen: function () {},

			error: function () {
				return this._error;
			},
			
      play: function () {
        if (this._reloadonplay)
          this._element.load();
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
      },

      videoWidth: function () {},

      videoHeight: function () {}
			
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
    "jquery:",
    "browser:Dom"
], function (VideoPlayerWrapper, Info, Promise, Objs, Timer, Strings, Async, $, Dom, scoped) {
	return VideoPlayerWrapper.extend({scoped: scoped}, function (inherited) {
		return {
			
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
				var sources = this.sources();
				var ie9 = Info.isInternetExplorer() && Info.internetExplorerVersion() == 9;
				if (this._element.tagName.toLowerCase() !== "video") {
					this._element = Dom.changeTag(this._element, "video");
					this._$element = $(this._element);
					this._transitionals.element = this._element;
				} else if (ie9) {
					var str = Strings.splitLast(this._element.outerHTML, "</video>").head;
					Objs.iter(sources, function (source) {
						str += "<source" + (source.type ? " type='" + source.type + "'" : "") + " src='" + source.src + "' />";
					});
					str += "</video>";
					var $str = $(str);
					this._$element.replaceWith($str);
					this._$element = $str;
					this._element = this._$element.get(0);
					this._transitionals.element = this._element;
				}
				/*
				var loadevent = "loadedmetadata";
				if (Info.isSafari() && Info.safariVersion() < 9)
					loadevent = "loadstart";
					*/
				var loadevent = "loadstart";
				this._$element.on(loadevent + "." + this.cid(), function () {
					if (/*loadevent === "loadstart" && */self._element.networkState === self._element.NETWORK_NO_SOURCE) {
						promise.asyncError(true);
						return;
					}
					promise.asyncSuccess(true);
				});
				var nosourceCounter = 10;
				var timer = new Timer({
					context: this,
					fire: function () {
						if (this._element.networkState === this._element.NETWORK_NO_SOURCE) {
							nosourceCounter--;
							if (nosourceCounter <= 0) 
								promise.asyncError(true);
						} else if (this._element.networkState === this._element.NETWORK_IDLE) 
							promise.asyncSuccess(true);
					},
					delay: 50
				});				
				if (!this._preload)
					this._$element.attr("preload", "none");
				if (this._loop)
					this._$element.attr("loop", "loop");
				var errorCount = 0;
				this._audioElement = null;
				if (!ie9) {
					Objs.iter(sources, function (source) {
						var $source = $("<source" + (source.type ? " type='" + source.type + "'" : "") + " />").appendTo(this._$element);
						$source.on("error", function () {
							errorCount++;
							if (errorCount === sources.length)
								promise.asyncError(true);
						});
						$source.get(0).src = source.src;
						if (source.audiosrc) {
							if (!this._audioElement)
								this._audioElement = $("<audio></audio>").insertAfter(this._$element).get(0);
							$source = $("<source" + (source.type ? " type='" + source.type + "'" : "") + " />").appendTo(this._audioElement);
							$source.get(0).src = source.audiosrc;
						}
					}, this);
				} else {
					this._$element.find("source").on("error", function () {
						errorCount++;
						if (errorCount === sources.length)
							promise.asyncError(true);
					});
				}
				if (this.poster())
					this._element.poster = this.posterURL();
				promise.callback(function () {
					this._$element.find("source").off("error");
					timer.destroy();
				}, this);
				promise.success(function () {
					this._setup();
				}, this);
				try {
					if (!Info.isChrome())
						this._$element.get(0).load();
				} catch (e) {}
				return promise;
			},
			
			posterURL: function () {
				var poster = this.poster();			
				if (poster && typeof Blob !== 'undefined' && poster instanceof Blob)
					return (window.URL || window.webkitURL).createObjectURL(poster);
				return poster;
			},
			
			destroy: function () {
				if (this._audioElement)
					this._audioElement.remove();
				if (this.supportsFullscreen() && this.__fullscreenListener)
					Dom.elementOffFullscreenChange(this._element, this.__fullscreenListener);
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
				self._$element.find("source").on("error" + "." + self.cid(), function () {
					self._eventError(self.cls.ERROR_NO_PLAYABLE_SOURCE);
				});
				if (this.poster()) {
					var image = new Image();
					image.onerror = function () {
						self._$element.attr("poster", "");
						self._$element.attr("preload", "");
						self._eventPosterError();
					};
					image.src = this.posterURL();
					image.onload = function () {
						self.__imageWidth = image.width;
						self.__imageHeight = image.height;
					};
				}
				if (Info.isSafari() && (Info.safariVersion() > 5 || Info.safariVersion() < 9)) {
					if (this._element.networkState === this._element.NETWORK_LOADING) {
						Async.eventually(function () {
							if (!this.destroyed() && this._element.networkState === this._element.NETWORK_LOADING && this._element.buffered.length === 0)
								this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
						}, this, 10000);
					}
				}
				if (this.supportsFullscreen()) {
					this.__videoClassBackup = "";
					this.__fullscreenListener = Dom.elementOnFullscreenChange(this._element, function (element, inFullscreen) {
						if (inFullscreen) {
							this.__videoClassBackup = this._$element.attr("class");
							this._$element.attr("class", "");
						} else {
							this._$element.attr("class", this.__videoClassBackup);
							this.__videoClassBackup = "";
						}
					}, this);
				}
			},
			
			buffered: function () {
				return this._element.buffered.end(0);
			},
			
			supportsFullscreen: function () {
				return Dom.elementSupportsFullscreen(this._element);
			},
			
      enterFullscreen: function () {
        Dom.elementEnterFullscreen(this._element);
      },

      enterParentFullscreen: function () {
        Dom.elementEnterFullscreen(this._element.parentElement);
      },

      exitFullscreen: function() {
        Dom.documentExitFullscreen();
      },

      videoWidth: function () {
        return this._$element.get(0).width || this.__imageWidth || NaN;
      },

      videoHeight: function () {
        return this._$element.get(0).height || this.__imageHeight || NaN;
      },

      play: function () {
        inherited.play.call(this);
        if (this._audioElement) {
          if (this._reloadonplay)
            this._audioElement.load();
          this._audioElement.play();
        }
      },

      pause: function () {
        this._element.pause();
        if (this._audioElement)
          this._audioElement.pause();
      },

      setPosition: function (position) {
        this._element.currentTime = position;
          if (this._audioElement)
            this._audioElement.currentTime = position;
      },

      muted: function () {
        return (this._audioElement ? this._audioElement : this._element).muted;
      },

      setMuted: function (muted) {
        (this._audioElement ? this._audioElement : this._element).muted = muted;
      },

      volume: function () {
        return (this._audioElement ? this._audioElement : this._element).volume;
      },

      setVolume: function (volume) {
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
     "browser:Dom",
     "jquery:"
], function (VideoPlayerWrapper, FlashPlayer, Info, Promise, Dom, $, scoped) {
	return VideoPlayerWrapper.extend({scoped: scoped}, function (inherited) {
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
					this._eventError(this.cls.ERROR_NO_FLASH_INSTALLED);
					return Promise.value(true);
				}
				var self = this;
				var promise = Promise.create();
				if (this._element.tagName.toLowerCase() !== "div") {
					this._element = Dom.changeTag(this._element, "div");
					this._$element = $(this._element);
					this._transitionals.element = this._element;
				}
				var opts = {
					poster: this.poster(),
					sources: this.sources()
				};
				if (this._loop)
					opts.loop = true;
				this._flashPlayer = new FlashPlayer(this._element, opts);
				return this._flashPlayer.ready.success(function () {
					this._setup();
				}, this);
			},
			
			destroy: function () {
				if (this._flashPlayer)
					this._flashPlayer.weakDestroy();
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
				videoOn("videoerror", function () {
					this._eventError(this.cls.ERROR_NO_PLAYABLE_SOURCE);
				});
				videoOn("postererror", this._eventPosterError);
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
      },

      videoWidth: function () {
        return this._flashPlayer ? this._flashPlayer.videoWidth() : null;
      },

      videoHeight: function () {
        return this._flashPlayer ? this._flashPlayer.videoHeight() : null;
      }

		};		
	});	
});



Scoped.extend("module:Player.VideoPlayerWrapper", [
    "module:Player.VideoPlayerWrapper",
    "module:Player.Html5VideoPlayerWrapper"
], function (VideoPlayerWrapper, Html5VideoPlayerWrapper) {
	VideoPlayerWrapper.register(Html5VideoPlayerWrapper, 2);
	return {};
});


Scoped.extend("module:Player.VideoPlayerWrapper", [
	"module:Player.VideoPlayerWrapper",
	"module:Player.FlashPlayerWrapper"
], function (VideoPlayerWrapper, FlashPlayerWrapper) {
	VideoPlayerWrapper.register(FlashPlayerWrapper, 1);
	return {};
});
