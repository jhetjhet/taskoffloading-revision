import React, { useCallback, useEffect, useState } from "react";
import { useT } from "../../context/ThemeContext";
import { Badge, Card, GhostBtn, InfoBox, PrimaryBtn, Stat, TableRow, Th } from "../common";
import { AnalyticsDashboard } from "../steps/reports/AnalyticsDashboard";
import { ReportInterpretation } from "../steps/reports/ReportInterpretation";
import { ReportSummary } from "../steps/reports/ReportSummary";
import { ServerAllocationReport } from "../steps/reports/ServerAllocationReport";
import { AlgorithmReportTable } from "../steps/reports/AlgorithmReportTable";

const formatDate = (isoString) => {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case "COMPLETED":
      return <Badge color="green" dot>Completed</Badge>;
    case "RUNNING":
      return <Badge color="blue" dot>Running</Badge>;
    case "FAILED":
      return <Badge color="red" dot>Failed</Badge>;
    case "QUEUED":
      return <Badge color="amber" dot>Queued</Badge>;
    default:
      return <Badge color="dim">{status || "Unknown"}</Badge>;
  }
};

export const SimulationHistory = ({ onStartNewPipeline, onLoadRunToPipeline }) => {
  const T = useT();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [statusCounts, setStatusCounts] = useState({});

  // Selected run for detailed view
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [selectedRunData, setSelectedRunData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const fetchRuns = useCallback(async (requestedPage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/runs?page=${requestedPage}&page_size=10`);
      if (!res.ok) {
        throw new Error(`Failed to fetch runs (HTTP ${res.status})`);
      }
      const data = await res.json();
      setRuns(data.runs || []);
      setPagination(data.pagination || { page: requestedPage, page_size: 10, total: 0, total_pages: 0 });
      setStatusCounts(data.status_counts || {});
      setPage(data.pagination?.page || requestedPage);
    } catch (err) {
      setError(err.message || "Failed to load simulation runs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns(1);
  }, [fetchRuns]);

  const handlePageChange = (nextPage) => {
    if (loading || nextPage < 1 || (pagination.total_pages > 0 && nextPage > pagination.total_pages)) return;
    fetchRuns(nextPage);
  };

  const handleSelectRun = async (runId) => {
    if (selectedRunId === runId) {
      // Toggle close
      setSelectedRunId(null);
      setSelectedRunData(null);
      return;
    }

    setSelectedRunId(runId);
    setLoadingDetail(true);
    setDetailError(null);

    try {
      // Fetch full run details & analytics
      const [runRes, analyticsRes] = await Promise.all([
        fetch(`/api/v1/runs/${runId}`),
        fetch(`/api/v1/runs/${runId}/analytics`).catch(() => null),
      ]);

      if (!runRes.ok) {
        throw new Error(`Failed to load run details (HTTP ${runRes.status})`);
      }

      const runDetails = await runRes.json();
      let analyticsData = runDetails.analytics;

      if (analyticsRes && analyticsRes.ok) {
        const analyticsJson = await analyticsRes.json();
        analyticsData = analyticsJson.analytics || analyticsData;
      }

      setSelectedRunData({
        ...runDetails,
        analytics: analyticsData,
      });
    } catch (err) {
      setDetailError(err.message || "Failed to load run analytics");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Compute aggregate stats
  const totalRuns = pagination.total;
  const completedRuns = statusCounts.COMPLETED || 0;
  const failedRuns = statusCounts.FAILED || 0;
  const runningRuns = (statusCounts.RUNNING || 0) + (statusCounts.QUEUED || 0);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>
      {/* Header section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          paddingBottom: 4,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: T.text,
              margin: 0,
              fontFamily: T.fontSans,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>📜</span> Simulation Run History
          </h1>
          <p
            style={{
              color: T.muted,
              fontFamily: T.fontSans,
              fontSize: 14,
              margin: "4px 0 0",
            }}
          >
            Historical records, algorithm metrics, and execution analysis from previous simulation runs.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <GhostBtn onClick={() => fetchRuns(page)} disabled={loading}>
            {loading ? "Refreshing..." : "↻ Refresh"}
          </GhostBtn>
          <PrimaryBtn onClick={onStartNewPipeline}>
            <span>⚡ Start New Simulation</span>
          </PrimaryBtn>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Stat label="Total Runs" value={totalRuns} color="blue" />
        <Stat label="Completed" value={completedRuns} color="green" />
        <Stat label="Failed" value={failedRuns} color="red" />
        <Stat label="Active / Queued" value={runningRuns} color="purple" />
      </div>

      {error && <InfoBox color="red">{error}</InfoBox>}

      {/* Detail Inspection Modal / View */}
      {selectedRunId && (
        <Card
          title={`Run Details: ${selectedRunId.slice(0, 8)}...`}
          sub={
            selectedRunData?.created_at
              ? `Executed at ${formatDate(selectedRunData.created_at)} · Seed: ${selectedRunData.seed || 12345}`
              : "Loading run details..."
          }
          accent={T.green}
          headerRight={
            <div style={{ display: "flex", gap: 8 }}>
              {selectedRunData?.input?.tasks?.length > 0 && onLoadRunToPipeline && (
                <GhostBtn
                  onClick={() => onLoadRunToPipeline(selectedRunData)}
                  title="Load these tasks into Step 1 for re-running"
                >
                  Load into Pipeline
                </GhostBtn>
              )}
              <GhostBtn onClick={() => { setSelectedRunId(null); setSelectedRunData(null); }}>
                Close ✕
              </GhostBtn>
            </div>
          }
        >
          {loadingDetail && (
            <div style={{ padding: "24px 0", textAlign: "center", color: T.muted }}>
              Loading analytics and task telemetry...
            </div>
          )}

          {detailError && <InfoBox color="red">{detailError}</InfoBox>}

          {selectedRunData && !loadingDetail && (
            <div style={{ display: "grid", gap: 16, marginTop: 8 }}>
              {/* Status and summary */}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span>Status:</span>
                {getStatusBadge(selectedRunData.status)}
                <span style={{ marginLeft: 16, color: T.muted, fontSize: 13, fontFamily: T.fontMono }}>
                  Run ID: {selectedRunData.id}
                </span>
              </div>

              {selectedRunData.algorithms?.length > 0 && (
                <ReportSummary report={selectedRunData} />
              )}

              <ReportInterpretation report={selectedRunData} T={T} />

              {selectedRunData.analytics ? (
                <AnalyticsDashboard analytics={selectedRunData.analytics} T={T} />
              ) : (
                <InfoBox color="amber">
                  No comprehensive analytics payload generated for this run yet.
                </InfoBox>
              )}

              {selectedRunData.algorithms?.length > 0 && (
                <>
                  <ServerAllocationReport report={selectedRunData} T={T} />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {selectedRunData.algorithms.map((algorithm) => (
                      <AlgorithmReportTable
                        key={algorithm.algorithm}
                        algorithm={algorithm.algorithm}
                        tasks={algorithm.result?.tasks || []}
                        T={T}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Runs Table */}
      <Card
        title="Recorded Simulations"
        sub="Click 'View Analytics' on any run to inspect detailed metrics, resource utilization, and algorithm comparisons"
        accent={T.blue}
      >
        {runs.length === 0 && !loading ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p style={{ color: T.muted, marginBottom: 12 }}>No simulation runs recorded yet.</p>
            <PrimaryBtn onClick={onStartNewPipeline}>
              Start First Simulation
            </PrimaryBtn>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  minWidth: 720,
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
              <thead>
                <tr>
                  <Th>Status</Th>
                  <Th>Run ID</Th>
                  <Th>Seed</Th>
                  <Th>Started At</Th>
                  <Th>Completed At</Th>
                  <Th style={{ textAlign: "right" }}>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, index) => {
                  const isSelected = selectedRunId === r.id;
                  return (
                    <TableRow
                      key={r.id}
                      isOdd={index % 2 === 1}
                      cells={[
                        <div>{getStatusBadge(r.status)}</div>,
                        <div>
                          <span
                            style={{
                              fontFamily: T.fontMono,
                              fontSize: 13,
                              color: isSelected ? T.green : T.text,
                              fontWeight: isSelected ? 700 : 500,
                            }}
                            title={r.id}
                          >
                            {r.id.slice(0, 8)}...
                          </span>
                        </div>,
                        <div>
                          <span style={{ fontFamily: T.fontMono, fontSize: 13, color: T.muted }}>
                            {r.seed ?? 12345}
                          </span>
                        </div>,
                        <div>
                          <span style={{ fontSize: 13, color: T.muted }}>
                            {formatDate(r.created_at)}
                          </span>
                        </div>,
                        <div>
                          <span style={{ fontSize: 13, color: T.muted }}>
                            {formatDate(r.completed_at)}
                          </span>
                        </div>,
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <GhostBtn
                            onClick={() => handleSelectRun(r.id)}
                            style={{
                              padding: "4px 10px",
                              fontSize: 12,
                              background: isSelected ? T.elevated : "transparent",
                              borderColor: isSelected ? T.green : T.border,
                            }}
                          >
                            {isSelected ? "Hide Report ▲" : "View Analytics ▼"}
                          </GhostBtn>
                        </div>,
                      ]}
                    />
                  );
                })}
              </tbody>
              </table>
            </div>
            {pagination.total_pages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 14,
                }}
              >
                <span style={{ color: T.muted, fontSize: 13, fontFamily: T.fontMono }}>
                  Page {pagination.page} of {pagination.total_pages} · {pagination.total} runs
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <GhostBtn
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={loading || !pagination.has_previous}
                  >
                    Previous
                  </GhostBtn>
                  <GhostBtn
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={loading || !pagination.has_next}
                  >
                    Next
                  </GhostBtn>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

