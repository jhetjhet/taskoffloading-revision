import React from "react";
import { useT } from "../../context/ThemeContext";
import { ServerCard } from "./ServerCard";

/* ─────────────────────────────────────────────────────────────
   ALGO GROUP BANNER  – text only, no icon box
───────────────────────────────────────────────────────────── */
const AlgoGroupBanner = ({ label, accentColor }) => {
  const T = useT();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        paddingBottom: 8,
        marginBottom: 10,
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 3,
          height: 14,
          borderRadius: 2,
          background: accentColor,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.muted,
          fontFamily: T.fontSans,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ALGO SERVER GROUP
   Stretches to fill its grid cell; cards inside split evenly.
───────────────────────────────────────────────────────────── */
export const AlgoServerGroup = ({ label, accentColor, servers }) => {
  const T = useT();
  return (
    <div
      style={{
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        flex: 1,         // fills its grid cell
        minWidth: 0,
      }}
    >
      <AlgoGroupBanner label={label} accentColor={accentColor} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${servers.length}, 1fr)`,
          gap: 8,
          flex: 1,
        }}
      >
        {servers.map((srv) => (
          <ServerCard key={srv.id} server={srv} accentColor={accentColor} />
        ))}
      </div>
    </div>
  );
};
