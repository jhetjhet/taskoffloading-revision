import React from "react";
import { useT } from "../../context/ThemeContext";

export const InfoBox = ({ color = "blue", children }) => {
  const T = useT();
  const map = {
    blue: { bg: T.blueBg, border: T.blueDim, text: T.blue },
    green: { bg: T.greenBg, border: T.greenDim, text: T.green },
    purple: { bg: T.purpleBg, border: T.purpleDim, text: T.purple },
    amber: { bg: T.amberBg, border: T.amber, text: T.amber },
    red: { bg: T.redBg, border: T.red, text: T.red },
  };
  const c = map[color] || map.blue;
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.text}`,
        borderRadius: 6,
        padding: "10px 14px",
        fontSize: 12,
        color: T.text,
        lineHeight: 1.5,
        fontFamily: T.fontSans,
      }}
    >
      {children}
    </div>
  );
};

export const ErrBox = ({ children }) => <InfoBox color="red">{children}</InfoBox>;

