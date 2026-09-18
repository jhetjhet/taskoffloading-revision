import React from "react";
import { useT } from "../../../context/ThemeContext";
import { GBFS_GRAPH_STEPS } from "../../../config/constants";
import { Card } from "../../common";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const buildGbfsGraphData = (m, sim, stage) => {
  const baseline = m?.avgLatency != null ? +m.avgLatency : sim ? sim.candidates.A.latency : 100;
  if (!sim) return GBFS_GRAPH_STEPS.map((step) => ({ step, value: baseline }));

  const aLat = sim.candidates.A.latency;
  const bLat = sim.candidates.B.latency;
  const bestAB = Math.min(aLat, bLat);
  const values = [baseline, baseline, aLat, bestAB, bestAB, sim.latency];
  const count = Math.max(1, stage + 1);
  return GBFS_GRAPH_STEPS.slice(0, count).map((step, i) => ({ step, value: values[i] }));
};

export const buildPsoGraphData = (m, sim, iteration) => {
  const baseline = m?.avgLatency != null ? +m.avgLatency : 100;
  if (!sim) return Array.from({ length: 4 }, (_, i) => ({ step: `Iter ${i + 1}`, value: baseline }));

  let running = Infinity;
  const pts = [];
  for (let i = 0; i < iteration && i < sim.iterations.length; i++) {
    const row = sim.iterations[i];
    running = Math.min(running, row.particleA.latency, row.particleB.latency);
    pts.push({ step: `Iter ${row.iteration}`, value: +running.toFixed(2) });
  }
  if (pts.length === 0) pts.push({ step: "Iter 1", value: baseline });
  return pts;
};

export const PerformanceLineGraph = ({ title, color, data }) => {
  const T = useT();
  return (
    <Card title={title} sub="Latency (ms) — lower is better" accent={color}>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="step" stroke={T.dim} fontSize={11} fontFamily={T.fontSans} />
          <YAxis stroke={T.dim} fontSize={11} fontFamily={T.fontMono} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: T.elevated,
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              fontFamily: T.fontMono,
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

