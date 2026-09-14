import React, { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList,
  LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  ComposedChart,
} from "recharts";

/* ───────────────────────────────────────────────
   DESIGN TOKENS (Dark & Light)
─────────────────────────────────────────────── */
const makeTheme = (dark) =>
  dark
    ? {
        bg: "#0f1117",
        surface: "#1a1d27",
        elevated: "#22263a",
        border: "#2e3347",
        borderSub: "#1e2235",
        text: "#e8eaf0",
        muted: "#8b90a7",
        dim: "#4a5070",
        blue: "#60a5fa",
        blueDim: "#1d3a6e",
        blueBg: "#0d1f3c",
        green: "#34d399",
        greenDim: "#064e3b",
        greenBg: "#022c22",
        purple: "#a78bfa",
        purpleDim: "#3b1fa8",
        purpleBg: "#1e0a4a",
        amber: "#fbbf24",
        amberBg: "#292100",
        red: "#f87171",
        redBg: "#2d0a0a",
        fontMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSans: "'Inter', system-ui, -apple-system, sans-serif",
      }
    : {
        bg: "#eef0f5",
        surface: "#ffffff",
        elevated: "#f4f6fb",
        border: "#c8cdd8",
        borderSub: "#dde0ea",
        text: "#111827",
        muted: "#4b5563",
        dim: "#9ca3af",
        blue: "#1d4ed8",
        blueDim: "#bfdbfe",
        blueBg: "#dbeafe",
        green: "#065f46",
        greenDim: "#6ee7b7",
        greenBg: "#d1fae5",
        purple: "#5b21b6",
        purpleDim: "#c4b5fd",
        purpleBg: "#ede9fe",
        amber: "#92400e",
        amberBg: "#fef3c7",
        red: "#991b1b",
        redBg: "#fee2e2",
        fontMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSans: "'Inter', system-ui, -apple-system, sans-serif",
      };

const ThemeCtx = React.createContext(makeTheme(true));
const useT = () => React.useContext(ThemeCtx);

/* ───────────────────────────────────────────────
   STATIC CONFIG — SERVERS, WIZARD STEPS, WORKLOAD TIERS
─────────────────────────────────────────────── */
const SERVERS = {
  A: {
    label: "Edge Server A",
    sub: "Latency-Sensitive · Compute-Heavy",
    icon: "⚡",
    tag: "A",
    baseUrl: "https://system-ctld.onrender.com/api",
  },
  B: {
    label: "Cloud Server B",
    sub: "Energy-Efficient · Cloud-Hosted",
    icon: "☁️",
    tag: "B",
    baseUrl: "https://system-1-rcpl.onrender.com/ap",
  },
};

const PRIMARY_BASE = SERVERS.A.baseUrl;

const HISTORY_STORAGE_KEY = "edgeOffloadSim.history.v1";

const STEPS = [
  { title: "Select Machine", short: "Machine", icon: "⚙" },
  { title: "Select Task Level", short: "Level", icon: "🎚" },
  { title: "Run GBFS + PSO", short: "Run", icon: "⟳" },
  { title: "Display Latency", short: "Latency", icon: "📈" },
];

const PIPELINE_STAGES = ["Data", "GBFS + PSO", "Offloading", "Selected Server", "Completed", "Latency"];

const derivePipelineStage = ({ machine, algoRunning, gbfsData, psoData, offloadResult, step }) => {
  if (!machine) return 0;
  if (algoRunning) return 1;
  if (gbfsData && psoData) {
    if (offloadResult) return step === 3 ? 5 : 4;
    return 2;
  }
  return 0;
};

const WORKLOAD_TIERS = {
  CPCM1: {
    low: { taskSize: 35, processingTime: 85, queueLength: 1, cpuUtilization: 40, memoryUsage: 1.2, bandwidth: 115, transmissionDelay: 11, energyConsumption: 1.5, throughput: 16, avgLatency: 58 },
    medium: { taskSize: 50, processingTime: 120, queueLength: 3, cpuUtilization: 60, memoryUsage: 1.6, bandwidth: 100, transmissionDelay: 16, energyConsumption: 2.3, throughput: 12, avgLatency: 88 },
    high: { taskSize: 75, processingTime: 180, queueLength: 7, cpuUtilization: 90, memoryUsage: 2.2, bandwidth: 75, transmissionDelay: 25, energyConsumption: 3.8, throughput: 8, avgLatency: 138 },
  },
  PB2: {
    low: { taskSize: 12, processingTime: 45, queueLength: 1, cpuUtilization: 30, memoryUsage: 0.9, bandwidth: 100, transmissionDelay: 8, energyConsumption: 1.0, throughput: 21, avgLatency: 48 },
    medium: { taskSize: 20, processingTime: 60, queueLength: 1, cpuUtilization: 45, memoryUsage: 1.2, bandwidth: 80, transmissionDelay: 12, energyConsumption: 1.5, throughput: 16, avgLatency: 72 },
    high: { taskSize: 45, processingTime: 130, queueLength: 5, cpuUtilization: 90, memoryUsage: 2.0, bandwidth: 60, transmissionDelay: 22, energyConsumption: 3.2, throughput: 9, avgLatency: 125 },
  },
  WM1: {
    low: { taskSize: 18, processingTime: 50, queueLength: 1, cpuUtilization: 35, memoryUsage: 1.2, bandwidth: 115, transmissionDelay: 8, energyConsumption: 1.2, throughput: 23, avgLatency: 55 },
    medium: { taskSize: 30, processingTime: 80, queueLength: 2, cpuUtilization: 55, memoryUsage: 2.0, bandwidth: 100, transmissionDelay: 12, energyConsumption: 2.1, throughput: 18, avgLatency: 92 },
    high: { taskSize: 60, processingTime: 155, queueLength: 6, cpuUtilization: 90, memoryUsage: 2.8, bandwidth: 70, transmissionDelay: 24, energyConsumption: 3.9, throughput: 9, avgLatency: 140 },
  },
  SM3: {
    low: { taskSize: 15, processingTime: 45, queueLength: 1, cpuUtilization: 30, memoryUsage: 1.0, bandwidth: 95, transmissionDelay: 9, energyConsumption: 1.1, throughput: 19, avgLatency: 52 },
    medium: { taskSize: 25, processingTime: 70, queueLength: 1, cpuUtilization: 50, memoryUsage: 1.5, bandwidth: 75, transmissionDelay: 15, energyConsumption: 1.8, throughput: 14, avgLatency: 85 },
    high: { taskSize: 50, processingTime: 145, queueLength: 5, cpuUtilization: 90, memoryUsage: 2.4, bandwidth: 60, transmissionDelay: 25, energyConsumption: 3.5, throughput: 8, avgLatency: 135 },
  },
  PCM1: {
    low: { taskSize: 25, processingTime: 70, queueLength: 1, cpuUtilization: 35, memoryUsage: 0.9, bandwidth: 105, transmissionDelay: 9, energyConsumption: 1.2, throughput: 19, avgLatency: 50 },
    medium: { taskSize: 40, processingTime: 100, queueLength: 2, cpuUtilization: 55, memoryUsage: 1.3, bandwidth: 90, transmissionDelay: 14, energyConsumption: 2.0, throughput: 15, avgLatency: 78 },
    high: { taskSize: 70, processingTime: 165, queueLength: 7, cpuUtilization: 90, memoryUsage: 2.1, bandwidth: 65, transmissionDelay: 26, energyConsumption: 3.7, throughput: 8, avgLatency: 135 },
  },
};

const WORKLOAD_LABELS = { low: "Low", medium: "Mid", high: "High" };
const WORKLOAD_PRIORITY = { low: "Low", medium: "Normal", high: "High" };

const applyWorkloadTier = (machine, tier) => {
  if (!machine || !tier) return machine;
  const overrides = WORKLOAD_TIERS[machine.machineId]?.[tier];
  if (!overrides) return machine;
  return { ...machine, ...overrides };
};

/**
 * TASK BATCH GENERATION
 * GBFS and PSO now run against a BATCH of tasks rather than one — this
 * is what actually lets the two algorithms diverge (PSO searches whole
 * allocation vectors; GBFS decides greedily task-by-task). The batch is
 * generated deterministically (fixed multiplier spread, not random) from
 * whichever reference size is currently selected: the chosen workload
 * tier if one is picked, or the machine's live-fetched values otherwise
 * ("Live Data"). `machine` (tier-merged) is kept as-is elsewhere in the
 * file purely as the "Current System" baseline for comparison charts —
 * it is no longer what's fed into the algorithms.
 */
const TASK_SIZE_MULTIPLIERS = [0.55, 0.75, 0.9, 1.0, 1.1, 1.25, 1.4, 0.85];

const generateTaskBatch = (base) => {
  if (!base) return [];
  return TASK_SIZE_MULTIPLIERS.map((mult, i) => ({
    taskIndex: i + 1,
    taskSize: +(base.taskSize * mult).toFixed(2),
    queueLength: Math.max(0, (base.queueLength || 0) + (i % 3)),
    throughput: base.throughput || 20,
  }));
};

const GBFS_STEPS = ["Task Input", "Identify Candidates", "Evaluate Heuristic", "Compare Nodes", "Select Best", "Decision"];
const PSO_STEPS = ["Task Input", "Init Particles", "Evaluate Fitness", "Update Bests", "Update Positions", "Converge", "Decision"];
const GBFS_GRAPH_STEPS = ["Task Input", "Identify", "Evaluate", "Compare", "Select", "Decision"];
const TIMELINE_STEPS = ["Task Selected", "Server Selected", "Payload Transfer", "Server Processing", "Task Execution", "Offloading Complete"];

/* ───────────────────────────────────────────────
   API / NETWORK HELPERS + LOCAL HISTORY PERSISTENCE
─────────────────────────────────────────────── */
const resolveServer = (key) => SERVERS[key] ?? SERVERS.A;

const apiFetch = async (baseUrl, path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
};

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHistory = (history) => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    /* storage unavailable — history just won't persist */
  }
};

/* ───────────────────────────────────────────────
   REAL ALGORITHM COMPUTATION (GBFS + PSO)
   ── replaced below with the physics-based Chapter-3 algorithm ──
─────────────────────────────────────────────── */
/**
 * SECTION 1 — THESIS SYSTEM CONSTANTS (per the revision guide).
 */
const P_EDGE = 20;     // MB/s — Edge processing speed
const P_CLOUD = 50;    // MB/s — Cloud processing speed
const N_EDGE = 0.05;   // s — fixed Edge network latency (50ms)
const N_CLOUD = 0.12;  // s — fixed Cloud network latency (120ms)
const BANDWIDTH = 100; // MB/s — shared transmission bandwidth
const CAPACITY_EDGE = 500;   // MB — Edge resource capacity
const CAPACITY_CLOUD = 2000; // MB — Cloud resource capacity

/**
 * THEORETICAL DECISION BOUNDARY (MB) — DISPLAY ONLY, never used to decide.
 * Derived from S/20 + S/100 + 0.05 = S/50 + S/100 + 0.12  →  S = 2.33 MB
 */
const GBFS_THRESHOLD = 2.33;

/** Fixed seed so PSO produces the same sequence/result on every run. */
const RANDOM_SEED = 12345;

/* SECTION 2 — seeded RNG (LCG), so PSO is reproducible run to run. */
class SeededRandom {
  constructor(seed) { this.seed = seed; }
  next() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  nextInt(max) { return Math.floor(this.next() * max); }
  nextFloat(min, max) { return min + this.next() * (max - min); }
}

/* SECTION 3 — server physics profiles. */
const SERVER_PROFILES = {
  A: { label: "Edge Server A", speed: P_EDGE, networkLatency: N_EDGE, capacity: CAPACITY_EDGE, energyCoefficient: 0.08, baseEnergy: 0.5, baseUtilization: 15 },
  B: { label: "Cloud Server B", speed: P_CLOUD, networkLatency: N_CLOUD, capacity: CAPACITY_CLOUD, energyCoefficient: 0.03, baseEnergy: 0.3, baseUtilization: 10 },
};

/**
 * SECTION 4/5 — evaluate one task against one server given that server's
 * CURRENT cumulative load (currentLoadMB), using the real latency formula:
 * Total = Processing + Transmission + Network + Queue. Output shape is
 * unchanged from before ({ time, latency, utilization, energy,
 * throughput, queueLength, networkDelay, queueDelay,
 * resourceAvailability, heuristicScore }) so every panel/chart below
 * keeps working without modification.
 */
const evaluateCandidate = (task, profile, currentLoadMB = 0) => {
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
 * Evaluates ONE full allocation vector (which server each task in the
 * batch goes to) end to end, tracking cumulative load per server as
 * tasks are added, and returns the batch's AVERAGE metrics. Used both
 * as PSO's fitness evaluator and to compute the two "pure" reference
 * scenarios (all-Edge / all-Cloud) that the execution panels display as
 * candidates.A / candidates.B.
 */
const evaluateAllocationBatch = (tasks, allocation) => {
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
 * SECTION 6 — GBFS: sequential greedy allocation across the WHOLE task
 * batch. Each task is compared against Edge/Cloud given the *running*
 * load already assigned to each server so far — a genuinely different
 * decision-making process from PSO's whole-vector search below.
 * `candidates.A` / `candidates.B` are the two reference extremes (every
 * task to Edge, or every task to Cloud) so the execution panel can show
 * what the mixed greedy allocation actually improved on.
 */
const computeGBFS = (tasks) => {
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
 * SECTION 7/8 — fitness of one full allocation vector: minimize the
 * batch's average latency, normalized against the feasible all-Edge /
 * all-Cloud reference range.
 */
const calculateFitnessBatch = (tasks, allocation, refMin, refMax) => {
  const result = evaluateAllocationBatch(tasks, allocation);
  if (!result.feasible) return { fitness: -1, feasible: false, result };
  const range = refMax - refMin || 1;
  const normalizedLatency = Math.min(1, Math.max(0, (result.latency - refMin) / range));
  return { fitness: +(1 - normalizedLatency).toFixed(4), feasible: true, result };
};

/**
 * SECTION 9 — real binary PSO (per the revision guide) searching the
 * WHOLE task batch at once: each particle's position is a full
 * Edge(0)/Cloud(1) assignment vector, one bit per task, updated via
 * inertia + cognitive + social velocity terms and a sigmoid binary
 * transform, with a seeded RNG for reproducibility. With N tasks the
 * search space is 2^N possible allocations — unlike the single-task
 * case, GBFS's greedy per-task choice and PSO's whole-vector search can
 * now genuinely land on different allocations with different average
 * latencies.
 */
const computePSO = (tasks, iterations = 40, popSize = 2) => {
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
 * machine's own baseline readings by how its CPU utilization compares —
 * there's no per-algorithm telemetry for these fields, so this keeps the
 * numbers internally consistent (lower utilization → lower estimated load).
 */
const deriveAuxMetrics = (m, algoUtil) => {
  const baseCpu = +m?.cpuUtilization || algoUtil || 1;
  const scale = baseCpu ? algoUtil / baseCpu : 1;
  return {
    memory: +((m?.memoryUsage ?? 0) * scale).toFixed(2),
    storage: Math.round((m?.storageUsage ?? m?.taskSize ?? 0) * scale),
    queue: Math.max(0, Math.round((m?.queueLength ?? 0) * scale)),
  };
};

/* ───────────────────────────────────────────────
   HOOK: FETCH MACHINE LIST + PING SERVER HEALTH
─────────────────────────────────────────────── */
function useMachines() {
  const [machineData, setMachineData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [serverStatuses, setServerStatuses] = useState({ A: "checking", B: "checking" });

  const pingServers = useCallback(async () => {
    const results = await Promise.allSettled(
      Object.entries(SERVERS).map(async ([key, srv]) => {
        try {
          await apiFetch(srv.baseUrl, "/health");
          return [key, "online"];
        } catch {
          return [key, "offline"];
        }
      })
    );
    const next = {};
    results.forEach((r) => {
      if (r.status === "fulfilled") {
        const [k, s] = r.value;
        next[k] = s;
      }
    });
    setServerStatuses((prev) => ({ ...prev, ...next }));
  }, []);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(PRIMARY_BASE, "/machines");
      setMachineData(data);
      const firstId = Object.keys(data)[0];
      if (firstId) setSelectedId(firstId);
      setServerStatuses((prev) => ({ ...prev, A: "online" }));
    } catch (err) {
      setError(err.message);
      setServerStatuses((prev) => ({ ...prev, A: "offline" }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMachines();
    pingServers();
  }, [loadMachines, pingServers]);

  return { machineData, loading, error, selectedId, setSelectedId, serverStatuses, loadMachines };
}

/* ───────────────────────────────────────────────
   HOOK: SINGLE SOURCE OF TRUTH FOR OFFLOAD PROGRESS %
─────────────────────────────────────────────── */
function useOffloadProgress(offloading, success) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (offloading) {
      setProgress(5);
      const id = setInterval(() => {
        setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 : p));
      }, 300);
      return () => clearInterval(id);
    }
  }, [offloading]);

  useEffect(() => {
    if (!offloading && success) setProgress(100);
    if (!offloading && !success) setProgress(0);
  }, [offloading, success]);

  return Math.round(progress);
}

