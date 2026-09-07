import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList,
} from "recharts";

/* ════════════════════════════════════════════════════════════
   THEME (unchanged from previous build)
   ════════════════════════════════════════════════════════════ */
const makeTheme = (dark) =>
  dark
    ? {
        bg: "#0f1117", surface: "#1a1d27", elevated: "#22263a",
        border: "#2e3347", borderSub: "#1e2235", text: "#e8eaf0",
        muted: "#8b90a7", dim: "#4a5070",
        blue: "#60a5fa", blueDim: "#1d3a6e", blueBg: "#0d1f3c",
        green: "#34d399", greenDim: "#064e3b", greenBg: "#022c22",
        purple: "#a78bfa", purpleDim: "#3b1fa8", purpleBg: "#1e0a4a",
        amber: "#fbbf24", amberBg: "#292100",
        red: "#f87171", redBg: "#2d0a0a",
        fontMono: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
        fontSans: "'Inter',system-ui,-apple-system,sans-serif",
      }
    : {
        bg: "#eef0f5", surface: "#ffffff", elevated: "#f4f6fb",
        border: "#c8cdd8", borderSub: "#dde0ea", text: "#111827",
        muted: "#4b5563", dim: "#9ca3af",
        blue: "#1d4ed8", blueDim: "#bfdbfe", blueBg: "#dbeafe",
        green: "#065f46", greenDim: "#6ee7b7", greenBg: "#d1fae5",
        purple: "#5b21b6", purpleDim: "#c4b5fd", purpleBg: "#ede9fe",
        amber: "#92400e", amberBg: "#fef3c7",
        red: "#991b1b", redBg: "#fee2e2",
        fontMono: "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
        fontSans: "'Inter',system-ui,-apple-system,sans-serif",
      };

const ThemeCtx = React.createContext(makeTheme(true));
const useT = () => React.useContext(ThemeCtx);

/* ════════════════════════════════════════════════════════════
   API / UI SERVER CONFIG  — display + networking layer only.
   (The physics used by the algorithms lives in SERVER_PROFILES
   further below, per the revision guide's separation of concerns.)
   ════════════════════════════════════════════════════════════ */
const SERVERS = {
  A: { label: "Edge Server A", sub: "Latency-Sensitive · Compute-Heavy", icon: "⚡", baseUrl: "https://system-ctld.onrender.com/api" },
  B: { label: "Cloud Server B", sub: "Energy-Efficient · Cloud-Hosted", icon: "☁️", baseUrl: "https://system-1-rcpl.onrender.com/api" },
};
const PRIMARY_BASE = SERVERS.A.baseUrl;
const resolveServer = (key) => SERVERS[key] ?? SERVERS.A;
const HISTORY_STORAGE_KEY = "edgeOffloadSim.history.v2";

const STEPS = [
  { title: "Select Machine", short: "Machine" },
  { title: "Generate Task Batch", short: "Tasks" },
  { title: "Run GBFS + PSO", short: "Run" },
  { title: "Display Results", short: "Results" },
];
const PIPELINE_STAGES = ["Data", "Task Batch", "GBFS + PSO", "Allocation", "Completed", "Results"];

const derivePipelineStage = ({ machine, tasks, algoRunning, gbfsData, psoData, offloadResult, step }) => {
  if (!machine) return 0;
  if (!tasks?.length) return 1;
  if (algoRunning) return 2;
  if (gbfsData && psoData) {
    if (offloadResult) return step === 3 ? 5 : 4;
    return 3;
  }
  return 1;
};

/* ════════════════════════════════════════════════════════════
   SECTION 1 — THESIS SYSTEM CONSTANTS (per revision guide)
   ════════════════════════════════════════════════════════════ */
const P_EDGE = 20;     // MB/s — Edge processing speed
const P_CLOUD = 50;    // MB/s — Cloud processing speed
const N_EDGE = 0.05;   // s — fixed Edge network latency (50ms)
const N_CLOUD = 0.12;  // s — fixed Cloud network latency (120ms)
const BANDWIDTH = 100; // MB/s — global transmission bandwidth
const CAPACITY_EDGE = 500;   // MB — Edge resource capacity
const CAPACITY_CLOUD = 2000; // MB — Cloud resource capacity

/**
 * THEORETICAL DECISION BOUNDARY (MB) — DISPLAY ONLY, never used to decide.
 * Derived from S/20 + S/100 + 0.05 = S/50 + S/100 + 0.12  →  S = 2.33 MB
 */
const GBFS_THRESHOLD = 2.33;

/** Fixed seed so PSO produces the same sequence/result every run. */
const RANDOM_SEED = 12345;

/* ════════════════════════════════════════════════════════════
   SECTION 2 — SEEDED RANDOM GENERATOR
   ════════════════════════════════════════════════════════════ */
class SeededRandom {
  constructor(seed) { this.seed = seed; }
  next() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  nextInt(max) { return Math.floor(this.next() * max); }
  nextFloat(min, max) { return min + this.next() * (max - min); }
}

/* ════════════════════════════════════════════════════════════
   SECTION 3 — SERVER PROFILES (compute-side physics)
   ════════════════════════════════════════════════════════════ */
const SERVER_PROFILES = {
  A: { label: "Edge Server A", speed: P_EDGE, networkLatency: N_EDGE, capacity: CAPACITY_EDGE, energyCoefficient: 0.08, baseEnergy: 0.5, baseUtilization: 15 },
  B: { label: "Cloud Server B", speed: P_CLOUD, networkLatency: N_CLOUD, capacity: CAPACITY_CLOUD, energyCoefficient: 0.03, baseEnergy: 0.3, baseUtilization: 10 },
};

/* ════════════════════════════════════════════════════════════
   SECTION 4 — LATENCY COMPUTATION
   Total = Processing + Transmission + Network + Queue Delay
   ════════════════════════════════════════════════════════════ */
const computeLatency = (taskSize, speed, networkLatency, queueLength = 0, utilization = 0) => {
  const processingTime = taskSize / speed;
  const transmissionTime = taskSize / BANDWIDTH;
  const queueDelay = queueLength * 0.002 + (utilization / 100) * 0.005;
  const totalLatency = processingTime + transmissionTime + networkLatency + queueDelay;
  return {
    processingTime: +processingTime.toFixed(3),
    transmissionTime: +transmissionTime.toFixed(3),
    networkLatency: +networkLatency.toFixed(3),
    queueDelay: +queueDelay.toFixed(3),
    totalLatency: +totalLatency.toFixed(3),
    totalLatencyMs: +(totalLatency * 1000).toFixed(2),
  };
};

/* ════════════════════════════════════════════════════════════
   SECTION 5 — EVALUATE CANDIDATE (one task × one server × current load)
   ════════════════════════════════════════════════════════════ */
const evaluateCandidate = (task, profile, currentLoadMB = 0) => {
  const taskSize = task.taskSize || 0;
  const queueLength = task.queueLength || 0;
  const newLoadMB = currentLoadMB + taskSize;
  const isFeasible = newLoadMB <= profile.capacity;

  if (!isFeasible) {
    return {
      feasible: false, capacityExceeded: true,
      latency: 999.999, latencyMs: 999999, utilization: 100, energy: 999.99, throughput: 0,
      taskSize, serverLabel: profile.label, currentLoadMB, newLoadMB, capacity: profile.capacity,
    };
  }

  const loadPercentage = (newLoadMB / profile.capacity) * 100;
  const utilization = +Math.min(100, profile.baseUtilization + loadPercentage * 0.8).toFixed(1);
  const energy = +(profile.baseEnergy + taskSize * profile.energyCoefficient).toFixed(2);
  const baseThroughput = task.throughput || 20;
  const throughput = +(baseThroughput * (1 - (utilization / 100) * 0.3)).toFixed(1);
  const resourceAvailability = +(100 - utilization).toFixed(1);
  const lat = computeLatency(taskSize, profile.speed, profile.networkLatency, queueLength, utilization);

  return {
    feasible: true, capacityExceeded: false,
    latency: lat.totalLatency, latencyMs: lat.totalLatencyMs,
    processingTime: lat.processingTime, transmissionTime: lat.transmissionTime,
    networkLatency: lat.networkLatency, queueDelay: lat.queueDelay,
    taskSize, serverLabel: profile.label, serverSpeed: profile.speed, serverCapacity: profile.capacity,
    utilization, energy, throughput, resourceAvailability,
    loadPercentage: +loadPercentage.toFixed(1), currentLoadMB, newLoadMB: +newLoadMB.toFixed(1),
  };
};

/* ════════════════════════════════════════════════════════════
   SECTION 6 — GBFS: sequential greedy allocation across the task batch
   ════════════════════════════════════════════════════════════ */
