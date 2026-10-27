import React from "react";
import {
  Sparkles,
  CheckCircle2,
  Languages,
  Clock,
  Layers,
  FileText,
  Volume2,
} from "lucide-react";
import type { TranscriptionResult } from "../types";

interface SummarySectionProps {
  result: TranscriptionResult;
  onOpenExport: () => void;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  result,
  onOpenExport,
}) => {
  const confidencePercent = (result.confidenceScore * 100).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Top Meta Card */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>AI Verified</span>
              </span>
              <span>·</span>
              <span>Detected: <strong className="text-white">{result.detectedLanguage}</strong></span>
              <span>·</span>
              <span>Confidence: <strong className="text-white">{confidencePercent}%</strong></span>
              <span>·</span>
              <span>Target: <strong className="text-indigo-400">{result.targetLanguage}</strong></span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              {result.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Segments
            </span>
            <span className="text-lg font-bold text-white font-mono tabular-nums">
              {result.segments.length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Word Count
            </span>
            <span className="text-lg font-bold text-white font-mono tabular-nums">
              {result.fullOriginalTranscript.split(/\s+/).filter(Boolean).length}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Source Language
            </span>
            <span className="text-sm font-bold text-indigo-300 truncate block mt-0.5">
              {result.detectedLanguage}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Target Output
            </span>
            <span className="text-sm font-bold text-emerald-400 truncate block mt-0.5">
              {result.targetLanguage}
            </span>
          </div>
        </div>
      </div>

      {/* Executive Summary & Key Points */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Executive Overview</span>
          </div>
          <p className="text-sm md:text-base text-slate-200 leading-relaxed font-normal">
            {result.summary}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Key Action Points</span>
          </div>
          <ul className="space-y-2 text-xs md:text-sm text-slate-300">
            {result.keyTakeaways?.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                <span className="leading-snug">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