/* ───────────────────────────────────────────────
   HOOK: ORCHESTRATES RUNNING GBFS+PSO AND THE OFFLOAD
─────────────────────────────────────────────── */
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function useSimulationRunner({ machine, tasks, workload, setHistory }) {
  const [gbfsData, setGbfsData] = useState(null);
  const [psoData, setPsoData] = useState(null);
  const [algoRunning, setAlgoRunning] = useState(false);
  const [algoError, setAlgoError] = useState(null);
  const [gbfsSim, setGbfsSim] = useState(null);
  const [psoSim, setPsoSim] = useState(null);
  const [gbfsStage, setGbfsStage] = useState(0);
  const [psoIteration, setPsoIteration] = useState(0);
  const [offloadResult, setOffloadResult] = useState(null);
  const [offloading, setOffloading] = useState(false);
  const [offloadError, setOffloadError] = useState(null);

  const revealGBFS = async (result) => {
    setGbfsStage(0);
    await delay(700);
    setGbfsStage(1);
    await delay(1100);
    setGbfsStage(2);
    await delay(1100);
    setGbfsStage(3);
    await delay(900);
    setGbfsStage(4);
    await delay(900);
    setGbfsStage(5);
    setGbfsData(result);
  };

  const revealPSO = async (result) => {
    setPsoIteration(0);
    await delay(700);
    for (let i = 1; i <= result.iterations.length; i++) {
      setPsoIteration(i);
      await delay(1100);
    }
    await delay(600);
    setPsoData(result);
  };

  const offloadTask = async (gbfsOverride, psoOverride) => {
    const g = gbfsOverride ?? gbfsData;
    const p = psoOverride ?? psoData;
    if (!g || !p) return false;
    const gbfsBetter = g.latency <= p.latency;
    const betterApproach = gbfsBetter ? "GBFS" : "PSO";
    const decidedKey = (gbfsBetter ? g : p).recommendedServer;
    const targetSrv = resolveServer(decidedKey);
    const totalTaskSize = tasks.reduce((a, t) => a + t.taskSize, 0);

    setOffloading(true);
    setOffloadError(null);
    try {
      const MIN_OFFLOAD_DISPLAY_MS = 2600;
      const [result] = await Promise.all([
        apiFetch(targetSrv.baseUrl, "/offload", {
          method: "POST",
          body: JSON.stringify({
            machineId: machine.machineId,
            taskSize: +totalTaskSize.toFixed(2),
            algorithm: betterApproach,
            targetServer: targetSrv.label,
            gbfsLatency: g.latency,
            psoLatency: p.latency,
          }),
        }),
        delay(MIN_OFFLOAD_DISPLAY_MS),
      ]);
      setOffloadResult(result);
      setHistory((h) => [
        {
          id: `${Date.now()}`,
          timestamp: new Date().toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          machineName: machine.name,
          machineId: machine.machineId,
          workloadName: `${tasks.length}-task batch (${machine.taskType || machine.category || "Standard Load"})`,
          level: workload ? WORKLOAD_LABELS[workload] : "Live",
          algorithm: betterApproach,
          server: targetSrv.label,
          latency: result.measuredLatency,
          status: result.status === "success" ? "Success" : "Failed",
        },
        ...h,
      ]);
      return result.status === "success";
    } catch (err) {
      setOffloadError(err.message);
      return false;
    } finally {
      setOffloading(false);
    }
  };

  const runBothAlgorithms = async ({ onProgress }) => {
    setAlgoRunning(true);
    setAlgoError(null);
    setGbfsData(null);
    setPsoData(null);
    setGbfsSim(null);
    setPsoSim(null);
    setGbfsStage(0);
    setPsoIteration(0);
    try {
      const gbfsResult = computeGBFS(tasks);
      const psoResult = computePSO(tasks);
      setGbfsSim(gbfsResult);
      setPsoSim(psoResult);

      await Promise.all([revealGBFS(gbfsResult), revealPSO(psoResult)]);
      onProgress?.("algorithms-done");

      const success = await offloadTask(gbfsResult, psoResult);
      if (success) onProgress?.("offload-done");
    } catch (err) {
      setAlgoError(err.message);
    } finally {
      setAlgoRunning(false);
    }
  };

  const retryOffload = async ({ onProgress }) => {
    const success = await offloadTask(gbfsData, psoData);
    if (success) onProgress?.("offload-done");
  };

  const resetRun = () => {
    setGbfsData(null);
    setPsoData(null);
    setOffloadResult(null);
    setGbfsSim(null);
    setPsoSim(null);
    setGbfsStage(0);
    setPsoIteration(0);
    setAlgoError(null);
    setOffloadError(null);
  };

  return {
    gbfsData, psoData, algoRunning, algoError,
    gbfsSim, psoSim, gbfsStage, psoIteration,
    offloadResult, offloading, offloadError,
    runBothAlgorithms, retryOffload, resetRun,
  };
}

/* ───────────────────────────────────────────────
   SHARED UI PRIMITIVES
─────────────────────────────────────────────── */
const Badge = ({ color = "blue", children, dot }) => {
  const T = useT();
  const map = {
    blue: { bg: T.blueBg, border: T.blueDim, text: T.blue },
    green: { bg: T.greenBg, border: T.greenDim, text: T.green },
    purple: { bg: T.purpleBg, border: T.purpleDim, text: T.purple },
    amber: { bg: T.amberBg, border: T.amber, text: T.amber },
    red: { bg: T.redBg, border: T.red, text: T.red },
    dim: { bg: T.elevated, border: T.border, text: T.muted },
  };
  const c = map[color] || map.blue;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "3px 10px", borderRadius: 5,
        fontSize: 14, fontWeight: 600, letterSpacing: "0.02em",
        fontFamily: T.fontMono, lineHeight: 1.3,
        background: c.bg, border: `1px solid ${c.border}`, color: c.text,
        whiteSpace: "nowrap",
      }}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.text, display: "inline-block", flexShrink: 0 }} />}
      {children}
    </span>
  );
};

const Stat = ({ label, value, color = "blue", mono = true }) => {
  const T = useT();
  const map = { blue: T.blue, green: T.green, purple: T.purple, amber: T.amber };
  return (
    <div
      className="app-surface"
      style={{
        flex: "1 1 140px", background: T.surface,
        border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 18px",
        boxShadow: T.bg === "#eef0f5" ? "0 1px 2px rgba(15,17,23,0.05)" : "0 1px 2px rgba(0,0,0,0.18)",
        transition: "border-color 0.15s ease, transform 0.15s ease",
      }}
    >
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.fontSans, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: map[color] || T.text, fontFamily: mono ? T.fontMono : T.fontSans, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{value}</div>
    </div>
  );
};

const Card = ({ title, sub, children, accent }) => {
  const T = useT();
  return (
    <div
      className="app-surface"
      style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 10, marginBottom: 12, overflow: "hidden",
        boxShadow: T.bg === "#eef0f5" ? "0 1px 3px rgba(15,17,23,0.06)" : "0 1px 3px rgba(0,0,0,0.22)",
      }}
    >
      {(title || sub) && (
        <div
          style={{
            padding: "11px 16px", borderBottom: `1px solid ${T.borderSub}`,
            display: "flex", alignItems: "baseline", gap: 10,
            background: T.elevated,
          }}
        >
          {accent && <div style={{ width: 3, height: 16, borderRadius: 2, background: accent, flexShrink: 0 }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: T.fontSans }}>{title}</div>
            {sub && <div style={{ fontSize: 13, color: T.muted, marginTop: 2, fontFamily: T.fontSans, fontWeight: 400 }}>{sub}</div>}
          </div>
        </div>
      )}
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
};

