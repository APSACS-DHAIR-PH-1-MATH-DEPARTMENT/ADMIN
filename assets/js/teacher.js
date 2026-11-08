/* teacher.js — Teacher portal: Log in (email + password) | First time | Forgot password.
   First time and Forgot password are the same two steps: A) email + new password twice, B) the 6-digit code emailed to that address.
   The password is held only in memory between A and B. It is never saved. */
(function () {
  var $ = UI.$;
  var mode = "login";
  var cooldownTimer = null;
  var COOLDOWN_SECONDS = 60;
  var held = { email: "", pin: "" };

  var params = location.search;
  var wantedMode = (params.match(/[?&]mode=(setpin|resetpin)/) || [])[1];
  var emailFromLink = "";
  try { emailFromLink = decodeURIComponent((params.match(/[?&]email=([^&]+)/) || [])[1] || ""); } catch (e) { emailFromLink = ""; }

  Storage.setPortal("teacher");
  if (!wantedMode && Storage.getToken()) { location.replace("dashboard.html"); return; }

  UI.wirePinToggles(document);
  ["p-code"].forEach(function (id) { UI.digitsOnly($(id)); });

  if (/[?&]expired=1/.test(params)) UI.say($("page-msg"), "Your session ended. Please log in again.", "info");
  if (/[?&]inactive=1/.test(params)) UI.say($("page-msg"), "This account is not active. Please contact the administrator.", "bad");

  function showStepA() {
    $("step-pin").hidden = false; $("step-code").hidden = true;
    clearInterval(cooldownTimer); $("p-send").disabled = false; $("p-send").textContent = "Continue — email me a code";
    $("p-code").value = "";
  }

  function setMode(next) {
    mode = next;
    ["login", "setpin", "resetpin"].forEach(function (m) { $("tab-" + m).setAttribute("aria-selected", String(m === mode)); });
    $("panel-login").hidden = mode !== "login";
    $("panel-pin").hidden = mode === "login";
    UI.clear($("login-msg")); UI.clear($("pin-msg")); UI.clear($("page-msg"));
    if (mode === "setpin") {
      $("pin-title").textContent = "Set your password";
      $("pin-intro").textContent = "Choose your own password. Then we email a 6-digit code to you to confirm it.";
    } else if (mode === "resetpin") {
      $("pin-title").textContent = "Forgot your password?";
      $("pin-intro").textContent = "No problem. Choose a new password. Then we email a 6-digit code to you to confirm it.";
    }
    if (mode !== "login") showStepA();
    var first = mode === "login" ? $("l-email") : ($("p-email").value ? $("p-pin") : $("p-email"));
    if (first) first.focus();
  }
  ["login", "setpin", "resetpin"].forEach(function (m) { $("tab-" + m).addEventListener("click", function () { setMode(m); }); });

  if (emailFromLink) { $("p-email").value = emailFromLink; $("l-email").value = emailFromLink; }
  if (wantedMode) setMode(wantedMode);

  $("login-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var email = $("l-email").value, pin = $("l-pin").value, msg = $("login-msg");
    UI.clear(msg);
    if (!Auth.isValidEmail(email)) return UI.say(msg, "Please type your email address.", "bad");
    var rule = Auth.loginSecretError(pin);
    if (rule) return UI.say(msg, rule, "bad");
    UI.busy($("l-btn"), true, "Logging in…");
    Auth.login(email, pin)
      .then(function () { location.replace("dashboard.html"); })
      .catch(function (e) { UI.busy($("l-btn"), false); UI.say(msg, e.message, "bad"); $("l-pin").value = ""; });
  });

  function startCooldown() {
    var left = COOLDOWN_SECONDS, again = $("p-resend");
    again.disabled = true;
    clearInterval(cooldownTimer);
    function tick() {
      if (left <= 0) { clearInterval(cooldownTimer); again.disabled = false; again.textContent = "Send the code again"; return; }
      again.textContent = "Send again in " + left + "s";
      left--;
    }
    tick(); cooldownTimer = setInterval(tick, 1000);
  }

  function requestCode(fromStepA) {
    var msg = $("pin-msg");
    UI.clear(msg);
    if (fromStepA) {
      var email = $("p-email").value, pin = $("p-pin").value, pin2 = $("p-pin2").value;
      if (!Auth.isValidEmail(email)) return UI.say(msg, "Please type your email address.", "bad");
      var rule = Auth.pinRuleError(pin);
      if (rule) return UI.say(msg, rule, "bad");
      if (pin !== pin2) return UI.say(msg, "The two passwords are not the same. Please type them again.", "bad");
      held.email = Auth.normalizeEmail(email); held.pin = pin;
    }
    var btn = fromStepA ? $("p-send") : $("p-resend");
    UI.busy(btn, true, "Sending…");
    Api.staff.requestOtp(held.email).then(function (data) {
      UI.busy(btn, false);
      $("step-pin").hidden = true; $("step-code").hidden = false;
      UI.say($("code-note"), (data && data.message) || "If this email belongs to a staff account, a code has been sent.", "info");
      startCooldown();
      $("p-code").focus();
    }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  }
  $("p-send").addEventListener("click", function () { requestCode(true); });
  $("p-resend").addEventListener("click", function () { requestCode(false); });
  $("p-back").addEventListener("click", function () { held.pin = ""; UI.clear($("pin-msg")); showStepA(); $("p-pin").value = ""; $("p-pin2").value = ""; $("p-pin").focus(); });

  $("p-save").addEventListener("click", function () {
    var msg = $("pin-msg"), code = $("p-code").value;
    UI.clear(msg);
    if (!/^\d{6}$/.test(code)) return UI.say(msg, "The code from the email is 6 digits.", "bad");
    if (!held.email || !held.pin) { showStepA(); return UI.say(msg, "Please type the email and password again.", "bad"); }
    var btn = $("p-save");
    UI.busy(btn, true, "Saving…");
    Api.staff.setPin(held.email, code, held.pin).then(function () {
      UI.busy(btn, false);
      clearInterval(cooldownTimer);
      var email = held.email;
      held.pin = ""; $("p-pin").value = ""; $("p-pin2").value = ""; $("p-code").value = "";
      setMode("login");
      $("l-email").value = email;
      UI.say($("login-msg"), "Your password is saved. Now log in with your email and password.", "ok");
      $("l-pin").focus();
    }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  });
})();
