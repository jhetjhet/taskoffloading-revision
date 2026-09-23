import React from "react";
import { useT } from "../../../context/ThemeContext";
import { formatServerLabel } from "../../../utils/serverLabels";
import { Card, Badge } from "../../common";

export const ProcessingNodeComparison = ({ gbfsData, decidedKey, winnerAlgo }) => {
  const T = useT();
  const nodes = Object.entries(gbfsData?.candidates || {}).map(([key, data]) => ({ key, data }));
  return (
    <Card title="Processing Node Comparison" sub={`Both candidates as evaluated by ${winnerAlgo}`} accent={T.purple}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {nodes.map((n) => {
          const selected = n.key === decidedKey;
          return (
            <div key={n.key} style={{ flex: "1 1 220px", border: `1px solid ${selected ? T.green : T.border}`, borderRadius: 8, padding: "12px 14px", background: selected ? T.greenBg : T.elevated }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.fontSans }}>{formatServerLabel(n.key)}</span>
                <Badge color={selected ? "green" : "dim"} dot={selected}>{selected ? "Selected" : "Evaluated"}</Badge>
              </div>
              <div style={{ fontSize: 13, fontFamily: T.fontMono, color: T.muted, lineHeight: 1.7 }}>
                Latency: <strong style={{ color: T.text }}>{n.data.latency_ms ?? n.data.latency ?? "-"} ms</strong>
                <br />
                Resource Avail.: <strong style={{ color: T.text }}>{n.data.resource_avail ?? n.data.resourceAvailability ?? "-"}%</strong>
                <br />
                Heuristic Score: <strong style={{ color: T.text }}>{n.data.heuristic_score ?? "-"}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

