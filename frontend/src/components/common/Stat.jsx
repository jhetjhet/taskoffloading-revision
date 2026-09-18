import React from "react";
import { useT } from "../../context/ThemeContext";

export const Stat = ({ label, value, color = "blue", mono = true }) => {
  const T = useT();
  const c = T[color] || T.blue;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 11,
          color: T.muted,
          fontFamily: T.fontSans,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: c,
          fontFamily: mono ? T.fontMono : T.fontSans,
        }}
      >
        {value}
      </span>
    </div>
  );
};

