const task = (data) => ({
  ...data,
  queueLength: data.taskQueue,
  throughput: +(60 / data.processingTimeSec).toFixed(2),
  timePerProductMin: +(data.processingTimeSec / 60).toFixed(2),
  estimatedProductionPerHour: +(3600 / data.processingTimeSec).toFixed(2),
});

export const DEFAULT_TASKS_BY_MACHINE = {
  CPCM1: [
    task({ taskName: "Metal Sheet Cutting", workload: "high", machine: "CNC Plasma Cutting", timestamp: "6/2/2026 10:00", metalMaterial: "Mild Steel", thicknessMm: 6, sheetPlateSizeMm: "1500 x 3000", taskSize: 20, cuttingLengthMm: 4500, numberOfCuts: 50, processingTimeSec: 120, cpuUtilization: 85, memoryUtilization: 75, taskQueue: 12, networkLatencyMs: 40, networkBandwidthMbps: 30, energyUsageW: 90, machineStatus: "RUNNING" }),
    task({ taskName: "Plate Profiling", workload: "medium", machine: "CNC Plasma Cutting", timestamp: "6/2/2026 10:01", metalMaterial: "Mild Steel", thicknessMm: 8, sheetPlateSizeMm: "1500 x 3000", taskSize: 15, cuttingLengthMm: 2800, numberOfCuts: 30, processingTimeSec: 95, cpuUtilization: 68, memoryUtilization: 65, taskQueue: 7, networkLatencyMs: 32, networkBandwidthMbps: 45, energyUsageW: 78, machineStatus: "RUNNING" }),
    task({ taskName: "Hole and Slot Cutting", workload: "low", machine: "CNC Plasma Cutting", timestamp: "6/2/2026 10:02", metalMaterial: "Mild Steel", thicknessMm: 10, sheetPlateSizeMm: "1500 x 3000", taskSize: 10, cuttingLengthMm: 1800, numberOfCuts: 20, processingTimeSec: 70, cpuUtilization: 58, memoryUtilization: 60, taskQueue: 5, networkLatencyMs: 25, networkBandwidthMbps: 60, energyUsageW: 70, machineStatus: "RUNNING" }),
  ],
  PCM1: [
    task({ taskName: "Metal Plate Cutting", workload: "high", machine: "Plasma Cutting", timestamp: "6/2/2026 10:10", metalMaterial: "Mild Steel", thicknessMm: 10, sheetPlateSizeMm: "1500 x 3000", taskSize: 18, cuttingLengthMm: 4000, numberOfCuts: 45, processingTimeSec: 100, cpuUtilization: 80, memoryUtilization: 70, taskQueue: 8, networkLatencyMs: 38, networkBandwidthMbps: 35, energyUsageW: 85, machineStatus: "RUNNING" }),
    task({ taskName: "Plate Trimming", workload: "low", machine: "Plasma Cutting", timestamp: "6/2/2026 10:11", metalMaterial: "Mild Steel", thicknessMm: 8, sheetPlateSizeMm: "1500 x 3000", taskSize: 8, cuttingLengthMm: 2200, numberOfCuts: 22, processingTimeSec: 65, cpuUtilization: 55, memoryUtilization: 60, taskQueue: 4, networkLatencyMs: 25, networkBandwidthMbps: 55, energyUsageW: 68, machineStatus: "RUNNING" }),
    task({ taskName: "Shape Cutting", workload: "medium", machine: "Plasma Cutting", timestamp: "6/2/2026 10:12", metalMaterial: "Mild Steel", thicknessMm: 6, sheetPlateSizeMm: "1500 x 3000", taskSize: 12, cuttingLengthMm: 3000, numberOfCuts: 28, processingTimeSec: 82, cpuUtilization: 65, memoryUtilization: 63, taskQueue: 6, networkLatencyMs: 30, networkBandwidthMbps: 45, energyUsageW: 76, machineStatus: "RUNNING" }),
  ],
  PB2: [
    task({ taskName: "Metal Panel Spray Painting", workload: "high", machine: "Painting Booth", timestamp: "9/12/2026 10:42", material: "Mild Steel Metal Panels", numberOfPanelsComponents: 18, paintCoatingCycles: 3, paintCoverageAreaM2: 42, cuttingLengthMm: 0, numberOfCuts: 0, taskSize: 25, processingTimeSec: 210, cpuUtilization: 90, memoryUtilization: 80, taskQueue: 15, networkLatencyMs: 45, networkBandwidthMbps: 25, energyUsageW: 105, machineStatus: "RUNNING" }),
    task({ taskName: "Chassis Frame Painting", workload: "medium", machine: "Painting Booth", timestamp: "9/12/2026 10:43", material: "Mild Steel Frame", numberOfPanelsComponents: 10, paintCoatingCycles: 2, paintCoverageAreaM2: 28, cuttingLengthMm: 0, numberOfCuts: 0, taskSize: 18, processingTimeSec: 145, cpuUtilization: 65, memoryUtilization: 65, taskQueue: 8, networkLatencyMs: 35, networkBandwidthMbps: 45, energyUsageW: 85, machineStatus: "RUNNING" }),
    task({ taskName: "Metal Bracket Painting", workload: "low", machine: "Painting Booth", timestamp: "9/12/2026 10:44", material: "Mild Steel Brackets", numberOfPanelsComponents: 25, paintCoatingCycles: 2, paintCoverageAreaM2: 16, cuttingLengthMm: 0, numberOfCuts: 0, taskSize: 10, processingTimeSec: 90, cpuUtilization: 52, memoryUtilization: 58, taskQueue: 5, networkLatencyMs: 25, networkBandwidthMbps: 60, energyUsageW: 65, machineStatus: "RUNNING" }),
  ],
  WM1: [
    task({ taskName: "Chassis Frame Welding", workload: "high", machine: "Arc Welding", timestamp: "6/2/2026 10:30", metalMaterial: "Mild Steel", thicknessMm: 6, numberOfWeldPoints: 120, weldingLengthMm: 4800, cuttingLengthMm: 0, numberOfCuts: 0, taskSize: 22, processingTimeSec: 150, cpuUtilization: 90, memoryUtilization: 78, taskQueue: 14, networkLatencyMs: 42, networkBandwidthMbps: 25, energyUsageW: 95, machineStatus: "RUNNING" }),
    task({ taskName: "Bracket Joint Welding", workload: "medium", machine: "Arc Welding", timestamp: "6/2/2026 10:31", metalMaterial: "Mild Steel", thicknessMm: 5, numberOfWeldPoints: 75, weldingLengthMm: 3000, cuttingLengthMm: 0, numberOfCuts: 0, taskSize: 14, processingTimeSec: 95, cpuUtilization: 62, memoryUtilization: 63, taskQueue: 7, networkLatencyMs: 30, networkBandwidthMbps: 45, energyUsageW: 72, machineStatus: "RUNNING" }),
    task({ taskName: "Panel Frame Welding", workload: "low", machine: "Arc Welding", timestamp: "6/2/2026 10:32", metalMaterial: "Mild Steel", thicknessMm: 4, numberOfWeldPoints: 50, weldingLengthMm: 2100, cuttingLengthMm: 0, numberOfCuts: 0, taskSize: 9, processingTimeSec: 65, cpuUtilization: 52, memoryUtilization: 57, taskQueue: 4, networkLatencyMs: 22, networkBandwidthMbps: 60, energyUsageW: 65, machineStatus: "RUNNING" }),
  ],
  SM3: [
    task({ taskName: "Metal Sheet Shearing", workload: "high", machine: "Shearing Machine", timestamp: "6/2/2026 10:20", metalMaterial: "Mild Steel", thicknessMm: 6, sheetPlateSizeMm: "1500 x 3000", numberOfCuts: 40, cuttingLengthMm: 3500, taskSize: 16, processingTimeSec: 95, cpuUtilization: 78, memoryUtilization: 70, taskQueue: 10, networkLatencyMs: 38, networkBandwidthMbps: 32, energyUsageW: 86, machineStatus: "RUNNING" }),
    task({ taskName: "Sheet Blank Cutting", workload: "medium", machine: "Shearing Machine", timestamp: "6/2/2026 10:21", metalMaterial: "Mild Steel", thicknessMm: 5, sheetPlateSizeMm: "1500 x 3000", numberOfCuts: 28, cuttingLengthMm: 2500, taskSize: 11, processingTimeSec: 68, cpuUtilization: 60, memoryUtilization: 61, taskQueue: 6, networkLatencyMs: 28, networkBandwidthMbps: 50, energyUsageW: 70, machineStatus: "RUNNING" }),
    task({ taskName: "Metal Strip Cutting", workload: "low", machine: "Shearing Machine", timestamp: "6/2/2026 10:22", metalMaterial: "Mild Steel", thicknessMm: 4, sheetPlateSizeMm: "1500 x 3000", numberOfCuts: 18, cuttingLengthMm: 1600, taskSize: 7, processingTimeSec: 50, cpuUtilization: 48, memoryUtilization: 55, taskQueue: 3, networkLatencyMs: 20, networkBandwidthMbps: 65, energyUsageW: 62, machineStatus: "RUNNING" }),
  ],
};

export const TASK_DISPLAY_FIELDS = [
  ["Machine", "machine"],
  ["Task Size", "taskSize", "MB"],
  ["Cutting Length", "cuttingLengthMm", "mm"],
  ["Number of Cuts", "numberOfCuts"],
  ["Processing Time", "processingTimeSec", "sec"],
  ["CPU Utilization", "cpuUtilization", "%"],
  ["Memory Utilization", "memoryUtilization", "%"],
  ["Task Queue", "taskQueue"],
  ["Network Latency", "networkLatencyMs", "ms"],
  ["Network Bandwidth", "networkBandwidthMbps", "Mbps"],
  ["Energy Usage", "energyUsageW", "W"],
  ["Time per Product", "timePerProductMin", "min"],
  ["Estimated Production", "estimatedProductionPerHour", "products/hour"],
];

export const TASK_DETAIL_DISPLAY_FIELDS = [
  ["Task Name", "taskName"],
  ["Timestamp", "timestamp"],
  ["Metal Material", "metalMaterial"],
  ["Material", "material"],
  ["Thickness", "thicknessMm", "mm"],
];
