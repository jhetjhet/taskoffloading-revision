import { resolveServer } from "../config/constants";

/* ───────────────────────────────────────────────
   REAL ALGORITHM COMPUTATION (GBFS + PSO)
   ── physics-based Chapter-3 algorithm ──
─────────────────────────────────────────────── */

/**
 * SECTION 1 — THESIS SYSTEM CONSTANTS (per the revision guide).
 */
export const P_EDGE = 20;     // MB/s — Edge processing speed
export const P_CLOUD = 50;    // MB/s — Cloud processing speed
export const N_EDGE = 0.05;   // s — fixed Edge network latency (50ms)
export const N_CLOUD = 0.12;  // s — fixed Cloud network latency (120ms)
export const BANDWIDTH = 100; // MB/s — shared transmission bandwidth
export const CAPACITY_EDGE = 500;   // MB — Edge resource capacity
export const CAPACITY_CLOUD = 2000; // MB — Cloud resource capacity

/**
 * THEORETICAL DECISION BOUNDARY (MB) — DISPLAY ONLY, never used to decide.
 * Derived from S/20 + S/100 + 0.05 = S/50 + S/100 + 0.12  →  S = 2.33 MB
 */
export const GBFS_THRESHOLD = 2.33;

/** Fixed seed so PSO produces the same sequence/result on every run. */
export const RANDOM_SEED = 12345;

/* SECTION 2 — seeded RNG (LCG), so PSO is reproducible run to run. */
export class SeededRandom {
  constructor(seed) { this.seed = seed; }
  next() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  nextInt(max) { return Math.floor(this.next() * max); }
  nextFloat(min, max) { return min + this.next() * (max - min); }
}

/* SECTION 3 — server physics profiles. */
export const SERVER_PROFILES = {
  A: { label: "Edge Server A", speed: P_EDGE, networkLatency: N_EDGE, capacity: CAPACITY_EDGE, energyCoefficient: 0.08, baseEnergy: 0.5, baseUtilization: 15 },
  B: { label: "Cloud Server B", speed: P_CLOUD, networkLatency: N_CLOUD, capacity: CAPACITY_CLOUD, energyCoefficient: 0.03, baseEnergy: 0.3, baseUtilization: 10 },
};

/**
 * SECTION 4/5 — evaluate one task against one server given that server's
 * CURRENT cumulative load (currentLoadMB), using the real latency formula:
 * Total = Processing + Transmission + Network + Queue.
 */
export const evaluateCandidate = (task, profile, currentLoadMB = 0) => {
  const taskSize = task.taskSize || 0;
  const queueLength = task.queueLength || 0;
  const newLoadMB = currentLoadMB + taskSize;

  // Capacity constraint (Chapter 3): a server can't be assigned a task
  // that would exceed its resource capacity.
  if (newLoadMB > profile.capacity) {
    return {
      time: 999999, latency: 999999, utilization: 100, energy: 999.99, throughput: 0,
      queueLength, networkDelay: 999999, queueDelay: 999999, resourceAvailability: 0, heuristicScore: 999999,
      capacityExceeded: true,
    };
  }

  const processingTimeMs = (taskSize / profile.speed) * 1000;
  const transmissionTimeMs = (taskSize / BANDWIDTH) * 1000;
  const networkLatencyMs = profile.networkLatency * 1000;
  const networkDelay = +(transmissionTimeMs + networkLatencyMs).toFixed(2);

  const loadPercentage = (newLoadMB / profile.capacity) * 100;
  const utilization = +Math.min(100, profile.baseUtilization + loadPercentage * 0.8).toFixed(1);
  const queueDelay = +(queueLength * 2 + utilization * 0.05).toFixed(2);

  const time = +processingTimeMs.toFixed(2);
  const latency = +(time + networkDelay + queueDelay).toFixed(2);
  const energy = +(profile.baseEnergy + taskSize * profile.energyCoefficient).toFixed(2);
  const baseThroughput = task.throughput || 20;
  const throughput = +(baseThroughput * (1 - (utilization / 100) * 0.3)).toFixed(1);
  const resourceAvailability = +(100 - utilization).toFixed(1);
  const heuristicScore = +(networkDelay * 0.35 + time * 0.3 + queueDelay * 0.2 + utilization * 0.15).toFixed(2);

  return { time, latency, utilization, energy, throughput, queueLength, networkDelay, queueDelay, resourceAvailability, heuristicScore, capacityExceeded: false };
};

/**
 * Evaluates ONE full allocation vector end to end and returns the batch's AVERAGE metrics.
 */
