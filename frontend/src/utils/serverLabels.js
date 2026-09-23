export const normalizeServerKey = (server) => {
  if (server === null || server === undefined || server === "") return "";
  const value = typeof server === "object"
    ? String(server.profile_id || server.server_id || server.name || "").trim()
    : String(server).trim();
  if (!value) return "";
  return value.includes(":") ? value.split(":").pop() : value;
};

export const formatServerLabel = (server) => {
  if (typeof server === "object" && server.name) return server.name;
  const key = normalizeServerKey(server);
  if (!key) return "Unassigned";

  const normalized = key.replace(/^SERVER[_-]?/i, "").replace(/^NODE[_-]?/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^(edge|cloud)$/i.test(normalized)) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  }

  return `Server ${normalized}`;
};

export const getServerShortLabel = (server) => {
  const key = normalizeServerKey(server);
  const base = key.replace(/^SERVER[_-]?/i, "").replace(/^NODE[_-]?/i, "").replace(/_/g, " ").trim();
  if (!base) return "N/A";
  return base.length <= 3 ? base.toUpperCase() : base.slice(0, 2).toUpperCase();
};

export const getServerCounts = (servers = []) => {
  const counts = {};
  servers.forEach((server) => {
    const key = normalizeServerKey(server);
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
};

export const getServerColor = (server, palette = [
  "#22c55e",
  "#a78bfa",
  "#60a5fa",
  "#fbbf24",
  "#f87171",
  "#34d399",
  "#c084fc",
  "#fca5a5",
]) => {
  const key = normalizeServerKey(server) || "default";
  let hash = 0;
  for (let idx = 0; idx < key.length; idx += 1) {
    hash = (hash * 31 + key.charCodeAt(idx)) >>> 0;
  }
  return palette[hash % palette.length];
};
