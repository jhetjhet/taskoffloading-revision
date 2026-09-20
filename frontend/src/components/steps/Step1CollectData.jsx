import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useT } from "../../context/ThemeContext";
import { Stat, Card, InfoBox, ErrBox, PrimaryBtn, Badge, TableRow, Th } from "../common";
import { WorkloadSelector } from "./step1/WorkloadSelector";
import { TaskBatchPreviewTable } from "./step1/TaskBatchPreviewTable";
import { buildBenchmarkBatch } from "../../utils/workload";

const simulationApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api/v1" });
const MAX_BATCH_SIZE = Number(import.meta.env.VITE_MAX_BATCH_SIZE) || 15;

export const Step1CollectData = ({ machine, tasks: machineTasks = [], onBatchChange = () => {} }) => {
  const T = useT();
  const [workload, setWorkload] = useState("mid");
  const [servers, setServers] = useState([]);
  const [serverError, setServerError] = useState("");
  const [customTasksByMachine, setCustomTasksByMachine] = useState({});
  const [templateId, setTemplateId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const lastBatchSignature = useRef("");

  useEffect(() => {
    simulationApi.get("/servers")
      .then(({ data }) => setServers(data))
      .catch(() => setServerError("Unable to load server specifications."));
  }, []);

  const benchmarkTasks = useMemo(() => {
    return workload ? buildBenchmarkBatch(workload, machineTasks, servers) : [];
  }, [machineTasks, servers, workload]);

  const customTasks = customTasksByMachine[machine?.id] || [];
  const batchTasks = workload ? benchmarkTasks : customTasks;
  const activeTemplateId = machineTasks.some((task) => task.task_id === templateId)
    ? templateId
    : machineTasks[0]?.task_id || "";

  useEffect(() => {
    const signature = batchTasks.map((task) => task.task_id).join("|");
    if (signature !== lastBatchSignature.current) {
      lastBatchSignature.current = signature;
      onBatchChange(batchTasks);
    }
  }, [batchTasks, onBatchChange]);

  const addCustomTasks = () => {
    const template = machineTasks.find((task) => task.task_id === activeTemplateId);
    if (!template) return;
    const additions = Array.from({ length: Math.min(MAX_BATCH_SIZE - customTasks.length, Math.max(1, Number(quantity))) }, (_, index) => ({
      ...template,
      task_id: `${template.task_id}-C${customTasks.length + index + 1}`,
      batch_index: customTasks.length + index + 1,
    }));
    setCustomTasksByMachine((current) => ({
      ...current,
      [machine.id]: [...customTasks, ...additions],
    }));
  };

  const batchSummary = useMemo(() => {
    if (!batchTasks.length) return null;
    const count = batchTasks.length;
    const totalPayload = batchTasks.reduce((sum, t) => sum + Number(t.payload_size_mb || 0), 0);
    const avgPayload = totalPayload / count;

    const totalProc = batchTasks.reduce((sum, t) => sum + Number(t.processing_duration_sec || 0), 0);
    const avgProc = totalProc / count;

    const avgCpu = batchTasks.reduce((sum, t) => sum + Number(t.cpu_demand_percent || 0), 0) / count;
    const totalRam = batchTasks.reduce((sum, t) => sum + Number(t.ram_demand_mb || 0), 0);
    const avgRam = totalRam / count;

    const avgSla = batchTasks.reduce((sum, t) => sum + Number(t.max_tolerable_latency_sec || 0), 0) / count;
    const minSla = Math.min(...batchTasks.map((t) => Number(t.max_tolerable_latency_sec || 0)));
    const maxSla = Math.max(...batchTasks.map((t) => Number(t.max_tolerable_latency_sec || 0)));

    return [
      ["Total Batch Tasks", `${count} tasks`, "Total tasks queued for offloading"],
      ["Total Batch Payload", `${totalPayload.toFixed(2)} MB`, "Cumulative data payload to transmit"],
      ["Average Task Payload", `${avgPayload.toFixed(2)} MB`, "Mean payload size per task"],
      ["Total Processing Demand", `${totalProc.toFixed(2)} s`, "Aggregate estimated processing time"],
      ["Average Processing Time", `${avgProc.toFixed(2)} s`, "Mean estimated execution duration per task"],
      ["Average CPU Demand", `${avgCpu.toFixed(1)}%`, "Average computational load demand"],
      ["Total RAM Demand", `${totalRam.toFixed(1)} MB`, "Aggregate memory requirement"],
      ["Average RAM Demand", `${avgRam.toFixed(1)} MB`, "Mean memory requirement per task"],
      ["Average Max Latency (SLA)", `${avgSla.toFixed(2)} s`, "Mean tolerable latency deadline"],
      ["SLA Range", `${minSla.toFixed(1)} s – ${maxSla.toFixed(1)} s`, "Min and max latency constraints in batch"],
    ];
  }, [batchTasks, machine, workload]);

  return (
    <div>
      {!machine ? <InfoBox color="amber">Select a machine first to build its task batch.</InfoBox> : <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>Tasks Batch</h1>
        <p style={{ color: T.muted, fontFamily: T.fontSans }}>{machine.name} ({machine.id}) · {machineTasks.length} available task templates</p>
      </div>

      <WorkloadSelector machineId={machine.id} workload={workload} setWorkload={setWorkload} />

      {!workload && <Card title="Add Custom Tasks" sub="Choose a machine template and add any quantity to this batch" accent={T.blue}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={activeTemplateId} onChange={(event) => setTemplateId(event.target.value)} style={{ flex: "1 1 240px", padding: 10 }}>
            {machineTasks.map((task) => <option key={task.task_id} value={task.task_id}>{task.task_name}</option>)}
          </select>
          <input type="number" min="1" max={MAX_BATCH_SIZE} value={quantity} onChange={(event) => setQuantity(event.target.value)} style={{ width: 90, padding: 10 }} />
          <PrimaryBtn type="button" className="app-btn" onClick={addCustomTasks}>Add tasks</PrimaryBtn>
        </div>
      </Card>}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Stat label="Batch Type" value={workload || "Custom"} color="blue" />
        <Stat label="Task Count" value={batchTasks.length} color="green" />
        <Stat label="Payload" value={`${batchTasks.reduce((sum, task) => sum + Number(task.payload_size_mb || 0), 0).toFixed(1)} MB`} color="purple" />
        <Stat label="Servers" value={servers.length || "Loading"} color="amber" />
      </div>

      {serverError && <ErrBox>{serverError}</ErrBox>}
      <TaskBatchPreviewTable tasks={batchTasks} custom={!workload} onRemoveTask={(index) => setCustomTasksByMachine((current) => ({
        ...current,
        [machine.id]: customTasks.filter((_, taskIndex) => taskIndex !== index),
      }))} />

      {batchSummary && (
        <div style={{ marginTop: 16 }}>
          <Card
            title="Batch Overall Summary"
            sub={`${machine?.name || machine?.id} · ${workload ? `${workload.toUpperCase()} workload` : "Custom"} — Aggregate sums and average parameters for this simulation batch`}
            accent={T.blue}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr>
                    <Th>Parameter</Th>
                    <Th>Value</Th>
                    <Th>Description</Th>
                  </tr>
                </thead>
                <tbody>
                  {batchSummary.map(([param, val, desc], i) => (
                    <TableRow
                      key={param}
                      isOdd={i % 2 === 1}
                      cells={[
                        <span style={{ fontFamily: T.fontSans, fontWeight: 600, color: T.text }}>{param}</span>,
                        <Badge color="blue">{val}</Badge>,
                        <span style={{ color: T.muted, fontFamily: T.fontSans }}>{desc}</span>,
                      ]}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
      </>}
    </div>
  );
};
