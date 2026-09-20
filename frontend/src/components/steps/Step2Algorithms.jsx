import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { useT } from "../../context/ThemeContext";
import { Badge, Card, DualBtn, ErrBox, GhostBtn, InfoBox, Stat, TableRow, Th } from "../common";
import { AlgoLivePanel } from "./step2/AlgoLivePanel";
import { GBFSExecutionPanel } from "./step2/GBFSExecutionPanel";
import { PSOExecutionPanel } from "./step2/PSOExecutionPanel";
import { ExecutionTimeline } from "./step2/ExecutionTimeline";

const simulationApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api/v1" });
const ALGORITHMS = ["GBFS", "PSO"];

const makeTaskState = (tasks) => tasks.map((task) => ({
  ...task,
  status: "PENDING",
  assigned_server: "",
  transmission_time_sec: null,
  queue_wait_time_sec: null,
  execution_time_sec: null,
  total_latency_sec: null,
  cpu_usage_percent: null,
  memory_usage_mb: null,
  error_message: "",
}));

const formatSeconds = (value) => value === null || value === undefined ? "-" : `${Number(value).toFixed(3)} s`;

const statusColor = (status) => ({
  PENDING: "dim",
  TRANSFERRING: "blue",
  IN_QUEUE: "amber",
  RUNNING: "purple",
  FINISHED: "green",
  FAILED: "red",
}[status] || "dim");

const AlgorithmPanel = ({ algorithm, tasks, running, T }) => {
  const finished = tasks.filter((task) => task.status === "FINISHED").length;
  const failed = tasks.filter((task) => task.status === "FAILED").length;
  const active = tasks.filter((task) => !["FINISHED", "FAILED"].includes(task.status)).length;

  return (
    <Card title={`${algorithm} batch`} sub={`${finished} finished · ${failed} failed · ${active} active`} accent={algorithm === "GBFS" ? T.blue : T.purple}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Stat label="Tasks" value={tasks.length} color={algorithm === "GBFS" ? "blue" : "purple"} />
        <Stat label="Active" value={active} color="amber" />
        <Stat label="Finished" value={finished} color="green" />
        <Stat label="Failed" value={failed} color="red" />
      </div>
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", textAlign: "left" }}>
          <thead><tr>
            <Th>#</Th><Th>Task</Th><Th>Status</Th><Th>Server</Th><Th>Transfer</Th><Th>Queue</Th><Th>Execution</Th><Th>Total</Th><Th>Error</Th>
          </tr></thead>
          <tbody>
            {tasks.map((task, index) => (
              <TableRow key={task.task_id} isOdd={index % 2 === 1} cells={[
                <span>{index + 1}</span>,
                <span title={task.task_id}>{task.task_name || task.task_id}</span>,
                <Badge color={statusColor(task.status)} dot>{task.status}</Badge>,
                <span>{task.assigned_server ? `${algorithm}:${task.assigned_server}` : "-"}</span>,
                <span>{formatSeconds(task.transmission_time_sec)}</span>,
                <span>{formatSeconds(task.queue_wait_time_sec)}</span>,
                <span>{formatSeconds(task.execution_time_sec)}</span>,
                <span>{formatSeconds(task.total_latency_sec)}</span>,
                <span style={{ color: task.status === "FAILED" ? T.red : T.muted }}>{task.status === "FAILED" ? task.error_message || "Unknown failure" : ""}</span>,
              ]} />
            ))}
          </tbody>
        </table>
      </div>
      {!running && !tasks.some((task) => task.status !== "PENDING") && <div style={{ marginTop: 12, color: T.muted }}>Waiting for the run to start.</div>}
    </Card>
  );
};

