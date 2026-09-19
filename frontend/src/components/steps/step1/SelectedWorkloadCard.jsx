import React from "react";
import { useT } from "../../../context/ThemeContext";
import { Card } from "../../common";


const WORKLOAD_PRIORITY = {
  high: "Critical",
  medium: "Standard",
  low: "Background"
};

const WORKLOAD_LABELS = {
  high: "High Intensity",
  medium: "Moderate",
  low: "Low Power"
};

const DUMMY_MACHINE = {
  name: "Edge Node Alpha",
  machineId: "NODE-001",
  cpuUtilization: 78,
  memoryUsage: 8.5,
  taskSize: 45.2,
  processingTime: 120,
  queueLength: 14
};

export const SelectedWorkloadCard = ({ machine = DUMMY_MACHINE, workload = "medium" }) => {
  const T = useT();

  if (!machine) return null;
  const m = machine;
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