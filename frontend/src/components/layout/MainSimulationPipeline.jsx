import React from "react";
import { useT } from "../../context/ThemeContext";
import { PIPELINE_STAGES } from "../../config/constants";

export const MainSimulationPipeline = ({ activeIdx }) => {
  const T = useT();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 16,
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        overflowX: "auto",
      }}
    >
      {PIPELINE_STAGES.map((label, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                style={{
                  width: 20,
                  height: 1,
                  background: done || active ? T.green : T.border,
                  margin: "0 6px",
                  flexShrink: 0,
                }}
              />
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 20,
                background: active ? T.blueBg : done ? T.greenBg : T.elevated,
                border: `1px solid ${active ? T.blue : done ? T.green : T.border}`,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: active ? T.blue : done ? T.green : T.dim,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontFamily: T.fontMono,
                  whiteSpace: "nowrap",
                  color: active ? T.blue : done ? T.green : T.dim,
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

