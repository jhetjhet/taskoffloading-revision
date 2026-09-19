import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, InfoBox, TableRow, Th } from "../../common";
import { TradeoffScatterChart } from "./TradeoffScatterChart";

const format = (value, digits = 2) => Number(value || 0).toFixed(digits);

const RawPerformance = ({ analytics, T }) => {
  const rows = [
    ["Latency", "latency_ms", "ms"],
    ["Processing time", "proc_time_ms", "ms"],
    ["Throughput", "throughput_mb_s", "MB/s"],
    ["CPU utilization", "cpu_utilization_pct", "%"],
    ["Memory usage", "memory_usage_mb", "MB"],
    ["Storage usage", "storage_usage_mb", "MB"],
    ["Queue length", "queue_length", "tasks"],
  ];
  const chartData = rows.map(([label, key]) => ({
    metric: label,
    GBFS: Number(analytics.gbfs?.[key] || 0),
    PSO: Number(analytics.pso?.[key] || 0),
    GBFSRaw: Number(analytics.gbfs?.[key] || 0),
    PSORaw: Number(analytics.pso?.[key] || 0),
  }));
  const normalizedData = chartData.map((row) => {
    const maximum = Math.max(row.GBFSRaw, row.PSORaw, 0.0001);
    return { ...row, GBFS: (row.GBFSRaw / maximum) * 100, PSO: (row.PSORaw / maximum) * 100 };
  });

  return (
    <Card title="GBFS vs PSO performance" sub="Each metric is normalized within its own lane; raw values are shown in the table" accent={T.blue}>
      <div style={{ width: "100%", height: 290 }}>
        <ResponsiveContainer>
          <BarChart data={normalizedData} margin={{ top: 8, right: 20, left: 0, bottom: 35 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="metric" angle={-20} textAnchor="end" height={60} stroke={T.muted} />
            <YAxis domain={[0, 100]} stroke={T.muted} />
            <Tooltip formatter={(value, name, item) => [`${format(item.payload[`${name}Raw`])}`, `${name} raw`]} />
            <Legend />
            <Bar dataKey="GBFS" fill={T.blue} />
            <Bar dataKey="PSO" fill={T.purple} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse", textAlign: "left" }}>
          <thead><tr><Th>Metric</Th><Th>GBFS</Th><Th>PSO</Th><Th>Better</Th></tr></thead>
          <tbody>{rows.map(([label, key, unit], index) => (
            <TableRow key={label} isOdd={index % 2 === 1} cells={[
              <span>{label}</span>,
              <span>{format(analytics.gbfs?.[key])} {unit}</span>,
              <span>{format(analytics.pso?.[key])} {unit}</span>,
              <span>{key === "throughput_mb_s" ? (analytics.gbfs?.[key] >= analytics.pso?.[key] ? "GBFS" : "PSO") : (analytics.gbfs?.[key] <= analytics.pso?.[key] ? "GBFS" : "PSO")}</span>,
            ]} />
          ))}</tbody>
        </table>
      </div>
    </Card>
  );
};

const ImprovementSection = ({ analytics, T }) => {
  const validation = analytics.experiment_validation || {};
  return (
    <Card title="Prediction validation" sub={`Predicted versus actual worker latency · tolerance ${validation.tolerance_pct || 20}%`} accent={T.green}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        {[["GBFS", validation.gbfs], ["PSO", validation.pso]].map(([name, result]) => (
          <InfoBox key={name} color={result?.passed ? "green" : "red"}>
            <strong>{name}</strong>: predicted {format(result?.predicted_latency_ms)} ms, actual {format(result?.actual_latency_ms)} ms, deviation {format(result?.deviation_pct, 1)}%
          </InfoBox>
        ))}
      </div>
    </Card>
  );
};

const RadarComparison = ({ radar, T }) => {
  const data = Object.keys(radar.GBFS || {})
    .filter((metric) => metric !== "energy")
    .map((metric) => ({
      metric,
      GBFS: Number(radar.GBFS?.[metric] || 0),
      PSO: Number(radar.PSO?.[metric] || 0),
    }));

  return (
    <Card title="GBFS vs PSO performance profile" sub="Normalized scores across latency, processing, throughput, and resource utilization" accent={T.purple}>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke={T.border} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: T.muted, fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fill: T.dim, fontSize: 10 }} />
            <Radar name="GBFS" dataKey="GBFS" stroke={T.blue} fill={T.blue} fillOpacity={0.25} />
            <Radar name="PSO" dataKey="PSO" stroke={T.purple} fill={T.purple} fillOpacity={0.25} />
            <Tooltip />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export const AnalyticsDashboard = ({ analytics, T }) => {
  if (!analytics) return null;
  const radar = analytics.radar_comparison || {};
  return (
    <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
      <RawPerformance analytics={analytics.raw_performance || {}} T={T} />
      <div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <RadarComparison radar={radar} T={T} />
        <TradeoffScatterChart analytics={analytics} T={T} />
      </div>
      {/* <ImprovementSection analytics={analytics} T={T} /> */}
      {/* <Card title="Research conclusion" sub="Generated from the completed analytics report" accent={T.green}>
        <InfoBox color="green"><strong>{conclusion.winner || "-"}</strong> selected from the GBFS versus PSO comparison using measured latency, execution outcomes, and failure counts.</InfoBox>
      </Card> */}
    </div>
  );
};
