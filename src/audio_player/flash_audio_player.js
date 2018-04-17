Scoped.define("module:AudioPlayer.FlashPlayer", [
    "browser:DomExtend.DomExtension",
    "browser:Dom",
    "browser:Info",
    "flash:FlashClassRegistry",
    "flash:FlashEmbedding",
    "base:Strings",
    "base:Async",
    "base:Objs",
    "base:Functions",
    "base:Types",
    "base:Promise"
], function(Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Promise, scoped) {
    var Cls = Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(element, attrs) {
                inherited.constructor.call(this, element, attrs);
                this._source = this.__preferedSource();
                this._embedding = this.auto_destroy(new FlashEmbedding(element, {
                    registry: this.cls.flashRegistry(),
                    wrap: true,
                    debug: false
                }));
                this._flashObjs = {};
                this._flashData = {
                    status: 'idle'
                };
                this.ready = Promise.create();
                this._embedding.ready(this.__initializeEmbedding, this);
            },

            __preferedSource: function() {
                var preferred = [".mp3", ".ogg", ".aac"];
                var sources = [];
                if (this.readAttr("src") || this.readAttr("source") || this.readAttr("sources")) {
                    var src = this.readAttr("src") || this.readAttr("source") || this.readAttr("sources");
                    if (Types.is_array(src))
                        sources = src;
                    else
                        sources.push(src);
                }
                var element = this._element;
                if (!(Info.isInternetExplorer() && Info.internetExplorerVersion() < 9)) {
                    for (var i = 0; i < this._element.childNodes.length; ++i) {
                        if (element.childNodes[i].tagName && element.childNodes[i].tagName.toLowerCase() == "source" && element.childNodes[i].src)
                            sources.push(element.childNodes[i].src.toLowerCase());
                    }
                } else {
                    var current = this._element;
                    while (true) {
                        var next = current.nextSibling;
                        if (!next || !next.tagName || next.tagName.toLowerCase() != "source")
                            break;
                        sources.push(next.src.toLowerCase());
                        current = next;
                    }
                }
                sources = Objs.map(sources, function(source) {
                    return source.src || source;
                });
                var source = sources[0];
                var currentExtIndex = preferred.length - 1;
                for (var k = sources.length - 1; k >= 0; --k) {
                    for (var j = 0; j <= currentExtIndex; ++j) {
                        if (Strings.ends_with(sources[k], preferred[j])) {
                            source = sources[k];
                            currentExtIndex = j;
                            break;
                        }
                    }
                }
                if (source.indexOf("://") == -1)
                    source = document.location.href + "/../" + source;

                return {
                    sourceUrl: source
                };
            },

            __initializeEmbedding: function() {
                this._flashObjs.main = this._embedding.flashMain();
                this._flashObjs.stage = this._flashObjs.main.get("stage");
                this._flashObjs.stage.set("scaleMode", "noScale");
                this._flashObjs.stage.set("align", "TL");
                this._flashObjs.soundTransform = this._embedding.newObject("flash.media.SoundTransform");
                this._flashObjs.sound = this._embedding.newObject("flash.media.Sound");
                this._flashObjs.urlRequest = this._embedding.newObject("flash.net.URLRequest", this._source.sourceUrl);
                this._flashObjs.sound.addEventListener("complete", this._embedding.newCallback(Functions.as_method(this.__requestComplete, this)));
                this._flashObjs.sound.loadVoid(this._flashObjs.urlRequest);
            },

            __requestComplete: function() {
                this._element.duration = this._flashObjs.sound.length;
                this.writeAttr("volume", 1.0);
                if (this.hasAttr("muted")) {
                    this._flashObjs.soundTransform.set("volume", 0.0);
                    this.writeAttr("volume", 0.0);
                }
                this.__lastPosition = 0;
                this.__paused = false;
                this.__playing = false;
                if (this.hasAttr("autoplay"))
                    this._element.play();
                this.ready.asyncSuccess(this);
            },

            _domMethods: ["play", "pause", "load"],

            _domAttrs: {
                "volume": {
                    set: "_setVolume"
                },
                "currentTime": {
                    get: "_getCurrentTime",
                    set: "_setCurrentTime"
                }
            },

            load: function() {},

            play: function() {
                if (this.__playing)
                    return;
                this.__playing = true;
                this.__paused = false;
                this._flashObjs.soundChannel = this._flashObjs.sound.play(this.__lastPosition, 0, this._flashObjs.soundTransform);
                this._flashObjs.soundChannel.addEventListener("soundComplete", this._embedding.newCallback(Functions.as_method(this.__soundComplete, this)));
                this.domEvent("playing");
            },

            pause: function() {
                if (!this.__playing || this.__paused)
                    return;
                this.__lastPosition = this._flashObjs.soundChannel.get("position");
                this.__playing = false;
                this.__paused = true;
                this._flashObjs.soundChannel.stop();
                this._flashObjs.soundChannel.destroy();
                this.domEvent("pause");
            },

            _setVolume: function(volume) {
                this._flashObjs.soundTransform.set("volume", volume);
                this.domEvent("volumechange");
            },

            _getCurrentTime: function() {
                return this.__playing ? this._flashObjs.soundTransform.get("position") : this.__lastPosition;
            },

            _setCurrentTime: function(time) {
                if (this.__playing)
                    this._flashObjs.soundTransform.set("position", time);
                else
                    this.__lastPosition = time;
            },

            __soundComplete: function() {
                this.__lastPosition = 0;
                this.__playing = false;
                this.__paused = false;
                this._flashObjs.soundChannel.destroy();
                this.domEvent("ended");
            }

        };
    }, {

        flashRegistry: function() {
            if (!this.__flashRegistry) {
                this.__flashRegistry = new FlashClassRegistry();
                this.__flashRegistry.register("flash.media.Sound", ["load", "play", "addEventListener"]);
                this.__flashRegistry.register("flash.media.SoundChannel", ["stop", "addEventListener"]);
                this.__flashRegistry.register("flash.net.URLRequest", []);
                this.__flashRegistry.register("flash.display.Stage", []);

                this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener", "seek"]);
                this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener"]);
                this.__flashRegistry.register("flash.media.SoundTransform", []);
            }
            return this.__flashRegistry;
        },

        polyfill: function(element, polyfilltag, force, eventual) {
            if (eventual) {
                var promise = Promise.create();
                Async.eventually(function() {
                    promise.asyncSuccess(Cls.polyfill(element, polyfilltag, force));
                });
                return promise;
            }
            if (element.tagName.toLowerCase() != "audio" || !("networkState" in element))
                return Cls.attach(element);
            else if (element.networkState == element.NETWORK_NO_SOURCE || force)
                return Cls.attach(Dom.changeTag(element, polyfilltag || "audiopoly"));
            return element;
        },

        attach: function(element, attrs) {
            var cls = new Cls(element, attrs);
            return element;
        }

    });
    return Cls;
});


// https://help.adobe.com/en_US/ActionScript/3.0_ProgrammingAS3/WS5b3ccc516d4fbf351e63e3d118a9b90204-7d12.html