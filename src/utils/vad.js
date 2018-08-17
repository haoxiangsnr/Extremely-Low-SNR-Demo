const normalizeBuffer = (buffer, interval) => {
    let len = buffer.length;
    let reminder = len % (interval * 48);
    return reminder ? buffer.slice(0, len - reminder) : reminder;
};

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}
function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}
function encodeWAV(samples) {
    let buffer = new ArrayBuffer(44 + samples.length * 2);
    let view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, 16000, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, 16000 * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 1 * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
}

export default (blob, _interval, _threshold) => {

    const interval =  _interval || 20;
    const threshold = _threshold || 1000000;

    const fileReader = new FileReader();
    fileReader.onload = (event) => {

        let buffer = [];
        let originBuffer = event.target.result;
        let audioBuffer =  new Int16Array(originBuffer);
        console.log(audioBuffer)

        let dataBuffer = normalizeBuffer(audioBuffer.slice(22), interval);
        
        console.log(dataBuffer);
        
        let sampledBuffer = [];
        let intervalSum = 0;
        let sampleSum = 0;


        dataBuffer.forEach((e, i) => {
            intervalSum += (e < 0) ? -e : e;
            sampleSum += e;
            if (i % 3 === 0) {
                sampledBuffer.push(sampleSum / 3);
                sampleSum = 0;
            }
            if (i % (interval * 48) === 0) {
                if (intervalSum < threshold) {
                    sampledBuffer = [];
                }
                else {
                    buffer = buffer.concat(sampledBuffer);
                }
                intervalSum = 0;
            }
        });

        console.log("最终的buffer大小", buffer.length);
        console.log("buffer如下：",buffer);

        let dataView = encodeWAV(buffer);
        let audioBlob = new Blob([dataView], {type: "audio/wav"});
        

        let reader = new FileReader();
        reader.addEventListener("load", (e) => {
            console.log(e.target.result)
        });
        reader.readAsDataURL(audioBlob);
    };
    fileReader.readAsArrayBuffer(blob);
}
