export const STEAM_PROVIDER_TYPE = "steam-pics-public-branch";
export const STEAM_BUILD_STORE = "nio-game-status";
export const STEAM_BUILD_KEY = "steam-public-builds-v1";
export const DEFAULT_SNAPSHOT_MAX_AGE_MS = 75 * 60 * 1000;

const cleanBuildId = value => {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).trim();
  return /^\d+$/.test(normalized) ? normalized : null;
};

const toIsoDate = value => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const unixSecondsToIsoDate = value => {
  if (value === null || value === undefined || value === "") return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return toIsoDate(seconds * 1000);
};

export const parsePublicBranch = appInfo => {
  const branch = appInfo?.depots?.branches?.public;
  const currentBuildId = cleanBuildId(branch?.buildid);
  if (!currentBuildId) return null;
  return {
    currentBuildId,
    lastSteamUpdate: unixSecondsToIsoDate(branch?.timeupdated)
  };
};

const loadSteamUser = async () => {
  const imported = await import("steam-user");
  return imported.default ?? imported;
};

const requestProductInfo = (client, appIds, timeoutMs) => new Promise((resolve, reject) => {
  let settled = false;

  const cleanup = () => {
    clearTimeout(timeout);
    client.removeListener?.("loggedOn", onLoggedOn);
    client.removeListener?.("error", onError);
    try {
      client.logOff?.();
    } catch {
      // The request is already complete; cleanup errors must not hide its result.
    }
  };

  const finish = (error, apps) => {
    if (settled) return;
    settled = true;
    cleanup();
    if (error) reject(error);
    else resolve(apps || {});
  };

  const onError = error => finish(error instanceof Error ? error : new Error(String(error)));
  const onLoggedOn = () => {
    try {
      client.getProductInfo(appIds, [], true, (error, apps) => finish(error, apps));
    } catch (error) {
      finish(error);
    }
  };

  const timeout = setTimeout(() => finish(new Error(`Steam PICS request timed out after ${timeoutMs} ms.`)), timeoutMs);
  client.once("loggedOn", onLoggedOn);
  client.once("error", onError);

  try {
    client.logOn({ anonymous: true });
  } catch (error) {
    finish(error);
  }
});

export const fetchSteamBuildSnapshot = async (games, options = {}) => {
  const entries = Object.entries(games || {});
  const appIds = [...new Set(entries
    .map(([, game]) => Number(game.appId))
    .filter(Number.isSafeInteger))];
  if (!appIds.length) throw new Error("No valid Steam App IDs are configured.");

  const SteamUser = options.SteamUser ?? await loadSteamUser();
  const client = options.client ?? new SteamUser({
    autoRelogin: false,
    enablePicsCache: false,
    changelistUpdateInterval: 0
  });
  const checkedAt = toIsoDate(options.now?.() ?? new Date());
  const apps = await requestProductInfo(client, appIds, options.timeoutMs ?? 25_000);
  const snapshotGames = {};
  const errors = {};

  for (const [slug, game] of entries) {
    const appId = String(game.appId);
    const parsed = parsePublicBranch(apps[appId]?.appinfo);
    if (!parsed) {
      errors[slug] = "Steam did not return public-branch build metadata.";
      continue;
    }
    snapshotGames[slug] = {
      appId,
      currentBuildId: parsed.currentBuildId,
      lastSteamUpdate: parsed.lastSteamUpdate ?? checkedAt,
      checkedAt
    };
  }

  if (!Object.keys(snapshotGames).length) {
    throw new Error("Steam returned no usable public-branch build metadata.");
  }
  return {
    schemaVersion: 1,
    provider: STEAM_PROVIDER_TYPE,
    lastCheckedAt: checkedAt,
    games: snapshotGames,
    errors
  };
};

const validSnapshotGame = (entry, configuredGame) => {
  if (!entry || String(entry.appId) !== String(configuredGame?.appId)) return null;
  const currentBuildId = cleanBuildId(entry.currentBuildId);
  if (!currentBuildId) return null;
  return {
    appId: String(configuredGame.appId),
    currentBuildId,
    lastSteamUpdate: toIsoDate(entry.lastSteamUpdate),
    checkedAt: toIsoDate(entry.checkedAt)
  };
};

export const mergeSteamSnapshots = (configuredGames, previous, fresh) => {
  const games = {};
  for (const [slug, configuredGame] of Object.entries(configuredGames || {})) {
    const candidate = validSnapshotGame(fresh?.games?.[slug], configuredGame)
      ?? validSnapshotGame(previous?.games?.[slug], configuredGame);
    if (candidate) games[slug] = candidate;
  }
  return {
    schemaVersion: 1,
    provider: STEAM_PROVIDER_TYPE,
    lastCheckedAt: toIsoDate(fresh?.lastCheckedAt) ?? toIsoDate(previous?.lastCheckedAt),
    games,
    errors: fresh?.errors || {}
  };
};

export const applySteamSnapshot = (config, snapshot) => {
  const configuredGames = config?.games || {};
  let liveGameCount = 0;
  const games = Object.fromEntries(Object.entries(configuredGames).map(([slug, game]) => {
    const live = validSnapshotGame(snapshot?.games?.[slug], game);
    if (!live) return [slug, game];
    liveGameCount += 1;
    return [slug, {
      ...game,
      currentBuildId: live.currentBuildId,
      lastSteamUpdate: live.lastSteamUpdate ?? game.lastSteamUpdate,
      steamCheckedAt: live.checkedAt ?? snapshot.lastCheckedAt
    }];
  }));
  return {
    ...config,
    provider: {
      ...config.provider,
      type: STEAM_PROVIDER_TYPE,
      automatic: true,
      schedule: "@hourly",
      lastCheckedAt: toIsoDate(snapshot?.lastCheckedAt) ?? config.provider?.lastCheckedAt ?? null,
      liveGameCount,
      totalGameCount: Object.keys(configuredGames).length
    },
    games
  };
};

export const isSteamSnapshotFresh = (snapshot, now = Date.now(), maxAgeMs = DEFAULT_SNAPSHOT_MAX_AGE_MS) => {
  const checkedAt = Date.parse(snapshot?.lastCheckedAt);
  return Number.isFinite(checkedAt) && now - checkedAt >= 0 && now - checkedAt <= maxAgeMs;
};

export const refreshSteamBuildSnapshot = async (configuredGames, store, options = {}) => {
  const previous = options.previous ?? await store.get(STEAM_BUILD_KEY, { type: "json" });
  const fresh = await fetchSteamBuildSnapshot(configuredGames, options);
  const merged = mergeSteamSnapshots(configuredGames, previous, fresh);
  await store.setJSON(STEAM_BUILD_KEY, merged);
  return merged;
};

