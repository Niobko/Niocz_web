const header = document.querySelector('[data-header]');
const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-menu]');
const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 16);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });
toggle?.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
}));

const createSupportUi = () => {
  const authButton = document.querySelector('.main-nav [data-auth-open]');
  if (!authButton) return null;

  const actions = document.createElement('div');
  actions.className = 'nav-account-actions';
  authButton.before(actions);
  actions.append(authButton);

  const openButton = document.createElement('button');
  openButton.className = 'nav-support';
  openButton.type = 'button';
  openButton.textContent = 'Podpořit projekt';
  openButton.setAttribute('aria-haspopup', 'dialog');
  openButton.setAttribute('aria-controls', 'support-modal');
  openButton.setAttribute('aria-expanded', 'false');
  openButton.dataset.supportOpen = '';
  actions.append(openButton);

  const modal = document.createElement('div');
  modal.id = 'support-modal';
  modal.className = 'auth-modal support-modal';
  modal.dataset.supportModal = '';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="auth-backdrop" data-support-close></div>
    <section class="auth-dialog support-dialog" role="dialog" aria-modal="true" aria-labelledby="support-title" aria-describedby="support-description support-note" tabindex="-1">
      <button class="auth-close" type="button" data-support-close aria-label="Zavřít podporu projektu">×</button>
      <p class="eyebrow">Dobrovolná podpora</p>
      <h2 id="support-title">Podpořit NioCZ LOC</h2>
      <p id="support-description" class="support-copy">Pokud vám moje překlady pomáhají a chcete dobrovolně podpořit další práci na NioCZ LOC, můžete tak učinit zde.</p>
      <a class="button button-primary support-cta" href="https://revolut.me/niokyuubi" target="_blank" rel="noopener noreferrer">Podpořit NioCZ LOC <span aria-hidden="true">↗</span></a>
      <p id="support-note" class="support-note">Podpora je dobrovolná a není podmínkou používání překladů.</p>
    </section>`;
  document.body.append(modal);

  return { modal, openButton };
};

const supportUi = createSupportUi();
document.querySelectorAll('[data-year]').forEach(node => node.textContent = new Date().getFullYear());
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion || !('IntersectionObserver' in window)) {
  document.querySelectorAll('.reveal').forEach(node => node.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(node => observer.observe(node));
}

const settings = window.NIO_CONFIG || {};
const gameStatusDefinitions = {
  functional: { key: 'functional', label: 'Funkční', color: 'green' },
  pending: { key: 'pending', label: 'Čeká na ověření', color: 'orange' },
  broken: { key: 'broken', label: 'Nefunkční / vyžaduje update', color: 'red' }
};

// Safe embedded fallback for local file previews and temporary API/JSON outages.
// The Netlify endpoint and data/game-status.json remain the primary sources.
const fallbackGameStatuses = Object.freeze({
  'the-spell-brigade': { name: 'The Spell Brigade', appId: '2904000', supportedVersion: 'v1.6.17718', verifiedBuildId: '24087913', currentBuildId: '24087913', lastSteamUpdate: '2026-07-08T12:24:22Z', manualStatus: 'functional', override: null },
  warhounds: { name: 'Warhounds', appId: '3929470', supportedVersion: 'v1.0.1', verifiedBuildId: '24907599', currentBuildId: '24907599', lastSteamUpdate: '2026-08-24T15:26:01Z', manualStatus: 'functional', override: null },
  'powerwash-simulator-2': { name: 'PowerWash Simulator 2', appId: '2968420', supportedVersion: 'v1.3.0', verifiedBuildId: '23737596', currentBuildId: '23737596', lastSteamUpdate: '2026-07-16T13:48:18Z', manualStatus: 'functional', override: null },
  'hearth-and-hamlet': { name: 'Hearth and Hamlet', appId: '4315040', supportedVersion: 'v1.0.06', verifiedBuildId: '24970582', currentBuildId: '25004659', lastSteamUpdate: '2026-08-29T03:54:15Z', manualStatus: 'functional', override: null },
  kynseed: { name: 'Kynseed', appId: '758870', supportedVersion: 'v1.3', verifiedBuildId: '24006355', currentBuildId: '24006355', lastSteamUpdate: '2026-07-01T17:15:53Z', manualStatus: 'functional', override: null },
  'alchemy-factory': { name: 'Alchemy Factory', appId: '3669570', supportedVersion: 'v0.5.4539', verifiedBuildId: '23962166', currentBuildId: '23962166', lastSteamUpdate: '2026-06-29T08:20:17Z', manualStatus: 'functional', override: null },
  'e-shop-tycoon': { name: 'E-Shop Tycoon', appId: '4249850', supportedVersion: 'v1.0.8-17ec132', verifiedBuildId: '24775292', currentBuildId: '24971980', lastSteamUpdate: '2026-08-27T14:58:52Z', manualStatus: 'functional', override: null },
  'yet-another-zombie-survivors': { name: 'Yet Another Zombie Survivors', appId: '2163330', supportedVersion: 'v1.0.0c2_S', verifiedBuildId: '24969189', currentBuildId: '24969189', lastSteamUpdate: '2026-08-27T11:20:11Z', manualStatus: 'functional', override: null },
  cloverpit: { name: 'CloverPit', appId: '3314790', supportedVersion: 'v1.4.11', verifiedBuildId: '22785177', currentBuildId: '22785177', lastSteamUpdate: '2026-04-14T17:27:54Z', manualStatus: 'functional', override: null },
  timberborn: { name: 'Timberborn', appId: '1062090', supportedVersion: 'v1.0.13.1-b769e88-sw', verifiedBuildId: '23107127', currentBuildId: '23107127', lastSteamUpdate: '2026-05-06T10:07:38Z', manualStatus: 'functional', override: null },
  restory: { name: 'ReStory: Chill Electronics Repairs', appId: '3812600', supportedVersion: '1.0.015R', verifiedBuildId: '24863916', currentBuildId: '24885009', lastSteamUpdate: '2026-08-22T23:14:40Z', manualStatus: 'functional', override: null },
  'leafy-corner': { name: 'Leafy Corner', appId: '3558600', supportedVersion: 'v1.0.3(ws)', verifiedBuildId: '24512633', currentBuildId: '24512633', lastSteamUpdate: '2026-08-02T09:48:46Z', manualStatus: 'functional', override: null },
  'bookshop-simulator': { name: 'Bookshop Simulator', appId: '3467040', supportedVersion: 'v1.0.1233', verifiedBuildId: '24319622', currentBuildId: '24788751', lastSteamUpdate: '2026-08-18T03:26:43Z', manualStatus: 'functional', override: null },
  'factory-planner': { name: 'Factory Planner', appId: '3679930', supportedVersion: 'EA v1.0.11', verifiedBuildId: '22069907', currentBuildId: '22069907', lastSteamUpdate: '2026-02-24T08:42:18Z', manualStatus: 'functional', override: null },
  'streamer-life-simulator-2': { name: 'Streamer Life Simulator 2', appId: '2890830', supportedVersion: 'Aktuální verze', verifiedBuildId: '21799183', currentBuildId: '21799183', lastSteamUpdate: '2026-02-05T14:00:15Z', manualStatus: 'functional', override: null },
  'the-universim': { name: 'The Universim', appId: '352720', supportedVersion: 'v1.0.02.48225', verifiedBuildId: '16850856', currentBuildId: '16850856', lastSteamUpdate: '2024-12-25T21:57:54Z', manualStatus: 'functional', override: null },
  'youtubers-life-2': { name: 'Youtubers Life 2', appId: '1493760', supportedVersion: 'v1.4.0', verifiedBuildId: '20266715', currentBuildId: '20266715', lastSteamUpdate: '2025-10-06T08:19:20Z', manualStatus: 'functional', override: null },
  catmailco: { name: 'CatMailCo', appId: '4380490', supportedVersion: 'patch 6', verifiedBuildId: '24261759', currentBuildId: '24865609', lastSteamUpdate: '2026-08-21T15:49:55Z', manualStatus: 'functional', override: null }
});

let activeGameStatuses = fallbackGameStatuses;
let activeGameStatusOverrides = {};

const normalizeComparableValue = value => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeGameStatusOverride = row => {
  if (!row || !gameStatusDefinitions[row.status]) return null;
  return {
    status: row.status,
    verifiedBuildId: normalizeComparableValue(row.verified_build ?? row.verifiedBuildId),
    verifiedVersion: normalizeComparableValue(row.verified_version ?? row.verifiedVersion),
    updatedAt: row.updated_at ?? row.updatedAt ?? null
  };
};

const resolveGameDisplayStatus = game => {
  const statusOverride = normalizeGameStatusOverride(game?.statusOverride);
  if (statusOverride) {
    if (statusOverride.status === 'pending') return gameStatusDefinitions.pending;
    if (statusOverride.status === 'broken') return gameStatusDefinitions.broken;

    const currentBuildId = normalizeComparableValue(game?.currentBuildId);
    if (currentBuildId && statusOverride.verifiedBuildId !== currentBuildId) {
      return gameStatusDefinitions.pending;
    }

    const currentVersion = normalizeComparableValue(game?.currentVersion ?? game?.latestVersion);
    if (!currentBuildId && currentVersion && statusOverride.verifiedVersion && currentVersion !== statusOverride.verifiedVersion) {
      return gameStatusDefinitions.pending;
    }

    return gameStatusDefinitions.functional;
  }

  if (game?.override && gameStatusDefinitions[game.override]) return gameStatusDefinitions[game.override];
  if (game?.manualStatus === 'broken') return gameStatusDefinitions.broken;

  const verifiedBuildId = normalizeComparableValue(game?.verifiedBuildId);
  const currentBuildId = normalizeComparableValue(game?.currentBuildId);
  if (currentBuildId && (!verifiedBuildId || verifiedBuildId !== currentBuildId)) {
    return gameStatusDefinitions.pending;
  }

  return gameStatusDefinitions[game?.manualStatus] || game?.displayStatus || gameStatusDefinitions.functional;
};

const applyGameStatuses = games => {
  if (games) activeGameStatuses = games;
  document.querySelectorAll('[data-game-status]').forEach(node => {
    const game = games?.[node.dataset.gameStatus];
    if (!game) return;
    const status = resolveGameDisplayStatus(game);
    node.dataset.statusState = status.key;
    node.dataset.statusColor = status.color;
    node.setAttribute('aria-label', `Stav překladu: ${status.label}`);
    const label = node.querySelector('[data-game-status-label]');
    if (label) label.textContent = status.label;
  });
};

const loadGameStatuses = async ({ forceSteamRefresh = false, gameSlug: requestedGameSlug = '' } = {}) => {
  const apiEndpoint = settings.gameStatusEndpoint || '/api/game-status';

  if (forceSteamRefresh) {
    if (window.location.protocol === 'file:') {
      throw new Error('Ruční kontrola funguje pouze na nasazeném webu přes Netlify.');
    }
    if (!requestedGameSlug) {
      throw new Error('Pro ruční kontrolu nebyla vybrána žádná hra.');
    }

    let response;
    try {
      response = await fetch(apiEndpoint, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameSlug: requestedGameSlug })
      });
    } catch {
      throw new Error('Server ruční kontroly není dostupný. Zkontrolujte připojení a zkuste to znovu.');
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error || `Server ruční kontroly vrátil chybu HTTP ${response.status}.`);
    }
    if (payload?.refresh?.fresh !== true || payload.refresh.gameSlug !== requestedGameSlug) {
      throw new Error('Server nepotvrdil čerstvou kontrolu Steam buildu. Obnovte stránku a zkuste to znovu.');
    }
    if (!payload?.games?.[requestedGameSlug]) {
      throw new Error('Steam kontrola nevrátila údaje pro tuto hru.');
    }

    window.NIO_GAME_STATUS_PROVIDER = payload.provider || {};
    return payload.games;
  }

  const endpoints = window.location.protocol === 'file:'
    ? []
    : [
        apiEndpoint,
        new URL('data/game-status.json', document.baseURI).href
      ];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) {
        lastError = new Error(`Game status request failed with status ${response.status}.`);
        continue;
      }
      const payload = await response.json();
      if (payload?.games) {
        window.NIO_GAME_STATUS_PROVIDER = payload.provider || {};
        return payload.games;
      }
      lastError = new Error('Game status response did not contain any games.');
    } catch (error) {
      lastError = error;
      // Keep the server-rendered safe status and try the static JSON fallback.
    }
  }

  window.NIO_GAME_STATUS_PROVIDER = { type: 'embedded-fallback', automatic: false, lastCheckedAt: '2026-08-30T00:00:00Z' };
  return fallbackGameStatuses;
};
const configured = settings.supabaseUrl?.startsWith('https://') && !settings.supabaseAnonKey?.startsWith('DOPLNTE_');
const db = configured && window.supabase ? window.supabase.createClient(settings.supabaseUrl, settings.supabaseAnonKey) : null;
window.NIO_SUPABASE_CLIENT = db;

const loadGameStatusOverrides = async () => {
  if (!db) return {};
  const { data, error } = await db
    .from('game_status_overrides')
    .select('game_slug,status,verified_build,verified_version,updated_at');
  if (error) {
    console.warn('Game status overrides are not available yet', error);
    return {};
  }

  return Object.fromEntries((data || [])
    .map(row => [row.game_slug, normalizeGameStatusOverride(row)])
    .filter(([, override]) => Boolean(override)));
};

const mergeGameStatusOverrides = (games, overrides) => Object.fromEntries(
  Object.entries(games || {}).map(([slug, game]) => [slug, {
    ...game,
    statusOverride: overrides?.[slug] || null
  }])
);

const loadCombinedGameStatuses = async () => {
  const [games, overrides] = await Promise.all([loadGameStatuses(), loadGameStatusOverrides()]);
  activeGameStatusOverrides = overrides;
  activeGameStatuses = mergeGameStatusOverrides(games, overrides);
  applyGameStatuses(activeGameStatuses);
  return activeGameStatuses;
};

applyGameStatuses(fallbackGameStatuses);
window.NIO_GAME_STATUSES_READY = loadCombinedGameStatuses();
const gameSlug = document.body.dataset.game?.trim() || '';
const authModal = document.querySelector('[data-auth-modal]');
const authForm = document.querySelector('[data-auth-form]');
const supportModal = supportUi?.modal;
const supportDialog = supportModal?.querySelector('.support-dialog');
let supportReturnFocus = null;
let authMode = 'login';
let currentUser = null;
let ownGameRating = { stars: null, reaction: null };
let gameRatingBusy = false;
let canManageGameStatuses = false;
let gameStatusSaveBusy = false;
let gameStatusRefreshBusy = false;

const setMessage = (node, message, error = false) => {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('error', error);
};
const openAuth = () => {
  if (!authModal) return;
  authModal.hidden = false;
  document.body.classList.add('modal-open');
  setTimeout(() => document.querySelector('[data-auth-email]')?.focus(), 0);
};
const closeAuth = () => {
  if (!authModal) return;
  authModal.hidden = true;
  document.body.classList.remove('modal-open');
};
const openSupport = event => {
  if (!supportModal) return;
  supportReturnFocus = event.currentTarget;
  supportModal.hidden = false;
  supportUi.openButton.setAttribute('aria-expanded', 'true');
  document.body.classList.add('modal-open');
  menu?.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
  requestAnimationFrame(() => supportDialog?.focus());
};
const closeSupport = () => {
  if (!supportModal || supportModal.hidden) return;
  supportModal.hidden = true;
  supportUi.openButton.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('modal-open');
  supportReturnFocus?.focus();
  supportReturnFocus = null;
};

const createDetailCommunityUi = () => {
  const detailTitle = document.querySelector('.detail-title');
  const versionBox = detailTitle?.querySelector(':scope > .version-box');
  const downloadCard = document.querySelector('.detail-grid > .download-card');
  if (!gameSlug || !detailTitle || !versionBox || !downloadCard) return null;

  const heroSide = document.createElement('div');
  heroSide.className = 'detail-hero-side';
  versionBox.replaceWith(heroSide);

  const rating = document.createElement('section');
  rating.className = 'game-rating-card';
  rating.setAttribute('aria-label', 'Hodnocení překladu');
  rating.innerHTML = `
    <div class="game-rating-controls">
      <div class="rating-stars" role="group" aria-label="Hodnocení od 1 do 5 hvězdiček">
        ${[1, 2, 3, 4, 5].map(value => `<button type="button" data-rating-control data-rating-star="${value}" aria-label="${value} z 5 hvězdiček" aria-pressed="false">★</button>`).join('')}
      </div>
      <span class="rating-score"><strong data-rating-average>—</strong>/5 · <span data-rating-count>0</span></span>
      <div class="rating-reactions" role="group" aria-label="Líbí nebo nelíbí se mi překlad">
        <button type="button" data-rating-control data-rating-reaction="1" aria-label="Líbí se mi" aria-pressed="false"><span aria-hidden="true">👍</span> <span data-like-count>0</span></button>
        <button type="button" data-rating-control data-rating-reaction="-1" aria-label="Nelíbí se mi" aria-pressed="false"><span aria-hidden="true">👎</span> <span data-dislike-count>0</span></button>
      </div>
    </div>
    <p class="rating-message" data-rating-message role="status">Načítám hodnocení…</p>`;
  heroSide.append(rating);

  const statusControl = document.createElement('div');
  statusControl.className = 'version-status-control';
  statusControl.dataset.statusState = 'pending';
  statusControl.innerHTML = `
    <span class="version-chip" data-version-trigger-version>—</span>
    <button class="version-status-toggle" type="button" aria-expanded="false" aria-controls="version-status-panel">
      <i aria-hidden="true"></i>
      <span data-version-trigger-label>Načítám…</span>
      <span class="version-toggle-chevron" aria-hidden="true">⌄</span>
    </button>`;

  const statusPanel = document.createElement('section');
  statusPanel.className = 'version-status-panel';
  statusPanel.id = 'version-status-panel';
  statusPanel.hidden = true;
  statusPanel.dataset.statusState = 'pending';
  statusPanel.setAttribute('aria-labelledby', 'version-status-title');
  statusPanel.innerHTML = `
    <div class="version-status-heading">
      <h2 id="version-status-title">Stav verze</h2>
      <div class="version-status-heading-actions">
        <button class="version-status-refresh" type="button" data-version-refresh aria-label="Ručně zkontrolovat aktuální Steam build" title="Zkontrolovat aktuální Steam build">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 7v5h-5"></path>
            <path d="M4 17v-5h5"></path>
            <path d="M6.1 8.5A7 7 0 0 1 18.8 7L20 9"></path>
            <path d="M17.9 15.5A7 7 0 0 1 5.2 17L4 15"></path>
          </svg>
        </button>
        <span class="status version-panel-status"><i></i><span data-version-status-label>Načítám stav…</span></span>
      </div>
    </div>
    <dl>
      <div><dt>Current Version</dt><dd data-current-version>—</dd></div>
      <div><dt>Current Build</dt><dd data-current-build>—</dd></div>
      <div><dt>Latest Build</dt><dd data-latest-build>—</dd></div>
      <div><dt>Last Steam Update</dt><dd data-last-steam-update>—</dd></div>
    </dl>
    <p class="version-status-summary" data-version-status-summary role="status" aria-live="polite">Načítám údaje o kompatibilitě…</p>
    <a class="steamdb-link" data-steamdb-link href="https://steamdb.info/" target="_blank" rel="noopener noreferrer">Zobrazit na SteamDB <span aria-hidden="true">↗</span></a>`;

  const adminStatusEditor = document.createElement('div');
  adminStatusEditor.className = 'game-status-admin-editor';
  adminStatusEditor.dataset.gameStatusAdmin = '';
  adminStatusEditor.hidden = true;
  adminStatusEditor.innerHTML = `
    <button class="game-status-admin-toggle" type="button" aria-expanded="false" aria-controls="game-status-admin-menu" aria-label="Změnit stav překladu" title="Změnit stav překladu">
      <span aria-hidden="true">⌄</span>
    </button>
    <div class="game-status-admin-menu" id="game-status-admin-menu" role="menu" aria-label="Změnit stav překladu" hidden>
      <strong>Změnit stav</strong>
      ${Object.values(gameStatusDefinitions).map(status => `
        <button type="button" role="menuitemradio" aria-checked="false" data-admin-game-status="${status.key}">
          <i data-status-color="${status.color}" aria-hidden="true"></i>
          <span>${status.label}</span>
        </button>`).join('')}
      <p class="game-status-admin-message" data-admin-game-status-message role="status"></p>
    </div>`;
  statusControl.append(adminStatusEditor);
  statusControl.append(statusPanel);
  heroSide.append(statusControl);

  const statusToggle = statusControl.querySelector('.version-status-toggle');
  const refreshButton = statusPanel.querySelector('[data-version-refresh]');
  const adminStatusToggle = adminStatusEditor.querySelector('.game-status-admin-toggle');
  const adminStatusMenu = adminStatusEditor.querySelector('.game-status-admin-menu');
  const setStatusPanelOpen = open => {
    statusPanel.hidden = !open;
    statusToggle.setAttribute('aria-expanded', String(open));
  };
  const setAdminStatusMenuOpen = open => {
    adminStatusMenu.hidden = !open;
    adminStatusToggle.setAttribute('aria-expanded', String(open));
  };
  statusToggle.addEventListener('click', () => setStatusPanelOpen(statusPanel.hidden));
  refreshButton.addEventListener('click', refreshCurrentGameStatus);
  adminStatusToggle.addEventListener('click', () => setAdminStatusMenuOpen(adminStatusMenu.hidden));
  adminStatusMenu.querySelectorAll('[data-admin-game-status]').forEach(button => {
    button.addEventListener('click', () => saveGameStatusOverride(button.dataset.adminGameStatus));
  });
  document.addEventListener('click', event => {
    if (!statusPanel.hidden && !statusControl.contains(event.target)) setStatusPanelOpen(false);
    if (!adminStatusMenu.hidden && !adminStatusEditor.contains(event.target)) setAdminStatusMenuOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!adminStatusMenu.hidden) {
      setAdminStatusMenuOpen(false);
      adminStatusToggle.focus();
    } else if (!statusPanel.hidden) {
      setStatusPanelOpen(false);
      statusToggle.focus();
    }
  });

  const downloadButton = downloadCard.querySelector('[data-download]');
  if (downloadButton) {
    const actions = document.createElement('div');
    actions.className = 'download-actions';
    const reportLink = document.createElement('a');
    reportLink.className = 'report-game-button';
    reportLink.href = `bug-reports.html?game=${encodeURIComponent(gameSlug)}`;
    reportLink.setAttribute('aria-label', 'Nahlásit chybu v překladu této hry');
    reportLink.title = 'Nahlásit chybu';
    reportLink.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4m0 1h10.5l-1.8 3 1.8 3H5"/></svg>';
    downloadButton.before(actions);
    actions.append(reportLink, downloadButton);
  }

  rating.querySelectorAll('[data-rating-star]').forEach(button => button.addEventListener('click', () => {
    saveGameRating({ stars: Number(button.dataset.ratingStar) });
  }));
  rating.querySelectorAll('[data-rating-reaction]').forEach(button => button.addEventListener('click', () => {
    const value = Number(button.dataset.ratingReaction);
    saveGameRating({ reaction: ownGameRating.reaction === value ? null : value });
  }));

  return { rating, statusControl, statusPanel, refreshButton, adminStatusEditor, adminStatusMenu, setAdminStatusMenuOpen };
};

const formatStatusDate = value => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const updateVersionStatusPanel = game => {
  if (!detailCommunityUi?.statusPanel) return;
  const panel = detailCommunityUi.statusPanel;
  const resolvedGame = game || fallbackGameStatuses[gameSlug];
  if (!resolvedGame) return;

  const status = resolveGameDisplayStatus(resolvedGame);
  const statusOverride = normalizeGameStatusOverride(resolvedGame.statusOverride);
  const verifiedBuildId = statusOverride?.verifiedBuildId || normalizeComparableValue(resolvedGame.verifiedBuildId);
  panel.dataset.statusState = status.key;
  detailCommunityUi.statusControl.dataset.statusState = status.key;
  panel.querySelector('[data-version-status-label]').textContent = status.label;
  detailCommunityUi.statusControl.querySelector('[data-version-trigger-label]').textContent = status.label;
  detailCommunityUi.statusControl.querySelector('[data-version-trigger-version]').textContent = resolvedGame.supportedVersion || 'Verze —';
  panel.querySelector('[data-current-version]').textContent = resolvedGame.supportedVersion || '—';
  panel.querySelector('[data-current-build]').textContent = verifiedBuildId || '—';
  panel.querySelector('[data-latest-build]').textContent = resolvedGame.currentBuildId ? String(resolvedGame.currentBuildId) : '—';
  panel.querySelector('[data-last-steam-update]').textContent = formatStatusDate(resolvedGame.lastSteamUpdate);
  detailCommunityUi.adminStatusMenu.querySelectorAll('[data-admin-game-status]').forEach(button => {
    const selected = button.dataset.adminGameStatus === status.key;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-checked', String(selected));
  });

  const summary = status.key === 'pending'
    ? 'Byl zjištěn nový build. Kompatibilita překladu čeká na ověření.'
    : status.key === 'broken'
      ? 'Překlad vyžaduje aktualizaci pro aktuální verzi hry.'
      : resolvedGame.currentBuildId
        ? 'Verze hry je aktuální.'
        : 'Funkční · build zatím není evidován.';
  const summaryNode = panel.querySelector('[data-version-status-summary]');
  summaryNode.textContent = summary;
  summaryNode.dataset.refreshError = 'false';
  panel.querySelector('[data-steamdb-link]').href = resolvedGame.appId
    ? `https://steamdb.info/app/${encodeURIComponent(resolvedGame.appId)}/`
    : 'https://steamdb.info/';
};

