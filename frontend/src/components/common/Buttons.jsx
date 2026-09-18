import React from "react";
import { useT } from "../../context/ThemeContext";

export const PrimaryBtn = ({ onClick, disabled, children }) => {
  const T = useT();
  return (
    <button
      className="app-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? T.border : T.blue,
        color: disabled ? T.dim : "#ffffff",
        border: "none",
        borderRadius: 6,
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 600,
        fontFamily: T.fontSans,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
};

export const GhostBtn = ({ onClick, disabled, children }) => {
  const T = useT();
  return (
    <button
      className="app-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        color: disabled ? T.dim : T.text,
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 500,
        fontFamily: T.fontSans,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
};

export const DualBtn = ({ onClick, disabled, children }) => {
  const T = useT();
  return (
    <button
      className="app-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled
          ? T.border
          : `linear-gradient(135deg, ${T.blue} 0%, ${T.purple} 100%)`,
        color: disabled ? T.dim : "#ffffff",
        border: "none",
        borderRadius: 6,
        padding: "10px 22px",
        fontSize: 13,
        fontWeight: 700,
        fontFamily: T.fontSans,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        letterSpacing: "0.01em",
        boxShadow: disabled ? "none" : "0 2px 8px rgba(96,165,250,0.25)",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
};

