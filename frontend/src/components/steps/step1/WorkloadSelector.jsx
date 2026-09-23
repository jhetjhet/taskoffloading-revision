import React from "react";
import { useT } from "../../../context/ThemeContext";
import { Card, InfoBox } from "../../common";

export const WorkloadSelector = ({
  machineId = "Selected machine",
  workload = "mid",
  setWorkload = () => {},
}) => {
  const options = [
    { key: null, label: "Custom Batch" },
    { key: "low", label: "Low" },
    { key: "mid", label: "Mid" },
    { key: "high", label: "High" },
  ];
  const T = useT();
  const tierColor = { low: T.green, mid: T.amber, high: T.red };

  return (
    <Card title="Workload Level" sub={`${machineId} · Custom Batch or server-sized benchmark`} accent={T.purple}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((opt) => {
          const active = workload === opt.key;
          const color = opt.key ? tierColor[opt.key] : T.blue;
          return (
            <button
              key={opt.label}
              className="app-btn"
              onClick={() => setWorkload(opt.key)}
              style={{
                flex: "1 1 110px",
                padding: "10px 14px",
                borderRadius: 7,
                border: `1px solid ${active ? color : T.border}`,
                background: active ? `${color}22` : T.elevated,
                color: active ? color : T.muted,
                fontFamily: T.fontSans,
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {active && "✓ "}
              {opt.label}
            </button>
          );
        })}
      </div>
      {workload && (
        <div style={{ marginTop: 12 }}>
          <InfoBox color={workload === "high" ? "red" : workload === "mid" ? "amber" : "green"}>
            Benchmark batch size is calculated from the selected machine templates and configured server capacity.
          </InfoBox>
        </div>
      )}
    </Card>
  );
};