import { readFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { buildStatusPayload } from "./_lib/game-status.mjs";
import {
  STEAM_BUILD_KEY,
  STEAM_BUILD_STORE,
  applySteamSnapshot,
  fetchSteamCmdBuildSnapshot,
  isSteamSnapshotFresh,
  mergeSteamSnapshots,
  refreshSteamBuildSnapshot
} from "./_lib/steam-builds.mjs";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "netlify-cdn-cache-control": "no-store"
};

const jsonResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: { ...jsonHeaders, ...headers },
  body: JSON.stringify(body)
});

const requestMethod = event => String(event?.httpMethod || "GET").toUpperCase();
const legacyRefreshRequested = event => {
  const value = String(event?.queryStringParameters?.refresh || "").toLowerCase();
  return value === "1" || value === "true";
};

export const isManualRefreshRequest = event => requestMethod(event) === "POST";

export const readManualRefreshGameSlug = event => {
  const contentType = String(event?.headers?.["content-type"] || event?.headers?.["Content-Type"] || "");
  if (!contentType.toLowerCase().startsWith("application/json")) {
    const error = new Error("Požadavek ruční kontroly musí být JSON.");
    error.statusCode = 415;
    error.code = "INVALID_CONTENT_TYPE";
    throw error;
  }

  const rawBody = event?.isBase64Encoded
    ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
    : String(event?.body || "");
  if (!rawBody || rawBody.length > 512) {
    const error = new Error("Požadavek ruční kontroly nemá platná data.");
    error.statusCode = 400;
    error.code = "INVALID_REQUEST";
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    const error = new Error("Požadavek ruční kontroly obsahuje neplatný JSON.");
    error.statusCode = 400;
    error.code = "INVALID_JSON";
    throw error;
  }

  const gameSlug = typeof payload?.gameSlug === "string" ? payload.gameSlug.trim() : "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gameSlug) || gameSlug.length > 80) {
    const error = new Error("Nebyla vybrána platná hra pro kontrolu Steam buildu.");
    error.statusCode = 400;
    error.code = "INVALID_GAME";
    throw error;
  }
  return gameSlug;
};

const loadStatusConfig = async () => {
  const configPath = path.join(process.cwd(), "data", "game-status.json");
  return JSON.parse(await readFile(configPath, "utf8"));
};

const manualRefreshFailure = error => {
  if (error?.code === "STEAM_TIMEOUT") {
    return {
      statusCode: 504,
      code: "STEAM_TIMEOUT",
      message: "Steam neodpověděl včas. Zkuste ruční kontrolu znovu za chvíli."
    };
  }
  if (error?.code === "STEAM_NO_BUILD") {
    return {
      statusCode: 502,
      code: "STEAM_NO_BUILD",
      message: "Steam momentálně nevrátil veřejný build této hry."
    };
  }
  return {
    statusCode: 502,
    code: "STEAM_UNAVAILABLE",
    message: "Steam app-info je momentálně nedostupné. Zkuste kontrolu za chvíli znovu."
  };
};

export const createGameStatusHandler = ({
  loadConfig = loadStatusConfig,
  openStore = () => getStore(STEAM_BUILD_STORE),
  fetchManualSnapshot = fetchSteamCmdBuildSnapshot,
  refreshStoredSnapshot = refreshSteamBuildSnapshot,
  logger = console
} = {}) => async (event = {}) => {
  const method = requestMethod(event);
  if (method !== "GET" && method !== "POST") {
    return jsonResponse(405, {
      code: "METHOD_NOT_ALLOWED",
      error: "Tento endpoint podporuje pouze GET a POST."
    }, { allow: "GET, POST" });
  }

  if (method === "GET" && legacyRefreshRequested(event)) {
    return jsonResponse(405, {
      code: "MANUAL_REFRESH_REQUIRES_POST",
      error: "Ruční kontrola vyžaduje nový POST požadavek pro konkrétní hru. Obnovte stránku a zkuste to znovu."
    }, { allow: "GET, POST" });
  }

  try {
    const config = await loadConfig();

    if (isManualRefreshRequest(event)) {
      let gameSlug;
      try {
        gameSlug = readManualRefreshGameSlug(event);
      } catch (error) {
        return jsonResponse(error.statusCode || 400, {
          code: error.code || "INVALID_REQUEST",
          error: error.message
        });
      }

      const configuredGame = config.games?.[gameSlug];
      if (!configuredGame) {
        return jsonResponse(404, {
          code: "GAME_NOT_FOUND",
          error: "Vybraná hra není v kontrole Steam buildu nakonfigurována."
        });
      }

      let freshSnapshot;
      try {
        freshSnapshot = await fetchManualSnapshot({ [gameSlug]: configuredGame }, { timeoutMs: 8_000 });
      } catch (error) {
        logger.error("Manual Steam build refresh failed", {
          gameSlug,
          code: error?.code,
          message: error?.message
        });
        const failure = manualRefreshFailure(error);
        return jsonResponse(failure.statusCode, { code: failure.code, error: failure.message });
      }

      let store = null;
      let previousSnapshot = null;
      try {
        store = openStore();
        previousSnapshot = await store.get(STEAM_BUILD_KEY, { type: "json" });
      } catch (error) {
        logger.warn("Fresh Steam build was loaded, but the previous Netlify snapshot is unavailable", error);
      }

      const mergedSnapshot = mergeSteamSnapshots(config.games, previousSnapshot, freshSnapshot);
      if (store) {
        try {
          await store.setJSON(STEAM_BUILD_KEY, {
            ...mergedSnapshot,
            provider: previousSnapshot?.provider ?? mergedSnapshot.provider,
            lastCheckedAt: previousSnapshot?.lastCheckedAt ?? null
          });
        } catch (error) {
          logger.warn("Fresh Steam build was loaded, but the Netlify snapshot could not be saved", error);
        }
      }

      return jsonResponse(200, {
        ...buildStatusPayload(applySteamSnapshot(config, mergedSnapshot)),
        refresh: {
          fresh: true,
          gameSlug,
          checkedAt: freshSnapshot.games?.[gameSlug]?.checkedAt ?? freshSnapshot.lastCheckedAt,
          source: freshSnapshot.provider
        }
      });
    }

    let snapshot = null;
    try {
      const store = openStore();
      snapshot = await store.get(STEAM_BUILD_KEY, { type: "json" });
      if (!isSteamSnapshotFresh(snapshot)) {
        snapshot = await refreshStoredSnapshot(config.games, store, { previous: snapshot });
      }
    } catch (error) {
      logger.warn("Live Steam build data is unavailable; using the checked-in fallback", error);
    }

    return jsonResponse(200, buildStatusPayload(applySteamSnapshot(config, snapshot)));
  } catch (error) {
    logger.error("Unable to load game status configuration", error);
    return jsonResponse(500, {
      code: "GAME_STATUS_UNAVAILABLE",
      error: "Údaje o stavu verzí jsou dočasně nedostupné."
    });
  }
};

export const handler = createGameStatusHandler();