const computeGBFS = (tasks) => {
  let edgeLoadMB = 0, cloudLoadMB = 0;
  let totalLatency = 0, totalEnergy = 0, totalUtilization = 0;
  let edgeTaskCount = 0, cloudTaskCount = 0;
  const allocationDetails = [];
  const allocation = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const edgeResult = evaluateCandidate(task, SERVER_PROFILES.A, edgeLoadMB);
    const cloudResult = evaluateCandidate(task, SERVER_PROFILES.B, cloudLoadMB);
    const edgeFeasible = edgeResult.feasible;
    const cloudFeasible = cloudResult.feasible;

    let selectedServerKey, selected, selectionReason;
    if (!edgeFeasible && cloudFeasible) {
      selectedServerKey = "B"; selected = cloudResult;
      selectionReason = "Edge capacity would be exceeded — Cloud is the only feasible candidate.";
    } else if (edgeFeasible && !cloudFeasible) {
      selectedServerKey = "A"; selected = edgeResult;
      selectionReason = "Cloud capacity would be exceeded — Edge is the only feasible candidate.";
    } else if (!edgeFeasible && !cloudFeasible) {
      return { feasible: false, error: `No feasible server for Task ${i + 1}`, allocation, allocationDetails };
    } else {
      selectedServerKey = edgeResult.latency <= cloudResult.latency ? "A" : "B";
      selected = selectedServerKey === "A" ? edgeResult : cloudResult;
      selectionReason = `Both feasible — ${resolveServer(selectedServerKey).label} has the lower computed latency (${selected.latencyMs} ms vs ${(selectedServerKey === "A" ? cloudResult : edgeResult).latencyMs} ms).`;
    }

    const edgeLoadBefore = edgeLoadMB, cloudLoadBefore = cloudLoadMB;
    if (selectedServerKey === "A") { edgeLoadMB += task.taskSize; edgeTaskCount++; }
    else { cloudLoadMB += task.taskSize; cloudTaskCount++; }

    totalLatency += selected.latency;
    totalEnergy += selected.energy;
    totalUtilization += selected.utilization;
    allocation.push(selectedServerKey === "A" ? 0 : 1);

    allocationDetails.push({
      taskIndex: i + 1, taskSize: task.taskSize,
      edgeEval: edgeResult, cloudEval: cloudResult,
      selectedServerKey, selectedServerLabel: resolveServer(selectedServerKey).label,
      selectionReason,
      latencyMs: selected.latencyMs, utilization: selected.utilization, energy: selected.energy,
      edgeLoadBefore: +edgeLoadBefore.toFixed(1), edgeLoadAfter: +edgeLoadMB.toFixed(1),
      cloudLoadBefore: +cloudLoadBefore.toFixed(1), cloudLoadAfter: +cloudLoadMB.toFixed(1),
    });
  }

  const n = tasks.length;
  const avgLatency = totalLatency / n;
  const avgEnergy = totalEnergy / n;
  const avgUtilization = totalUtilization / n;
  const totalLoad = edgeLoadMB + cloudLoadMB || 0.1;
  const loadBalanceScore = +(100 * (1 - Math.abs(edgeLoadMB - cloudLoadMB) / totalLoad)).toFixed(1);

  const firstTaskSize = tasks[0]?.taskSize || 0;
  const boundaryExplanation = firstTaskSize < GBFS_THRESHOLD
    ? `Theoretical: ${firstTaskSize}MB < ${GBFS_THRESHOLD}MB boundary → Edge mathematically favored`
    : `Theoretical: ${firstTaskSize}MB > ${GBFS_THRESHOLD}MB boundary → Cloud mathematically favored`;

  return {
    feasible: true, allocation, allocationDetails,
    totalLatency: +totalLatency.toFixed(3), avgLatency: +avgLatency.toFixed(3), avgLatencyMs: +(avgLatency * 1000).toFixed(2),
    totalEnergy: +totalEnergy.toFixed(2), avgEnergy: +avgEnergy.toFixed(2), avgUtilization: +avgUtilization.toFixed(1),
    loadBalanceScore, edgeTasks: edgeTaskCount, cloudTasks: cloudTaskCount,
    edgeLoadMB: +edgeLoadMB.toFixed(1), cloudLoadMB: +cloudLoadMB.toFixed(1),
    taskCount: n, theoreticalBoundary: GBFS_THRESHOLD, boundaryExplanation,
    allocationSummary: {
      edgeTasks: edgeTaskCount, cloudTasks: cloudTaskCount,
      edgePercentage: +((edgeTaskCount / n) * 100).toFixed(1), cloudPercentage: +((cloudTaskCount / n) * 100).toFixed(1),
    },
    decisionReason: `GBFS processed ${n} tasks sequentially — ${edgeTaskCount} (${(edgeTaskCount / n * 100).toFixed(1)}%) to Edge, ${cloudTaskCount} (${(cloudTaskCount / n * 100).toFixed(1)}%) to Cloud. Avg latency ${(avgLatency * 1000).toFixed(2)} ms, energy ${avgEnergy.toFixed(2)} J, utilization ${avgUtilization.toFixed(1)}%, load balance ${loadBalanceScore.toFixed(1)}%.`,
  };
};

/* ════════════════════════════════════════════════════════════
   SECTION 7 — EVALUATE ALLOCATION (PSO helper: score one full assignment)
   ════════════════════════════════════════════════════════════ */
const evaluateAllocation = (tasks, allocation) => {
  let edgeLoadMB = 0, cloudLoadMB = 0;
  let totalLatency = 0, totalEnergy = 0, totalUtilization = 0;
  let feasible = true, infeasibleReason = null;
  const taskResults = [];

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const toEdge = allocation[i] === 0;
    const profile = toEdge ? SERVER_PROFILES.A : SERVER_PROFILES.B;
    const currentLoad = toEdge ? edgeLoadMB : cloudLoadMB;
    const result = evaluateCandidate(task, profile, currentLoad);
    if (!result.feasible) { feasible = false; infeasibleReason = `Task ${i + 1} (${task.taskSize}MB) exceeds ${profile.label} capacity`; break; }
    if (toEdge) edgeLoadMB += task.taskSize; else cloudLoadMB += task.taskSize;
    totalLatency += result.latency; totalEnergy += result.energy; totalUtilization += result.utilization;
    taskResults.push({ taskIndex: i, taskSize: task.taskSize, assignedTo: toEdge ? "Edge" : "Cloud", latencyMs: result.latencyMs, utilization: result.utilization, energy: result.energy });
  }

  if (!feasible) {
    return { feasible: false, infeasibleReason, totalLatency: 999.999, avgLatency: 999.999, avgLatencyMs: 999999, avgEnergy: 999.99, avgUtilization: 100, loadBalanceScore: 0, edgeTasks: 0, cloudTasks: 0, edgeLoadMB: 0, cloudLoadMB: 0, taskResults: [] };
  }

  const avgLatency = totalLatency / tasks.length;
  const avgEnergy = totalEnergy / tasks.length;
  const avgUtilization = totalUtilization / tasks.length;
  const totalLoad = edgeLoadMB + cloudLoadMB || 0.1;
  const loadBalanceScore = +(100 * (1 - Math.abs(edgeLoadMB - cloudLoadMB) / totalLoad)).toFixed(1);

  return {
    feasible: true, infeasibleReason: null,
    totalLatency: +totalLatency.toFixed(3), avgLatency: +avgLatency.toFixed(3), avgLatencyMs: +(avgLatency * 1000).toFixed(2),
    totalEnergy: +totalEnergy.toFixed(2), avgEnergy: +avgEnergy.toFixed(2), avgUtilization: +avgUtilization.toFixed(1),
    edgeLoadMB: +edgeLoadMB.toFixed(1), cloudLoadMB: +cloudLoadMB.toFixed(1), loadBalanceScore,
    edgeTasks: allocation.filter((x) => x === 0).length, cloudTasks: allocation.filter((x) => x === 1).length,
    taskResults,
  };
};

/* ════════════════════════════════════════════════════════════
   SECTION 8 — PSO FITNESS FUNCTION (minimize avg latency)
   ════════════════════════════════════════════════════════════ */
const calculateFitness = (tasks, allocation, refMin, refMax) => {
  const result = evaluateAllocation(tasks, allocation);
  if (!result.feasible) return { fitness: -1, cost: 1, feasible: false, result };
  const range = refMax - refMin || 1;
  const normalizedLatency = Math.min(1, Math.max(0, (result.avgLatency - refMin) / range));
  const fitness = 1 - normalizedLatency;
  return { fitness: +fitness.toFixed(4), cost: +normalizedLatency.toFixed(4), feasible: true, result };
};

/* ════════════════════════════════════════════════════════════
   SECTION 9 — PSO: binary particle swarm optimization over the batch
   Detailed per-iteration particle snapshots are recorded (sampled) so
   the UI can animate Init → Fitness → Velocity → Position → PBest →
   GBest → Next Iteration → Convergence, per Change 6.
   ════════════════════════════════════════════════════════════ */
const computePSO = (tasks, iterations = 60, popSize = 10) => {
  const random = new SeededRandom(RANDOM_SEED);
  const numTasks = tasks.length;
  const w = 0.7, c1 = 1.5, c2 = 1.5, vMax = 0.5;

  const allEdge = Array.from({ length: numTasks }, () => 0);
  const allCloud = Array.from({ length: numTasks }, () => 1);
  const edgeRef = evaluateAllocation(tasks, allEdge);
  const cloudRef = evaluateAllocation(tasks, allCloud);
  const referenceResults = [edgeRef.feasible ? edgeRef : null, cloudRef.feasible ? cloudRef : null].filter(Boolean);

  if (referenceResults.length === 0) {
    return {
      error: "No feasible reference allocation exists for PSO.", feasible: false,
      allocation: Array.from({ length: numTasks }, () => 1), allocationDetails: [],
      iterationsPerformed: 0, converged: false, bestFitness: 0,
      avgLatencyMs: 999999, avgEnergy: 999.99, avgUtilization: 100, loadBalanceScore: 0,
      edgeTasks: 0, cloudTasks: 0, iterations: [],
      decisionReason: "PSO could not initialize: no feasible reference allocation.",
    };
  }

  const latencies = referenceResults.map((r) => r.avgLatency);
  const refMin = Math.min(...latencies);
  const refMax = Math.max(...latencies);

  let particles = [];
  let globalBest = null, globalBestFitness = -Infinity;

  for (let i = 0; i < popSize; i++) {
    const position = Array.from({ length: numTasks }, () => random.nextInt(2));
    const velocity = Array.from({ length: numTasks }, () => random.nextFloat(-0.2, 0.2));
    const fr = calculateFitness(tasks, position, refMin, refMax);
    const particle = { position, velocity, pBest: [...position], pBestFitness: fr.fitness, fitness: fr.fitness, feasible: fr.feasible, result: fr.result };
    particles.push(particle);
    if (fr.feasible && fr.fitness > globalBestFitness) {
      globalBestFitness = fr.fitness;
      globalBest = { position: [...position], fitness: fr.fitness, result: fr.result };
    }
  }
  if (!globalBest) {
    for (const p of particles) if (p.feasible && p.fitness > globalBestFitness) { globalBestFitness = p.fitness; globalBest = { position: [...p.position], fitness: p.fitness, result: p.result }; }
    if (!globalBest) globalBest = { position: Array.from({ length: numTasks }, () => 1), fitness: 0, result: { avgLatencyMs: 999999, avgEnergy: 999, avgUtilization: 100, loadBalanceScore: 0, edgeTasks: 0, cloudTasks: numTasks } };
  }

  const log = [];
  let noImprovementCount = 0;
  const CONVERGENCE_THRESHOLD = 20;
  let iterationsCompleted = 0;

  for (let it = 1; it <= iterations; it++) {
    iterationsCompleted = it;
    let improved = false;

    for (let p = 0; p < particles.length; p++) {
      const particle = particles[p];
      for (let d = 0; d < numTasks; d++) {
        const r1 = random.next(), r2 = random.next();
        const cognitive = c1 * r1 * (particle.pBest[d] - particle.position[d]);
        const social = c2 * r2 * (globalBest.position[d] - particle.position[d]);
        let nv = w * particle.velocity[d] + cognitive + social;
        nv = Math.min(vMax, Math.max(-vMax, nv));
        particle.velocity[d] = nv;
      }
      for (let d = 0; d < numTasks; d++) {
        const sigmoid = 1 / (1 + Math.exp(-particle.velocity[d]));
        particle.position[d] = random.next() < sigmoid ? 1 : 0;
      }
      const fr = calculateFitness(tasks, particle.position, refMin, refMax);
      if (fr.feasible && fr.fitness > particle.pBestFitness) { particle.pBest = [...particle.position]; particle.pBestFitness = fr.fitness; improved = true; }
      particle.fitness = fr.fitness; particle.feasible = fr.feasible; particle.result = fr.result;
      if (fr.feasible && fr.fitness > globalBestFitness) { globalBestFitness = fr.fitness; globalBest = { position: [...particle.position], fitness: fr.fitness, result: fr.result }; improved = true; }
    }

    noImprovementCount = improved ? 0 : noImprovementCount + 1;
    const converged = noImprovementCount >= CONVERGENCE_THRESHOLD;

    if (it % 5 === 0 || it === 1 || it === iterations || converged) {
      log.push({
        iteration: it,
        particles: particles.map((p, idx) => ({ index: idx, position: [...p.position], fitness: +p.fitness.toFixed(4), feasible: p.feasible, pBestFitness: +p.pBestFitness.toFixed(4) })),
        globalBestPosition: [...globalBest.position],
        bestFitness: +globalBestFitness.toFixed(4),
        bestLatencyMs: +globalBest.result.avgLatencyMs.toFixed(2),
        bestEnergy: +globalBest.result.avgEnergy.toFixed(2),
        bestUtilization: +globalBest.result.avgUtilization.toFixed(1),
        loadBalance: +globalBest.result.loadBalanceScore.toFixed(1),
        edgeTasks: globalBest.result.edgeTasks, cloudTasks: globalBest.result.cloudTasks,
        converged,
      });
    }
    if (converged) break;
  }

  const result = globalBest.result;
  const allocationDetails = [];
  for (let i = 0; i < numTasks; i++) {
    const toEdge = globalBest.position[i] === 0;
    allocationDetails.push({ taskIndex: i + 1, taskSize: tasks[i]?.taskSize || 0, assignedTo: toEdge ? "Edge" : "Cloud" });
  }

  return {
    feasible: true, allocation: globalBest.position, allocationDetails,
    iterationsPerformed: iterationsCompleted, converged: log[log.length - 1]?.converged || false,
    bestFitness: +globalBestFitness.toFixed(4),
    totalLatency: result.totalLatency, avgLatency: result.avgLatency, avgLatencyMs: result.avgLatencyMs,
    totalEnergy: result.totalEnergy, avgEnergy: result.avgEnergy, avgUtilization: result.avgUtilization,
    loadBalanceScore: result.loadBalanceScore, edgeTasks: result.edgeTasks, cloudTasks: result.cloudTasks,
    edgeLoadMB: result.edgeLoadMB, cloudLoadMB: result.cloudLoadMB,
    iterations: log,
    decisionReason: `PSO searched ${iterationsCompleted} iterations (popSize ${popSize}) and converged on the best feasible allocation found — ${result.edgeTasks} tasks to Edge, ${result.cloudTasks} to Cloud. Avg latency ${result.avgLatencyMs} ms, energy ${result.avgEnergy} J, utilization ${result.avgUtilization}%, load balance ${result.loadBalanceScore}%.`,
  };
};

