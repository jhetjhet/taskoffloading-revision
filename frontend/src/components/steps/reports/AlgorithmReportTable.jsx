import React from "react";
import { Badge, Card, TableRow, Th } from "../../common";
import { formatServerLabel } from "../../../utils/serverLabels";

const statusColor = (status) => ({ FINISHED: "green", FAILED: "red" }[status] || "amber");
const seconds = (value) => `${Number(value || 0).toFixed(2)} s`;

export const AlgorithmReportTable = ({ algorithm, tasks, T }) => (
  <Card title={`${algorithm} task results`} sub="Persisted results from the completed simulation" accent={algorithm === "GBFS" ? T.blue : T.purple}>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", textAlign: "left" }}>
        <thead><tr>
          <Th>#</Th><Th>Task</Th><Th>Status</Th><Th>Server</Th><Th>Transfer</Th><Th>Queue</Th><Th>Execution</Th><Th>Total</Th><Th>Error</Th>
        </tr></thead>
        <tbody>
          {tasks.map((task, index) => (
            <TableRow key={task.task_id} isOdd={index % 2 === 1} cells={[
              <span>{index + 1}</span>,
              <span title={task.task_id}>{task.task_id}</span>,
              <Badge color={statusColor(task.status)} dot>{task.status}</Badge>,
              <span>{task.assigned_server ? formatServerLabel(task.assigned_server) : "Unassigned"}</span>,
              <span>{seconds(task.transmission_time_sec)}</span>,
              <span>{seconds(task.queue_wait_time_sec)}</span>,
              <span>{seconds(task.execution_time_sec)}</span>,
              <span>{seconds(task.total_latency_sec)}</span>,
              <span style={{ color: task.error_message ? T.red : T.muted }}>{task.error_message || ""}</span>,
            ]} />
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);