export const Step2Algorithms = ({ machine, tasks = [], onServerUsage = () => {}, onReportReady = () => {}, onRunStatusChange = () => {} }) => {
  const T = useT();
  const socketRef = useRef(null);
  const [runId, setRunId] = useState("");
  const [runStatus, setRunStatus] = useState("READY");
  const [error, setError] = useState("");
  const [taskOverrides, setTaskOverrides] = useState({ GBFS: {}, PSO: {} });
  const [gbfsDecisionStep, setGbfsDecisionStep] = useState(null);
  const [gbfsAllSteps, setGbfsAllSteps] = useState([]);
  const [psoDecisionStep, setPsoDecisionStep] = useState(null);
  const [psoAllSteps, setPsoAllSteps] = useState([]);

  const canRun = tasks.length > 0 && !["QUEUED", "RUNNING"].includes(runStatus);
  const seededTasks = useMemo(() => makeTaskState(tasks), [tasks]);
  const algorithmTasks = useMemo(() => ({
    GBFS: seededTasks.map((task) => ({ ...task, ...taskOverrides.GBFS[task.task_id] })),
    PSO: seededTasks.map((task) => ({ ...task, ...taskOverrides.PSO[task.task_id] })),
  }), [seededTasks, taskOverrides]);

  useEffect(() => () => {
    socketRef.current?.disconnect();
  }, []);

  const updateTask = (algorithm, taskId, patch) => {
    setTaskOverrides((current) => ({
      ...current,
      [algorithm]: { ...current[algorithm], [taskId]: { ...current[algorithm][taskId], ...patch } },
    }));
  };

  const runSimulation = async () => {
    if (!canRun) return;
    socketRef.current?.disconnect();
    setError("");
    setRunStatus("QUEUED");
    onRunStatusChange("QUEUED");
    setTaskOverrides({ GBFS: {}, PSO: {} });
    setGbfsDecisionStep(null);
    setGbfsAllSteps([]);
    setPsoDecisionStep(null);
    setPsoAllSteps([]);

    try {
      const payload = {
        tasks: tasks.map(({ task_id, payload_size_mb, processing_duration_sec, cpu_demand_percent, ram_demand_mb, max_tolerable_latency_sec, source_machine_id, task_name }) => ({
          task_id,
          payload_size_mb,
          processing_duration_sec,
          cpu_demand_percent,
          ram_demand_mb,
          max_tolerable_latency_sec,
          source_machine_id,
          task_name,
        })),
        seed: 12345,
      };
      const { data } = await simulationApi.post("/runs", payload);
      setRunId(data.run_id);
      const socket = io(window.location.origin, { path: "/socket.io", transports: ["websocket", "polling"] });
      socketRef.current = socket;
      socket.on("connect", () => socket.emit("join_run", { run_id: data.run_id }));
      socket.on("run", (event) => {
        const status = event.status || "RUNNING";
        setRunStatus(status);
        onRunStatusChange(status);
      });
      socket.on("gbfs_decision_step", (event) => {
        setGbfsDecisionStep(event);
        setGbfsAllSteps((prev) => [...prev, event]);
      });
      socket.on("pso_decision_step", (event) => {
        setPsoDecisionStep(event);
        setPsoAllSteps((prev) => [...prev, event]);
      });
      socket.on("algorithm", (event) => {
        if (!ALGORITHMS.includes(event.algorithm)) return;
        event.tasks?.forEach((result) => {
          const metrics = Object.fromEntries(Object.entries(result).filter(([key]) => key !== "status"));
          updateTask(event.algorithm, result.task_id, metrics);
        });
      });
      socket.on("task", (event) => {
        if (!ALGORITHMS.includes(event.algorithm)) return;
        updateTask(event.algorithm, event.task_id, {
          status: event.status,
          assigned_server: event.server,
          error_message: event.status === "FAILED" ? event.error_message || "" : "",
        });
      });
      socket.on("server_usage", (event) => {
        if (ALGORITHMS.includes(event.algorithm)) onServerUsage(event);
      });
      socket.on("run_complete", async (event) => {
        setRunStatus(event.status || "COMPLETED");
        onRunStatusChange(event.status || "COMPLETED");
        try {
          const { data: report } = await simulationApi.get(`/runs/${data.run_id}`);
          const { data: analytics } = await simulationApi.get(`/runs/${data.run_id}/analytics`);
          onReportReady({ ...report, analytics: analytics.analytics });
        } catch {
          setError("Run completed, but the persisted report could not be loaded.");
        }
      });
      socket.on("run_failed", (event) => {
        setRunStatus("FAILED");
        onRunStatusChange("FAILED");
        setError(event.error || "The simulation failed.");
      });
      socket.on("connect_error", () => setError("Unable to connect to the live simulation stream."));
    } catch (requestError) {
      setRunStatus("FAILED");
      onRunStatusChange("FAILED");
      setError(requestError.response?.data?.detail || "Unable to start the simulation.");
    }
  };

  const [viewMode, setViewMode] = useState("visual"); // "visual" | "table"

  // Derive timeline progression stage (0: Workload Ready, 1: Allocating, 2: Dispatching, 3: Virtual Servers Executing/Complete)
  const timelineStage = useMemo(() => {
    if (runStatus === "COMPLETED") return 3;
    if (runStatus === "RUNNING") {
      const anyActive = Object.values(algorithmTasks).some((list) =>
        list.some((t) => ["TRANSFERRING", "IN_QUEUE", "RUNNING", "FINISHED"].includes(t.status))
      );
      if (anyActive) return 3;
      if (gbfsDecisionStep || psoDecisionStep) return 1;
      return 2;
    }
    if (runStatus === "QUEUED") return 1;
    return tasks.length > 0 ? 0 : -1;
  }, [algorithmTasks, gbfsDecisionStep, psoDecisionStep, runStatus, tasks.length]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>Live Task Offloading</h1>
        <p style={{ fontSize: 15, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>
          {machine ? `${machine.name} · ${tasks.length} tasks sent to both algorithms` : "Select a machine and build a batch before running."}
        </p>
      </div>
      {error && <div style={{ marginBottom: 12 }}><ErrBox>{error}</ErrBox></div>}
      {!tasks.length && <div style={{ marginBottom: 12 }}><InfoBox color="amber">No batch is ready. Return to Workloads and select or create tasks first.</InfoBox></div>}
      <Card title="Task Offloading" sub={runId ? `Run ${runId} · ${runStatus}` : "Run both allocation strategies against the selected batch"} accent={T.blue}>
        {/* Flow-focused Execution Timeline */}
        <ExecutionTimeline
          machine={machine}
          taskCount={tasks.length}
          stage={timelineStage}
          isComplete={runStatus === "COMPLETED"}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 6, paddingTop: 12, borderTop: `1px solid ${T.borderSub}` }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <DualBtn onClick={runSimulation} disabled={!canRun}>{runStatus === "QUEUED" || runStatus === "RUNNING" ? "Simulation running..." : "Run GBFS + PSO"}</DualBtn>
            {runStatus === "COMPLETED" && <GhostBtn onClick={runSimulation}>Re-run</GhostBtn>}
          </div>

          <div style={{ display: "flex", gap: 6, background: T.elevated, padding: 3, borderRadius: 6, border: `1px solid ${T.border}` }}>
            <button
              className="app-btn"
              onClick={() => setViewMode("visual")}
              style={{
                border: "none",
                borderRadius: 4,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: T.fontSans,
                cursor: "pointer",
                background: viewMode === "visual" ? (T.bg === "#eef0f5" ? "#fff" : T.surface) : "transparent",
                color: viewMode === "visual" ? T.text : T.dim,
                boxShadow: viewMode === "visual" ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
              }}
            >
              📊 Live Visual
            </button>
            <button
              className="app-btn"
              onClick={() => setViewMode("table")}
              style={{
                border: "none",
                borderRadius: 4,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                fontFamily: T.fontSans,
                cursor: "pointer",
                background: viewMode === "table" ? (T.bg === "#eef0f5" ? "#fff" : T.surface) : "transparent",
                color: viewMode === "table" ? T.text : T.dim,
                boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
              }}
            >
              📋 Data Table
            </button>
          </div>
        </div>
      </Card>

      {viewMode === "visual" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
          {/* Real-time Algorithm Decision Simulation Panels */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <GBFSExecutionPanel
              currentStep={gbfsDecisionStep}
              allSteps={gbfsAllSteps}
              totalTasks={tasks.length}
              tasks={tasks}
              isRunning={runStatus === "RUNNING"}
              machine={machine}
            />
            <PSOExecutionPanel
              currentStep={psoDecisionStep}
              allSteps={psoAllSteps}
              totalTasks={tasks.length}
              isRunning={runStatus === "RUNNING"}
            />
          </div>

          {/* Real-time Task Offload Execution Tracks */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <AlgoLivePanel
              algorithm="GBFS"
              tasks={algorithmTasks.GBFS}
              running={runStatus === "RUNNING"}
              accentColor={T.blue}
            />
            <AlgoLivePanel
              algorithm="PSO"
              tasks={algorithmTasks.PSO}
              running={runStatus === "RUNNING"}
              accentColor={T.purple}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
          <AlgorithmPanel algorithm="GBFS" tasks={algorithmTasks.GBFS} running={runStatus === "RUNNING"} T={T} />
          <AlgorithmPanel algorithm="PSO" tasks={algorithmTasks.PSO} running={runStatus === "RUNNING"} T={T} />
        </div>
      )}
    </div>
  );
};