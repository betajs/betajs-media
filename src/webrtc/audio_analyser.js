Scoped.define("module:WebRTC.AudioAnalyser", [
    "base:Class",
    "browser:Info",
    "module:WebRTC.Support"
], function(Class, Info, Support, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(stream) {
                inherited.constructor.call(this);
                /*
                var AudioContext = Support.globals().AudioContext;
                this._audioContext = new AudioContext();
                */
                this._audioContext = Support.globals().audioContext;
                this._analyserNode = this._audioContext.createAnalyser.call(this._audioContext);
                this._analyserNode.fftSize = 32;
                if (stream.getAudioTracks().length > 0) {
                    this._audioInput = this._audioContext.createMediaStreamSource(stream);
                    this._audioInput.connect(this._analyserNode);
                }
            },

            destroy: function() {
                this._analyserNode.disconnect();
                delete this._analyserNode;
                //this._audioContext.close();
                //delete this._audioContext;
                inherited.destroy.call(this);
            },

            soundLevel: function() {
                if (!this._audioInput)
                    return 0.0;
                var bufferLength = this._analyserNode.fftSize;
                var dataArray = new Uint8Array(bufferLength);
                this._analyserNode.getByteTimeDomainData(dataArray);
                var mx = 0.0;
                for (var i = 0; i < bufferLength; i++)
                    mx = Math.max(mx, Math.abs(dataArray[i] / 128.0));
                // Seems Firefox is Mobile not supports this testing way
                // getByteFrequencyData && getFloatTimeDomainData also tested with no success
                return !(Info.isMobile() && Info.isFirefox()) ? mx : mx + 0.1;
            }

        };
    }, {

        supported: function() {
            // It works on iOS and on Safari, but it takes over the audio from the stream indefinitely
            return !!Support.globals().AudioContext && !!Support.globals().audioContext && !Info.isSafari() && !Info.isiOS();
        }

    });
});
