import React from "react";

/* ───────────────────────────────────────────────
   DESIGN TOKENS (Dark & Light)
─────────────────────────────────────────────── */
export const makeTheme = (dark) =>
  dark
    ? {
        bg: "#0f1117",
        surface: "#1a1d27",
        elevated: "#22263a",
        border: "#2e3347",
        borderSub: "#1e2235",
        text: "#e8eaf0",
        muted: "#8b90a7",
        dim: "#4a5070",
        blue: "#60a5fa",
        blueDim: "#1d3a6e",
        blueBg: "#0d1f3c",
        green: "#34d399",
        greenDim: "#064e3b",
        greenBg: "#022c22",
        purple: "#a78bfa",
        purpleDim: "#3b1fa8",
        purpleBg: "#1e0a4a",
        amber: "#fbbf24",
        amberBg: "#292100",
        red: "#f87171",
        redBg: "#2d0a0a",
        fontMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSans: "'Inter', system-ui, -apple-system, sans-serif",
      }
    : {
        bg: "#eef0f5",
        surface: "#ffffff",
        elevated: "#f4f6fb",
        border: "#c8cdd8",
        borderSub: "#dde0ea",
        text: "#111827",
        muted: "#4b5563",
        dim: "#9ca3af",
        blue: "#1d4ed8",
        blueDim: "#bfdbfe",
        blueBg: "#dbeafe",
        green: "#065f46",
        greenDim: "#6ee7b7",
        greenBg: "#d1fae5",
        purple: "#5b21b6",
        purpleDim: "#c4b5fd",
        purpleBg: "#ede9fe",
        amber: "#92400e",
        amberBg: "#fef3c7",
        red: "#991b1b",
        redBg: "#fee2e2",
        fontMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSans: "'Inter', system-ui, -apple-system, sans-serif",
      };

export const ThemeCtx = React.createContext(makeTheme(true));
export const useT = () => React.useContext(ThemeCtx);

/* ───────────────────────────────────────────────
   GLOBAL STYLESHEET
─────────────────────────────────────────────── */
export function buildGlobalStyles(T) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; background: ${T.bg}; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: ${T.bg}; }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: ${T.dim}; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .app-btn { will-change: transform; }
    .app-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
    .app-btn:active:not(:disabled) { transform: translateY(0); filter: brightness(0.96); }
    .app-btn:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; }
    .app-btn:disabled { opacity: 0.7; }
    .app-row:hover { background: ${T.blueBg} !important; }
    .app-clickable { transition: transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease; cursor: pointer; }
    .app-clickable:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.28); }
    .app-clickable:active { transform: translateY(0); }
    .app-clickable:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; }
    a, button { font-family: inherit; }
    button { outline: none; }
    .app-fade-in { animation: fadeIn 0.25s ease both; }
    svg, .recharts-wrapper, .recharts-surface, canvas { background: transparent !important; }
    @media (max-width: 900px) {
      .app-grid-21, .app-grid-311 { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 640px) {
      .app-grid-eq { grid-template-columns: 1fr !important; }
    }
  `;
}

