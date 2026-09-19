import React from "react";
import { useT } from "../../../context/ThemeContext";
import { Card, Stat, TableRow, Th } from "../../common";

export const TaskBatchPreviewTable = ({ tasks = [], custom = false, onRemoveTask }) => {
  const T = useT();

  if (!tasks?.length) return null;
  const totalSize = tasks.reduce((total, task) => total + Number(task.payload_size_mb || 0), 0);

  return (
    <Card title="Simulation Batch" sub={custom ? "Custom tasks selected from machine templates" : "Benchmark batch generated from server capacity"} accent={T.purple}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Stat label="Task Count" value={tasks.length} color="purple" />
        <Stat label="Total Batch Size" value={`${totalSize.toFixed(1)} MB`} color="blue" />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>#</Th><Th>Task</Th><Th>Payload</Th><Th>Processing</Th><Th>CPU</Th><Th>RAM</Th><Th>SLA</Th>{custom && <Th>Action</Th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <TableRow key={`${t.task_id}-${i}`} isOdd={i % 2 === 1} cells={[
                <span style={{ fontFamily: T.fontSans, color: T.text, whiteSpace: "nowrap" }}>Task {i+1}</span>,
                <span style={{ fontFamily: T.fontSans, color: T.text }}>{t.task_name}</span>,
                <span>{t.payload_size_mb} MB</span>,
                <span>{t.processing_duration_sec} s</span>,
                <span>{t.cpu_demand_percent}%</span>,
                <span>{t.ram_demand_mb} MB</span>,
                <span>{t.max_tolerable_latency_sec} s</span>,
                ...(custom ? [<button type="button" onClick={() => onRemoveTask?.(i)}>Remove</button>] : []),
              ]} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};