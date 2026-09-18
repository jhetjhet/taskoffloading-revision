import React from "react";
import { useT } from "../../context/ThemeContext";

export const Card = ({ title, sub, children, accent }) => {
  const T = useT();
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "16px 18px",
        borderTop: accent ? `3px solid ${accent}` : `1px solid ${T.border}`,
        boxShadow:
          T.bg === "#eef0f5"
            ? "0 1px 3px rgba(15,17,23,0.06), 0 1px 2px rgba(15,17,23,0.04)"
            : "0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      {(title || sub) && (
        <div style={{ marginBottom: 12 }}>
          {title && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: T.text,
                fontFamily: T.fontSans,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </div>
          )}
          {sub && (
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: T.fontSans }}>
              {sub}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

