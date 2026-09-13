const profileDb = window.NIO_SUPABASE_CLIENT;
const profileContent = document.querySelector('[data-profile-content]');
const authRequired = document.querySelector('[data-profile-auth-required]');
const profileForm = document.querySelector('[data-profile-form]');
const passwordForm = document.querySelector('[data-password-form]');
const avatarInput = document.querySelector('[data-avatar-input]');
const bioInput = document.querySelector('[data-profile-bio]');
const cropModal = document.querySelector('[data-crop-modal]');
const cropDialog = cropModal?.querySelector('.avatar-crop-dialog');
const cropStage = cropModal?.querySelector('[data-crop-stage]');
const cropCanvas = cropModal?.querySelector('[data-crop-canvas]');
const cropZoomInput = cropModal?.querySelector('[data-crop-zoom]');
const cropZoomValue = cropModal?.querySelector('[data-crop-zoom-value]');
const cropConfirm = cropModal?.querySelector('[data-crop-confirm]');
let profileUser = null;
let loadedProfile = null;
let pendingAvatarFile = null;
let pendingAvatarPreviewUrl = null;
let profileLoadRequest = 0;
let cropImage = null;
let cropSourceFile = null;
let cropZoom = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let cropPointerId = null;
let cropPointerX = 0;
let cropPointerY = 0;
let cropReturnFocus = null;