const detailCommunityUi = createDetailCommunityUi();

const setGameStatusRefreshBusy = busy => {
  gameStatusRefreshBusy = busy;
  const refreshButton = detailCommunityUi?.refreshButton;
  if (!refreshButton) return;
  refreshButton.disabled = busy;
  refreshButton.setAttribute('aria-busy', String(busy));
  refreshButton.title = busy ? 'Kontroluji aktuální Steam build…' : 'Zkontrolovat aktuální Steam build';
};

const setGameStatusRefreshMessage = (message, error = false) => {
  const node = detailCommunityUi?.statusPanel.querySelector('[data-version-status-summary]');
  if (!node) return;
  node.textContent = message;
  node.dataset.refreshError = String(error);
};

async function refreshCurrentGameStatus() {
  if (!detailCommunityUi || !gameSlug || gameStatusRefreshBusy) return;

  setGameStatusRefreshBusy(true);
  setGameStatusRefreshMessage('Kontroluji aktuální Steam build…');
  try {
    await window.NIO_GAME_STATUSES_READY.catch(() => null);
    const games = await loadGameStatuses({ forceSteamRefresh: true, gameSlug });
    activeGameStatuses = mergeGameStatusOverrides(games, activeGameStatusOverrides);
    applyGameStatuses(activeGameStatuses);
    updateVersionStatusPanel(activeGameStatuses[gameSlug]);
  } catch (error) {
    console.error('Unable to refresh the Steam build manually', error);
    setGameStatusRefreshMessage(error?.message || 'Ruční kontrolu se nepodařilo dokončit.', true);
  } finally {
    setGameStatusRefreshBusy(false);
  }
}

