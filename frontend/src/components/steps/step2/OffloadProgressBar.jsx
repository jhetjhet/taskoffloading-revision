import React from "react";
import { useT } from "../../../context/ThemeContext";

export const OffloadProgressBar = ({ progress, offloading, success, color }) => {
  const T = useT();
  const status = success ? "SUCCESS" : offloading ? "PROCESSING" : progress === 0 ? "PENDING" : "PROCESSING";
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.fontMono, fontSize: 13, color: T.muted, marginBottom: 6 }}>
        <span>Status: <strong style={{ color: success ? T.green : offloading ? color : T.dim }}>{status}</strong></span>
        <span>{progress}%</span>
      </div>
      <div style={{ height: 10, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: success ? T.green : color, transition: "width 0.2s linear", borderRadius: 6 }} />
      </div>
    </div>
  );
};