const profileMessage = (selector, text, error = false) => {
  const node = document.querySelector(selector);
  if (!node) return;
  node.textContent = text;
  node.classList.toggle('error', error);
};
const profileName = profile => profile?.display_name?.trim() || profileUser?.user_metadata?.display_name?.trim() || profileUser?.email?.split('@')[0] || 'Hráč';
const profileInitial = name => Array.from(name.trim())[0]?.toLocaleUpperCase('cs-CZ') || 'N';
const validAvatarUrl = value => {
  if (!value) return '';
  try { const url = new URL(value, window.location.href); return ['http:', 'https:', 'blob:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
};
const renderAvatar = (wrapperSelector, imageSelector, initialSelector, name, source) => {
  const wrapper = document.querySelector(wrapperSelector);
  const image = document.querySelector(imageSelector);
  const initial = document.querySelector(initialSelector);
  if (!wrapper || !image || !initial) return;
  const url = validAvatarUrl(source);
  initial.textContent = profileInitial(name);
  initial.hidden = Boolean(url);
  image.hidden = !url;
  if (url) image.src = url;
  else image.removeAttribute('src');
  image.onerror = () => { image.hidden = true; initial.hidden = false; };
};
const renderProfile = profile => {
  const name = profileName(profile);
  document.querySelector('[data-profile-name]').value = name;
  document.querySelector('[data-profile-email]').value = profileUser?.email || '';
  bioInput.value = profile?.bio || '';
  document.querySelector('[data-bio-count]').textContent = String(bioInput.value.length);
  document.querySelector('[data-sidebar-name]').textContent = name;
  document.querySelector('[data-sidebar-email]').textContent = profileUser?.email || '';
  renderAvatar('[data-avatar-preview]', '[data-avatar-image]', '[data-avatar-initial]', name, profile?.avatar_url);
  renderAvatar('[data-sidebar-avatar]', '[data-sidebar-image]', '[data-sidebar-initial]', name, profile?.avatar_url);
};
const loadProfilePage = async user => {
  const requestId = ++profileLoadRequest;
  profileUser = user;
  authRequired.hidden = Boolean(user);
  profileContent.hidden = !user;
  if (!user || !profileDb) return;
  let { data, error } = await profileDb.from('profiles').select('id,display_name,bio,avatar_url,avatar_path,created_at,selected_badge_id').eq('id', user.id).maybeSingle();
  if (error) {
    const fallback = await profileDb.from('profiles').select('id,display_name,bio,avatar_url,avatar_path').eq('id', user.id).maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }
  if (requestId !== profileLoadRequest) return;
  if (error) {
    loadedProfile = null;
    renderProfile(null);
    profileMessage('[data-profile-message]', 'Profilová databáze zatím není připravená. Spusťte soubor SUPABASE-USER-PROFILES.sql v Supabase.', true);
    return;
  }
  loadedProfile = data;
  renderProfile(data);
};

const activateAccountTab = () => {
  const hash = window.location.hash.replace('#', '');
  const sections = ['prehled', 'sledovane-hry', 'oblibene-hry', 'upozorneni', 'odznaky', 'aktivita', 'komentare', 'hlasovani', 'profil', 'zabezpeceni', 'administrace'];
  const adminAvailable = !document.querySelector('[data-admin-nav]')?.hidden;
  const active = sections.includes(hash) && (hash !== 'administrace' || adminAvailable) ? hash : 'prehled';
  document.querySelectorAll('[data-account-tab]').forEach(link => link.classList.toggle('active', link.dataset.accountTab === active));
  document.querySelectorAll('[data-account-section]').forEach(section => {
    section.hidden = section.dataset.accountSection !== active;
  });
  const overview = document.querySelector('[data-user-overview]');
  if (overview) overview.hidden = active !== 'prehled';
};
window.addEventListener('hashchange', activateAccountTab);
activateAccountTab();

bioInput?.addEventListener('input', () => { document.querySelector('[data-bio-count]').textContent = String(bioInput.value.length); });

const clampCropOffsets = () => {
  if (!cropImage || !cropCanvas) return;
  const baseScale = Math.max(cropCanvas.width / cropImage.naturalWidth, cropCanvas.height / cropImage.naturalHeight);
  const renderedWidth = cropImage.naturalWidth * baseScale * cropZoom;
  const renderedHeight = cropImage.naturalHeight * baseScale * cropZoom;
  const limitX = Math.max(0, (renderedWidth - cropCanvas.width) / 2);
  const limitY = Math.max(0, (renderedHeight - cropCanvas.height) / 2);
  cropOffsetX = Math.max(-limitX, Math.min(limitX, cropOffsetX));
  cropOffsetY = Math.max(-limitY, Math.min(limitY, cropOffsetY));
};
const drawCrop = () => {
  if (!cropImage || !cropCanvas) return;
  clampCropOffsets();
  const context = cropCanvas.getContext('2d');
  const baseScale = Math.max(cropCanvas.width / cropImage.naturalWidth, cropCanvas.height / cropImage.naturalHeight);
  const scale = baseScale * cropZoom;
  const width = cropImage.naturalWidth * scale;
  const height = cropImage.naturalHeight * scale;
  context.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(cropImage, (cropCanvas.width - width) / 2 + cropOffsetX, (cropCanvas.height - height) / 2 + cropOffsetY, width, height);
};
const loadCropImage = file => new Promise((resolve, reject) => {
  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => { URL.revokeObjectURL(sourceUrl); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(sourceUrl); reject(new Error('Obrázek se nepodařilo načíst.')); };
  image.src = sourceUrl;
});
const closeCropEditor = () => {
  if (!cropModal || cropModal.hidden) return;
  cropModal.hidden = true;
  cropStage?.classList.remove('is-dragging');
  cropPointerId = null;
  cropImage = null;
  cropSourceFile = null;
  avatarInput.value = '';
  if (!document.querySelector('.auth-modal:not([hidden])')) document.body.classList.remove('modal-open');
  cropReturnFocus?.focus();
};
const openCropEditor = async file => {
  if (!cropModal || !cropCanvas) throw new Error('Editor výřezu není dostupný.');
  cropImage = await loadCropImage(file);
  cropSourceFile = file;
  cropZoom = 1;
  cropOffsetX = 0;
  cropOffsetY = 0;
  cropZoomInput.value = '1';
  cropZoomValue.textContent = '100 %';
  drawCrop();
  cropReturnFocus = document.querySelector('label[for="profile-avatar"]');
  cropModal.hidden = false;
  document.body.classList.add('modal-open');
  cropDialog?.focus();
};

cropZoomInput?.addEventListener('input', () => {
  cropZoom = Number(cropZoomInput.value);
  cropZoomValue.textContent = `${Math.round(cropZoom * 100)} %`;
  drawCrop();
});
cropStage?.addEventListener('pointerdown', event => {
  if (!cropImage || cropPointerId !== null) return;
  event.preventDefault();
  cropPointerId = event.pointerId;
  cropPointerX = event.clientX;
  cropPointerY = event.clientY;
  cropStage.setPointerCapture(event.pointerId);
  cropStage.classList.add('is-dragging');
});
cropStage?.addEventListener('pointermove', event => {
  if (event.pointerId !== cropPointerId || !cropCanvas) return;
  event.preventDefault();
  const displayScale = cropCanvas.width / cropStage.getBoundingClientRect().width;
  cropOffsetX += (event.clientX - cropPointerX) * displayScale;
  cropOffsetY += (event.clientY - cropPointerY) * displayScale;
  cropPointerX = event.clientX;
  cropPointerY = event.clientY;
  drawCrop();
});
const finishCropDrag = event => {
  if (event.pointerId !== cropPointerId) return;
  if (cropStage.hasPointerCapture(event.pointerId)) cropStage.releasePointerCapture(event.pointerId);
  cropPointerId = null;
  cropStage.classList.remove('is-dragging');
};
cropStage?.addEventListener('pointerup', finishCropDrag);
cropStage?.addEventListener('pointercancel', finishCropDrag);
cropModal?.querySelectorAll('[data-crop-cancel]').forEach(button => button.addEventListener('click', closeCropEditor));
cropModal?.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeCropEditor();
});
cropConfirm?.addEventListener('click', () => {
  if (!cropCanvas || !cropSourceFile) return;
  cropConfirm.disabled = true;
  cropConfirm.textContent = 'Připravuji…';
  cropCanvas.toBlob(blob => {
    cropConfirm.disabled = false;
    cropConfirm.textContent = 'Použít výřez';
    if (!blob) return profileMessage('[data-profile-message]', 'Výřez se nepodařilo připravit.', true);
    if (blob.size > 2 * 1024 * 1024) return profileMessage('[data-profile-message]', 'Výsledný obrázek je větší než povolené 2 MB.', true);
    pendingAvatarFile = new File([blob], 'avatar-cropped.webp', { type: 'image/webp', lastModified: Date.now() });
    if (pendingAvatarPreviewUrl) URL.revokeObjectURL(pendingAvatarPreviewUrl);
    pendingAvatarPreviewUrl = URL.createObjectURL(pendingAvatarFile);
    renderAvatar('[data-avatar-preview]', '[data-avatar-image]', '[data-avatar-initial]', document.querySelector('[data-profile-name]').value || 'Hráč', pendingAvatarPreviewUrl);
    closeCropEditor();
    profileMessage('[data-profile-message]', 'Výřez je připravený. Potvrďte ho tlačítkem Uložit změny.');
  }, 'image/webp', 0.9);
});

