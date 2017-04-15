// Credits: http://typedarray.org/wp-content/projects/WebAudioRecorder/script.js
// Co-Credits: https://github.com/streamproc/MediaStreamRecorder/blob/master/MediaStreamRecorder-standalone.js

Scoped.define("module:WebRTC.AudioRecorder", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Functions",
    "module:WebRTC.Support",
    "module:Encoding.WaveEncoder.Support"
], function(Class, EventsMixin, Objs, Functions, Support, WaveEncoder, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(stream, options) {
                inherited.constructor.call(this);
                this._channels = [];
                this._recordingLength = 0;
                this._options = Objs.extend({
                    audioChannels: 2,
                    bufferSize: 16384,
                    sampleRate: 44100
                }, options);
                this._stream = stream;
                this._started = false;
                this._stopped = false;
                this._volumeGainValue = 1.0;
                //this.__initializeContext();
            },

            _audioProcess: function(e) {
                if (!this._started)
                    return;
                this._channels.push(WaveEncoder.dumpInputBuffer(e.inputBuffer, this._options.audioChannels, this._actualBufferSize));
                this._recordingLength += this._actualBufferSize;
                /*
                var sampleStartTime = e.playbackTime;
                var sampleStopTime = e.playbackTime + this._actualBufferSize / this._actualSampleRate;
                //var sampleStopTime = e.playbackTime;
                //var sampleStartTime = e.playbackTime - this._actualBufferSize / this._actualSampleRate;
                if (sampleStopTime <= this._startContextTime)
                	return;
                if (this._stopped && sampleStartTime > this._stopContextTime) {
                	this._started = false;
                	this._generateData();
                	return;
                }
                var offset = 0;
                var endOffset = this._actualBufferSize;
                if (sampleStartTime < this._startContextTime)
                	offset = Math.round((this._startContextTime - sampleStartTime) * this._actualSampleRate);
                if (this._stopped && sampleStopTime > this._stopContextTime)
                	endOffset = Math.round((this._stopContextTime - sampleStartTime) * this._actualSampleRate);
                this._channels.push(WaveEncoder.dumpInputBuffer(e.inputBuffer, this._options.audioChannels, endOffset, offset));
                this._recordingLength += endOffset - offset;
                if (this._stopped && sampleStopTime > this._stopContextTime) {
                	this._started = false;
                	this._generateData();
                	return;
                }
                */
            },

            destroy: function() {
                this.stop();
                //this.__finalizeContext();
                inherited.destroy.call(this);
            },

            getVolumeGain: function() {
                return this._volumeGainValue;
            },

            setVolumeGain: function(volumeGain) {
                this._volumeGainValue = volumeGain;
                if (this._volumeGain)
                    this._volumeGain.value.gain = volumeGain;
            },

            __initializeContext: function() {
                var AudioContext = Support.globals().AudioContext;
                this._audioContext = new AudioContext();
                this._actualSampleRate = this._audioContext.sampleRate || this._options.sampleRate;
                this._volumeGain = this._audioContext.createGain();
                this._volumeGain.gain.value = this._volumeGainValue;
                this._audioInput = this._audioContext.createMediaStreamSource(this._stream);
                this._audioInput.connect(this._volumeGain);
                this._scriptProcessor = Support.globals().audioContextScriptProcessor.call(
                    this._audioContext,
                    this._options.bufferSize,
                    this._options.audioChannels,
                    this._options.audioChannels
                );
                this._actualBufferSize = this._scriptProcessor.bufferSize;
                this._scriptProcessor.onaudioprocess = Functions.as_method(this._audioProcess, this);
                this._volumeGain.connect(this._scriptProcessor);
                this._scriptProcessor.connect(this._audioContext.destination);
            },

            __finalizeContext: function() {
                this._scriptProcessor.disconnect();
                this._volumeGain.disconnect();
                this._audioInput.disconnect();
                this._scriptProcessor.onaudioprocess = null;
                this._audioContext.close();
                delete this._scriptProcessor;
                delete this._volumeGain;
                delete this._audioInput;
                delete this._audioContext;
            },

            start: function() {
                if (this._started)
                    return;
                this.__initializeContext();
                this._startContextTime = this._audioContext.currentTime;
                this._started = true;
                this._stopped = false;
                this._recordingLength = 0;
                this._channels = [];
                this.trigger("started");
            },

            stop: function() {
                if (!this._started || this._stopped)
                    return;
                this._stopContextTime = this._audioContext.currentTime;
                this._stopped = true;
                this.trigger("stopped");
                this.__finalizeContext();
                this._started = false;
                this._generateData();
            },

            _generateData: function() {
                var volume = 1;
                var index = 44;
                var totalSize = this._recordingLength * this._options.audioChannels * 2 + 44;
                var buffer = new ArrayBuffer(totalSize);
                var view = new DataView(buffer);
                WaveEncoder.generateHeader(totalSize, this._options.audioChannels, this._actualSampleRate, buffer);
                this._channels.forEach(function(channel) {
                    WaveEncoder.waveChannelTransform(channel, volume).value().forEach(function(v) {
                        view.setInt16(index, v, true);
                        index += 2;
                    });
                });
                this._data = new Blob([view], {
                    type: 'audio/wav'
                });
                this._leftChannel = [];
                this._rightChannel = [];
                this._recordingLength = 0;
                this.trigger("data", this._data);
            }

        };
    }], {

        supported: function() {
            return !!Support.globals().AudioContext && !!Support.globals().audioContextScriptProcessor;
        }

    });
});