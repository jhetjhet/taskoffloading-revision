import React from "react";
import { useT } from "../../context/ThemeContext";
import { Card, InfoBox } from "../common";
import { ReportSummary } from "./reports/ReportSummary";
import { AlgorithmReportTable } from "./reports/AlgorithmReportTable";
import { ServerAllocationReport } from "./reports/ServerAllocationReport";
import { MetricWinTally } from "./reports/MetricWinTally";
import { AnalyticsDashboard } from "./reports/AnalyticsDashboard";

export const Step4Reports = ({ report }) => {
  const T = useT();

  if (!report) {
    return <InfoBox color="amber">Complete a GBFS and PSO offloading run to view its report.</InfoBox>;
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, color: T.text, margin: 0, fontFamily: T.fontSans }}>Offloading Report</h1>
        <p style={{ color: T.muted, fontFamily: T.fontSans }}>Run {report.id} · measured simulation results</p>
      </div>
      <AnalyticsDashboard analytics={report.analytics} T={T} />
      <ReportSummary report={report} />
      <ServerAllocationReport report={report} T={T} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
        {report.algorithms.map((algorithm) => (
          <AlgorithmReportTable key={algorithm.algorithm} algorithm={algorithm.algorithm} tasks={algorithm.result?.tasks || []} T={T} />
        ))}
      </div>
    </div>
  );
};