const setGameStatusAdminMessage = (message, error = false) => {
  const node = detailCommunityUi?.adminStatusMenu.querySelector('[data-admin-game-status-message]');
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('error', error);
};

const setGameStatusAdminBusy = busy => {
  gameStatusSaveBusy = busy;
  detailCommunityUi?.adminStatusEditor.querySelectorAll('button').forEach(button => {
    button.disabled = busy;
  });
};

async function refreshGameStatusAdminPermission() {
  canManageGameStatuses = false;
  if (!detailCommunityUi?.adminStatusEditor) return;
  detailCommunityUi.adminStatusEditor.hidden = true;
  detailCommunityUi.setAdminStatusMenuOpen(false);
  setGameStatusAdminMessage('');
  if (!db || !currentUser || !gameSlug) return;

  const checkedUserId = currentUser.id;
  const { data, error } = await db.rpc('is_game_status_admin');
  if (currentUser?.id !== checkedUserId) return;
  if (error) {
    console.warn('Unable to verify game status administrator', error);
    return;
  }

  canManageGameStatuses = data === true;
  detailCommunityUi.adminStatusEditor.hidden = !canManageGameStatuses;
}

async function saveGameStatusOverride(statusKey) {
  if (!detailCommunityUi || gameStatusSaveBusy || !gameStatusDefinitions[statusKey]) return;
  if (!db || !currentUser || !canManageGameStatuses) {
    setGameStatusAdminMessage('Pro změnu stavu je nutné přihlášení správce.', true);
    return;
  }

  const game = activeGameStatuses[gameSlug] || fallbackGameStatuses[gameSlug];
  if (!game) return setGameStatusAdminMessage('Hru se nepodařilo najít.', true);

  setGameStatusAdminBusy(true);
  setGameStatusAdminMessage('Ukládám…');
  const { data, error } = await db.rpc('set_game_status_override', {
    requested_game_slug: gameSlug,
    requested_status: statusKey,
    requested_current_build: normalizeComparableValue(game.currentBuildId),
    requested_current_version: normalizeComparableValue(game.currentVersion ?? game.latestVersion ?? game.supportedVersion)
  });
  setGameStatusAdminBusy(false);

  if (error) {
    console.error('Unable to save game status override', error);
    setGameStatusAdminMessage('Stav se nepodařilo uložit. Zkontrolujte Supabase nastavení.', true);
    return;
  }

  const savedRow = Array.isArray(data) ? data[0] : data;
  const savedOverride = normalizeGameStatusOverride(savedRow || {
    status: statusKey,
    verified_build: statusKey === 'functional' ? game.currentBuildId : game.statusOverride?.verifiedBuildId,
    verified_version: statusKey === 'functional' ? (game.currentVersion ?? game.latestVersion ?? game.supportedVersion) : game.statusOverride?.verifiedVersion,
    updated_at: new Date().toISOString()
  });
  activeGameStatusOverrides = { ...activeGameStatusOverrides, [gameSlug]: savedOverride };
  activeGameStatuses = {
    ...activeGameStatuses,
    [gameSlug]: { ...game, statusOverride: savedOverride }
  };
  applyGameStatuses(activeGameStatuses);
  updateVersionStatusPanel(activeGameStatuses[gameSlug]);
  setGameStatusAdminMessage('Stav byl uložen.');
}

