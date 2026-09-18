/* ───────────────────────────────────────────────
   STATIC CONFIG — SERVERS, WIZARD STEPS, WORKLOAD TIERS
─────────────────────────────────────────────── */
export const SERVERS = {
  A: {
    label: "Edge Server A",
    sub: "Latency-Sensitive · Compute-Heavy",
    icon: "⚡",
    tag: "A",
    baseUrl: import.meta.env.VITE_SERVER_A_URL || "/api/a",
  },
  B: {
    label: "Cloud Server B",
    sub: "Energy-Efficient · Cloud-Hosted",
    icon: "☁️",
    tag: "B",
    baseUrl: import.meta.env.VITE_SERVER_B_URL || "/api/b",
  },
};

export const PRIMARY_BASE = SERVERS.A.baseUrl;

export const HISTORY_STORAGE_KEY = "edgeOffloadSim.history.v1";

export const STEPS = [
  { title: "Select Machine", short: "Machine", icon: "⚙" },
  { title: "Select Task Level", short: "Level", icon: "🎚" },
  { title: "Run GBFS + PSO", short: "Run", icon: "⟳" },
  { title: "Display Latency", short: "Latency", icon: "📈" },
];

export const PIPELINE_STAGES = ["Data", "GBFS + PSO", "Offloading", "Selected Server", "Completed", "Latency"];

export const derivePipelineStage = ({ machine, algoRunning, gbfsData, psoData, offloadResult, step }) => {
  if (!machine) return 0;
  if (algoRunning) return 1;
  if (gbfsData && psoData) {
    if (offloadResult) return step === 3 ? 5 : 4;
    return 2;
  }
  return 0;
};

export const WORKLOAD_TIERS = {
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

export const WORKLOAD_LABELS = { low: "Low", medium: "Mid", high: "High" };
export const WORKLOAD_PRIORITY = { low: "Low", medium: "Normal", high: "High" };
export const WORKLOAD_LEVELS = { low: 1, medium: 2, high: 3 };

export const filterTasksByWorkload = (tasks, selectedWorkload) => {
  if (!selectedWorkload) return tasks;
  const selectedLevel = WORKLOAD_LEVELS[selectedWorkload];
  return tasks.filter((task) => WORKLOAD_LEVELS[task.workload] <= selectedLevel);
};

export const applyWorkloadTier = (machine, tier) => {
  if (!machine || !tier) return machine;
  const overrides = WORKLOAD_TIERS[machine.machineId]?.[tier];
  if (!overrides) return machine;
  return { ...machine, ...overrides };
};

export const GBFS_STEPS = ["Task Input", "Identify Candidates", "Evaluate Heuristic", "Compare Nodes", "Select Best", "Decision"];
export const PSO_STEPS = ["Task Input", "Init Particles", "Evaluate Fitness", "Update Bests", "Update Positions", "Converge", "Decision"];
export const GBFS_GRAPH_STEPS = ["Task Input", "Identify", "Evaluate", "Compare", "Select", "Decision"];
export const TIMELINE_STEPS = ["Task Selected", "Server Selected", "Payload Transfer", "Server Processing", "Task Execution", "Offloading Complete"];

export const resolveServer = (key) => SERVERS[key] ?? SERVERS.A;

