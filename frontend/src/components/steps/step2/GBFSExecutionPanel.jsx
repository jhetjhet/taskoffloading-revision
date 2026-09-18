import React from "react";
import { useT } from "../../../context/ThemeContext";
import { resolveServer, GBFS_STEPS } from "../../../config/constants";
import { Card, EvalTh } from "../../common";
import { StepPipeline } from "./StepPipeline";
import { TermLine } from "./TermLine";

export const GBFSExecutionPanel = ({ machine: m, sim, stage }) => {
  const T = useT();
  if (!sim) return null;
  const srv = resolveServer(sim.recommendedServer);
  const pipelineIdx = [0, 1, 2, 2, 3, 5][stage] ?? -1;

  const rows = [
    { key: "A", label: resolveServer("A").label, visible: stage >= 2, active: stage === 2, selected: stage >= 5 && sim.recommendedServer === "A", data: sim.candidates.A },
    { key: "B", label: resolveServer("B").label, visible: stage >= 3, active: stage === 3, selected: stage >= 5 && sim.recommendedServer === "B", data: sim.candidates.B },
  ];

  return (
    <Card title="GBFS Execution Simulation" sub="Greedy Best-First Search — single-pass, immediate best choice" accent={T.blue}>
      <StepPipeline steps={GBFS_STEPS} activeIdx={pipelineIdx} activeColor={T.blue} activeText={T.bg === "#eef0f5" ? "#fff" : "#0d1117"} />
      <TermLine done={stage >= 1}>Analyzing selected workload ({m.machineId})...</TermLine>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <EvalTh>Node</EvalTh>
            <EvalTh>Est. Latency</EvalTh>
            <EvalTh>Proc. Time</EvalTh>
            <EvalTh>Resource Avail.</EvalTh>
            <EvalTh>Heuristic Score</EvalTh>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} style={{ background: r.selected ? T.blueBg : r.active ? T.elevated : "transparent" }}>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.text, fontWeight: r.selected ? 700 : 400, borderBottom: `1px solid ${T.borderSub}` }}>{r.label}</td>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{r.visible ? `${r.data.latency} ms` : "—"}</td>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{r.visible ? `${r.data.time} ms` : "—"}</td>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{r.visible ? `${r.data.resourceAvailability}%` : "—"}</td>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.muted, fontWeight: r.selected ? 700 : 400, borderBottom: `1px solid ${T.borderSub}` }}>{r.visible ? r.data.heuristicScore : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TermLine done={stage >= 4} color={T.blue}>Comparing server performance...</TermLine>
      <TermLine done={stage >= 5} color={T.blue}>Selecting best heuristic option...</TermLine>

      {stage >= 5 && (
        <div style={{ marginTop: 12, background: T.blueBg, border: `1px solid ${T.blueDim}`, borderLeft: `3px solid ${T.blue}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 13, color: T.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans, marginBottom: 6 }}>Final GBFS Result</div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Server: <strong>{srv.icon} {srv.label}</strong></div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Latency: <strong>{sim.latency} ms</strong></div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Processing Time: <strong>{sim.time} ms</strong></div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Resource Utilization: <strong>{sim.utilization}%</strong></div>
          <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, marginTop: 6 }}>{sim.decisionReason}</div>
        </div>
      )}
    </Card>
  );
};

