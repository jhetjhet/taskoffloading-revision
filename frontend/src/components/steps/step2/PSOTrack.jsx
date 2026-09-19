import React from "react";
import { useT } from "../../../context/ThemeContext";

export const PSOTrack = ({ bestX = 0, particles = [] }) => {
  const T = useT();
  const bestXPct = Math.min(Math.max(bestX * 100, 0), 100);

  return (
    <div
      style={{
        position: "relative",
        height: 56,
        background: T.bg,
        border: `1px solid ${T.borderSub}`,
        borderRadius: 8,
        margin: "8px 0 6px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 4,
          left: 8,
          fontSize: 10,
          fontFamily: T.fontMono,
          color: T.dim,
        }}
      >
        Edge A
      </div>
      <div
        style={{
          position: "absolute",
          top: 4,
          right: 8,
          fontSize: 10,
          fontFamily: T.fontMono,
          color: T.dim,
        }}
      >
        Cloud B
      </div>

      {/* Global best indicator needle */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${bestXPct}%`,
          width: 3,
          background: T.amber,
          boxShadow: `0 0 8px ${T.amber}`,
          transition: "left 0.25s ease-out",
          zIndex: 2,
        }}
        title={`Global Best Position: ${bestX.toFixed(2)}`}
      />

      {/* Swarm particles */}
      {particles.map((p, idx) => {
        const xPct = Math.min(Math.max((p.x ?? 0) * 100, 0), 100);
        const topOffset = 22 + (idx % 2) * 14;
        return (
          <div
            key={p.name || idx}
            style={{
              position: "absolute",
              top: topOffset,
              left: `calc(${xPct}% - 6px)`,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: T.purple,
              boxShadow: `0 0 8px ${T.purple}`,
              opacity: 0.85,
              transition: "left 0.25s cubic-bezier(.4,0,.2,1)",
              zIndex: 3,
            }}
            title={`${p.name}: Pos ${p.x}, Fit ${p.fitness}`}
          />
        );
      })}
    </div>
  );
};
