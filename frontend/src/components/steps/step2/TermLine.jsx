import React from "react";
import { useT } from "../../../context/ThemeContext";

export const TermLine = ({ children, done, color }) => {
  const T = useT();
  return (
    <div style={{ fontFamily: T.fontMono, fontSize: 13, color: done ? color || T.green : T.muted, marginBottom: 3, lineHeight: 1.6 }}>
      {done ? "✓ " : "… "}
      {children}
    </div>
  );
};

