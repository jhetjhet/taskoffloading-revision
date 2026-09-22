import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, InfoBox, TableRow, Th } from "../../common";
import { TradeoffScatterChart } from "./TradeoffScatterChart";

const format = (value, digits = 2) => Number(value || 0).toFixed(digits);

const RawPerformance = ({ analytics, T }) => {
  const gbfs = analytics.gbfs || {};
  const pso = analytics.pso || {};

  const gbfsTotal = gbfs.total_tasks || 0;
  const psoTotal = pso.total_tasks || 0;
  const gbfsFinished = gbfs.finished_tasks ?? (gbfsTotal - (gbfs.failed_tasks || 0));
  const psoFinished = pso.finished_tasks ?? (psoTotal - (pso.failed_tasks || 0));
  const gbfsFailed = gbfs.failed_tasks || 0;
  const psoFailed = pso.failed_tasks || 0;

  const gbfsRate = gbfsTotal ? (gbfsFinished / gbfsTotal) * 100 : 0;
  const psoRate = psoTotal ? (psoFinished / psoTotal) * 100 : 0;

  const chartRows = [
    ["Latency", "latency_ms"],
    ["Processing time", "proc_time_ms"],
    ["Throughput", "throughput_mb_s"],
    ["CPU utilization", "cpu_utilization_pct"],
    ["Memory usage", "memory_usage_mb"],
    ["Storage usage", "storage_usage_mb"],
    ["Queue length", "queue_length"],
  ];
  const chartData = chartRows.map(([label, key]) => ({
    metric: label,
    GBFS: Number(gbfs[key] || 0),
    PSO: Number(pso[key] || 0),
    GBFSRaw: Number(gbfs[key] || 0),
    PSORaw: Number(pso[key] || 0),
  }));
  const normalizedData = chartData.map((row) => {
    const maximum = Math.max(row.GBFSRaw, row.PSORaw, 0.0001);
    return { ...row, GBFS: (row.GBFSRaw / maximum) * 100, PSO: (row.PSORaw / maximum) * 100 };
  });

  const tableRows = [
    {
      label: "Tasks completed",
      gbfsVal: `${gbfsFinished} / ${gbfsTotal}`,
      psoVal: `${psoFinished} / ${psoTotal}`,
      better: gbfsFinished === psoFinished ? "Equal" : gbfsFinished > psoFinished ? "GBFS" : "PSO",
      highlight: true,
    },
    {
      label: "Tasks failed",
      gbfsVal: `${gbfsFailed}`,
      psoVal: `${psoFailed}`,
      better: gbfsFailed === psoFailed ? "Equal" : gbfsFailed < psoFailed ? "GBFS" : "PSO",
      highlight: true,
    },
    {
      label: "Success rate",
      gbfsVal: `${format(gbfsRate, 1)}%`,
      psoVal: `${format(psoRate, 1)}%`,
      better: gbfsRate === psoRate ? "Equal" : gbfsRate > psoRate ? "GBFS" : "PSO",
      highlight: true,
    },
    {
      label: "Average Latency",
      gbfsVal: `${format(gbfs.latency_ms)} ms${gbfsFailed > 0 ? ` (${gbfsFailed} failed)` : ""}`,
      psoVal: `${format(pso.latency_ms)} ms${psoFailed > 0 ? ` (${psoFailed} failed)` : ""}`,
      better: (() => {
        if (psoFinished > gbfsFinished) return "PSO (Full batch)";
        if (gbfsFinished > psoFinished) return "GBFS (Full batch)";
        if (gbfs.latency_ms === pso.latency_ms) return "Equal";
        return Number(gbfs.latency_ms || 0) < Number(pso.latency_ms || 0) ? "GBFS" : "PSO";
      })(),
    },
    {
      label: "Processing time",
      gbfsVal: `${format(gbfs.proc_time_ms)} ms`,
      psoVal: `${format(pso.proc_time_ms)} ms`,
      better: (() => {
        if (psoFinished > gbfsFinished) return "PSO (Full batch)";
        if (gbfsFinished > psoFinished) return "GBFS (Full batch)";
        if (gbfs.proc_time_ms === pso.proc_time_ms) return "Equal";
        return Number(gbfs.proc_time_ms || 0) < Number(pso.proc_time_ms || 0) ? "GBFS" : "PSO";
      })(),
    },
    {
      label: "Throughput",
      gbfsVal: `${format(gbfs.throughput_mb_s)} MB/s`,
      psoVal: `${format(pso.throughput_mb_s)} MB/s`,
      better: (() => {
        if (psoFinished > gbfsFinished) return "PSO (Full batch)";
        if (gbfsFinished > psoFinished) return "GBFS (Full batch)";
        if (gbfs.throughput_mb_s === pso.throughput_mb_s) return "Equal";
        return Number(gbfs.throughput_mb_s || 0) > Number(pso.throughput_mb_s || 0) ? "GBFS" : "PSO";
      })(),
    },
    {
      label: "CPU utilization",
      gbfsVal: `${format(gbfs.cpu_utilization_pct, 1)}%`,
      psoVal: `${format(pso.cpu_utilization_pct, 1)}%`,
      better: gbfs.cpu_utilization_pct === pso.cpu_utilization_pct ? "Equal" : (Number(gbfs.cpu_utilization_pct || 0) < Number(pso.cpu_utilization_pct || 0) ? "GBFS" : "PSO"),
    },
    {
      label: "Memory usage",
      gbfsVal: `${format(gbfs.memory_usage_mb, 1)} MB`,
      psoVal: `${format(pso.memory_usage_mb, 1)} MB`,
      better: gbfs.memory_usage_mb === pso.memory_usage_mb ? "Equal" : (Number(gbfs.memory_usage_mb || 0) < Number(pso.memory_usage_mb || 0) ? "GBFS" : "PSO"),
    },
    {
      label: "Storage usage",
      gbfsVal: `${format(gbfs.storage_usage_mb, 1)} MB`,
      psoVal: `${format(pso.storage_usage_mb, 1)} MB`,
      better: gbfs.storage_usage_mb === pso.storage_usage_mb ? "Equal" : (Number(gbfs.storage_usage_mb || 0) < Number(pso.storage_usage_mb || 0) ? "GBFS" : "PSO"),
    },
    {
      label: "Queue length",
      gbfsVal: `${gbfs.queue_length || 0} tasks`,
      psoVal: `${pso.queue_length || 0} tasks`,
      better: gbfs.queue_length === pso.queue_length ? "Equal" : (Number(gbfs.queue_length || 0) < Number(pso.queue_length || 0) ? "GBFS" : "PSO"),
    },
  ];

  return (
    <Card title="GBFS vs PSO performance" sub="Detailed multi-dimensional breakdown of task outcomes, reliability, and system metrics" accent={T.blue}>
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
          <tbody>{tableRows.map((row, index) => {
            const isPsoBetter = row.better.startsWith("PSO");
            const isGbfsBetter = row.better.startsWith("GBFS");
            const betterColor = isPsoBetter ? T.purple : isGbfsBetter ? T.blue : T.muted;

            return (
              <TableRow
                key={row.label}
                isOdd={index % 2 === 1}
                cells={[
                  <span style={{ fontWeight: row.highlight ? 700 : 500, color: row.highlight ? T.text : T.muted }}>
                    {row.label}
                  </span>,
                  <span style={{ fontFamily: T.fontMono, fontWeight: row.highlight ? 700 : 400 }}>
                    {row.gbfsVal}
                  </span>,
                  <span style={{ fontFamily: T.fontMono, fontWeight: row.highlight ? 700 : 400 }}>
                    {row.psoVal}
                  </span>,
                  <span style={{ color: betterColor, fontWeight: 700, fontFamily: T.fontMono }}>
                    {row.better}
                  </span>,
                ]}
              />
            );
          })}</tbody>
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
