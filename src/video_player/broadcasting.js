Scoped.define("module:Player.Broadcasting", [
    "base:Class",
    "browser:Loader",
    "browser:Events"
], function(Class, Loader, DomEvents, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {
            constructor: function(instance) {
                inherited.constructor.apply(this);
                this.player = instance.player;
                this.googleCast = {};
                this.airplay = {};
                this.options = instance.commonOptions;
                this.googleCast.initialOptions = instance.castOptions;
                this.airplayOptions = instance.airplayOptions;

                this.player.on("pause-google-cast", function() {
                    this._googleCastRemotePause();
                }, this);

                this.player.on("play-google-cast", function() {
                    this._googleCastRemotePlay();
                }, this);

                this.player.on("google-cast-seeking", function(duration) {
                    this._seekToGoogleCast(duration);
                }, this);

                this.player.on("change-google-cast-volume", function(volume) {
                    volume = Math.min(1.0, volume);
                    this._changeGoogleCastVolume(volume);
                }, this);
            },

            attachAirplayEvent: function(video) {
                this._airplayEvent = this.auto_destroy(new DomEvents());
                this._airplayEvent.on(video, "webkitplaybacktargetavailabilitychanged", function(ev) {
                    switch (ev.availability) {
                        case "available":
                            this.player._broadcastingState.airplayConnected = true;
                            return true;
                        default:
                            return false;
                    }
                }, this);
            },

            attachGoggleCast: function() {
                var self = this;
                window.__onGCastApiAvailable = function(isAvailable) {
                    if (isAvailable) {
                        self._initializeCastApi();
                    }
                };

                Loader.loadScript('https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1', function() {

                });
            },

            _initializeCastApi: function() {
                var self = this;
                self.player.trigger("cast-available", true);
                var googleCastInitialOptions = this.googleCast.initialOptions;

                var options = {};
                // [0] default media receiver app ID
                // [1] Custom Receiver app ID
                // [2] Styled Media Receiver app ID # can also add https css files from cast console
                // [3] Remote Display Receiver app ID
                var applicationIds = [
                    chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                    '41A5ADFD', '8AA2B3F9', 'DE815B4F'
                ];

                // [0] no auto join
                // [1] same appID, same URL, same tab
                // [2] same appID and same origin URL
                var autoJoinPolicy = [
                    chrome.cast.AutoJoinPolicy.PAGE_SCOPED,
                    chrome.cast.AutoJoinPolicy.TAB_AND_ORIGIN_SCOPED,
                    chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
                ];

                options.autoJoinPolicy = autoJoinPolicy[1];
                options.receiverApplicationId = this.options.chromecastReceiverAppId || applicationIds[2];
                /** The following flag enables Cast Connect(requires Chrome 87 or higher) */
                options.androidReceiverCompatible = true;

                var context = cast.framework.CastContext.getInstance();
                context.setOptions(options);

                var castRemotePlayer = new cast.framework.RemotePlayer();
                castRemotePlayer.title = this.options.title;
                //castRemotePlayer.displayStatus =  "Please wait connecting",
                castRemotePlayer.canControlVolume = googleCastInitialOptions.canControlVolume;
                castRemotePlayer.canPause = googleCastInitialOptions.canPause;
                castRemotePlayer.canSeek = googleCastInitialOptions.canSeek;
                castRemotePlayer.duration = googleCastInitialOptions.duration;
                castRemotePlayer.imageUrl = googleCastInitialOptions.imageUrl;
                castRemotePlayer.isConnected = googleCastInitialOptions.isConnected;
                castRemotePlayer.isMuted = googleCastInitialOptions.isMuted;
                castRemotePlayer.isPaused = googleCastInitialOptions.isPaused;
                castRemotePlayer.title = this.options.title;
                castRemotePlayer.displayName = googleCastInitialOptions.displayName;

                var castRemotePlayerController = new cast.framework.RemotePlayerController(castRemotePlayer);
                //castRemotePlayerController methods
                //getSeekPosition(currentTime, duration), getSeekTime(currentPosition, duration)
                //castRemotePlayer.currentTime = position.in.seconds; muteOrUnmute(); playOrPause()
                // seek(), setVolumeLevel(), stop()


                var availableStates = cast.framework.CastState;
                var stateConnecting = cast.framework.CastState.CONNECTING;
                var stateNoDevice = cast.framework.CastState.NO_DEVICES_AVAILABLE;
                var stateEventType = cast.framework.CastContextEventType.CAST_STATE_CHANGED;

                context.addEventListener(stateEventType, function(ev) {
                    var _currentState = ev.castState;
                    self.player.trigger("cast-state-changed", _currentState, availableStates);
                    if (_currentState !== stateNoDevice) {
                        // var castRemotePlayer = new cast.framework.RemotePlayer();
                        // self._initCastPlayer(castRemotePlayer, googleCastInitialOptions);
                        if (_currentState === stateConnecting)
                            castRemotePlayer.displayStatus = "Please wait connecting";
                        else
                            castRemotePlayer.displayStatus = "";
                    } else {
                        /* We can remove here player event as well*/
                    }
                });

                // Will listen to remote player connection
                // DON'T move inside state change event
                castRemotePlayerController.addEventListener(
                    cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
                    function() {
                        if (cast && cast.framework) {
                            if (castRemotePlayer.isConnected) {
                                self._setupCastRemotePlayer(castRemotePlayer, castRemotePlayerController);
                            } else {
                                self._destroyCastRemotePlayer(castRemotePlayer, castRemotePlayerController);
                            }
                        }
                    }
                );
            },

            _setupCastRemotePlayer: function(castRemotePlayer, castRemotePlayerController) {
                var self = this;
                var player = this.player;
                var options = this.castOptions;
                var sources = player._sources;
                var mediaURL = player._element.currentSrc;
                var mediaMimeType = sources[0].type;

                var castSession = cast.framework.CastContext.getInstance().getCurrentSession();

                var mediaInfo = new chrome.cast.media.MediaInfo(mediaURL, mediaMimeType);
                mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
                mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
                mediaInfo.metadata.title = this.options.title;
                mediaInfo.metadata.images = [{
                    url: this.options.poster
                }];

                // BUFFERED: Stored media streamed from an existing data store.
                // LIVE: Live media generated on the fly.
                // OTHER: None of the above.
                // mediaInfo.streamType = 'BUFFERED';

                var request = new chrome.cast.media.LoadRequest(mediaInfo);

                this.googleCast.castRemotePlayer = castRemotePlayer;
                this.googleCast.castRemotePlayerController = castRemotePlayerController;
                this.googleCast.castMediaInfo = mediaInfo;
                this.googleCast.castSession = castSession;

                castRemotePlayerController.addEventListener(
                    cast.framework.RemotePlayerEventType.MEDIA_INFO_CHANGED,
                    function() {
                        if (!castSession) return;

                        var media = castSession.getMediaSession();
                        if (!media) return;

                        // On un-connect and re-connect to cast-player,
                        // this part will provide correct player state
                        player.trigger("cast-paused", media.playerState === 'PAUSED');
                    }
                );

                castSession.loadMedia(request).then(
                    function() {

                        player._broadcastingState.googleCastConnected = true;
                        player.trigger("cast-loaded", castRemotePlayer, castRemotePlayerController);

                        // Listeners available for further actions with remote player
                        // https://developers.google.com/cast/docs/reference/chrome/cast.framework#.RemotePlayerEventType
                        castRemotePlayerController.addEventListener(
                            cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED,
                            function() {
                                player.trigger("cast-paused", castRemotePlayer.isPaused);
                            }
                        );

                        castRemotePlayerController.addEventListener(
                            cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED,
                            function() {
                                var currentTime = self._getGoogleCastCurrentMediaTime(castRemotePlayer);
                                var totalMediaDuration = self._getGoogleCastMediaDuration(castRemotePlayer);
                                player.trigger("cast-time-changed", currentTime, totalMediaDuration);
                            }
                        );
                    },
                    function(errorCode) {
                        console.warn('Remote media load error : ' + self._googleCastPlayerErrorMessages(errorCode));
                    }
                );
            },

            _destroyCastRemotePlayer: function(castRemotePlayer, castRemotePlayerController) {
                var player = this.player;
                var currentPosition = this._getGoogleCastCurrentMediaTime(castRemotePlayer);

                castRemotePlayerController.removeEventListener(
                    cast.framework.RemotePlayerEventType.MEDIA_INFO_CHANGED
                );
                castRemotePlayerController.removeEventListener(
                    cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED
                );
                castRemotePlayerController.removeEventListener(
                    cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED
                );

                if (castRemotePlayer.savedPlayerState && !castRemotePlayer.isConnected)
                    currentPosition = castRemotePlayer.savedPlayerState.currentTime;

                if (player._broadcastingState.googleCastConnected && currentPosition > 0)
                    player.trigger("proceed-when-ending-googlecast", currentPosition, castRemotePlayer.isPaused);

                this.player._broadcastingState.googleCastConnected = false;
            },

            _getGoogleCastRemotePlayer: function() {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return this.googleCast.castRemotePlayer;
            },

            _getGoogleCastRemotePlayerController: function() {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return this.googleCast.castRemotePlayerController;
            },

            _getGoogleCastMediaInfo: function() {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return this.googleCast.castMediaInfo;
            },

            _getGoogleCastCurrentSession: function() {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return this.googleCast.castSession;
            },

            _getGoogleCastCurrentMediaTime: function(remotePlayer) {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                // Sometimes getting error: "The provided double value is non-finite"
                return Math.floor(remotePlayer.currentTime * 10) / 10;
            },

            _getGoogleCastMediaDuration: function(remotePlayer) {
                if (!this.player._broadcastingState.googleCastConnected)
                    return;

                return remotePlayer.duration;
            },

            _googleCastRemotePlay: function() {
                if (this.player._broadcastingState.googleCastConnected) {
                    var castRemotePlayer = this._getGoogleCastRemotePlayer();
                    var castRemotePlayerController = this._getGoogleCastRemotePlayerController();
                    if (castRemotePlayer.playerState === 'PAUSED')
                        castRemotePlayerController.playOrPause();
                    return castRemotePlayer;
                } else return false;
            },

            _googleCastRemotePause: function() {
                if (this.player._broadcastingState.googleCastConnected) {
                    var castRemotePlayer = this._getGoogleCastRemotePlayer();
                    var castRemotePlayerController = this._getGoogleCastRemotePlayerController();
                    if (castRemotePlayer.playerState === 'PLAYING')
                        castRemotePlayerController.playOrPause();
                    return castRemotePlayer;
                } else return false;
            },

            _seekToGoogleCast: function(time) {
                var castRemotePlayer = this._getGoogleCastRemotePlayer();
                var castRemotePlayerController = this._getGoogleCastRemotePlayerController();
                castRemotePlayer.currentTime = time;
                castRemotePlayerController.seek();
            },

            _changeGoogleCastVolume: function(volumePosition) {
                var castRemoteController = this._getGoogleCastRemotePlayerController();
                var castRemotePlayer = this._getGoogleCastRemotePlayer();
                castRemotePlayer.volumeLevel = volumePosition;
                castRemoteController.setVolumeLevel();
            },

            _googleCastPlayerErrorMessages: function(error) {
                switch (error.code) {
                    case chrome.cast.ErrorCode.API_NOT_INITIALIZED:
                        return 'The API is not initialized.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.CANCEL:
                        return 'The operation was canceled by the user' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.CHANNEL_ERROR:
                        return 'A channel to the receiver is not available.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.EXTENSION_MISSING:
                        return 'The Cast extension is not available.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.INVALID_PARAMETER:
                        return 'The parameters to the operation were not valid.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.RECEIVER_UNAVAILABLE:
                        return 'No receiver was compatible with the session request.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.SESSION_ERROR:
                        return 'A session could not be created, or a session was invalid.' +
                            (error.description ? ' :' + error.description : '');
                    case chrome.cast.ErrorCode.TIMEOUT:
                        return 'The operation timed out.' +
                            (error.description ? ' :' + error.description : '');
                }
            },

            lookForAirplayDevices: function(videoElement) {
                return videoElement.webkitShowPlaybackTargetPicker();
            }
        };
    });
});