import React, { useMemo } from "react";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Card } from "../../common";

const TradeoffTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div style={{ background: "#111827", border: "1px solid #475569", borderRadius: 6, padding: "8px 10px", color: "#e2e8f0", fontFamily: "monospace", fontSize: 11 }}>
      <strong style={{ color: item.color }}>{item.name}</strong>
      <div>Latency: {item.latency.toFixed(2)} ms</div>
      <div>CPU utilization: {item.utilization.toFixed(1)}%</div>
      <div>Throughput: {item.throughput.toFixed(2)} MB/s</div>
      <div>Finished: {item.finished} · Failed: {item.failed}</div>
    </div>
  );
};

export const TradeoffScatterChart = ({ analytics, T }) => {
  const points = useMemo(() => {
    const raw = analytics.raw_performance || {};
    return [
      ["GBFS", raw.gbfs, T.blue],
      ["PSO", raw.pso, T.purple],
    ].map(([name, metrics, color]) => ({
      name,
      color,
      latency: Number(metrics?.latency_ms || 0),
      utilization: Number(metrics?.cpu_utilization_pct || 0),
      throughput: Number(metrics?.throughput_mb_s || 0),
      finished: Number(metrics?.finished_tasks || 0),
      failed: Number(metrics?.failed_tasks || 0),
    }));
  }, [analytics, T.blue, T.purple]);

  return (
    <Card title="Latency versus resource trade-off" sub="Lower latency and utilization are better; bubble size represents throughput" accent={T.amber}>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 12, right: 24, bottom: 18, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis type="number" dataKey="latency" name="Latency" unit=" ms" stroke={T.muted} />
            <YAxis type="number" dataKey="utilization" name="CPU utilization" unit="%" stroke={T.muted} />
            <ZAxis type="number" dataKey="throughput" range={[180, 900]} name="Throughput" unit=" MB/s" />
            <Tooltip content={<TradeoffTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter name="GBFS" data={[points[0]]} fill={T.blue} />
            <Scatter name="PSO" data={[points[1]]} fill={T.purple} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
