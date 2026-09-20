import React from "react";
import { useT } from "../../context/ThemeContext";

export const TopBar = ({ view, step, dark, setDark }) => {
  const T = useT();

  return (
    <div
      style={{
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        padding: "0 24px",
        minHeight: 52,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        boxShadow:
          T.bg === "#eef0f5"
            ? "0 1px 3px rgba(15,17,23,0.05)"
            : "0 1px 3px rgba(0,0,0,0.25)",
        position: "relative",
        zIndex: 5,
      }}
    >

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            fontSize: 14,
            fontFamily: T.fontMono,
            color: T.muted,
            background: T.elevated,
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            padding: "3px 10px",
          }}
        >
          {view === "history" ? "History Overview" : `Step ${step + 1} / 4`}
        </div>
        <button
          className="app-btn"
          onClick={() => setDark((d) => !d)}
          title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: T.elevated,
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: "5px 12px 5px 8px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{dark ? "🌙" : "☀️"}</span>
          <div
            style={{
              position: "relative",
              width: 34,
              height: 19,
              borderRadius: 10,
              background: dark ? T.green : T.blue,
              transition: "background 0.25s",
              flexShrink: 0,
              opacity: 0.85,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 3,
                left: dark ? 16 : 3,
                width: 13,
                height: 13,
                borderRadius: "50%",
                background: "#ffffff",
                transition: "left 0.25s cubic-bezier(.4,0,.2,1)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 14,
              color: T.muted,
              fontFamily: T.fontMono,
              userSelect: "none",
              minWidth: 28,
            }}
          >
            {dark ? "Dark" : "Light"}
          </span>
        </button>
      </div>
    </div>
  );
};