avatarInput?.addEventListener('change', async () => {
  const file = avatarInput.files?.[0];
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    avatarInput.value = '';
    return profileMessage('[data-profile-message]', 'Vyberte obrázek ve formátu PNG, JPG nebo WebP.', true);
  }
  if (file.size > 2 * 1024 * 1024) {
    avatarInput.value = '';
    return profileMessage('[data-profile-message]', 'Obrázek je větší než povolené 2 MB.', true);
  }
  try {
    await openCropEditor(file);
  } catch (error) {
    avatarInput.value = '';
    profileMessage('[data-profile-message]', error?.message || 'Obrázek se nepodařilo otevřít.', true);
  }
});

profileForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!profileDb || !profileUser) return;
  const submit = document.querySelector('[data-profile-submit]');
  const displayName = document.querySelector('[data-profile-name]').value.trim();
  const bio = bioInput.value.trim();
  if (displayName.length < 2) return profileMessage('[data-profile-message]', 'Zobrazované jméno musí mít alespoň 2 znaky.', true);
  submit.disabled = true;
  submit.textContent = 'Ukládám…';
  profileMessage('[data-profile-message]', 'Ukládám změny…');
  let avatarPath = loadedProfile?.avatar_path || null;
  let avatarUrl = loadedProfile?.avatar_url || null;
  let uploadedPath = null;
  try {
    if (pendingAvatarFile) {
      const extension = pendingAvatarFile.type === 'image/png' ? 'png' : pendingAvatarFile.type === 'image/webp' ? 'webp' : 'jpg';
      uploadedPath = `${profileUser.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await profileDb.storage.from('avatars').upload(uploadedPath, pendingAvatarFile, { cacheControl: '3600', upsert: false, contentType: pendingAvatarFile.type });
      if (uploadError) throw uploadError;
      avatarPath = uploadedPath;
      avatarUrl = profileDb.storage.from('avatars').getPublicUrl(uploadedPath).data.publicUrl;
    }
    const profileChanges = { display_name: displayName, bio: bio || null, avatar_url: avatarUrl, avatar_path: avatarPath };
    let { data, error } = await profileDb.from('profiles').update(profileChanges).eq('id', profileUser.id).select('id,display_name,bio,avatar_url,avatar_path').maybeSingle();
    if (!error && !data) {
      const inserted = await profileDb.from('profiles').insert({ id: profileUser.id, ...profileChanges }).select('id,display_name,bio,avatar_url,avatar_path').single();
      data = inserted.data;
      error = inserted.error;
    }
    if (error) throw error;
    const oldAvatarPath = loadedProfile?.avatar_path;
    loadedProfile = data;
    pendingAvatarFile = null;
    if (pendingAvatarPreviewUrl) URL.revokeObjectURL(pendingAvatarPreviewUrl);
    pendingAvatarPreviewUrl = null;
    avatarInput.value = '';
    renderProfile(data);
    document.dispatchEvent(new CustomEvent('nio:profile-updated', { detail: { userId: profileUser.id, profile: data } }));
    profileMessage('[data-profile-message]', 'Profil byl úspěšně uložen.');
    if (oldAvatarPath && oldAvatarPath !== avatarPath && oldAvatarPath.startsWith(`${profileUser.id}/`)) await profileDb.storage.from('avatars').remove([oldAvatarPath]);
  } catch (error) {
    if (uploadedPath) await profileDb.storage.from('avatars').remove([uploadedPath]);
    profileMessage('[data-profile-message]', error?.message || 'Profil se nepodařilo uložit.', true);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Uložit změny';
  }
});

passwordForm?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!profileDb || !profileUser) return;
  const password = document.querySelector('[data-new-password]').value;
  const confirmation = document.querySelector('[data-confirm-password]').value;
  if (password.length < 8) return profileMessage('[data-password-message]', 'Nové heslo musí mít alespoň 8 znaků.', true);
  if (password !== confirmation) return profileMessage('[data-password-message]', 'Zadaná hesla se neshodují.', true);
  const submit = document.querySelector('[data-password-submit]');
  submit.disabled = true;
  submit.textContent = 'Měním…';
  profileMessage('[data-password-message]', 'Aktualizuji heslo…');
  const { error } = await profileDb.auth.updateUser({ password });
  submit.disabled = false;
  submit.textContent = 'Změnit heslo';
  if (error) return profileMessage('[data-password-message]', error.message, true);
  passwordForm.reset();
  profileMessage('[data-password-message]', 'Heslo bylo úspěšně změněno.');
});

document.querySelector('[data-reset-password]')?.addEventListener('click', async event => {
  if (!profileDb || !profileUser?.email) return;
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Odesílám…';
  const redirectTo = new URL('profil.html#zabezpeceni', window.location.href).href;
  const { error } = await profileDb.auth.resetPasswordForEmail(profileUser.email, { redirectTo });
  button.disabled = false;
  button.textContent = 'Poslat odkaz';
  profileMessage('[data-reset-message]', error ? error.message : 'Odkaz pro reset hesla byl odeslán na váš e-mail.', Boolean(error));
});

if (!profileDb) {
  authRequired.hidden = false;
  profileContent.hidden = true;
  profileMessage('[data-profile-message]', 'Připojení k Supabase není nastavené.', true);
} else {
  profileDb.auth.getSession().then(({ data }) => loadProfilePage(data.session?.user || null));
  profileDb.auth.onAuthStateChange((_event, session) => window.setTimeout(() => loadProfilePage(session?.user || null), 0));
}