if (detailCommunityUi) {
  window.NIO_GAME_STATUSES_READY
    .then(games => updateVersionStatusPanel(games?.[gameSlug]))
    .catch(() => updateVersionStatusPanel(null));
}
supportUi?.openButton.addEventListener('click', openSupport);
supportModal?.querySelectorAll('[data-support-close]').forEach(button => button.addEventListener('click', closeSupport));
supportModal?.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [...supportModal.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === supportDialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
document.querySelectorAll('[data-auth-open]').forEach(button => button.addEventListener('click', async () => {
  if (currentUser && db) { await db.auth.signOut(); return; }
  openAuth();
}));
document.querySelectorAll('[data-auth-close]').forEach(button => button.addEventListener('click', closeAuth));
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  closeAuth();
  closeSupport();
});
document.querySelectorAll('[data-auth-tab]').forEach(tab => tab.addEventListener('click', () => {
  authMode = tab.dataset.authTab;
  document.querySelectorAll('[data-auth-tab]').forEach(item => item.classList.toggle('active', item === tab));
  const registering = authMode === 'register';
  document.querySelector('[data-auth-name]').hidden = !registering;
  document.querySelector('[data-name-label]').hidden = !registering;
  document.querySelector('[data-auth-name]').required = registering;
  document.querySelector('[data-auth-submit]').textContent = registering ? 'Vytvořit účet' : 'Přihlásit se';
  document.querySelector('#auth-title').textContent = registering ? 'Registrace' : 'Přihlášení';
  setMessage(document.querySelector('[data-auth-message]'), '');
}));
authForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('[data-auth-message]');
  if (!db) return setMessage(message, 'Nejprve je potřeba doplnit připojení k Supabase v souboru config.js.', true);
  const email = document.querySelector('[data-auth-email]').value.trim();
  const password = document.querySelector('[data-auth-password]').value;
  const name = document.querySelector('[data-auth-name]').value.trim();
  const result = authMode === 'register'
    ? await db.auth.signUp({ email, password, options: { data: { display_name: name } } })
    : await db.auth.signInWithPassword({ email, password });
  if (result.error) return setMessage(message, result.error.message, true);
  setMessage(message, authMode === 'register' && !result.data.session ? 'Účet je vytvořený. Potvrďte e-mail a potom se přihlaste.' : 'Hotovo, jste přihlášeni.');
  if (result.data.session) setTimeout(closeAuth, 500);
});