/* ════════════════════════════════════════════════════════════
   SECTION 10 — WORKLOAD REFERENCE DATA + TASK BATCH GENERATION
   ────────────────────────────────────────────────────────────
   These per-machine tiers are REFERENCE/MONITORING values (the
   "Current System" baseline before offloading) — they are NOT fed
   into the latency formula directly. Only `taskSize`, `queueLength`,
   and `throughput` become real algorithm inputs (see generateTaskBatch).
   NOTE: the source revision-guide document was truncated after SM3's
   "high" tier, and PCM1 was missing entirely. SM3.high.avgLatency and
   all of PCM1's tiers below were reconstructed from the machine's
   original (pre-revision) dataset to keep the table complete — flag
   these against Chapter 3's approved figures before relying on them.
   ════════════════════════════════════════════════════════════ */
const WORKLOAD_TIERS = {
  CPCM1: {
    veryLow: { taskSize: 1.5, queueLength: 0, throughput: 45, referenceProcessingTime: 15, cpuUtilization: 5, memoryUsage: 0.2, bandwidth: 120, transmissionDelay: 3, energyConsumption: 0.3, avgLatency: 18 },
    low: { taskSize: 12, queueLength: 1, throughput: 21, referenceProcessingTime: 45, cpuUtilization: 30, memoryUsage: 0.9, bandwidth: 100, transmissionDelay: 8, energyConsumption: 1.0, avgLatency: 48 },
    medium: { taskSize: 20, queueLength: 1, throughput: 16, referenceProcessingTime: 60, cpuUtilization: 45, memoryUsage: 1.2, bandwidth: 80, transmissionDelay: 12, energyConsumption: 1.5, avgLatency: 72 },
    high: { taskSize: 45, queueLength: 5, throughput: 9, referenceProcessingTime: 130, cpuUtilization: 90, memoryUsage: 2.0, bandwidth: 60, transmissionDelay: 22, energyConsumption: 3.2, avgLatency: 125 },
  },
  PB2: {
    veryLow: { taskSize: 1.8, queueLength: 0, throughput: 40, referenceProcessingTime: 18, cpuUtilization: 5, memoryUsage: 0.2, bandwidth: 120, transmissionDelay: 3, energyConsumption: 0.3, avgLatency: 20 },
    low: { taskSize: 12, queueLength: 1, throughput: 21, referenceProcessingTime: 45, cpuUtilization: 30, memoryUsage: 0.9, bandwidth: 100, transmissionDelay: 8, energyConsumption: 1.0, avgLatency: 48 },
    medium: { taskSize: 20, queueLength: 1, throughput: 16, referenceProcessingTime: 60, cpuUtilization: 45, memoryUsage: 1.2, bandwidth: 80, transmissionDelay: 12, energyConsumption: 1.5, avgLatency: 72 },
    high: { taskSize: 45, queueLength: 5, throughput: 9, referenceProcessingTime: 130, cpuUtilization: 90, memoryUsage: 2.0, bandwidth: 60, transmissionDelay: 22, energyConsumption: 3.2, avgLatency: 125 },
  },
  WM1: {
    veryLow: { taskSize: 2.0, queueLength: 0, throughput: 35, referenceProcessingTime: 20, cpuUtilization: 5, memoryUsage: 0.3, bandwidth: 120, transmissionDelay: 3, energyConsumption: 0.4, avgLatency: 22 },
    low: { taskSize: 18, queueLength: 1, throughput: 23, referenceProcessingTime: 50, cpuUtilization: 35, memoryUsage: 1.2, bandwidth: 115, transmissionDelay: 8, energyConsumption: 1.2, avgLatency: 55 },
    medium: { taskSize: 30, queueLength: 2, throughput: 18, referenceProcessingTime: 80, cpuUtilization: 55, memoryUsage: 2.0, bandwidth: 100, transmissionDelay: 12, energyConsumption: 2.1, avgLatency: 92 },
    high: { taskSize: 60, queueLength: 6, throughput: 9, referenceProcessingTime: 155, cpuUtilization: 90, memoryUsage: 2.8, bandwidth: 70, transmissionDelay: 24, energyConsumption: 3.9, avgLatency: 140 },
  },
  SM3: {
    veryLow: { taskSize: 1.2, queueLength: 0, throughput: 50, referenceProcessingTime: 12, cpuUtilization: 3, memoryUsage: 0.2, bandwidth: 120, transmissionDelay: 2, energyConsumption: 0.2, avgLatency: 15 },
    low: { taskSize: 15, queueLength: 1, throughput: 19, referenceProcessingTime: 45, cpuUtilization: 30, memoryUsage: 1.0, bandwidth: 95, transmissionDelay: 9, energyConsumption: 1.1, avgLatency: 52 },
    medium: { taskSize: 25, queueLength: 1, throughput: 14, referenceProcessingTime: 70, cpuUtilization: 50, memoryUsage: 1.5, bandwidth: 75, transmissionDelay: 15, energyConsumption: 1.8, avgLatency: 85 },
    // avgLatency reconstructed — source table was truncated here
    high: { taskSize: 50, queueLength: 5, throughput: 8, referenceProcessingTime: 145, cpuUtilization: 90, memoryUsage: 2.4, bandwidth: 60, transmissionDelay: 25, energyConsumption: 3.5, avgLatency: 135 },
  },
  // PCM1 (Painting/Coating Machine) — entire tier table reconstructed;
  // source document omitted this machine entirely after truncation.
  PCM1: {
    veryLow: { taskSize: 1.6, queueLength: 0, throughput: 44, referenceProcessingTime: 16, cpuUtilization: 4, memoryUsage: 0.2, bandwidth: 118, transmissionDelay: 3, energyConsumption: 0.3, avgLatency: 19 },
    low: { taskSize: 25, queueLength: 1, throughput: 19, referenceProcessingTime: 70, cpuUtilization: 35, memoryUsage: 0.9, bandwidth: 105, transmissionDelay: 9, energyConsumption: 1.2, avgLatency: 50 },
    medium: { taskSize: 40, queueLength: 2, throughput: 15, referenceProcessingTime: 100, cpuUtilization: 55, memoryUsage: 1.3, bandwidth: 90, transmissionDelay: 14, energyConsumption: 2.0, avgLatency: 78 },
    high: { taskSize: 70, queueLength: 7, throughput: 8, referenceProcessingTime: 165, cpuUtilization: 90, memoryUsage: 2.1, bandwidth: 65, transmissionDelay: 26, energyConsumption: 3.7, avgLatency: 135 },
  },
};

const WORKLOAD_LABELS = { veryLow: "Very Low", low: "Low", medium: "Medium", high: "High" };
const WORKLOAD_ORDER = ["veryLow", "low", "medium", "high"];

/**
 * A batch of tasks is generated from the selected machine's tier by
 * scaling its reference taskSize with a fixed (non-random) spread of
 * multipliers, and staggering queueLength — this represents a realistic
 * run of tasks of varying size arriving from the same machine, while
 * keeping generation fully deterministic/reproducible.
 */
const TASK_SIZE_MULTIPLIERS = [0.55, 0.75, 0.9, 1.0, 1.1, 1.25, 1.4, 0.85];

const generateTaskBatch = (machineId, tier) => {
  const base = WORKLOAD_TIERS[machineId]?.[tier];
  if (!base) return [];
  return TASK_SIZE_MULTIPLIERS.map((mult, i) => ({
    taskIndex: i + 1,
    taskSize: +(base.taskSize * mult).toFixed(2),
    queueLength: Math.max(0, base.queueLength + (i % 3)),
    throughput: base.throughput,
  }));
};

/* ════════════════════════════════════════════════════════════
   API HELPERS + LOCAL HISTORY PERSISTENCE
   ════════════════════════════════════════════════════════════ */
const apiFetch = async (baseUrl, path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
  if (!res.ok) { const text = await res.text(); throw new Error(`${res.status}: ${text}`); }
  return res.json();
};

const loadHistory = () => {
  try { const raw = localStorage.getItem(HISTORY_STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
};
const saveHistory = (history) => {
  try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history)); } catch { /* unavailable */ }
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/* ════════════════════════════════════════════════════════════
   HOOK — machine list + server health
   ════════════════════════════════════════════════════════════ */