export const evaluateAllocationBatch = (tasks, allocation) => {
  let edgeLoadMB = 0, cloudLoadMB = 0;
  const sums = { latency: 0, time: 0, utilization: 0, energy: 0, throughput: 0, networkDelay: 0, queueDelay: 0 };
  let feasible = true;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const toEdge = allocation[i] === 0;
    const profile = toEdge ? SERVER_PROFILES.A : SERVER_PROFILES.B;
    const currentLoad = toEdge ? edgeLoadMB : cloudLoadMB;
    const result = evaluateCandidate(task, profile, currentLoad);
    if (result.capacityExceeded) { feasible = false; break; }
    if (toEdge) edgeLoadMB += task.taskSize; else cloudLoadMB += task.taskSize;
    sums.latency += result.latency; sums.time += result.time; sums.utilization += result.utilization;
    sums.energy += result.energy; sums.throughput += result.throughput;
    sums.networkDelay += result.networkDelay; sums.queueDelay += result.queueDelay;
  }

  if (!feasible) {
    return { feasible: false, latency: 999999, time: 999999, utilization: 100, energy: 999.99, throughput: 0, networkDelay: 999999, queueDelay: 999999, resourceAvailability: 0, heuristicScore: 999999, edgeTasks: 0, cloudTasks: 0, edgeLoadMB: 0, cloudLoadMB: 0, loadBalanceScore: 0 };
  }

  const n = tasks.length;
  const avg = (k) => +(sums[k] / n).toFixed(2);
  const utilization = avg("utilization");
  const totalLoad = edgeLoadMB + cloudLoadMB || 0.1;

  return {
    feasible: true,
    latency: avg("latency"), time: avg("time"), utilization, energy: avg("energy"), throughput: avg("throughput"),
    networkDelay: avg("networkDelay"), queueDelay: avg("queueDelay"), resourceAvailability: +(100 - utilization).toFixed(1),
    heuristicScore: +(avg("networkDelay") * 0.35 + avg("time") * 0.3 + avg("queueDelay") * 0.2 + utilization * 0.15).toFixed(2),
    edgeTasks: allocation.filter((a) => a === 0).length, cloudTasks: allocation.filter((a) => a === 1).length,
    edgeLoadMB: +edgeLoadMB.toFixed(1), cloudLoadMB: +cloudLoadMB.toFixed(1),
    loadBalanceScore: +(100 * (1 - Math.abs(edgeLoadMB - cloudLoadMB) / totalLoad)).toFixed(1),
  };
};

/**
 * SECTION 6 — GBFS: sequential greedy allocation across the WHOLE task batch.
 */
