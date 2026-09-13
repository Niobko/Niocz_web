import { readFile } from "node:fs/promises";
import path from "node:path";

const cleanDigits = value => {
  const normalized = String(value ?? "").trim();
  return /^\d+$/.test(normalized) ? normalized : null;
};

export const applyAdminGameConfig = (config, rows = []) => {
  const adminBySlug = Object.fromEntries((rows || []).map(row => [row.game_slug, row]));
  return {
    ...config,
    games: Object.fromEntries(Object.entries(config.games || {}).map(([slug, game]) => {
      const admin = adminBySlug[slug];
      if (!admin) return [slug, game];
      return [slug, {
        ...game,
        appId: cleanDigits(admin.steam_app_id) || game.appId,
        verifiedBuildId: cleanDigits(admin.verified_build_id) || game.verifiedBuildId,
        supportedVersion: String(admin.supported_game_version || "").trim() || game.supportedVersion
      }];
    }))
  };
};

const loadStaticConfig = async () => {
  const configPath = path.join(process.cwd(), "data", "game-status.json");
  return JSON.parse(await readFile(configPath, "utf8"));
};

export const loadGameStatusConfig = async ({
  fetchImpl = fetch,
  env = process.env,
  logger = console,
  loadStatic = loadStaticConfig
} = {}) => {
  const config = await loadStatic();
  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseKey = String(env.SUPABASE_ANON_KEY || "").trim();
  if (!supabaseUrl || !supabaseKey) return config;

  try {
    const response = await fetchImpl(`${supabaseUrl}/rest/v1/game_versions?select=game_slug,steam_app_id,verified_build_id,supported_game_version`, {
      cache: "no-store",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json"
      }
    });
    if (!response.ok) throw new Error(`Supabase game configuration returned HTTP ${response.status}.`);
    const rows = await response.json();
    return applyAdminGameConfig(config, Array.isArray(rows) ? rows : []);
  } catch (error) {
    logger.warn("Admin game configuration is unavailable; using the checked-in fallback", error);
    return config;
  }
};
