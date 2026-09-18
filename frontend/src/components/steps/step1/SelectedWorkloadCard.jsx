import React from "react";
import { useT } from "../../../context/ThemeContext";
import { WORKLOAD_LABELS, WORKLOAD_PRIORITY } from "../../../config/constants";
import { Card } from "../../common";

export const SelectedWorkloadCard = ({ machine: m, workload }) => {
  const T = useT();
  if (!m) return null;
  const priority = workload ? WORKLOAD_PRIORITY[workload] : "Live";
  const label = workload ? WORKLOAD_LABELS[workload] : "Live Data";
  const color = workload === "high" ? T.red : workload === "medium" ? T.amber : workload === "low" ? T.green : T.blue;

  const fields = [
    ["Workload", label],
    ["Machine", `${m.name} (${m.machineId})`],
    ["CPU Requirement", `${m.cpuUtilization}%`],
    ["Memory Requirement", `${m.memoryUsage} GB`],
    ["Data Size", `${m.taskSize} MB`],
    ["Estimated Processing Time", `${m.processingTime} ms`],
    ["Priority", priority],
    ["Queue Length", `${m.queueLength} tasks`],
  ];

  return (
    <Card title="Selected Workload" sub="Updates live with the workload tier you choose" accent={color}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {fields.map(([l, v]) => (
          <div key={l} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: l === "Workload" ? color : T.text, fontFamily: T.fontMono }}>{v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

