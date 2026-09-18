import React from "react";
import { useT } from "../../context/ThemeContext";
import { WORKLOAD_LABELS } from "../../config/constants";
import { Stat, Card, TableRow, Th, Badge, InfoBox } from "../common";
import { WorkloadSelector } from "./step1/WorkloadSelector";
import { SelectedWorkloadCard } from "./step1/SelectedWorkloadCard";
import { TaskBatchPreviewTable } from "./step1/TaskBatchPreviewTable";

export const Step1CollectData = ({ machine: m, workload, setWorkload, tasks }) => {
  const T = useT();
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>Task Parameters</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>
          {workload ? (
            <>
              Showing the <strong style={{ color: T.text }}>{WORKLOAD_LABELS[workload]}</strong> workload for <strong style={{ color: T.text }}>{m.name} ({m.machineId})</strong>.
            </>
          ) : (
            <>
              Live data fetched for <strong style={{ color: T.text }}>{m.name} ({m.machineId})</strong>.
            </>
          )}{" "}
          {tasks?.length || 0} machine task{tasks?.length === 1 ? "" : "s"} below will be sent to GBFS and PSO using the selected workload filter.
        </p>
      </div>

      <WorkloadSelector machineId={m.machineId} workload={workload} setWorkload={setWorkload} />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Stat label="Reference Task Size" value={`${m.taskSize} MB`} color="blue" />
        <Stat label="Processing Time" value={`${m.processingTime} ms`} color="green" />
        <Stat label="Bandwidth" value={`${m.bandwidth} Mbps`} color="purple" />
        <Stat label="Energy Utilization" value={`${m.energyConsumption} kWh`} color="amber" />
      </div>

      <Card title="Parameter Table" sub={`${m.machineId} · ${workload ? `${WORKLOAD_LABELS[workload]} workload` : "Supabase"} — Current System baseline, for comparison only` } accent={T.blue}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Parameter</Th>
              <Th>Value</Th>
              <Th>Description</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Machine ID", m.machineId, "Unique device identifier"],
              ["Task Size", `${m.taskSize} MB`, "Data generated per task"],
              ["Processing Time", `${m.processingTime} ms`, "Local processing time"],
              ["Queue Length", m.queueLength, "Pending task count"],
              ["CPU Utilization", `${m.cpuUtilization}%`, "Edge node load"],
              ["Memory Usage", `${m.memoryUsage} GB`, "RAM consumed"],
              ["Bandwidth", `${m.bandwidth} Mbps`, "Communication speed"],
              ["Transmission Delay", `${m.transmissionDelay} ms`, "Network delay"],
              ["Energy Utilization", `${m.energyConsumption} kWh`, "Energy per cycle"],
              ["Throughput", `${m.throughput} tasks/min`, "Task completion rate"],
              ["Avg Latency", `${m.avgLatency} ms`, "End-to-end delay"],
            ].map(([p, v, d], i) => (
              <TableRow
                key={p}
                isOdd={i % 2 === 1}
                cells={[
                  <span style={{ fontFamily: T.fontSans, color: T.text }}>{p}</span>,
                  <Badge color="blue">{v}</Badge>,
                  <span style={{ color: T.muted, fontFamily: T.fontSans }}>{d}</span>,
                ]}
              />
            ))}
          </tbody>
        </table>
      </Card>

      <TaskBatchPreviewTable tasks={tasks} />

      <SelectedWorkloadCard machine={m} workload={workload} />

      <InfoBox color="green">
        Batch ready — GBFS will allocate each task sequentially against the running Edge/Cloud load, and PSO will search whole-batch Edge/Cloud assignments at once.
      </InfoBox>
    </div>
  );
};

