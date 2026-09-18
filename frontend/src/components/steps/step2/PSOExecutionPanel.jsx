import React from "react";
import { useT } from "../../../context/ThemeContext";
import { resolveServer, PSO_STEPS } from "../../../config/constants";
import { Card, EvalTh } from "../../common";
import { StepPipeline } from "./StepPipeline";
import { PSOTrack } from "./PSOTrack";

export const PSOExecutionPanel = ({ machine: m, sim, iteration }) => {
  const T = useT();
  if (!sim) return null;
  const done = iteration >= sim.iterations.length;
  const srv = resolveServer(sim.recommendedServer);
  const currentRow = iteration > 0 ? sim.iterations[iteration - 1] : null;
  const pipelineIdx = done
    ? PSO_STEPS.length - 1
    : iteration === 0
    ? 0
    : Math.min(PSO_STEPS.length - 2, 1 + Math.floor(((iteration - 1) / sim.iterations.length) * 4));

  return (
    <Card title="PSO Execution Simulation" sub="Particle Swarm Optimization — iterative convergence" accent={T.purple}>
      <StepPipeline steps={PSO_STEPS} activeIdx={pipelineIdx} activeColor={T.purple} activeText="#2a0016" />

      <div style={{ fontFamily: T.fontMono, fontSize: 12, color: T.muted }}>
        {currentRow ? (
          <>
            Iteration <strong style={{ color: T.purple }}>{currentRow.iteration}</strong> / {sim.iterations.length} · global best fitness <strong style={{ color: T.purple }}>{currentRow.bestFitness}</strong> → {resolveServer(currentRow.bestX < 0.5 ? "A" : "B").label}
          </>
        ) : (
          "Awaiting task…"
        )}
      </div>
      <PSOTrack row={currentRow} />

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <EvalTh>Particle</EvalTh>
            <EvalTh>Position (x)</EvalTh>
            <EvalTh>Fitness</EvalTh>
            <EvalTh>Leaning</EvalTh>
          </tr>
        </thead>
        <tbody>
          {currentRow ? (
            [
              { name: "P1", ...currentRow.particleA },
              { name: "P2", ...currentRow.particleB },
            ].map((p) => (
              <tr key={p.name}>
                <td style={{ padding: "6px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.text, borderBottom: `1px solid ${T.borderSub}` }}>{p.name}</td>
                <td style={{ padding: "6px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{p.x}</td>
                <td style={{ padding: "6px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{p.fitness}</td>
                <td style={{ padding: "6px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{resolveServer(p.x < 0.5 ? "A" : "B").label}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ padding: "10px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.dim }}>—</td>
            </tr>
          )}
        </tbody>
      </table>

      {done && (
        <div style={{ marginTop: 12, background: T.purpleBg, border: `1px solid ${T.purpleDim}`, borderLeft: `3px solid ${T.purple}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 13, color: T.purple, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans, marginBottom: 6 }}>Final PSO Result</div>
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

