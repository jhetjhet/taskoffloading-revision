import React from "react";
import { useT } from "../../../context/ThemeContext";
import { TASK_DISPLAY_FIELDS } from "../../../taskData";
import { Card, Stat, TableRow, Th } from "../../common";

export const TaskBatchPreviewTable = ({ tasks }) => {
  const T = useT();
  if (!tasks?.length) return null;
  const totalSize = tasks.reduce((a, t) => a + t.taskSize, 0);
  const machineLabel = tasks[0]?.machine || "Selected machine";
  const displayFields = TASK_DISPLAY_FIELDS.filter(([, key]) =>
    tasks.some((task) => task[key] !== undefined && task[key] !== null && task[key] !== "")
  );

  return (
    <Card title={`${machineLabel} Task Data`} sub={`Showing tasks supported by the selected workload level; task name, timestamp, material, and thickness are excluded`} accent={T.purple}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Stat label="Task Count" value={tasks.length} color="purple" />
        <Stat label="Total Batch Size" value={`${totalSize.toFixed(1)} MB`} color="blue" />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Task Name</Th>
              {displayFields.map(([label]) => <Th key={label}>{label}</Th>)}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <TableRow key={t.taskIndex} isOdd={i % 2 === 1} cells={[
                <span style={{ fontFamily: T.fontSans, color: T.text, whiteSpace: "nowrap" }}>Task {i+1}</span>,
                <span style={{ fontFamily: T.fontSans, color: T.text }}>{t.taskName || `Task ${t.taskIndex}`}</span>,
                ...displayFields.map(([label, key, unit]) => {
                  const value = t[key];
                  return <span key={label}>{`${value}${unit ? ` ${unit}` : ""}`}</span>;
                }),
              ]} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

