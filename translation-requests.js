(() => {
  'use strict';

  const context = window.NIO_REQUEST_CONTEXT;
  if (!context) return;

  const statusLabels = Object.freeze({
    pending: 'Nový návrh',
    considering: 'Zvažuje se',
    planned: 'Plánovaný překlad',
    translating: 'Překládá se',
    completed: 'Hotovo',
    rejected: 'Zamítnuto'
  });
  let rows = [];
  let isAdmin = false;
  let activeFilter = 'votes';

  const formatVotes = count => new Intl.NumberFormat('cs-CZ').format(Number(count) || 0);
  const formatDate = value => value
    ? new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(new Date(value))
    : '—';
  const setMessage = (node, message, error = false) => context.setMessage(node, message, error);

  function createStatus(status) {
    const badge = document.createElement('span');
    badge.className = 'vote-status';
    badge.dataset.status = status;
    badge.textContent = statusLabels[status] || status;
    return badge;
  }

  function filteredRows() {
    const result = [...rows];
    if (activeFilter === 'planned') return result.filter(row => ['planned', 'translating'].includes(row.status));
    if (activeFilter === 'completed') return result.filter(row => row.status === 'completed');
    if (activeFilter === 'newest') return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return result.sort((a, b) => Number(b.vote_count) - Number(a.vote_count) || new Date(b.created_at) - new Date(a.created_at));
  }

  function createPreviewCard(request) {
    const card = document.createElement('a');
    card.className = 'preview-card';
    card.href = `hlasovani.html#request-${request.id}`;
    const mark = document.createElement('span');
    mark.className = 'request-game-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = request.game_name?.trim().charAt(0).toUpperCase() || 'N';
    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = request.game_name;
    info.append(title, createStatus(request.status));
    const count = document.createElement('div');
    count.className = 'preview-count';
    const strong = document.createElement('strong');
    strong.textContent = formatVotes(request.vote_count);
    const label = document.createElement('span');
    label.textContent = 'hlasů';
    count.append(strong, label);
    card.append(mark, info, count);
    return card;
  }

  function renderList() {
    const list = document.querySelector('[data-vote-list]');
    if (!list) return;
    const visibleRows = filteredRows();
    if (!visibleRows.length) {
      list.innerHTML = '<p class="empty-state">Tomuto filtru zatím neodpovídá žádná žádost.</p>';
      return;
    }
    list.replaceChildren(...visibleRows.map(createRequestCard));
    const requestedId = window.location.hash.match(/^#request-(.+)$/)?.[1];
    if (requestedId) document.getElementById(`request-${CSS.escape(requestedId)}`)?.scrollIntoView({ block: 'center' });
  }

  function renderAdminList() {
    const list = document.querySelector('[data-admin-request-list]');
    if (!list) return;
    if (!isAdmin) {
      list.innerHTML = '<p class="empty-state">Administrace je dostupná pouze administrátorovi.</p>';
      return;
    }
    const ordered = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!ordered.length) {
      list.innerHTML = '<p class="empty-state">Zatím nebyla vytvořena žádná žádost.</p>';
      return;
    }
    list.replaceChildren(...ordered.map(request => {
      const card = document.createElement('article');
      card.className = 'admin-request-card';
      const heading = document.createElement('div');
      heading.className = 'admin-request-card-heading';
      const copy = document.createElement('div');
      const title = document.createElement('h4');
      title.textContent = request.game_name;
      const meta = document.createElement('p');
      meta.textContent = `${request.proposer_name || 'Člen komunity'} · ${formatDate(request.created_at)} · ${formatVotes(request.vote_count)} hlasů`;
      copy.append(title, meta);
      heading.append(copy, createStatus(request.status));
      const controls = createAdminControls(request);
      controls.querySelector('summary').textContent = 'Upravit nebo odstranit';
      card.append(heading, controls);
      return card;
    }));
  }

  async function load() {
    const list = document.querySelector('[data-vote-list]');
    const preview = document.querySelector('[data-vote-preview]');
    const adminList = document.querySelector('[data-admin-request-list]');
    if (!list && !preview && !adminList) return;
    const db = context.db;
    if (!db) {
      const message = '<p class="empty-state">Žádosti se zobrazí po připojení Supabase.</p>';
      if (list) list.innerHTML = message;
      if (preview) preview.innerHTML = message;
      if (adminList) adminList.innerHTML = message;
      return;
    }
    const { data, error } = await db.rpc('get_translation_requests');
    if (error) {
      const message = '<p class="empty-state">Žádosti zatím nejsou aktivní. Spusťte připravený SQL skript v Supabase.</p>';
      if (list) list.innerHTML = message;
      if (preview) preview.innerHTML = message;
      if (adminList) adminList.innerHTML = message;
      return;
    }
    rows = data || [];
    if (context.user) {
      const adminResult = await db.rpc('is_translation_request_admin');
      isAdmin = !adminResult.error && adminResult.data === true;
    } else isAdmin = false;
    renderList();
    renderAdminList();
    if (preview) {
      const top = [...rows]
        .filter(row => !['completed', 'rejected'].includes(row.status))
        .sort((a, b) => Number(b.vote_count) - Number(a.vote_count) || new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);
      if (!top.length) preview.innerHTML = '<p class="empty-state">Zatím nebyla navržena žádná hra.</p>';
      else preview.replaceChildren(...top.map(createPreviewCard));
    }
  }

  function createRequestCard(request) {
    const voted = request.user_has_voted === true;
    const card = document.createElement('article');
    card.className = 'vote-card';
    card.id = `request-${request.id}`;
    const body = document.createElement('div');
    body.className = 'vote-card-body';
    const top = document.createElement('div');
    top.className = 'vote-card-top';
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    const titleLink = document.createElement('a');
    titleLink.href = request.game_url;
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.textContent = request.game_name;
    title.append(titleLink);
    const meta = document.createElement('p');
    meta.className = 'request-meta';
    meta.textContent = `Navrhl: ${request.proposer_name || 'Člen komunity'} · ${formatDate(request.created_at)}`;
    const description = document.createElement('p');
    description.className = 'vote-description';
    description.textContent = request.note || 'Bez doplňující poznámky.';
    copy.append(title, meta, description);
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
    button.textContent = voted ? 'ZRUŠIT PODPORU' : 'PODPOŘIT';
    button.setAttribute('aria-pressed', String(voted));
    button.disabled = ['completed', 'rejected'].includes(request.status);
    if (request.status === 'completed') button.textContent = 'PŘEKLAD HOTOV';
    if (request.status === 'rejected') button.textContent = 'ŽÁDOST ZAMÍTNUTA';
    const feedback = document.createElement('p');
    feedback.className = 'vote-feedback';
    button.addEventListener('click', () => toggleVote(request.id, voted, button, feedback));
    controls.append(button, feedback);
    actions.append(total, controls);
    body.append(top);
    if (isAdmin) body.append(createAdminControls(request));
    body.append(actions);
    card.append(body);
    return card;
  }

  function createAdminControls(request) {
    const details = document.createElement('details');
    details.className = 'request-admin';
    const summary = document.createElement('summary');
    summary.textContent = 'Správa žádosti';
    const form = document.createElement('form');
    form.className = 'request-admin-form';
    form.innerHTML = '<label>Název hry<input name="game_name" maxlength="120" required></label><label>URL<input name="game_url" type="url" maxlength="500" required></label><label class="request-admin-note">Poznámka<textarea name="note" maxlength="1000" rows="3"></textarea></label>';
    form.elements.game_name.value = request.game_name;
    form.elements.game_url.value = request.game_url;
    form.elements.note.value = request.note || '';
    const statusLabel = document.createElement('label');
    statusLabel.textContent = 'Status';
    const select = document.createElement('select');
    select.name = 'status';
    Object.entries(statusLabels).forEach(([status, label]) => {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = label;
      option.selected = status === request.status;
      select.append(option);
    });
    statusLabel.append(select);
    const actions = document.createElement('div');
    actions.className = 'request-admin-actions';
    const save = document.createElement('button');
    save.className = 'button button-primary';
    save.type = 'submit';
    save.textContent = 'Uložit změny';
    const remove = document.createElement('button');
    remove.className = 'button request-delete-button';
    remove.type = 'button';
    remove.textContent = 'Odstranit';
    const message = document.createElement('p');
    message.className = 'vote-feedback';
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();
      save.disabled = true;
      const { data: updatedRequest, error } = await context.db.from('translation_requests').update({
        game_name: form.elements.game_name.value.trim(),
        game_url: form.elements.game_url.value.trim(),
        note: form.elements.note.value.trim() || null,
        status: select.value
      }).eq('id', request.id)
        .select('id, game_name, game_url, note, status')
        .maybeSingle();
      save.disabled = false;
      if (error) setMessage(message, `Změny se nepodařilo uložit: ${error.message}`, true);
      else if (!updatedRequest) setMessage(message, 'Změny se nepodařilo uložit. Ověřte přihlášení a oprávnění administrátora.', true);
      else {
        setMessage(message, 'Změny byly uloženy.');
        await load();
      }
    });
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Opravdu odstranit žádost „${request.game_name}“?`)) return;
      remove.disabled = true;
      const { error } = await context.db.from('translation_requests').delete().eq('id', request.id);
      if (error) {
        remove.disabled = false;
        setMessage(message, `Žádost se nepodařilo odstranit: ${error.message}`, true);
      } else load();
    });
    actions.append(save, remove);
    form.append(statusLabel, actions, message);
    details.append(summary, form);
    return details;
  }

  async function toggleVote(requestId, voted, button, feedback) {
    if (!context.user) {
      setMessage(feedback, 'Pro podporu žádosti se musíte přihlásit.', true);
      context.openAuth();
      return;
    }
    button.disabled = true;
    const query = voted
      ? context.db.from('translation_votes').delete().eq('request_id', requestId).eq('user_id', context.user.id)
      : context.db.from('translation_votes').insert({ request_id: requestId, user_id: context.user.id });
    const { error } = await query;
    if (error) {
      button.disabled = false;
      setMessage(feedback, `Hlas se nepodařilo uložit: ${error.message}`, true);
      return;
    }
    await load();
    document.dispatchEvent(new Event('nio:user-activity-changed'));
  }

  function ensureForm() {
    if (!document.querySelector('[data-request-open]') || document.querySelector('[data-request-modal]')) return;
    const modal = document.createElement('div');
    modal.className = 'request-modal';
    modal.dataset.requestModal = '';
    modal.hidden = true;
    modal.innerHTML = '<div class="request-modal-backdrop" data-request-close></div><section class="request-dialog" role="dialog" aria-modal="true" aria-labelledby="request-form-title" tabindex="-1"><button class="request-dialog-close" type="button" data-request-close aria-label="Zavřít">×</button><p class="eyebrow">Nová žádost</p><h2 id="request-form-title">Navrhnout hru</h2><p>Nejdříve ověříme, zda už stejná nebo velmi podobná žádost neexistuje.</p><form data-request-form><label for="request-game-name">Název hry</label><input id="request-game-name" name="game_name" minlength="2" maxlength="120" required autocomplete="off"><label for="request-game-url">Steam URL nebo odkaz na obchod</label><input id="request-game-url" name="game_url" type="url" maxlength="500" required placeholder="https://store.steampowered.com/…"><label for="request-note">Krátká poznámka <span>(volitelné)</span></label><textarea id="request-note" name="note" maxlength="1000" rows="4"></textarea><button class="button button-primary" type="submit" data-request-submit>Odeslat návrh</button><p class="form-message request-form-message" data-request-message role="status" aria-live="polite"></p><a class="request-duplicate-link" data-request-duplicate hidden></a></form></section>';
    document.body.append(modal);
    const dialog = modal.querySelector('.request-dialog');
    const form = modal.querySelector('[data-request-form]');
    const message = modal.querySelector('[data-request-message]');
    const duplicateLink = modal.querySelector('[data-request-duplicate]');
    const close = () => {
      modal.hidden = true;
      document.body.classList.remove('modal-open');
    };
    modal.querySelectorAll('[data-request-close]').forEach(button => button.addEventListener('click', close));
    document.querySelectorAll('[data-request-open]').forEach(button => button.addEventListener('click', () => {
      const pageMessage = button.closest('section')?.querySelector('[data-request-page-message]') || document.querySelector('[data-request-page-message]');
      if (!context.user) {
        setMessage(pageMessage, 'Pro vytvoření návrhu se musíte přihlásit.', true);
        context.openAuth();
        return;
      }
      setMessage(pageMessage, '');
      setMessage(message, '');
      duplicateLink.hidden = true;
      modal.hidden = false;
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => dialog.querySelector('input')?.focus());
    }));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.checkValidity()) return form.reportValidity();
      const submit = form.querySelector('[data-request-submit]');
      submit.disabled = true;
      duplicateLink.hidden = true;
      setMessage(message, 'Odesílám návrh…');
      const { data, error } = await context.db.rpc('create_translation_request', {
        requested_game_name: form.elements.game_name.value.trim(),
        requested_game_url: form.elements.game_url.value.trim(),
        requested_note: form.elements.note.value.trim() || null
      });
      submit.disabled = false;
      if (error) return setMessage(message, error.message || 'Návrh se nepodařilo uložit.', true);
      if (data?.created === false) {
        setMessage(message, 'Tato hra už byla navržena. Můžete ji místo toho podpořit.', true);
        duplicateLink.href = `hlasovani.html#request-${data.request_id}`;
        duplicateLink.textContent = `Zobrazit existující návrh: ${data.game_name}`;
        duplicateLink.hidden = false;
        return;
      }
      form.reset();
      setMessage(message, 'Návrh byl úspěšně odeslán.');
      await load();
      window.setTimeout(close, 700);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden) close();
    });
  }

  document.querySelectorAll('[data-request-filter]').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.requestFilter;
    document.querySelectorAll('[data-request-filter]').forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    renderList();
  }));

  ensureForm();
  window.NIORequests = { load };
  load();
})();
