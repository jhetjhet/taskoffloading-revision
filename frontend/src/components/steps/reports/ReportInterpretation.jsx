import React from "react";
import { Card, Badge } from "../../common";

const format = (val, digits = 2) => Number(val || 0).toFixed(digits);

export const ReportInterpretation = ({ report, T }) => {
  if (!report) return null;

  const analytics = report.analytics || report.input?.analytics || {};
  const raw = analytics.raw_performance || {};
  const gbfs = raw.gbfs || {};
  const pso = raw.pso || {};
  const baseline = raw.baseline || {};
  const conclusion = analytics.research_conclusion || {};
  const improvement = analytics.baseline_improvement || {};
  const tradeoffs = analytics.tradeoffs || {};
  const gauges = tradeoffs.gauges || {};

  const gbfsTasks = report.algorithms?.find((a) => a.algorithm === "GBFS")?.result?.tasks || [];
  const psoTasks = report.algorithms?.find((a) => a.algorithm === "PSO")?.result?.tasks || [];

  const gbfsFinished = gbfsTasks.filter((t) => t.status === "FINISHED").length;
  const gbfsFailed = gbfsTasks.filter((t) => t.status === "FAILED").length;
  const psoFinished = psoTasks.filter((t) => t.status === "FINISHED").length;
  const psoFailed = psoTasks.filter((t) => t.status === "FAILED").length;
  const totalTasks = report.input?.tasks?.length || gbfsTasks.length || 0;

  const gbfsSuccessRate = totalTasks ? Math.round((gbfsFinished / totalTasks) * 100) : 0;
  const psoSuccessRate = totalTasks ? Math.round((psoFinished / totalTasks) * 100) : 0;

  const gbfsAlloc = report.algorithms?.find((a) => a.algorithm === "GBFS")?.allocation || [];
  const psoAlloc = report.algorithms?.find((a) => a.algorithm === "PSO")?.allocation || [];

  const gbfsEdgeCount = gbfsAlloc.filter((s) => s === "SERVER_A").length;
  const gbfsCloudCount = gbfsAlloc.filter((s) => s === "SERVER_B").length;
  const psoEdgeCount = psoAlloc.filter((s) => s === "SERVER_A").length;
  const psoCloudCount = psoAlloc.filter((s) => s === "SERVER_B").length;

  const gbfsLat = Number(gbfs.latency_ms || 0);
  const psoLat = Number(pso.latency_ms || 0);

  // Deterministic, lexicographical winner:
  // Priority 1: Number of completed tasks (fewer failed tasks is strictly top priority)
  // Priority 2: Average latency of completed tasks (lower is better when completion is tied)
  let winner = "PSO";
  let winReason = "";
  if (psoFinished > gbfsFinished) {
    winner = "PSO";
    winReason = `higher task completion (${psoFinished}/${totalTasks} vs GBFS ${gbfsFinished}/${totalTasks})`;
  } else if (gbfsFinished > psoFinished) {
    winner = "GBFS";
    winReason = `higher task completion (${gbfsFinished}/${totalTasks} vs PSO ${psoFinished}/${totalTasks})`;
  } else if (psoLat > 0 && gbfsLat > 0) {
    if (psoLat < gbfsLat) {
      winner = "PSO";
      winReason = `lower average completion latency (${format(psoLat, 0)} ms vs GBFS ${format(gbfsLat, 0)} ms)`;
    } else {
      winner = "GBFS";
      winReason = `lower average completion latency (${format(gbfsLat, 0)} ms vs PSO ${format(psoLat, 0)} ms)`;
    }
  } else {
    winner = conclusion.winner || "PSO";
    winReason = "optimal task scheduling parameters";
  }

  const isPsoWinner = winner === "PSO";
  const winnerColor = isPsoWinner ? T.purple : T.blue;

  // Synthesis insights
  let reliabilityInsight = "";
  if (psoFinished > gbfsFinished) {
    reliabilityInsight = `PSO achieved superior reliability (${psoSuccessRate}% vs GBFS ${gbfsSuccessRate}%), successfully completing ${psoFinished} of ${totalTasks} tasks without drops. GBFS failed ${gbfsFailed} task(s) due to greedy early Edge buffer/RAM saturation.`;
  } else if (gbfsFinished > psoFinished) {
    reliabilityInsight = `GBFS demonstrated higher task completion (${gbfsSuccessRate}% vs PSO ${psoSuccessRate}%), executing ${gbfsFinished} of ${totalTasks} tasks. PSO failed ${psoFailed} task(s).`;
  } else if (gbfsFailed === 0 && psoFailed === 0) {
    reliabilityInsight = `Both algorithms attained a 100% completion rate (${totalTasks}/${totalTasks} tasks completed). In this workload regime, server resources accommodated the batch without SLA breaches or RAM buffer exhaustion.`;
  } else {
    reliabilityInsight = `Both algorithms experienced similar failure counts (${gbfsFailed} failed tasks), primarily driven by strict SLA latency deadlines or collective peak memory constraints during batch execution.`;
  }

  let latencyInsight = "";
  if (gbfsLat > 0 && psoLat > 0) {
    if (psoFinished > gbfsFinished) {
      latencyInsight = `While GBFS's partial finished tasks averaged ${format(gbfsLat, 0)} ms, it failed ${gbfsFailed} other task(s). PSO successfully delivered all ${psoFinished} tasks with an average completion latency of ${format(psoLat, 0)} ms by effectively leveraging Cloud Server B (2.5x compute).`;
    } else if (gbfsFinished > psoFinished) {
      latencyInsight = `While PSO's partial finished tasks averaged ${format(psoLat, 0)} ms, it failed ${psoFailed} task(s). GBFS successfully delivered ${gbfsFinished} tasks with an average completion latency of ${format(gbfsLat, 0)} ms.`;
    } else if (psoLat < gbfsLat) {
      const diffPct = Math.round(((gbfsLat - psoLat) / gbfsLat) * 100);
      latencyInsight = `PSO lowered average task latency by ${diffPct}% (${format(psoLat, 0)} ms vs ${format(gbfsLat, 0)} ms) across all completed tasks. Global multi-task coordination optimized CPU scheduling on Cloud Server B (2.5x compute) to minimize total makespan.`;
    } else if (gbfsLat < psoLat) {
      const diffPct = Math.round(((psoLat - gbfsLat) / psoLat) * 100);
      latencyInsight = `GBFS yielded ${diffPct}% lower average task latency (${format(gbfsLat, 0)} ms vs ${format(psoLat, 0)} ms) across all completed tasks due to immediate Edge Server A dispatch (50 ms round-trip latency vs Cloud 120 ms).`;
    } else {
      latencyInsight = `GBFS and PSO delivered comparable task turnaround times (${format(gbfsLat, 0)} ms), balancing transmission overhead with compute speed.`;
    }
  } else {
    latencyInsight = `Offloading tasks from the 0.5x local machine to Edge (1.0x) and Cloud (2.5x) servers substantially lowered execution delay.`;
  }

  let strategySummary = "";
  if (isPsoWinner) {
    if (psoFinished > gbfsFinished) {
      strategySummary = `Particle Swarm Optimization (PSO) is the superior offloading strategy for this batch with a ${psoSuccessRate}% completion rate (${psoFinished}/${totalTasks} tasks successful vs GBFS ${gbfsFinished}/${totalTasks}). By iteratively refining continuous candidate allocations across Edge and Cloud resources (${psoEdgeCount} Edge / ${psoCloudCount} Cloud), PSO balanced workloads to avoid Edge RAM/storage buffer saturation that caused task drops in GBFS.`;
    } else {
      strategySummary = `Particle Swarm Optimization (PSO) is the recommended offloading strategy for this batch. Both algorithms completed all tasks (${totalTasks}/${totalTasks}), but PSO achieved lower turnaround latency (${format(psoLat, 0)} ms vs ${format(gbfsLat, 0)} ms) through balanced global co-scheduling.`;
    }
  } else {
    if (gbfsFinished > psoFinished) {
      strategySummary = `Greedy Best-First Search (GBFS) is the superior offloading strategy for this batch with a ${gbfsSuccessRate}% completion rate (${gbfsFinished}/${totalTasks} tasks successful vs PSO ${psoFinished}/${totalTasks}). Its sequential heuristic minimized immediate network latency (${gbfsEdgeCount} Edge / ${gbfsCloudCount} Cloud) without causing capacity breaches.`;
    } else {
      strategySummary = `Greedy Best-First Search (GBFS) is the recommended offloading strategy for this batch. Both algorithms completed all tasks (${totalTasks}/${totalTasks}), but GBFS delivered lower average latency (${format(gbfsLat, 0)} ms vs ${format(psoLat, 0)} ms) via immediate Edge Server A dispatch with zero iterative swarm search overhead.`;
    }
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 16 }}>
      <Card
        title="Overall Report Interpretation & Strategic Analysis"
        sub="Comprehensive multi-dimensional evaluation of algorithm allocations, SLA reliability, and server utilization"
        accent={winnerColor}
      >
        {/* ── Executive Verdict Banner ── */}
        <div
          style={{
            background: T.elevated,
            border: `1px solid ${winnerColor}44`,
            borderRadius: 8,
            padding: "16px 18px",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.fontSans }}>
                Executive Decision:
              </span>
              <Badge color={isPsoWinner ? "purple" : "blue"}>
                {winner} Optimal Algorithm
              </Badge>
              {gauges.recommended_server && (
                <Badge color="amber">
                  Target: {gauges.recommended_server}
                </Badge>
              )}
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 13, color: T.text, fontFamily: T.fontSans, lineHeight: 1.5 }}>
            {strategySummary}
          </p>

        </div>

        {/* ── 3 Pillar Analytical Findings Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
          {/* Pillar 1: Reliability & SLA */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🎯</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.fontSans }}>1. Task Reliability & SLA Adherence</span>
            </div>
            <p style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans, lineHeight: 1.45, margin: 0 }}>
              {reliabilityInsight}
            </p>
          </div>

          {/* Pillar 2: Latency & Speed */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.fontSans }}>2. Latency & Execution Speed</span>
            </div>
            <p style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans, lineHeight: 1.45, margin: 0 }}>
              {latencyInsight}
            </p>
          </div>

          {/* Pillar 3: Hardware & Buffer Balancing */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>💾</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.fontSans }}>3. Memory & Buffer Allocation</span>
            </div>
            <p style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans, lineHeight: 1.45, margin: 0 }}>
              GBFS allocated {gbfsEdgeCount} tasks to Edge and {gbfsCloudCount} to Cloud. PSO assigned {psoEdgeCount} tasks to Edge and {psoCloudCount} to Cloud. Edge Server A (500 MB RAM, 2 cores) prioritizes small quick tasks, while Cloud Server B (2000 MB RAM, 8 cores) handles bulk demands.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

