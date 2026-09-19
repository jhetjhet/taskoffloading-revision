const WORKLOAD_TARGETS = {
  low: 0.35,
  mid: 0.65,
  high: 0.95,
};

const average = (tasks, key) => (
  tasks.reduce((total, task) => total + Number(task[key] || 0), 0) / tasks.length
);

const serverCapacity = (server, tasks) => {
  const averageCpu = average(tasks, "cpu_demand_percent");
  const averageRam = average(tasks, "ram_demand_mb");
  const averagePayload = average(tasks, "payload_size_mb");
  return Math.min(
    (Number(server.cpu_cores || 0) * 100) / averageCpu,
    Number(server.max_ram_mb || 0) / averageRam,
    Number(server.storage_mb || 0) / averagePayload,
  );
};

export const getBenchmarkTaskCount = (workload, tasks, servers, maximum = 15) => {
  if (!tasks?.length || !servers?.length || !WORKLOAD_TARGETS[workload]) return 0;
  const profiles = servers.filter((server) => server.placement === "EDGE" || server.placement === "CLOUD");
  const uniqueProfiles = profiles.filter((server, index, list) => (
    list.findIndex((candidate) => candidate.placement === server.placement) === index
  ));
  const capacity = uniqueProfiles.reduce((total, server) => total + serverCapacity(server, tasks), 0);
  return Math.max(1, Math.min(maximum, Math.round(capacity * WORKLOAD_TARGETS[workload])));
};

export const buildBenchmarkBatch = (workload, tasks, servers) => {
  const count = getBenchmarkTaskCount(workload, tasks, servers);
  return Array.from({ length: count }, (_, index) => ({
    ...tasks[index % tasks.length],
    task_id: `${tasks[index % tasks.length].task_id}-B${index + 1}`,
    batch_index: index + 1,
  }));
};