function useMachines() {
  const [machineData, setMachineData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [serverStatuses, setServerStatuses] = useState({ A: "checking", B: "checking" });

  const pingServers = useCallback(async () => {
    const results = await Promise.allSettled(
      Object.entries(SERVERS).map(async ([key, srv]) => {
        try { await apiFetch(srv.baseUrl, "/health"); return [key, "online"]; }
        catch { return [key, "offline"]; }
      })
    );
    const next = {};
    results.forEach((r) => { if (r.status === "fulfilled") { const [k, s] = r.value; next[k] = s; } });
    setServerStatuses((prev) => ({ ...prev, ...next }));
  }, []);

  const loadMachines = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await apiFetch(PRIMARY_BASE, "/machines");
      setMachineData(data);
      const firstId = Object.keys(data)[0];
      if (firstId) setSelectedId(firstId);
      setServerStatuses((prev) => ({ ...prev, A: "online" }));
    } catch (err) {
      setError(err.message);
      setServerStatuses((prev) => ({ ...prev, A: "offline" }));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMachines(); pingServers(); }, [loadMachines, pingServers]);

  return { machineData, loading, error, selectedId, setSelectedId, serverStatuses, loadMachines };
}

/* ════════════════════════════════════════════════════════════
   HOOK — offload progress (single source of truth for the % bar)
   ════════════════════════════════════════════════════════════ */
function useOffloadProgress(offloading, success) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (offloading) {
      setProgress(5);
      const id = setInterval(() => setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 : p)), 300);
      return () => clearInterval(id);
    }
  }, [offloading]);
  useEffect(() => {
    if (!offloading && success) setProgress(100);
    if (!offloading && !success) setProgress(0);
  }, [offloading, success]);
  return Math.round(progress);
}

/* ════════════════════════════════════════════════════════════
   HOOK — orchestrates running GBFS + PSO over the task batch, then
   dispatching the better-performing approach's allocation summary.
   Every number revealed during the animation was already computed by
   computeGBFS()/computePSO() up front — the timers only control *when*
   each real result is shown, never fabricate new values.
   ════════════════════════════════════════════════════════════ */
function useSimulationRunner({ machine, tasks, setHistory }) {
  const [gbfsData, setGbfsData] = useState(null);
  const [psoData, setPsoData] = useState(null);
  const [algoRunning, setAlgoRunning] = useState(false);
  const [algoError, setAlgoError] = useState(null);
  const [gbfsFull, setGbfsFull] = useState(null);
  const [psoFull, setPsoFull] = useState(null);
  const [gbfsRevealCount, setGbfsRevealCount] = useState(0); // tasks revealed
  const [psoRevealCount, setPsoRevealCount] = useState(0);   // logged iterations revealed
  const [offloadResult, setOffloadResult] = useState(null);
  const [offloading, setOffloading] = useState(false);
  const [offloadError, setOffloadError] = useState(null);

  const revealGBFS = async (result) => {
    setGbfsRevealCount(0);
    await delay(500);
    for (let i = 1; i <= result.allocationDetails.length; i++) { setGbfsRevealCount(i); await delay(480); }
    await delay(300);
    setGbfsData(result);
  };

  const revealPSO = async (result) => {
    setPsoRevealCount(0);
    await delay(500);
    for (let i = 1; i <= result.iterations.length; i++) { setPsoRevealCount(i); await delay(560); }
    await delay(300);
    setPsoData(result);
  };

  const offloadBatch = async (g, p) => {
    const gbfsBetter = g.avgLatency <= p.avgLatency;
    const betterApproach = gbfsBetter ? "GBFS" : "PSO";
    const chosen = gbfsBetter ? g : p;

    // The backend's /offload endpoint still expects the original
    // single-task payload shape (gbfsLatency/psoLatency/targetServer/
    // taskSize) — it hasn't been updated for batches. We send the
    // batch's aggregate avg latencies under those exact keys, target
    // whichever server the chosen approach allocated the majority of
    // tasks to, and post directly to THAT server's baseUrl (matching
    // the original single-task behavior instead of always hitting A).
    const totalTaskSize = tasks.reduce((a, t) => a + t.taskSize, 0);
    const primaryServerKey = chosen.edgeTasks >= chosen.cloudTasks ? "A" : "B";
    const targetSrv = resolveServer(primaryServerKey);

    setOffloading(true); setOffloadError(null);
    try {
      const MIN_DISPLAY_MS = 2200;
      const [result] = await Promise.all([
        apiFetch(targetSrv.baseUrl, "/offload", {
          method: "POST",
          body: JSON.stringify({
            machineId: machine.machineId,
            taskSize: +totalTaskSize.toFixed(2),
            algorithm: betterApproach,
            targetServer: targetSrv.label,
            gbfsLatency: g.avgLatencyMs,
            psoLatency: p.avgLatencyMs,
          }),
        }),
        delay(MIN_DISPLAY_MS),
      ]);
      setOffloadResult(result);
      setHistory((h) => [
        {
          id: `${Date.now()}`,
          timestamp: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          machineName: machine.name, machineId: machine.machineId, taskCount: tasks.length,
          approach: betterApproach, avgLatencyMs: chosen.avgLatencyMs,
          edgeTasks: chosen.edgeTasks, cloudTasks: chosen.cloudTasks, loadBalance: chosen.loadBalanceScore,
          status: result?.status === "success" ? "Success" : "Failed",
        },
        ...h,
      ]);
      return result?.status === "success";
    } catch (err) {
      setOffloadError(err.message);
      return false;
    } finally { setOffloading(false); }
  };

  const runBothAlgorithms = async ({ onProgress }) => {
    setAlgoRunning(true); setAlgoError(null);
    setGbfsData(null); setPsoData(null); setGbfsFull(null); setPsoFull(null);
    setGbfsRevealCount(0); setPsoRevealCount(0);
    try {
      const gbfsResult = computeGBFS(tasks);
      const psoResult = computePSO(tasks, 60, 10);
      setGbfsFull(gbfsResult); setPsoFull(psoResult);

      await Promise.all([revealGBFS(gbfsResult), revealPSO(psoResult)]);
      onProgress?.("algorithms-done");

      const success = await offloadBatch(gbfsResult, psoResult);
      if (success) onProgress?.("offload-done");
    } catch (err) {
      setAlgoError(err.message);
    } finally { setAlgoRunning(false); }
  };

  const retryOffload = async ({ onProgress }) => {
    const success = await offloadBatch(gbfsData, psoData);
    if (success) onProgress?.("offload-done");
  };

  const resetRun = () => {
    setGbfsData(null); setPsoData(null); setGbfsFull(null); setPsoFull(null);
    setGbfsRevealCount(0); setPsoRevealCount(0); setOffloadResult(null);
    setAlgoError(null); setOffloadError(null);
  };

  return {
    gbfsData, psoData, algoRunning, algoError, gbfsFull, psoFull, gbfsRevealCount, psoRevealCount,
    offloadResult, offloading, offloadError, runBothAlgorithms, retryOffload, resetRun,
  };
}

/* ════════════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
   ════════════════════════════════════════════════════════════ */
const Badge = ({ color = "blue", children, dot }) => {
  const T = useT();
  const map = {
    blue: { bg: T.blueBg, border: T.blueDim, text: T.blue }, green: { bg: T.greenBg, border: T.greenDim, text: T.green },
    purple: { bg: T.purpleBg, border: T.purpleDim, text: T.purple }, amber: { bg: T.amberBg, border: T.amber, text: T.amber },
    red: { bg: T.redBg, border: T.red, text: T.red }, dim: { bg: T.elevated, border: T.border, text: T.muted },
  };
  const c = map[color] || map.blue;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 5, fontSize: 14, fontWeight: 600, letterSpacing: "0.02em", fontFamily: T.fontMono, lineHeight: 1.3, background: c.bg, border: `1px solid ${c.border}`, color: c.text, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.text, display: "inline-block", flexShrink: 0 }} />}
      {children}
    </span>
  );
};

const Stat = ({ label, value, color = "blue", mono = true }) => {
  const T = useT();
  const map = { blue: T.blue, green: T.green, purple: T.purple, amber: T.amber };
  return (
    <div style={{ flex: "1 1 140px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 18px", boxShadow: T.bg === "#eef0f5" ? "0 1px 2px rgba(15,17,23,0.05)" : "0 1px 2px rgba(0,0,0,0.18)" }}>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.fontSans, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: map[color] || T.text, fontFamily: mono ? T.fontMono : T.fontSans, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  );
};

const Card = ({ title, sub, children, accent }) => {
  const T = useT();
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 12, overflow: "hidden", boxShadow: T.bg === "#eef0f5" ? "0 1px 3px rgba(15,17,23,0.06)" : "0 1px 3px rgba(0,0,0,0.22)" }}>
      {(title || sub) && (
        <div style={{ padding: "11px 16px", borderBottom: `1px solid ${T.borderSub}`, display: "flex", alignItems: "baseline", gap: 10, background: T.elevated }}>
          {accent && <div style={{ width: 3, height: 16, borderRadius: 2, background: accent, flexShrink: 0 }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: T.fontSans }}>{title}</div>
            {sub && <div style={{ fontSize: 13, color: T.muted, marginTop: 2, fontFamily: T.fontSans, fontWeight: 400 }}>{sub}</div>}
          </div>
        </div>
      )}
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
};

const InfoBox = ({ color = "blue", children }) => {
  const T = useT();
  const map = { blue: { bg: T.blueBg, border: T.blueDim, text: T.blue }, green: { bg: T.greenBg, border: T.greenDim, text: T.green }, amber: { bg: T.amberBg, border: T.amber, text: T.amber }, red: { bg: T.redBg, border: T.red, text: T.red } };
  const c = map[color] || map.blue;
  return <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.text}`, borderRadius: 7, padding: "12px 16px", fontSize: 14, color: c.text, lineHeight: 1.6, fontFamily: T.fontSans }}>{children}</div>;
};
const ErrBox = ({ children }) => <InfoBox color="red">{children}</InfoBox>;

const TableRow = ({ cells, isOdd }) => {
  const T = useT();
  return (
    <tr style={{ background: isOdd ? T.elevated : T.surface }}>
      {cells.map((cell, i) => (
        <td key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${T.borderSub}`, fontSize: 14, color: T.text, fontFamily: i === 0 ? T.fontSans : T.fontMono, fontWeight: i === 0 ? 500 : 400, verticalAlign: "middle" }}>{cell}</td>
      ))}
    </tr>
  );
};

