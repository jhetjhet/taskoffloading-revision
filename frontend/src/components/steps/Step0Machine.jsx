import React, { useEffect, useState } from "react";
import axios from "axios";
import { useT } from "../../context/ThemeContext";
import { Card, Badge, InfoBox, ErrBox, TableRow, Th } from "../common";

const simulationApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
});

const getMachineImg = (machine) => machine.image || `https://placehold.co/400x300/e2e8f0/475569?text=${encodeURIComponent(machine.name)}`;

const TASK_TABLE_HEADERS = [
  ["Task", "task_name"],
  ["Payload Size", "payload_size_mb"],
  ["Estimated Processing", "processing_duration_sec"],
  ["CPU Demand", "cpu_demand_percent"],
  ["RAM Demand", "ram_demand_mb"],
  ["SLA", "max_tolerable_latency_sec"]
];

const Step0Machine = ({ onSelectionChange = () => {} }) => {
  const T = useT();
  const [machines, setMachines] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState("");
  const [tasksError, setTasksError] = useState("");

  const m = machines.find((machine) => machine.id === selectedId);

  const loadMachines = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await simulationApi.get("/machines");
      const loadedMachines = response.data;
      setMachines(loadedMachines);
      setSelectedId((currentId) => currentId || loadedMachines[0]?.id || "");
    } catch {
      setError("Unable to load machines. Check that the simulation API is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMachines();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setTasks([]);
      return;
    }

    let active = true;
    setTasksLoading(true);
    setTasksError("");
    simulationApi.get(`/workloads/${encodeURIComponent(selectedId)}`)
      .then(({ data }) => {
        if (active) setTasks(data.tasks || []);
      })
      .catch(() => {
        if (active) setTasksError("Unable to load task templates for this machine.");
      })
      .finally(() => {
        if (active) setTasksLoading(false);
      });

    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    onSelectionChange(m || null, tasks);
  }, [m, tasks, onSelectionChange]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>IoT Machine Selection</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>
          Choose a registered device. The algorithms will automatically decide which server processes its task.
        </p>
      </div>

      {error && <div style={{ marginBottom: 16 }}><ErrBox>{error} <button type="button" onClick={loadMachines}>Retry</button></ErrBox></div>}

      <Card title="Registered Devices" sub={loading ? "Loading machine catalog..." : "Simulation API machine catalog"} accent={T.blue}>
        {loading ? <div style={{ color: T.muted, fontFamily: T.fontSans }}>Loading machines...</div> : machines.length === 0 ? <InfoBox color="amber">No machines are available.</InfoBox> : (
        <div className="app-grid-eq" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {machines.map((mc) => {
            const sel = selectedId === mc.id;
            return (
              <div
                key={mc.id}
                onClick={() => setSelectedId(mc.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(mc.id); } }}
                className="app-clickable"
                style={{
                  border: `2px solid ${sel ? T.green : T.border}`,
                  borderRadius: 10, overflow: "hidden",
                  background: sel ? T.greenBg : T.elevated,
                  boxShadow: sel ? `0 0 0 1px ${T.green}` : "none",
                  cursor: "pointer"
                }}
              >
                <div style={{ position: "relative", width: "100%", height: 110, overflow: "hidden", background: T.bg }}>
                  <img src={getMachineImg(mc)} alt={mc.name} onError={(e) => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }} />
                  {sel && (
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <Badge color="green" dot>selected</Badge>
                    </div>
                  )}
                </div>
                <div style={{ padding: "10px 12px 12px" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: sel ? T.green : T.text, marginBottom: 2, fontFamily: T.fontMono }}>{mc.id}</div>
                  <div style={{ fontSize: 14, color: T.muted, marginBottom: 6, fontFamily: T.fontSans, lineHeight: 1.4 }}>{mc.name}</div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </Card>

      {m && (
        <Card title={`${m.id} — ${m.name}`} sub="Device metadata" accent={T.green}>
          <div style={{ width: "100%", height: 180, borderRadius: 8, overflow: "hidden", marginBottom: 16, position: "relative", background: T.bg }}>
            <img src={getMachineImg(m)} alt={m.name} onError={(e) => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)" }} />
            <div style={{ position: "absolute", bottom: 14, left: 16 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: T.fontSans, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>{m.name}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", fontFamily: T.fontMono, marginTop: 3 }}>{tasks.length} task templates</div>
            </div>
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <Badge color="green" dot>{m.id}</Badge>
            </div>
          </div>
          <InfoBox color="green">
            <strong>{m.id}</strong> selected — task templates are loaded from the simulation API.
          </InfoBox>
        </Card>
      )}

      {m && (
        <Card title={`${m.name} Task Templates`} sub={tasksLoading ? "Loading task templates..." : "Data from the simulation API"} accent={T.amber}>
          {tasksError ? <ErrBox>{tasksError}</ErrBox> : tasksLoading ? <div style={{ color: T.muted, fontFamily: T.fontSans }}>Loading task templates...</div> : tasks.length === 0 ? <InfoBox color="amber">No task templates found for this machine.</InfoBox> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr>
                      {TASK_TABLE_HEADERS.map(([label]) => <Th key={label}>{label}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task, i) => (
                      <TableRow key={task.task_id} isOdd={i % 2 === 1} cells={[
                        <span>{task.task_name}</span>,
                        <span>{task.payload_size_mb} MB</span>,
                        <span>{task.processing_duration_sec} s</span>,
                        <span>{task.cpu_demand_percent}%</span>,
                        <span>{task.ram_demand_mb} MB</span>,
                        <span>{task.max_tolerable_latency_sec} s</span>,
                      ]} />
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default Step0Machine;