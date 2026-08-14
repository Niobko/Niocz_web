import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildStatusPayload } from "./_lib/game-status.mjs";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=0, must-revalidate"
};

export const handler = async () => {
  try {
    const configPath = path.join(process.cwd(), "data", "game-status.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(buildStatusPayload(config))
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