export const computeGBFS = (tasks) => {
  let edgeLoadMB = 0, cloudLoadMB = 0;
  const sums = { latency: 0, time: 0, utilization: 0, energy: 0, throughput: 0 };
  let edgeTaskCount = 0, cloudTaskCount = 0;
  const allocation = [];
  const allocationDetails = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const edgeResult = evaluateCandidate(task, SERVER_PROFILES.A, edgeLoadMB);
    const cloudResult = evaluateCandidate(task, SERVER_PROFILES.B, cloudLoadMB);

    let selectedServerKey, selected, selectionReason;
    if (edgeResult.capacityExceeded && !cloudResult.capacityExceeded) {
      selectedServerKey = "B"; selected = cloudResult;
      selectionReason = "Edge capacity would be exceeded — Cloud is the only feasible candidate.";
    } else if (!edgeResult.capacityExceeded && cloudResult.capacityExceeded) {
      selectedServerKey = "A"; selected = edgeResult;
      selectionReason = "Cloud capacity would be exceeded — Edge is the only feasible candidate.";
    } else if (edgeResult.capacityExceeded && cloudResult.capacityExceeded) {
      selectedServerKey = "B"; selected = cloudResult;
      selectionReason = "Both servers are at capacity — dispatched to Cloud regardless as a fallback.";
    } else {
      selectedServerKey = edgeResult.latency <= cloudResult.latency ? "A" : "B";
      selected = selectedServerKey === "A" ? edgeResult : cloudResult;
      selectionReason = `Both feasible — ${resolveServer(selectedServerKey).label} has the lower computed latency (${selected.latency} ms vs ${(selectedServerKey === "A" ? cloudResult : edgeResult).latency} ms).`;
    }

    const edgeLoadBefore = edgeLoadMB, cloudLoadBefore = cloudLoadMB;
    if (selectedServerKey === "A") { edgeLoadMB += task.taskSize; edgeTaskCount++; }
    else { cloudLoadMB += task.taskSize; cloudTaskCount++; }

    sums.latency += selected.latency; sums.time += selected.time; sums.utilization += selected.utilization;
    sums.energy += selected.energy; sums.throughput += selected.throughput;
    allocation.push(selectedServerKey === "A" ? 0 : 1);

    allocationDetails.push({
      taskIndex: i + 1, taskSize: task.taskSize,
      edgeEval: edgeResult, cloudEval: cloudResult,
      selectedServerKey, selectedServerLabel: resolveServer(selectedServerKey).label, selectionReason,
      latencyMs: selected.latency, utilization: selected.utilization, energy: selected.energy,
      edgeLoadBefore: +edgeLoadBefore.toFixed(1), edgeLoadAfter: +edgeLoadMB.toFixed(1),
      cloudLoadBefore: +cloudLoadBefore.toFixed(1), cloudLoadAfter: +cloudLoadMB.toFixed(1),
    });
  }

  const n = tasks.length;
  const avg = (k) => +(sums[k] / n).toFixed(2);
  const utilization = avg("utilization");
  const totalLoad = edgeLoadMB + cloudLoadMB || 0.1;
  const loadBalanceScore = +(100 * (1 - Math.abs(edgeLoadMB - cloudLoadMB) / totalLoad)).toFixed(1);

  // Reference extremes for the execution-panel comparison table.
  const A = evaluateAllocationBatch(tasks, Array.from({ length: n }, () => 0));
  const B = evaluateAllocationBatch(tasks, Array.from({ length: n }, () => 1));
  const recommendedServer = edgeTaskCount >= cloudTaskCount ? "A" : "B"; // majority — display only

  return {
    candidates: { A, B },
    allocation, allocationDetails,
    recommendedServer,
    latency: avg("latency"), time: avg("time"), utilization, energy: avg("energy"), throughput: avg("throughput"),
    edgeTasks: edgeTaskCount, cloudTasks: cloudTaskCount,
    edgeLoadMB: +edgeLoadMB.toFixed(1), cloudLoadMB: +cloudLoadMB.toFixed(1),
    loadBalanceScore, taskCount: n,
    decisionReason: `GBFS evaluated each of the ${n} tasks sequentially against the running Edge/Cloud load — ${edgeTaskCount} tasks (${(edgeTaskCount / n * 100).toFixed(1)}%) went to Edge Server A, ${cloudTaskCount} (${(cloudTaskCount / n * 100).toFixed(1)}%) to Cloud Server B. Average latency ${avg("latency")} ms across the batch, vs ${A.latency} ms if the whole batch went to Edge or ${B.latency} ms if it all went to Cloud.`,
  };
};

/**
 * SECTION 7/8 — fitness of one full allocation vector.
 */
export const calculateFitnessBatch = (tasks, allocation, refMin, refMax) => {
  const result = evaluateAllocationBatch(tasks, allocation);
  if (!result.feasible) return { fitness: -1, feasible: false, result };
  const range = refMax - refMin || 1;
  const normalizedLatency = Math.min(1, Math.max(0, (result.latency - refMin) / range));
  return { fitness: +(1 - normalizedLatency).toFixed(4), feasible: true, result };
};

/**
 * SECTION 9 — real binary PSO searching the WHOLE task batch at once.
 */
