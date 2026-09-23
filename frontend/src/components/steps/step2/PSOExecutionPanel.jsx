import React from "react";
import { useT } from "../../../context/ThemeContext";
import { Card, EvalTh } from "../../common";
import { formatServerLabel, getServerColor, getServerCounts } from "../../../utils/serverLabels";
import { StepPipeline } from "./StepPipeline";
import { PSOTrack } from "./PSOTrack";

const PSO_PIPELINE = [
  "Task Input",
  "Init Particles",
  "Evaluate Fitness",
  "Update Bests",
  "Update Positions",
  "Converge",
  "Decision",
];

export const PSOExecutionPanel = ({ currentStep, allSteps = [], isRunning }) => {
  const T = useT();

  const activeStep = currentStep || allSteps[allSteps.length - 1];
  const iterNum = activeStep?.iteration ?? 0;
  const totalIters = activeStep?.total_iterations ?? 40;
  const bestFit = activeStep?.best_fitness ?? 0;
  const bestX = activeStep?.best_x ?? 0;
  const allocation = activeStep?.global_allocation || [];
  const allocationCounts = activeStep?.allocation_counts || getServerCounts(allocation);
  const serverIds = Object.keys(allocationCounts);
  const allocationTitle = Object.keys(allocationCounts).length
    ? Object.entries(allocationCounts).map(([server, count]) => `${formatServerLabel(server)} (${count})`).join(" / ")
    : "Awaiting allocation";
  const particles = activeStep?.particles || [];

  const done = allSteps.length > 0 && iterNum >= totalIters;
  const pipelineIdx = done
    ? PSO_PIPELINE.length - 1
    : !activeStep && !isRunning
    ? 0
    : iterNum === 0
    ? 1
    : Math.min(PSO_PIPELINE.length - 2, 2 + Math.floor((iterNum / totalIters) * 4));

  return (
    <Card
      title="PSO EXECUTION SIMULATION"
      sub="Particle Swarm Optimization — iterative convergence"
      accent={T.purple}
    >
      <StepPipeline
        steps={PSO_PIPELINE}
        activeIdx={pipelineIdx}
        activeColor={T.purple}
        activeText="#2a0016"
      />

      <div style={{ fontFamily: T.fontMono, fontSize: 13, color: T.muted, marginBottom: 4 }}>
        {activeStep ? (
          <>
            Iteration <strong style={{ color: T.purple }}>{iterNum}</strong> / {totalIters} · global best fitness{" "}
              <strong style={{ color: T.purple }}>{bestFit}</strong> · active allocations {allocationTitle}
          </>
        ) : (
          "Awaiting swarm convergence…"
        )}
      </div>

      <PSOTrack bestX={bestX} particles={particles} serverIds={serverIds} />

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <EvalTh>PARTICLE</EvalTh>
            <EvalTh>POSITION (X)</EvalTh>
            <EvalTh>FITNESS</EvalTh>
            <EvalTh>LEANING</EvalTh>
          </tr>
        </thead>
        <tbody>
          {particles.length > 0 ? (
            particles.map((p) => (
              <tr key={p.name}>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: T.fontMono,
                    fontSize: 13,
                    color: T.text,
                    borderBottom: `1px solid ${T.borderSub}`,
                  }}
                >
                  {p.name}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: T.fontMono,
                    fontSize: 13,
                    color: T.muted,
                    borderBottom: `1px solid ${T.borderSub}`,
                  }}
                >
                  {p.x}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: T.fontMono,
                    fontSize: 13,
                    color: T.muted,
                    borderBottom: `1px solid ${T.borderSub}`,
                  }}
                >
                  {p.fitness}
                </td>
                <td
                  style={{
                    padding: "6px 8px",
                    fontFamily: T.fontMono,
                    fontSize: 13,
                    color: getServerColor(p.leaning),
                    borderBottom: `1px solid ${T.borderSub}`,
                  }}
                >
                  {p.leaning}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={4}
                style={{ padding: "10px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.dim }}
              >
                —
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {done && (
        <div
          style={{
            marginTop: 12,
            background: T.purpleBg,
            border: `1px solid ${T.purpleDim}`,
            borderLeft: `3px solid ${T.purple}`,
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: T.purple,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: T.fontSans,
              marginBottom: 4,
            }}
          >
            Final PSO Swarm Converged
          </div>
          <div style={{ fontSize: 13, fontFamily: T.fontMono, color: T.text }}>
            Swarm Global Optimum: <strong>{allocationTitle}</strong> (Fitness: {bestFit})
          </div>
          {/* <div style={{ marginTop: 6, fontSize: 11, color: T.muted, fontFamily: T.fontMono, lineHeight: 1.5 }}>
            Global-best assignments: {allocationLabel}
          </div> */}
        </div>
      )}
    </Card>
  );
};
