import React, { useEffect, useState } from "react";
import axios from "axios";
import { useT } from "../../context/ThemeContext";
import { AlgoServerGroup } from "./AlgoServerGroup";

const simulationApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api/v1" });

const ALGO_META = {
  GBFS: {
    label: "GBFS — Greedy Best-First Search",
    shortLabel: "GBFS",
    icon: "🎯",
    accentColor: "#60a5fa",   // blue
  },
  PSO: {
    label: "PSO — Particle Swarm Optimization",
    shortLabel: "PSO",
    icon: "🌀",
    accentColor: "#a78bfa",   // purple
  },
};

/* ─────────────────────────────────────────────────────────────
   COLLAPSE TOGGLE BUTTON
───────────────────────────────────────────────────────────── */
const CollapseToggle = ({ open, onToggle, totalServers, busyCount }) => {
  const T = useT();
  return (
    <button
      className="app-btn"
      onClick={onToggle}
      title={open ? "Collapse server panel" : "Expand server panel"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        background: T.elevated,
        border: `1px solid ${T.border}`,
        borderRadius: 6,
        cursor: "pointer",
        padding: "4px 10px 4px 8px",
        boxShadow: open ? `inset 0 1px 3px rgba(0,0,0,0.18)` : "none",
        transition: "box-shadow 0.15s",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, fontFamily: T.fontSans }}>
        Servers
      </span>

      {busyCount > 0 && (
        <span
          style={{
            fontSize: 10,
            fontFamily: T.fontMono,
            fontWeight: 700,
            color: T.amber,
            background: T.amberBg,
            border: `1px solid ${T.amber}44`,
            borderRadius: 4,
            padding: "1px 5px",
          }}
        >
          {busyCount} busy
        </span>
      )}

      <span style={{ fontSize: 10, color: T.dim, fontFamily: T.fontMono }}>
        {totalServers} nodes
      </span>

      <svg
        width="12"
        height="12"
        viewBox="0 0 14 14"
        fill="none"
        style={{
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.25s cubic-bezier(.4,0,.2,1)",
          color: T.muted,
          flexShrink: 0,
        }}
      >
        <path
          d="M3 5l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────
   SERVER MONITOR PANEL  (main export)
   Placement: fixed-height collapsible panel that lives between
   TopBar and the main page content in AppShell.
───────────────────────────────────────────────────────────── */
export const ServerMonitorPanel = ({ liveUsage = {} }) => {
  const T = useT();
  const [open, setOpen] = useState(false);
  const [servers, setServers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    simulationApi.get("/servers")
      .then(({ data }) => {
        if (!active) return;
        setServers(data.map((server) => ({
          ...server,
          id: server.server_id,
          label: server.name,
          algo: server.algorithm,
          status: "IDLE",
          storage_total_mb: server.storage_mb,
          bandwidth_total_mbps: server.bandwidth_mb_s,
          network_latency_ms: server.network_latency_ms,
        })));
      })
      .catch(() => {
        if (active) setError("Unable to load server catalog.");
      });
    return () => { active = false; };
  }, []);

  const displayedServers = servers.map((server) => ({
    ...server,
    ...(liveUsage[server.id] || {}),
  }));

  const busyCount = displayedServers.filter((s) => s.status === "BUSY").length;

  // Group servers by algo
  const grouped = displayedServers.reduce((acc, srv) => {
    const key = srv.algo;
    if (!acc[key]) acc[key] = [];
    acc[key].push(srv);
    return acc;
  }, {});

  return (
    <div
      style={{
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        transition: "box-shadow 0.2s ease",
        boxShadow: open
          ? T.bg === "#eef0f5"
            ? "0 4px 16px rgba(15,17,23,0.08)"
            : "0 4px 20px rgba(0,0,0,0.4)"
          : "none",
        position: "relative",
        zIndex: 4,
      }}
    >
      {/* ── Sticky header bar (always visible) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          height: 38,
          borderBottom: open ? `1px solid ${T.border}` : "none",
        }}
      >
        <CollapseToggle
          open={open}
          onToggle={() => setOpen((o) => !o)}
          totalServers={displayedServers.length}
          busyCount={busyCount}
        />

        {error && <span style={{ fontSize: 10, color: T.red, fontFamily: T.fontSans }}>{error}</span>}

        {/* Right side: compact per-algo status dots */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {Object.entries(grouped).map(([algoKey, srvList]) => {
            const meta = ALGO_META[algoKey];
            if (!meta) return null;
            return (
              <div
                key={algoKey}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {srvList.map((srv) => {
                  const isBusy = srv.status === "BUSY";
                  const dotColor = isBusy ? T.amber : srv.status === "FULL" ? T.red : T.green;
                  return (
                    <div
                      key={srv.id}
                      title={`${srv.id} — ${srv.status}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: dotColor,
                          boxShadow: `0 0 5px ${dotColor}99`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 10,
                          color: T.dim,
                          fontFamily: T.fontMono,
                        }}
                      >
                        {srv.placement === "EDGE" ? "E" : "C"}
                      </span>
                    </div>
                  );
                })}
                <span
                  style={{
                    fontSize: 10,
                    color: meta.accentColor,
                    fontFamily: T.fontMono,
                    fontWeight: 700,
                    marginLeft: 2,
                    opacity: 0.7,
                  }}
                >
                  {meta.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Expandable content ── */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? 360 : 0,
          transition: "max-height 0.35s cubic-bezier(.4,0,.2,1)",
        }}
      >
        <div style={{ padding: "12px 24px 14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Object.keys(grouped).length}, 1fr)`,
              gap: 12,
            }}
          >
            {Object.entries(grouped).map(([algoKey, srvList]) => {
              const meta = ALGO_META[algoKey];
              if (!meta) return null;
              return (
                <AlgoServerGroup
                  key={algoKey}
                  label={meta.label}
                  accentColor={meta.accentColor}
                  servers={srvList}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

