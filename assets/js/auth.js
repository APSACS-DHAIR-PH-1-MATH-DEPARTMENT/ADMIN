/* auth.js — staff login, logout, page guard, and input rules that mirror the backend. */
(function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function normalizeEmail(raw) { return String(raw || "").trim().toLowerCase(); }
  function isValidEmail(raw) { return EMAIL_RE.test(normalizeEmail(raw)); }
  function pinRuleError(pin) {
    var p = String(pin || "");
    if (!/^\d{6}$/.test(p)) return "The PIN must be exactly 6 digits.";
    if (/^(\d)\1{5}$/.test(p)) return "The PIN cannot be one digit repeated (like 111111).";
    return null;
  }
  function login(email, pin) {
    return window.Api.staff.login(normalizeEmail(email), pin).then(function (data) {
      if (!data || !data.token) throw new Error("The server did not return a session. Please try again.");
      window.Storage.setToken(data.token);
      window.Storage.setProfile(data.profile || null);
      return data;
    });
  }
  function logout() {
    return window.Api.staff.logout().catch(function () {}).then(function () {
      window.Storage.clearSession();
      window.location.replace("login.html");
    });
  }
  function requireSession() {
    if (!window.Storage.getToken()) { window.location.replace("login.html"); return false; }
    return true;
  }
  window.Auth = { normalizeEmail: normalizeEmail, isValidEmail: isValidEmail, pinRuleError: pinRuleError, login: login, logout: logout, requireSession: requireSession };
})();
