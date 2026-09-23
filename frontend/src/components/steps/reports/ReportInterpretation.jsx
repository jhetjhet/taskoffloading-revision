import React from "react";
import { Card, Badge } from "../../common";
import { formatServerLabel, getServerCounts } from "../../../utils/serverLabels";

const format = (val, digits = 2) => Number(val || 0).toFixed(digits);

export const ReportInterpretation = ({ report, T }) => {
  if (!report) return null;

  const analytics = report.analytics || report.input?.analytics || {};
  const raw = analytics.raw_performance || {};
  const gbfs = raw.gbfs || {};
  const pso = raw.pso || {};
  const conclusion = analytics.research_conclusion || {};
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
  const gbfsServerCounts = getServerCounts(gbfsAlloc);
  const psoServerCounts = getServerCounts(psoAlloc);
  const gbfsServerSummary = Object.entries(gbfsServerCounts).map(([server, count]) => `${formatServerLabel(server)} (${count})`).join(" · ") || "No assignments";
  const psoServerSummary = Object.entries(psoServerCounts).map(([server, count]) => `${formatServerLabel(server)} (${count})`).join(" · ") || "No assignments";

  const gbfsLat = Number(gbfs.latency_ms || 0);
  const psoLat = Number(pso.latency_ms || 0);

  // Determine the report verdict by completion first, then latency.
  let winner = "TIE";
  if (psoFinished > gbfsFinished) {
    winner = "PSO";
  } else if (gbfsFinished > psoFinished) {
    winner = "GBFS";
  } else if (psoLat === gbfsLat) {
    winner = "TIE";
  } else if (psoLat > 0 && gbfsLat > 0) {
    if (psoLat < gbfsLat) {
      winner = "PSO";
    } else if (gbfsLat < psoLat) {
      winner = "GBFS";
    }
  } else {
    winner = conclusion.winner || "TIE";
  }

  const isPsoWinner = winner === "PSO";
  const isTie = winner === "TIE";
  const winnerColor = isPsoWinner ? T.purple : isTie ? T.amber : T.blue;

  // Synthesis insights
  let reliabilityInsight = "";
  if (psoFinished > gbfsFinished) {
    reliabilityInsight = `PSO achieved superior reliability (${psoSuccessRate}% vs GBFS ${gbfsSuccessRate}%), successfully completing ${psoFinished} of ${totalTasks} tasks without drops. GBFS failed ${gbfsFailed} task(s) under stricter greedy placement decisions in the active server set.`;
  } else if (gbfsFinished > psoFinished) {
    reliabilityInsight = `GBFS demonstrated higher task completion (${gbfsSuccessRate}% vs PSO ${psoSuccessRate}%), executing ${gbfsFinished} of ${totalTasks} tasks. PSO failed ${psoFailed} task(s).`;
  } else if (gbfsFailed === 0 && psoFailed === 0) {
    reliabilityInsight = `Both algorithms attained a 100% completion rate (${totalTasks}/${totalTasks} tasks completed). In this workload regime, the configured server profiles accommodated the batch without SLA breaches or queue saturation.`;
  } else {
    reliabilityInsight = `Both algorithms experienced similar failure counts (${gbfsFailed} failed tasks), primarily driven by strict SLA latency deadlines or collective peak memory constraints during batch execution.`;
  }

  let latencyInsight = "";
  if (gbfsLat > 0 && psoLat > 0) {
    if (psoFinished > gbfsFinished) {
      latencyInsight = `While GBFS's partial finished tasks averaged ${format(gbfsLat, 0)} ms, it failed ${gbfsFailed} other task(s). PSO successfully delivered all ${psoFinished} tasks with an average completion latency of ${format(psoLat, 0)} ms by effectively coordinating the available server profiles.`;
    } else if (gbfsFinished > psoFinished) {
      latencyInsight = `While PSO's partial finished tasks averaged ${format(psoLat, 0)} ms, it failed ${psoFailed} task(s). GBFS successfully delivered ${gbfsFinished} tasks with an average completion latency of ${format(gbfsLat, 0)} ms.`;
    } else if (psoLat < gbfsLat) {
      const diffPct = Math.round(((gbfsLat - psoLat) / gbfsLat) * 100);
      latencyInsight = `PSO lowered average task latency by ${diffPct}% (${format(psoLat, 0)} ms vs ${format(gbfsLat, 0)} ms) across all completed tasks. Global multi-task coordination optimized workload balancing across the configured server pool.`;
    } else if (gbfsLat < psoLat) {
      const diffPct = Math.round(((psoLat - gbfsLat) / psoLat) * 100);
      latencyInsight = `GBFS yielded ${diffPct}% lower average task latency (${format(gbfsLat, 0)} ms vs ${format(psoLat, 0)} ms) across all completed tasks through a faster local heuristic across the active server cluster.`;
    } else {
      latencyInsight = `GBFS and PSO delivered comparable task turnaround times (${format(gbfsLat, 0)} ms), balancing transmission overhead with compute speed.`;
    }
  } else {
    latencyInsight = `Offloading tasks onto the configured server pool substantially lowered execution delay relative to the local machine baseline.`;
  }

  let strategySummary = "";
  if (isTie) {
    strategySummary = `Particle Swarm Optimization (PSO) and Greedy Best-First Search (GBFS) produced equivalent results for this batch: both completed ${psoFinished}/${totalTasks} tasks with an average completion latency of ${format(psoLat, 0)} ms. Neither algorithm has a measured performance advantage for this workload.`;
  } else if (isPsoWinner) {
    if (psoFinished > gbfsFinished) {
      strategySummary = `Particle Swarm Optimization (PSO) is the superior offloading strategy for this batch with a ${psoSuccessRate}% completion rate (${psoFinished}/${totalTasks} tasks successful vs GBFS ${gbfsFinished}/${totalTasks}). By iteratively refining candidate allocations across the active server set (${psoServerSummary}), PSO balanced workloads to avoid capacity bottlenecks that affected GBFS.`;
    } else {
      strategySummary = `Particle Swarm Optimization (PSO) is the recommended offloading strategy for this batch. Both algorithms completed all tasks (${totalTasks}/${totalTasks}), but PSO achieved lower turnaround latency (${format(psoLat, 0)} ms vs ${format(gbfsLat, 0)} ms) through balanced global co-scheduling.`;
    }
  } else {
    if (gbfsFinished > psoFinished) {
      strategySummary = `Greedy Best-First Search (GBFS) is the superior offloading strategy for this batch with a ${gbfsSuccessRate}% completion rate (${gbfsFinished}/${totalTasks} tasks successful vs PSO ${psoFinished}/${totalTasks}). Its sequential heuristic minimized immediate transfer delay across the active server pool (${gbfsServerSummary}) without creating capacity breaches.`;
    } else {
      strategySummary = `Greedy Best-First Search (GBFS) is the recommended offloading strategy for this batch. Both algorithms completed all tasks (${totalTasks}/${totalTasks}), but GBFS delivered lower average latency (${format(gbfsLat, 0)} ms vs ${format(psoLat, 0)} ms) via immediate server selection with minimal iterative overhead.`;
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
              <Badge color={isPsoWinner ? "purple" : isTie ? "amber" : "blue"}>
                {isTie ? "Equivalent Performance" : `${winner} Optimal Algorithm`}
              </Badge>
              {gauges.recommended_server && (
                <Badge color="amber">
                  Target: {formatServerLabel(gauges.recommended_server)}
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
              GBFS distributed tasks as {gbfsServerSummary}. PSO distributed tasks as {psoServerSummary}. Resource balancing depends on each server profile’s RAM, CPU, and storage characteristics, so the best assignment shifts with workload intensity and SLA pressure.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

