module.exports = function(audioContext, opts) {

	opts = opts || {};

	// configuration
	var bufferSize 		= opts.bufferSize || 4096,
		channelCount	= opts.channelCount || 2,
		sampleRate 		= opts.sampleRate || null,
		duration 		= opts.duration || null,
		length 			= opts.length || null;

	// output state
	var outputLength	= null,
		outputBuffer 	= null,
		offset 			= 0;

	function createOutputBuffer() {

		if (!sampleRate) {
			throw new Error("can't create output buffer - sample rate is unknown");
		}

		if (duration) {
			outputLength = Math.floor(sampleRate * duration);
			outputBuffer = audioContext.createBuffer(channelCount, outputLength, sampleRate);
			return;
		}

		if (length) {
			outputLength = length;
			outputBuffer = audioContext.createBuffer(channelCount, outputLength, sampleRate);
			return;
		}

		throw new Error("can't create output buffer - either duration or length is required");

	}

	if (sampleRate) {
		createOutputBuffer();
	}

	var processor = audioContext.createScriptProcessor(bufferSize, channelCount, channelCount);

	// workaround for bug wherein ScriptProcessorNode does not operate when
	// its output is disconnected.
	var nullGain = audioContext.createGainNode();
	nullGain.gain.value = 0;
	processor.connect(nullGain);
	nullGain.connect(audioContext.destination);

	processor.onaudioprocess = function(evt) {

		if (offset >= outputLength) {
			return;
		}

		var inputBuffer = evt.inputBuffer,
			inputLength = inputBuffer.length;

		if (outputBuffer === null) {
			if (sampleRate === null) {
				sampleRate = inputBuffer.sampleRate;
				createOutputBuffer();
			}
		}

		var samplesRemaining = outputLength - offset;

		if (inputLength > samplesRemaining) {
			for (var i = 0; i < channelCount; ++i) {
				outputBuffer.getChannelData(i).set(
					inputBuffer.getChannelData(i).subarray(0, samplesRemaining),
					offset
				);
			}
			offset = outputLength;
		} else {
			for (var i = 0; i < channelCount; ++i) {
				outputBuffer.getChannelData(i).set(
					inputBuffer.getChannelData(i),
					offset
				);
			}
			offset += inputLength;
		}

	}

	processor.getOutputBuffer = function() {
		return outputBuffer;
	}

	processor.reset = function() {
		offset = 0;
		if (sampleRate) {
			createOutputBuffer();
		} else {
			outputBuffer = null;
		}
	}

	return processor;

}