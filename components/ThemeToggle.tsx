"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/theme/ThemeContext";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-sm border border-[#2D3345] bg-[#11131A] hover:bg-[#1C1F2B] hover:border-amber/50 flex items-center justify-center text-slate-custom hover:text-amber cursor-pointer transition-all active:scale-95 theme-toggle-btn"
        title="Ubah Tema"
        aria-label="Ubah Tema"
      >
        {resolvedTheme === "light" ? (
          /* Sun icon */
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m9 5.5a5 5 0 11-10 0 5 5 0 0110 0z" />
          </svg>
        ) : (
          /* Moon icon */
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-sm glass-card border border-[#2D3345] shadow-2xl z-50 py-1 text-xs select-none">
          <button
            onClick={() => {
              setTheme("light");
              setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-2.5 hover:bg-[#1C1F2B] hover:text-amber flex items-center gap-2 cursor-pointer transition-colors ${
              theme === "light" ? "text-amber font-bold bg-[#151821]/45" : "text-slate-custom font-semibold"
            }`}
          >
            <span className="text-sm">☀️</span>
            <span>Mode Terang</span>
            {theme === "light" && <span className="ml-auto text-[10px]">●</span>}
          </button>
          <button
            onClick={() => {
              setTheme("dark");
              setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-2.5 hover:bg-[#1C1F2B] hover:text-amber flex items-center gap-2 cursor-pointer transition-colors ${
              theme === "dark" ? "text-amber font-bold bg-[#151821]/45" : "text-slate-custom font-semibold"
            }`}
          >
            <span className="text-sm">🌙</span>
            <span>Mode Gelap</span>
            {theme === "dark" && <span className="ml-auto text-[10px]">●</span>}
          </button>
          <button
            onClick={() => {
              setTheme("system");
              setIsOpen(false);
            }}
            className={`w-full text-left px-4 py-2.5 hover:bg-[#1C1F2B] hover:text-amber flex items-center gap-2 cursor-pointer transition-colors ${
              theme === "system" ? "text-amber font-bold bg-[#151821]/45" : "text-slate-custom font-semibold"
            }`}
          >
            <span className="text-sm">🖥️</span>
            <span>Ikuti Sistem</span>
            {theme === "system" && <span className="ml-auto text-[10px]">●</span>}
          </button>
        </div>
      )}
    </div>
  );
}
