import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  FileText,
  X,
  Volume2,
  Languages,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import type { AppSettings, TranscriptSegment, TranscriptionResult } from "../types";
import { translateLiveText } from "../services/apiClient";
import { AudioVisualizer } from "./AudioVisualizer";

interface LiveCaptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveAndExportPDF: (result: TranscriptionResult) => void;
  onSaveToWorkspace: (result: TranscriptionResult) => void;
}

export const LiveCaptionModal: React.FC<LiveCaptionModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveAndExportPDF,
  onSaveToWorkspace,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("Detecting...");
  const [detectedLanguageCode, setDetectedLanguageCode] = useState<string>("auto");
  const [currentInterim, setCurrentInterim] = useState<string>("");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [captionSize, setCaptionSize] = useState(settings.captionFontSize);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  // Keep track of start time for segment timestamps
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setCaptionSize(settings.captionFontSize);
  }, [settings.captionFontSize]);

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      stopSession();
    }
    return () => {
      stopSession();
    };
  }, [isOpen]);

  // Auto-scroll when new captions arrive
  useEffect(() => {
    if (settings.autoScroll && scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [segments, currentInterim, settings.autoScroll]);

  const startSession = async () => {
    setErrorMsg(null);
    setElapsedSeconds(0);
    setSegments([]);
    setCurrentInterim("");
    setDetectedLanguage("Detecting language...");
    startTimeRef.current = Date.now();

    // Start timer
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Request microphone access for audio visualizer
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
      }
    } catch (e: any) {
      console.warn("Microphone stream error:", e);
      setErrorMsg("Microphone access is required for real-time captions.");
    }

    // Initialize Web Speech API for zero-latency speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = async (event: any) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            handleFinalPhrase(transcript.trim());
          } else {
            interimText += transcript;
          }
        }
        setCurrentInterim(interimText);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMsg("Microphone permission was denied. Please allow microphone access.");
        }
      };

      recognition.onend = () => {
        // Auto-restart if modal is still open
        if (isRecording && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            // Already started or busy
          }
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch (e) {
        console.warn("Could not start recognition:", e);
      }
    } else {
      setErrorMsg("Browser SpeechRecognition not supported. Please use Chrome, Edge, or Safari.");
    }
  };

  const handleFinalPhrase = async (phrase: string) => {
    if (!phrase) return;
    setCurrentInterim("");
    setIsTranslating(true);

    const now = Date.now();
    const startSec = Math.floor((now - startTimeRef.current) / 1000);
    const endSec = startSec + Math.max(2, Math.floor(phrase.length / 15));

    const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60)
        .toString()
        .padStart(2, "0");
      const s = (sec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    };

    const newSegment: TranscriptSegment = {
      id: `live-seg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      startTime: formatTime(startSec),
      endTime: formatTime(endSec),
      speaker: "Speaker 1",
      originalText: phrase,
      translatedText: phrase, // placeholder until translation completes
      detectedLanguage: detectedLanguageCode !== "auto" ? detectedLanguage : undefined,
    };

    // Add immediately to segments for instant feedback
    setSegments((prev) => [...prev, newSegment]);

    try {
      // Call Gemini translation endpoint
      const result = await translateLiveText(phrase, settings.targetLanguage);
      if (result.detectedLanguage) {
        setDetectedLanguage(result.detectedLanguage);
        setDetectedLanguageCode(result.detectedLanguageCode);
      }

      // Update segment with translation
      setSegments((prev) =>
        prev.map((s) =>
          s.id === newSegment.id
            ? {
                ...s,
                translatedText: result.translatedText || phrase,
                detectedLanguage: result.detectedLanguage,
              }
            : s
        )
      );
    } catch (err) {
      console.warn("Translation failed for segment:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const stopSession = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
        } catch {}
      } else {
        startSession();
      }
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (modalContainerRef.current?.requestFullscreen) {
        modalContainerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const buildResult = (): TranscriptionResult => {
    const fullOrig = segments.map((s) => s.originalText).join(" ");
    const fullTrans = segments.map((s) => s.translatedText).join(" ");
    return {
      id: `live-session-${Date.now()}`,
      title: `Live Captions Session (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
      detectedLanguage: detectedLanguage.replace("Detecting...", "").trim() || "Multi-Language",
      detectedLanguageCode: detectedLanguageCode,
      confidenceScore: 0.96,
      targetLanguage: settings.targetLanguage,
      summary: `Real-time bilingual session captured on ${new Date().toLocaleDateString()}. Speech automatically translated into ${settings.targetLanguage}.`,
      keyTakeaways: [
        `Live continuous capture across ${segments.length} segments.`,
        `Primary target translation: ${settings.targetLanguage}.`,
        `Session length: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s.`,
      ],
      fullOriginalTranscript: fullOrig,
      fullTranslatedTranscript: fullTrans,
      segments: segments,
      createdAt: new Date().toISOString(),
      audioDurationSeconds: elapsedSeconds,
    };
  };

  const handleExportPDF = () => {
    if (segments.length === 0) return;
    const result = buildResult();
    onSaveAndExportPDF(result);
  };

  const handleFinishToWorkspace = () => {
    if (segments.length > 0) {
      const result = buildResult();
      onSaveToWorkspace(result);
    }
    stopSession();
    onClose();
  };

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Font size classes
  const fontClasses = {
    standard: "text-lg md:text-xl",
    large: "text-xl md:text-2xl",
    "extra-large": "text-2xl md:text-3xl",
    jumbo: "text-3xl md:text-4xl",
  }[captionSize];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-caption-title"
      ref={modalContainerRef}
      className={`fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 ${
        isFullscreen ? "h-screen w-screen" : "bg-slate-950/95 backdrop-blur-md"
      }`}
    >
      {/* Top Header Controls Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleRecording}
              aria-label={isRecording ? "Pause microphone" : "Resume microphone"}
              className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
                isRecording
                  ? "bg-red-500 text-white hover:bg-red-600 shadow-md ring-4 ring-red-500/20"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {isRecording ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <div>
              <h2 id="live-caption-title" className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Real-Time Captions</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 tabular-nums">
                  {formatTimer(elapsedSeconds)}
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <Languages className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Detected: <strong className="text-slate-200 font-medium">{detectedLanguage}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Target: <strong className="text-indigo-300 font-medium">{settings.targetLanguage}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audio Visualizer Mini Bar */}
        <div className="hidden sm:block w-40 h-8">
          <AudioVisualizer
            stream={mediaStreamRef.current}
            isRecording={isRecording}
            height={32}
            barColor="#818cf8"
          />
        </div>

        {/* Actions & Accessibility Font Control */}
        <div className="flex items-center gap-3">
          {/* Quick Caption Size Selector */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
            <button
              onClick={() => setCaptionSize("standard")}
              className={`px-2 py-1 rounded transition-colors ${
                captionSize === "standard" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setCaptionSize("large")}
              className={`px-2 py-1 rounded transition-colors ${
                captionSize === "large" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Large
            </button>
            <button
              onClick={() => setCaptionSize("extra-large")}
              className={`px-2 py-1 rounded transition-colors ${
                captionSize === "extra-large" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              XL
            </button>
            <button
              onClick={() => setCaptionSize("jumbo")}
              className={`px-2 py-1 rounded transition-colors ${
                captionSize === "jumbo" ? "bg-indigo-600 text-white font-medium" : "text-slate-400 hover:text-white"
              }`}
            >
              Jumbo
            </button>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={segments.length === 0}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors shadow-sm whitespace-nowrap ${
              segments.length === 0
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export to PDF</span>
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Stage View"}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleFinishToWorkspace}
            title="Save to Workspace and Close"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Real-Time Captions Teleprompter Canvas */}
      <div
        className="flex-1 overflow-y-auto p-6 md:p-12 space-y-6 flex flex-col justify-end"
        style={{ scrollBehavior: "smooth" }}
      >
        {errorMsg && (
          <div className="bg-red-950/80 border border-red-800 rounded-xl p-4 text-red-200 text-sm max-w-xl mx-auto text-center">
            {errorMsg}
          </div>
        )}

        {segments.length === 0 && !currentInterim && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <div className="w-16 h-16 rounded-full bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center text-indigo-400 mb-4">
              <Mic className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              Listening for audio speech...
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              Speak in any language (Spanish, French, Japanese, Hindi, German, English, etc.). The system will automatically detect it and project live real-time captions translated to <strong>{settings.targetLanguage}</strong>.
            </p>
          </div>
        )}

        {/* Render Finalized Segments */}
        <div className="space-y-6 max-w-5xl mx-auto w-full">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 transition-all hover:border-slate-700"
            >
              {/* Segment Metadata */}
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-mono">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-indigo-400">{seg.speaker}</span>
                  <span>·</span>
                  <span className="tabular-nums">{seg.startTime}</span>
                  {seg.detectedLanguage && (
                    <>
                      <span>·</span>
                      <span className="text-slate-400 font-sans">{seg.detectedLanguage}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Bilingual Display based on settings.captionMode */}
              {settings.captionMode === "bilingual" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">
                      Spoken ({seg.detectedLanguage || detectedLanguage})
                    </span>
                    <p className={`${fontClasses} font-normal text-slate-300 leading-relaxed`}>
                      {seg.originalText}
                    </p>
                  </div>
                  <div className="md:border-l md:border-slate-800 md:pl-4">
                    <span className="block text-xs uppercase tracking-wider text-indigo-400 font-semibold mb-1">
                      Translation ({settings.targetLanguage})
                    </span>
                    <p className={`${fontClasses} font-semibold text-white leading-relaxed`}>
                      {seg.translatedText}
                    </p>
                  </div>
                </div>
              )}

              {settings.captionMode === "translated-only" && (
                <div>
                  <p className={`${fontClasses} font-semibold text-white leading-relaxed`}>
                    {seg.translatedText}
                  </p>
                </div>
              )}

              {settings.captionMode === "original-only" && (
                <div>
                  <p className={`${fontClasses} font-normal text-slate-200 leading-relaxed`}>
                    {seg.originalText}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Currently Spoken Live Interim Words */}
          {currentInterim && (
            <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-700/60 transition-all">
              <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono mb-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>Live Speech Processing...</span>
              </div>
              <p className={`${fontClasses} text-indigo-200 font-medium italic`}>
                "{currentInterim}..."
              </p>
            </div>
          )}

          <div ref={scrollAnchorRef} />
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-4 shrink-0 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isRecording ? "bg-emerald-500" : "bg-slate-600"}`} />
            <span>{isRecording ? "Live Captioning Active" : "Paused"}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>{segments.length} segments captured</span>
          {isTranslating && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-indigo-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-spin" />
                <span>AI Translating...</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={segments.length === 0}
            className="text-slate-300 hover:text-white transition-colors underline font-medium"
          >
            Export as PDF Document
          </button>
          <span>·</span>
          <button
            onClick={handleFinishToWorkspace}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Finish & Review in Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
