Scoped.define("module:WebRTC.PeerRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Functions",
    "base:Objs",
    "browser:Info",
    "module:WebRTC.Support"
], function (Class, EventsMixin, Functions, Objs, Info, Support, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
		return {
			
			constructor: function (stream, options) {
				inherited.constructor.call(this);
				this._stream = stream;
				this._videoBitrate = options.videoBitrate || 700;
				this._audioBitrate = options.audioBitrate || 128;
				this._started = false;
			},
			
			destroy: function () {
				this.stop();
				inherited.destroy.call(this);
			},
			
			start: function (options) {
				if (this._started)
					return;
				this._wssUrl = options.wssUrl;
				this._streamInfo = options.streamInfo;
				this._userData = options.userData || {};
				this._started = true;
				this._wsConnection = new (Support.globals()).WebSocket(this._wssUrl);
				this._wsConnection.binaryType = 'arraybuffer';
				this._wsConnection.onopen = Functions.as_method(this._wsOnOpen, this);
				this._wsConnection.onmessage = Functions.as_method(this._wsOnMessage, this);
				this._wsConnection.onclose = Functions.as_method(this._wsOnClose, this);
				this._wsConnection.onerror = this._errorCallback("WS_CONNECTION");
				this.trigger("started");
			},
			
			stop: function () {
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
			
			_wsOnOpen: function () {
				this._peerConnection = new (Support.globals()).RTCPeerConnection({ 'iceServers' : [] });
				if (this._stream.getTracks && this._peerConnection.addTrack) {
					Objs.iter(this._stream.getTracks(), function (localTrack) {
						this._peerConnection.addTrack(localTrack, localStream);
					}, this);
				} else
					this._peerConnection.addStream(this._stream);
				this._peerConnection.createOffer(Functions.as_method(this._offerGotDescription, this), this._errorCallback("PEER_CREATE_OFFER"));
			},			
			
			_wsOnMessage: function (evt) {
				var data = JSON.parse(evt.data);
				var status = parseInt(data.status, 10);
				var command = data.command;
				if (status !== 200) {
					this._error("MESSAGE_ERROR", {status: status, description: data.statusDescription});
				} else {
					if (data.sdp !== undefined) {
						this._peerConnection.setRemoteDescription(new (Support.globals()).RTCSessionDescription(data.sdp), function() {
							// peerConnection.createAnswer(gotDescription, errorHandler);
						}, this._errorCallback("PEER_REMOTE_DESCRIPTION"));
					}
					if (data.iceCandidates) {
						Objs.iter(data.iceCandidates, function (iceCandidate) {
							this._peerConnection.addIceCandidate(new (Support.globals()).RTCIceCandidate(iceCandidate));
						}, this);
					}
				}
				if (this._wsConnection)
					this._wsConnection.close();
				this._wsConnection = null;		
			},

			_offerGotDescription: function (description) {
				var enhanceData = {};
				if (this._audioBitrate)
					enhanceData.audioBitrate = this._audioBitrate;
				if (this._videoBitrate)
					enhanceData.videoBitrate = this._videoBitrate;
				description.sdp = this._enhanceSDP(description.sdp, enhanceData);
				this._peerConnection.setLocalDescription(description, Functions.as_method(function () {
					this._wsConnection.send(JSON.stringify({
						direction: "publish",
						command: "sendOffer",
						streamInfo: this._streamInfo,
						sdp: description,
						userData: this._userData
					}));
				}, this), this._errorCallback("PEER_LOCAL_DESCRIPTION"));
			},
			
			_enhanceSDP: function (sdpStr, enhanceData) {
				var sdpLines = sdpStr.split(/\r\n/);
				var sdpSection = 'header';
				var hitMID = false;
				var sdpStrRet = '';
				Objs.iter(sdpLines, function (sdpLine) {
					if (sdpLine.length <= 0)
						return;
					sdpStrRet += sdpLine + '\r\n';
					if (sdpLine.indexOf("m=audio") === 0) {
						sdpSection = 'audio';
						hitMID = false;
					} else if (sdpLine.indexOf("m=video") === 0) {
						sdpSection = 'video';
						hitMID = false;
					}
					if (sdpLine.indexOf("a=mid:") !== 0)
						return;
					if (hitMID)
						return;
					if ('audio'.localeCompare(sdpSection) === 0) {
						if (enhanceData.audioBitrate !== undefined) {
							sdpStrRet += 'b=AS:' + enhanceData.audioBitrate + '\r\n';
							sdpStrRet += 'b=TIAS:' + (enhanceData.audioBitrate * 1024) + '\r\n';
						}
					} else if ('video'.localeCompare(sdpSection) === 0) {
						if (enhanceData.videoBitrate !== undefined) {
							sdpStrRet += 'b=AS:' + enhanceData.videoBitrate + '\r\n';
							sdpStrRet += 'b=TIAS:' + (enhanceData.videoBitrate * 1024) + '\r\n';
						}
					}
					hitMID = true;
				}, this);
				return sdpStrRet;
			},
			
			_wsOnClose: function () {},
			
			_error: function (errorName, errorData) {
				this.trigger("error", errorName, errorData);
				this.stop();
			},
			
			_errorCallback: function (errorName) {
				return Functions.as_method(function (errorData) {
					this._error(errorName, errorData);
				}, this);
			}
						
		};		
	}], {
		
		supported: function () {
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
		
