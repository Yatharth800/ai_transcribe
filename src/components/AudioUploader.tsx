import React, { useState, useRef } from "react";
import {
  Upload,
  Mic,
  MicOff,
  Sparkles,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Languages,
} from "lucide-react";
import type { AppSettings, AudioSample, TranscriptionResult } from "../types";
import { SAMPLE_AUDIO_RECORDINGS } from "../data/samples";
import { createDemoAudioBlob } from "../services/sampleAudioGenerator";
import { transcribeAudio } from "../services/apiClient";
import { AudioVisualizer } from "./AudioVisualizer";

interface AudioUploaderProps {
  settings: AppSettings;
  onTranscriptionSuccess: (result: TranscriptionResult) => void;
  onSelectSample: (sample: AudioSample) => void;
  onOpenSettings: () => void;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  settings,
  onTranscriptionSuccess,
  onSelectSample,
  onOpenSettings,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirectRecording, setIsDirectRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const directStreamRef = useRef<MediaStream | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setErrorMessage(null);
    const validMimes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/webm",
      "audio/ogg",
      "audio/m4a",
      "audio/x-m4a",
      "audio/aac",
      "audio/flac",
    ];
    const isAudio =
      validMimes.includes(file.type) ||
      /\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(file.name);

    if (!isAudio) {
      setErrorMessage("Please select a valid audio file (MP3, WAV, M4A, OGG, WEBM, FLAC).");
      return;
    }

    setSelectedFile(file);
  };

  const handleStartTranscribe = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStep("Uploading audio and detecting spoken language...");

    try {
      setProcessingStep("Analyzing audio file...");
      const result = await transcribeAudio(
        selectedFile,
        selectedFile.type,
        settings.targetLanguage,
        "Detect source language automatically and translate to target language",
        (msg) => setProcessingStep(msg)
      );

      result.fileName = selectedFile.name;
      result.audioBlobUrl = URL.createObjectURL(selectedFile);

      setProcessingStep("Complete!");
      onTranscriptionSuccess(result);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || "Failed to transcribe audio. Please verify your connection."
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  // Direct In-Card Recording Feature
  const startCardRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      directStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const recordedFile = new File([audioBlob], `recording_${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setSelectedFile(recordedFile);

        if (directStreamRef.current) {
          directStreamRef.current.getTracks().forEach((track) => track.stop());
          directStreamRef.current = null;
        }
      };

      mediaRecorder.start(250);
      setIsDirectRecording(true);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setErrorMessage("Could not access microphone: " + (err.message || "Permission denied"));
    }
  };

  const stopCardRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsDirectRecording(false);
  };

  const handleLoadSample = async (sample: AudioSample) => {
    setIsProcessing(true);
    setProcessingStep(`Generating audio buffer for "${sample.name}" (${sample.language})...`);

    try {
      const blob = await createDemoAudioBlob(28);
      const sampleFile = new File([blob], `${sample.id}.wav`, { type: "audio/wav" });
      setSelectedFile(sampleFile);

      // Trigger selection
      onSelectSample(sample);
    } catch (err: any) {
      console.warn("Could not generate sample audio:", err);
      onSelectSample(sample);
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Target Language & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-950 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              Target Output Language:{" "}
              <span className="text-indigo-400">{settings.targetLanguage}</span>
            </h2>
            <p className="text-xs text-slate-400">
              The AI will automatically detect any spoken language and translate the output to {settings.targetLanguage}.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
        >
          Change in Settings
        </button>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-indigo-500 bg-indigo-950/20 shadow-lg"
            : "border-slate-800 hover:border-slate-700 bg-slate-900/60"
        } ${isProcessing ? "opacity-75 cursor-wait" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.flac"
          onChange={handleFileChange}
          className="hidden"
          disabled={isProcessing}
        />

        {selectedFile ? (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/30">
              <FileAudio className="w-7 h-7" />
            </div>
            <div>
              <p className="font-semibold text-white text-base truncate">
                {selectedFile.name}
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-1">
                <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                <span>·</span>
                <span className="uppercase">{selectedFile.type || "Audio"}</span>
                <span>·</span>
                <span className="text-indigo-400">Ready to transcribe</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handleStartTranscribe}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Transcribe & Translate</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                disabled={isProcessing}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Choose different file"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 text-indigo-400 mx-auto flex items-center justify-center border border-slate-700">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Drag and drop your audio file here
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Supports MP3, WAV, M4A, OGG, WEBM, FLAC — No file size limits
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                Browse Files
              </button>

              <span className="text-xs text-slate-500">or</span>

              {!isDirectRecording ? (
                <button
                  type="button"
                  onClick={startCardRecording}
                  className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Record from Mic</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCardRecording}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop Recording ({formatTimer(recordingSeconds)})</span>
                </button>
              )}
            </div>

            {isDirectRecording && (
              <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-indigo-900 max-w-xs mx-auto">
                <AudioVisualizer
                  stream={directStreamRef.current}
                  isRecording={isDirectRecording}
                  height={32}
                  barColor="#f43f5e"
                />
              </div>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="mt-4 p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>{processingStep}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Built-in Multi-Language Audio Test Samples */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Try Sample Audios (1-Click Test)
            </h3>
            <p className="text-xs text-slate-400">
              Instantly test automatic language detection, translation, and PDF export without uploading files.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SAMPLE_AUDIO_RECORDINGS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handleLoadSample(sample)}
              className="p-4 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span className="font-semibold text-indigo-400">{sample.language}</span>
                  <span className="font-mono tabular-nums">{sample.durationFormatted}</span>
                </div>
                <h4 className="text-xs font-semibold text-slate-100 group-hover:text-white line-clamp-1">
                  {sample.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {sample.description}
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px] text-slate-400">{sample.accent}</span>
                <span className="text-indigo-400 font-semibold group-hover:underline flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  <span>Load Sample</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
