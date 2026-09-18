import React from "react";
import { useT } from "../../../context/ThemeContext";

export const PSOTrack = ({ row }) => {
  const T = useT();
  const bestX = (row?.bestX ?? 0) * 100;
  return (
    <div style={{ position: "relative", height: 56, background: T.bg, border: `1px solid ${T.borderSub}`, borderRadius: 8, margin: "8px 0 4px" }}>
      <div style={{ position: "absolute", top: 4, left: "0%", fontSize: 10, fontFamily: T.fontMono, color: T.dim }}>Edge A</div>
      <div style={{ position: "absolute", top: 4, right: "0%", fontSize: 10, fontFamily: T.fontMono, color: T.dim }}>Cloud B</div>
      {row && (
        <>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${bestX}%`, width: 2, background: T.amber, boxShadow: `0 0 6px ${T.amber}`, transition: "left 0.4s ease" }} />
          <div style={{ position: "absolute", top: 24, left: `calc(${row.particleA.x * 100}% - 5px)`, width: 11, height: 11, borderRadius: "50%", background: T.purple, boxShadow: `0 0 8px ${T.purple}`, transition: "left 0.4s cubic-bezier(.4,0,.2,1)" }} />
          <div style={{ position: "absolute", top: 38, left: `calc(${row.particleB.x * 100}% - 5px)`, width: 11, height: 11, borderRadius: "50%", background: T.purple, opacity: 0.7, boxShadow: `0 0 8px ${T.purple}`, transition: "left 0.4s cubic-bezier(.4,0,.2,1)" }} />
        </>
      )}
    </div>
  );
};

