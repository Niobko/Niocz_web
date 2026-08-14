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

const resolveGameDisplayStatus = game => {
  if (game?.override && gameStatusDefinitions[game.override]) return gameStatusDefinitions[game.override];
  if (game?.manualStatus === 'broken') return gameStatusDefinitions.broken;

  const verifiedBuildId = game?.verifiedBuildId ? String(game.verifiedBuildId) : null;
  const currentBuildId = game?.currentBuildId ? String(game.currentBuildId) : null;
  if (verifiedBuildId && currentBuildId && verifiedBuildId !== currentBuildId) {
    return gameStatusDefinitions.pending;
  }

  return gameStatusDefinitions[game?.manualStatus] || game?.displayStatus || gameStatusDefinitions.functional;
};

const applyGameStatuses = games => {
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

const loadGameStatuses = async () => {
  const endpoints = [
    settings.gameStatusEndpoint || '/api/game-status',
    new URL('data/game-status.json', document.baseURI).href
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) continue;
      const payload = await response.json();
      if (payload?.games) {
        applyGameStatuses(payload.games);
        return;
      }
    } catch {
      // Keep the server-rendered safe status and try the static JSON fallback.
    }
  }
};

loadGameStatuses();
const configured = settings.supabaseUrl?.startsWith('https://') && !settings.supabaseAnonKey?.startsWith('DOPLNTE_');
const db = configured && window.supabase ? window.supabase.createClient(settings.supabaseUrl, settings.supabaseAnonKey) : null;
const gameSlug = document.body.dataset.game || 'leafy-corner';
const authModal = document.querySelector('[data-auth-modal]');
const authForm = document.querySelector('[data-auth-form]');
let authMode = 'login';
let currentUser = null;

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
document.querySelectorAll('[data-auth-open]').forEach(button => button.addEventListener('click', async () => {
  if (currentUser && db) { await db.auth.signOut(); return; }
  openAuth();
}));
document.querySelectorAll('[data-auth-close]').forEach(button => button.addEventListener('click', closeAuth));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeAuth(); });
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
  loadVoting();
}
async function loadComments() {
  const list = document.querySelector('[data-comments-list]');
  if (!list || !db) {
    if (list) list.innerHTML = '<p class="empty-state">Komentáře se zobrazí po připojení Supabase.</p>';
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
  if (!db || !currentUser || !body) return;
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

