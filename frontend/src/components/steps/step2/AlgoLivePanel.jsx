import React from "react";
import { useT } from "../../../context/ThemeContext";
import { formatServerLabel, getServerColor, normalizeServerKey } from "../../../utils/serverLabels";

/* ─────────────────────────────────────────────────────────────
   STATUS CONFIG
───────────────────────────────────────────────────────────── */
const STATUS_ORDER = ["PENDING", "TRANSFERRING", "IN_QUEUE", "RUNNING", "FINISHED", "FAILED"];

const useStatusConfig = () => {
  const T = useT();
  return {
    PENDING:     { color: T.dim,    bg: T.elevated,  label: "Pending" },
    TRANSFERRING:{ color: T.blue,   bg: T.blueBg,    label: "Transfer" },
    IN_QUEUE:    { color: T.amber,  bg: T.amberBg,   label: "Queued" },
    RUNNING:     { color: T.purple, bg: T.purpleBg,  label: "Running" },
    FINISHED:    { color: T.green,  bg: T.greenBg,   label: "Done" },
    FAILED:      { color: T.red,    bg: T.redBg,     label: "Failed" },
  };
};

/* ─────────────────────────────────────────────────────────────
   LEGEND ROW
───────────────────────────────────────────────────────────── */
const Legend = () => {
  const T = useT();
  const cfg = useStatusConfig();
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
      {STATUS_ORDER.map((s) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg[s].color, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: T.dim, fontFamily: T.fontSans }}>{cfg[s].label}</span>
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
        <div style={{ width: 8, height: 8, borderRadius: 1, background: T.green, opacity: 0.5 }} />
        <span style={{ fontSize: 10, color: T.dim, fontFamily: T.fontSans }}>Server</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   TASK STRIP  – one row per task
  Shows: dynamic server placement lane + animated status pill
───────────────────────────────────────────────────────────── */
const TaskStrip = ({ task, index }) => {
  const T = useT();
  const cfg = useStatusConfig();

  const serverKey = normalizeServerKey(task.assigned_server);
  const serverLabel = serverKey ? formatServerLabel(serverKey) : "Unassigned";
  const serverColor = serverKey ? getServerColor(serverKey) : T.muted;

  const isTerminal = task.status === "FINISHED" || task.status === "FAILED";
  const isActive   = task.status === "RUNNING" || task.status === "TRANSFERRING";

  // Latency bar: fill proportional to total_latency_sec (max 10 s for scale)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 0",
        borderBottom: `1px solid ${T.border}`,
        opacity: task.status === "PENDING" ? 0.45 : 1,
        transition: "opacity 0.3s",
      }}
    >
      {/* Index */}
      <span
        style={{
          fontSize: 10,
          color: T.dim,
          fontFamily: T.fontMono,
          minWidth: 18,
          textAlign: "right",
          flexShrink: 0,
        }}
      >
        {index + 1}
      </span>

      {/* Task name */}
      <span
        style={{
          fontSize: 11,
          color: T.muted,
          fontFamily: T.fontSans,
          minWidth: 120,
          maxWidth: 120,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        title={task.task_name || task.task_id}
      >
        {task.task_name || task.task_id}
      </span>

      {/* Server placement pill (appears when assigned) */}
      <div style={{ minWidth: 48, flexShrink: 0 }}>
        {serverKey && (
          <span
            style={{
              fontSize: 9,
              fontFamily: T.fontMono,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: serverColor,
              background: `${serverColor}18`,
              border: `1px solid ${serverColor}44`,
              borderRadius: 3,
              padding: "1px 5px",
            }}
          >
            {serverLabel.slice(0, 3)}
          </span>
        )}
      </div>

      {/* Status flow track */}
      <div style={{ flex: 1, display: "flex", gap: 2, alignItems: "center" }}>
        {STATUS_ORDER.filter((s) => s !== "PENDING").map((statusKey) => {
          const statusCfg = cfg[statusKey];
          const isCurrentStatus = task.status === statusKey;
          const statusIdx = STATUS_ORDER.indexOf(task.status);
          const thisIdx = STATUS_ORDER.indexOf(statusKey);
          // A step is "passed" if the current status is beyond it
          // (skip FAILED path for FINISHED and vice versa)
          const isPassed = (() => {
            if (task.status === "FAILED")  return statusKey !== "FAILED" && thisIdx < statusIdx;
            if (task.status === "FINISHED") return statusKey !== "FAILED" && thisIdx < statusIdx;
            return thisIdx < statusIdx;
          })();

          if (statusKey === "FAILED" && task.status !== "FAILED") return null;

          return (
            <div
              key={statusKey}
              title={statusCfg.label}
              style={{
                height: 6,
                flex: statusKey === "RUNNING" ? 2 : 1,
                borderRadius: 3,
                background: isCurrentStatus
                  ? statusCfg.color
                  : isPassed
                  ? `${statusCfg.color}55`
                  : T.elevated,
                transition: "background 0.4s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* shimmer on active states */}
              {isActive && isCurrentStatus && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(90deg, transparent 0%, ${statusCfg.color}88 50%, transparent 100%)`,
                    animation: "shimmer 1.4s infinite",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Latency value (shows when terminal) */}
      <div style={{ minWidth: 56, textAlign: "right", flexShrink: 0 }}>
        {isTerminal && task.total_latency_sec != null ? (
          <span
            style={{
              fontSize: 10,
              fontFamily: T.fontMono,
              color: task.status === "FAILED" ? T.red : T.muted,
              fontWeight: task.status === "FAILED" ? 700 : 400,
            }}
          >
            {task.status === "FAILED"
              ? "FAILED"
              : `${task.total_latency_sec.toFixed(2)}s`}
          </span>
        ) : isActive ? (
          <span style={{ fontSize: 10, fontFamily: T.fontMono, color: T.dim }}>…</span>
        ) : null}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ALLOCATION MAP  – compact grid showing which tasks → which server
   Rendered once the algorithm event arrives (allocation known).
───────────────────────────────────────────────────────────── */
const AllocationMap = ({ tasks }) => {
  const T = useT();
  if (!tasks.some((t) => t.assigned_server)) return null;

  const groupedTasks = tasks.reduce((acc, task) => {
    const key = normalizeServerKey(task.assigned_server);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const serverEntries = Object.entries(groupedTasks);

  const Lane = ({ label, color, items }) => (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          fontFamily: T.fontSans,
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 5,
        }}
      >
        {label} ({items.length})
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {items.map((t, i) => {
          const isTerminal = t.status === "FINISHED" || t.status === "FAILED";
          const bg = t.status === "FINISHED"
            ? `${T.green}30`
            : t.status === "FAILED"
            ? `${T.red}30`
            : t.status === "RUNNING"
            ? `${color}30`
            : T.elevated;
          const borderColor = t.status === "FINISHED"
            ? `${T.green}66`
            : t.status === "FAILED"
            ? `${T.red}66`
            : `${color}44`;
          return (
            <div
              key={t.task_id}
              title={`${t.task_name || t.task_id} — ${t.status}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                background: bg,
                border: `1px solid ${borderColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontFamily: T.fontMono,
                fontWeight: 700,
                color: isTerminal
                  ? t.status === "FAILED" ? T.red : T.green
                  : color,
                transition: "background 0.4s, border-color 0.4s",
              }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "8px 0",
        marginBottom: 8,
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      {serverEntries.length ? serverEntries.map(([serverKey, items]) => (
        <Lane key={serverKey} label={formatServerLabel(serverKey)} color={getServerColor(serverKey)} items={items} />
      )) : <div style={{ fontSize: 10, color: T.dim, fontFamily: T.fontSans }}>No server assignments yet</div>}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   ALGO LIVE PANEL  (main export)

   Props:
     algorithm  – "GBFS" | "PSO"
     tasks      – array from algorithmTasks[algo] (with live status patches)
     running    – bool
     accentColor – hex
───────────────────────────────────────────────────────────── */
export const AlgoLivePanel = ({ algorithm, tasks, running, accentColor }) => {
  const T = useT();

  const finished = tasks.filter((t) => t.status === "FINISHED").length;
  const failed   = tasks.filter((t) => t.status === "FAILED").length;
  const active   = tasks.filter((t) => !["FINISHED", "FAILED", "PENDING"].includes(t.status)).length;
  const pending  = tasks.filter((t) => t.status === "PENDING").length;
  const total    = tasks.length;
  const progress = total > 0 ? ((finished + failed) / total) * 100 : 0;

  const avgLatency = (() => {
    const done = tasks.filter((t) => t.status === "FINISHED" && t.total_latency_sec != null);
    if (!done.length) return null;
    return done.reduce((s, t) => s + t.total_latency_sec, 0) / done.length;
  })();

  const hasAllocation = tasks.some((t) => t.assigned_server);

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderTop: `2px solid ${accentColor}`,
        borderRadius: 8,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: accentColor,
              fontFamily: T.fontSans,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {algorithm}
          </div>
          <div style={{ fontSize: 11, color: T.dim, fontFamily: T.fontSans }}>
            {algorithm === "GBFS"
              ? "Greedy Best-First Search — sequential allocation"
              : "Particle Swarm Optimization — global batch search"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {[
            { label: "Active", value: active, color: T.purple },
            { label: "Done",   value: finished, color: T.green },
            { label: "Failed", value: failed,   color: T.red },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color, fontFamily: T.fontMono, lineHeight: 1 }}>{value}</span>
              <span style={{ fontSize: 9, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
            </div>
          ))}
          {avgLatency != null && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.muted, fontFamily: T.fontMono, lineHeight: 1 }}>{avgLatency.toFixed(2)}s</span>
              <span style={{ fontSize: 9, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg lat.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Overall progress bar ── */}
      <div style={{ marginBottom: 10 }}>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: T.elevated,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: 2,
              background: failed > 0
                ? `linear-gradient(90deg, ${accentColor} ${((finished / total) * 100).toFixed(0)}%, ${T.red} 100%)`
                : accentColor,
              transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
          <span style={{ fontSize: 9, color: T.dim, fontFamily: T.fontMono }}>
            {finished + failed} / {total} resolved
          </span>
          <span style={{ fontSize: 9, color: T.dim, fontFamily: T.fontMono }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* ── Allocation map (once assignment is known) ── */}
      {hasAllocation && (
        <AllocationMap tasks={tasks} />
      )}

      {/* ── Legend ── */}
      <Legend />

      {/* ── Task strips ── */}
      <div>
        {tasks.length === 0 && (
          <div style={{ fontSize: 12, color: T.dim, fontFamily: T.fontSans, padding: "8px 0" }}>
            Waiting for batch…
          </div>
        )}
        {tasks.map((task, i) => (
          <TaskStrip
            key={task.task_id}
            task={task}
            index={i}
            accentColor={accentColor}
          />
        ))}
      </div>

      {/* ── Idle state ── */}
      {!running && pending === total && total > 0 && (
        <div style={{ fontSize: 11, color: T.dim, fontFamily: T.fontSans, marginTop: 8, textAlign: "center" }}>
          Waiting for run to start…
        </div>
      )}
    </div>
  );
};

