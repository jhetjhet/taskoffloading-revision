import React from "react";
import { useT } from "../../../context/ThemeContext";
import { Card, EvalTh } from "../../common";
import { formatServerLabel, getServerCounts } from "../../../utils/serverLabels";
import { StepPipeline } from "./StepPipeline";
import { TermLine } from "./TermLine";

const GBFS_PIPELINE = [
  "Task Input",
  "Identify Candidates",
  "Evaluate Heuristic",
  "Compare Nodes",
  "Decision",
];

export const GBFSExecutionPanel = ({ currentStep, allSteps = [], totalTasks, tasks = [], isRunning, machine }) => {
  const T = useT();

  const activeStep = currentStep || allSteps[allSteps.length - 1];
  const candidates = activeStep?.candidates || {};
  const selectedServer = activeStep?.selected_server;

  const totalCount = totalTasks || tasks.length || allSteps.length;
  const isBatchDone = allSteps.length > 0 && allSteps.length >= totalCount;
  const distribution = getServerCounts(allSteps.map((step) => step.selected_server).filter(Boolean));
  const allocationSummary = Object.entries(distribution).map(([server, count]) => `${formatServerLabel(server)} (${count})`).join(" · ") || "No allocations";

  const stage = isBatchDone ? 5 : activeStep ? 4 : isRunning ? 2 : 0;
  const pipelineIdx = stage >= 5 ? 4 : Math.max(0, stage - 1);
  const rows = Object.entries(candidates).map(([serverKey, candidate]) => ({
    key: serverKey,
    label: formatServerLabel(serverKey),
    data: candidate,
    selected: selectedServer === serverKey,
  }));

  return (
    <Card
      title="GBFS EXECUTION SIMULATION"
      sub="Greedy Best-First Search — sequential per-task evaluation"
      accent={T.blue}
    >
      <StepPipeline
        steps={GBFS_PIPELINE}
        activeIdx={pipelineIdx}
        activeColor={T.blue}
        activeText={T.bg === "#eef0f5" ? "#fff" : "#0d1117"}
      />

      <TermLine done={Boolean(activeStep)}>
        {activeStep
          ? `Evaluating task ${activeStep.task_index + 1}/${totalCount || allSteps.length || "?"}: ${activeStep.task_name || activeStep.task_id}`
          : machine
          ? `Analyzing selected workload (${machine.name || machine.id})...`
          : "Awaiting task evaluation..."}
      </TermLine>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <EvalTh>NODE</EvalTh>
            <EvalTh>EST. LATENCY</EvalTh>
            <EvalTh>PROC. TIME</EvalTh>
            <EvalTh>RESOURCE AVAIL.</EvalTh>
            <EvalTh>HEURISTIC SCORE</EvalTh>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isSel = r.selected;
            return (
              <tr
                key={r.key}
                style={{
                  background: isSel ? T.blueBg : "transparent",
                  transition: "background 0.2s ease",
                }}
              >
                <td
                  style={{
                    padding: "7px 8px",
                    fontFamily: T.fontMono,
                    fontSize: 13,
                    color: isSel ? T.blue : T.text,
                    fontWeight: isSel ? 700 : 400,
                    borderBottom: `1px solid ${T.borderSub}`,
                  }}
                >
                  {r.label}
                </td>
                <td
                  style={{
                    padding: "7px 8px",
                    fontFamily: T.fontMono,
                    fontSize: 13,
                    color: isSel ? T.blue : T.muted,
                    borderBottom: `1px solid ${T.borderSub}`,
                  }}
                >
                  {r.data ? `${r.data.latency_ms} ms` : "—"}
                </td>
                <td
                  style={{
                    padding: "7px 8px",
                    fontFamily: T.fontMono,
                    fontSize: 13,
                    color: isSel ? T.blue : T.muted,
                    borderBottom: `1px solid ${T.borderSub}`,
                  }}
                >
                  {r.data ? `${r.data.proc_time_ms} ms` : "—"}
                </td>
                <td
                  style={{
                    padding: "7px 8px",
                    fontFamily: T.fontMono,
                    fontSize: 13,
                    color: isSel ? T.blue : T.muted,
                    borderBottom: `1px solid ${T.borderSub}`,
                  }}
                >
                  {r.data ? `${r.data.resource_avail}%` : "—"}
                </td>
                <td
                  style={{
                    padding: "7px 8px",
                    fontFamily: T.fontMono,
                    fontSize: 13,
                    color: isSel ? T.blue : T.muted,
                    fontWeight: isSel ? 700 : 400,
                    borderBottom: `1px solid ${T.borderSub}`,
                  }}
                >
                  {r.data ? r.data.heuristic_score : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <TermLine done={Boolean(activeStep)} color={T.blue}>
        Comparing server performance for Task {activeStep ? activeStep.task_index + 1 : "..."}
      </TermLine>
      <TermLine done={Boolean(selectedServer)} color={T.blue}>
        {selectedServer
          ? `Assigned Task ${activeStep.task_index + 1} to ${formatServerLabel(selectedServer)}`
          : "Selecting best heuristic option..."}
      </TermLine>

      {/* Real-time single task decision banner */}
      {activeStep && (
        <div
          style={{
            marginTop: 12,
            background: T.blueBg,
            border: `1px solid ${T.blueDim}`,
            borderLeft: `3px solid ${T.blue}`,
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: T.blue,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: T.fontSans,
              marginBottom: 4,
            }}
          >
            {isBatchDone ? `Last Evaluated: Task ${activeStep.task_index + 1} (${activeStep.task_name || activeStep.task_id})` : `Current Decision: Task ${activeStep.task_index + 1} (${activeStep.task_name || activeStep.task_id})`}
          </div>
          <div style={{ fontSize: 13, fontFamily: T.fontMono, color: T.text }}>
            Assigned:{" "}
            <strong>
              {formatServerLabel(selectedServer)}
            </strong>
          </div>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans, marginTop: 4 }}>
            {activeStep.decision_reason}
          </div>
        </div>
      )}

      {/* Batch Completed Overall Summary Banner */}
      {isBatchDone && (
        <div
          style={{
            marginTop: 10,
            background: T.elevated,
            border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${T.blue}`,
            borderRadius: 8,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: T.blue,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontFamily: T.fontSans,
              marginBottom: 4,
            }}
          >
            GBFS Batch Allocation Complete
          </div>
          <div style={{ fontSize: 13, fontFamily: T.fontMono, color: T.text }}>
            Distribution: <strong>{allocationSummary}</strong> across {allSteps.length} tasks
          </div>
          {/* <div style={{ marginTop: 6, fontSize: 11, color: T.muted, fontFamily: T.fontMono, lineHeight: 1.5 }}>
            Batch assignments: {allocationSummary}
          </div> */}
        </div>
      )}
    </Card>
  );
};