const InfoBox = ({ color = "blue", children }) => {
  const T = useT();
  const map = {
    blue: { bg: T.blueBg, border: T.blueDim, text: T.blue },
    green: { bg: T.greenBg, border: T.greenDim, text: T.green },
    amber: { bg: T.amberBg, border: T.amber, text: T.amber },
    red: { bg: T.redBg, border: T.red, text: T.red },
  };
  const c = map[color] || map.blue;
  return (
    <div
      style={{
        background: c.bg, border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.text}`,
        borderRadius: 7, padding: "12px 16px",
        fontSize: 14, color: c.text, lineHeight: 1.6,
        fontFamily: T.fontSans,
      }}
    >
      {children}
    </div>
  );
};

const ErrBox = ({ children }) => <InfoBox color="red">{children}</InfoBox>;

const TableRow = ({ cells, isOdd }) => {
  const T = useT();
  return (
    <tr className="app-row" style={{ background: isOdd ? T.elevated : T.surface, transition: "background 0.12s ease" }}>
      {cells.map((cell, i) => (
        <td
          key={i}
          style={{
            padding: "11px 16px", borderBottom: `1px solid ${T.borderSub}`,
            fontSize: 14, color: T.text, fontFamily: i === 0 ? T.fontSans : T.fontMono,
            fontWeight: i === 0 ? 500 : 400, verticalAlign: "middle",
          }}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
};

const Th = ({ children }) => {
  const T = useT();
  return (
    <th
      style={{
        padding: "11px 16px", textAlign: "left",
        fontSize: 12, fontWeight: 700, color: T.muted,
        textTransform: "uppercase", letterSpacing: "0.08em",
        borderBottom: `1px solid ${T.border}`,
        background: T.elevated, fontFamily: T.fontSans, whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
};

const PrimaryBtn = ({ onClick, disabled, children }) => {
  const T = useT();
  return (
    <button
      className="app-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? T.elevated : T.green,
        color: disabled ? T.dim : T.bg === "#eef0f5" ? "#ffffff" : "#0d1117",
        border: disabled ? `1px solid ${T.border}` : "none",
        borderRadius: 7, padding: "10px 24px",
        fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: T.fontSans, transition: "transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease",
        letterSpacing: "0.01em",
        boxShadow: disabled ? "none" : "0 1px 2px rgba(0,0,0,0.2)",
      }}
    >
      {children}
    </button>
  );
};

const GhostBtn = ({ onClick, disabled, children }) => {
  const T = useT();
  return (
    <button
      className="app-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent", color: disabled ? T.dim : T.muted,
        border: `1px solid ${disabled ? T.borderSub : T.border}`,
        borderRadius: 7, padding: "10px 24px",
        fontSize: 15, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: T.fontSans, transition: "transform 0.12s ease, background 0.12s ease, color 0.12s ease",
      }}
    >
      {children}
    </button>
  );
};

const DualBtn = ({ onClick, disabled, children }) => {
  const T = useT();
  return (
    <button
      className="app-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? T.elevated : "linear-gradient(135deg, #2563eb, #7c3aed)",
        color: disabled ? T.dim : "#ffffff",
        border: disabled ? `1px solid ${T.border}` : "none",
        borderRadius: 7, padding: "12px 32px",
        fontSize: 16, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: T.fontSans, letterSpacing: "0.01em",
        transition: "transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease",
        boxShadow: disabled ? "none" : "0 2px 8px rgba(37,99,235,0.35)",
      }}
    >
      {children}
    </button>
  );
};

const ToggleSwitch = ({ on, onChange, onColor, label }) => {
  const T = useT();
  return (
    <button
      className="app-btn"
      onClick={() => onChange(!on)}
      style={{ display: "flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}
    >
      <div
        style={{
          position: "relative", width: 44, height: 24, borderRadius: 12,
          background: on ? onColor || T.green : T.elevated,
          border: `1px solid ${on ? onColor || T.green : T.border}`,
          transition: "background 0.2s ease", flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute", top: 2, left: on ? 22 : 2,
            width: 18, height: 18, borderRadius: "50%", background: "#fff",
            transition: "left 0.2s cubic-bezier(.4,0,.2,1)", boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
          }}
        />
      </div>
      {label && <span style={{ fontSize: 15, fontWeight: 600, color: T.text, fontFamily: T.fontSans }}>{label}</span>}
    </button>
  );
};

/* ───────────────────────────────────────────────
   SIDEBAR
─────────────────────────────────────────────── */
const Sidebar = ({ step, maxReached, onJump, serverStatuses }) => {
  const T = useT();
  return (
    <div
      style={{
        width: 220, background: T.bg, display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        flexShrink: 0, borderRight: `1px solid ${T.border}`,
      }}
    >
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 6,
              background: "linear-gradient(135deg, #2563eb, #059669)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, flexShrink: 0,
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: "-0.01em", fontFamily: T.fontSans, lineHeight: 1.3 }}>
              Task Offloading
              <br />
              Simulation System
            </div>
            <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontMono, marginTop: 2 }}>IoT · v5.0</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 12px", flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 8px", marginBottom: 8, fontFamily: T.fontSans }}>
          Pipeline
        </div>
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          const clickable = i <= maxReached;
          return (
            <button
              key={i}
              onClick={() => clickable && onJump(i)}
              className={clickable ? "app-btn" : ""}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 10px", borderRadius: 6, border: "none",
                cursor: clickable ? "pointer" : "default",
                textAlign: "left", marginBottom: 2,
                background: active ? T.elevated : "transparent",
                outline: active ? `1px solid ${T.border}` : "none",
                transition: "background 0.12s ease, transform 0.12s ease",
              }}
              onMouseEnter={(e) => { if (clickable && !active) e.currentTarget.style.background = T.elevated; }}
              onMouseLeave={(e) => { if (clickable && !active) e.currentTarget.style.background = "transparent"; }}
            >
              <div
                style={{
                  width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: done ? 11 : 12, fontWeight: 700, fontFamily: T.fontMono,
                  background: active ? T.green : done ? T.greenDim : T.elevated,
                  color: active ? (T.bg === "#eef0f5" ? "#fff" : "#0d1117") : done ? T.green : T.dim,
                  border: `1px solid ${active ? T.green : done ? T.greenDim : T.border}`,
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15, fontWeight: active ? 600 : 400,
                    color: active ? T.text : done ? T.muted : T.dim,
                    fontFamily: T.fontSans, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                >
                  {s.title}
                </div>
              </div>
              {active && <div style={{ width: 3, height: 14, borderRadius: 2, background: T.green, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "12px 16px 20px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: T.fontSans }}>
          Servers
        </div>
        {Object.entries(SERVERS).map(([key, srv]) => {
          const st = serverStatuses[key];
          const online = st === "online";
          return (
            <div
              key={key}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", borderRadius: 6, marginBottom: 4,
                background: T.elevated, border: `1px solid ${T.borderSub}`,
              }}
            >
              <div
                style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: online ? T.green : st === "checking" ? T.amber : T.red,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.text, fontFamily: T.fontMono, lineHeight: 1 }}>{srv.label}</div>
                <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontMono, marginTop: 2 }}>
                  {online ? "online" : st === "checking" ? "pinging…" : "offline"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────
   TOP BAR
─────────────────────────────────────────────── */
const TopBar = ({ step, maxReached, onJump, algoDecision, dark, setDark, workload }) => {
  const T = useT();

  const srv = algoDecision ? resolveServer(algoDecision) : null;
  const srvAccent = algoDecision === "A" ? T.blue : T.green;
  const srvAccentBg = algoDecision === "A" ? T.blueBg : T.greenBg;
  const srvAccentDim = algoDecision === "A" ? T.blueDim : T.greenDim;

  return (
    <div
      style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "0 24px", minHeight: 52, display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        boxShadow: T.bg === "#eef0f5" ? "0 1px 3px rgba(15,17,23,0.05)" : "0 1px 3px rgba(0,0,0,0.25)",
        position: "relative", zIndex: 5,
      }}
    >
      <span style={{ fontSize: 15, color: T.muted, fontFamily: T.fontSans }}>Simulation</span>
      <span style={{ color: T.border, fontSize: 15 }}>›</span>
      <span style={{ fontSize: 15, color: T.text, fontWeight: 600, fontFamily: T.fontSans }}>{STEPS[step].title}</span>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 16, overflow: "hidden" }}>
        {STEPS.map((s, i) => {
          const active = i === step;
          const done = i < step;
          const clickable = i <= maxReached;
          return (
            <React.Fragment key={i}>
              <button
                onClick={() => clickable && onJump(i)}
                className={clickable ? "app-btn" : ""}
                style={{
                  padding: "3px 10px", borderRadius: 4, fontSize: 14, fontWeight: active ? 700 : 400,
                  fontFamily: T.fontMono,
                  background: active ? T.greenBg : done ? T.elevated : "transparent",
                  color: active ? T.green : done ? T.muted : T.dim,
                  border: `1px solid ${active ? T.greenDim : done ? T.border : "transparent"}`,
                  cursor: clickable ? "pointer" : "default",
                  whiteSpace: "nowrap",
                }}
              >
                {done ? "✓ " : ""}
                {s.short}
              </button>
              {i < STEPS.length - 1 && <span style={{ color: T.border, fontSize: 13 }}>—</span>}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {workload && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 14,
              fontFamily: T.fontMono,
              color: workload === "high" ? T.red : workload === "medium" ? T.amber : T.green,
              background: workload === "high" ? T.redBg : workload === "medium" ? T.amberBg : T.greenBg,
              border: `1px solid ${T.border}`,
              borderRadius: 4, padding: "3px 10px",
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.7 }}>workload →</span>
            {WORKLOAD_LABELS[workload]}
          </div>
        )}
        {srv && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 14,
              fontFamily: T.fontMono, color: srvAccent,
              background: srvAccentBg, border: `1px solid ${srvAccentDim}`,
              borderRadius: 4, padding: "3px 10px",
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.7 }}>algo →</span>
            {srv.icon} {srv.label}
          </div>
        )}
        <div style={{ fontSize: 14, fontFamily: T.fontMono, color: T.muted, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 4, padding: "3px 10px" }}>
          {step + 1} / {STEPS.length}
        </div>
        <button
          className="app-btn"
          onClick={() => setDark((d) => !d)}
          title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: T.elevated, border: `1px solid ${T.border}`,
            borderRadius: 20, padding: "5px 12px 5px 8px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{dark ? "🌙" : "☀️"}</span>
          <div style={{ position: "relative", width: 34, height: 19, borderRadius: 10, background: dark ? T.green : T.blue, transition: "background 0.25s", flexShrink: 0, opacity: 0.85 }}>
            <div
              style={{
                position: "absolute", top: 3, left: dark ? 16 : 3,
                width: 13, height: 13, borderRadius: "50%",
                background: "#ffffff",
                transition: "left 0.25s cubic-bezier(.4,0,.2,1)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
              }}
            />
          </div>
          <span style={{ fontSize: 14, color: T.muted, fontFamily: T.fontMono, userSelect: "none", minWidth: 28 }}>{dark ? "Dark" : "Light"}</span>
        </button>
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────
   PERSISTENT LIVE PIPELINE STRIP
─────────────────────────────────────────────── */
const MainSimulationPipeline = ({ activeIdx }) => {
  const T = useT();
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 0, marginBottom: 16,
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
        padding: "10px 14px", overflowX: "auto",
      }}
    >
      {PIPELINE_STAGES.map((label, i) => {
        const done = i < activeIdx;
        const active = i === activeIdx;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div style={{ width: 20, height: 1, background: done || active ? T.green : T.border, margin: "0 6px", flexShrink: 0 }} />}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 20,
                background: active ? T.blueBg : done ? T.greenBg : T.elevated,
                border: `1px solid ${active ? T.blue : done ? T.green : T.border}`,
                flexShrink: 0,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? T.blue : done ? T.green : T.dim, flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 13, fontFamily: T.fontMono, whiteSpace: "nowrap",
                  color: active ? T.blue : done ? T.green : T.dim,
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ───────────────────────────────────────────────
   WORKLOAD TIER SELECTOR + SELECTED WORKLOAD CARD
─────────────────────────────────────────────── */
const WorkloadSelector = ({ machineId, workload, setWorkload }) => {
  const T = useT();
  const hasTiers = !!WORKLOAD_TIERS[machineId];
  if (!hasTiers) return null;

  const options = [
    { key: null, label: "Live Data" },
    { key: "low", label: "Low" },
    { key: "medium", label: "Medium" },
    { key: "high", label: "High" },
  ];
  const tierColor = { low: T.green, medium: T.amber, high: T.red };

  return (
    <Card title="Workload Level" sub={`${machineId} · Live Data or assigned Low / Medium / High parameter sets`} accent={T.purple}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((opt) => {
          const active = workload === opt.key;
          const color = opt.key ? tierColor[opt.key] : T.blue;
          return (
            <button
              key={opt.label}
              className="app-btn"
              onClick={() => setWorkload(opt.key)}
              style={{
                flex: "1 1 110px", padding: "10px 14px", borderRadius: 7,
                border: `1px solid ${active ? color : T.border}`,
                background: active ? `${color}22` : T.elevated,
                color: active ? color : T.muted,
                fontFamily: T.fontSans, fontWeight: active ? 700 : 500, fontSize: 14,
                cursor: "pointer",
              }}
            >
              {active && "✓ "}
              {opt.label}
            </button>
          );
        })}
      </div>
      {workload && (
        <div style={{ marginTop: 12 }}>
          <InfoBox color={workload === "high" ? "red" : workload === "medium" ? "amber" : "green"}>
            Running the <strong>{WORKLOAD_LABELS[workload]}</strong> workload scenario — task parameters below reflect this tier instead of the live-fetched values.
          </InfoBox>
        </div>
      )}
    </Card>
  );
};

const SelectedWorkloadCard = ({ machine: m, workload }) => {
  const T = useT();
  if (!m) return null;
  const priority = workload ? WORKLOAD_PRIORITY[workload] : "Live";
  const label = workload ? WORKLOAD_LABELS[workload] : "Live Data";
  const color = workload === "high" ? T.red : workload === "medium" ? T.amber : workload === "low" ? T.green : T.blue;

  const fields = [
    ["Workload", label],
    ["Machine", `${m.name} (${m.machineId})`],
    ["CPU Requirement", `${m.cpuUtilization}%`],
    ["Memory Requirement", `${m.memoryUsage} GB`],
    ["Data Size", `${m.taskSize} MB`],
    ["Estimated Processing Time", `${m.processingTime} ms`],
    ["Priority", priority],
    ["Queue Length", `${m.queueLength} tasks`],
  ];

  return (
    <Card title="Selected Workload" sub="Updates live with the workload tier you choose" accent={color}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {fields.map(([l, v]) => (
          <div key={l} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans }}>{l}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: l === "Workload" ? color : T.text, fontFamily: T.fontMono }}>{v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

/* ───────────────────────────────────────────────
   STEP 0: SELECT MACHINE
─────────────────────────────────────────────── */
const getMachineImg = (mc) => {
  const name = (mc.name || mc.machineId || "").toLowerCase();
  if (name.includes("cnc plasma")) return "/images/plasma.png";
  if (name.includes("plasma cut")) return "/images/plasmacut.png";
  const categoryMap = {
    "Cutting Machines": "/images/shearing.png",
    "Welding Machines": "/images/welding.png",
    "Finishing Machines": "/images/paint.png",
  };
  return categoryMap[mc.category] || "/images/default.jpg";
};

const Step0Machine = ({ machineData, loading, error, selectedId, setSelectedId, onRetry }) => {
  const T = useT();
  const machines = Object.values(machineData);
  const m = machineData[selectedId];

  if (loading) {
    return (
      <Card title="Loading Machines" sub="Fetching from Supabase via Server A">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "24px 0", color: T.muted, fontFamily: T.fontSans, fontSize: 16 }}>
          <div style={{ width: 16, height: 16, border: `2px solid ${T.blue}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Connecting to edge…
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <div>
        <ErrBox>Connection failed — {error}</ErrBox>
        <div style={{ marginTop: 12 }}>
          <PrimaryBtn onClick={onRetry}>Retry</PrimaryBtn>
        </div>
      </div>
    );
  }

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
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>
          Choose a registered device. The algorithms will automatically decide which server processes its task.
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {cats.map((c) => (
          <Stat key={c.label} label={c.label} value={c.value} color={c.color} />
        ))}
      </div>

      <Card title="Registered Devices" sub="Live data from Supabase" accent={T.blue}>
        <div className="app-grid-eq" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {machines.map((mc) => {
            const sel = selectedId === mc.id;
            return (
              <div
                key={mc.id}
                onClick={() => setSelectedId(mc.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(mc.id); } }}
                className="app-clickable"
                style={{
                  border: `2px solid ${sel ? T.green : T.border}`,
                  borderRadius: 10, overflow: "hidden",
                  background: sel ? T.greenBg : T.elevated,
                  boxShadow: sel ? `0 0 0 1px ${T.green}` : "none",
                }}
              >
                <div style={{ position: "relative", width: "100%", height: 110, overflow: "hidden", background: T.bg }}>
                  <img src={getMachineImg(mc)} alt={mc.name} onError={(e) => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }} />
                  {sel && (
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <Badge color="green" dot>selected</Badge>
                    </div>
                  )}
                  {WORKLOAD_TIERS[mc.machineId] && (
                    <div style={{ position: "absolute", top: 8, left: 8 }}>
                      <Badge color="purple" dot>tiers</Badge>
                    </div>
                  )}
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
          <div style={{ width: "100%", height: 180, borderRadius: 8, overflow: "hidden", marginBottom: 16, position: "relative", background: T.bg }}>
            <img src={getMachineImg(m)} alt={m.name} onError={(e) => { e.target.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)" }} />
            <div style={{ position: "absolute", bottom: 14, left: 16 }}>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: T.fontSans, textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>{m.name}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", fontFamily: T.fontMono, marginTop: 3 }}>{m.category}</div>
            </div>
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <Badge color="green" dot>{m.machineId}</Badge>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[["Machine ID", m.machineId, "blue"], ["Category", m.category, "dim"], ["Task Type", m.taskType, "amber"]].map(([l, v, c]) => (
              <div key={l} style={{ flex: "1 1 160px", background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 13, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.fontSans }}>{l}</div>
                <Badge color={c}>{v}</Badge>
              </div>
            ))}
          </div>
          <InfoBox color="green">
            <strong>{m.machineId}</strong> selected — proceed to collect task parameters.
          </InfoBox>
        </Card>
      )}
    </div>
  );
};

/* ───────────────────────────────────────────────
   STEP 1: COLLECT DATA
─────────────────────────────────────────────── */
const TaskBatchPreviewTable = ({ tasks }) => {
  const T = useT();
  if (!tasks?.length) return null;
  const totalSize = tasks.reduce((a, t) => a + t.taskSize, 0);
  const avgSize = totalSize / tasks.length;
  return (
    <Card title="Generated Task Batch" sub="What GBFS + PSO will actually run against — scaled from the reference size above via a fixed multiplier spread" accent={T.purple}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <Stat label="Task Count" value={tasks.length} color="purple" />
        <Stat label="Total Batch Size" value={`${totalSize.toFixed(1)} MB`} color="blue" />
        <Stat label="Avg Task Size" value={`${avgSize.toFixed(2)} MB`} color="green" />
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

const Step1CollectData = ({ machine: m, workload, setWorkload, tasks }) => {
  const T = useT();
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>Task Parameters</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>
          {workload ? (
            <>
              Showing the <strong style={{ color: T.text }}>{WORKLOAD_LABELS[workload]}</strong> workload for <strong style={{ color: T.text }}>{m.name} ({m.machineId})</strong>.
            </>
          ) : (
            <>
              Live data fetched for <strong style={{ color: T.text }}>{m.name} ({m.machineId})</strong>.
            </>
          )}{" "}
          This reference size is scaled into a batch of {tasks?.length || 0} tasks below — GBFS and PSO both run against that same batch.
        </p>
      </div>

      <WorkloadSelector machineId={m.machineId} workload={workload} setWorkload={setWorkload} />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Stat label="Reference Task Size" value={`${m.taskSize} MB`} color="blue" />
        <Stat label="Processing Time" value={`${m.processingTime} ms`} color="green" />
        <Stat label="Bandwidth" value={`${m.bandwidth} Mbps`} color="purple" />
        <Stat label="Energy Utilization" value={`${m.energyConsumption} kWh`} color="amber" />
      </div>

      <Card title="Parameter Table" sub={`${m.machineId} · ${workload ? `${WORKLOAD_LABELS[workload]} workload` : "Supabase"} — Current System baseline, for comparison only` } accent={T.blue}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Parameter</Th>
              <Th>Value</Th>
              <Th>Description</Th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Machine ID", m.machineId, "Unique device identifier"],
              ["Task Size", `${m.taskSize} MB`, "Data generated per task"],
              ["Processing Time", `${m.processingTime} ms`, "Local processing time"],
              ["Queue Length", m.queueLength, "Pending task count"],
              ["CPU Utilization", `${m.cpuUtilization}%`, "Edge node load"],
              ["Memory Usage", `${m.memoryUsage} GB`, "RAM consumed"],
              ["Bandwidth", `${m.bandwidth} Mbps`, "Communication speed"],
              ["Transmission Delay", `${m.transmissionDelay} ms`, "Network delay"],
              ["Energy Utilization", `${m.energyConsumption} kWh`, "Energy per cycle"],
              ["Throughput", `${m.throughput} tasks/min`, "Task completion rate"],
              ["Avg Latency", `${m.avgLatency} ms`, "End-to-end delay"],
            ].map(([p, v, d], i) => (
              <TableRow
                key={p}
                isOdd={i % 2 === 1}
                cells={[
                  <span style={{ fontFamily: T.fontSans, color: T.text }}>{p}</span>,
                  <Badge color="blue">{v}</Badge>,
                  <span style={{ color: T.muted, fontFamily: T.fontSans }}>{d}</span>,
                ]}
              />
            ))}
          </tbody>
        </table>
      </Card>

      <TaskBatchPreviewTable tasks={tasks} />

      <SelectedWorkloadCard machine={m} workload={workload} />

      <InfoBox color="green">
        Batch ready — GBFS will allocate each task sequentially against the running Edge/Cloud load, and PSO will search whole-batch Edge/Cloud assignments at once.
      </InfoBox>
    </div>
  );
};

/* ───────────────────────────────────────────────
   STEP 2: GBFS / PSO EXECUTION PANELS
─────────────────────────────────────────────── */
const TermLine = ({ children, done, color }) => {
  const T = useT();
  return (
    <div style={{ fontFamily: T.fontMono, fontSize: 13, color: done ? color || T.green : T.muted, marginBottom: 3, lineHeight: 1.6 }}>
      {done ? "✓ " : "… "}
      {children}
    </div>
  );
};

const StepPipeline = ({ steps, activeIdx, activeColor, activeText }) => {
  const T = useT();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", fontFamily: T.fontMono, fontSize: 12, marginBottom: 12 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <span
            style={{
              padding: "4px 9px", borderRadius: 5,
              border: `1px solid ${i === activeIdx ? activeColor : T.borderSub}`,
              background: i === activeIdx ? activeColor : "transparent",
              color: i === activeIdx ? activeText : T.dim,
              fontWeight: i === activeIdx ? 700 : 400,
            }}
          >
            {s}
          </span>
          {i < steps.length - 1 && <span style={{ color: T.dim }}>→</span>}
        </React.Fragment>
      ))}
    </div>
  );
};

const EvalTh = ({ children }) => {
  const T = useT();
  return (
    <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: T.dim, padding: "5px 8px", borderBottom: `1px solid ${T.borderSub}`, fontFamily: T.fontSans, fontWeight: 600 }}>
      {children}
    </th>
  );
};

