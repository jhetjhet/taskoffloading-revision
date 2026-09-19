import React from "react";
import { useT } from "../../context/ThemeContext";

export const Stat = ({ label, value, color = "blue", mono = true }) => {
  const T = useT();
  const c = T[color] || T.blue;
  
  return (
    <div 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 4, // Increased gap slightly for better breathing room
        background: T.elevated, // Gives it the white/dark card background
        border: `1px solid ${T.border}`, // Adds the outline
        borderRadius: 8, // Rounds the corners
        padding: "12px 16px", // Gives it the "card" padding
        flex: "1 1 120px", // Allows it to stretch and fill the flex container evenly
      }}
    >
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
          fontSize: 20, // Bumped up slightly so the number pops as a "Stat"
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