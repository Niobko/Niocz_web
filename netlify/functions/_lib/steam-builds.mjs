export const STEAM_PROVIDER_TYPE = "steam-pics-public-branch";
export const STEAMCMD_PROVIDER_TYPE = "steamcmd-http-public-branch";
export const STEAM_BUILD_STORE = "nio-game-status";
export const STEAM_BUILD_KEY = "steam-public-builds-v1";
export const DEFAULT_SNAPSHOT_MAX_AGE_MS = 75 * 60 * 1000;
const STEAMCMD_API_BASE = "https://api.steamcmd.net/v1/info/";

export class SteamBuildError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "SteamBuildError";
    this.code = code;
  }
}

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

const requestSteamCmdAppInfo = async (appId, options = {}) => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new SteamBuildError("STEAM_UNAVAILABLE", "HTTPS fetch is not available in this runtime.");
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 8_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(encodeURIComponent(appId), STEAMCMD_API_BASE);
  url.searchParams.set("_", String(options.cacheBuster ?? Date.now()));

  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache"
      }
    });
    if (!response.ok) {
      throw new SteamBuildError(
        "STEAM_UNAVAILABLE",
        `Steam app-info returned HTTP ${response.status}.`
      );
    }

    const payload = await response.json();
    if (payload?.status !== "success") {
      throw new SteamBuildError("STEAM_UNAVAILABLE", "Steam app-info returned an unsuccessful response.");
    }

    const appInfo = payload?.data?.[String(appId)];
    if (!appInfo) {
      throw new SteamBuildError("STEAM_NO_BUILD", "Steam app-info did not contain the requested game.");
    }
    return appInfo;
  } catch (error) {
    if (error instanceof SteamBuildError) throw error;
    if (error?.name === "AbortError") {
      throw new SteamBuildError(
        "STEAM_TIMEOUT",
        `Steam app-info timed out after ${timeoutMs} ms.`,
        { cause: error }
      );
    }
    throw new SteamBuildError("STEAM_UNAVAILABLE", "Steam app-info request failed.", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchSteamCmdBuildSnapshot = async (games, options = {}) => {
  const entries = Object.entries(games || {});
  if (!entries.length) throw new SteamBuildError("STEAM_NO_BUILD", "No game was selected for the Steam check.");

  const checkedAt = toIsoDate(options.now?.() ?? new Date());
  const snapshotGames = {};
  const errors = {};
  let firstError = null;

  await Promise.all(entries.map(async ([slug, game]) => {
    const appId = cleanBuildId(game?.appId);
    if (!appId) {
      const error = new SteamBuildError("STEAM_NO_BUILD", `Game ${slug} has no valid Steam App ID.`);
      firstError ??= error;
      errors[slug] = error.message;
      return;
    }

    try {
      const appInfo = await requestSteamCmdAppInfo(appId, options);
      const parsed = parsePublicBranch(appInfo);
      if (!parsed) {
        throw new SteamBuildError("STEAM_NO_BUILD", "Steam did not return public-branch build metadata.");
      }
      snapshotGames[slug] = {
        appId,
        currentBuildId: parsed.currentBuildId,
        lastSteamUpdate: parsed.lastSteamUpdate ?? checkedAt,
        checkedAt
      };
    } catch (error) {
      firstError ??= error;
      errors[slug] = error?.message || "Steam app-info request failed.";
    }
  }));

  if (!Object.keys(snapshotGames).length) {
    throw firstError instanceof Error
      ? firstError
      : new SteamBuildError("STEAM_NO_BUILD", "Steam returned no usable public-branch build metadata.");
  }

  return {
    schemaVersion: 1,
    provider: STEAMCMD_PROVIDER_TYPE,
    lastCheckedAt: checkedAt,
    games: snapshotGames,
    errors
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
    provider: fresh?.provider ?? previous?.provider ?? STEAM_PROVIDER_TYPE,
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
      type: snapshot?.provider ?? STEAM_PROVIDER_TYPE,
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
