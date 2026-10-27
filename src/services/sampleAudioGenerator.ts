/**
 * Generates an acoustic audio buffer for demonstration and playback
 * when sample files are loaded without requiring large external binary assets.
 */
export async function createDemoAudioBlob(durationSeconds: number = 28): Promise<Blob> {
  const sampleRate = 44100;
  const numSamples = sampleRate * durationSeconds;
  const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);

  // Generate realistic multi-harmonic voice-formant style synth tones
  const osc1 = offlineCtx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(140, 0);

  const osc2 = offlineCtx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(280, 0);

  // Modulate frequency to mimic natural human speech cadences
  const lfo = offlineCtx.createOscillator();
  lfo.frequency.setValueAtTime(3.5, 0); // 3.5 syllables per sec
  const lfoGain = offlineCtx.createGain();
  lfoGain.gain.setValueAtTime(25, 0);
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);

  // Filter with formant frequency
  const filter = offlineCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1200, 0);
  filter.Q.setValueAtTime(2.5, 0);

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.35, 0);

  // Add occasional pauses to simulate speech sentences
  for (let t = 0; t < durationSeconds; t += 4) {
    masterGain.gain.setValueAtTime(0.35, t);
    masterGain.gain.linearRampToValueAtTime(0.01, t + 3.2);
    masterGain.gain.setValueAtTime(0.0, t + 3.25);
    masterGain.gain.setValueAtTime(0.0, t + 3.9);
    masterGain.gain.linearRampToValueAtTime(0.35, t + 4.0);
  }

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(offlineCtx.destination);

  osc1.start();
  osc2.start();
  lfo.start();

  const renderedBuffer = await offlineCtx.startRendering();
  return bufferToWave(renderedBuffer, numSamples);
}

// Convert AudioBuffer to WAV Blob
function bufferToWave(abuffer: AudioBuffer, totalSamples: number): Blob {
  const numOfChan = abuffer.numberOfChannels;
  const length = totalSamples * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    out.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    out.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  out.setUint32(0, 0x46464952, true); // "RIFF"
  out.setUint32(4, length - 8, true); // file length - 8
  out.setUint32(8, 0x45564157, true); // "WAVE"

  // fmt sub-chunk
  out.setUint32(12, 0x20746d66, true); // "fmt " chunk
  out.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  pos = 20;
  setUint16(1); // Linear PCM
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample

  // data sub-chunk
  out.setUint32(pos, 0x61746164, true); // "data" chunk
  pos += 4;
  setUint32(length - pos - 4); // data length

  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i));
  }

  while (offset < totalSamples) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out.buffer], { type: "audio/wav" });
}