export const computePSO = (tasks, iterations = 40, popSize = 2) => {
  const random = new SeededRandom(RANDOM_SEED);
  const n = tasks.length;
  const w = 0.7, c1 = 1.5, c2 = 1.5, vMax = 0.5;

  const edgeRef = evaluateAllocationBatch(tasks, Array.from({ length: n }, () => 0));
  const cloudRef = evaluateAllocationBatch(tasks, Array.from({ length: n }, () => 1));
  const refs = [edgeRef, cloudRef].filter((r) => r.feasible);

  if (refs.length === 0) {
    return {
      feasible: false, candidates: { A: edgeRef, B: cloudRef }, recommendedServer: "B",
      latency: 999999, time: 999999, utilization: 100, energy: 999.99, throughput: 0,
      edgeTasks: 0, cloudTasks: n, loadBalanceScore: 0, iterations: [],
      decisionReason: "PSO could not initialize: no feasible reference allocation exists for this batch.",
    };
  }
  const latencies = refs.map((r) => r.latency);
  const refMin = Math.min(...latencies), refMax = Math.max(...latencies);

  let particles = Array.from({ length: popSize }, () => {
    const position = Array.from({ length: n }, () => random.nextInt(2));
    const velocity = Array.from({ length: n }, () => random.nextFloat(-0.2, 0.2));
    const fr = calculateFitnessBatch(tasks, position, refMin, refMax);
    return { position, velocity, pBest: [...position], pBestFitness: fr.fitness, fitness: fr.fitness, feasible: fr.feasible, result: fr.result };
  });

  let globalBest = null, globalBestFitness = -Infinity;
  particles.forEach((p) => { if (p.feasible && p.fitness > globalBestFitness) { globalBestFitness = p.fitness; globalBest = { position: [...p.position], fitness: p.fitness, result: p.result }; } });
  if (!globalBest) globalBest = { position: Array.from({ length: n }, () => 1), fitness: 0, result: cloudRef };

  const cloudFraction = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const log = [];
  let noImprovementCount = 0;
  const CONVERGENCE_THRESHOLD = 15;
  let iterationsCompleted = 0;

  for (let it = 1; it <= iterations; it++) {
    iterationsCompleted = it;
    let improved = false;

    particles = particles.map((particle) => {
      const newVelocity = particle.position.map((pos, d) => {
        const r1 = random.next(), r2 = random.next();
        const cognitive = c1 * r1 * (particle.pBest[d] - pos);
        const social = c2 * r2 * (globalBest.position[d] - pos);
        return Math.min(vMax, Math.max(-vMax, particle.velocity[d] * w + cognitive + social));
      });
      const newPosition = newVelocity.map((v) => (random.next() < 1 / (1 + Math.exp(-v)) ? 1 : 0));
      const fr = calculateFitnessBatch(tasks, newPosition, refMin, refMax);
      let pBest = particle.pBest, pBestFitness = particle.pBestFitness;
      if (fr.feasible && fr.fitness > pBestFitness) { pBest = newPosition; pBestFitness = fr.fitness; improved = true; }
      return { position: newPosition, velocity: newVelocity, pBest, pBestFitness, fitness: fr.fitness, feasible: fr.feasible, result: fr.result };
    });

    particles.forEach((p) => { if (p.feasible && p.fitness > globalBestFitness) { globalBestFitness = p.fitness; globalBest = { position: [...p.position], fitness: p.fitness, result: p.result }; improved = true; } });

    noImprovementCount = improved ? 0 : noImprovementCount + 1;
    const converged = noImprovementCount >= CONVERGENCE_THRESHOLD;

    if (it % 4 === 0 || it === 1 || it === iterations || converged) {
      const p0 = particles[0], p1 = particles[popSize > 1 ? 1 : 0];
      log.push({
        iteration: it,
        particleA: { x: +cloudFraction(p0.position).toFixed(3), fitness: +p0.fitness.toFixed(4), latency: p0.result.latency, time: p0.result.time, utilization: p0.result.utilization, energy: p0.result.energy, throughput: p0.result.throughput },
        particleB: { x: +cloudFraction(p1.position).toFixed(3), fitness: +p1.fitness.toFixed(4), latency: p1.result.latency, time: p1.result.time, utilization: p1.result.utilization, energy: p1.result.energy, throughput: p1.result.throughput },
        bestFitness: +globalBestFitness.toFixed(4),
        bestX: +cloudFraction(globalBest.position).toFixed(3),
      });
    }
    if (converged) break;
  }

  const official = globalBest.result;
  const recommendedServer = official.edgeTasks >= official.cloudTasks ? "A" : "B"; // majority — display only

  return {
    feasible: true, allocation: globalBest.position, iterationsPerformed: iterationsCompleted,
    candidates: { A: edgeRef, B: cloudRef },
    recommendedServer,
    latency: official.latency, time: official.time, utilization: official.utilization, energy: official.energy, throughput: official.throughput,
    edgeTasks: official.edgeTasks, cloudTasks: official.cloudTasks, edgeLoadMB: official.edgeLoadMB, cloudLoadMB: official.cloudLoadMB,
    loadBalanceScore: official.loadBalanceScore, iterations: log,
    decisionReason: `Binary PSO (seed ${RANDOM_SEED}, ${popSize} particles) searched ${iterationsCompleted} iterations over the ${n}-task batch and settled on ${official.edgeTasks} tasks to Edge, ${official.cloudTasks} to Cloud — average latency ${official.latency} ms (fitness ${globalBestFitness.toFixed(4)}).`,
  };
};

/**
 * Estimates memory/storage/queue for an algorithm's run by scaling the
 * machine's own baseline readings by how its CPU utilization compares.
 */
export const deriveAuxMetrics = (m, algoUtil) => {
  const baseCpu = +m?.cpuUtilization || algoUtil || 1;
  const scale = baseCpu ? algoUtil / baseCpu : 1;
  return {
    memory: +((m?.memoryUsage ?? 0) * scale).toFixed(2),
    storage: Math.round((m?.storageUsage ?? m?.taskSize ?? 0) * scale),
    queue: Math.max(0, Math.round((m?.queueLength ?? 0) * scale)),
  };
};