const GBFSExecutionPanel = ({ machine: m, sim, stage }) => {
  const T = useT();
  if (!sim) return null;
  const srv = resolveServer(sim.recommendedServer);
  const pipelineIdx = [0, 1, 2, 2, 3, 5][stage] ?? -1;

  const rows = [
    { key: "A", label: resolveServer("A").label, visible: stage >= 2, active: stage === 2, selected: stage >= 5 && sim.recommendedServer === "A", data: sim.candidates.A },
    { key: "B", label: resolveServer("B").label, visible: stage >= 3, active: stage === 3, selected: stage >= 5 && sim.recommendedServer === "B", data: sim.candidates.B },
  ];

  return (
    <Card title="GBFS Execution Simulation" sub="Greedy Best-First Search — single-pass, immediate best choice" accent={T.blue}>
      <StepPipeline steps={GBFS_STEPS} activeIdx={pipelineIdx} activeColor={T.blue} activeText={T.bg === "#eef0f5" ? "#fff" : "#0d1117"} />
      <TermLine done={stage >= 1}>Analyzing selected workload ({m.machineId})...</TermLine>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <EvalTh>Node</EvalTh>
            <EvalTh>Est. Latency</EvalTh>
            <EvalTh>Proc. Time</EvalTh>
            <EvalTh>Resource Avail.</EvalTh>
            <EvalTh>Heuristic Score</EvalTh>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} style={{ background: r.selected ? T.blueBg : r.active ? T.elevated : "transparent" }}>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.text, fontWeight: r.selected ? 700 : 400, borderBottom: `1px solid ${T.borderSub}` }}>{r.label}</td>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{r.visible ? `${r.data.latency} ms` : "—"}</td>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{r.visible ? `${r.data.time} ms` : "—"}</td>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{r.visible ? `${r.data.resourceAvailability}%` : "—"}</td>
              <td style={{ padding: "7px 8px", fontFamily: T.fontMono, fontSize: 13, color: r.selected ? T.blue : T.muted, fontWeight: r.selected ? 700 : 400, borderBottom: `1px solid ${T.borderSub}` }}>{r.visible ? r.data.heuristicScore : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TermLine done={stage >= 4} color={T.blue}>Comparing server performance...</TermLine>
      <TermLine done={stage >= 5} color={T.blue}>Selecting best heuristic option...</TermLine>

      {stage >= 5 && (
        <div style={{ marginTop: 12, background: T.blueBg, border: `1px solid ${T.blueDim}`, borderLeft: `3px solid ${T.blue}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 13, color: T.blue, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans, marginBottom: 6 }}>Final GBFS Result</div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Server: <strong>{srv.icon} {srv.label}</strong></div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Latency: <strong>{sim.latency} ms</strong></div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Processing Time: <strong>{sim.time} ms</strong></div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Resource Utilization: <strong>{sim.utilization}%</strong></div>
          <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, marginTop: 6 }}>{sim.decisionReason}</div>
        </div>
      )}
    </Card>
  );
};

const PSOTrack = ({ row }) => {
  const T = useT();
  const bestX = (row?.bestX ?? 0) * 100;
  return (
    <div style={{ position: "relative", height: 56, background: T.bg, border: `1px solid ${T.borderSub}`, borderRadius: 8, margin: "8px 0 4px" }}>
      <div style={{ position: "absolute", top: 4, left: "0%", fontSize: 10, fontFamily: T.fontMono, color: T.dim }}>Edge A</div>
      <div style={{ position: "absolute", top: 4, right: "0%", fontSize: 10, fontFamily: T.fontMono, color: T.dim }}>Cloud B</div>
      {row && (
        <>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${bestX}%`, width: 2, background: T.amber, boxShadow: `0 0 6px ${T.amber}`, transition: "left 0.4s ease" }} />
          <div style={{ position: "absolute", top: 24, left: `calc(${row.particleA.x * 100}% - 5px)`, width: 11, height: 11, borderRadius: "50%", background: T.purple, boxShadow: `0 0 8px ${T.purple}`, transition: "left 0.4s cubic-bezier(.4,0,.2,1)" }} />
          <div style={{ position: "absolute", top: 38, left: `calc(${row.particleB.x * 100}% - 5px)`, width: 11, height: 11, borderRadius: "50%", background: T.purple, opacity: 0.7, boxShadow: `0 0 8px ${T.purple}`, transition: "left 0.4s cubic-bezier(.4,0,.2,1)" }} />
        </>
      )}
    </div>
  );
};

