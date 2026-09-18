import React from "react";
import { useT } from "../../context/ThemeContext";

export const Badge = ({ color = "blue", children, dot }) => {
  const T = useT();
  const map = {
    blue: { bg: T.blueBg, border: T.blueDim, text: T.blue },
    green: { bg: T.greenBg, border: T.greenDim, text: T.green },
    purple: { bg: T.purpleBg, border: T.purpleDim, text: T.purple },
    amber: { bg: T.amberBg, border: T.amber, text: T.amber },
    red: { bg: T.redBg, border: T.red, text: T.red },
    dim: { bg: T.elevated, border: T.border, text: T.muted },
  };
  const c = map[color] || map.blue;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontFamily: T.fontMono,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "2px 8px",
        borderRadius: 4,
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: c.text,
            boxShadow: `0 0 5px ${c.text}`,
          }}
        />
      )}
      {children}
    </span>
  );
};