const contactToggle = document.querySelector('[data-contact-toggle]');
const contactForm = document.querySelector('[data-contact-form]');
const contactSubmit = document.querySelector('[data-contact-submit]');
const contactMessage = document.querySelector('[data-contact-message]');

contactToggle?.addEventListener('click', () => {
  if (!contactForm) return;
  const shouldOpen = contactForm.hidden;
  contactForm.hidden = !shouldOpen;
  contactToggle.setAttribute('aria-expanded', String(shouldOpen));
  if (shouldOpen) requestAnimationFrame(() => document.querySelector('#contact-subject')?.focus());
});

contactForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!contactForm.checkValidity()) {
    contactForm.reportValidity();
    return setMessage(contactMessage, 'Vyplňte prosím předmět i zprávu.', true);
  }

  const formData = new FormData(contactForm);
  const payload = {
    subject: String(formData.get('subject') || '').trim(),
    message: String(formData.get('message') || '').trim(),
    website: String(formData.get('website') || ''),
    page: window.location.href
  };
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };

  if (db && currentUser) {
    const { data } = await db.auth.getSession();
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  contactSubmit.disabled = true;
  contactSubmit.setAttribute('aria-busy', 'true');
  contactSubmit.textContent = 'Odesílám…';
  setMessage(contactMessage, '');

  try {
    const response = await fetch('/api/contact-message', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Zprávu se nepodařilo odeslat. Zkuste to prosím později.');

    contactForm.reset();
    setMessage(contactMessage, 'Děkujeme. Zpráva byla úspěšně odeslána.');
  } catch (error) {
    setMessage(contactMessage, error.message || 'Zprávu se nepodařilo odeslat. Zkuste to prosím později.', true);
  } finally {
    contactSubmit.disabled = false;
    contactSubmit.removeAttribute('aria-busy');
    contactSubmit.textContent = 'Odeslat';
  }
});

