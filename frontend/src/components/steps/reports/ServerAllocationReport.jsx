import React from "react";
import { Card, Stat } from "../../common";

export const ServerAllocationReport = ({ report, T }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
    {report.algorithms.map((algorithm) => {
      const edge = algorithm.allocation.filter((server) => server === "SERVER_A").length;
      const cloud = algorithm.allocation.filter((server) => server === "SERVER_B").length;
      return (
        <Card key={algorithm.algorithm} title={`${algorithm.algorithm} server allocation`} sub="Tasks selected for each server profile" accent={algorithm.algorithm === "GBFS" ? T.blue : T.purple}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Stat label="Edge / Server A" value={edge} color="blue" />
            <Stat label="Cloud / Server B" value={cloud} color="purple" />
            <Stat label="PSO iterations" value={algorithm.iterations_performed || 0} color="amber" />
          </div>
        </Card>
      );
    })}
  </div>
);