const PSOExecutionPanel = ({ machine: m, sim, iteration }) => {
  const T = useT();
  if (!sim) return null;
  const done = iteration >= sim.iterations.length;
  const srv = resolveServer(sim.recommendedServer);
  const currentRow = iteration > 0 ? sim.iterations[iteration - 1] : null;
  const pipelineIdx = done ? PSO_STEPS.length - 1 : iteration === 0 ? 0 : Math.min(PSO_STEPS.length - 2, 1 + Math.floor(((iteration - 1) / sim.iterations.length) * 4));

  return (
    <Card title="PSO Execution Simulation" sub="Particle Swarm Optimization — iterative convergence" accent={T.purple}>
      <StepPipeline steps={PSO_STEPS} activeIdx={pipelineIdx} activeColor={T.purple} activeText="#2a0016" />

      <div style={{ fontFamily: T.fontMono, fontSize: 12, color: T.muted }}>
        {currentRow ? (
          <>
            Iteration <strong style={{ color: T.purple }}>{currentRow.iteration}</strong> / {sim.iterations.length} · global best fitness <strong style={{ color: T.purple }}>{currentRow.bestFitness}</strong> → {resolveServer(currentRow.bestX < 0.5 ? "A" : "B").label}
          </>
        ) : (
          "Awaiting task…"
        )}
      </div>
      <PSOTrack row={currentRow} />

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
        <thead>
          <tr>
            <EvalTh>Particle</EvalTh>
            <EvalTh>Position (x)</EvalTh>
            <EvalTh>Fitness</EvalTh>
            <EvalTh>Leaning</EvalTh>
          </tr>
        </thead>
        <tbody>
          {currentRow ? (
            [
              { name: "P1", ...currentRow.particleA },
              { name: "P2", ...currentRow.particleB },
            ].map((p) => (
              <tr key={p.name}>
                <td style={{ padding: "6px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.text, borderBottom: `1px solid ${T.borderSub}` }}>{p.name}</td>
                <td style={{ padding: "6px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{p.x}</td>
                <td style={{ padding: "6px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{p.fitness}</td>
                <td style={{ padding: "6px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderSub}` }}>{resolveServer(p.x < 0.5 ? "A" : "B").label}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ padding: "10px 8px", fontFamily: T.fontMono, fontSize: 13, color: T.dim }}>—</td>
            </tr>
          )}
        </tbody>
      </table>

      {done && (
        <div style={{ marginTop: 12, background: T.purpleBg, border: `1px solid ${T.purpleDim}`, borderLeft: `3px solid ${T.purple}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 13, color: T.purple, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans, marginBottom: 6 }}>Final PSO Result</div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Server: <strong>{srv.icon} {srv.label}</strong></div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Latency: <strong>{sim.latency} ms</strong></div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Processing Time: <strong>{sim.time} ms</strong></div>
          <div style={{ fontSize: 15, fontFamily: T.fontMono, color: T.text }}>Resource Utilization: <strong>{sim.utilization}%</strong></div>
          <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, marginTop: 6 }}>{sim.decisionReason}</div>
        </div>
      )}
    </Card>
  );
};

/* ───────────────────────────────────────────────
   STEP 2: LIVE PERFORMANCE LINE GRAPHS
─────────────────────────────────────────────── */
const PerformanceLineGraph = ({ title, color, data }) => {
  const T = useT();
  return (
    <Card title={title} sub="Latency (ms) — lower is better" accent={color}>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="step" stroke={T.dim} fontSize={11} fontFamily={T.fontSans} />
          <YAxis stroke={T.dim} fontSize={11} fontFamily={T.fontMono} domain={["auto", "auto"]} />
          <Tooltip contentStyle={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, fontFamily: T.fontMono, fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

const buildGbfsGraphData = (m, sim, stage) => {
  const baseline = m?.avgLatency != null ? +m.avgLatency : sim ? sim.candidates.A.latency : 100;
  if (!sim) return GBFS_GRAPH_STEPS.map((step) => ({ step, value: baseline }));

  const aLat = sim.candidates.A.latency;
  const bLat = sim.candidates.B.latency;
  const bestAB = Math.min(aLat, bLat);
  const values = [baseline, baseline, aLat, bestAB, bestAB, sim.latency];
  const count = Math.max(1, stage + 1);
  return GBFS_GRAPH_STEPS.slice(0, count).map((step, i) => ({ step, value: values[i] }));
};

const buildPsoGraphData = (m, sim, iteration) => {
  const baseline = m?.avgLatency != null ? +m.avgLatency : 100;
  if (!sim) return Array.from({ length: 4 }, (_, i) => ({ step: `Iter ${i + 1}`, value: baseline }));

  let running = Infinity;
  const pts = [];
  for (let i = 0; i < iteration && i < sim.iterations.length; i++) {
    const row = sim.iterations[i];
    running = Math.min(running, row.particleA.latency, row.particleB.latency);
    pts.push({ step: `Iter ${row.iteration}`, value: +running.toFixed(2) });
  }
  if (pts.length === 0) pts.push({ step: "Iter 1", value: baseline });
  return pts;
};

/* ───────────────────────────────────────────────
   STEP 2: RUN ALGORITHMS
─────────────────────────────────────────────── */
const serverLabel = (key) => (key ? resolveServer(key).label : "—");

const Step2Algorithms = ({
  machine: m, tasks, gbfsData, psoData, algoRunning, algoError,
  onRunBoth, gbfsSim, psoSim, gbfsStage, psoIteration,
  offloading, offloadResult, offloadError, onRetryOffload, workload,
}) => {
  const T = useT();
  const bothDone = !!gbfsData && !!psoData;
  const resultsRef = React.useRef(null);
  const offloadProgress = useOffloadProgress(offloading, offloadResult?.status === "success");

  React.useEffect(() => {
    if (bothDone && resultsRef.current) {
      setTimeout(() => resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  }, [bothDone]);

  if (!tasks || tasks.length === 0) {
    return <Card><InfoBox color="amber">Generate a task batch first (Step 2).</InfoBox></Card>;
  }

  const gbfsWins = bothDone && gbfsData.latency <= psoData.latency;
  const winnerData = bothDone ? (gbfsWins ? gbfsData : psoData) : null;
  const winnerAlgo = bothDone ? (gbfsWins ? "GBFS" : "PSO") : null;
  const decidedServer = winnerData?.recommendedServer ?? (gbfsWins ? gbfsData?.recommendedServer : psoData?.recommendedServer);
  const totalTaskSize = tasks.reduce((a, t) => a + t.taskSize, 0);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>Algorithm Execution</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>
          <strong style={{ color: T.text }}>GBFS</strong> and <strong style={{ color: T.text }}>PSO</strong> each receive the same {tasks.length}-task batch and independently allocate every task to Edge Server A or Cloud Server B — GBFS greedily, task by task; PSO by searching whole allocation vectors at once.
          Whichever achieves the lower average latency across the batch is dispatched.
        </p>
      </div>

      <Card title="Decision Logic" sub="How the server is chosen" accent={T.purple}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { icon: "📊", label: "Input", desc: `Task parameters from ${m.machineId} are fed into both algorithms.` },
            { icon: "🧮", label: "Evaluate", desc: "Each algorithm scores Edge Server A and Cloud Server B against latency, energy, and throughput constraints." },
            { icon: "🏆", label: "Decide", desc: "Each algorithm returns its recommended target. The algorithm with lower latency wins; its choice is final." },
            { icon: "📤", label: "Offload", desc: "The task is dispatched to the algorithm-chosen server automatically." },
          ].map((item, i) => (
            <div key={i} style={{ flex: "1 1 160px", background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ fontSize: 21, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.fontSans, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 14, color: T.muted, fontFamily: T.fontSans, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
        <PerformanceLineGraph title="GBFS Performance" color={T.blue} data={buildGbfsGraphData(m, gbfsSim, gbfsStage)} />
        <PerformanceLineGraph title="PSO Performance" color={T.purple} data={buildPsoGraphData(m, psoSim, psoIteration)} />
      </div>

      <Card title="Execution Pipeline" sub="Both algorithms run in sequence" accent={T.blue}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0, paddingBottom: 16, justifyContent: "center" }}>
          {[
            { icon: "⚙", label: m.machineId, sub: "IoT Source", done: true, running: false },
            { icon: "⚙", label: "GBFS + PSO ", sub: "Greedy Best-First + Particle Swarm", done: !!gbfsData, running: algoRunning && !gbfsData },
            { icon: "≋", label: "Compare", sub: "Pick best algo", done: bothDone, running: false },
            { icon: "🖥", label: decidedServer ? resolveServer(decidedServer).label : "Server?", sub: "Algo decision", done: bothDone, running: false },
          ].map((node, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <div style={{ display: "flex", alignItems: "center", padding: "0 6px", flexShrink: 0 }}>
                  <div style={{ width: 20, height: 1, background: T.border }} />
                  <span style={{ color: T.muted, fontSize: 13 }}>▶</span>
                </div>
              )}
              <div
                style={{
                  flex: "0 0 auto", width: 104,
                  border: `1px solid ${node.done ? T.green : node.running ? T.blue : T.border}`,
                  borderRadius: 8, padding: "12px 10px", textAlign: "center",
                  background: node.done ? T.greenBg : node.running ? T.blueBg : T.elevated,
                }}
              >
                <div style={{ fontSize: 19, marginBottom: 4 }}>{node.running ? "⟳" : node.done ? "✓" : node.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: node.done ? T.green : node.running ? T.blue : T.text, fontFamily: T.fontMono }}>{node.label}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 3, fontFamily: T.fontSans }}>{node.running ? "running…" : node.sub}</div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {algoError && (
          <div style={{ marginBottom: 16 }}>
            <ErrBox>Run failed — {algoError}</ErrBox>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
          <DualBtn disabled={algoRunning || bothDone} onClick={onRunBoth}>
            {algoRunning ? "Algorithms running…" : bothDone ? "✓ Algorithms Complete" : "Run GBFS + PSO"}
          </DualBtn>
          {bothDone && !algoRunning && <GhostBtn onClick={onRunBoth}>↺ Re-run</GhostBtn>}
        </div>
      </Card>

      {(algoRunning || gbfsSim) && (
        <div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
          <GBFSExecutionPanel machine={m} sim={gbfsSim} stage={gbfsStage} />
          <PSOExecutionPanel machine={m} sim={psoSim} iteration={psoIteration} />
        </div>
      )}

      {bothDone && (
        <div ref={resultsRef}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { abbr: "GBFS", full: "Greedy Best-First Search", color: T.blue, bg: T.blueBg, border: T.blueDim, desc: "Selects the locally optimal path at each step using a heuristic. Fast execution, deterministic output." },
              { abbr: "PSO", full: "Particle Swarm Optimization", color: T.purple, bg: T.purpleBg, border: T.purpleDim, desc: "Bio-inspired swarm algorithm that iteratively refines candidate solutions. Finds global optima more reliably." },
            ].map(({ abbr, full, color, bg, border, desc }) => (
              <div key={abbr} style={{ flex: "1 1 240px", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, minWidth: 48, textAlign: "center", background: color, borderRadius: 6, padding: "6px 4px" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: T.fontMono, lineHeight: 1 }}>{abbr}</div>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: T.fontSans, marginBottom: 3 }}>{full}</div>
                  <div style={{ fontSize: 14, color: T.muted, fontFamily: T.fontSans, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { algo: "GBFS", full: "Greedy Best-First Search", color: T.blue, bg: gbfsWins ? T.blueBg : T.elevated, border: gbfsWins ? T.blue : T.border, data: gbfsData, wins: gbfsWins, badgeColor: "blue" },
              { algo: "PSO", full: "Particle Swarm Optimization", color: T.purple, bg: !gbfsWins ? T.purpleBg : T.elevated, border: !gbfsWins ? T.purple : T.border, data: psoData, wins: !gbfsWins, badgeColor: "purple" },
            ].map(({ algo, full, color, bg, border, data, wins, badgeColor }) => (
              <div key={algo} style={{ flex: "1 1 240px", border: `1px solid ${border}`, borderRadius: 8, padding: "18px 20px", background: bg }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.fontSans }}>{algo}</span>
                  {wins && <Badge color={badgeColor} dot>WINNER</Badge>}
                </div>
                <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, marginBottom: 14 }}>{full}</div>

                <div style={{ marginBottom: 12, padding: "10px 12px", background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6 }}>
                  <div style={{ fontSize: 13, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.fontSans }}>Server Decision</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>{resolveServer(data.recommendedServer)?.icon ?? "🖥"}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, fontFamily: T.fontMono, color }}>{serverLabel(data.recommendedServer)}</span>
                  </div>
                  {data.decisionReason && <div style={{ fontSize: 13, color: T.muted, marginTop: 4, fontFamily: T.fontSans, lineHeight: 1.4 }}>{data.decisionReason}</div>}
                </div>

                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.fontMono, marginBottom: 4 }}>{algo} Performance Summary</div>

                {[["Latency", `${data.latency} ms`], ["Processing Time", `${data.time} ms`], ["Resource Utilization", `${data.utilization}%`]].map(([l, v]) => (
                  <div key={l} style={{ padding: "10px 0", borderTop: `1px solid ${T.borderSub}` }}>
                    <div style={{ fontSize: 14, color: T.muted, fontFamily: T.fontMono, marginBottom: 5 }}>{l}</div>
                    <div style={{ fontSize: 17, fontFamily: T.fontMono, color: T.text, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ background: T.greenBg, border: `1px solid ${T.greenDim}`, borderLeft: `3px solid ${T.green}`, borderRadius: 8, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>{resolveServer(decidedServer)?.icon ?? "🖥"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: T.fontSans }}>
                {serverLabel(decidedServer)}
                <span style={{ fontWeight: 400, color: T.muted }}> — chosen by the algorithms</span>
              </div>
              <div style={{ fontSize: 15, color: T.muted, marginTop: 4, fontFamily: T.fontSans }}>
                Winning algorithm: <strong style={{ color: gbfsWins ? T.blue : T.purple }}>{winnerAlgo}</strong> — latency <strong style={{ color: T.green, fontFamily: T.fontMono }}>{Math.min(+gbfsData.latency, +psoData.latency)} ms</strong>
              </div>
            </div>
            <Badge color="green" dot>algorithm decision</Badge>
          </div>
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <InfoBox color="green">
              Both algorithms complete. Winner: <strong>{winnerAlgo}</strong> ({Math.min(+gbfsData.latency, +psoData.latency)} ms). Recommended target: <strong>{serverLabel(decidedServer)}</strong>.{" "}
              {offloadResult?.status === "success" ? "Offload complete — click Next to view the latency results." : "Automatically offloading now…"}
            </InfoBox>
          </div>

          <ProcessingNodeComparison gbfsData={gbfsData} decidedKey={decidedServer} winnerAlgo={winnerAlgo} />
          <div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
            <TaskPayloadCard m={m} workload={workload} decidedSrv={resolveServer(decidedServer)} progress={offloadProgress} success={offloadResult?.status === "success"} batchSize={totalTaskSize} taskCount={tasks.length} />
            <ExecutionTimeline progress={offloadProgress} offloading={offloading} success={offloadResult?.status === "success"} />
          </div>

          {offloadError && (
            <div style={{ marginTop: 4 }}>
              <ErrBox>Offload failed — {offloadError}</ErrBox>
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <GhostBtn onClick={onRetryOffload}>↺ Retry Offload</GhostBtn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ───────────────────────────────────────────────
   STEP 4: PROCESSING NODE COMPARISON
─────────────────────────────────────────────── */
const ProcessingNodeComparison = ({ gbfsData, decidedKey, winnerAlgo }) => {
  const T = useT();
  const nodes = [
    { key: "A", data: gbfsData.candidates.A },
    { key: "B", data: gbfsData.candidates.B },
  ];
  return (
    <Card title="Processing Node Comparison" sub={`Both candidates as evaluated by ${winnerAlgo}`} accent={T.purple}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {nodes.map((n) => {
          const srv = resolveServer(n.key);
          const selected = n.key === decidedKey;
          return (
            <div key={n.key} style={{ flex: "1 1 220px", border: `1px solid ${selected ? T.green : T.border}`, borderRadius: 8, padding: "12px 14px", background: selected ? T.greenBg : T.elevated }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.fontSans }}>{srv.icon} {srv.label}</span>
                <Badge color={selected ? "green" : "dim"} dot={selected}>{selected ? "Selected" : "Evaluated"}</Badge>
              </div>
              <div style={{ fontSize: 13, fontFamily: T.fontMono, color: T.muted, lineHeight: 1.7 }}>
                Latency: <strong style={{ color: T.text }}>{n.data.latency} ms</strong>
                <br />
                Resource Avail.: <strong style={{ color: T.text }}>{n.data.resourceAvailability}%</strong>
                <br />
                Energy: <strong style={{ color: T.text }}>{n.data.energy} kWh</strong>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/* ───────────────────────────────────────────────
   STEP 4: OFFLOAD PROGRESS BAR
─────────────────────────────────────────────── */
const OffloadProgressBar = ({ progress, offloading, success, color }) => {
  const T = useT();
  const status = success ? "SUCCESS" : offloading ? "PROCESSING" : progress === 0 ? "PENDING" : "PROCESSING";
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.fontMono, fontSize: 13, color: T.muted, marginBottom: 6 }}>
        <span>Status: <strong style={{ color: success ? T.green : offloading ? color : T.dim }}>{status}</strong></span>
        <span>{progress}%</span>
      </div>
      <div style={{ height: 10, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: success ? T.green : color, transition: "width 0.2s linear", borderRadius: 6 }} />
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────
   STEP 4: TASK PAYLOAD CARD
─────────────────────────────────────────────── */
const TaskPayloadCard = ({ m, workload, decidedSrv, progress, success, batchSize, taskCount }) => {
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

/* ───────────────────────────────────────────────
   STEP 4: EXECUTION TIMELINE
─────────────────────────────────────────────── */
const ExecutionTimeline = ({ progress, offloading, success }) => {
  const T = useT();
  let activeIdx = null;
  if (success) {
    activeIdx = null;
  } else if (offloading || progress > 0) {
    if (progress < 35) activeIdx = 2;
    else if (progress < 65) activeIdx = 3;
    else activeIdx = 4;
  }
  const doneUpTo = success ? 5 : activeIdx != null ? activeIdx - 1 : 1;

  return (
    <Card title="Execution Timeline" sub="Stages of the offloading process" accent={T.blue}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {TIMELINE_STEPS.map((label, i) => {
          const done = i <= doneUpTo;
          const active = !done && i === activeIdx;
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
              <span
                style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontFamily: T.fontMono, fontWeight: 700,
                  background: done ? T.green : active ? T.blue : T.elevated,
                  color: done || active ? "#fff" : T.dim,
                  border: `1px solid ${done ? T.green : active ? T.blue : T.border}`,
                }}
              >
                {done ? "✓" : active ? "●" : "○"}
              </span>
              <span style={{ fontFamily: T.fontMono, fontSize: 13, color: done ? T.green : active ? T.blue : T.dim, fontWeight: active ? 700 : 400 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/* ───────────────────────────────────────────────
   STEP 5: ADDITIONAL STANDALONE CHART WIDGETS
─────────────────────────────────────────────── */
/* ── Gantt-style comparison across all systems ── */
const GanttTooltip = ({ active, payload, label, rows }) => {
  const T = useT();
  if (!active || !payload?.length) return null;
  const row = rows.find((r) => r.metric === label);
  return (
    <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 14px", fontFamily: T.fontMono }}>
      <div style={{ fontSize: 14, color: T.muted, marginBottom: 6 }}>{label}</div>
      {row?.BASEraw != null && <div style={{ fontSize: 15, color: T.amber, marginBottom: 3 }}>Current System: <strong>{row.BASEraw} {row?.unit}</strong></div>}
      <div style={{ fontSize: 15, color: T.blue, marginBottom: 3 }}>GBFS: <strong>{row?.GBFSraw} {row?.unit}</strong></div>
      <div style={{ fontSize: 15, color: T.purple }}>PSO: <strong>{row?.PSOraw} {row?.unit}</strong></div>
    </div>
  );
};

const GanttLabel = ({ x, y, width, height, rows, rowIndex, barKey }) => {
  const T = useT();
  const row = rows[rowIndex];
  if (!row) return null;
  const seriesMap = { GBFS: "GBFSraw", PSO: "PSOraw", BASE: "BASEraw" };
  const raw = row[seriesMap[barKey]];
  if (raw === null || raw === undefined) return null;
  const color = barKey === "GBFS" ? T.blue : barKey === "PSO" ? T.purple : T.amber;
  return (
    <text x={x + width + 8} y={y + height / 2} dy={4} fontSize={13} fontFamily={T.fontMono} fontWeight={700} fill={color}>
      {raw} {row.unit}
    </text>
  );
};

const GanttComparisonChart = ({ machine: m, gbfsData, psoData }) => {
  const T = useT();
  const baseThroughput = m?.throughput != null ? +(m.throughput / 60).toFixed(2) : null;

  const rows = [
    { metric: "Latency", unit: "ms", GBFSraw: +gbfsData.latency, PSOraw: +psoData.latency, BASEraw: m?.avgLatency != null ? +m.avgLatency : null },
    { metric: "Processing Time", unit: "ms", GBFSraw: +gbfsData.time, PSOraw: +psoData.time, BASEraw: m?.processingTime != null ? +m.processingTime : null },
    { metric: "Throughput", unit: "tasks/s", GBFSraw: +gbfsData.throughput, PSOraw: +psoData.throughput, BASEraw: baseThroughput },
    { metric: "Energy Utilization", unit: "kWh", GBFSraw: +gbfsData.energy, PSOraw: +psoData.energy, BASEraw: m?.energyConsumption != null ? +m.energyConsumption : null },
    { metric: "Resource Utilization", unit: "%", GBFSraw: +gbfsData.utilization, PSOraw: +psoData.utilization, BASEraw: m?.cpuUtilization != null ? +m.cpuUtilization : null },
  ].map((r) => {
    const rowMax = Math.max(r.GBFSraw, r.PSOraw, r.BASEraw ?? 0, 0.0001);
    return { ...r, GBFS: +((r.GBFSraw / rowMax) * 100).toFixed(1), PSO: +((r.PSOraw / rowMax) * 100).toFixed(1), BASE: r.BASEraw != null ? +((r.BASEraw / rowMax) * 100).toFixed(1) : 0 };
  });

  return (
    <Card title="Algorithm Timeline — Gantt Comparison" sub="Current System vs GBFS vs PSO, across latency, processing time, throughput, energy, and resource utilization" accent={T.blue}>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontFamily: T.fontSans, color: T.muted }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.amber, display: "inline-block" }} /> Current System (baseline)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontFamily: T.fontSans, color: T.muted }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.blue, display: "inline-block" }} /> GBFS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontFamily: T.fontSans, color: T.muted }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.purple, display: "inline-block" }} /> PSO</div>
      </div>
      <ResponsiveContainer width="100%" height={rows.length * 76}>
        <BarChart data={rows} layout="vertical" margin={{ top: 2, right: 60, left: 4, bottom: 2 }} barCategoryGap={16} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis type="category" dataKey="metric" width={150} stroke={T.dim} fontSize={14} fontFamily={T.fontSans} tickLine={false} axisLine={{ stroke: T.border }} />
          <Tooltip content={<GanttTooltip rows={rows} />} cursor={{ fill: T.elevated }} />
          <Bar dataKey="BASE" fill={T.amber} radius={[4, 4, 4, 4]} barSize={13}>
            <LabelList content={(p) => <GanttLabel {...p} rows={rows} rowIndex={p.index} barKey="BASE" />} />
          </Bar>
          <Bar dataKey="GBFS" fill={T.blue} radius={[4, 4, 4, 4]} barSize={13}>
            <LabelList content={(p) => <GanttLabel {...p} rows={rows} rowIndex={p.index} barKey="GBFS" />} />
          </Bar>
          <Bar dataKey="PSO" fill={T.purple} radius={[4, 4, 4, 4]} barSize={13}>
            <LabelList content={(p) => <GanttLabel {...p} rows={rows} rowIndex={p.index} barKey="PSO" />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 13, color: T.dim, marginTop: 10, fontFamily: T.fontSans, lineHeight: 1.5 }}>
        "Current System" rows use {m?.machineId ?? "the device"}'s own reported baseline (no algorithmic offloading). Bars in each lane are scaled to that lane's own maximum, so lengths compare within a metric, not across metrics.
      </div>
    </Card>
  );
};

/* ── Radar chart: every axis oriented so "further out" = better ── */
const RadarTooltip = ({ active, payload, label, rows }) => {
  const T = useT();
  if (!active || !payload?.length) return null;
  const row = rows.find((r) => r.metric === label);
  return (
    <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 5px", fontFamily: T.fontMono }}>
      <div style={{ fontSize: 14, color: T.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, color: T.blue, marginBottom: 2 }}>GBFS: <strong>{row?.GBFSraw} {row?.unit}</strong></div>
      <div style={{ fontSize: 15, color: T.purple }}>PSO: <strong>{row?.PSOraw} {row?.unit}</strong></div>
    </div>
  );
};

const SummaryRadarChart = ({ gbfsData, psoData }) => {
  const T = useT();
  const defs = [
    { metric: "Latency", unit: "ms", g: gbfsData.latency, p: psoData.latency, lower: true },
    { metric: "Processing", unit: "ms", g: gbfsData.time, p: psoData.time, lower: true },
    { metric: "Throughput", unit: "tasks/s", g: gbfsData.throughput, p: psoData.throughput, lower: false },
    { metric: "Energy", unit: "kWh", g: gbfsData.energy, p: psoData.energy, lower: true },
    { metric: "Resource Util", unit: "%", g: gbfsData.utilization, p: psoData.utilization, lower: true },
  ];
  const rows = defs.map((d) => {
    const scores = radarScore(d.g, d.p, d.lower);
    return { metric: d.metric, unit: d.unit, GBFSraw: d.g, PSOraw: d.p, GBFS: scores.GBFS, PSO: scores.PSO };
  });

  return (
    <Card title="Performance Radar" sub="Every axis points outward toward 'better' — a bigger shape means stronger overall performance" accent={T.blue}>
      <div style={{ display: "flex", gap: 5, marginBottom: 3, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 14, fontFamily: T.fontSans, color: T.muted }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.blue, display: "inline-block" }} /> GBFS (Edge Server A)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 14, fontFamily: T.fontSans, color: T.muted }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.purple, display: "inline-block" }} /> PSO (Cloud Server B)</div>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <RadarChart data={rows} outerRadius="70%">
          <PolarGrid stroke={T.border} />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 13, fill: T.muted, fontFamily: T.fontSans }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 12, fill: T.dim, fontFamily: T.fontMono }} tickCount={5} axisLine={false} />
          <Radar name="GBFS" dataKey="GBFS" stroke={T.blue} fill={T.blue} fillOpacity={0.28} strokeWidth={2} />
          <Radar name="PSO" dataKey="PSO" stroke={T.purple} fill={T.purple} fillOpacity={0.28} strokeWidth={2} />
          <Tooltip content={<RadarTooltip rows={rows} />} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
};

/* ── Metric win tally — glanceable score bar ── */
const WinTallyChart = ({ gbfsData, psoData }) => {
  const T = useT();
  const metrics = [
    { label: "Latency", lower: true, g: +gbfsData.latency, p: +psoData.latency },
    { label: "Processing Time", lower: true, g: +gbfsData.time, p: +psoData.time },
    { label: "Throughput", lower: false, g: +gbfsData.throughput, p: +psoData.throughput },
    { label: "Energy Utilization", lower: true, g: +gbfsData.energy, p: +psoData.energy },
    { label: "Resource Utilization", lower: true, g: +gbfsData.utilization, p: +psoData.utilization },
  ];
  const results = metrics.map((mt) => ({ ...mt, betterApproach: mt.lower ? (mt.g <= mt.p ? "GBFS" : "PSO") : mt.g >= mt.p ? "GBFS" : "PSO" }));
  const gbfsCount = results.filter((r) => r.betterApproach === "GBFS").length;
  const psoCount = results.length - gbfsCount;
  const gbfsPct = (gbfsCount / results.length) * 100;
  const psoPct = 100 - gbfsPct;

  return (
    <Card title="Metric Comparison Tally" sub={`Head-to-head count of which approach came out ahead on each of the ${results.length} measured metrics`} accent={T.purple}>
      <div style={{ display: "flex", height: 34, borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}`, marginBottom: 8 }}>
        {gbfsCount > 0 && <div style={{ width: `${gbfsPct}%`, background: T.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: T.fontMono }}>{gbfsCount}/{results.length}</div>}
        {psoCount > 0 && <div style={{ width: `${psoPct}%`, background: T.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: T.fontMono }}>{psoCount}/{results.length}</div>}
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontFamily: T.fontSans, color: T.muted }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.blue, display: "inline-block" }} /> GBFS ahead on <strong style={{ color: T.text }}>{gbfsCount}</strong></div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontFamily: T.fontSans, color: T.muted }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.purple, display: "inline-block" }} /> PSO ahead on <strong style={{ color: T.text }}>{psoCount}</strong></div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {results.map((r) => (
          <div key={r.label} style={{ flex: "1 1 150px", border: `1px solid ${r.betterApproach === "GBFS" ? T.blueDim : T.purpleDim}`, background: r.betterApproach === "GBFS" ? T.blueBg : T.purpleBg, borderRadius: 6, padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans }}>{r.label}</span>
            <Badge color={r.betterApproach === "GBFS" ? "blue" : "purple"}>{r.betterApproach}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
};

/* ── Trade-off bubble chart: latency vs utilization, bubble = energy ── */
const BubbleTooltip = ({ active, payload }) => {
  const T = useT();
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 5px", fontFamily: T.fontMono }}>
      <div style={{ fontSize: 13, color: d.color, marginBottom: 3, fontWeight: 700 }}>{d.name}</div>
      <div style={{ fontSize: 13, color: T.muted }}>Latency: <strong style={{ color: T.text }}>{d.x} ms</strong></div>
      <div style={{ fontSize: 13, color: T.muted }}>Utilization: <strong style={{ color: T.text }}>{d.y}%</strong></div>
      <div style={{ fontSize: 13, color: T.muted }}>Energy: <strong style={{ color: T.text }}>{d.z} kWh</strong></div>
    </div>
  );
};

const TradeoffBubbleChart = ({ machine: m, gbfsData, psoData }) => {
  const T = useT();
  const data = [
    { name: "GBFS", x: +gbfsData.latency, y: +gbfsData.utilization, z: +gbfsData.energy, color: T.blue, fill: T.blue },
    { name: "PSO", x: +psoData.latency, y: +psoData.utilization, z: +psoData.energy, color: T.purple, fill: T.purple },
    ...(m?.avgLatency != null && m?.cpuUtilization != null ? [{ name: "Current System", x: +m.avgLatency, y: +m.cpuUtilization, z: +(m.energyConsumption ?? 1), color: T.amber, fill: T.amber }] : []),
  ];
  return (
    <Card title="Latency vs. Utilization Trade-off" sub="Bubble size = energy utilization · closer to bottom-left is better" accent={T.blue}>
      <ResponsiveContainer width="100%" height={230}>
        <ScatterChart margin={{ top: 6, right: 16, left: 2, bottom: 6 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="Latency" unit=" ms" stroke={T.dim} fontSize={13} fontFamily={T.fontMono} label={{ value: "Latency (ms)", position: "insideBottom", offset: -6, fill: T.muted, fontSize: 13, fontFamily: T.fontSans }} />
          <YAxis type="number" dataKey="y" name="Utilization" unit="%" stroke={T.dim} fontSize={13} fontFamily={T.fontMono} label={{ value: "Resource Utilization (%)", angle: -90, position: "insideLeft", fill: T.muted, fontSize: 13, fontFamily: T.fontSans }} />
          <ZAxis type="number" dataKey="z" range={[300, 1400]} />
          <Tooltip content={<BubbleTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} fillOpacity={0.75}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} stroke={d.fill} strokeWidth={2} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {data.map((d) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontFamily: T.fontSans, color: T.muted }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: d.fill, display: "inline-block" }} /> {d.name}</div>
        ))}
      </div>
    </Card>
  );
};

/* ── Composite efficiency donut ── */
const EfficiencyDonutChart = ({ gbfsData, psoData }) => {
  const T = useT();
  const defs = [
    { g: gbfsData.latency, p: psoData.latency, lower: true },
    { g: gbfsData.time, p: psoData.time, lower: true },
    { g: gbfsData.throughput, p: psoData.throughput, lower: false },
    { g: gbfsData.energy, p: psoData.energy, lower: true },
    { g: gbfsData.utilization, p: psoData.utilization, lower: true },
  ];
  const scores = defs.map((d) => radarScore(d.g, d.p, d.lower));
  const avgG = Math.max(0.1, +(scores.reduce((a, s) => a + s.GBFS, 0) / scores.length).toFixed(1));
  const avgP = Math.max(0.1, +(scores.reduce((a, s) => a + s.PSO, 0) / scores.length).toFixed(1));
  const total = avgG + avgP;
  const data = [{ name: "GBFS", value: avgG, fill: T.blue }, { name: "PSO", value: avgP, fill: T.purple }];
  const leader = avgG >= avgP ? "GBFS" : "PSO";

  return (
    <Card title="Composite Efficiency Score" sub="Average performance score across all 5 metrics" accent={T.purple}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto", position: "relative", width: 150, height: 150 }}>
          <PieChart width={150} height={150}>
            <Pie data={data} dataKey="value" nameKey="name" cx={75} cy={75} innerRadius={46} outerRadius={69} paddingAngle={3} startAngle={90} endAngle={-270} isAnimationActive={false}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
            </Pie>
            <Tooltip formatter={(v, n) => [`${v.toFixed(1)} pts`, n]} contentStyle={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, fontFamily: T.fontMono, fontSize: 12 }} />
          </PieChart>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 88, height: 88, borderRadius: "50%", background: T.surface, border: `1px solid ${T.borderSub}`, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: leader === "GBFS" ? T.blue : T.purple, fontFamily: T.fontMono }}>{leader}</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: T.fontSans }}>leads</div>
          </div>
        </div>
        <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 3 }}>
          {data.map((d) => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 5, padding: "3px 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, display: "inline-block" }} />
                <span style={{ fontSize: 13, color: T.text, fontFamily: T.fontSans, fontWeight: 600 }}>{d.name}</span>
              </div>
              <span style={{ fontSize: 13, color: d.fill, fontFamily: T.fontMono, fontWeight: 700 }}>{d.value.toFixed(1)} <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>/ {total.toFixed(0)}</span></span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: T.dim, fontFamily: T.fontSans, lineHeight: 1.4 }}>Each metric contributes up to 100 pts, awarded proportionally to how close an approach got to the better result. Higher combined score leads.</div>
        </div>
      </div>
    </Card>
  );
};

