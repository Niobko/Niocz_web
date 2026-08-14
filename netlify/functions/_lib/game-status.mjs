const STATUSES = Object.freeze({
  functional: Object.freeze({ key: "functional", label: "Funkční", color: "green" }),
  pending: Object.freeze({ key: "pending", label: "Čeká na ověření", color: "orange" }),
  broken: Object.freeze({ key: "broken", label: "Nefunkční / vyžaduje update", color: "red" })
});

const cleanBuildId = value => {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value);
  return /^\d+$/.test(normalized) ? normalized : null;
};

export const resolveDisplayStatus = game => {
  if (game.override && STATUSES[game.override]) return STATUSES[game.override];
  if (game.manualStatus === "broken") return STATUSES.broken;

  const verifiedBuildId = cleanBuildId(game.verifiedBuildId);
  const currentBuildId = cleanBuildId(game.currentBuildId);
  if (verifiedBuildId && currentBuildId && verifiedBuildId !== currentBuildId) {
    return STATUSES.pending;
  }

  return STATUSES[game.manualStatus] || STATUSES.functional;
};

export const buildStatusPayload = config => ({
  schemaVersion: config.schemaVersion,
  provider: config.provider,
  games: Object.fromEntries(Object.entries(config.games || {}).map(([slug, game]) => [slug, {
    ...game,
    appId: String(game.appId),
    verifiedBuildId: cleanBuildId(game.verifiedBuildId),
    currentBuildId: cleanBuildId(game.currentBuildId),
    displayStatus: resolveDisplayStatus(game)
  }]))
});