function updateAuthUi(user) {
  currentUser = user;
  document.querySelectorAll('[data-auth-open]').forEach(button => button.textContent = user ? 'Odhlásit se' : 'Přihlásit se');
  const form = document.querySelector('[data-comment-form]');
  const note = document.querySelector('[data-comment-login]');
  if (form) form.hidden = !user;
  if (note) note.hidden = Boolean(user);
  const voteNote = document.querySelector('[data-vote-user-note]');
  if (voteNote) {
    voteNote.textContent = user ? 'Jste přihlášeni – můžete hlasovat.' : 'Přihlaste se, abyste mohli hlasovat.';
    voteNote.classList.toggle('logged-in', Boolean(user));
  }
  refreshGameStatusAdminPermission();
  loadVoting();
  loadGameRating();
}

const setGameRatingMessage = (message, error = false) => {
  const node = detailCommunityUi?.rating.querySelector('[data-rating-message]');
  if (!node) return;
  node.textContent = message;
  node.classList.toggle('error', error);
};

const setGameRatingControlsDisabled = disabled => {
  detailCommunityUi?.rating.querySelectorAll('[data-rating-control]').forEach(button => {
    button.disabled = disabled;
  });
};

const renderGameRating = summary => {
  const rating = detailCommunityUi?.rating;
  if (!rating) return;
  const average = summary?.rating_average;
  rating.querySelector('[data-rating-average]').textContent = average === null || average === undefined
    ? '—'
    : new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 2 }).format(Number(average));
  rating.querySelector('[data-rating-count]').textContent = new Intl.NumberFormat('cs-CZ').format(Number(summary?.rating_count || 0));
  rating.querySelector('[data-like-count]').textContent = new Intl.NumberFormat('cs-CZ').format(Number(summary?.like_count || 0));
  rating.querySelector('[data-dislike-count]').textContent = new Intl.NumberFormat('cs-CZ').format(Number(summary?.dislike_count || 0));

  const displayedStars = ownGameRating.stars || (average === null || average === undefined ? 0 : Math.round(Number(average)));
  rating.querySelectorAll('[data-rating-star]').forEach(button => {
    const value = Number(button.dataset.ratingStar);
    button.classList.toggle('selected', value <= displayedStars);
    button.setAttribute('aria-pressed', String(value === ownGameRating.stars));
  });
  rating.querySelectorAll('[data-rating-reaction]').forEach(button => {
    const selected = Number(button.dataset.ratingReaction) === ownGameRating.reaction;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
};

async function loadGameRating(successMessage = '') {
  if (!detailCommunityUi?.rating) return;
  ownGameRating = { stars: null, reaction: null };
  if (!db) {
    setGameRatingControlsDisabled(true);
    setGameRatingMessage('Hodnocení se zobrazí po připojení Supabase.', true);
    return;
  }

  const { data: summaryRows, error: summaryError } = await db.rpc('get_game_rating_summary', {
    requested_game_slug: gameSlug
  });
  if (summaryError) {
    console.error('Unable to load game rating summary', summaryError);
    setGameRatingControlsDisabled(true);
    setGameRatingMessage('Hodnocení zatím není aktivní.', true);
    return;
  }

  if (currentUser) {
    const { data: ownVote, error: ownVoteError } = await db
      .from('game_ratings')
      .select('stars,reaction')
      .eq('game_slug', gameSlug)
      .eq('user_id', currentUser.id)
      .maybeSingle();
    if (ownVoteError) {
      console.error('Unable to load own game rating', ownVoteError);
      setGameRatingControlsDisabled(true);
      setGameRatingMessage('Vaše hodnocení se nepodařilo načíst.', true);
      return;
    }
    ownGameRating = {
      stars: ownVote?.stars ? Number(ownVote.stars) : null,
      reaction: ownVote?.reaction ? Number(ownVote.reaction) : null
    };
  }

  const summary = Array.isArray(summaryRows) ? summaryRows[0] : summaryRows;
  renderGameRating(summary || {});
  setGameRatingControlsDisabled(false);
  setGameRatingMessage(successMessage || (currentUser
    ? 'Vaše hodnocení můžete kdykoli změnit.'
    : 'Pro hodnocení se přihlaste.'));
}

async function saveGameRating(changes) {
  if (!detailCommunityUi?.rating || gameRatingBusy) return;
  if (!db) return setGameRatingMessage('Hodnocení není připojené k Supabase.', true);
  if (!currentUser) {
    setGameRatingMessage('Pro hodnocení se nejprve přihlaste.', true);
    openAuth();
    return;
  }

  const nextRating = { ...ownGameRating, ...changes };
  gameRatingBusy = true;
  setGameRatingControlsDisabled(true);
  setGameRatingMessage('Ukládám hodnocení…');

  const query = nextRating.stars === null && nextRating.reaction === null
    ? db.from('game_ratings').delete().eq('game_slug', gameSlug).eq('user_id', currentUser.id)
    : db.from('game_ratings').upsert({
        game_slug: gameSlug,
        user_id: currentUser.id,
        stars: nextRating.stars,
        reaction: nextRating.reaction
      }, { onConflict: 'game_slug,user_id' });
  const { error } = await query;
  gameRatingBusy = false;

  if (error) {
    console.error('Unable to save game rating', error);
    setGameRatingControlsDisabled(false);
    setGameRatingMessage('Hodnocení se nepodařilo uložit.', true);
    return;
  }

  ownGameRating = nextRating;
  await loadGameRating('Hodnocení bylo uloženo.');
}
async function loadComments() {
  const list = document.querySelector('[data-comments-list]');
  if (!list) return;
  if (!gameSlug) {
    list.innerHTML = '<p class="empty-state">Komentáře pro tuto stránku nejsou správně nastavené.</p>';
    return;
  }
  if (!db) {
    list.innerHTML = '<p class="empty-state">Komentáře se zobrazí po připojení Supabase.</p>';
    return;
  }
  const { data, error } = await db.from('comments').select('id,body,created_at,user_id,profiles(display_name,is_author)').eq('game_slug', gameSlug).order('created_at', { ascending: false });
  if (error) return list.innerHTML = '<p class="empty-state">Komentáře se nepodařilo načíst.</p>';
  if (!data.length) return list.innerHTML = '<p class="empty-state">Zatím tu není žádný komentář. Buďte první.</p>';
  list.replaceChildren(...data.map(comment => {
    const article = document.createElement('article');
    article.className = 'comment';
    const header = document.createElement('div');
    const author = document.createElement('strong');
    author.textContent = comment.profiles?.display_name || 'Hráč';
    header.append(author);
    if (comment.profiles?.is_author) { const badge = document.createElement('span'); badge.className = 'author-badge'; badge.textContent = 'AUTOR'; header.append(badge); }
    const date = document.createElement('time');
    date.dateTime = comment.created_at;
    date.textContent = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.created_at));
    header.append(date);
    const body = document.createElement('p');
    body.textContent = comment.body;
    article.append(header, body);
    return article;
  }));
}
document.querySelector('[data-comment-form]')?.addEventListener('submit', async event => {
  event.preventDefault();
  const textarea = document.querySelector('#comment-body');
  const message = document.querySelector('[data-comment-message]');
  const body = textarea.value.trim();
  if (!db || !currentUser || !gameSlug || !body) return;
  const { error } = await db.from('comments').insert({ game_slug: gameSlug, user_id: currentUser.id, body });
  if (error) return setMessage(message, 'Komentář se nepodařilo odeslat: ' + error.message, true);
  textarea.value = '';
  setMessage(message, 'Komentář byl přidán.');
  await loadComments();
});
async function loadDownloadCount() {
  const output = document.querySelector('[data-download-count]');
  if (!output || !db) return;
  const { data } = await db.from('download_totals').select('download_count').eq('game_slug', gameSlug).maybeSingle();
  output.textContent = new Intl.NumberFormat('cs-CZ').format(data?.download_count || 0);
}
document.querySelector('[data-download]')?.addEventListener('click', async event => {
  if (!db) return;
  event.preventDefault();
  const target = event.currentTarget.href;
  await db.rpc('register_download', { requested_game_slug: gameSlug });
  window.location.href = target;
});
if (db) {
  db.auth.getSession().then(({ data }) => updateAuthUi(data.session?.user || null));
  db.auth.onAuthStateChange((_event, session) => updateAuthUi(session?.user || null));
} else updateAuthUi(null);
loadComments();
loadDownloadCount();

