import React from "react";
import { useT } from "../../../context/ThemeContext";
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