const Th = ({ children }) => {
  const T = useT();
  return <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${T.border}`, background: T.elevated, fontFamily: T.fontSans, whiteSpace: "nowrap" }}>{children}</th>;
};

const PrimaryBtn = ({ onClick, disabled, children }) => {
  const T = useT();
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: disabled ? T.elevated : T.green, color: disabled ? T.dim : T.bg === "#eef0f5" ? "#ffffff" : "#0d1117", border: disabled ? `1px solid ${T.border}` : "none", borderRadius: 7, padding: "10px 24px", fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: T.fontSans, letterSpacing: "0.01em", boxShadow: disabled ? "none" : "0 1px 2px rgba(0,0,0,0.2)" }}>{children}</button>
  );
};
const GhostBtn = ({ onClick, disabled, children }) => {
  const T = useT();
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: "transparent", color: disabled ? T.dim : T.muted, border: `1px solid ${disabled ? T.borderSub : T.border}`, borderRadius: 7, padding: "10px 24px", fontSize: 15, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", fontFamily: T.fontSans }}>{children}</button>
  );
};
const DualBtn = ({ onClick, disabled, children }) => {
  const T = useT();
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: disabled ? T.elevated : "linear-gradient(135deg, #2563eb, #7c3aed)", color: disabled ? T.dim : "#ffffff", border: disabled ? `1px solid ${T.border}` : "none", borderRadius: 7, padding: "12px 32px", fontSize: 16, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: T.fontSans, letterSpacing: "0.01em", boxShadow: disabled ? "none" : "0 2px 8px rgba(37,99,235,0.35)" }}>{children}</button>
  );
};

/* ════════════════════════════════════════════════════════════
   SIDEBAR / TOPBAR / PIPELINE STRIP
   ════════════════════════════════════════════════════════════ */
const Sidebar = ({ step, maxReached, onJump, serverStatuses }) => {
  const T = useT();
  return (
    <div style={{ width: 220, background: T.bg, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto", flexShrink: 0, borderRight: `1px solid ${T.border}` }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: "linear-gradient(135deg, #2563eb, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: "-0.01em", fontFamily: T.fontSans, lineHeight: 1.3 }}>Task Offloading<br />Simulation System</div>
            <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontMono, marginTop: 2 }}>IoT · v6.0 (batch)</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 12px", flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 8px", marginBottom: 8, fontFamily: T.fontSans }}>Pipeline</div>
        {STEPS.map((s, i) => {
          const active = i === step, done = i < step, clickable = i <= maxReached;
          return (
            <button key={i} onClick={() => clickable && onJump(i)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 6, border: "none", cursor: clickable ? "pointer" : "default", textAlign: "left", marginBottom: 2, background: active ? T.elevated : "transparent", outline: active ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 11 : 12, fontWeight: 700, fontFamily: T.fontMono, background: active ? T.green : done ? T.greenDim : T.elevated, color: active ? (T.bg === "#eef0f5" ? "#fff" : "#0d1117") : done ? T.green : T.dim, border: `1px solid ${active ? T.green : done ? T.greenDim : T.border}` }}>{done ? "✓" : i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: active ? 600 : 400, color: active ? T.text : done ? T.muted : T.dim, fontFamily: T.fontSans, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div></div>
              {active && <div style={{ width: 3, height: 14, borderRadius: 2, background: T.green, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: T.fontSans }}>Servers</div>
        {Object.entries(SERVERS).map(([key, srv]) => {
          const st = serverStatuses[key], online = st === "online";
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, marginBottom: 4, background: T.elevated, border: `1px solid ${T.borderSub}` }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: online ? T.green : st === "checking" ? T.amber : T.red }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.text, fontFamily: T.fontMono, lineHeight: 1 }}>{srv.label}</div>
                <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontMono, marginTop: 2 }}>{online ? "online" : st === "checking" ? "pinging…" : "offline"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TopBar = ({ step, maxReached, onJump, dark, setDark, tier }) => {
  const T = useT();
  return (
    <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 24px", minHeight: 52, display: "flex", alignItems: "center", gap: 8, flexShrink: 0, boxShadow: T.bg === "#eef0f5" ? "0 1px 3px rgba(15,17,23,0.05)" : "0 1px 3px rgba(0,0,0,0.25)", position: "relative", zIndex: 5 }}>
      <span style={{ fontSize: 15, color: T.muted, fontFamily: T.fontSans }}>Simulation</span>
      <span style={{ color: T.border, fontSize: 15 }}>›</span>
      <span style={{ fontSize: 15, color: T.text, fontWeight: 600, fontFamily: T.fontSans }}>{STEPS[step].title}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 16, overflow: "hidden" }}>
        {STEPS.map((s, i) => {
          const active = i === step, done = i < step, clickable = i <= maxReached;
          return (
            <React.Fragment key={i}>
              <button onClick={() => clickable && onJump(i)} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 14, fontWeight: active ? 700 : 400, fontFamily: T.fontMono, background: active ? T.greenBg : done ? T.elevated : "transparent", color: active ? T.green : done ? T.muted : T.dim, border: `1px solid ${active ? T.greenDim : done ? T.border : "transparent"}`, cursor: clickable ? "pointer" : "default", whiteSpace: "nowrap" }}>{done ? "✓ " : ""}{s.short}</button>
              {i < STEPS.length - 1 && <span style={{ color: T.border, fontSize: 13 }}>—</span>}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {tier && <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontFamily: T.fontMono, color: T.blue, background: T.blueBg, border: `1px solid ${T.blueDim}`, borderRadius: 4, padding: "3px 10px" }}><span style={{ fontSize: 12, opacity: 0.7 }}>tier →</span>{WORKLOAD_LABELS[tier]}</div>}
        <div style={{ fontSize: 14, fontFamily: T.fontMono, color: T.muted, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 4, padding: "3px 10px" }}>{step + 1} / {STEPS.length}</div>
        <button onClick={() => setDark((d) => !d)} style={{ display: "flex", alignItems: "center", gap: 8, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 20, padding: "5px 12px 5px 8px", cursor: "pointer" }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>{dark ? "🌙" : "☀️"}</span>
          <div style={{ position: "relative", width: 34, height: 19, borderRadius: 10, background: dark ? T.green : T.blue, opacity: 0.85, flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: dark ? 16 : 3, width: 13, height: 13, borderRadius: "50%", background: "#ffffff" }} />
          </div>
          <span style={{ fontSize: 14, color: T.muted, fontFamily: T.fontMono, minWidth: 28 }}>{dark ? "Dark" : "Light"}</span>
        </button>
      </div>
    </div>
  );
};

const MainSimulationPipeline = ({ activeIdx }) => {
  const T = useT();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", overflowX: "auto" }}>
      {PIPELINE_STAGES.map((label, i) => {
        const done = i < activeIdx, active = i === activeIdx;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div style={{ width: 20, height: 1, background: done || active ? T.green : T.border, margin: "0 6px", flexShrink: 0 }} />}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 20, background: active ? T.blueBg : done ? T.greenBg : T.elevated, border: `1px solid ${active ? T.blue : done ? T.green : T.border}`, flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? T.blue : done ? T.green : T.dim, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontFamily: T.fontMono, whiteSpace: "nowrap", color: active ? T.blue : done ? T.green : T.dim, fontWeight: active ? 700 : 400 }}>{label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   STEP 0 — SELECT MACHINE
   ════════════════════════════════════════════════════════════ */
const getMachineImg = (mc) => {
  const name = (mc.name || mc.machineId || "").toLowerCase();
  if (name.includes("cnc plasma")) return "/images/plasma.png";
  if (name.includes("plasma cut")) return "/images/plasmacut.png";
  const categoryMap = { "Cutting Machines": "/images/shearing.png", "Welding Machines": "/images/welding.png", "Finishing Machines": "/images/paint.png" };
  return categoryMap[mc.category] || "/images/default.jpg";
};

const Step0Machine = ({ machineData, loading, error, selectedId, setSelectedId, onRetry }) => {
  const T = useT();
  const machines = Object.values(machineData);
  const m = machineData[selectedId];

  if (loading) return <Card title="Loading Machines" sub="Fetching from Supabase via Server A"><div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0", color: T.muted, fontFamily: T.fontSans, fontSize: 16 }}><div style={{ width: 16, height: 16, border: `2px solid ${T.blue}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Connecting to edge…</div></Card>;
  if (error) return <div><ErrBox>Connection failed — {error}</ErrBox><div style={{ marginTop: 12 }}><PrimaryBtn onClick={onRetry}>Retry</PrimaryBtn></div></div>;
  if (!m) return null;

  const cats = [
    { label: "Total Devices", value: machines.length, color: "green" },
    { label: "Cutting", value: machines.filter((x) => x.category === "Cutting Machines").length, color: "blue" },
    { label: "Finishing", value: machines.filter((x) => x.category === "Finishing Machines").length, color: "purple" },
    { label: "Welding", value: machines.filter((x) => x.category === "Welding Machines").length, color: "amber" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>IoT Machine Selection</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>Choose a registered device. A batch of tasks will be generated from its selected workload tier and fed to GBFS + PSO.</p>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {cats.map((c) => <Stat key={c.label} label={c.label} value={c.value} color={c.color} />)}
      </div>
      <Card title="Registered Devices" sub="Live data from Supabase" accent={T.blue}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {machines.map((mc) => {
            const sel = selectedId === mc.id;
            return (
              <div key={mc.id} onClick={() => setSelectedId(mc.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(mc.id); } }} style={{ border: `2px solid ${sel ? T.green : T.border}`, borderRadius: 10, overflow: "hidden", background: sel ? T.greenBg : T.elevated, cursor: "pointer" }}>
                <div style={{ position: "relative", width: "100%", height: 110, overflow: "hidden", background: T.bg }}>
                  <img src={getMachineImg(mc)} alt={mc.name} onError={(e) => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {sel && <div style={{ position: "absolute", top: 8, right: 8 }}><Badge color="green" dot>selected</Badge></div>}
                  {WORKLOAD_TIERS[mc.machineId] && <div style={{ position: "absolute", top: 8, left: 8 }}><Badge color="purple" dot>tiers</Badge></div>}
                </div>
                <div style={{ padding: "10px 12px 12px" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: sel ? T.green : T.text, marginBottom: 2, fontFamily: T.fontMono }}>{mc.machineId}</div>
                  <div style={{ fontSize: 14, color: T.muted, marginBottom: 6, fontFamily: T.fontSans, lineHeight: 1.4 }}>{mc.name}</div>
                  <div style={{ fontSize: 13, color: T.dim, fontFamily: T.fontMono }}>{mc.taskType}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      {m && (
        <Card title={`${m.machineId} — ${m.name}`} sub="Device metadata" accent={T.green}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            {[["Machine ID", m.machineId, "blue"], ["Category", m.category, "dim"], ["Task Type", m.taskType, "amber"]].map(([l, v, c]) => (
              <div key={l} style={{ flex: "1 1 160px", background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.fontSans }}>{l}</div>
                <Badge color={c}>{v}</Badge>
              </div>
            ))}
          </div>
          <InfoBox color="green"><strong>{m.machineId}</strong> selected — proceed to generate its task batch.</InfoBox>
        </Card>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   STEP 1 — GENERATE TASK BATCH
   ════════════════════════════════════════════════════════════ */
const TierSelector = ({ machineId, tier, setTier }) => {
  const T = useT();
  const hasTiers = !!WORKLOAD_TIERS[machineId];
  if (!hasTiers) return <InfoBox color="amber">No tier table registered for {machineId}.</InfoBox>;
  const tierColor = { veryLow: T.purple, low: T.green, medium: T.amber, high: T.red };
  return (
    <Card title="Workload Tier" sub={`${machineId} · choose the reference tier the task batch is generated from`} accent={T.purple}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {WORKLOAD_ORDER.map((key) => {
          const active = tier === key;
          const color = tierColor[key];
          return (
            <button key={key} onClick={() => setTier(key)} style={{ flex: "1 1 110px", padding: "10px 14px", borderRadius: 7, border: `1px solid ${active ? color : T.border}`, background: active ? `${color}22` : T.elevated, color: active ? color : T.muted, fontFamily: T.fontSans, fontWeight: active ? 700 : 500, fontSize: 14, cursor: "pointer" }}>{active && "✓ "}{WORKLOAD_LABELS[key]}</button>
          );
        })}
      </div>
    </Card>
  );
};

const TaskBatchTable = ({ tasks, machine, tier }) => {
  const T = useT();
  const totalSize = tasks.reduce((a, t) => a + t.taskSize, 0);
  const avgSize = totalSize / (tasks.length || 1);
  return (
    <Card title="Generated Task Batch" sub={`${tasks.length} tasks derived from ${machine.machineId}'s ${WORKLOAD_LABELS[tier]} tier`} accent={T.blue}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Stat label="Task Count" value={tasks.length} color="blue" />
        <Stat label="Total Size" value={`${totalSize.toFixed(1)} MB`} color="purple" />
        <Stat label="Avg Task Size" value={`${avgSize.toFixed(2)} MB`} color="green" />
        <Stat label="Reference Queue" value={WORKLOAD_TIERS[machine.machineId][tier].queueLength} color="amber" />
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><Th>#</Th><Th>Task Size</Th><Th>Queue Length</Th><Th>Throughput Ref.</Th></tr></thead>
        <tbody>
          {tasks.map((t, i) => (
            <TableRow key={t.taskIndex} isOdd={i % 2 === 1} cells={[
              <span style={{ fontFamily: T.fontSans, color: T.text }}>Task {t.taskIndex}</span>,
              <span>{t.taskSize} MB</span>,
              <span>{t.queueLength}</span>,
              <span>{t.throughput} tasks/min</span>,
            ]} />
          ))}
        </tbody>
      </table>
    </Card>
  );
};

const CurrentSystemBaselineCard = ({ machine, tier, tasks }) => {
  const T = useT();
  const ref = WORKLOAD_TIERS[machine.machineId][tier];
  return (
    <Card title="Current System (Before Offloading)" sub="Reference/monitoring values — NOT fed into the latency formula" accent={T.amber}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {[["Reference Avg Latency", `${ref.avgLatency} ms`], ["Reference Processing Time", `${ref.referenceProcessingTime} ms`], ["CPU Utilization", `${ref.cpuUtilization}%`], ["Memory Usage", `${ref.memoryUsage} GB`], ["Bandwidth (reference)", `${ref.bandwidth} Mbps`], ["Energy Consumption", `${ref.energyConsumption} kWh`]].map(([l, v]) => (
          <div key={l} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.fontMono }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <InfoBox color="amber">These describe {machine.machineId} running all {tasks.length} tasks locally, with no offloading. GBFS/PSO are compared against this baseline in the results step.</InfoBox>
      </div>
    </Card>
  );
};

const Step1TaskBatch = ({ machine, tier, setTier, tasks }) => {
  const T = useT();
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>Task Batch Generation</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>Pick a workload tier for <strong style={{ color: T.text }}>{machine.name} ({machine.machineId})</strong>. Each tier's reference task size is scaled into a batch of tasks that GBFS and PSO will both receive, unchanged, as their input.</p>
      </div>
      <TierSelector machineId={machine.machineId} tier={tier} setTier={setTier} />
      {tier && tasks.length > 0 && (
        <>
          <TaskBatchTable tasks={tasks} machine={machine} tier={tier} />
          <CurrentSystemBaselineCard machine={machine} tier={tier} tasks={tasks} />
          <InfoBox color="green">Batch ready — {tasks.length} tasks will be passed unchanged to both computeGBFS(tasks) and computePSO(tasks).</InfoBox>
        </>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   STEP 2 — GBFS BATCH EXECUTION PANEL
   Reveals one task at a time; every value shown (edge/cloud eval,
   running load, selection) comes straight from computeGBFS()'s
   already-computed allocationDetails — the timer only paces reveal.
   ════════════════════════════════════════════════════════════ */
const GBFSBatchPanel = ({ sim, revealCount }) => {
  const T = useT();
  if (!sim) return null;
  const shown = sim.allocationDetails.slice(0, revealCount);
  const last = shown[shown.length - 1];
  const done = revealCount >= sim.allocationDetails.length;

  return (
    <Card title="GBFS Execution — Sequential Allocation" sub="Task → Evaluate Edge → Evaluate Cloud → Compare → Select, one task at a time" accent={T.blue}>
      <div style={{ fontFamily: T.fontMono, fontSize: 13, color: T.muted, marginBottom: 10 }}>
        {last ? <>Task <strong style={{ color: T.blue }}>{last.taskIndex}</strong> / {sim.allocationDetails.length} → <strong style={{ color: T.blue }}>{last.selectedServerLabel}</strong> ({last.latencyMs} ms) · Edge load {last.edgeLoadAfter} MB · Cloud load {last.cloudLoadAfter} MB</> : "Awaiting first task…"}
      </div>
      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Task</Th><Th>Size</Th><Th>Edge Lat.</Th><Th>Cloud Lat.</Th><Th>Selected</Th><Th>Reason</Th></tr></thead>
          <tbody>
            {shown.map((d, i) => (
              <tr key={d.taskIndex} style={{ background: i === shown.length - 1 ? T.blueBg : "transparent" }}>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.text, borderBottom: `1px solid ${T.borderSub}` }}>{d.taskIndex}</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{d.taskSize} MB</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{d.edgeEval.feasible ? `${d.edgeEval.latencyMs} ms` : "infeasible"}</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{d.cloudEval.feasible ? `${d.cloudEval.latencyMs} ms` : "infeasible"}</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, fontWeight: 700, color: d.selectedServerKey === "A" ? T.blue : T.green, borderBottom: `1px solid ${T.borderSub}` }}>{d.selectedServerLabel}</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontSans, fontSize: 12, color: T.dim, borderBottom: `1px solid ${T.borderSub}` }}>{d.selectionReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {done && (
        <div style={{ marginTop: 12, background: T.blueBg, border: `1px solid ${T.blueDim}`, borderLeft: `3px solid ${T.blue}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 13, color: T.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans, marginBottom: 6 }}>GBFS Result</div>
          <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, lineHeight: 1.6 }}>{sim.decisionReason}</div>
        </div>
      )}
    </Card>
  );
};

/* ════════════════════════════════════════════════════════════
   STEP 2 — PSO BATCH EXECUTION PANEL
   Reveals one logged iteration at a time. Bit-strings show the
   global-best allocation (0=Edge, 1=Cloud) at that iteration — real
   computePSO() output, not a decorative animation.
   ════════════════════════════════════════════════════════════ */
const bits = (arr) => arr.map((b) => (b === 0 ? "E" : "C")).join("");

const PSOBatchPanel = ({ sim, revealCount }) => {
  const T = useT();
  if (!sim) return null;
  const shown = sim.iterations.slice(0, revealCount);
  const last = shown[shown.length - 1];
  const done = revealCount >= sim.iterations.length;

  return (
    <Card title="PSO Execution — Binary Particle Swarm" sub="Init → Fitness → Velocity → Position → PBest → GBest → Next Iteration → Convergence" accent={T.purple}>
      <div style={{ fontFamily: T.fontMono, fontSize: 13, color: T.muted, marginBottom: 10 }}>
        {last ? <>Iteration <strong style={{ color: T.purple }}>{last.iteration}</strong> / {sim.iterationsPerformed} · global best fitness <strong style={{ color: T.purple }}>{last.bestFitness}</strong> → {last.edgeTasks} Edge / {last.cloudTasks} Cloud</> : "Awaiting first iteration…"}
      </div>
      {last && (
        <div style={{ fontFamily: T.fontMono, fontSize: 13, color: T.purple, background: T.purpleBg, border: `1px solid ${T.purpleDim}`, borderRadius: 6, padding: "6px 10px", marginBottom: 10, wordBreak: "break-all" }}>
          GBest allocation: {bits(last.globalBestPosition)}
        </div>
      )}
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Iter</Th><Th>Best Fitness</Th><Th>Best Latency</Th><Th>Energy</Th><Th>Utilization</Th><Th>Load Balance</Th></tr></thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={row.iteration} style={{ background: i === shown.length - 1 ? T.purpleBg : "transparent" }}>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.text, borderBottom: `1px solid ${T.borderSub}` }}>{row.iteration}</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{row.bestFitness}</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{row.bestLatencyMs} ms</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{row.bestEnergy} J</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{row.bestUtilization}%</td>
                <td style={{ padding: "6px 10px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{row.loadBalance}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {done && (
        <div style={{ marginTop: 12, background: T.purpleBg, border: `1px solid ${T.purpleDim}`, borderLeft: `3px solid ${T.purple}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 13, color: T.purple, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans, marginBottom: 6 }}>PSO Result</div>
          <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, lineHeight: 1.6 }}>{sim.decisionReason}{sim.converged ? " Converged before exhausting the iteration budget." : ""}</div>
        </div>
      )}
    </Card>
  );
};

/* ════════════════════════════════════════════════════════════
   STEP 2 — OFFLOAD PROGRESS + TASK PAYLOAD (batch-aware)
   ════════════════════════════════════════════════════════════ */
const OffloadProgressBar = ({ progress, offloading, success, color }) => {
  const T = useT();
  const status = success ? "SUCCESS" : offloading ? "PROCESSING" : progress === 0 ? "PENDING" : "PROCESSING";
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.fontMono, fontSize: 13, color: T.muted, marginBottom: 6 }}><span>Status: <strong style={{ color: success ? T.green : offloading ? color : T.dim }}>{status}</strong></span><span>{progress}%</span></div>
      <div style={{ height: 10, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}><div style={{ height: "100%", width: `${progress}%`, background: success ? T.green : color, transition: "width 0.2s linear", borderRadius: 6 }} /></div>
    </div>
  );
};

const Step2Algorithms = ({ machine, tasks, gbfsFull, psoFull, gbfsRevealCount, psoRevealCount, gbfsData, psoData, algoRunning, algoError, onRunBoth, offloading, offloadResult, offloadError, onRetryOffload }) => {
  const T = useT();
  const bothDone = !!gbfsData && !!psoData;
  const resultsRef = useRef(null);
  const offloadProgress = useOffloadProgress(offloading, offloadResult?.status === "success");

  useEffect(() => { if (bothDone && resultsRef.current) setTimeout(() => resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 120); }, [bothDone]);

  const gbfsBetter = bothDone && gbfsData.avgLatency <= psoData.avgLatency;
  const betterApproach = bothDone ? (gbfsBetter ? "GBFS" : "PSO") : null;
  const totalSize = tasks.reduce((a, t) => a + t.taskSize, 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>Algorithm Execution</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}><strong style={{ color: T.text }}>GBFS</strong> and <strong style={{ color: T.text }}>PSO</strong> each receive the exact same {tasks.length}-task batch from {machine.machineId} and independently allocate every task to Edge Server A or Cloud Server B. Whichever achieves the lower average latency is used to dispatch the batch.</p>
      </div>

      <Card title="Execution" sub="Both algorithms run against the same batch" accent={T.blue}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", paddingTop: 4, paddingBottom: algoRunning || gbfsFull ? 16 : 0 }}>
          <DualBtn disabled={algoRunning || bothDone} onClick={onRunBoth}>{algoRunning ? "Algorithms running…" : bothDone ? "✓ Algorithms Complete" : "Run GBFS + PSO"}</DualBtn>
          {bothDone && !algoRunning && <GhostBtn onClick={onRunBoth}>↺ Re-run</GhostBtn>}
        </div>
        {algoError && <ErrBox>Run failed — {algoError}</ErrBox>}
      </Card>

      {(algoRunning || gbfsFull) && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }} className="app-grid-21">
          <GBFSBatchPanel sim={gbfsFull} revealCount={gbfsRevealCount} />
          <PSOBatchPanel sim={psoFull} revealCount={psoRevealCount} />
        </div>
      )}

      {bothDone && (
        <div ref={resultsRef}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { algo: "GBFS", color: T.blue, bg: gbfsBetter ? T.blueBg : T.elevated, border: gbfsBetter ? T.blue : T.border, data: gbfsData },
              { algo: "PSO", color: T.purple, bg: !gbfsBetter ? T.purpleBg : T.elevated, border: !gbfsBetter ? T.purple : T.border, data: psoData },
            ].map(({ algo, color, bg, border, data }) => (
              <div key={algo} style={{ flex: "1 1 260px", border: `1px solid ${border}`, borderRadius: 8, padding: "16px 18px", background: bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.fontSans }}>{algo}</span>
                  {betterApproach === algo && <Badge color={algo === "GBFS" ? "blue" : "purple"} dot>lower avg latency</Badge>}
                </div>
                {[["Avg Latency", `${data.avgLatencyMs} ms`], ["Avg Energy", `${data.avgEnergy} J`], ["Avg Utilization", `${data.avgUtilization}%`], ["Load Balance", `${data.loadBalanceScore}%`], ["Edge / Cloud Tasks", `${data.edgeTasks} / ${data.cloudTasks}`]].map(([l, v]) => (
                  <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${T.borderSub}`, fontFamily: T.fontMono, fontSize: 14 }}><span style={{ color: T.muted }}>{l}</span><span style={{ color: T.text, fontWeight: 600 }}>{v}</span></div>
                ))}
              </div>
            ))}
          </div>

          <InfoBox color="green">
            {gbfsBetter ? "GBFS produced the lower average latency for this batch." : "PSO obtained the best feasible allocation found during optimization, with the lower average latency."}{" "}
            {offloadResult?.status === "success" ? "Offload complete — click Next to view results." : "Automatically offloading the batch now…"}
          </InfoBox>

          <Card title="Task Payload" sub="Batch being dispatched using the selected approach's allocation" accent={T.amber}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 12 }}>
              {[["Approach", betterApproach], ["Source", machine.name], ["Tasks", tasks.length], ["Total Size", `${totalSize.toFixed(1)} MB`]].map(([l, v]) => (
                <div key={l} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "8px 10px" }}><div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans, marginBottom: 3 }}>{l}</div><div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.fontMono }}>{v}</div></div>
              ))}
            </div>
            <OffloadProgressBar progress={offloadProgress} offloading={offloading} success={offloadResult?.status === "success"} color={T.amber} />
          </Card>

          {offloadError && <div><ErrBox>Offload failed — {offloadError}</ErrBox><div style={{ textAlign: "center", marginTop: 10 }}><GhostBtn onClick={onRetryOffload}>↺ Retry Offload</GhostBtn></div></div>}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   STEP 3 — RESULTS DASHBOARD
   Baseline (Current System) vs GBFS vs PSO, using the SAME metric
   definitions across all three per Change 12/18.
   ════════════════════════════════════════════════════════════ */
const AllocationDistributionChart = ({ gbfsData, psoData }) => {
  const T = useT();
  const data = [
    { name: "GBFS", Edge: gbfsData.edgeTasks, Cloud: gbfsData.cloudTasks },
    { name: "PSO", Edge: psoData.edgeTasks, Cloud: psoData.cloudTasks },
  ];
  return (
    <Card title="Task Allocation Distribution" sub="Edge vs Cloud task counts per approach" accent={T.blue}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 14, right: 10, left: 0, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="name" stroke={T.dim} fontSize={13} fontFamily={T.fontSans} />
          <YAxis stroke={T.dim} fontSize={13} fontFamily={T.fontMono} allowDecimals={false} />
          <Tooltip contentStyle={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, fontFamily: T.fontMono, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 13, fontFamily: T.fontSans }} />
          <Bar dataKey="Edge" fill={T.blue} radius={[4, 4, 0, 0]}><LabelList dataKey="Edge" position="top" fill={T.blue} fontSize={12} fontFamily={T.fontMono} /></Bar>
          <Bar dataKey="Cloud" fill={T.green} radius={[4, 4, 0, 0]}><LabelList dataKey="Cloud" position="top" fill={T.green} fontSize={12} fontFamily={T.fontMono} /></Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

const ComparisonMetricsChart = ({ machine, tier, gbfsData, psoData }) => {
  const T = useT();
  const ref = WORKLOAD_TIERS[machine.machineId][tier];
  const data = [
    { metric: "Avg Latency (ms)", Baseline: ref.avgLatency, GBFS: gbfsData.avgLatencyMs, PSO: psoData.avgLatencyMs },
    { metric: "Energy (ref kWh / algo J)", Baseline: ref.energyConsumption, GBFS: gbfsData.avgEnergy, PSO: psoData.avgEnergy },
    { metric: "Utilization (%)", Baseline: ref.cpuUtilization, GBFS: gbfsData.avgUtilization, PSO: psoData.avgUtilization },
  ];
  return (
    <Card title="Performance Comparison" sub="Current System (reference) vs GBFS vs PSO — same metric definitions" accent={T.blue}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 16, right: 6, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="metric" stroke={T.dim} fontSize={12} fontFamily={T.fontSans} interval={0} />
          <YAxis stroke={T.dim} fontSize={13} fontFamily={T.fontMono} />
          <Tooltip contentStyle={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, fontFamily: T.fontMono, fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 13, fontFamily: T.fontSans }} formatter={(v) => (v === "Baseline" ? "Current System (reference)" : v)} />
          <Bar dataKey="Baseline" fill={T.amber} radius={[4, 4, 0, 0]} />
          <Bar dataKey="GBFS" fill={T.blue} radius={[4, 4, 0, 0]} />
          <Bar dataKey="PSO" fill={T.purple} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 4 }}><InfoBox color="blue">The "Current System" bars use {machine.machineId}'s own reference/monitoring values for the {WORKLOAD_LABELS[tier]} tier — they are not produced by the same formula as the GBFS/PSO bars, so treat them as a rough baseline, not a like-for-like measurement.</InfoBox></div>
    </Card>
  );
};

const DetailedNumericTable = ({ machine, tier, gbfsData, psoData }) => {
  const T = useT();
  const ref = WORKLOAD_TIERS[machine.machineId][tier];
  const rows = [
    ["Avg Latency (ms)", ref.avgLatency, gbfsData.avgLatencyMs, psoData.avgLatencyMs, "lower"],
    ["Avg Energy (J)", ref.energyConsumption, gbfsData.avgEnergy, psoData.avgEnergy, "lower"],
    ["Avg Utilization (%)", ref.cpuUtilization, gbfsData.avgUtilization, psoData.avgUtilization, "lower"],
    ["Load Balance (%)", "—", gbfsData.loadBalanceScore, psoData.loadBalanceScore, "higher"],
    ["Edge Tasks", "—", gbfsData.edgeTasks, psoData.edgeTasks, null],
    ["Cloud Tasks", "—", gbfsData.cloudTasks, psoData.cloudTasks, null],
  ];
  const better = (g, p, dir) => (dir == null ? null : (dir === "lower" ? g <= p : g >= p) ? "GBFS" : "PSO");
  return (
    <Card title="Detailed Numeric Comparison" sub="All approaches, side by side" accent={T.purple}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><Th>Metric</Th><Th>Current System</Th><Th>GBFS</Th><Th>PSO</Th><Th>Lower Latency Approach</Th></tr></thead>
        <tbody>
          {rows.map(([label, b, g, p, dir], i) => {
            const win = better(g, p, dir);
            return (
              <TableRow key={label} isOdd={i % 2 === 1} cells={[
                <span style={{ fontFamily: T.fontSans, color: T.text }}>{label}</span>,
                <span style={{ fontFamily: T.fontMono, color: T.muted }}>{b}</span>,
                <span style={{ fontFamily: T.fontMono, color: win === "GBFS" ? T.blue : T.muted, fontWeight: win === "GBFS" ? 700 : 400 }}>{g}</span>,
                <span style={{ fontFamily: T.fontMono, color: win === "PSO" ? T.purple : T.muted, fontWeight: win === "PSO" ? 700 : 400 }}>{p}</span>,
                <span style={{ fontFamily: T.fontMono }}>{win || "—"}</span>,
              ]} />
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

const TaskLevelBreakdown = ({ gbfsData, betterApproach }) => {
  const T = useT();
  const rows = gbfsData.allocationDetails;
  return (
    <Card title="Per-Task Allocation (GBFS trace)" sub="Sequential decisions retained from the search — every task's final destination" accent={T.blue}>
      <div style={{ maxHeight: 260, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Task</Th><Th>Size</Th><Th>Assigned</Th><Th>Latency</Th></tr></thead>
          <tbody>
            {rows.map((d, i) => (
              <TableRow key={d.taskIndex} isOdd={i % 2 === 1} cells={[
                <span style={{ fontFamily: T.fontSans, color: T.text }}>Task {d.taskIndex}</span>,
                <span>{d.taskSize} MB</span>,
                <Badge color={d.selectedServerKey === "A" ? "blue" : "green"}>{d.selectedServerLabel}</Badge>,
                <span>{d.latencyMs} ms</span>,
              ]} />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8 }}><InfoBox color="blue">Shown for GBFS's trace since it preserves per-task evaluation history natively; {betterApproach === "PSO" ? "PSO's binary allocation is what was actually dispatched — see the bit-string in Step 2." : "GBFS's allocation is what was actually dispatched."}</InfoBox></div>
    </Card>
  );
};

const EvaluationSummaryGrid = ({ machine, tier, gbfsData, psoData, betterApproach }) => {
  const T = useT();
  const ref = WORKLOAD_TIERS[machine.machineId][tier];
  const chosen = betterApproach === "GBFS" ? gbfsData : psoData;
  const pct = (base, val, lowerBetter = true) => (base ? +(((lowerBetter ? base - val : val - base) / base) * 100).toFixed(1) : null);
  const latPct = pct(ref.avgLatency, chosen.avgLatencyMs, true);
  const enPct = pct(ref.energyConsumption, chosen.avgEnergy, true);
  const utilPct = pct(ref.cpuUtilization, chosen.avgUtilization, true);
  const arrow = (v) => (v == null ? "" : v >= 0 ? "↓" : "↑");
  const cards = [
    { label: "Latency Change", value: latPct != null ? `${arrow(latPct)} ${Math.abs(latPct)}%` : "—", sub: `${ref.avgLatency} ms → ${chosen.avgLatencyMs} ms`, color: T.green },
    { label: "Energy Change", value: enPct != null ? `${arrow(enPct)} ${Math.abs(enPct)}%` : "—", sub: `${ref.energyConsumption} → ${chosen.avgEnergy} (units differ — see note)`, color: T.amber },
    { label: "Utilization Change", value: utilPct != null ? `${arrow(utilPct)} ${Math.abs(utilPct)}%` : "—", sub: `${ref.cpuUtilization}% → ${chosen.avgUtilization}%`, color: T.purple },
    { label: "Load Balance", value: `${chosen.loadBalanceScore}%`, sub: `${chosen.edgeTasks} Edge / ${chosen.cloudTasks} Cloud`, color: T.blue },
  ];
  return (
    <Card title="Evaluation Summary" sub={`${betterApproach} vs current baseline reference`} accent={T.green}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, fontFamily: T.fontSans, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color, fontFamily: T.fontMono, marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans }}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10 }}><InfoBox color="amber">Energy units in the reference table (kWh, whole-run) and in the algorithm output (Joules/task) are not directly comparable — treat the Energy Change figure as indicative only until Chapter 3 confirms an equivalent unit conversion.</InfoBox></div>
    </Card>
  );
};

const DatabaseHistory = ({ history }) => {
  const T = useT();
  return (
    <Card title="Database History" sub="Persisted batch-run logs, most recent first — survives page refresh" accent={T.dim}>
      {history.length === 0 ? <InfoBox color="blue">No runs logged yet.</InfoBox> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><Th>Date/Time</Th><Th>Machine</Th><Th>Tasks</Th><Th>Approach</Th><Th>Avg Latency</Th><Th>Edge/Cloud</Th><Th>Status</Th></tr></thead>
          <tbody>
            {history.map((h, i) => (
              <TableRow key={h.id} isOdd={i % 2 === 1} cells={[
                <span style={{ fontFamily: T.fontSans, color: T.text }}>{h.timestamp}</span>,
                <span style={{ fontFamily: T.fontSans, color: T.text }}>{h.machineName} ({h.machineId})</span>,
                <span>{h.taskCount}</span>,
                <Badge color={h.approach === "GBFS" ? "blue" : "purple"}>{h.approach}</Badge>,
                <span>{h.avgLatencyMs} ms</span>,
                <span>{h.edgeTasks} / {h.cloudTasks}</span>,
                <Badge color={h.status === "Success" ? "green" : "red"}>{h.status}</Badge>,
              ]} />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};

const Step3Results = ({ machine, tier, tasks, gbfsData, psoData, offloadResult, history }) => {
  const T = useT();
  if (!gbfsData || !psoData) return <Card><InfoBox color="amber">Run GBFS + PSO first (Step 3).</InfoBox></Card>;
  const gbfsBetter = gbfsData.avgLatency <= psoData.avgLatency;
  const betterApproach = gbfsBetter ? "GBFS" : "PSO";

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>Results</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>{tasks.length} tasks from <strong style={{ color: T.text }}>{machine.name}</strong> ({WORKLOAD_LABELS[tier]} tier) allocated using <strong style={{ color: gbfsBetter ? T.blue : T.purple }}>{betterApproach}</strong>{offloadResult?.status === "success" ? " and offloaded successfully." : "."}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 12 }} className="app-grid-21">
        <ComparisonMetricsChart machine={machine} tier={tier} gbfsData={gbfsData} psoData={psoData} />
        <AllocationDistributionChart gbfsData={gbfsData} psoData={psoData} />
      </div>

      <DetailedNumericTable machine={machine} tier={tier} gbfsData={gbfsData} psoData={psoData} />
      <EvaluationSummaryGrid machine={machine} tier={tier} gbfsData={gbfsData} psoData={psoData} betterApproach={betterApproach} />
      <TaskLevelBreakdown gbfsData={gbfsData} betterApproach={betterApproach} />
      <DatabaseHistory history={history} />
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   ERROR BOUNDARY
   ════════════════════════════════════════════════════════════ */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(e) { return { hasError: true, error: e }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#dc2626" }}>Runtime Error</div>
          <pre style={{ fontSize: 14, color: "#6b7280" }}>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ════════════════════════════════════════════════════════════
   GLOBAL STYLES
   ════════════════════════════════════════════════════════════ */
function buildGlobalStyles(T) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; background: ${T.bg}; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: ${T.bg}; }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    button:hover:not(:disabled) { filter: brightness(1.08); }
    button:active:not(:disabled) { filter: brightness(0.96); }
    button:disabled { opacity: 0.7; cursor: not-allowed; }
    svg, .recharts-wrapper, .recharts-surface { background: transparent !important; }
    .app-fade-in { animation: fadeIn 0.25s ease both; }
    @media (max-width: 900px) { .app-grid-21 { grid-template-columns: 1fr !important; } }
  `;
}

/* ════════════════════════════════════════════════════════════
   ROOT APP
   ════════════════════════════════════════════════════════════ */
function App() {
  const [dark, setDark] = useState(true);
  const T = makeTheme(dark);
  const globalStyles = React.useMemo(() => buildGlobalStyles(T), [dark]);

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [tier, setTier] = useState(null); // null | 'veryLow' | 'low' | 'medium' | 'high'
  const [history, setHistory] = useState(loadHistory);

  useEffect(() => { saveHistory(history); }, [history]);

  const { machineData, loading: machinesLoading, error: machinesError, selectedId, setSelectedId, serverStatuses, loadMachines } = useMachines();
  const machine = selectedId ? machineData[selectedId] : null;

  const tasks = machine && tier ? generateTaskBatch(machine.machineId, tier) : [];

  const { gbfsData, psoData, algoRunning, algoError, gbfsFull, psoFull, gbfsRevealCount, psoRevealCount, offloadResult, offloading, offloadError, runBothAlgorithms, retryOffload, resetRun } = useSimulationRunner({ machine, tasks, setHistory });

  const handleSelectMachine = (id) => { setSelectedId(id); resetRun(); setMaxReached(0); setTier(null); };
  const handleSetTier = (t) => { setTier(t); resetRun(); setMaxReached((r) => Math.min(r, 1)); };

  const handleRunBoth = () => {
    runBothAlgorithms({ onProgress: (event) => { if (event === "algorithms-done") setMaxReached((r) => Math.max(r, 2)); if (event === "offload-done") setMaxReached((r) => Math.max(r, 3)); } });
  };
  const handleRetryOffload = () => { retryOffload({ onProgress: (event) => { if (event === "offload-done") setMaxReached((r) => Math.max(r, 3)); } }); };

  const canNext = () => {
    if (step === 0) return !!selectedId;
    if (step === 1) return !!tier && tasks.length > 0;
    if (step === 2) return !!offloadResult;
    return true;
  };
  const goNext = () => { const n = step + 1; setStep(n); setMaxReached((r) => Math.max(r, n)); };
  const jumpTo = (i) => i <= maxReached && setStep(i);

  const renderStep = () => {
    switch (step) {
      case 0: return <Step0Machine machineData={machineData} loading={machinesLoading} error={machinesError} selectedId={selectedId} setSelectedId={handleSelectMachine} onRetry={loadMachines} />;
      case 1: return machine ? <Step1TaskBatch machine={machine} tier={tier} setTier={handleSetTier} tasks={tasks} /> : null;
      case 2: return machine && tasks.length > 0 ? (
        <Step2Algorithms machine={machine} tasks={tasks} gbfsFull={gbfsFull} psoFull={psoFull} gbfsRevealCount={gbfsRevealCount} psoRevealCount={psoRevealCount} gbfsData={gbfsData} psoData={psoData} algoRunning={algoRunning} algoError={algoError} onRunBoth={handleRunBoth} offloading={offloading} offloadResult={offloadResult} offloadError={offloadError} onRetryOffload={handleRetryOffload} />
      ) : null;
      case 3: return machine ? <Step3Results machine={machine} tier={tier} tasks={tasks} gbfsData={gbfsData} psoData={psoData} offloadResult={offloadResult} history={history} /> : null;
      default: return null;
    }
  };

  return (
    <ThemeCtx.Provider value={T}>
      <ErrorBoundary>
        <style>{globalStyles}</style>
        <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text }}>
          <Sidebar step={step} maxReached={maxReached} onJump={jumpTo} serverStatuses={serverStatuses} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <TopBar step={step} maxReached={maxReached} onJump={jumpTo} dark={dark} setDark={setDark} tier={tier} />
            <div style={{ flex: 1, padding: "18px 22px", overflowY: "auto", background: T.bg }}>
              {machine && step >= 1 && <MainSimulationPipeline activeIdx={derivePipelineStage({ machine, tasks, algoRunning, gbfsData, psoData, offloadResult, step })} />}
              <div key={step} className="app-fade-in">{renderStep()}</div>
            </div>
            <div style={{ background: T.surface, borderTop: `1px solid ${T.border}`, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <GhostBtn disabled={step === 0} onClick={() => setStep((p) => p - 1)}>← Back</GhostBtn>
              <span style={{ fontSize: 14, color: T.dim, fontFamily: T.fontMono }}>{STEPS[step].title}</span>
              <PrimaryBtn disabled={!canNext() || step >= 3} onClick={goNext}>{step >= 3 ? "Complete" : "Next →"}</PrimaryBtn>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </ThemeCtx.Provider>
  );
}

export default App;
