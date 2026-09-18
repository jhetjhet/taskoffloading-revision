import React from "react";
import { useT } from "../../context/ThemeContext";
import { Card, Badge, InfoBox } from "../common";
import { WORKLOAD_LABELS, resolveServer } from "../../config/constants";

export const Step5Latency = ({ machine, workload, gbfsData, psoData, offloadResult, history }) => {
  const T = useT();
  if (!gbfsData || !psoData) return <Card><InfoBox color="amber">Run both algorithms first.</InfoBox></Card>;
  const gbfsWins = gbfsData.latency <= psoData.latency;
  const winner = gbfsWins ? gbfsData : psoData;
  const winnerName = gbfsWins ? "GBFS" : "PSO";
  const server = resolveServer(winner.recommendedServer);
  const rows = [["Total Latency", offloadResult?.measuredLatency ?? winner.latency, "green"], ["Execution Time", winner.time, "blue"], ["Communication Time", winner.candidates[winner.recommendedServer].networkDelay, "purple"], ["Workload", workload ? WORKLOAD_LABELS[workload] : "Live Data", "dim"]];
  return <div>
    <h1 style={{ fontSize: 22, color: T.text, fontFamily: T.fontSans }}>Latency Results</h1>
    <p style={{ fontSize: 16, color: T.muted, fontFamily: T.fontSans }}>Task from <strong>{machine.name}</strong> was assigned to <strong>{server.icon} {server.label}</strong> by <strong>{winnerName}</strong>.</p>
    <Card title="Latency Summary" sub={offloadResult ? "Measured after offloading" : "Predicted — offload not yet confirmed"} accent={T.green}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>{rows.map(([label, value, color]) => <div key={label} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}><div style={{ fontSize: 12, color: T.muted, marginBottom: 4, fontFamily: T.fontSans }}>{label}</div><Badge color={color}>{typeof value === "number" ? `${value} ms` : value}</Badge></div>)}</div>
      <div style={{ marginTop: 14 }}><InfoBox color="green">Winning algorithm: <strong>{winnerName}</strong>. Predicted latency: <strong>{winner.latency} ms</strong>. Historical executions: <strong>{history.length}</strong>.</InfoBox></div>
    </Card>
  </div>;
};