import React from "react";
import { Stat } from "../../common";

export const ReportSummary = ({ report }) => {
  const summaries = report.algorithms.map((algorithm) => {
    const tasks = algorithm.result?.tasks || [];
    const finished = tasks.filter((task) => task.status === "FINISHED").length;
    const failed = tasks.filter((task) => task.status === "FAILED").length;
    const totalLatency = tasks.reduce((sum, task) => sum + Number(task.total_latency_sec || 0), 0);
    return {
      name: algorithm.algorithm,
      finished,
      failed,
      averageLatency: tasks.length ? totalLatency / tasks.length : 0,
    };
  });

  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      <Stat label="Tasks in batch" value={report.input?.tasks?.length || 0} color="blue" />
      {summaries.map((summary) => (
        <React.Fragment key={summary.name}>
          <Stat label={`${summary.name} finished`} value={summary.finished} color="green" />
          <Stat label={`${summary.name} failed`} value={summary.failed} color="red" />
          <Stat label={`${summary.name} avg latency`} value={`${summary.averageLatency.toFixed(2)} s`} color={summary.name === "GBFS" ? "blue" : "purple"} />
        </React.Fragment>
      ))}
    </div>
  );
};
