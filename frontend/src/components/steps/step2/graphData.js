const GBFS_GRAPH_STEPS = ["Input", "Candidates", "Heuristic", "Comparison", "Decision"];

export const buildGbfsGraphData = (metrics, simulation, stage) => {
  const candidates = Object.values(simulation?.candidates || {});
  const baseline = metrics?.avgLatency != null
    ? Number(metrics.avgLatency)
    : candidates[0]?.latency_ms ?? candidates[0]?.latency ?? 100;
  if (!simulation) return GBFS_GRAPH_STEPS.map((step) => ({ step, value: baseline }));

  const candidateLatencies = candidates.map((candidate) => Number(candidate.latency_ms ?? candidate.latency ?? baseline));
  const bestCandidate = candidateLatencies.length ? Math.min(...candidateLatencies) : baseline;
  const values = [baseline, baseline, ...candidateLatencies, bestCandidate, Number(simulation.latency ?? bestCandidate)];
  const count = Math.max(1, Math.min(GBFS_GRAPH_STEPS.length, stage + 1));
  return GBFS_GRAPH_STEPS.slice(0, count).map((step, index) => ({ step, value: values[index] ?? bestCandidate }));
};

export const buildPsoGraphData = (metrics, simulation, iteration) => {
  const baseline = metrics?.avgLatency != null ? Number(metrics.avgLatency) : 100;
  if (!simulation) return Array.from({ length: 4 }, (_, index) => ({ step: `Iter ${index + 1}`, value: baseline }));

  let running = Infinity;
  const points = [];
  for (let index = 0; index < iteration && index < (simulation.iterations || []).length; index += 1) {
    const row = simulation.iterations[index];
    const fitnesses = (row.particles || []).map((particle) => Number(particle.fitness)).filter(Number.isFinite);
    const best = Number(row.best_fitness ?? (fitnesses.length ? Math.min(...fitnesses) : baseline));
    running = Math.min(running, best);
    points.push({ step: `Iter ${row.iteration ?? index + 1}`, value: Number(running.toFixed(2)) });
  }
  if (!points.length) points.push({ step: "Iter 1", value: baseline });
  return points;
};