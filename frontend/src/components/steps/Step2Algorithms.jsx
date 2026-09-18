import React from "react";
import { useT } from "../../context/ThemeContext";
import { Card, DualBtn, GhostBtn, InfoBox, ErrBox } from "../common";
import { GBFSExecutionPanel } from "./step2/GBFSExecutionPanel";
import { PSOExecutionPanel } from "./step2/PSOExecutionPanel";
import { PerformanceLineGraph, buildGbfsGraphData, buildPsoGraphData } from "./step2/PerformanceLineGraph";
import { ProcessingNodeComparison } from "./step2/ProcessingNodeComparison";
import { TaskPayloadCard } from "./step2/TaskPayloadCard";
import { useOffloadProgress } from "../../hooks/useOffloadProgress";
import { resolveServer } from "../../config/constants";

export const Step2Algorithms = ({ machine, tasks, workload, gbfsData, psoData, algoRunning, algoError, onRunBoth, gbfsSim, psoSim, gbfsStage, psoIteration, offloading, offloadResult, offloadError, onRetryOffload }) => {
  const T = useT();
  const complete = Boolean(gbfsData && psoData);
  const gbfsWins = complete && gbfsData.latency <= psoData.latency;
  const winner = gbfsWins ? gbfsData : psoData;
  const decidedKey = winner?.recommendedServer;
  const progress = useOffloadProgress(offloading, offloadResult?.status === "success");
  const totalSize = tasks.reduce((sum, task) => sum + task.taskSize, 0);
  if (!tasks.length) return <Card><InfoBox color="amber">Generate a task batch first.</InfoBox></Card>;
  return <div>
    <h1 style={{ fontSize: 22, color: T.text, fontFamily: T.fontSans }}>Algorithm Execution</h1>
    <p style={{ fontSize: 16, color: T.muted, fontFamily: T.fontSans }}>GBFS and PSO evaluate the same {tasks.length}-task batch, then the lower-latency result is dispatched.</p>
    <div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}><PerformanceLineGraph title="GBFS Performance" color={T.blue} data={buildGbfsGraphData(machine, gbfsSim, gbfsStage)} /><PerformanceLineGraph title="PSO Performance" color={T.purple} data={buildPsoGraphData(machine, psoSim, psoIteration)} /></div>
    <Card title="Execution Pipeline" sub="Run both allocation strategies against the selected batch" accent={T.blue}>
      {algoError && <div style={{ marginBottom: 12 }}><ErrBox>Run failed — {algoError}</ErrBox></div>}
      <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}><DualBtn disabled={algoRunning || complete} onClick={onRunBoth}>{algoRunning ? "Algorithms running…" : complete ? "✓ Algorithms Complete" : "Run GBFS + PSO"}</DualBtn>{complete && !algoRunning && <GhostBtn onClick={onRunBoth}>↺ Re-run</GhostBtn>}</div>
    </Card>
    {(algoRunning || gbfsSim) && <div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}><GBFSExecutionPanel machine={machine} sim={gbfsSim} stage={gbfsStage} /><PSOExecutionPanel machine={machine} sim={psoSim} iteration={psoIteration} /></div>}
    {complete && <><ProcessingNodeComparison gbfsData={gbfsData} decidedKey={decidedKey} winnerAlgo={gbfsWins ? "GBFS" : "PSO"} /><div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}><TaskPayloadCard m={machine} workload={workload} decidedSrv={resolveServer(decidedKey)} progress={progress} success={offloadResult?.status === "success"} batchSize={totalSize} taskCount={tasks.length} /><Card title="Offloading" sub="Dispatch status" accent={T.green}><InfoBox color={offloadError ? "red" : "green"}>{offloadError ? `Offload failed — ${offloadError}` : offloadResult?.status === "success" ? "Offload complete." : "Automatically offloading now…"}</InfoBox>{offloadError && <div style={{ marginTop: 12, textAlign: "center" }}><GhostBtn onClick={onRetryOffload}>↺ Retry Offload</GhostBtn></div>}</Card></div></>}
  </div>;
};