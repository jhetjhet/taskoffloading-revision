import React from "react";
import { Card, TableRow, Th } from "../../common";
import { formatServerLabel } from "../../../utils/serverLabels";

const formatNumber = (value, digits = 2) => Number(value ?? 0).toFixed(digits);

const ActivityTable = ({ summary, accent, T }) => {
  const servers = Object.entries(summary?.servers || {});

  return (
    <Card
      title={`${summary?.algorithm || "Algorithm"} server activity`}
      sub={`${summary?.total_tasks || 0} tasks measured across all configured servers`}
      accent={accent}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr>
              <Th>Server</Th>
              <Th>Assigned</Th>
              <Th>Finished</Th>
              <Th>Failed</Th>
              <Th>Avg latency</Th>
              <Th>Avg queue wait</Th>
              <Th>Avg CPU</Th>
              <Th>Avg memory</Th>
              <Th>Avg storage</Th>
            </tr>
          </thead>
          <tbody>
            {servers.length > 0 ? servers.map(([serverId, metrics], index) => {
              const assigned = Number(metrics?.assigned_tasks ?? 0);
              const failed = Number(metrics?.failed_tasks ?? 0);
              return (
                <TableRow
                  key={serverId}
                  isOdd={index % 2 === 1}
                  cells={[
                    <span title={serverId} style={{ color: T.text, whiteSpace: "nowrap" }}>
                      {formatServerLabel(serverId)}
                    </span>,
                    <span>{assigned}</span>,
                    <span>{Number(metrics?.finished_tasks ?? 0)}</span>,
                    <span style={{ color: failed > 0 ? T.red : T.muted }}>{failed}</span>,
                    <span>{formatNumber(metrics?.avg_latency_ms)} ms</span>,
                    <span>{formatNumber(metrics?.avg_queue_wait_ms)} ms</span>,
                    <span>{formatNumber(metrics?.avg_cpu_utilization_pct)}%</span>,
                    <span>{formatNumber(metrics?.avg_memory_usage_mb)} MB</span>,
                    <span>{formatNumber(metrics?.avg_storage_utilization_pct)}%</span>,
                  ]}
                />
              );
            }) : (
              <tr>
                <td colSpan={9} style={{ padding: 14, color: T.muted, fontFamily: T.fontSans }}>
                  No server activity recorded for this algorithm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export const ServerActivitySummary = ({ analytics, T }) => {
  const summaries = [
    { key: "GBFS", accent: T.blue },
    { key: "PSO", accent: T.purple },
  ].filter(({ key }) => analytics?.server_activity_summary?.[key]);

  if (!summaries.length) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginBottom: 16 }}>
      {summaries.map(({ key, accent }) => (
        <ActivityTable key={key} summary={analytics.server_activity_summary[key]} accent={accent} T={T} />
      ))}
    </div>
  );
};