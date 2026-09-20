import React from "react";
import { useT } from "../../context/ThemeContext";

export const SIDEBAR_STEPS = [
  { id: "machines", label: "Machines" },
  { id: "workloads", label: "Workloads" },
  { id: "offloading", label: "Offloading" },
  { id: "reports", label: "Reports" },
];

export const Sidebar = ({ view, step, maxReached, onSelectView, onJump }) => {
  const T = useT();
  const isHistory = view === "history";
  
  return (
    <div
      style={{
        width: 220,
        background: T.bg,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
        flexShrink: 0,
        borderRight: `1px solid ${T.border}`,
      }}
    >
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: T.text,
                letterSpacing: "-0.01em",
                fontFamily: T.fontSans,
                lineHeight: 1.3,
              }}
            >
              Task Offloading
              <br />
              Simulation System
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 12px", flex: 1 }}>
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => onSelectView("history")}
            className="app-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "9px 10px",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              background: isHistory ? T.elevated : "transparent",
              outline: isHistory ? `1px solid ${T.border}` : "none",
              transition: "background 0.12s ease, transform 0.12s ease",
            }}
            onMouseEnter={(e) => {
              if (!isHistory) e.currentTarget.style.background = T.elevated;
            }}
            onMouseLeave={(e) => {
              if (!isHistory) e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                background: isHistory ? T.blue : T.elevated,
                color: isHistory ? "#ffffff" : T.dim,
                border: `1px solid ${isHistory ? T.blue : T.border}`,
              }}
            >
              📜
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: isHistory ? 600 : 500,
                  color: isHistory ? T.text : T.muted,
                  fontFamily: T.fontSans,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Simulation History
              </div>
            </div>
            {isHistory && (
              <div
                style={{
                  width: 3,
                  height: 14,
                  borderRadius: 2,
                  background: T.blue,
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: T.dim,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            padding: "0 8px",
            marginBottom: 8,
            fontFamily: T.fontSans,
          }}
        >
          Pipeline
        </div>
        
        {SIDEBAR_STEPS.map((item, i) => {
          const active = !isHistory && i === step;
          const done = i < step;
          const clickable = i <= maxReached;
          
          return (
            <button
              key={item.id}
              onClick={() => clickable && onJump(i)}
              className={clickable ? "app-btn" : ""}
              aria-disabled={!clickable}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 10px",
                borderRadius: 6,
                border: "none",
                cursor: clickable ? "pointer" : "default",
                textAlign: "left",
                marginBottom: 2,
                background: active ? T.elevated : "transparent",
                outline: active ? `1px solid ${T.border}` : "none",
                transition: "background 0.12s ease, transform 0.12s ease",
              }}
              onMouseEnter={(e) => {
                if (clickable && !active) e.currentTarget.style.background = T.elevated;
              }}
              onMouseLeave={(e) => {
                if (clickable && !active) e.currentTarget.style.background = "transparent";
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: done ? 11 : 12,
                  fontWeight: 700,
                  fontFamily: T.fontMono,
                  background: active ? T.green : done ? T.greenDim : T.elevated,
                  color: active
                    ? T.bg === "#eef0f5"
                      ? "#fff"
                      : "#0d1117"
                    : done
                    ? T.green
                    : T.dim,
                  border: `1px solid ${active ? T.green : done ? T.greenDim : T.border}`,
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: active ? 600 : 400,
                    color: active ? T.text : done ? T.muted : T.dim,
                    fontFamily: T.fontSans,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.label}
                </div>
              </div>
              {active && (
                <div
                  style={{
                    width: 3,
                    height: 14,
                    borderRadius: 2,
                    background: T.green,
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};