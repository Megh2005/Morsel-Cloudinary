"use client";

import React, { useState, useEffect } from "react";
import { Globe, Check, ChevronDown, Languages } from "lucide-react";

export interface Language {
  code: string;
  name: string;
  native: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "es", name: "Spanish", native: "Español" },
  { code: "fr", name: "French", native: "Français" },
  { code: "de", name: "German", native: "Deutsch" },
  { code: "ja", name: "Japanese", native: "日本語" },
  { code: "ar", name: "Arabic", native: "العربية" },
];

export default function LanguageSelector() {
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("morsel_lang");
    if (saved) {
      const match = LANGUAGES.find((l) => l.code === saved);
      if (match) setSelectedLang(match);
    }
  }, []);

  const handleSelect = (lang: Language) => {
    setSelectedLang(lang);
    localStorage.setItem("morsel_lang", lang.code);
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent("morsel_language_change", { detail: { lang: lang.code } })
    );
  };

  return (
    <div className="relative inline-block text-left z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-slate-900 bg-white/95 backdrop-blur-sm text-slate-900 text-xs font-bold hover:bg-slate-100 hover:shadow-md transition-all dark:bg-slate-900 dark:text-white dark:border-slate-700"
        title="Select Language"
      >
        <Languages className="w-3.5 h-3.5 text-sky-900 dark:text-sky-300" />
        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-950 dark:bg-sky-900/60 dark:text-sky-200 text-[10px] font-black tracking-wider uppercase border border-sky-300 dark:border-sky-700">
          {selectedLang.code}
        </span>
        <span className="hidden sm:inline font-semibold">{selectedLang.native}</span>
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 rounded-2xl border-2 border-slate-900 bg-white shadow-2xl z-50 overflow-hidden py-1 dark:bg-slate-900 dark:border-slate-700">
            <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-sky-900 dark:text-sky-400" />
              <span>Google Translate</span>
            </div>
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLang.code === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors ${
                    isSelected
                      ? "bg-sky-100/70 font-bold text-sky-950 dark:bg-sky-900/40 dark:text-sky-200"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {lang.code}
                    </span>
                    <span>{lang.native}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-900 dark:text-sky-300" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
