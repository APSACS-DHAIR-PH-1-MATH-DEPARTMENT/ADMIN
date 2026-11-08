/* auth.js — staff login, logout, page guard, and input rules that mirror the backend. */
(function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function normalizeEmail(raw) { return String(raw || "").trim().toLowerCase(); }
  function isValidEmail(raw) { return EMAIL_RE.test(normalizeEmail(raw)); }
  // Rules for a NEW password (first time / forgot): the same for everybody, same as the server.
  function pinRuleError(pw) {
    var p = String(pw || "");
    if (p.length < 8 || p.length > 16) return "The password must be 8 to 16 characters long.";
    if (!/^[\x21-\x7E]+$/.test(p)) return "Use only letters, numbers and symbols from the keyboard (no spaces).";
    if (!/[A-Z]/.test(p)) return "The password needs at least one capital letter.";
    if (!/[a-z]/.test(p)) return "The password needs at least one small letter.";
    if (!/[0-9]/.test(p)) return "The password needs at least one number.";
    if (!/[^A-Za-z0-9]/.test(p)) return "The password needs at least one special character, like ! @ # $ %.";
    return null;
  }
  function loginSecretError(pw) {
    var p = String(pw || "");
    return (p.length < 6 || p.length > 16) ? "Please type your password." : null;
  }
  function login(email, pin) {
    return window.Api.staff.login(normalizeEmail(email), pin).then(function (data) {
      if (!data || !data.token) throw new Error("The server did not return a session. Please try again.");
      window.Storage.setPortal("teacher");
      window.Storage.setToken(data.token);
      window.Storage.setProfile(data.profile || null);
      return data;
    });
  }
  function adminLogin(email, password) {
    return window.Api.staff.adminLogin(normalizeEmail(email), password).then(function (data) {
      if (!data || !data.token) throw new Error("The server did not return a session. Please try again.");
      window.Storage.setPortal("admin");
      window.Storage.setToken(data.token);
      window.Storage.setProfile(data.profile || null);
      return data;
    });
  }
  function logout() {
    return window.Api.staff.logout().catch(function () {}).then(function () {
      window.Storage.clearSession();
      window.location.replace(window.Storage.loginPage());
    });
  }
  function requireSession() {
    if (!window.Storage.getToken()) { window.location.replace(window.Storage.loginPage()); return false; }
    return true;
  }
  window.Auth = { normalizeEmail: normalizeEmail, isValidEmail: isValidEmail, pinRuleError: pinRuleError, loginSecretError: loginSecretError, login: login, adminLogin: adminLogin, logout: logout, requireSession: requireSession };
})();
