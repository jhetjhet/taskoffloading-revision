import React from "react";
import { Badge, Card } from "../../common";

const metrics = [
  ["Transfer", "transmission_time_sec", "lower"],
  ["Queue wait", "queue_wait_time_sec", "lower"],
  ["Execution", "execution_time_sec", "lower"],
  ["Total latency", "total_latency_sec", "lower"],
  ["CPU demand", "cpu_usage_percent", "lower"],
  ["RAM demand", "memory_usage_mb", "lower"],
];

export const MetricWinTally = ({ report, T }) => {
  const gbfs = report.algorithms.find((algorithm) => algorithm.algorithm === "GBFS")?.result?.tasks || [];
  const pso = report.algorithms.find((algorithm) => algorithm.algorithm === "PSO")?.result?.tasks || [];
  const results = metrics.map(([label, key, direction]) => {
    const g = gbfs.reduce((sum, task) => sum + Number(task[key] || 0), 0);
    const p = pso.reduce((sum, task) => sum + Number(task[key] || 0), 0);
    return { label, winner: direction === "lower" && g <= p ? "GBFS" : "PSO", gbfs: g, pso: p };
  });
  const gbfsWins = results.filter((result) => result.winner === "GBFS").length;

  return (
    <Card title="Measured metric tally" sub={`GBFS leads ${gbfsWins} of ${results.length} aggregate metrics`} accent={T.green}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {results.map((result) => (
          <div key={result.label} style={{ flex: "1 1 150px", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: `1px solid ${result.winner === "GBFS" ? T.blueDim : T.purpleDim}`, background: result.winner === "GBFS" ? T.blueBg : T.purpleBg, borderRadius: 6 }}>
            <span style={{ color: T.muted, fontFamily: T.fontSans, fontSize: 12 }}>{result.label}</span>
            <Badge color={result.winner === "GBFS" ? "blue" : "purple"}>{result.winner}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};
