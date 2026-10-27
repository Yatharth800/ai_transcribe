import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  stream?: MediaStream | null;
  isPlaying?: boolean;
  isRecording?: boolean;
  height?: number;
  barColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  stream,
  isPlaying = false,
  isRecording = false,
  height = 48,
  barColor = "#6366f1",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (stream && isRecording) {
      // Connect to real microphone audio stream
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioCtxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const renderRealtime = () => {
          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const barWidth = (canvas.width / bufferLength) * 1.5;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height * 0.9;

            ctx.fillStyle = barColor;
            ctx.beginPath();
            ctx.roundRect(
              x,
              canvas.height - barHeight,
              Math.max(2, barWidth - 2),
              barHeight,
              2
            );
            ctx.fill();

            x += barWidth;
          }

          animFrameRef.current = requestAnimationFrame(renderRealtime);
        };

        renderRealtime();
      } catch (e) {
        console.warn("AudioContext setup failed:", e);
      }
    } else if (isPlaying || isRecording) {
      // Synthetic speech rhythmic motion
      let phase = 0;
      const renderSimulated = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bars = 28;
        const barWidth = canvas.width / bars;

        for (let i = 0; i < bars; i++) {
          const wave =
            Math.sin(phase + i * 0.4) * 0.4 +
            Math.cos(phase * 1.5 + i * 0.2) * 0.3 +
            0.5;
          const barHeight = Math.max(4, wave * canvas.height * 0.85);

          ctx.fillStyle = barColor;
          ctx.beginPath();
          ctx.roundRect(
            i * barWidth + 1,
            canvas.height - barHeight,
            Math.max(2, barWidth - 3),
            barHeight,
            2
          );
          ctx.fill();
        }

        phase += 0.08;
        animFrameRef.current = requestAnimationFrame(renderSimulated);
      };
      renderSimulated();
    } else {
      // Idle state - flat quiet baseline
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 28;
      const barWidth = canvas.width / bars;
      ctx.fillStyle = "#334155";
      for (let i = 0; i < bars; i++) {
        ctx.beginPath();
        ctx.roundRect(
          i * barWidth + 1,
          canvas.height - 4,
          Math.max(2, barWidth - 3),
          3,
          1
        );
        ctx.fill();
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stream, isRecording, isPlaying, barColor]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={height}
      className="w-full h-full rounded"
      aria-label="Audio waveform visualization"
    />
  );
};
