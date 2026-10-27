import React, { useState } from "react";
import {
  X,
  Globe,
  Type,
  Eye,
  Sliders,
  Check,
  Search,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { AppSettings } from "../types";
import { SUPPORTED_TARGET_LANGUAGES } from "../data/languages";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [current, setCurrent] = useState<AppSettings>({ ...settings });
  const [langSearch, setLangSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"languages" | "captions" | "accessibility">("languages");

  if (!isOpen) return null;

  const filteredLanguages = SUPPORTED_TARGET_LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(langSearch.toLowerCase()) ||
      l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const handleSelectLanguage = (langName: string, langCode: string) => {
    setCurrent((prev) => ({
      ...prev,
      targetLanguage: langName,
      targetLanguageCode: langCode,
    }));
  };

  const handleSave = () => {
    onSaveSettings(current);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 id="settings-dialog-title" className="text-base font-bold text-white tracking-tight">
              Transcription & Accessibility Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab("languages")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "languages"
                ? "border-indigo-500 text-white font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Target Language
          </button>
          <button
            onClick={() => setActiveTab("captions")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "captions"
                ? "border-indigo-500 text-white font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Captioning Preferences
          </button>
          <button
            onClick={() => setActiveTab("accessibility")}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "accessibility"
                ? "border-indigo-500 text-white font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Accessibility
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Target Language */}
          {activeTab === "languages" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Default Target Output Language
                </label>
                <p className="text-xs text-slate-400">
                  Any audio uploaded or spoken in real-time will automatically have its original language detected and will be translated into this language.
                </p>
              </div>

              {/* Language Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  placeholder="Search languages (e.g. Spanish, French, Japanese, Hindi)..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Languages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredLanguages.map((lang) => {
                  const isSelected = current.targetLanguage === lang.name;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang.name, lang.code)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/30"
                          : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-sm block">
                          {lang.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {lang.nativeName}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Captioning Preferences */}
          {activeTab === "captions" && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Caption Font Size
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: "standard", label: "Standard (18px)" },
                      { id: "large", label: "Large (24px)" },
                      { id: "extra-large", label: "Extra Large (32px)" },
                      { id: "jumbo", label: "Jumbo (42px)" },
                    ] as const
                  ).map((size) => (
                    <button
                      key={size.id}
                      onClick={() =>
                        setCurrent((p) => ({ ...p, captionFontSize: size.id }))
                      }
                      className={`p-3 rounded-xl border text-xs font-medium text-center transition-all ${
                        current.captionFontSize === size.id
                          ? "bg-indigo-950/60 border-indigo-500 text-white"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Caption Presentation Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "bilingual", label: "Bilingual (Dual)" },
                      { id: "translated-only", label: "Translation Only" },
                      { id: "original-only", label: "Original Only" },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      onClick={() =>
                        setCurrent((p) => ({ ...p, captionMode: m.id }))
                      }
                      className={`p-3 rounded-xl border text-xs font-medium text-center transition-all ${
                        current.captionMode === m.id
                          ? "bg-indigo-950/60 border-indigo-500 text-white"
                          : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">
                  Speech Synthesis Voice (TTS Readback)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(["Kore", "Puck", "Fenrir", "Charon", "Zephyr"] as const).map(
                    (v) => (
                      <button
                        key={v}
                        onClick={() =>
                          setCurrent((p) => ({ ...p, ttsVoice: v }))
                        }
                        className={`p-2.5 rounded-xl border text-xs font-medium text-center transition-all ${
                          current.ttsVoice === v
                            ? "bg-indigo-950/60 border-indigo-500 text-white"
                            : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {v}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Accessibility */}
          {activeTab === "accessibility" && (
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-sm text-slate-200 block">
                    Auto-Scroll Real-Time Captions
                  </span>
                  <span className="text-xs text-slate-400">
                    Smoothly follow newly transcribed sentences as they arrive in live mode.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={current.autoScroll}
                  onChange={(e) =>
                    setCurrent((p) => ({ ...p, autoScroll: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-sm text-slate-200 block">
                    Dyslexia-Friendly Typography
                  </span>
                  <span className="text-xs text-slate-400">
                    Increase letter spacing, character distinction, and readability margins.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={current.dyslexicFont}
                  onChange={(e) =>
                    setCurrent((p) => ({ ...p, dyslexicFont: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl bg-slate-950/40 border border-slate-800 cursor-pointer">
                <div>
                  <span className="font-semibold text-sm text-slate-200 block">
                    Audio Frequency Visualizer
                  </span>
                  <span className="text-xs text-slate-400">
                    Show dynamic audio soundwave during playback and microphone capture.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={current.audioVisualizerEnabled}
                  onChange={(e) =>
                    setCurrent((p) => ({
                      ...p,
                      audioVisualizerEnabled: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <span className="text-xs text-slate-400">
            Target language: <strong className="text-white">{current.targetLanguage}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