const voteStatuses = ['Navrženo', 'Zvažujeme', 'Překládá se', 'Hotovo'];
let isAuthor = false;

const formatVotes = count => new Intl.NumberFormat('cs-CZ').format(count || 0);
const createStatus = status => {
  const badge = document.createElement('span');
  badge.className = 'vote-status';
  badge.dataset.status = status;
  badge.textContent = status;
  return badge;
};

async function getAuthorPermission() {
  if (!db || !currentUser) return false;
  const { data } = await db.from('profiles').select('is_author').eq('id', currentUser.id).maybeSingle();
  return Boolean(data?.is_author);
}

async function loadVoting() {
  const list = document.querySelector('[data-vote-list]');
  const preview = document.querySelector('[data-vote-preview]');
  if (!list && !preview) return;
  if (!db) {
    const message = '<p class="empty-state">Hlasování se zobrazí po připojení Supabase.</p>';
    if (list) list.innerHTML = message;
    if (preview) preview.innerHTML = message;
    return;
  }
  const { data: requests, error } = await db.from('translation_requests').select('id,slug,title,cover_url,description,status,vote_count').order('vote_count', { ascending: false }).order('created_at');
  if (error) {
    const message = '<p class="empty-state">Hlasování zatím není aktivní. Spusťte nový SQL migrační skript v Supabase.</p>';
    if (list) list.innerHTML = message;
    if (preview) preview.innerHTML = message;
    return;
  }
  let ownVotes = new Set();
  if (currentUser) {
    const { data: votes } = await db.from('translation_votes').select('request_id').eq('user_id', currentUser.id);
    ownVotes = new Set((votes || []).map(vote => vote.request_id));
    isAuthor = await getAuthorPermission();
  } else isAuthor = false;
  if (list) {
    if (!requests.length) list.innerHTML = '<p class="empty-state">Zatím nebyla navržena žádná hra.</p>';
    else list.replaceChildren(...requests.map(request => createVoteCard(request, ownVotes.has(request.id))));
  }
  if (preview) {
    const top = requests.filter(request => request.status !== 'Hotovo').slice(0, 3);
    if (!top.length) preview.innerHTML = '<p class="empty-state">Zatím nebyla navržena žádná hra.</p>';
    else preview.replaceChildren(...top.map(createPreviewCard));
  }
}

