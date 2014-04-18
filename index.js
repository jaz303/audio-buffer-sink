module.exports = function(audioContext, opts) {

    opts = opts || {};

    // configuration
    var bufferSize      = opts.bufferSize || 4096,
        channelCount    = opts.channelCount || 2;

    // output state
    var outputBuffer    = opts.buffer || null,
        outputLength,
        offset;

    function reset() {
        if (outputBuffer) {
            outputLength = outputBuffer.length;
        } else {
            outputLength = null
        }
        offset = 0;
    }

    var processor = audioContext.createScriptProcessor(bufferSize, channelCount, channelCount);

    // workaround for bug wherein ScriptProcessorNode does not operate when
    // its output is disconnected.
    var nullGain = audioContext.createGainNode();
    nullGain.gain.value = 0;
    processor.connect(nullGain);
    nullGain.connect(audioContext.destination);

    processor.onaudioprocess = function(evt) {

        if (offset >= outputLength || !outputBuffer) {
            return;
        }

        var inputBuffer         = evt.inputBuffer,
            inputLength         = inputBuffer.length,
            samplesRemaining    = outputLength - offset;

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

    Object.defineProperty(processor, 'buffer', {
        get: function() { return outputBuffer; },
        set: function(b) {
            outputBuffer = b;
            reset();
        }
    });

    processor.reset = reset;

    reset();

    return processor;

}