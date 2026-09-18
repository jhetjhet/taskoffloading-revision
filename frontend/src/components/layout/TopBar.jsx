import React from "react";
import { useT } from "../../context/ThemeContext";
import { STEPS, WORKLOAD_LABELS, resolveServer } from "../../config/constants";

export const TopBar = ({ step, maxReached, onJump, algoDecision, dark, setDark, workload }) => {
  const T = useT();

  const srv = algoDecision ? resolveServer(algoDecision) : null;
  const srvAccent = algoDecision === "A" ? T.blue : T.green;
  const srvAccentBg = algoDecision === "A" ? T.blueBg : T.greenBg;
  const srvAccentDim = algoDecision === "A" ? T.blueDim : T.greenDim;

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
      <span style={{ fontSize: 15, color: T.muted, fontFamily: T.fontSans }}>Simulation</span>
      <span style={{ color: T.border, fontSize: 15 }}>›</span>
      <span style={{ fontSize: 15, color: T.text, fontWeight: 600, fontFamily: T.fontSans }}>
        {STEPS[step].title}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 16, overflow: "hidden" }}>
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          const clickable = i <= maxReached;
          return (
            <React.Fragment key={i}>
              <button
                onClick={() => clickable && onJump(i)}
                className={clickable ? "app-btn" : ""}
                style={{
                  padding: "3px 10px",
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: active ? 700 : 400,
                  fontFamily: T.fontMono,
                  background: active ? T.greenBg : done ? T.elevated : "transparent",
                  color: active ? T.green : done ? T.muted : T.dim,
                  border: `1px solid ${active ? T.greenDim : done ? T.border : "transparent"}`,
                  cursor: clickable ? "pointer" : "default",
                  whiteSpace: "nowrap",
                }}
              >
                {done ? "✓ " : ""}
                {s.short}
              </button>
              {i < STEPS.length - 1 && <span style={{ color: T.border, fontSize: 13 }}>—</span>}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {workload && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              fontFamily: T.fontMono,
              color: workload === "high" ? T.red : workload === "medium" ? T.amber : T.green,
              background: workload === "high" ? T.redBg : workload === "medium" ? T.amberBg : T.greenBg,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              padding: "3px 10px",
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.7 }}>workload →</span>
            {WORKLOAD_LABELS[workload]}
          </div>
        )}
        {srv && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 14,
              fontFamily: T.fontMono,
              color: srvAccent,
              background: srvAccentBg,
              border: `1px solid ${srvAccentDim}`,
              borderRadius: 4,
              padding: "3px 10px",
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.7 }}>algo →</span>
            {srv.icon} {srv.label}
          </div>
        )}
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
          {step + 1} / {STEPS.length}
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

