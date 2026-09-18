import React from "react";
import { useT } from "../../context/ThemeContext";

export const Sidebar = ({ step, maxReached, onJump, serverStatuses }) => {
  const T = useT();
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
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: "linear-gradient(135deg, #2563eb, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            ⚡
          </div>
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
        {Array.from({ length: 5 }).map((_, i) => {
          const active = i === step;
          const done = i < step;
          const clickable = i <= maxReached;
          return (
            <button
              key={i}
              onClick={() => clickable && onJump(i)}
              className={clickable ? "app-btn" : ""}
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
                  SSSSS
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

      <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${T.border}` }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: T.dim,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 10,
            fontFamily: T.fontSans,
          }}
        >
          Servers
        </div>
        {/* {Object.entries(SERVERS).map(([key, srv]) => {
          const st = serverStatuses[key];
          const online = st === "online";
          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 6,
                marginBottom: 4,
                background: T.elevated,
                border: `1px solid ${T.borderSub}`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: online ? T.green : st === "checking" ? T.amber : T.red,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.text, fontFamily: T.fontMono, lineHeight: 1 }}>
                  {srv.label}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: T.muted,
                    fontFamily: T.fontMono,
                    marginTop: 2,
                  }}
                >
                  {online ? "online" : st === "checking" ? "pinging…" : "offline"}
                </div>
              </div>
            </div>
          );
        })} */}
      </div>
    </div>
  );
};

