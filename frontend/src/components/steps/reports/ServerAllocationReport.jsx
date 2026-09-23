import React from "react";
import { Card, Stat } from "../../common";
import { formatServerLabel, getServerCounts } from "../../../utils/serverLabels";

export const ServerAllocationReport = ({ report, T }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
    {report.algorithms.map((algorithm) => {
      const counts = getServerCounts(algorithm.allocation || []);
      const distribution = Object.entries(counts).map(([server, count]) => ({
        server,
        count,
        label: formatServerLabel(server),
      }));

      return (
        <Card key={algorithm.algorithm} title={`${algorithm.algorithm} server allocation`} sub="Tasks selected for each server profile" accent={algorithm.algorithm === "GBFS" ? T.blue : T.purple}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {distribution.length > 0 ? distribution.map(({ server, count, label }) => (
              <Stat key={`${algorithm.algorithm}-${server}`} label={label} value={count} color={distribution.length % 2 === 0 ? "blue" : "purple"} />
            )) : <Stat label="Unassigned" value={0} color="amber" />}
            <Stat label={`${algorithm.algorithm === "PSO" ? "PSO" : "GBFS"} iterations`} value={algorithm.iterations_performed || 0} color="amber" />
          </div>
        </Card>
      );
    })}
  </div>
);