function createPreviewCard(request) {
  const card = document.createElement('a');
  card.className = 'preview-card';
  card.href = 'hlasovani.html';
  const image = document.createElement('img');
  image.src = request.cover_url;
  image.alt = '';
  image.loading = 'lazy';
  const info = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = request.title;
  info.append(title, createStatus(request.status));
  const count = document.createElement('div');
  count.className = 'preview-count';
  const strong = document.createElement('strong');
  strong.textContent = formatVotes(request.vote_count);
  const label = document.createElement('span');
  label.textContent = 'hlasů';
  count.append(strong, label);
  card.append(image, info, count);
  return card;
}

function createVoteCard(request, voted) {
  const card = document.createElement('article');
  card.className = 'vote-card';
  const cover = document.createElement('div');
  cover.className = 'vote-cover';
  const image = document.createElement('img');
  image.src = request.cover_url;
  image.alt = `Obal hry ${request.title}`;
  image.loading = 'lazy';
  cover.append(image);
  const body = document.createElement('div');
  body.className = 'vote-card-body';
  const top = document.createElement('div');
  top.className = 'vote-card-top';
  const copy = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = request.title;
  const description = document.createElement('p');
  description.className = 'vote-description';
  description.textContent = request.description;
  copy.append(title, description);
  top.append(copy, createStatus(request.status));
  const actions = document.createElement('div');
  actions.className = 'vote-card-actions';
  const total = document.createElement('div');
  total.className = 'vote-total';
  const number = document.createElement('strong');
  number.textContent = formatVotes(request.vote_count);
  const label = document.createElement('span');
  label.textContent = 'hlasů komunity';
  total.append(number, label);
  const controls = document.createElement('div');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button vote-button ${voted ? 'voted' : 'button-primary'}`;
  button.textContent = voted ? 'ZRUŠIT HLAS' : 'CHCI ČEŠTINU';
  button.disabled = request.status === 'Hotovo';
  if (request.status === 'Hotovo') button.textContent = 'PŘEKLAD HOTOV';
  const feedback = document.createElement('p');
  feedback.className = 'vote-feedback';
  button.addEventListener('click', () => toggleVote(request.id, voted, button, feedback));
  controls.append(button, feedback);
  actions.append(total, controls);
  body.append(top);
  if (isAuthor) body.append(createAdminStatus(request));
  body.append(actions);
  card.append(cover, body);
  return card;
}

function createAdminStatus(request) {
  const wrap = document.createElement('div');
  wrap.className = 'admin-status';
  const label = document.createElement('label');
  label.textContent = 'Správa Nio:';
  const select = document.createElement('select');
  voteStatuses.forEach(status => {
    const option = document.createElement('option');
    option.value = option.textContent = status;
    option.selected = status === request.status;
    select.append(option);
  });
  select.addEventListener('change', async () => {
    select.disabled = true;
    const { error } = await db.from('translation_requests').update({ status: select.value }).eq('id', request.id);
    select.disabled = false;
    if (error) alert('Stav se nepodařilo změnit: ' + error.message);
    else loadVoting();
  });
  wrap.append(label, select);
  return wrap;
}

async function toggleVote(requestId, voted, button, feedback) {
  if (!currentUser) {
    setMessage(feedback, 'Pro hlasování se nejprve přihlaste.', true);
    openAuth();
    return;
  }
  button.disabled = true;
  const query = voted
    ? db.from('translation_votes').delete().eq('request_id', requestId).eq('user_id', currentUser.id)
    : db.from('translation_votes').insert({ request_id: requestId, user_id: currentUser.id });
  const { error } = await query;
  if (error) {
    button.disabled = false;
    setMessage(feedback, 'Hlas se nepodařilo uložit: ' + error.message, true);
    return;
  }
  await loadVoting();
}

loadVoting();

