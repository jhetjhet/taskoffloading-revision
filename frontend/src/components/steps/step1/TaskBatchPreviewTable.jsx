import React from "react";
import { useT } from "../../../context/ThemeContext";
import { Card, Stat, TableRow, Th } from "../../common";

export const TaskBatchPreviewTable = ({ tasks = [], custom = false, onTaskChange, onRemoveTask, onCopyTask }) => {
  const T = useT();

  if (!tasks?.length) return null;
  const totalSize = tasks.reduce((total, task) => total + Number(task.payload_size_mb || 0), 0);
  const renderValue = (task, field, unit, step, index) => custom
    ? <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <input
          aria-label={`${field} for task ${index + 1}`}
          type="number"
          min={field === "cpu_demand_percent" ? "0.1" : "0.01"}
          step={step}
          value={task[field] ?? ""}
          onChange={(event) => onTaskChange?.(index, field, event.target.value)}
          style={{ width: 78, padding: "5px 6px" }}
        />
        <span>{unit}</span>
      </label>
    : <span>{task[field]} {unit}</span>;

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
                renderValue(t, "payload_size_mb", "MB", "0.01", i),
                renderValue(t, "processing_duration_sec", "s", "0.01", i),
                renderValue(t, "cpu_demand_percent", "%", "0.1", i),
                renderValue(t, "ram_demand_mb", "MB", "0.1", i),
                renderValue(t, "max_tolerable_latency_sec", "s", "0.01", i),
                ...(custom ? [
                  <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      className="app-btn"
                      onClick={() => onCopyTask?.(i)}
                      title="Copy this task"
                      style={{
                        background: "transparent",
                        color: T.blue,
                        border: `1px solid ${T.border}`,
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      className="app-btn"
                      onClick={() => onRemoveTask?.(i)}
                      title="Remove this task"
                      style={{
                        background: "transparent",
                        color: T.red,
                        border: `1px solid ${T.border}`,
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ] : []),
              ]} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};