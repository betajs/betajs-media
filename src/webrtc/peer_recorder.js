Scoped.define("module:WebRTC.PeerRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Functions",
    "base:Objs",
    "base:Promise",
    "base:Async",
    "browser:Info",
    "module:WebRTC.Support"
], function(Class, EventsMixin, Functions, Objs, Promise, Async, Info, Support, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(stream, options) {
                inherited.constructor.call(this);
                this._stream = stream;
                if (!options.videoBitrate && options.recorderWidth && options.recorderHeight)
                    options.videoBitrate = Math.round(options.recorderWidth * options.recorderHeight / 250);
                this._videoBitrate = options.videoBitrate || 1024;
                this._audioBitrate = options.audioBitrate || 256;
                this._videoFrameRate = options.framerate; // || "29.97";
                this._audioonly = options.audioonly;
                this._started = false;
            },

            destroy: function() {
                this.stop();
                inherited.destroy.call(this);
            },

            start: function(options) {
                if (this._started)
                    return Promise.value(true);
                this._wssUrl = options.wssUrl;
                this._streamInfo = options.streamInfo;
                this._userData = options.userData || {};
                this._delay = options.delay || 0;
                this._started = true;
                this._wsConnection = new(Support.globals()).WebSocket(this._wssUrl);
                this._wsConnection.binaryType = 'arraybuffer';
                this._wsConnection.onopen = Functions.as_method(this._wsOnOpen, this);
                this._wsConnection.onmessage = Functions.as_method(this._wsOnMessage, this);
                this._wsConnection.onclose = Functions.as_method(this._wsOnClose, this);
                this._wsConnection.onerror = this._errorCallback("WS_CONNECTION");
                var promise = Promise.create();
                var ctx = {};
                var self = this;
                this.on("started", function() {
                    self.off(null, null, ctx);
                    promise.asyncSuccess(true);
                }, ctx).on("error", function(error) {
                    self.off(null, null, ctx);
                    promise.asyncError(error);
                }, ctx);
                return promise;
            },

            stop: function() {
                if (!this._started)
                    return;
                this._started = false;
                if (this._peerConnection)
                    this._peerConnection.close();
                this._peerConnection = null;
                if (this._wsConnection)
                    this._wsConnection.close();
                this._wsConnection = null;
                this.trigger("stopped");
            },

            _wsOnOpen: function() {
                this._peerConnection = new(Support.globals()).RTCPeerConnection({
                    'iceServers': []
                });
                if (this._stream.getTracks && this._peerConnection.addTrack) {
                    Objs.iter(this._stream.getTracks(), function(localTrack) {
                        this._peerConnection.addTrack(localTrack, this._stream);
                    }, this);
                } else {
                    this._peerConnection.addStream(this._stream);
                }
                var offer = this._peerConnection.createOffer();
                offer.then(Functions.as_method(this._offerGotDescription, this));
                offer['catch'](this._errorCallback("PEER_CREATE_OFFER"));
            },

            _wsOnMessage: function(evt) {
                var data = JSON.parse(evt.data);
                var status = parseInt(data.status, 10);
                var command = data.command;
                if (status !== 200) {
                    this._error("MESSAGE_ERROR", {
                        status: status,
                        description: data.statusDescription
                    });
                } else {
                    if (data.sdp !== undefined) {
                        var remoteDescription = this._peerConnection.setRemoteDescription(new(Support.globals()).RTCSessionDescription(data.sdp));
                        remoteDescription.then(function() {
                            // peerConnection.createAnswer(gotDescription, errorHandler);
                        });
                        remoteDescription['catch'](this._errorCallback("PEER_REMOTE_DESCRIPTION"));
                    }
                    if (data.iceCandidates) {
                        Objs.iter(data.iceCandidates, function(iceCandidate) {
                            this._peerConnection.addIceCandidate(new(Support.globals()).RTCIceCandidate(iceCandidate));
                        }, this);
                    }
                    Async.eventually(function() {
                        this.trigger("started");
                    }, this, this._delay);
                }
                if (this._wsConnection)
                    this._wsConnection.close();
                this._wsConnection = null;
            },

            _offerGotDescription: function(description) {
                var enhanceData = {};
                if (this._audioBitrate)
                    enhanceData.audioBitrate = Number(this._audioBitrate);
                if (this._videoBitrate && !this._audioonly)
                    enhanceData.videoBitrate = Number(this._videoBitrate);
                if (this._videoFrameRate && !this._audioonly)
                    enhanceData.videoFrameRate = Number(this._videoFrameRate);
                description.sdp = this._enhanceSDP(description.sdp, enhanceData);
                return this._peerConnection.setLocalDescription(description).then(Functions.as_method(function() {
                    this._wsConnection.send(JSON.stringify({
                        direction: "publish",
                        command: "sendOffer",
                        streamInfo: this._streamInfo,
                        sdp: description,
                        userData: this._userData
                    }));
                }, this))['catch'](this._errorCallback("Peer Local Description"));
            },

            _enhanceSDP: function(sdpStr, enhanceData) {
                var sdpLines = sdpStr.split(/\r\n/);
                var sdpSection = 'header';
                var hitMID = false;
                var sdpStrRet = '';
                Objs.iter(sdpLines, function(sdpLine) {
                    if (sdpLine.length <= 0)
                        return;
                    sdpStrRet += sdpLine + '\r\n';
                    if (sdpLine.indexOf("m=audio") === 0) {
                        sdpSection = 'audio';
                        hitMID = false;
                    } else if (sdpLine.indexOf("m=video") === 0) {
                        sdpSection = 'video';
                        hitMID = false;
                    } else if (sdpLine.indexOf("a=rtpmap") === 0) {
                        sdpSection = 'bandwidth';
                        hitMID = false;
                    }
                    // Skip i and c lines
                    if (sdpLine.indexOf("i=") === 0 || sdpLine.indexOf("c=") === 0)
                        return;
                    if (hitMID)
                        return;
                    if ('audio'.localeCompare(sdpSection) === 0) {
                        if (enhanceData.audioBitrate !== undefined) {
                            sdpStrRet += 'b=AS:' + enhanceData.audioBitrate + '\r\n';
                            sdpStrRet += 'b=TIAS:' + (enhanceData.audioBitrate * 1024) + '\r\n';
                            // sdpStrRet += Info.isChrome()
                            //     ? 'b=CT:' + enhanceData.videoBitrate + '\r\n'
                            //     : 'b=TIAS:' + (enhanceData.audioBitrate * 1024) + '\r\n';
                        }
                    } else if ('video'.localeCompare(sdpSection) === 0) {
                        if (enhanceData.videoBitrate !== undefined) {
                            sdpStrRet += 'b=AS:' + enhanceData.videoBitrate + '\r\n';
                            // if (Info.isChrome()) {
                            // The Conference Total is indicated by giving the modifier
                            // can co-exist with any other sessions, defined in RFC 2327
                            sdpStrRet += 'b=CT:' + enhanceData.videoBitrate + '\r\n';
                            if (enhanceData.videoFrameRate !== undefined) {
                                sdpStrRet += 'a=framerate:' + enhanceData.videoFrameRate + '\r\n';
                            }
                            // } else {
                            //     // Transport Independent Application Specific Maximum (TIAS)
                            //     // Therefore, it gives a good indication of the maximum codec bit-
                            //     // rate required to be supported by the decoder.
                            //     sdpStrRet += 'b=TIAS:' + (enhanceData.videoBitrate * 1024) + '\r\n';
                            //     if (enhanceData.videoFrameRate !== undefined) {
                            //         sdpStrRet += 'a=maxprate:' + enhanceData.videoFrameRate + '\r\n';
                            //     }
                            // }
                        }
                    } else if ('bandwidth'.localeCompare(sdpSection) === 0 && Info.isChrome()) {
                        var rtpmapID;
                        rtpmapID = this._getRTPMapID(sdpLine);
                        if (rtpmapID !== null) {
                            var match = rtpmapID[2].toLowerCase();
                            if (('vp9'.localeCompare(match) === 0) || ('vp8'.localeCompare(match) === 0) || ('h264'.localeCompare(match) === 0) ||
                                ('red'.localeCompare(match) === 0) || ('ulpfec'.localeCompare(match) === 0) || ('rtx'.localeCompare(match) === 0)) {
                                if (enhanceData.videoBitrate !== undefined) {
                                    sdpStrRet += 'a=fmtp:' + rtpmapID[1] + ' x-google-min-bitrate=' + (enhanceData.videoBitrate) + ';x-google-max-bitrate=' + (enhanceData.videoBitrate) + '\r\n';
                                }
                            }

                            if (('opus'.localeCompare(match) === 0) || ('isac'.localeCompare(match) === 0) || ('g722'.localeCompare(match) === 0) || ('pcmu'.localeCompare(match) === 0) ||
                                ('pcma'.localeCompare(match) === 0) || ('cn'.localeCompare(match) === 0)) {
                                if (enhanceData.audioBitrate !== undefined) {
                                    sdpStrRet += 'a=fmtp:' + rtpmapID[1] + ' x-google-min-bitrate=' + (enhanceData.audioBitrate) + ';x-google-max-bitrate=' + (enhanceData.audioBitrate) + '\r\n';
                                }
                            }
                        }
                    }
                    hitMID = true;
                }, this);
                return sdpStrRet;
            },

            _getRTPMapID: function(line) {
                var findid = new RegExp('a=rtpmap:(\\d+) (\\w+)/(\\d+)');
                var found = line.match(findid);
                return (found && found.length >= 3) ? found : null;
            },

            _wsOnClose: function() {},

            _error: function(errorName, errorData) {
                this.trigger("error", errorName + " " + errorData.toString(), errorData);
                this.stop();
            },

            _errorCallback: function(errorName) {
                return Functions.as_method(function(errorData) {
                    this._error(errorName, errorData);
                }, this);
            }

        };
    }], {

        supported: function() {
            if (Info.isEdge())
                return false;
            if (Info.isSafari() && Info.safariVersion() < 11)
                return false;
            if (document.location.href.indexOf("https://") !== 0 && document.location.hostname !== "localhost") {
                if (Info.isChrome() && Info.chromeVersion() >= 47)
                    return false;
                if (Info.isOpera() && Info.operaVersion() >= 34)
                    return false;
            }
            return (Support.globals()).RTCPeerConnection &&
                (Support.globals()).RTCIceCandidate &&
                (Support.globals()).RTCSessionDescription &&
                (Support.globals()).WebSocket;
        }

    });
});