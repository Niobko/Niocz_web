(() => {
  'use strict';

  const db = window.NIO_SUPABASE_CLIENT;
  const currentGameSlug = document.body.dataset.game?.trim() || '';
  const dateFormatter = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium' });
  const dateTimeFormatter = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'medium', timeStyle: 'short' });
  const numberFormatter = new Intl.NumberFormat('cs-CZ');
  const seenPopupBadges = new Set();
  let currentUser = null;
  let currentProfile = null;
  let currentFollow = null;
  let currentFavorite = null;
  let favoriteSlugs = new Set();
  let notifications = [];
  let notificationChannel = null;
  let isAdmin = false;

  const catalog = Object.freeze({
    'scrap-mechanic': { name: 'Scrap Mechanic', page: 'scrap-mechanic.html', image: 'assets/Scrap%20Mechanic/Scrap_hl.jpg' },
    'no-mans-sky': { name: "No Man's Sky", page: 'no-mans-sky.html', image: 'assets/No%20Man%20Sky/Sky_hl.jpg' },
    'ready-or-not': { name: 'Ready or Not', page: 'ready-or-not.html', image: 'assets/Ready%20or%20Not/Ready_hl.jpg' },
    astroneer: { name: 'Astroneer', page: 'astroneer.html', image: 'assets/Astronner/Astro_hl.jpg' },
    'shapez-2': { name: 'Shapez-2', page: 'shapez-2.html', image: 'assets/Shapez-2/Shapez_hl.jpg' },
    'prince-of-persia-the-lost-crown': { name: 'Prince of Persia The Lost Crown', page: 'prince-of-persia-the-lost-crown.html', image: 'assets/Prince of Persia The Lost Crown/Prince_hl.jpg' },
    'arms-of-god': { name: 'Arms of God', page: 'arms-of-god.html', image: 'assets/Arms of God/ARM_hl.jpg' },
    'kingdom-rush-vengeance': { name: 'Kingdom Rush Vengeance', page: 'kingdom-rush-vengeance.html', image: 'assets/Kingdom Rush Vengeance/Kings_hl.jpg' },
    'sleeping-dogs': { name: 'Sleeping Dogs', page: 'sleeping-dogs.html', image: 'assets/Sleeping-Dogs/Dogs_hl.jpg' },
    'vacation-cafe-simulator': { name: 'Vacation Cafe Simulator', page: 'vacation-cafe-simulator.html', image: 'assets/Vacation_Cafe_Simulator/Vaca_hl.jpg' },
    bombanana: { name: 'BOMBANANA', page: 'bombanana.html', image: 'assets/BOMBANANA/Banan_hl.jpg' },
    'breathedge-2': { name: 'Breathedge 2', page: 'breathedge-2.html', image: 'assets/Breathedge_2/Breathedge_hl.png' },
    'parcel-simulator': { name: 'Parcel Simulator', page: 'parcel-simulator.html', image: 'assets/Parcel Simulator/Parcel_hl.avif' },
    'the-spell-brigade': { name: 'The Spell Brigade', page: 'the-spell-brigade.html', image: 'assets/The Spell Brigade/TheSpell_hl.png' },
    warhounds: { name: 'Warhounds', page: 'warhounds.html', image: 'assets/Warhounds/warhounds_hl.png' },
    'powerwash-simulator-2': { name: 'PowerWash Simulator 2', page: 'powerwash-simulator-2.html', image: 'assets/Wash/Wash_hl.jpg' },
    'hearth-and-hamlet': { name: 'Hearth and Hamlet', page: 'hearth-and-hamlet.html', image: 'assets/Hearth_and_Hamlet/Hearth_hl.png' },
    kynseed: { name: 'Kynseed', page: 'kynseed.html', image: 'assets/Kynseed/Kynseed_hl.avif' },
    'alchemy-factory': { name: 'Alchemy Factory', page: 'alchemy-factory.html', image: 'assets/AlchemyFactory/Alchemy_hl.jpg' },
    'e-shop-tycoon': { name: 'E-Shop Tycoon', page: 'e-shop-tycoon.html', image: 'assets/eShop/eShop_hl.png' },
    'yet-another-zombie-survivors': { name: 'Yet Another Zombie Survivors', page: 'yet-another-zombie-survivors.html', image: 'assets/Zombie/Zombie_hl.jpg' },
    cloverpit: { name: 'CloverPit', page: 'cloverpit.html', image: 'assets/CloverPit/pit_hl.jpg' },
    timberborn: { name: 'Timberborn', page: 'timberborn.html', image: 'assets/Timberborn/bobr_hl.png' },
    catmailco: { name: 'CatMailCo', page: 'catmailco.html', image: 'assets/cat_mail/cat_hl.jpg' },
    'youtubers-life-2': { name: 'Youtubers Life 2', page: 'youtubers-life-2.html', image: 'assets/Youtubers_Life_2_png/Youtubers Life 2_hl.avif' },
    'the-universim': { name: 'The Universim', page: 'the-universim.html', image: 'assets/uni/uni_hl.jpg' },
    'streamer-life-simulator-2': { name: 'Streamer Life Simulator 2', page: 'streamer-life-simulator-2.html', image: 'assets/SLS2/SLS2_hl.jpg' },
    'factory-planner': { name: 'Factory Planner', page: 'factory-planner.html', image: 'assets/Factory_Planner/factoryhl.jpg' },
    'leafy-corner': { name: 'Leafy Corner', page: 'leafycorner.html', image: 'assets/leafy-corner.png' },
    'bookshop-simulator': { name: 'Bookshop Simulator', page: 'bookshop-simulator.html', image: 'assets/bookshop-simulator/bookshop_hl_obrazok.png' },
    restory: { name: 'ReStory: Chill Electronics Repairs', page: 'restory.html', image: 'assets/restory/restory_hl.png' }
  });

  const safeDate = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.valueOf()) ? date : null;
  };
  const formatDate = value => safeDate(value) ? dateFormatter.format(safeDate(value)) : '—';
  const formatDateTime = value => safeDate(value) ? dateTimeFormatter.format(safeDate(value)) : '—';
  const showAuth = (mode = 'login') => {
    document.querySelector('[data-auth-open]')?.click();
    document.querySelector(`[data-auth-tab="${mode === 'register' ? 'register' : 'login'}"]`)?.click();
  };
  const setText = (selector, value) => {
    document.querySelectorAll(selector).forEach(node => { node.textContent = value; });
  };
  const setPanelMessage = (node, text, error = false) => {
    if (!node) return;
    node.textContent = text;
    node.classList.toggle('error', error);
  };
  const statusLabel = game => game?.displayStatus?.label || ({ functional: 'Funkční', pending: 'Čeká na ověření', broken: 'Nefunkční / vyžaduje update' }[game?.manualStatus] || 'Neověřeno');
  const unwrapRelation = value => Array.isArray(value) ? value[0] : value;
  const badgeImageSource = value => {
    const source = String(value || '').trim();
    if (!source) return '';
    return /^(?:https?:|blob:|data:)/i.test(source) ? source : source.replace(/^\/+/, '');
  };

  const createBadgeIcon = (badge, size = 'small') => {
    if (!badge?.image_url) return null;
    const wrapper = document.createElement('span');
    wrapper.className = `user-badge-icon user-badge-icon-${size}`;
    wrapper.tabIndex = 0;
    wrapper.setAttribute('aria-label', `${badge.name}. ${badge.description}`);
    const image = document.createElement('img');
    image.src = badgeImageSource(badge.image_url);
    image.alt = badge.name;
    const tooltip = document.createElement('span');
    tooltip.className = 'user-badge-tooltip';
    const strong = document.createElement('strong');
    strong.textContent = badge.name;
    const description = document.createElement('span');
    description.textContent = badge.description;
    tooltip.append(strong, description);
    wrapper.append(image, tooltip);
    return wrapper;
  };

  const notificationUi = (() => {
    const account = document.querySelector('.nav-account');
    const host = account?.parentElement;
    if (!account || !host) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'notification-center';
    wrapper.hidden = true;
    wrapper.innerHTML = `
      <button class="notification-trigger" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="notification-panel" aria-label="Otevřít upozornění">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>
        <span class="notification-count" data-notification-count hidden>0</span>
      </button>
      <section class="notification-panel" id="notification-panel" role="dialog" aria-label="Upozornění" hidden>
        <header><strong>Upozornění</strong><button type="button" data-notifications-read-all>Označit vše jako přečtené</button></header>
        <div class="notification-list" data-notification-list><p class="empty-state">Načítám upozornění…</p></div>
        <a class="notification-all-link" href="profil.html#upozorneni">Zobrazit všechna upozornění</a>
      </section>`;
    account.before(wrapper);
    const trigger = wrapper.querySelector('.notification-trigger');
    const panel = wrapper.querySelector('.notification-panel');
    const setOpen = open => {
      panel.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) loadNotifications();
    };
    trigger.addEventListener('click', event => {
      event.stopPropagation();
      setOpen(panel.hidden);
    });
    panel.addEventListener('click', event => event.stopPropagation());
    wrapper.querySelector('[data-notifications-read-all]').addEventListener('click', markAllNotificationsRead);
    document.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
    return { wrapper, trigger, panel, list: wrapper.querySelector('[data-notification-list]'), count: wrapper.querySelector('[data-notification-count]'), setOpen };
  })();

  const followUi = (() => {
    if (!currentGameSlug) return null;
    const host = document.querySelector('.detail-grid > .download-card');
    if (!host) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'follow-game-control';
    wrapper.innerHTML = `
      <button class="button follow-game-button" type="button" data-follow-game aria-pressed="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"></path></svg>
        <span data-follow-label>Sledovat hru</span>
      </button>
      <label class="follow-notify" hidden><input type="checkbox" data-follow-notify> Upozornit mě na novou verzi</label>
      <p class="follow-message" data-follow-message role="status" aria-live="polite"></p>`;
    const details = host.querySelector('dl');
    if (details) details.before(wrapper);
    else host.append(wrapper);
    const button = wrapper.querySelector('[data-follow-game]');
    const notify = wrapper.querySelector('[data-follow-notify]');
    button.addEventListener('click', toggleCurrentGameFollow);
    notify.addEventListener('change', updateCurrentGameNotify);
    return { wrapper, button, label: wrapper.querySelector('[data-follow-label]'), notify, notifyLabel: wrapper.querySelector('.follow-notify'), message: wrapper.querySelector('[data-follow-message]') };
  })();

  const favoriteUi = (() => {
    if (!currentGameSlug) return null;
    const host = document.querySelector('.detail-grid > .download-card');
    if (!host) return null;
    const wrapper = document.createElement('div');
    wrapper.className = 'favorite-game-control';
    wrapper.innerHTML = `
      <button class="button favorite-game-button" type="button" data-favorite-game aria-pressed="false">
        <span class="favorite-heart" aria-hidden="true">♡</span>
        <span data-favorite-label>Přidat do oblíbených</span>
      </button>
      <p class="favorite-message" data-favorite-message role="status" aria-live="polite"></p>
      <div class="favorite-auth-actions" data-favorite-auth-actions hidden>
        <button class="button button-primary" type="button" data-favorite-auth="login">Přihlásit se</button>
        <button class="button button-secondary" type="button" data-favorite-auth="register">Vytvořit účet</button>
      </div>`;
    if (followUi?.wrapper) followUi.wrapper.after(wrapper);
    else {
      const details = host.querySelector('dl');
      if (details) details.before(wrapper);
      else host.append(wrapper);
    }
    const button = wrapper.querySelector('[data-favorite-game]');
    button.addEventListener('click', toggleCurrentGameFavorite);
    wrapper.querySelectorAll('[data-favorite-auth]').forEach(action => action.addEventListener('click', () => showAuth(action.dataset.favoriteAuth)));
    return {
      wrapper,
      button,
      heart: wrapper.querySelector('.favorite-heart'),
      label: wrapper.querySelector('[data-favorite-label]'),
      message: wrapper.querySelector('[data-favorite-message]'),
      authActions: wrapper.querySelector('[data-favorite-auth-actions]')
    };
  })();

  function renderCurrentFavorite() {
    if (!favoriteUi) return;
    const favorite = Boolean(currentFavorite);
    favoriteUi.button.classList.toggle('is-favorite', favorite);
    favoriteUi.button.setAttribute('aria-pressed', String(favorite));
    favoriteUi.heart.textContent = favorite ? '♥' : '♡';
    favoriteUi.label.textContent = favorite ? 'V oblíbených' : 'Přidat do oblíbených';
    favoriteUi.button.disabled = false;
    if (currentUser) favoriteUi.authActions.hidden = true;
  }

  async function loadCurrentFavorite() {
    if (!favoriteUi) return;
    currentFavorite = null;
    if (!currentUser || !db) return renderCurrentFavorite();
    const { data, error } = await db.from('user_favorite_games')
      .select('id,game_slug,created_at')
      .eq('user_id', currentUser.id).eq('game_slug', currentGameSlug).maybeSingle();
    if (error) {
      setPanelMessage(favoriteUi.message, 'Oblíbené hry budou dostupné po spuštění SQL migrace.', true);
      return renderCurrentFavorite();
    }
    currentFavorite = data;
    renderCurrentFavorite();
  }

  async function toggleCurrentGameFavorite() {
    if (!currentUser) {
      setPanelMessage(favoriteUi.message, 'Pro přidání hry do oblíbených se musíte přihlásit.');
      favoriteUi.authActions.hidden = false;
      return;
    }
    favoriteUi.button.disabled = true;
    favoriteUi.authActions.hidden = true;
    setPanelMessage(favoriteUi.message, currentFavorite ? 'Odebírám z oblíbených…' : 'Přidávám do oblíbených…');
    const result = currentFavorite
      ? await db.from('user_favorite_games').delete().eq('user_id', currentUser.id).eq('game_slug', currentGameSlug)
      : await db.from('user_favorite_games').insert({ user_id: currentUser.id, game_slug: currentGameSlug });
    if (result.error) {
      setPanelMessage(favoriteUi.message, 'Oblíbené se nepodařilo změnit: ' + result.error.message, true);
      favoriteUi.button.disabled = false;
      return;
    }
    await loadCurrentFavorite();
    setPanelMessage(favoriteUi.message, currentFavorite ? 'Hra je v oblíbených.' : 'Hra byla odebrána z oblíbených.');
    await refreshFavoriteViews();
  }

  function initTranslationFavoriteButtons() {
    document.querySelectorAll('.translations-page .translation-card').forEach(card => {
      if (card.querySelector('[data-card-favorite]')) return;
      const slug = card.querySelector('[data-game-status]')?.dataset.gameStatus;
      if (!slug || !catalog[slug]) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'translation-favorite-button';
      button.dataset.cardFavorite = slug;
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        void toggleCardFavorite(slug, button);
      });
      card.querySelector('.translation-card-cover')?.append(button);
    });
    renderTranslationFavoriteButtons();
  }

  function renderTranslationFavoriteButtons() {
    document.querySelectorAll('[data-card-favorite]').forEach(button => {
      const favorite = favoriteSlugs.has(button.dataset.cardFavorite);
      button.classList.toggle('is-favorite', favorite);
      button.textContent = favorite ? '♥' : '♡';
      button.setAttribute('aria-pressed', String(favorite));
      button.setAttribute('aria-label', favorite ? 'Odebrat z oblíbených' : 'Přidat do oblíbených');
      button.title = favorite ? 'V oblíbených' : 'Přidat do oblíbených';
      button.disabled = false;
    });
  }

  async function toggleCardFavorite(slug, button) {
    if (!currentUser) {
      showAuth();
      return;
    }
    button.disabled = true;
    const favorite = favoriteSlugs.has(slug);
    const result = favorite
      ? await db.from('user_favorite_games').delete().eq('user_id', currentUser.id).eq('game_slug', slug)
      : await db.from('user_favorite_games').insert({ user_id: currentUser.id, game_slug: slug });
    if (result.error) {
      button.disabled = false;
      return;
    }
    if (favorite) favoriteSlugs.delete(slug);
    else favoriteSlugs.add(slug);
    renderTranslationFavoriteButtons();
  }

  async function loadCurrentFollow({ markSeen = false } = {}) {
    if (!followUi) return;
    currentFollow = null;
    followUi.notifyLabel.hidden = true;
    if (!currentUser || !db) return renderCurrentFollow();
    const { data, error } = await db.from('user_followed_games')
      .select('id,game_slug,notify_updates,last_seen_version,last_seen_game_version,game_versions(translation_version,supported_game_version)')
      .eq('user_id', currentUser.id).eq('game_slug', currentGameSlug).maybeSingle();
    if (error) {
      setPanelMessage(followUi.message, 'Sledování bude dostupné po spuštění nové SQL migrace.', true);
      return renderCurrentFollow();
    }
    currentFollow = data;
    renderCurrentFollow();
    if (markSeen && data) await db.rpc('mark_followed_game_seen', { requested_game_slug: currentGameSlug });
  }

  function renderCurrentFollow() {
    if (!followUi) return;
    const followed = Boolean(currentFollow);
    followUi.button.classList.toggle('is-following', followed);
    followUi.button.setAttribute('aria-pressed', String(followed));
    followUi.label.textContent = followed ? 'Sledováno' : 'Sledovat hru';
    followUi.notifyLabel.hidden = !followed;
    followUi.notify.checked = Boolean(currentFollow?.notify_updates);
    followUi.button.disabled = false;
    followUi.notify.disabled = false;
  }

  async function toggleCurrentGameFollow() {
    if (!currentUser) {
      setPanelMessage(followUi.message, 'Pro sledování hry se nejprve přihlaste.');
      showAuth();
      return;
    }
    followUi.button.disabled = true;
    setPanelMessage(followUi.message, currentFollow ? 'Ruším sledování…' : 'Přidávám mezi sledované hry…');
    const result = currentFollow
      ? await db.from('user_followed_games').delete().eq('user_id', currentUser.id).eq('game_slug', currentGameSlug)
      : await db.from('user_followed_games').insert({ user_id: currentUser.id, game_slug: currentGameSlug, notify_updates: true });
    if (result.error) {
      setPanelMessage(followUi.message, 'Sledování se nepodařilo změnit: ' + result.error.message, true);
      followUi.button.disabled = false;
      return;
    }
    await loadCurrentFollow();
    setPanelMessage(followUi.message, currentFollow ? 'Hru nyní sledujete.' : 'Sledování bylo zrušeno.');
    await refreshBadgesAndPopup();
    renderProfilePage();
  }

  async function updateCurrentGameNotify() {
    if (!currentUser || !currentFollow) return;
    followUi.notify.disabled = true;
    const enabled = followUi.notify.checked;
    const { error } = await db.from('user_followed_games').update({ notify_updates: enabled })
      .eq('user_id', currentUser.id).eq('game_slug', currentGameSlug);
    followUi.notify.disabled = false;
    if (error) {
      followUi.notify.checked = !enabled;
      setPanelMessage(followUi.message, 'Nastavení upozornění se nepodařilo uložit.', true);
    } else {
      currentFollow.notify_updates = enabled;
      setPanelMessage(followUi.message, enabled ? 'Upozornění jsou zapnutá.' : 'Upozornění jsou vypnutá.');
    }
  }

  function renderNotificationList(target, rows, compact = false) {
    if (!target) return;
    if (!rows.length) {
      target.innerHTML = '<p class="empty-state">Nemáte žádná upozornění.</p>';
      return;
    }
    target.replaceChildren(...rows.map(row => {
      const item = document.createElement('article');
      item.className = `notification-item${row.is_read ? '' : ' is-unread'}`;
      const copy = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = row.title;
      const message = document.createElement('p');
      message.textContent = row.message;
      const time = document.createElement('time');
      time.dateTime = row.created_at;
      time.textContent = formatDateTime(row.created_at);
      copy.append(title, message, time);
      const actions = document.createElement('div');
      actions.className = 'notification-item-actions';
      if (row.game_slug && catalog[row.game_slug]) {
        const open = document.createElement('a');
        open.href = catalog[row.game_slug].page;
        open.textContent = compact ? 'Otevřít' : 'Otevřít hru';
        open.addEventListener('click', () => { if (!row.is_read) void markNotificationRead(row.id); });
        actions.append(open);
      }
      if (!row.is_read) {
        const read = document.createElement('button');
        read.type = 'button';
        read.textContent = 'Přečteno';
        read.addEventListener('click', () => markNotificationRead(row.id));
        actions.append(read);
      }
      item.append(copy, actions);
      return item;
    }));
  }

  async function loadNotifications() {
    if (!db || !currentUser) {
      notifications = [];
      renderNotificationState();
      return [];
    }
    const { data, error } = await db.from('notifications')
      .select('id,type,game_slug,title,message,is_read,created_at,payload')
      .eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(100);
    if (error) {
      if (notificationUi?.list) setPanelMessage(notificationUi.list, 'Upozornění budou dostupná po spuštění nové SQL migrace.', true);
      return [];
    }
    notifications = data || [];
    renderNotificationState();
    return notifications;
  }

  function renderNotificationState() {
    const unread = notifications.filter(row => !row.is_read).length;
    if (notificationUi) {
      notificationUi.wrapper.hidden = !currentUser;
      notificationUi.count.hidden = unread === 0;
      notificationUi.count.textContent = unread > 99 ? '99+' : String(unread);
      notificationUi.trigger.setAttribute('aria-label', unread ? `Otevřít upozornění, nepřečteno ${unread}` : 'Otevřít upozornění');
      renderNotificationList(notificationUi.list, notifications.slice(0, 8), true);
    }
    renderNotificationList(document.querySelector('[data-profile-notifications]'), notifications);
    renderNotificationList(document.querySelector('[data-dashboard-news]'), notifications.slice(0, 2), true);
    setText('[data-profile-unread-count]', numberFormatter.format(unread));
  }

  async function markNotificationRead(id) {
    if (!db || !currentUser) return;
    const { error } = await db.from('notifications').update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', currentUser.id).eq('id', id);
    if (!error) {
      notifications = notifications.map(row => row.id === id ? { ...row, is_read: true } : row);
      renderNotificationState();
    }
  }

  async function markAllNotificationsRead() {
    if (!db || !currentUser) return;
    const { error } = await db.from('notifications').update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', currentUser.id).eq('is_read', false);
    if (!error) {
      notifications = notifications.map(row => ({ ...row, is_read: true }));
      renderNotificationState();
    }
  }

  function subscribeToNotifications() {
    if (!db) return;
    if (notificationChannel) {
      db.removeChannel(notificationChannel);
      notificationChannel = null;
    }
    if (!currentUser) return;
    notificationChannel = db.channel(`user-notifications:${currentUser.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUser.id}`
      }, async () => {
        await loadNotifications();
        await refreshBadgesAndPopup();
      })
      .subscribe();
  }

  async function loadBadgeProgress() {
    if (!db || !currentUser) return [];
    await db.rpc('refresh_my_badges');
    const { data, error } = await db.rpc('get_my_badge_progress');
    if (error) return [];
    return data || [];
  }

  function badgeProgressLabel(badge) {
    if (!badge.automatic) return badge.unlocked_at ? 'Uděleno administrátorem' : 'Uděluje administrátor';
    const current = Math.min(Number(badge.progress_value || 0), Number(badge.requirement_value || 0));
    const labels = {
      comments: 'komentářů', votes: 'hlasování', followed_games: 'sledovaných her',
      confirmed_bug_reports: 'potvrzených chyb', account_days: 'dní'
    };
    return `${current} / ${badge.requirement_value} ${labels[badge.requirement_type] || ''}`;
  }

  function renderBadges(rows) {
    const target = document.querySelector('[data-profile-badges]');
    if (!target) return;
    if (!rows.length) {
      target.innerHTML = '<p class="empty-state">Odznaky budou dostupné po spuštění nové SQL migrace.</p>';
      return;
    }
    target.replaceChildren(...rows.map(badge => {
      const earned = Boolean(badge.unlocked_at);
      const card = document.createElement('article');
      card.className = `badge-card${earned ? ' is-earned' : ' is-locked'}${badge.is_selected ? ' is-selected' : ''}`;
      const visual = document.createElement('div');
      visual.className = 'badge-card-visual';
      const image = document.createElement('img');
      image.src = badgeImageSource(badge.image_url);
      image.alt = '';
      visual.append(image);
      if (!earned) {
        const lock = document.createElement('span');
        lock.className = 'badge-lock';
        lock.setAttribute('aria-label', 'Zamčeno');
        lock.textContent = '🔒';
        visual.append(lock);
      }
      const copy = document.createElement('div');
      const name = document.createElement('h3');
      name.textContent = badge.name;
      const description = document.createElement('p');
      description.textContent = badge.description;
      const progressLabel = document.createElement('span');
      progressLabel.className = 'badge-progress-label';
      progressLabel.textContent = badgeProgressLabel(badge);
      copy.append(name, description, progressLabel);
      if (badge.automatic) {
        const progress = document.createElement('progress');
        progress.max = Number(badge.requirement_value);
        progress.value = Math.min(Number(badge.progress_value || 0), progress.max);
        progress.setAttribute('aria-label', progressLabel.textContent);
        copy.append(progress);
      }
      if (earned) {
        const select = document.createElement('button');
        select.type = 'button';
        select.className = `button badge-select-button ${badge.is_selected ? 'button-primary' : 'button-secondary'}`;
        select.textContent = badge.is_selected ? 'Zobrazený odznak' : 'Nastavit jako zobrazený';
        select.addEventListener('click', () => selectDisplayedBadge(badge.is_selected ? null : badge.slug));
        copy.append(select);
      }
      card.append(visual, copy);
      return card;
    }));
  }

  async function selectDisplayedBadge(slug) {
    const { error } = await db.rpc('set_my_displayed_badge', { requested_badge_slug: slug });
    if (error) return setPanelMessage(document.querySelector('[data-badge-message]'), 'Odznak se nepodařilo nastavit.', true);
    setPanelMessage(document.querySelector('[data-badge-message]'), slug ? 'Zobrazený odznak byl nastaven.' : 'Zobrazený odznak byl odebrán.');
    await renderProfilePage();
    document.dispatchEvent(new CustomEvent('nio:selected-badge-changed'));
  }

  async function refreshBadgesAndPopup() {
    const rows = await loadBadgeProgress();
    renderBadges(rows);
    const unseen = rows.find(row => row.unlocked_at && !row.seen_at && !seenPopupBadges.has(String(row.badge_id)));
    if (unseen) showBadgePopup(unseen);
    return rows;
  }

  function showBadgePopup(badge) {
    seenPopupBadges.add(String(badge.badge_id));
    const modal = document.createElement('div');
    modal.className = 'badge-unlock-modal';
    modal.innerHTML = `
      <div class="badge-unlock-backdrop"></div>
      <section class="badge-unlock-dialog" role="dialog" aria-modal="true" aria-labelledby="badge-unlock-title" tabindex="-1">
        <button type="button" class="badge-unlock-close" aria-label="Zavřít">×</button>
        <p class="eyebrow">Nový odznak odemčen!</p>
        <img src="${badgeImageSource(badge.image_url)}" alt="${badge.name}">
        <h2 id="badge-unlock-title"></h2>
        <p data-badge-popup-description></p>
      </section>`;
    modal.querySelector('h2').textContent = badge.name;
    modal.querySelector('[data-badge-popup-description]').textContent = badge.description;
    document.body.append(modal);
    document.body.classList.add('modal-open');
    const close = async () => {
      await db.rpc('mark_badge_seen', { requested_badge_id: badge.badge_id });
      modal.remove();
      if (!document.querySelector('.auth-modal:not([hidden])')) document.body.classList.remove('modal-open');
      const rows = await loadBadgeProgress();
      const next = rows.find(row => row.unlocked_at && !row.seen_at && !seenPopupBadges.has(String(row.badge_id)));
      if (next) showBadgePopup(next);
    };
    modal.querySelector('.badge-unlock-close').addEventListener('click', close);
    modal.querySelector('.badge-unlock-backdrop').addEventListener('click', close);
    modal.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    requestAnimationFrame(() => modal.classList.add('is-visible'));
    modal.querySelector('.badge-unlock-dialog').focus();
  }

  async function loadFollowedGames() {
    if (!db || !currentUser) return [];
    const { data, error } = await db.from('user_followed_games')
      .select('id,game_slug,notify_updates,last_seen_version,last_seen_game_version,created_at,game_versions(name,translation_version,supported_game_version,translation_updated_at)')
      .eq('user_id', currentUser.id).order('created_at', { ascending: false });
    return error ? [] : (data || []);
  }

  async function loadFavoriteGames() {
    if (!db || !currentUser) {
      favoriteSlugs = new Set();
      return [];
    }
    const { data, error } = await db.from('user_favorite_games')
      .select('id,game_slug,created_at,game_versions(name,translation_version,supported_game_version,translation_updated_at)')
      .eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error) return [];
    favoriteSlugs = new Set((data || []).map(row => row.game_slug));
    return data || [];
  }

  async function renderFavoriteGames(rows) {
    const target = document.querySelector('[data-profile-favorite-games]');
    if (!target) return;
    if (!rows.length) {
      target.innerHTML = '<div class="favorite-empty"><p class="empty-state">Zatím nemáte žádné oblíbené hry.</p><a class="button button-primary" href="preklady.html">Procházet překlady</a></div>';
      return;
    }
    let gameStatuses = {};
    try { gameStatuses = await (window.NIO_GAME_STATUSES_READY || Promise.resolve({})); } catch { gameStatuses = {}; }
    target.replaceChildren(...rows.map(row => {
      const game = unwrapRelation(row.game_versions) || {};
      const staticGame = catalog[row.game_slug] || { name: game.name || row.game_slug, page: `${row.game_slug}.html`, image: 'favicon.png' };
      const card = document.createElement('article');
      card.className = 'favorite-game-card';
      const image = document.createElement('img');
      image.src = staticGame.image;
      image.alt = `Hra ${game.name || staticGame.name}`;
      const body = document.createElement('div');
      body.className = 'favorite-game-body';
      const title = document.createElement('h3');
      title.textContent = game.name || staticGame.name;
      const meta = document.createElement('dl');
      [['Verze češtiny', game.translation_version || '—'], ['Stav překladu', statusLabel(gameStatuses[row.game_slug])]].forEach(([term, value]) => {
        const wrap = document.createElement('div');
        const dt = document.createElement('dt'); dt.textContent = term;
        const dd = document.createElement('dd'); dd.textContent = value;
        wrap.append(dt, dd); meta.append(wrap);
      });
      const controls = document.createElement('div');
      controls.className = 'favorite-game-actions';
      const open = document.createElement('a');
      open.className = 'button button-primary'; open.href = staticGame.page; open.textContent = 'Zobrazit překlad';
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'button favorite-remove-button'; remove.textContent = '♥ Odebrat z oblíbených';
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        const { error } = await db.from('user_favorite_games').delete().eq('user_id', currentUser.id).eq('game_slug', row.game_slug);
        if (!error) await refreshFavoriteViews();
        else remove.disabled = false;
      });
      controls.append(open, remove);
      body.append(title, meta, controls);
      card.append(image, body);
      return card;
    }));
  }

  async function refreshFavoriteViews() {
    const rows = await loadFavoriteGames();
    favoriteSlugs = new Set(rows.map(row => row.game_slug));
    setText('[data-profile-favorite-count]', numberFormatter.format(rows.length));
    await renderFavoriteGames(rows);
    renderTranslationFavoriteButtons();
    return rows;
  }

  async function renderFollowedGames(rows) {
    const target = document.querySelector('[data-profile-followed-games]');
    if (!target) return;
    if (!rows.length) {
      target.innerHTML = '<p class="empty-state">Zatím nesledujete žádnou hru. Otevřete detail překladu a klikněte na „Sledovat hru“.</p>';
      return;
    }
    let gameStatuses = {};
    try { gameStatuses = await (window.NIO_GAME_STATUSES_READY || Promise.resolve({})); } catch { gameStatuses = {}; }
    target.replaceChildren(...rows.map(row => {
      const game = unwrapRelation(row.game_versions) || {};
      const staticGame = catalog[row.game_slug] || { name: game.name || row.game_slug, page: `${row.game_slug}.html`, image: 'favicon.png' };
      const changed = row.last_seen_version !== game.translation_version || row.last_seen_game_version !== game.supported_game_version;
      const card = document.createElement('article');
      card.className = `followed-game-card${changed ? ' has-update' : ''}`;
      const image = document.createElement('img');
      image.src = staticGame.image;
      image.alt = `Hra ${game.name || staticGame.name}`;
      const body = document.createElement('div');
      body.className = 'followed-game-body';
      const top = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = game.name || staticGame.name;
      top.append(title);
      if (changed) {
        const update = document.createElement('span');
        update.className = 'new-version-label';
        update.textContent = 'NOVÁ VERZE';
        top.append(update);
      }
      const meta = document.createElement('dl');
      const fields = [
        ['Verze češtiny', game.translation_version || '—'],
        ['Verze hry', game.supported_game_version || '—'],
        ['Stav', statusLabel(gameStatuses[row.game_slug])],
        ['Aktualizováno', formatDate(game.translation_updated_at)]
      ];
      fields.forEach(([term, value]) => {
        const wrap = document.createElement('div');
        const dt = document.createElement('dt'); dt.textContent = term;
        const dd = document.createElement('dd'); dd.textContent = value;
        wrap.append(dt, dd); meta.append(wrap);
      });
      const controls = document.createElement('div');
      controls.className = 'followed-game-actions';
      const open = document.createElement('a');
      open.className = 'button button-primary'; open.href = staticGame.page; open.textContent = 'Otevřít detail';
      open.addEventListener('click', () => { void db.rpc('mark_followed_game_seen', { requested_game_slug: row.game_slug }); });
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'button button-secondary'; remove.textContent = 'Zrušit sledování';
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        const { error } = await db.from('user_followed_games').delete().eq('user_id', currentUser.id).eq('game_slug', row.game_slug);
        if (!error) { await refreshBadgesAndPopup(); await renderProfilePage(); }
        else remove.disabled = false;
      });
      const notify = document.createElement('label');
      notify.className = 'followed-game-notify';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.checked = row.notify_updates;
      checkbox.addEventListener('change', async () => {
        checkbox.disabled = true;
        const { error } = await db.from('user_followed_games').update({ notify_updates: checkbox.checked })
          .eq('user_id', currentUser.id).eq('game_slug', row.game_slug);
        if (error) checkbox.checked = !checkbox.checked;
        checkbox.disabled = false;
      });
      notify.append(checkbox, document.createTextNode(' Upozornit mě na novou verzi'));
      controls.append(open, remove, notify);
      body.append(top, meta, controls);
      card.append(image, body);
      return card;
    }));
  }

  const hasGameUpdate = row => {
    const game = unwrapRelation(row.game_versions) || {};
    return row.last_seen_version !== game.translation_version || row.last_seen_game_version !== game.supported_game_version;
  };

  function renderDashboardGames(rows) {
    const target = document.querySelector('[data-dashboard-games]');
    if (!target) return;
    if (!rows.length) {
      target.innerHTML = '<p class="dashboard-empty">Zatím nesledujete žádnou hru.</p><a class="dashboard-empty-link" href="preklady.html">Vybrat překlad →</a>';
      return;
    }
    const preview = [...rows].sort((a, b) => Number(hasGameUpdate(b)) - Number(hasGameUpdate(a))).slice(0, 3);
    target.replaceChildren(...preview.map(row => {
      const game = unwrapRelation(row.game_versions) || {};
      const staticGame = catalog[row.game_slug] || { name: game.name || row.game_slug, page: `${row.game_slug}.html`, image: 'favicon.png' };
      const link = document.createElement('a');
      link.className = `dashboard-game${hasGameUpdate(row) ? ' has-update' : ''}`;
      link.href = staticGame.page;
      const image = document.createElement('img'); image.src = staticGame.image; image.alt = '';
      const copy = document.createElement('span');
      const name = document.createElement('strong'); name.textContent = game.name || staticGame.name;
      const version = document.createElement('small'); version.textContent = `Čeština ${game.translation_version || '—'} · hra ${game.supported_game_version || '—'}`;
      copy.append(name, version);
      link.append(image, copy);
      if (hasGameUpdate(row)) {
        const label = document.createElement('span'); label.className = 'dashboard-update-label'; label.textContent = 'NOVÁ VERZE'; link.append(label);
      }
      return link;
    }));
  }

  function renderDashboardBadges(rows) {
    const target = document.querySelector('[data-dashboard-badges]');
    if (!target) return;
    if (!rows.length) {
      target.innerHTML = '<p class="dashboard-empty">Odznaky budou dostupné po spuštění SQL migrace.</p>';
      return;
    }
    const ranked = [...rows].sort((a, b) => {
      if (a.is_selected !== b.is_selected) return Number(b.is_selected) - Number(a.is_selected);
      if (Boolean(a.unlocked_at) !== Boolean(b.unlocked_at)) return Number(Boolean(b.unlocked_at)) - Number(Boolean(a.unlocked_at));
      const aProgress = Number(a.progress_value || 0) / Math.max(1, Number(a.requirement_value || 1));
      const bProgress = Number(b.progress_value || 0) / Math.max(1, Number(b.requirement_value || 1));
      return bProgress - aProgress;
    }).slice(0, 4);
    target.replaceChildren(...ranked.map(badge => {
      const earned = Boolean(badge.unlocked_at);
      const item = document.createElement('a');
      item.className = `dashboard-badge${earned ? ' is-earned' : ' is-locked'}`;
      item.href = '#odznaky';
      const image = document.createElement('img'); image.src = badgeImageSource(badge.image_url); image.alt = '';
      const copy = document.createElement('span');
      const name = document.createElement('strong'); name.textContent = badge.name;
      const state = document.createElement('small'); state.textContent = earned ? (badge.is_selected ? 'Zobrazený odznak' : 'Získáno') : badgeProgressLabel(badge);
      copy.append(name, state); item.append(image, copy);
      if (!earned) { const lock = document.createElement('span'); lock.className = 'dashboard-badge-lock'; lock.textContent = '🔒'; item.append(lock); }
      return item;
    }));
  }

  function renderDashboardActivity(activities = []) {
    const target = document.querySelector('[data-dashboard-activity]');
    if (!target) return;
    if (!activities.length) {
      target.innerHTML = '<p class="dashboard-empty">Zatím tu není žádná aktivita.</p>';
      return;
    }
    target.replaceChildren(...activities.slice(0, 3).map(row => {
      const node = row.node.cloneNode(true);
      node.classList.add('dashboard-activity-row');
      return node;
    }));
  }

  function renderSimpleRows(target, rows, emptyText, mapper) {
    if (!target) return;
    if (!rows.length) {
      target.innerHTML = `<p class="empty-state">${emptyText}</p>`;
      return;
    }
    target.replaceChildren(...rows.map(mapper));
  }

  const createActivityRow = (titleText, copyText, date) => {
    const item = document.createElement('article');
    item.className = 'profile-activity-row';
    const copy = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = titleText;
    const detail = document.createElement('p'); detail.textContent = copyText;
    const time = document.createElement('time'); time.dateTime = date; time.textContent = formatDateTime(date);
    copy.append(title, detail); item.append(copy, time);
    return item;
  };

  async function renderProfileActivity() {
    if (!document.querySelector('[data-profile-activity]')) return { comments: [], votes: [], follows: [], earned: [], activities: [] };
    const [commentsResult, votesResult, followsResult, badgesResult] = await Promise.all([
      db.from('comments').select('id,body,game_slug,created_at').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50),
      db.from('translation_votes').select('request_id,created_at,translation_requests(title)').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50),
      db.from('user_followed_games').select('game_slug,created_at').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50),
      db.from('user_badges').select('unlocked_at,badges(name)').eq('user_id', currentUser.id).order('unlocked_at', { ascending: false }).limit(50)
    ]);
    const comments = commentsResult.data || [];
    const votes = votesResult.data || [];
    const follows = followsResult.data || [];
    const earned = badgesResult.data || [];
    const activities = [
      ...comments.map(row => ({ date: row.created_at, node: createActivityRow('Komentář', row.body, row.created_at) })),
      ...votes.map(row => ({ date: row.created_at, node: createActivityRow('Hlasování', `Hlas pro ${unwrapRelation(row.translation_requests)?.title || 'překlad'}`, row.created_at) })),
      ...follows.map(row => ({ date: row.created_at, node: createActivityRow('Sledovaná hra', catalog[row.game_slug]?.name || row.game_slug, row.created_at) })),
      ...earned.map(row => ({ date: row.unlocked_at, node: createActivityRow('Nový odznak', unwrapRelation(row.badges)?.name || 'Odznak', row.unlocked_at) }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
    renderSimpleRows(document.querySelector('[data-profile-activity]'), activities, 'Zatím tu není žádná aktivita.', row => row.node);
    renderSimpleRows(document.querySelector('[data-profile-comments]'), comments, 'Zatím jste nenapsali žádný komentář.', row => {
      const game = catalog[row.game_slug];
      const node = createActivityRow(game?.name || row.game_slug, row.body, row.created_at);
      if (game) { const link = document.createElement('a'); link.href = `${game.page}#komentare`; link.textContent = 'Otevřít diskusi'; node.append(link); }
      return node;
    });
    renderSimpleRows(document.querySelector('[data-profile-votes]'), votes, 'Zatím jste v žádném hlasování nehlasovali.', row =>
      createActivityRow('Hlas pro překlad', unwrapRelation(row.translation_requests)?.title || 'Neznámá hra', row.created_at));
    return { comments, votes, follows, earned, activities };
  }

  async function loadOwnProfile() {
    if (!db || !currentUser) return null;
    const { data } = await db.from('profiles')
      .select('id,display_name,avatar_url,bio,created_at,selected_badge_id')
      .eq('id', currentUser.id).maybeSingle();
    currentProfile = data;
    return data;
  }

  async function renderProfilePage() {
    if (!currentUser || !db || !document.querySelector('[data-user-overview]')) return;
    const [profile, followed, favorites, badgeRows] = await Promise.all([loadOwnProfile(), loadFollowedGames(), loadFavoriteGames(), loadBadgeProgress()]);
    const name = profile?.display_name?.trim() || currentUser.user_metadata?.display_name?.trim() || currentUser.email?.split('@')[0] || 'Hráč';
    const earned = badgeRows.filter(row => row.unlocked_at);
    const selected = badgeRows.find(row => row.is_selected && row.unlocked_at);
    setText('[data-profile-member-name]', name);
    setText('[data-profile-member-since]', formatDate(profile?.created_at || currentUser.created_at));
    setText('[data-profile-badge-count]', `${numberFormatter.format(earned.length)} / ${numberFormatter.format(badgeRows.length || 8)}`);
    setText('[data-profile-follow-count]', numberFormatter.format(followed.length));
    setText('[data-profile-favorite-count]', numberFormatter.format(favorites.length));
    const selectedHost = document.querySelector('[data-profile-selected-badge]');
    if (selectedHost) {
      selectedHost.replaceChildren();
      const icon = createBadgeIcon(selected, 'large');
      if (icon) selectedHost.append(icon);
      else selectedHost.textContent = 'Žádný zobrazený odznak';
    }
    renderBadges(badgeRows);
    await renderFollowedGames(followed);
    await renderFavoriteGames(favorites);
    const [, activityData] = await Promise.all([loadNotifications(), renderProfileActivity(), renderAdminPanel(badgeRows)]);
    renderDashboardGames(followed);
    renderDashboardBadges(badgeRows);
    renderDashboardActivity(activityData?.activities || []);
    const unseen = badgeRows.find(row => row.unlocked_at && !row.seen_at && !seenPopupBadges.has(String(row.badge_id)));
    if (unseen) showBadgePopup(unseen);
  }

  async function renderAdminPanel(badgeRows = []) {
    const panel = document.querySelector('[data-badge-admin]');
    if (!panel || !currentUser) return;
    const adminNav = document.querySelector('[data-admin-nav]');
    const { data, error } = await db.rpc('is_game_status_admin');
    isAdmin = !error && data === true;
    panel.hidden = !isAdmin;
    if (adminNav) adminNav.hidden = !isAdmin;
    if (!isAdmin && window.location.hash === '#administrace') window.location.hash = '#prehled';
    else if (isAdmin) window.dispatchEvent(new Event('hashchange'));
    window.NIORequests?.load();
    if (!isAdmin || panel.dataset.ready === 'true') return;
    const [profilesResult, badgesResult, initialGamesResult] = await Promise.all([
      db.from('profiles').select('id,display_name').order('display_name'),
      db.from('badges').select('slug,name').order('sort_order'),
      db.from('game_versions').select('game_slug,name,translation_version,supported_game_version,translation_updated_at,steam_app_id,verified_build_id').order('name')
    ]);
    let gamesResult = initialGamesResult;
    if (gamesResult.error) {
      gamesResult = await db.from('game_versions').select('game_slug,name,translation_version,supported_game_version,translation_updated_at').order('name');
    }
    let liveGames = {};
    try { liveGames = await (window.NIO_GAME_STATUSES_READY || Promise.resolve({})); } catch { liveGames = {}; }
    const userSelect = panel.querySelector('[data-admin-user]');
    const badgeSelect = panel.querySelector('[data-admin-badge]');
    const gameSelect = panel.querySelector('[data-admin-game]');
    (profilesResult.data || []).forEach(profile => {
      const option = document.createElement('option'); option.value = profile.id; option.textContent = profile.display_name || profile.id; userSelect.append(option);
    });
    (badgesResult.data || badgeRows).forEach(badge => {
      const option = document.createElement('option'); option.value = badge.slug; option.textContent = badge.name; badgeSelect.append(option);
    });
    (gamesResult.data || []).forEach(game => {
      const live = liveGames[game.game_slug] || {};
      const editable = {
        ...game,
        steam_app_id: game.steam_app_id || live.appId || '',
        verified_build_id: game.verified_build_id || live.statusOverride?.verifiedBuildId || live.verifiedBuildId || '',
        latest_build_id: live.currentBuildId || '',
        last_steam_update: live.lastSteamUpdate || null
      };
      const option = document.createElement('option'); option.value = game.game_slug; option.textContent = game.name; option.dataset.game = JSON.stringify(editable); gameSelect.append(option);
    });
    const showGame = () => {
      const option = gameSelect.selectedOptions[0];
      if (!option?.dataset.game) return;
      const game = JSON.parse(option.dataset.game);
      panel.querySelector('[data-admin-translation-version]').value = game.translation_version;
      panel.querySelector('[data-admin-game-version]').value = game.supported_game_version;
      panel.querySelector('[data-admin-version-date]').value = game.translation_updated_at;
      panel.querySelector('[data-admin-steam-app-id]').value = game.steam_app_id || '';
      panel.querySelector('[data-admin-verified-build-id]').value = game.verified_build_id || '';
      panel.querySelector('[data-admin-latest-build]').value = game.latest_build_id || '—';
      panel.querySelector('[data-admin-last-steam-update]').value = formatDateTime(game.last_steam_update);
    };
    gameSelect.addEventListener('change', showGame);
    showGame();
    panel.querySelectorAll('[data-admin-badge-action]').forEach(button => button.addEventListener('click', async () => {
      button.disabled = true;
      const shouldGrant = button.dataset.adminBadgeAction === 'grant';
      const { error: actionError } = await db.rpc('admin_set_user_badge', {
        requested_user_id: userSelect.value,
        requested_badge_slug: badgeSelect.value,
        should_grant: shouldGrant
      });
      button.disabled = false;
      setPanelMessage(panel.querySelector('[data-admin-badge-message]'), actionError ? actionError.message : (shouldGrant ? 'Odznak byl udělen.' : 'Odznak byl odebrán.'), Boolean(actionError));
      await loadAdminUserBadges();
      await renderProfilePage();
    }));
    const loadAdminUserBadges = async () => {
      const { data: earnedRows } = await db.from('user_badges').select('badge_id,badges(name)').eq('user_id', userSelect.value);
      setText('[data-admin-user-badges]', (earnedRows || []).map(row => unwrapRelation(row.badges)?.name).filter(Boolean).join(', ') || 'Žádné odznaky');
    };
    userSelect.addEventListener('change', loadAdminUserBadges);
    panel.querySelector('[data-admin-version-form]').addEventListener('submit', async event => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector('[type="submit"]'); submit.disabled = true;
      const args = {
        requested_game_slug: gameSelect.value,
        requested_translation_version: panel.querySelector('[data-admin-translation-version]').value.trim(),
        requested_supported_game_version: panel.querySelector('[data-admin-game-version]').value.trim(),
        requested_translation_updated_at: panel.querySelector('[data-admin-version-date]').value,
        requested_steam_app_id: panel.querySelector('[data-admin-steam-app-id]').value.trim(),
        requested_verified_build_id: panel.querySelector('[data-admin-verified-build-id]').value.trim() || null
      };
      const { data: saved, error: versionError } = await db.rpc('admin_update_game_version', args);
      submit.disabled = false;
      setPanelMessage(panel.querySelector('[data-admin-version-message]'), versionError ? versionError.message : 'Údaje byly uloženy. Latest Build a Last Steam Update doplní Steam kontrola automaticky.', Boolean(versionError));
      if (!versionError && saved) {
        const previous = JSON.parse(gameSelect.selectedOptions[0].dataset.game || '{}');
        gameSelect.selectedOptions[0].dataset.game = JSON.stringify({ ...previous, ...saved });
        showGame();
      }
    });
    panel.dataset.ready = 'true';
    await loadAdminUserBadges();
  }

  async function handleUser(user) {
    const changed = currentUser?.id !== user?.id;
    currentUser = user || null;
    if (!currentUser) currentProfile = null;
    if (notificationUi) notificationUi.wrapper.hidden = !currentUser;
    subscribeToNotifications();
    await Promise.all([loadNotifications(), loadCurrentFollow({ markSeen: true }), loadCurrentFavorite(), refreshFavoriteViews()]);
    renderTranslationFavoriteButtons();
    if (currentUser) {
      if (changed) seenPopupBadges.clear();
      await Promise.all([refreshBadgesAndPopup(), renderProfilePage()]);
    }
  }

  window.NIO_GAME_CATALOG = catalog;
  window.NIO_USER_SYSTEM = {
    catalog,
    createBadgeIcon,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    loadFollowedGames,
    loadFavoriteGames,
    refreshFavoriteViews,
    renderProfilePage,
    refreshBadgesAndPopup
  };

  document.dispatchEvent(new CustomEvent('nio:user-system-ready', { detail: window.NIO_USER_SYSTEM }));
  document.addEventListener('nio:profile-updated', () => renderProfilePage());
  document.addEventListener('nio:selected-badge-changed', () => renderProfilePage());
  document.addEventListener('nio:user-activity-changed', async () => {
    await refreshBadgesAndPopup();
    await renderProfilePage();
  });
  document.querySelector('[data-profile-notifications-read-all]')?.addEventListener('click', markAllNotificationsRead);
  initTranslationFavoriteButtons();

  if (!db) {
    renderCurrentFollow();
    renderCurrentFavorite();
    renderNotificationState();
    return;
  }
  db.auth.getSession().then(({ data }) => handleUser(data.session?.user || null));
  db.auth.onAuthStateChange((_event, session) => window.setTimeout(() => handleUser(session?.user || null), 0));
})();
