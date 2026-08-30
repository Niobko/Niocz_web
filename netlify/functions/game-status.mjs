import { readFile } from "node:fs/promises";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { buildStatusPayload } from "./_lib/game-status.mjs";
import {
  STEAM_BUILD_KEY,
  STEAM_BUILD_STORE,
  applySteamSnapshot,
  isSteamSnapshotFresh,
  refreshSteamBuildSnapshot
} from "./_lib/steam-builds.mjs";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "netlify-cdn-cache-control": "no-store"
};

export const handler = async () => {
  try {
    const configPath = path.join(process.cwd(), "data", "game-status.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    let snapshot = null;

    try {
      const store = getStore(STEAM_BUILD_STORE);
      snapshot = await store.get(STEAM_BUILD_KEY, { type: "json" });
      if (!isSteamSnapshotFresh(snapshot)) {
        snapshot = await refreshSteamBuildSnapshot(config.games, store, { previous: snapshot });
      }
    } catch (error) {
      console.warn("Live Steam build data is unavailable; using the checked-in fallback", error);
    }

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(buildStatusPayload(applySteamSnapshot(config, snapshot)))
    };
  } catch (error) {
    console.error("Unable to load game status configuration", error);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Game status is temporarily unavailable." })
    };
  }
};

