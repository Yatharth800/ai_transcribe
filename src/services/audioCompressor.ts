/**
 * Optimizes and downsamples large audio files in the browser to 16kHz mono
 * or Opus WebM so they upload rapidly and fit within Cloud Run HTTP limits (<25MB),
 * while preserving high fidelity for AI speech recognition.
 */

export async function optimizeAudioForTranscription(
  file: File | Blob,
  onProgress?: (status: string) => void
): Promise<{ blob: Blob; mimeType: string }> {
  // If file is already small (< 18MB), no compression needed
  if (file.size <= 18 * 1024 * 1024) {
    return {
      blob: file,
      mimeType: file.type || "audio/mp3",
    };
  }

  onProgress?.("Optimizing audio for AI recognition (downsampling to 16kHz mono)...");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioCtx();

    onProgress?.("Decoding audio tracks...");
    const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Target speech sample rate: 16000 Hz mono
    const targetSampleRate = 16000;
    const duration = decodedBuffer.duration;
    const totalTargetSamples = Math.ceil(duration * targetSampleRate);

    onProgress?.("Processing speech channels...");
    const offlineCtx = new OfflineAudioContext(1, totalTargetSamples, targetSampleRate);

    // Mixdown all channels to mono
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    audioCtx.close().catch(() => {});

    onProgress?.("Encoding optimized audio...");
    // Check if browser supports MediaRecorder for Opus compression
    const wavBlob = audioBufferTo16kHzWav(renderedBuffer);

    // If WAV is still large (> 22MB, which happens for audio > 12 minutes),
    // compress using MediaStream / MediaRecorder to Opus WebM
    if (wavBlob.size > 22 * 1024 * 1024 && typeof MediaRecorder !== "undefined") {
      try {
        onProgress?.("Compressing speech to lightweight Opus stream...");
        const compressedBlob = await compressWavWithMediaRecorder(renderedBuffer);
        return { blob: compressedBlob, mimeType: "audio/webm" };
      } catch (e) {
        console.warn("MediaRecorder compression fallback to WAV:", e);
      }
    }

    return { blob: wavBlob, mimeType: "audio/wav" };
  } catch (err) {
    console.warn("Client audio optimization failed, using original file:", err);
    // If decoding failed (e.g. unsupported DRM), return original file
    return {
      blob: file,
      mimeType: file.type || "audio/mp3",
    };
  }
}

/**
 * Fast encoding of 1-channel 16kHz AudioBuffer to standard 16-bit WAV
 */
function audioBufferTo16kHzWav(buffer: AudioBuffer): Blob {
  const channelData = buffer.getChannelData(0);
  const totalSamples = channelData.length;
  const byteRate = 16000 * 2; // 16kHz * 16-bit (2 bytes) * 1 channel
  const dataSize = totalSamples * 2;
  const bufferLength = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // chunk length
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono (1 channel)
  view.setUint32(24, 16000, true); // sample rate
  view.setUint32(28, byteRate, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // 16-bit

  // data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write samples (float32 to int16)
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * High-efficiency Opus compressor using AudioContext source node and MediaRecorder
 */
async function compressWavWithMediaRecorder(buffer: AudioBuffer): Promise<Blob> {
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(dest);

  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  const recorder = new MediaRecorder(dest.stream, {
    mimeType,
    audioBitsPerSecond: 32000, // 32kbps is crystal clear for speech and ultra compact
  });

  const chunks: Blob[] = [];
  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      audioCtx.close().catch(() => {});
      resolve(new Blob(chunks, { type: "audio/webm" }));
    };
    recorder.onerror = reject;

    recorder.start();
    source.start(0);

    // Stop recorder when audio finishes
    source.onended = () => {
      recorder.stop();
    };
  });
}
