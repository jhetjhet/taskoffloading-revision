import React from "react";
import { useT } from "../../../context/ThemeContext";
import { WORKLOAD_LABELS } from "../../../config/constants";
import { Card } from "../../common";

export const TaskPayloadCard = ({ m, workload, decidedSrv, progress, success, batchSize, taskCount }) => {
  const T = useT();
  const status = success ? "COMPLETE" : progress === 0 ? "PENDING" : progress < 100 ? "TRANSFERRING" : "FINALIZING";
  return (
    <Card title="Task Payload" sub="Batch being transferred to the target server" accent={T.amber}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
        {[
          ["Workload", workload ? WORKLOAD_LABELS[workload] : "Live Data"],
          ["Source", m.name],
          ["Target", decidedSrv.label],
          ["Tasks", taskCount ?? 1],
          ["Total Size", `${(batchSize ?? m.taskSize).toFixed ? (batchSize ?? m.taskSize).toFixed(1) : (batchSize ?? m.taskSize)} MB`],
        ].map(([l, v]) => (
          <div key={l} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px" }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans, marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.fontMono }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.fontMono, fontSize: 13, color: T.muted, marginBottom: 6 }}>
        <span>Payload</span>
        <span>{progress}%</span>
      </div>
      <div style={{ height: 10, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: `${progress}%`, background: success ? T.green : T.amber, transition: "width 0.2s linear", borderRadius: 6 }} />
      </div>
      <div style={{ fontFamily: T.fontMono, fontSize: 13, color: success ? T.green : T.amber }}>Status: <strong>{status}</strong></div>
    </Card>
  );
};