/* ── Baseline vs optimized improvement chart ── */
const ImprovementComposedChart = ({ machine: m, gbfsData, psoData }) => {
  const T = useT();
  const gbfsBetter = gbfsData.latency <= psoData.latency;
  const betterApproach = gbfsBetter ? "GBFS" : "PSO";
  const betterData = gbfsBetter ? gbfsData : psoData;
  const baseThroughput = m?.throughput != null ? +(m.throughput / 60).toFixed(2) : null;

  const defs = [
    { metric: "Latency", unit: "ms", base: m?.avgLatency != null ? +m.avgLatency : null, algo: +betterData.latency, lower: true },
    { metric: "Processing", unit: "ms", base: m?.processingTime != null ? +m.processingTime : null, algo: +betterData.time, lower: true },
    { metric: "Throughput", unit: "t/s", base: baseThroughput, algo: +betterData.throughput, lower: false },
  ].filter((d) => d.base != null);

  const rows = defs.map((d) => {
    const pct = d.lower ? +(((d.base - d.algo) / d.base) * 100).toFixed(1) : +(((d.algo - d.base) / d.base) * 100).toFixed(1);
    return { ...d, pct };
  });

  return (
    <Card title="Improvement vs. Current System" sub={`Baseline vs ${betterApproach}, with % change`} accent={T.blue}>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={rows} margin={{ top: 14, right: 30, left: 0, bottom: 2 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="metric" stroke={T.dim} fontSize={13} fontFamily={T.fontSans} />
          <YAxis yAxisId="left" stroke={T.dim} fontSize={13} fontFamily={T.fontMono} />
          <YAxis yAxisId="right" orientation="right" stroke={T.amber} fontSize={13} fontFamily={T.fontMono} unit="%" />
          <Tooltip contentStyle={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, fontFamily: T.fontMono, fontSize: 13 }} />
          <Legend wrapperStyle={{ fontSize: 13, fontFamily: T.fontMono }} />
          <Bar yAxisId="left" dataKey="base" name="Current System" fill={T.dim} radius={[4, 4, 0, 0]} barSize={26} />
          <Bar yAxisId="left" dataKey="algo" name={`${betterApproach}`} fill={gbfsBetter ? T.blue : T.purple} radius={[4, 4, 0, 0]} barSize={26} />
          <Line yAxisId="right" type="monotone" dataKey="pct" name="% Change" stroke={T.amber} strokeWidth={2} dot={{ r: 4, fill: T.amber }} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
};

/* ───────────────────────────────────────────────
   STEP 5: COMPARISON & EVALUATION DASHBOARD HELPERS
─────────────────────────────────────────────── */
const radarScore = (gbfsVal, psoVal, lowerIsBetter) => {
  const g = +gbfsVal;
  const p = +psoVal;
  if (lowerIsBetter) {
    const best = Math.min(g, p) || 0.0001;
    return { GBFS: +(100 * (best / (g || 0.0001))).toFixed(1), PSO: +(100 * (best / (p || 0.0001))).toFixed(1) };
  }
  const best = Math.max(g, p) || 0.0001;
  return { GBFS: +(100 * (g / best)).toFixed(1), PSO: +(100 * (p / best)).toFixed(1) };
};

const CustomTooltip = ({ active, payload, label }) => {
  const T = useT();
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 14px", fontFamily: T.fontMono }}>
      <div style={{ fontSize: 14, color: T.muted, marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ fontSize: 15, color: p.color, marginBottom: 3 }}>
          {p.dataKey}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const SystemComparisonPanels = ({ machine: m, gbfsData, psoData }) => {
  const T = useT();
  const gSrv = resolveServer(gbfsData.recommendedServer);
  const pSrv = resolveServer(psoData.recommendedServer);
  const gAux = deriveAuxMetrics(m, +gbfsData.utilization);
  const pAux = deriveAuxMetrics(m, +psoData.utilization);

  const panels = [
    {
      key: "base", title: "Current System (Before Offloading)", icon: "🖥", color: T.amber, bg: T.amberBg,
      left: [["Latency", `${m.avgLatency} ms`], ["Processing Time", `${m.processingTime} ms`], ["Throughput", `${(m.throughput / 60).toFixed(2)} tasks/s`], ["Energy Consumption", `${m.energyConsumption} kWh`]],
      right: [["CPU Utilization", `${m.cpuUtilization}%`], ["Memory Usage", `${m.memoryUsage} GB`], ["Storage Usage", `${m.storageUsage ?? m.taskSize} MB / task`], ["Queue Length", `${m.queueLength ?? 0} tasks`]],
      note: "All tasks are processed locally on the IoT device.",
    },
    {
      key: "gbfs", title: `GBFS Result (${gSrv.label})`, icon: gSrv.icon, color: T.blue, bg: T.blueBg,
      left: [["Latency", `${gbfsData.latency} ms`], ["Processing Time", `${gbfsData.time} ms`], ["Throughput", `${gbfsData.throughput} tasks/s`], ["Energy Consumption", `${gbfsData.energy} kWh`]],
      right: [["CPU Utilization", `${gbfsData.utilization}%`], ["Memory Usage", `${gAux.memory} GB`], ["Storage Usage", `${gAux.storage} MB / task`], ["Queue Length", `${gAux.queue} tasks`]],
      note: `GBFS selected ${gSrv.label} with estimated metrics.`,
    },
    {
      key: "pso", title: `PSO Result (${pSrv.label})`, icon: pSrv.icon, color: T.purple, bg: T.purpleBg,
      left: [["Latency", `${psoData.latency} ms`], ["Processing Time", `${psoData.time} ms`], ["Throughput", `${psoData.throughput} tasks/s`], ["Energy Consumption", `${psoData.energy} kWh`]],
      right: [["CPU Utilization", `${psoData.utilization}%`], ["Memory Usage", `${pAux.memory} GB`], ["Storage Usage", `${pAux.storage} MB / task`], ["Queue Length", `${pAux.queue} tasks`]],
      note: `PSO selected ${pSrv.label} with optimal performance.`,
    },
  ];

  return (
    <div className="app-grid-eq" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 4, marginBottom: 5 }}>
      {panels.map((p) => (
        <div key={p.key} style={{ background: T.surface, border: `1px solid ${p.color}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ background: p.bg, padding: "4px 5px", display: "flex", alignItems: "center", gap: 4, borderBottom: `1px solid ${p.color}` }}>
            <span style={{ fontSize: 18 }}>{p.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: p.color, fontFamily: T.fontSans, letterSpacing: "0.03em" }}>{p.title.toUpperCase()}</span>
          </div>
          <div style={{ padding: "5px 5px", display: "flex", gap: 5 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {p.left.map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.fontMono }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {p.right.map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: T.fontMono }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "4px 5px 4px", fontSize: 13, color: p.color, fontFamily: T.fontSans }}>{p.note}</div>
        </div>
      ))}
    </div>
  );
};

const CombinedPerformanceBarChart = ({ machine: m, gbfsData, psoData }) => {
  const T = useT();
  const data = [
    { metric: "Latency (ms)", Base: +m.avgLatency, GBFS: +gbfsData.latency, PSO: +psoData.latency },
    { metric: "Processing Time (ms)", Base: +m.processingTime, GBFS: +gbfsData.time, PSO: +psoData.time },
    { metric: "Throughput (t/s)", Base: +(m.throughput / 60).toFixed(2), GBFS: +gbfsData.throughput, PSO: +psoData.throughput },
    { metric: "Energy (kWh)", Base: +m.energyConsumption, GBFS: +gbfsData.energy, PSO: +psoData.energy },
    { metric: "CPU Usage (%)", Base: +m.cpuUtilization, GBFS: +gbfsData.utilization, PSO: +psoData.utilization },
  ];
  return (
    <Card title="Performance Comparison Across All Systems" sub="Current System vs GBFS vs PSO — raw measured values" accent={T.blue}>
      <ResponsiveContainer width="100%" height={230}>
        <BarChart data={data} margin={{ top: 16, right: 6, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
          <XAxis dataKey="metric" stroke={T.dim} fontSize={12} fontFamily={T.fontSans} interval={0} />
          <YAxis stroke={T.dim} fontSize={13} fontFamily={T.fontMono} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 13, fontFamily: T.fontSans }} formatter={(v) => (v === "Base" ? "Current System (Before Offloading)" : v === "GBFS" ? "GBFS (Edge Server A)" : "PSO (Cloud Server B)")} />
          <Bar dataKey="Base" fill={T.amber} radius={[4, 4, 0, 0]}><LabelList dataKey="Base" position="top" fill={T.amber} fontSize={12} fontFamily={T.fontMono} /></Bar>
          <Bar dataKey="GBFS" fill={T.blue} radius={[4, 4, 0, 0]}><LabelList dataKey="GBFS" position="top" fill={T.blue} fontSize={12} fontFamily={T.fontMono} /></Bar>
          <Bar dataKey="PSO" fill={T.purple} radius={[4, 4, 0, 0]}><LabelList dataKey="PSO" position="top" fill={T.purple} fontSize={12} fontFamily={T.fontMono} /></Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 4 }}>
        <InfoBox color="blue">
          <strong>Interpretation:</strong> Lower latency and processing time indicate faster execution. Higher throughput indicates better system performance. The winning algorithm achieves the lowest latency while maintaining higher throughput and lower energy usage.
        </InfoBox>
      </div>
    </Card>
  );
};

const DetailedNumericComparisonTable = ({ machine: m, gbfsData, psoData }) => {
  const T = useT();
  const gAux = deriveAuxMetrics(m, +gbfsData.utilization);
  const pAux = deriveAuxMetrics(m, +psoData.utilization);

  const rows = [
    ["Latency (ms)", +m.avgLatency, +gbfsData.latency, +psoData.latency, "lower"],
    ["Processing Time (ms)", +m.processingTime, +gbfsData.time, +psoData.time, "lower"],
    ["Throughput (tasks/s)", +(m.throughput / 60).toFixed(2), +gbfsData.throughput, +psoData.throughput, "higher"],
    ["Energy Consumption (kWh)", +m.energyConsumption, +gbfsData.energy, +psoData.energy, "lower"],
    ["CPU Utilization (%)", +m.cpuUtilization, +gbfsData.utilization, +psoData.utilization, "lower"],
    ["Memory Usage (GB)", +m.memoryUsage, gAux.memory, pAux.memory, "lower"],
    ["Storage Usage (MB/task)", +(m.storageUsage ?? m.taskSize ?? 0), gAux.storage, pAux.storage, "lower"],
    ["Queue Length (tasks)", +(m.queueLength ?? 0), gAux.queue, pAux.queue, "lower"],
  ];

  const bestOf = (g, p, dir) => ((dir === "lower" ? g <= p : g >= p) ? "GBFS" : "PSO");

  return (
    <Card title="Detailed Numeric Comparison" sub="All systems, side by side" accent={T.purple}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><Th>Metric</Th><Th>Current System</Th><Th>GBFS</Th><Th>PSO</Th><Th>Best</Th></tr></thead>
        <tbody>
          {rows.map(([label, b, g, p, dir], i) => {
            const best = bestOf(g, p, dir);
            return (
              <TableRow
                key={label}
                isOdd={i % 2 === 1}
                cells={[
                  <span style={{ fontFamily: T.fontSans, color: T.text }}>{label}</span>,
                  <span style={{ fontFamily: T.fontMono, color: T.muted }}>{b}</span>,
                  <span style={{ fontFamily: T.fontMono, color: best === "GBFS" ? T.blue : T.muted, fontWeight: best === "GBFS" ? 700 : 400 }}>{g}</span>,
                  <span style={{ fontFamily: T.fontMono, color: best === "PSO" ? T.purple : T.muted, fontWeight: best === "PSO" ? 700 : 400 }}>{p}</span>,
                  <span style={{ fontFamily: T.fontMono }}>{best}</span>,
                ]}
              />
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

const EvalStatCard = ({ icon, label, value, valueColor, sub1, sub2, caption }) => {
  const T = useT();
  return (
    <div style={{ flex: "1 1 150px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 5px", textAlign: "center" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.elevated, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, margin: "0 auto 10px" }}>{icon}</div>
      <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: valueColor, fontFamily: T.fontMono, marginBottom: 3 }}>{value}</div>
      {sub1 && <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans }}>{sub1}</div>}
      {sub2 && <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, marginBottom: 3 }}>{sub2}</div>}
      {caption && <div style={{ fontSize: 13, color: T.dim, fontFamily: T.fontSans, marginTop: 3, fontWeight: 600 }}>{caption}</div>}
    </div>
  );
};

const EvaluationSummaryGrid = ({ machine: m, gbfsData, psoData, offloadResult }) => {
  const T = useT();
  const gbfsWins = gbfsData.latency <= psoData.latency;
  const winnerAlgo = gbfsWins ? "GBFS" : "PSO";
  const winnerData = gbfsWins ? gbfsData : psoData;

  const baseLatency = +m.avgLatency;
  const baseTime = +m.processingTime;
  const baseThroughput = +(m.throughput / 60).toFixed(2);
  const baseEnergy = +m.energyConsumption;
  const baseCpu = +m.cpuUtilization;

  const winLatency = +winnerData.latency;
  const winTime = +winnerData.time;
  const winThroughput = +winnerData.throughput;
  const winEnergy = +winnerData.energy;
  const winCpu = +winnerData.utilization;

  const pct = (base, val, lowerBetter = true) => (base ? +(((lowerBetter ? base - val : val - base) / base) * 100).toFixed(1) : null);

  const latPct = pct(baseLatency, winLatency, true);
  const timePct = pct(baseTime, winTime, true);
  const thrPct = pct(baseThroughput, winThroughput, false);
  const energyPct = pct(baseEnergy, winEnergy, true);
  const cpuPct = pct(baseCpu, winCpu, true);

  const measuredLat = offloadResult?.measuredLatency;
  const predicted = Math.min(+gbfsData.latency, +psoData.latency);
  const deviation = measuredLat ? (Math.abs(measuredLat - predicted) / predicted) * 100 : null;
  const accuracy = deviation != null ? Math.max(0, 100 - deviation).toFixed(1) : null;

  const arrow = (v) => (v == null ? "" : v >= 0 ? "↓" : "↑");
  const arrowUp = (v) => (v == null ? "" : v >= 0 ? "↑" : "↓");

  const cards = [
    { icon: "🎯", label: "Prediction Accuracy", value: accuracy != null ? `${accuracy}%` : "—", color: T.blue, sub1: accuracy != null ? `Predicted: ${predicted} ms` : "Awaiting offload", sub2: accuracy != null ? `Actual: ${measuredLat} ms` : "" },
    { icon: "📉", label: "Latency Improvement", value: latPct != null ? `${arrow(latPct)} ${Math.abs(latPct)}%` : "—", color: T.green, sub1: `${baseLatency} ms → ${winLatency} ms`, caption: "Lower is better" },
    { icon: "⚙️", label: "Processing Time Improvement", value: timePct != null ? `${arrow(timePct)} ${Math.abs(timePct)}%` : "—", color: T.green, sub1: `${baseTime} ms → ${winTime} ms`, caption: "Lower is better" },
    { icon: "📈", label: "Throughput Improvement", value: thrPct != null ? `${arrowUp(thrPct)} ${Math.abs(thrPct)}%` : "—", color: T.green, sub1: `${baseThroughput} → ${winThroughput} tasks/s`, caption: "Higher is better" },
    { icon: "⚡", label: "Energy Saving", value: energyPct != null ? `${arrow(energyPct)} ${Math.abs(energyPct)}%` : "—", color: T.amber, sub1: `${baseEnergy} kWh → ${winEnergy} kWh`, caption: "Lower is better" },
    { icon: "🥧", label: "Resource Utilization", value: cpuPct != null ? `${arrow(cpuPct)} ${Math.abs(cpuPct)}%` : "—", color: T.purple, sub1: `${baseCpu}% → ${winCpu}%`, caption: "Lower is better" },
  ];

  return (
    <Card title="Evaluation Summary" sub={`${winnerAlgo} vs current baseline`} accent={T.green}>
      <div className="app-grid-eq" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 4 }}>
        {cards.map((c) => (
          <EvalStatCard key={c.label} icon={c.icon} label={c.label} value={c.value} valueColor={c.color} sub1={c.sub1} sub2={c.sub2} caption={c.caption} />
        ))}
      </div>
    </Card>
  );
};

const CompositeScoreCard = ({ gbfsData, psoData }) => {
  const T = useT();
  const defs = [
    { g: gbfsData.latency, p: psoData.latency, lower: true },
    { g: gbfsData.time, p: psoData.time, lower: true },
    { g: gbfsData.throughput, p: psoData.throughput, lower: false },
    { g: gbfsData.energy, p: psoData.energy, lower: true },
    { g: gbfsData.utilization, p: psoData.utilization, lower: true },
  ];
  const scores = defs.map((d) => radarScore(d.g, d.p, d.lower));
  const avgG = Math.round(scores.reduce((a, s) => a + s.GBFS, 0) / scores.length);
  const avgP = Math.round(scores.reduce((a, s) => a + s.PSO, 0) / scores.length);
  const leaderName = avgG >= avgP ? "GBFS" : "PSO";

  const rows = [
    { key: "GBFS", label: "GBFS (Edge Server A)", value: avgG, color: T.blue },
    { key: "PSO", label: "PSO (Cloud Server B)", value: avgP, color: T.purple },
  ];

  return (
    <Card accent={T.green} title="Composite Performance Score" sub="Out of 100">
      {rows.map((r) => (
        <div key={r.key} style={{ marginBottom: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontFamily: T.fontSans, color: T.text, marginBottom: 3 }}>
            <span>{r.label}</span>
            <span style={{ fontFamily: T.fontMono, fontWeight: 700, color: r.color }}>{r.value} / 100 {leaderName === r.key && "🏆"}</span>
          </div>
          <div style={{ height: 12, background: T.elevated, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
            <div style={{ width: `${r.value}%`, height: "100%", background: r.color, borderRadius: 6, transition: "width 0.4s ease" }} />
          </div>
        </div>
      ))}
    </Card>
  );
};

const EnergyDonutChart = ({ machine: m, gbfsData, psoData }) => {
  const T = useT();
  const g = Math.max(0.001, +gbfsData.energy);
  const p = Math.max(0.001, +psoData.energy);
  const total = g + p;
  const data = [{ name: "GBFS", value: g, fill: T.blue, pct: +((g / total) * 100).toFixed(1) }, { name: "PSO", value: p, fill: T.purple, pct: +((p / total) * 100).toFixed(1) }];
  const saver = g <= p ? "GBFS" : "PSO";
  const saverColor = g <= p ? T.blue : T.purple;
  const winnerEnergy = Math.min(g, p);
  const baseEnergy = m?.energyConsumption != null ? +m.energyConsumption : null;
  const savingsPct = baseEnergy ? +(((baseEnergy - winnerEnergy) / baseEnergy) * 100).toFixed(1) : null;

  return (
    <Card title="Energy Consumption Split" sub="Share of combined energy utilization, by algorithm" accent={T.amber}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
        <div style={{ flex: "0 0 auto", position: "relative", width: 145, height: 145 }}>
          <PieChart width={145} height={145}>
            <Pie data={data} dataKey="value" nameKey="name" cx={72.5} cy={72.5} innerRadius={44} outerRadius={67} paddingAngle={3} startAngle={90} endAngle={-270} isAnimationActive={false}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
            </Pie>
            <Tooltip formatter={(v, n, entry) => [`${v} kWh (${entry.payload.pct}%)`, n]} contentStyle={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, fontFamily: T.fontMono, fontSize: 12 }} />
          </PieChart>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 82, height: 82, borderRadius: "50%", background: T.surface, border: `1px solid ${T.borderSub}`, pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: saverColor, fontFamily: T.fontMono }}>{saver}</div>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: T.fontSans }}>most efficient</div>
          </div>
        </div>
        <div style={{ flex: "1 1 180px", display: "flex", flexDirection: "column", gap: 3 }}>
          {data.map((d) => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 5, padding: "3px 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, display: "inline-block" }} />
                <span style={{ fontSize: 13, color: T.text, fontFamily: T.fontSans, fontWeight: 600 }}>{d.name}</span>
              </div>
              <span style={{ fontSize: 13, color: d.fill, fontFamily: T.fontMono, fontWeight: 700 }}>{d.value} kWh <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>({d.pct}%)</span></span>
            </div>
          ))}
          {baseEnergy != null && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: T.elevated, border: `1px dashed ${T.border}`, borderRadius: 5, padding: "3px 4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: T.dim, display: "inline-block" }} />
                <span style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, fontWeight: 600 }}>Current System</span>
              </div>
              <span style={{ fontSize: 13, color: T.muted, fontFamily: T.fontMono, fontWeight: 700 }}>{baseEnergy} kWh</span>
            </div>
          )}
          <InfoBox color="amber">
            <strong>{saver}</strong> is the more energy-efficient choice{savingsPct != null && <> — <strong>{savingsPct}%</strong> less energy than the current system</>}.
          </InfoBox>
        </div>
      </div>
    </Card>
  );
};

const polarPoint = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const describeGaugeArc = (cx, cy, r, startAngle, endAngle) => {
  const start = polarPoint(cx, cy, r, endAngle);
  const end = polarPoint(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const MiniGauge = ({ label, value, color, sub }) => {
  const T = useT();
  const pct = Math.max(0, Math.min(100, value));
  const startAngle = -120;
  const endAngle = 120;
  const valueAngle = startAngle + (endAngle - startAngle) * (pct / 100);
  const cx = 60;
  const cy = 60;
  const r = 46;
  const trackPath = describeGaugeArc(cx, cy, r, startAngle, endAngle);
  const valuePath = pct > 0 ? describeGaugeArc(cx, cy, r, startAngle, valueAngle) : null;

  return (
    <div style={{ flex: "1 1 150px", textAlign: "center" }}>
      <div style={{ width: "100%", maxWidth: 130, margin: "0 auto", position: "relative" }}>
        <svg viewBox="0 0 120 120" width="100%" height="118" style={{ display: "block", background: "transparent" }}>
          <path d={trackPath} fill="none" stroke={T.elevated} strokeWidth="11" strokeLinecap="round" />
          {valuePath && <path d={valuePath} fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" />}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 19, fontWeight: 800, color, fontFamily: T.fontMono }}>{value}%</div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.fontSans, marginTop: -4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans, marginTop: 1 }}>{sub}</div>}
    </div>
  );
};

function resolveServerLabel(key) {
  return key === "A" ? "Edge Server A" : key === "B" ? "Cloud Server B" : "";
}

const UtilizationGaugePair = ({ gbfsData, psoData }) => {
  const T = useT();
  return (
    <Card title="Resource Utilization Gauges" sub="Edge/compute load required by each algorithm's chosen path" accent={T.green}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
        <MiniGauge label="GBFS" value={+gbfsData.utilization} color={T.blue} sub={resolveServerLabel(gbfsData.recommendedServer)} />
        <MiniGauge label="PSO" value={+psoData.utilization} color={T.purple} sub={resolveServerLabel(psoData.recommendedServer)} />
      </div>
      <div style={{ fontSize: 13, color: T.dim, fontFamily: T.fontSans, marginTop: 4, textAlign: "center" }}>Lower utilization leaves more headroom for other tasks queued on the same server.</div>
    </Card>
  );
};

const SimulationWorkflowCard = () => {
  const T = useT();
  const steps = [
    { icon: "⚙", n: 1, title: "Machine Setup", desc: "IoT device and task profile configured." },
    { icon: "🗄", n: 2, title: "Data Collection", desc: "Real-time metrics collected from device." },
    { icon: "💻", n: 3, title: "Algorithm Execution", desc: "GBFS and PSO evaluate the same task profile." },
    { icon: "🖥", n: 4, title: "Server Selection", desc: "Best server selected based on lowest latency." },
    { icon: "📤", n: 5, title: "Task Offloading", desc: "Task dispatched to the selected server." },
    { icon: "📈", n: 6, title: "Actual Measurement", desc: "Real latency measured after execution." },
    { icon: "📊", n: 7, title: "Evaluation", desc: "Results analyzed and saved to the system." },
  ];
  return (
    <Card title="Simulation Workflow (Process Flow)" accent={T.blue}>
      <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 0, justifyContent: "center" }}>
        {steps.map((s, idx) => (
          <React.Fragment key={s.n}>
            {idx > 0 && (
              <div style={{ display: "flex", alignItems: "center", padding: "10px 3px 0", flexShrink: 0 }}>
                <span style={{ color: T.dim, fontSize: 13 }}>→</span>
              </div>
            )}
            <div style={{ flex: "0 0 auto", width: 100, textAlign: "center" }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", margin: "0 auto 8px", background: T.elevated, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.icon}</div>
              <div style={{ fontSize: 12, color: T.blue, fontFamily: T.fontMono, fontWeight: 700, marginBottom: 2 }}>{s.n}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.fontSans, marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans, lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
};

const ValidationSummaryCard = ({ gbfsData, psoData, offloadResult }) => {
  const T = useT();
  const gbfsWins = gbfsData.latency <= psoData.latency;
  const winnerAlgo = gbfsWins ? "GBFS" : "PSO";
  const predicted = Math.min(+gbfsData.latency, +psoData.latency);
  const measuredLat = offloadResult?.measuredLatency;
  const deviationPct = measuredLat ? (Math.abs(measuredLat - predicted) / predicted * 100).toFixed(1) : null;
  const deviationOk = measuredLat ? +deviationPct <= 20 : null;

  return (
    <Card title={`Validation (${winnerAlgo})`} accent={measuredLat ? (deviationOk ? T.green : T.amber) : T.dim}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
        <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans, marginBottom: 4 }}>Predicted Latency</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: gbfsWins ? T.blue : T.purple, fontFamily: T.fontMono }}>{predicted} ms</div>
        </div>
        <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans, marginBottom: 4 }}>Actual Latency</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.green, fontFamily: T.fontMono }}>{measuredLat ? `${measuredLat} ms` : "—"}</div>
        </div>
        <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.fontSans, marginBottom: 4 }}>Deviation</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: deviationOk ? T.green : T.amber, fontFamily: T.fontMono }}>{deviationPct != null ? `${deviationPct}%` : "—"}</div>
        </div>
      </div>
      {measuredLat ? (
        <InfoBox color={deviationOk ? "green" : "amber"}>
          {deviationOk
            ? `The measured latency (${measuredLat} ms) is within the 20% simulation tolerance. The prediction is validated.`
            : `The measured latency (${measuredLat} ms) deviates ${deviationPct}% from the prediction, above the 20% tolerance band.`}
        </InfoBox>
      ) : (
        <InfoBox color="amber">Offload the task to unlock validation against the real measured latency.</InfoBox>
      )}
    </Card>
  );
};

const ResearchConclusionCard = ({ machine: m, gbfsData, psoData }) => {
  const T = useT();
  const gbfsWins = gbfsData.latency <= psoData.latency;
  const winnerAlgo = gbfsWins ? "GBFS" : "PSO";
  const decidedSrv = resolveServer((gbfsWins ? gbfsData : psoData).recommendedServer);

  return (
    <Card title="Research Conclusion" accent={T.green}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
        <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: T.greenBg, border: `1px solid ${T.greenDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: T.green }}>✓</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.green, fontFamily: T.fontSans, marginBottom: 3 }}>{winnerAlgo} is the optimal algorithm.</div>
          <div style={{ fontSize: 13, color: T.muted, fontFamily: T.fontSans, lineHeight: 1.6 }}>
            Compared with the baseline system before offloading, {winnerAlgo} produced lower latency, lower processing time, reduced resource utilization, and improved throughput on {decidedSrv.label} — making it the optimal algorithm for {m.machineId}'s simulated IoT task offloading environment.
          </div>
        </div>
      </div>
    </Card>
  );
};

const ComparisonEvaluationDashboard = ({ machine: m, gbfsData, psoData, offloadResult }) => {
  const T = useT();
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ marginBottom: 5 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: T.fontSans, letterSpacing: "0.02em" }}>COMPARISON &amp; EVALUATION DASHBOARD</div>
        <div style={{ fontSize: 13, color: T.blue, fontFamily: T.fontSans, marginTop: 2 }}>Baseline (No Offloading) vs GBFS vs PSO</div>
      </div>

      <SystemComparisonPanels machine={m} gbfsData={gbfsData} psoData={psoData} />

      <div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 4, marginBottom: 5 }}>
        <CombinedPerformanceBarChart machine={m} gbfsData={gbfsData} psoData={psoData} />
        <DetailedNumericComparisonTable machine={m} gbfsData={gbfsData} psoData={psoData} />
      </div>

      <GanttComparisonChart machine={m} gbfsData={gbfsData} psoData={psoData} />

      <div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 4, marginBottom: 5 }}>
        <SummaryRadarChart gbfsData={gbfsData} psoData={psoData} />
        <WinTallyChart gbfsData={gbfsData} psoData={psoData} />
      </div>

      <div style={{ marginBottom: 5 }}>
        <EvaluationSummaryGrid machine={m} gbfsData={gbfsData} psoData={psoData} offloadResult={offloadResult} />
      </div>

      <div className="app-grid-21" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 4, marginBottom: 5 }}>
        <TradeoffBubbleChart machine={m} gbfsData={gbfsData} psoData={psoData} />
        <ImprovementComposedChart machine={m} gbfsData={gbfsData} psoData={psoData} />
      </div>

      <div className="app-grid-eq" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 4, marginBottom: 5 }}>
        <UtilizationGaugePair gbfsData={gbfsData} psoData={psoData} />
        <EnergyDonutChart machine={m} gbfsData={gbfsData} psoData={psoData} />
        <EfficiencyDonutChart gbfsData={gbfsData} psoData={psoData} />
        <CompositeScoreCard gbfsData={gbfsData} psoData={psoData} />
      </div>

      <div className="app-grid-311" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 4 }}>
        <SimulationWorkflowCard />
        <ValidationSummaryCard gbfsData={gbfsData} psoData={psoData} offloadResult={offloadResult} />
        <ResearchConclusionCard machine={m} gbfsData={gbfsData} psoData={psoData} />
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────
   STEP 5: DATABASE HISTORY
