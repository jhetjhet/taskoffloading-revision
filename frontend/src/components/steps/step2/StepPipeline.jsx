import React from "react";
import { useT } from "../../../context/ThemeContext";

export const StepPipeline = ({ steps, activeIdx, activeColor, activeText }) => {
  const T = useT();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", fontFamily: T.fontMono, fontSize: 12, marginBottom: 12 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span
            style={{
              padding: "4px 9px",
              borderRadius: 5,
              border: `1px solid ${i === activeIdx ? activeColor : T.borderSub}`,
              background: i === activeIdx ? activeColor : "transparent",
              color: i === activeIdx ? activeText : T.dim,
              fontWeight: i === activeIdx ? 700 : 400,
            }}
          >
            {s}
          </span>
          {i < steps.length - 1 && <span style={{ color: T.dim }}>→</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

