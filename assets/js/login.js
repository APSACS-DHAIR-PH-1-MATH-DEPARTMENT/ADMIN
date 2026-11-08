/* login.js — Administrator login (email + the administrator password). Teachers use teacher.html. */
(function () {
  var $ = UI.$;
  var params = location.search;
  Storage.setPortal("admin");
  if (Storage.getToken()) { location.replace("dashboard.html"); return; }

  UI.wirePinToggles(document);
  if (/[?&]expired=1/.test(params)) UI.say($("page-msg"), "Your session ended. Please log in again.", "info");
  if (/[?&]inactive=1/.test(params)) UI.say($("page-msg"), "This account is not active. Please contact the administrator.", "bad");

  var savedAdmin = ""; try { savedAdmin = localStorage.getItem("aps-staff:admin-email") || ""; } catch (e) { savedAdmin = ""; }
  if (savedAdmin) $("a-email").value = savedAdmin;
  (savedAdmin ? $("a-pass") : $("a-email")).focus();

  $("admin-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var email = $("a-email").value, pass = $("a-pass").value, msg = $("admin-msg");
    UI.clear(msg);
    if (!Auth.isValidEmail(email)) return UI.say(msg, "Please type your email address.", "bad");
    if (!pass) return UI.say(msg, "Please type the password.", "bad");
    UI.busy($("a-btn"), true, "Logging in…");
    Auth.adminLogin(email, pass)
      .then(function () {
        try { localStorage.setItem("aps-staff:admin-email", Auth.normalizeEmail(email)); } catch (e) { /* ignore */ }
        location.replace("dashboard.html");
      })
      .catch(function (e) { UI.busy($("a-btn"), false); UI.say(msg, e.message, "bad"); $("a-pass").value = ""; });
  });
})();
