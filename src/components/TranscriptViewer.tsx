import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Search,
  Edit2,
  Check,
  RotateCcw,
  FileText,
  Copy,
  Sparkles,
  Download,
  Share2,
} from "lucide-react";
import type { AppSettings, TranscriptSegment, TranscriptionResult } from "../types";
import { synthesizeTTS } from "../services/apiClient";

interface TranscriptViewerProps {
  result: TranscriptionResult;
  settings: AppSettings;
  onUpdateResult: (updated: TranscriptionResult) => void;
  onOpenExport: () => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  result,
  settings,
  onUpdateResult,
  onOpenExport,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(result.audioDurationSeconds || 30);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editTextOriginal, setEditTextOriginal] = useState("");
  const [editTextTranslated, setEditTextTranslated] = useState("");
  const [layoutMode, setLayoutMode] = useState<"side-by-side" | "stacked" | "translated-only" | "original-only">("side-by-side");
  const [isSynthesizingTTS, setIsSynthesizingTTS] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // Time conversion helper
  const parseTimestampToSeconds = (ts: string): number => {
    const parts = ts.split(":").map(Number);
    if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
    if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    return 0;
  };

  const formatSeconds = (sec: number): string => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // Sync active segment with current audio time
  useEffect(() => {
    const currentSeg = result.segments.find((seg) => {
      const start = parseTimestampToSeconds(seg.startTime);
      const end = parseTimestampToSeconds(seg.endTime);
      return currentTime >= start && currentTime <= end;
    });
    if (currentSeg) {
      setActiveSegmentId(currentSeg.id);
    }
  }, [currentTime, result.segments]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const jumpToSegment = (seg: TranscriptSegment) => {
    const target = parseTimestampToSeconds(seg.startTime);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
      if (!isPlaying) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Editing Segments
  const startEditing = (seg: TranscriptSegment) => {
    setEditingSegmentId(seg.id);
    setEditTextOriginal(seg.originalText);
    setEditTextTranslated(seg.translatedText);
  };

  const saveEdit = (segId: string) => {
    const updatedSegments = result.segments.map((s) =>
      s.id === segId
        ? {
            ...s,
            originalText: editTextOriginal,
            translatedText: editTextTranslated,
            isEdited: true,
          }
        : s
    );

    const updatedResult: TranscriptionResult = {
      ...result,
      segments: updatedSegments,
      fullOriginalTranscript: updatedSegments.map((s) => s.originalText).join(" "),
      fullTranslatedTranscript: updatedSegments.map((s) => s.translatedText).join(" "),
    };

    onUpdateResult(updatedResult);
    setEditingSegmentId(null);
  };

  // Text-To-Speech Playback
  const handleTTS = async (text: string, id: string) => {
    try {
      setIsSynthesizingTTS(id);

      // Try browser speech synthesis first for instant zero-latency speech
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = playbackSpeed;
        utterance.onend = () => setIsSynthesizingTTS(null);
        utterance.onerror = () => setIsSynthesizingTTS(null);
        window.speechSynthesis.speak(utterance);
        return;
      }

      // Or fallback to Gemini TTS
      const audioUrl = await synthesizeTTS(text, settings.ttsVoice);
      if (ttsAudioRef.current) {
        ttsAudioRef.current.src = audioUrl;
        ttsAudioRef.current.play();
        ttsAudioRef.current.onended = () => setIsSynthesizingTTS(null);
      }
    } catch (e) {
      console.warn("TTS error:", e);
      setIsSynthesizingTTS(null);
    }
  };

  // Copy full transcript
  const copyTranscript = () => {
    const text = result.segments
      .map(
        (s) =>
          `[${s.startTime}] ${s.speaker}:\nOriginal: ${s.originalText}\nTranslated: ${s.translatedText}\n`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Filtered segments
  const filteredSegments = result.segments.filter((seg) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      seg.originalText.toLowerCase().includes(q) ||
      seg.translatedText.toLowerCase().includes(q) ||
      seg.speaker.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Hidden audio element for playback */}
      {result.audioBlobUrl && (
        <audio
          ref={audioRef}
          src={result.audioBlobUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      )}
      <audio ref={ttsAudioRef} className="hidden" />

      {/* Floating Audio Control Player Bar */}
      <div className="sticky top-16 z-20 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Playback Button & Scrub bar */}
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={togglePlayPause}
              disabled={!result.audioBlobUrl}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
              className={`p-3 rounded-full text-white transition-all shadow-md shrink-0 ${
                !result.audioBlobUrl
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="tabular-nums">{formatSeconds(currentTime)}</span>
                <span className="truncate max-w-[200px] text-slate-300 font-sans font-medium text-center">
                  {result.fileName || result.title}
                </span>
                <span className="tabular-nums">{formatSeconds(duration)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Audio scrubber slider"
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Speed & Volume & Primary PDF Export button */}
          <div className="flex items-center justify-between md:justify-end gap-3 text-xs shrink-0">
            {/* Speed Selector */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
              {[0.75, 1, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => changeSpeed(spd)}
                  className={`px-2 py-1 rounded transition-colors tabular-nums ${
                    playbackSpeed === spd
                      ? "bg-indigo-600 text-white font-medium"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Export PDF Button */}
            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>Export to PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Layout Toggle, Copy */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript words or speakers..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 tabular-nums font-mono">
              {filteredSegments.length} matches
            </span>
          )}
        </div>

        {/* Layout Mode Segmented Control */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setLayoutMode("side-by-side")}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                layoutMode === "side-by-side"
                  ? "bg-slate-800 text-white font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setLayoutMode("stacked")}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                layoutMode === "stacked"
                  ? "bg-slate-800 text-white font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Stacked
            </button>
            <button
              onClick={() => setLayoutMode("translated-only")}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                layoutMode === "translated-only"
                  ? "bg-slate-800 text-white font-medium shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Translation Only
            </button>
          </div>

          <button
            onClick={copyTranscript}
            title="Copy full transcript"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            {copiedNotification ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Segments List */}
      <div className="space-y-3">
        {filteredSegments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>No matching transcript segments found.</p>
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const isActive = activeSegmentId === seg.id;
            const isEditing = editingSegmentId === seg.id;

            return (
              <div
                key={seg.id}
                className={`p-5 rounded-2xl transition-all border ${
                  isActive
                    ? "bg-slate-900 border-indigo-500/70 shadow-md ring-1 ring-indigo-500/20"
                    : "bg-slate-900/70 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                {/* Segment Meta Row */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => jumpToSegment(seg)}
                      className="font-mono text-indigo-400 hover:text-indigo-300 font-semibold tabular-nums flex items-center gap-1 group"
                      title="Jump audio to this timestamp"
                    >
                      <Play className="w-3 h-3 group-hover:scale-110 transition-transform" />
                      <span>{seg.startTime} - {seg.endTime}</span>
                    </button>
                    <span>·</span>
                    <span className="font-semibold text-slate-200">{seg.speaker}</span>
                    {seg.detectedLanguage && (
                      <>
                        <span>·</span>
                        <span className="text-slate-400">{seg.detectedLanguage}</span>
                      </>
                    )}
                    {seg.isEdited && (
                      <span className="text-[11px] text-amber-400 font-medium ml-1">
                        (Edited)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTTS(seg.translatedText, seg.id)}
                      title="Listen to translation"
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition-colors"
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isSynthesizingTTS === seg.id ? "animate-pulse text-indigo-400" : ""}`} />
                    </button>
                    <button
                      onClick={() =>
                        isEditing ? saveEdit(seg.id) : startEditing(seg)
                      }
                      title={isEditing ? "Save changes" : "Edit segment text"}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      {isEditing ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Edit2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content according to Layout Mode */}
                {isEditing ? (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">
                        Spoken Text ({result.detectedLanguage}):
                      </label>
                      <textarea
                        value={editTextOriginal}
                        onChange={(e) => setEditTextOriginal(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-indigo-400 mb-1">
                        Translated Text ({result.targetLanguage}):
                      </label>
                      <textarea
                        value={editTextTranslated}
                        onChange={(e) => setEditTextTranslated(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                        rows={2}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingSegmentId(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(seg.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
                      >
                        Save Updates
                      </button>
                    </div>
                  </div>
                ) : layoutMode === "side-by-side" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                        Spoken ({seg.detectedLanguage || result.detectedLanguage})
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed font-normal">
                        {seg.originalText}
                      </p>
                    </div>
                    <div className="md:border-l md:border-slate-800 md:pl-4">
                      <span className="block text-[11px] uppercase tracking-wider text-indigo-400 font-semibold mb-1">
                        Translation ({result.targetLanguage})
                      </span>
                      <p className="text-sm text-white font-medium leading-relaxed">
                        {seg.translatedText}
                      </p>
                    </div>
                  </div>
                ) : layoutMode === "stacked" ? (
                  <div className="space-y-2">
                    <div>
                      <span className="block text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
                        Spoken ({seg.detectedLanguage || result.detectedLanguage})
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed font-normal">
                        {seg.originalText}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="block text-[11px] uppercase tracking-wider text-indigo-400 font-semibold mb-0.5">
                        Translation ({result.targetLanguage})
                      </span>
                      <p className="text-sm text-white font-medium leading-relaxed">
                        {seg.translatedText}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-white font-medium leading-relaxed">
                      {seg.translatedText}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
