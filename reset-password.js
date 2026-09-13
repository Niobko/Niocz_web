const resetSettings = window.NIO_CONFIG || {};
const resetHashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const resetSearchParams = new URLSearchParams(window.location.search);
const hasRecoveryLink = resetHashParams.get('type') === 'recovery' || resetSearchParams.has('code');
const resetConfigured = resetSettings.supabaseUrl?.startsWith('https://') && !resetSettings.supabaseAnonKey?.startsWith('DOPLNTE_');
const resetDb = resetConfigured && window.supabase
  ? window.supabase.createClient(resetSettings.supabaseUrl, resetSettings.supabaseAnonKey)
  : null;

const resetForm = document.querySelector('[data-reset-password-form]');
const resetIntro = document.querySelector('[data-reset-intro]');
const resetMessage = document.querySelector('[data-reset-message]');
const resetSubmit = document.querySelector('[data-reset-submit]');
const resetLogin = document.querySelector('[data-reset-login]');
const newPassword = document.querySelector('[data-new-password]');
const confirmPassword = document.querySelector('[data-confirm-password]');
const minimumPasswordLength = 8;
let recoveryReady = false;

const showResetMessage = (message, error = false) => {
  resetMessage.textContent = message;
  resetMessage.classList.toggle('error', error);
};

const enablePasswordReset = () => {
  if (recoveryReady) return;
  recoveryReady = true;
  resetIntro.textContent = 'Zvolte nové heslo pro svůj účet.';
  resetForm.hidden = false;
  showResetMessage('');
  newPassword.focus();
};

const rejectPasswordReset = message => {
  if (recoveryReady) return;
  resetIntro.textContent = 'Odkaz pro obnovení hesla není platný nebo už vypršel.';
  showResetMessage(message || 'Požádejte prosím o nový odkaz v přihlašovacím okně.', true);
  resetLogin.hidden = false;
};

if (!resetDb) {
  rejectPasswordReset('Obnovení hesla teď není dostupné. Zkuste to prosím později.');
} else {
  const { data: authListener } = resetDb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session) enablePasswordReset();
  });

  resetDb.auth.getSession().then(({ data, error }) => {
    if (error) return rejectPasswordReset();
    if (data.session && hasRecoveryLink) enablePasswordReset();
    else window.setTimeout(() => rejectPasswordReset(), 900);
  });

  window.addEventListener('pagehide', () => authListener.subscription.unsubscribe(), { once: true });
}

resetForm?.addEventListener('submit', async event => {
  event.preventDefault();
  showResetMessage('');
  const password = newPassword.value;
  const confirmation = confirmPassword.value;

  if (password.length < minimumPasswordLength) {
    return showResetMessage(`Nové heslo musí mít alespoň ${minimumPasswordLength} znaků.`, true);
  }
  if (password !== confirmation) {
    return showResetMessage('Zadaná hesla se neshodují.', true);
  }
  if (!resetDb || !recoveryReady) return rejectPasswordReset();

  resetSubmit.disabled = true;
  resetSubmit.textContent = 'Ukládám…';
  const { error } = await resetDb.auth.updateUser({ password });
  if (error) {
    resetSubmit.disabled = false;
    resetSubmit.textContent = 'Uložit nové heslo';
    return showResetMessage('Heslo se nepodařilo změnit. Odkaz mohl vypršet; vyžádejte si prosím nový.', true);
  }

  await resetDb.auth.signOut({ scope: 'local' });
  resetForm.hidden = true;
  resetIntro.textContent = 'Heslo bylo bezpečně změněno.';
  showResetMessage('Nyní se můžete přihlásit novým heslem.');
  resetLogin.hidden = false;
});
