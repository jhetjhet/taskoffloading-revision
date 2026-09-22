import React from "react";
import { useT } from "../../context/ThemeContext";

/* ─────────────────────────────────────────────────────────────
   MINI RING GAUGE  – only used for CPU, the one visual focus
───────────────────────────────────────────────────────────── */
const RingGauge = ({ pct = 0, color, size = 44, stroke = 4 }) => {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(pct / 100, 1);
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${color}22`} strokeWidth={stroke} />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────
   RESOURCE BAR  – label / bar / value, single neutral color
───────────────────────────────────────────────────────────── */
const ResourceBar = ({ label, pct, value }) => {
  const T = useT();
  const clamp = Math.min(Math.max(pct, 0), 100);
  const barColor = clamp >= 85 ? T.red : clamp >= 60 ? T.amber : T.muted;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 10, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </span>
        <span style={{ fontSize: 10, color: T.muted, fontFamily: T.fontMono }}>
          {value}
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 2, background: T.elevated, overflow: "hidden" }}>
        <div
          style={{
            width: `${clamp}%`,
            height: "100%",
            borderRadius: 2,
            background: barColor,
            transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
          }}
        />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   STATUS DOT + LABEL  – minimal, no background pill
───────────────────────────────────────────────────────────── */
const StatusLabel = ({ status }) => {
  const T = useT();
  const map = {
    BUSY:    T.amber,
    IDLE:    T.green,
    FULL:    T.red,
    OFFLINE: T.dim,
    DEGRADED: T.red,
  };
  const color = map[status] ?? T.dim;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 10, color, fontFamily: T.fontMono, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {status}
      </span>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   SERVER CARD
───────────────────────────────────────────────────────────── */
export const ServerCard = ({ server, accentColor }) => {
  const T = useT();

  const cpuPct = server.cpu_utilization_percent ?? 0;
  const ramPct = server.memory_utilization_percent ?? 0;
  // storagePct: use the backend-computed storage_utilization_percent when available
  // (emitted by the engine), otherwise fall back to 0 before the simulation starts
  const storagePct = server.storage_utilization_percent ?? 0;

  const cpuColor = cpuPct >= 85 ? T.red : cpuPct >= 60 ? T.amber : T.green;

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderTop: `2px solid ${accentColor}`,
        borderRadius: 8,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 9,
        flex: 1,
        minWidth: 0,
        boxShadow: T.bg === "#eef0f5"
          ? "0 1px 4px rgba(15,17,23,0.06)"
          : "0 1px 6px rgba(0,0,0,0.25)",
      }}
    >
      {/* ── Header: name + status / CPU ring ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: T.text,
              fontFamily: T.fontSans,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: 2,
            }}
          >
            {server.label}
          </div>
          <div
            style={{
              fontSize: 10,
              color: T.dim,
              fontFamily: T.fontMono,
              letterSpacing: "0.04em",
              marginBottom: 6,
            }}
          >
            {server.id}
          </div>
          <StatusLabel status={server.status} />
        </div>

        {/* CPU ring – live utilization */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <RingGauge pct={cpuPct} color={cpuColor} size={44} stroke={4} />
            <div
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: T.fontMono, color: cpuColor }}>
                {Math.round(cpuPct)}%
              </span>
            </div>
          </div>
          <span style={{ fontSize: 9, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            CPU Load
          </span>
        </div>
      </div>

      {/* ── Server Specifications (Minimal) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "4px 8px",
          padding: "6px 8px",
          background: T.elevated,
          borderRadius: 6,
          border: `1px solid ${T.borderSub || T.border}`,
        }}
      >
        <div>
          <div style={{ fontSize: 9, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.05em" }}>CPU</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{server.cpu_cores ?? "-"}c · {server.processing_speed ?? 1}x</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.05em" }}>RAM</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{server.max_ram_mb ?? "-"} MB</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.05em" }}>Storage</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{server.storage_mb ?? "-"} MB</div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.05em" }}>Latency</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{server.network_latency_ms ?? "-"} ms</div>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <div style={{ fontSize: 9, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.05em" }}>Bandwidth</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: T.text, fontFamily: T.fontMono }}>{server.bandwidth_mb_s ?? "-"} MB/s</div>
        </div>
      </div>

      {/* ── Resource bars ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <ResourceBar label="RAM Usage" pct={ramPct} value={`${Math.round(ramPct)}%`} />
        <ResourceBar
          label="Storage Buffer"
          pct={server.storage_utilization_percent ?? storagePct}
          value={`${Math.round(server.storage_utilization_percent ?? storagePct)}%`}
        />
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: T.border }} />

      {/* ── Task counters – compact inline row ── */}
      <div style={{ display: "flex", gap: 0 }}>
        {[
          { label: "Running", count: server.running_tasks ?? 0, color: T.text },
          { label: "Queued",  count: server.queue_depth ?? 0,   color: T.amber },
          { label: "Done",    count: server.finished_tasks ?? 0, color: T.green },
          { label: "Failed",  count: server.failed_tasks ?? 0,  color: T.red },
        ].map(({ label, count, color }, i, arr) => (
          <div
            key={label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              paddingRight: i < arr.length - 1 ? 0 : 0,
              borderRight: i < arr.length - 1 ? `1px solid ${T.border}` : "none",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: T.fontMono, lineHeight: 1 }}>
              {count}
            </span>
            <span style={{ fontSize: 9, color: T.dim, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
