Scoped.define("module:Flash.FlashAudioRecorder", [
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
    "base:Timers.Timer",
    "base:Time",
    "base:Promise",
    "base:Events.EventsMixin",
    "module:Recorder.PixelSampleMixin"
], function(Class, Dom, Info, FlashClassRegistry, FlashEmbedding, Strings, Async, Objs, Functions, Types, Timer, Time, Promise, EventsMixin, PixelSampleMixin, scoped) {
    var Cls = Class.extend({
        scoped: scoped
    }, [EventsMixin, PixelSampleMixin, function(inherited) {
        return {

            constructor: function(element, attrs) {
                inherited.constructor.call(this, element, attrs);
                this._embedding = this.auto_destroy(new FlashEmbedding(element, {
                    registry: this.cls.flashRegistry(),
                    wrap: true,
                    debug: false,
                    hasEmbedding: this.readAttr("hasembedding") || false,
                    namespace: this.readAttr("embednamespace") || null
                }, {
                    parentBgcolor: true,
                    fixHalfPixels: true
                }));
                this._flashObjs = {};
                this.ready = Promise.create();
                this.__status = "idle";
                this.__audioRate = this.readAttr('audiorate') || 44;
                this.__audioQuality = this.readAttr('audioquality') || 10;
                this.__microphoneCodec = this.readAttr("microphonecodec") || 'speex';
                this.__defaultGain = 55;
                this._embedding.ready(this.__initializeEmbedding, this);
            },

            __initializeEmbedding: function() {
                this.__hasMicrophoneActivity = false;
                this._flashObjs.main = this._embedding.flashMain();
                this._flashObjs.stage = this._flashObjs.main.get("stage");
                this._flashObjs.stage.set("scaleMode", "noScale");
                this._flashObjs.stage.set("align", "TL");
                this._flashObjs.Microphone = this._embedding.getClass("flash.media.Microphone");
                this._flashObjs.microphone = !Types.is_empty(this._flashObjs.Microphone.get('names').length > 0) ? this._flashObjs.Microphone.getMicrophone(0) : null;
                this.setMicrophoneProfile();
                this._currentMicrophone = 0;
                this._flashObjs.Security = this._embedding.getClass("flash.system.Security");
                this.ready.asyncSuccess(this);
                this.auto_destroy(new Timer({
                    delay: 100,
                    fire: this._fire,
                    context: this
                }));
            },

            isAccessGranted: function() {
                try {
                    return (!this._flashObjs.microphone || !this._flashObjs.microphone.get('muted'));
                } catch (e) {
                    return false;
                }
            },

            isSecurityDialogOpen: function() {
                var dummy = this._embedding.newObject("flash.display.BitmapData", 1, 1);
                var open = false;
                try {
                    dummy.draw(this._flashObjs.stage);
                } catch (e) {
                    open = true;
                }
                dummy.dispose();
                dummy.destroy();
                return open;
            },

            openSecurityDialog: function(fullSecurityDialog) {
                this.trigger("require_display");
                this._flashObjs.Security.showSettings("privacy");
            },

            grantAccess: function(fullSecurityDialog, allowDeny) {
                var promise = Promise.create();
                var timer = new Timer({
                    fire: function() {
                        if (this.destroyed()) {
                            timer.destroy();
                            return;
                        }
                        if (this.isSecurityDialogOpen())
                            return;
                        if (this.isAccessGranted()) {
                            timer.destroy();
                            promise.asyncSuccess(true);
                        } else {
                            if (allowDeny) {
                                timer.destroy();
                                promise.asyncError(true);
                            } else
                                this.openSecurityDialog(fullSecurityDialog);
                        }
                    },
                    context: this,
                    delay: 10,
                    start: true
                });
                return promise;
            },

            bindMedia: function(fullSecurityDialog, allowDeny) {
                return this.grantAccess(fullSecurityDialog, allowDeny).mapSuccess(function() {
                    this._mediaBound = true;
                }, this);
            },

            unbindMedia: function() {
                this._mediaBound = false;
            },

            enumerateDevices: function() {
                return {
                    audios: this._flashObjs.Microphone.get('names')
                };
            },

            selectMicrophone: function(index) {
                if (this._flashObjs.microphone)
                    this._flashObjs.microphone.weakDestroy();
                this.__hasMicrophoneActivity = false;
                this.__microphoneActivityTime = null;
                this._flashObjs.microphone = this._flashObjs.Microphone.getMicrophone(index);
                this._currentMicrophone = index;
                this.setMicrophoneProfile(this._currentMicrophoneProfile);
            },

            currentMicrophone: function() {
                return this._currentMicrophone;
            },

            microphoneInfo: function() {
                return this._flashObjs.microphone ? {
                    muted: this._flashObjs.microphone.get("muted"),
                    name: this._flashObjs.microphone.get("name"),
                    activityLevel: this._flashObjs.microphone.get("activityLevel"),
                    gain: this._flashObjs.microphone.get("gain"),
                    rate: this._flashObjs.microphone.get("rate"),
                    encodeQuality: this._flashObjs.microphone.get("encodeQuality"),
                    codec: this._flashObjs.microphone.get("codec"),
                    hadActivity: this.__hadMicrophoneActivity,
                    inactivityTime: this.__microphoneActivityTime ? Time.now() - this.__microphoneActivityTime : null
                } : {};
            },

            setMicrophoneProfile: function(profile) {
                if (!this._flashObjs.microphone)
                    return;
                profile = profile || {};
                this._flashObjs.microphone.setLoopBack(profile.loopback || false);
                this._flashObjs.microphone.set("gain", profile.gain || this.__defaultGain);
                this._flashObjs.microphone.setSilenceLevel(profile.silenceLevel || 0);
                this._flashObjs.microphone.setUseEchoSuppression(profile.echoSuppression || false);
                this._flashObjs.microphone.set("rate", profile.rate || this.__audioRate);
                this._flashObjs.microphone.set("encodeQuality", profile.encodeQuality || this.__audioQuality);
                this._flashObjs.microphone.set("codec", profile.codec || this.__microphoneCodec);
                this._currentMicrophoneProfile = profile;
            },

            getVolumeGain: function() {
                var gain = this._mediaBound ? this._flashObjs.micropone.get("gain") : 55;
                return gain / 55.0;
            },

            setVolumeGain: function(volumeGain) {
                this.__defaultGain = Math.min(Math.max(0, Math.round(volumeGain * 55)), 100);
                if (this._mediaBound && this._flashObjs.microphone)
                    this._flashObjs.microphone.set("gain", this.__defaultGain);
            },

            testSoundLevel: function(activate) {
                this.setMicrophoneProfile(activate ? {
                    loopback: true,
                    gain: 55,
                    silenceLevel: 100,
                    echoSuppression: true
                } : {});
            },

            soundLevel: function() {
                return this._flashObjs.microphone ? this._flashObjs.microphone.get("activityLevel") : 0;
            },

            _fire: function() {
                if (!this._mediaBound)
                    return;
                this.__hadMicrophoneActivity = this.__hadMicrophoneActivity || (this._flashObjs.microphone && this._flashObjs.microphone.get("activityLevel") > 0);
                if (this._flashObjs.microphone && this._flashObjs.microphone.get("activityLevel") > 0)
                    this.__microphoneActivityTime = Time.now();
            },

            _error: function(s) {
                this.__status = "error";
                this.trigger("error", s);
            },

            _status: function(s) {
                if (s && s !== this.__status) {
                    this.__status = s;
                    this.trigger("status", s);
                    this.trigger(s);
                }
                return this.__status;
            },

            __newCallback: function(endpoint, endpoints) {
                var active = true;
                var timer = null;
                var badEndpoint = function() {
                    clearTimeout(timer);
                    if (!active)
                        return;
                    active = false;
                    this.trigger("endpoint_connectivity", this.__endpoint, -1);
                    if (endpoints.length > 0) {
                        endpoint = endpoints.shift();
                        this._flashObjs.connection.closeVoid();
                        this._flashObjs.connection.destroy();
                        this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
                        this._flashObjs.connection.addEventListener("netStatus", this.__newCallback(endpoint, endpoints));
                        this.__endpoint = endpoint;
                        this._flashObjs.connection.connectVoid(endpoint.serverUrl);
                    } else
                        this._error("Could not connect to server");
                };
                var self = this;
                timer = setTimeout(function() {
                    badEndpoint.call(self);
                }, 10000);
                return this._embedding.newCallback(Functions.as_method(function(event) {
                    if (!active)
                        return;
                    var code = event.get("info").code;
                    if (code === "NetConnection.Connect.Closed" && this._status() === 'recording') {
                        active = false;
                        this._error("Connection to server interrupted.");
                        return;
                    }
                    if ((code === "NetConnection.Connect.Success" && this._status() !== 'connecting') ||
                        (code === "NetConnection.Connect.Closed" && this._status() === 'connecting') ||
                        (code === "NetConnection.Connect.Failed" && this._status() === 'connecting')) {
                        badEndpoint.call(this);
                        return;
                    }
                    if (code === "NetConnection.Connect.Closed" && this._status() === 'uploading') {
                        this._status('finished');
                        return;
                    }
                    if (code === "NetConnection.Connect.Success" && this._status() === 'connecting') {
                        this.trigger("endpoint_connectivity", this.__endpoint, 1);
                        clearTimeout(timer);
                        this._flashObjs.stream = this._embedding.newObject("flash.net.NetStream", this._flashObjs.connection);
                        this._flashObjs.stream.addEventListener("netStatus", this._embedding.newCallback(Functions.as_method(function(event) {
                            var code = event.get("info").code;
                            if (code === "NetStream.Record.Start") {
                                this._status('recording');
                                return;
                            }
                            if (code === "NetStream.Play.StreamNotFound") {
                                this._flashObjs.stream.closeVoid();
                                if (this._status() !== "none")
                                    this._error("Stream not found");
                                return;
                            }
                            if (code === "NetStream.Unpublish.Success" ||
                                (this._status() === "uploading" && code === "NetStream.Buffer.Empty" &&
                                    this.__streamType === "flv" && this._flashObjs.stream.get('bufferLength') === 0)) {
                                this._flashObjs.stream.closeVoid();
                                this._flashObjs.stream.destroy();
                                this._flashObjs.stream = null;
                                this._flashObjs.connection.closeVoid();
                                this._flashObjs.connection.destroy();
                                this._flashObjs.connection = null;
                                this._status('finished');
                            }
                        }, this)));
                        this._flashObjs.stream.set("bufferTime", 120);
                        this._flashObjs.stream.attachAudioVoid(this._flashObjs.microphone);
                        this._flashObjs.stream.publish(endpoint.streamName, "record");
                    }
                }, this));
            },

            startRecord: function(endpoints) {
                if (arguments.length > 1) {
                    endpoints = {
                        serverUrl: endpoints,
                        streamName: arguments[1]
                    };
                }
                if (!Types.is_array(endpoints))
                    endpoints = [endpoints];
                this._status("connecting");
                var endpoint = endpoints.shift();
                var cb = this.__newCallback(endpoint, endpoints);
                this._flashObjs.connection = this._embedding.newObject("flash.net.NetConnection");
                this._flashObjs.connection.addEventListener("netStatus", cb);
                this.__endpoint = endpoint;
                this._flashObjs.connection.connectVoid(endpoint.serverUrl);
            },

            stopRecord: function() {
                if (this._status() !== "recording")
                    return;
                this.__initialBufferLength = 0;
                this._status("uploading");
                this.__initialBufferLength = this._flashObjs.stream.get("bufferLength");
                try {
                    this._flashObjs.stream.attachAudioVoid(null);
                } catch (e) {}
                /*try {
                    if (this.__endpoint.serverUrl.indexOf("rtmpt") === 0) {
                        this._flashObjs.stream.publishVoid("null");
                        this._flashObjs.stream.closeVoid();
                    }
                } catch (e) {}*/
            },

            uploadStatus: function() {
                return {
                    total: this.__initialBufferLength,
                    remaining: this._flashObjs.stream.get("bufferLength")
                };
            }

        };
    }], {

        flashRegistry: function() {
            if (!this.__flashRegistry) {
                this.__flashRegistry = new FlashClassRegistry();
                this.__flashRegistry.register("flash.media.Microphone", ["setLoopBack", "setSilenceLevel", "setUseEchoSuppression"], ["getMicrophone"]);
                this.__flashRegistry.register("flash.media.SoundTransform", []);
                this.__flashRegistry.register("flash.net.NetStream", ["play", "pause", "resume", "addEventListener", "seek", "attachAudio", "publish", "close"]);
                this.__flashRegistry.register("flash.net.NetConnection", ["connect", "addEventListener", "call", "close"]);
                this.__flashRegistry.register("flash.display.Stage", []);
                this.__flashRegistry.register("flash.system.Security", [], ["allowDomain", "showSettings"]);
            }
            return this.__flashRegistry;
        },

        attach: function(element, attrs) {
            var cls = new Cls(element, attrs);
            return element;
        }


    });
    return Cls;
});