─────────────────────────────────────────────── */
const DatabaseHistory = ({ history }) => {
  const T = useT();
  return (
    <Card title="Database History" sub="Persisted execution logs, most recent first — survives page refresh" accent={T.dim}>
      {history.length === 0 ? (
        <InfoBox color="blue">No executions logged yet — complete an offload to add the first record.</InfoBox>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Date/Time</Th>
              <Th>Machine</Th>
              <Th>Workload</Th>
              <Th>Level</Th>
              <Th>Algorithm</Th>
              <Th>Server</Th>
              <Th>Latency</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <TableRow
                key={h.id}
                isOdd={i % 2 === 1}
                cells={[
                  <span style={{ fontFamily: T.fontSans, color: T.text }}>{h.timestamp}</span>,
                  <span style={{ fontFamily: T.fontSans, color: T.text }}>{h.machineName} ({h.machineId})</span>,
                  <span style={{ fontFamily: T.fontSans, color: T.muted }}>{h.workloadName}</span>,
                  <Badge color={h.level === "High" ? "red" : h.level === "Medium" ? "amber" : h.level === "Low" ? "green" : "dim"}>{h.level}</Badge>,
                  <Badge color={h.algorithm === "GBFS" ? "blue" : "purple"}>{h.algorithm}</Badge>,
                  <span style={{ fontFamily: T.fontMono, color: T.text }}>{h.server}</span>,
                  <span style={{ fontFamily: T.fontMono, color: T.text }}>{h.latency} ms</span>,
                  <Badge color={h.status === "Success" ? "green" : "red"}>{h.status}</Badge>,
                ]}
              />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};

/* ───────────────────────────────────────────────
   STEP 5: MEASURE LATENCY
─────────────────────────────────────────────── */
const Step5Latency = ({ machine: m, gbfsData, psoData, offloadResult, history, workload }) => {
  const T = useT();
  if (!gbfsData || !psoData) return <Card><InfoBox color="amber">Run both algorithms first.</InfoBox></Card>;

  const gbfsWins = gbfsData.latency <= psoData.latency;
  const winnerAlgo = gbfsWins ? "GBFS" : "PSO";
  const winnerData = gbfsWins ? gbfsData : psoData;
  const decidedKey = winnerData.recommendedServer;
  const decidedSrv = resolveServer(decidedKey);
  const decidedCandidate = winnerData.candidates[decidedKey];
  const totalLatency = offloadResult?.measuredLatency ?? winnerData.latency;

  return (
    <div>
      <div style={{ marginBottom: 7 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0, fontFamily: T.fontSans }}>Latency Results</h1>
        <p style={{ fontSize: 16, color: T.muted, margin: "6px 0 0", fontFamily: T.fontSans }}>
          Task from <strong style={{ color: T.text }}>{m.name}</strong> offloaded to <strong style={{ color: T.text }}>{decidedSrv.icon} {decidedSrv.label}</strong> by <strong style={{ color: gbfsWins ? T.blue : T.purple }}>{winnerAlgo}</strong>.
        </p>
      </div>

      <Card title="Latency Summary" sub={offloadResult ? "Measured after offloading" : "Predicted — offload not yet confirmed"} accent={T.green}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          {[
            ["Total Latency", `${totalLatency} ms`, "green"],
            ["Execution Time", `${winnerData.time} ms`, "blue"],
            ["Offloading Time", `${decidedCandidate.queueDelay} ms`, "amber"],
            ["Communication Time", `${decidedCandidate.networkDelay} ms`, "purple"],
            ["Selected Machine", `${m.name} (${m.machineId})`, "dim"],
            ["Selected Edge Server", decidedSrv.label, decidedKey === "A" ? "blue" : "green"],
            ["Workload", workload ? WORKLOAD_LABELS[workload] : "Live Data", "dim"],
            ["Winning Algorithm", winnerAlgo, gbfsWins ? "blue" : "purple"],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: T.fontSans }}>{l}</div>
              <Badge color={c}>{v}</Badge>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          {[
            { algo: "GBFS", data: gbfsData, color: T.blue, bg: T.blueBg, border: T.blueDim },
            { algo: "PSO", data: psoData, color: T.purple, bg: T.purpleBg, border: T.purpleDim },
          ].map(({ algo, data, color, bg, border }) => (
            <div key={algo} style={{ flex: "1 1 220px", border: `1px solid ${border}`, borderRadius: 8, padding: "12px 14px", background: bg }}>
              <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: T.fontSans, marginBottom: 6 }}>{algo} Result</div>
              <div style={{ fontSize: 13, fontFamily: T.fontMono, color: T.muted, lineHeight: 1.7 }}>
                Server: <strong style={{ color: T.text }}>{resolveServer(data.recommendedServer).label}</strong>
                <br />
                Latency: <strong style={{ color: T.text }}>{data.latency} ms</strong>
                <br />
                Processing Time: <strong style={{ color: T.text }}>{data.time} ms</strong>
                <br />
                Resource Utilization: <strong style={{ color: T.text }}>{data.utilization}%</strong>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <ComparisonEvaluationDashboard machine={m} gbfsData={gbfsData} psoData={psoData} offloadResult={offloadResult} />

      <DatabaseHistory history={history} />
    </div>
  );
};

/* ───────────────────────────────────────────────
   ERROR BOUNDARY
─────────────────────────────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(e) {
    return { hasError: true, error: e };
  }

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

/* ───────────────────────────────────────────────
   GLOBAL STYLESHEET
─────────────────────────────────────────────── */
function buildGlobalStyles(T) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; background: ${T.bg}; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: ${T.bg}; }
    ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: ${T.dim}; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .app-btn { will-change: transform; }
    .app-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
    .app-btn:active:not(:disabled) { transform: translateY(0); filter: brightness(0.96); }
    .app-btn:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; }
    .app-btn:disabled { opacity: 0.7; }
    .app-row:hover { background: ${T.blueBg} !important; }
    .app-clickable { transition: transform 0.14s ease, border-color 0.14s ease, box-shadow 0.14s ease; cursor: pointer; }
    .app-clickable:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.28); }
    .app-clickable:active { transform: translateY(0); }
    .app-clickable:focus-visible { outline: 2px solid ${T.blue}; outline-offset: 2px; }
    a, button { font-family: inherit; }
    button { outline: none; }
    .app-fade-in { animation: fadeIn 0.25s ease both; }
    svg, .recharts-wrapper, .recharts-surface, canvas { background: transparent !important; }
    @media (max-width: 900px) {
      .app-grid-21, .app-grid-311 { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 640px) {
      .app-grid-eq { grid-template-columns: 1fr !important; }
    }
  `;
}

/* ───────────────────────────────────────────────
   ROOT APP
─────────────────────────────────────────────── */
function App() {
  const [dark, setDark] = useState(true);
  const T = makeTheme(dark);
  const globalStyles = React.useMemo(() => buildGlobalStyles(T), [dark]);

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [workload, setWorkload] = useState(null);
  const [history, setHistory] = useState(loadHistory);

  useEffect(() => { saveHistory(history); }, [history]);

  const { machineData, loading: machinesLoading, error: machinesError, selectedId, setSelectedId, serverStatuses, loadMachines } = useMachines();

  const rawMachine = selectedId ? machineData[selectedId] : null;
  // `machine` (tier-merged) stays the "Current System" baseline used by
  // every comparison chart — unchanged from before. `tasks` is the
  // separately-generated batch that GBFS/PSO actually run against.
  const machine = applyWorkloadTier(rawMachine, workload);
  const taskBase = workload
    ? WORKLOAD_TIERS[rawMachine?.machineId]?.[workload]
    : (rawMachine ? { taskSize: rawMachine.taskSize, queueLength: rawMachine.queueLength, throughput: rawMachine.throughput } : null);
  const tasks = generateTaskBatch(taskBase);

  const {
    gbfsData, psoData, algoRunning, algoError,
    gbfsSim, psoSim, gbfsStage, psoIteration,
    offloadResult, offloading, offloadError,
    runBothAlgorithms, retryOffload, resetRun,
  } = useSimulationRunner({ machine, tasks, workload, setHistory });

  const decidedServerKey = (() => {
    if (!gbfsData || !psoData) return null;
    const gbfsBetter = gbfsData.latency <= psoData.latency;
    return (gbfsBetter ? gbfsData : psoData).recommendedServer ?? null;
  })();

  const handleSelectMachine = (id) => {
    setSelectedId(id);
    resetRun();
    setMaxReached(0);
    setWorkload(null);
  };

  const handleSetWorkload = (tier) => {
    setWorkload(tier);
    resetRun();
    setMaxReached((r) => Math.min(r, 1));
  };

  const handleRunBoth = () => {
    runBothAlgorithms({
      onProgress: (event) => {
        if (event === "algorithms-done") setMaxReached((r) => Math.max(r, 2));
        if (event === "offload-done") setMaxReached((r) => Math.max(r, 3));
      },
    });
  };

  const handleRetryOffload = () => {
    retryOffload({ onProgress: (event) => { if (event === "offload-done") setMaxReached((r) => Math.max(r, 3)); } });
  };

  const canNext = () => {
    if (step === 0) return !!selectedId;
    if (step === 1) return machine && WORKLOAD_TIERS[machine.machineId] ? !!workload : tasks.length > 0;
    if (step === 2) return !!offloadResult;
    return true;
  };

  const goNext = () => {
    const n = step + 1;
    setStep(n);
    setMaxReached((r) => Math.max(r, n));
  };

  const jumpTo = (i) => i <= maxReached && setStep(i);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <Step0Machine
            machineData={machineData}
            loading={machinesLoading}
            error={machinesError}
            selectedId={selectedId}
            setSelectedId={handleSelectMachine}
            onRetry={loadMachines}
          />
        );
      case 1:
        return machine ? <Step1CollectData machine={machine} workload={workload} setWorkload={handleSetWorkload} tasks={tasks} /> : null;
      case 2:
        return machine && tasks.length > 0 ? (
          <Step2Algorithms
            machine={machine}
            tasks={tasks}
            gbfsData={gbfsData}
            psoData={psoData}
            algoRunning={algoRunning}
            algoError={algoError}
            onRunBoth={handleRunBoth}
            gbfsSim={gbfsSim}
            psoSim={psoSim}
            gbfsStage={gbfsStage}
            psoIteration={psoIteration}
            offloading={offloading}
            offloadResult={offloadResult}
            offloadError={offloadError}
            onRetryOffload={handleRetryOffload}
            workload={workload}
          />
        ) : null;
      case 3:
        return machine ? <Step5Latency machine={machine} gbfsData={gbfsData} psoData={psoData} offloadResult={offloadResult} history={history} workload={workload} /> : null;
      default:
        return null;
    }
  };

  return (
    <ThemeCtx.Provider value={T}>
      <ErrorBoundary>
        <style>{globalStyles}</style>
        <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text }}>
          <Sidebar step={step} maxReached={maxReached} onJump={jumpTo} serverStatuses={serverStatuses} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <TopBar step={step} maxReached={maxReached} onJump={jumpTo} algoDecision={decidedServerKey} dark={dark} setDark={setDark} workload={workload} />
            <div style={{ flex: 1, padding: "18px 22px", overflowY: "auto", background: T.bg }}>
              {machine && step >= 1 && (
                <MainSimulationPipeline activeIdx={derivePipelineStage({ machine, algoRunning, gbfsData, psoData, offloadResult, step })} />
              )}
              <div key={step} className="app-fade-in">
                {renderStep()}
              </div>
            </div>
            <div
              style={{
                background: T.surface, borderTop: `1px solid ${T.border}`,
                padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center",
                flexShrink: 0,
                boxShadow: T.bg === "#eef0f5" ? "0 -1px 3px rgba(15,17,23,0.05)" : "0 -1px 3px rgba(0,0,0,0.25)",
              }}
            >
              <GhostBtn disabled={step === 0} onClick={() => setStep((p) => p - 1)}>← Back</GhostBtn>
              <span style={{ fontSize: 14, color: T.dim, fontFamily: T.fontMono }}>{STEPS[step].title}</span>
              <PrimaryBtn disabled={!canNext() || step >= 3} onClick={goNext}>
                {step >= 3 ? "Complete" : "Next →"}
              </PrimaryBtn>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </ThemeCtx.Provider>
  );
}
export default App;
