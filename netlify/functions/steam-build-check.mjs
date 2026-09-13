import { getStore } from "@netlify/blobs";
import { loadGameStatusConfig } from "./_lib/game-config.mjs";
import {
  STEAM_BUILD_STORE,
  refreshSteamBuildSnapshot
} from "./_lib/steam-builds.mjs";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export const handler = async () => {
  try {
    const config = await loadGameStatusConfig();
    const store = getStore(STEAM_BUILD_STORE);
    const snapshot = await refreshSteamBuildSnapshot(config.games, store);
    const updatedGames = Object.keys(snapshot.games).length;

    console.log(`Steam build check completed for ${updatedGames}/${Object.keys(config.games || {}).length} games.`);
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: true, updatedGames, lastCheckedAt: snapshot.lastCheckedAt })
    };
  } catch (error) {
    console.error("Steam build check failed", error);
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ ok: false, error: "Steam build check failed." })
    };
  }
};
