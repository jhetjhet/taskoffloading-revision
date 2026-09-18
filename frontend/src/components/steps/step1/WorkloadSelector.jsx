import React from "react";
import { useT } from "../../../context/ThemeContext";
import { WORKLOAD_TIERS, WORKLOAD_LABELS } from "../../../config/constants";
import { Card, InfoBox } from "../../common";

export const WorkloadSelector = ({ machineId, workload, setWorkload }) => {
  const T = useT();
  const hasTiers = !!WORKLOAD_TIERS[machineId];
  if (!hasTiers) return null;

  const options = [
    { key: null, label: "Machine Data" },
    { key: "low", label: "Low" },
    { key: "medium", label: "Medium" },
    { key: "high", label: "High" },
  ];
  const tierColor = { low: T.green, medium: T.amber, high: T.red };

  return (
    <Card title="Workload Level" sub={`${machineId} · Machine Data or assigned Low / Medium / High parameter sets`} accent={T.purple}>
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
          <InfoBox color={workload === "high" ? "red" : workload === "medium" ? "amber" : "green"}>
            Showing tasks that can run at the <strong>{WORKLOAD_LABELS[workload]}</strong> workload level — lower workload tasks remain available at higher levels.
          </InfoBox>
        </div>
      )}
    </Card>
  );
};

