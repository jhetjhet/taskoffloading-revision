import React from "react";
import { useT } from "../../context/ThemeContext";
import { WORKLOAD_TIERS } from "../../config/constants";
import { DEFAULT_TASKS_BY_MACHINE, TASK_DETAIL_DISPLAY_FIELDS } from "../../taskData";
import { Card, Badge, Stat, InfoBox, ErrBox, PrimaryBtn, TableRow, Th } from "../common";

export const getMachineImg = (mc) => {
  const name = (mc.name || mc.machineId || "").toLowerCase();
  if (name.includes("cnc plasma")) return "/images/plasma.png";
  if (name.includes("plasma cut")) return "/images/plasmacut.png";
  const categoryMap = {
    "Cutting Machines": "/images/shearing.png",
    "Welding Machines": "/images/welding.png",
    "Finishing Machines": "/images/paint.png",
  };
  return categoryMap[mc.category] || "/images/default.jpg";
};

export const Step0Machine = ({ machineData, loading, error, selectedId, setSelectedId, onRetry }) => {
  const T = useT();
  const machines = Object.values(machineData);
  const m = machineData[selectedId];

  if (loading) {
    return (
      <Card title="Loading Machines" sub="Fetching from Supabase via Server A">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0", color: T.muted, fontFamily: T.fontSans, fontSize: 16 }}>
          <div style={{ width: 16, height: 16, border: `2px solid ${T.blue}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Connecting to edge…
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <div>
        <ErrBox>Connection failed — {error}</ErrBox>
        <div style={{ marginTop: 12 }}>
          <PrimaryBtn onClick={onRetry}>Retry</PrimaryBtn>
        </div>
      </div>
    );
  }

  if (!m) return null;

  const cats = [
    { label: "Total Devices", value: machines.length, color: "green" },
    { label: "Cutting", value: machines.filter((x) => x.category === "Cutting Machines").length, color: "blue" },
    { label: "Finishing", value: machines.filter((x) => x.category === "Finishing Machines").length, color: "purple" },
    { label: "Welding", value: machines.filter((x) => x.category === "Welding Machines").length, color: "amber" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>IoT Machine Selection</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>
          Choose a registered device. The algorithms will automatically decide which server processes its task.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {cats.map((c) => (
          <Stat key={c.label} label={c.label} value={c.value} color={c.color} />
        ))}
      </div>

      <Card title="Registered Devices" sub="Live data from Supabase" accent={T.blue}>
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
                  {WORKLOAD_TIERS[mc.machineId] && (
                    <div style={{ position: "absolute", top: 8, left: 8 }}>
                      <Badge color="purple" dot>tiers</Badge>
                    </div>
                  )}
                </div>
                <div style={{ padding: "10px 12px 12px" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: sel ? T.green : T.text, marginBottom: 2, fontFamily: T.fontMono }}>{mc.machineId}</div>
                  <div style={{ fontSize: 14, color: T.muted, marginBottom: 6, fontFamily: T.fontSans, lineHeight: 1.4 }}>{mc.name}</div>
                  <div style={{ fontSize: 13, color: T.dim, fontFamily: T.fontMono }}>{mc.taskType}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {m && (
        <Card title={`${m.machineId} — ${m.name}`} sub="Device metadata" accent={T.green}>
          <div style={{ width: "100%", height: 180, borderRadius: 8, overflow: "hidden", marginBottom: 16, position: "relative", background: T.bg }}>
            <img src={getMachineImg(m)} alt={m.name} onError={(e) => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)" }} />
            <div style={{ position: "absolute", bottom: 14, left: 16 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: T.fontSans, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>{m.name}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", fontFamily: T.fontMono, marginTop: 3 }}>{m.category}</div>
            </div>
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <Badge color="green" dot>{m.machineId}</Badge>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[["Machine ID", m.machineId, "blue"], ["Category", m.category, "dim"], ["Task Type", m.taskType, "amber"]].map(([l, v, c]) => (
              <div key={l} style={{ flex: "1 1 160px", background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.fontSans }}>{l}</div>
                <Badge color={c}>{v}</Badge>
              </div>
            ))}
          </div>
          <InfoBox color="green">
            <strong>{m.machineId}</strong> selected — proceed to collect task parameters.
          </InfoBox>
        </Card>
      )}

      {m && DEFAULT_TASKS_BY_MACHINE[m.machineId]?.length > 0 && (
        <Card title={`${m.name} Task Details`} sub="Task name, timestamp, material, and thickness recorded for this machine" accent={T.amber}>
          {(() => {
            const machineTasks = DEFAULT_TASKS_BY_MACHINE[m.machineId];
            const detailFields = TASK_DETAIL_DISPLAY_FIELDS.filter(([, key]) =>
              machineTasks.some((task) => task[key] !== undefined && task[key] !== null && task[key] !== "")
            );
            return (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {detailFields.map(([label]) => <Th key={label}>{label}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {machineTasks.map((task, i) => (
                      <TableRow key={task.taskName} isOdd={i % 2 === 1} cells={[
                        ...detailFields.map(([label, key, unit]) => (
                          <span key={label}>{`${task[key]}${unit ? ` ${unit}` : ""}`}</span>
                        )),
                      ]} />
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
};

