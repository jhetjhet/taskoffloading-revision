import React from "react";
import { useT } from "../../context/ThemeContext";

export const ToggleSwitch = ({ on, onChange, onColor, label }) => {
  const T = useT();
  const c = onColor || T.blue;
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      {label && <span style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans }}>{label}</span>}
      <span
        onClick={() => onChange(!on)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: on ? c : T.elevated,
          border: `1px solid ${on ? c : T.border}`,
          position: "relative",
          display: "inline-block",
          transition: "background 0.2s, border-color 0.2s",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 18 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#ffffff",
            transition: "left 0.2s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        />
      </span>
    </label>
  );
};

