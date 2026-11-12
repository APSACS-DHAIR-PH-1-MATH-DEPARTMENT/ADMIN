/* shell.js — the page frame for every logged-in staff page: top bar + sidebar (drawer on phones,
   always visible on wide screens), built at RUNTIME from one list.
   Adding a tab later = one line in TABS (ready:true when its page exists). Links are RELATIVE. */
(function () {
  var TABS = [
    { id: "dashboard", label: "Home",     icon: "home", href: "dashboard.html", ready: true },
    { id: "classes",   label: "Classes",  icon: "school", href: "classes.html",   ready: true },
    { id: "tests",     label: "Tests",    icon: "target", href: "tests.html",     ready: true },
    { id: "requests",  label: "Requests", icon: "pencil", href: "requests.html", ready: true },
    { id: "overview",  label: "Overview", icon: "trend", href: "overview.html",  ready: true },
    { id: "remarks",   label: "Remarks & copy check", icon: "note", href: "remarks.html", ready: true },
    { id: "content",   label: "Practice & exercises", icon: "bolt", href: "content.html", ready: true },
    { id: "questions", label: "Question bank (old)", icon: "book", href: "questions.html", ready: true },
    { id: "students",  label: "All students", icon: "cap", href: "students.html", ready: true, adminOnly: true },
    { id: "teachers",  label: "Teachers", icon: "users", href: "teachers.html",  ready: true, adminOnly: true },
    { id: "feedback",  label: "Feedback", icon: "chat", href: "feedback.html",  ready: true, adminOnly: true },
    { id: "activity",  label: "Activity", icon: "clipboard", href: "activity.html", ready: true, adminOnly: true }
  ];
  var activeTab = "";
  var profile = null;

  function esc(s) { return UI.esc(s); }
  function isAdmin() { return !!profile && profile.role === "admin"; }

  function navHtml() {
    return TABS.filter(function (t) { return !t.adminOnly || isAdmin(); }).map(function (t) {
      var inner = '<span class="side__icon" aria-hidden="true">' + UI.icon(t.icon) + '</span><span class="side__label">' + esc(t.label) + "</span>";
      if (!t.ready) return '<li><span class="side__item is-soon" aria-disabled="true">' + inner + '<span class="side__tag">Soon</span></span></li>';
      var on = t.id === activeTab;
      return '<li><a class="side__item' + (on ? " is-active" : "") + '" href="' + esc(t.href) + '"' + (on ? ' aria-current="page"' : "") + ">" + inner + "</a></li>";
    }).join("");
  }

  function userHtml() {
    if (!profile) return "";
    var meta = profile.role === "admin" ? "Administrator" : "Teacher · " + (profile.assignments || []).join(", ");
    return '<div class="side__user"><div class="side__uname">' + esc(UI.name(profile.fullName)) + '</div><div class="side__umeta">' + esc(meta) + '</div><div class="side__umeta side__uid">ID ' + esc(profile.teacherId || "") + "</div></div>";
  }

  function open(on) {
    document.body.classList.toggle("side-open", on);
    var btn = document.getElementById("menu-btn");
    if (btn) btn.setAttribute("aria-expanded", on ? "true" : "false");
    var scrim = document.getElementById("scrim");
    if (scrim) scrim.hidden = !on;
  }

  function render() {
    var list = document.getElementById("side-list");
    if (list) list.innerHTML = navHtml();
    var u = document.getElementById("side-user");
    if (u) u.innerHTML = userHtml();
  }

  function mount(activeId) {
    activeTab = activeId;
    profile = Storage.getProfile();
    var cfg = window.APS_CONFIG;

    var top = document.getElementById("app-header");
    if (top) {
      top.innerHTML =
        '<button class="menu-btn" id="menu-btn" type="button" aria-label="Open menu" aria-controls="app-side" aria-expanded="false">' + UI.icon("menu") + '</button>' +
        '<img class="header__logo" src="assets/img/logo-128.webp" width="40" height="40" alt="">' +
        '<div class="topbar__text"><div class="header__title">' + esc(cfg.APP_NAME) + '</div><div class="header__sub">' + esc(cfg.DEPARTMENT) + "</div></div>";
    }
    var side = document.getElementById("app-side");
    if (side) {
      side.innerHTML =
        '<div class="side__brand"><img src="assets/img/logo-128.webp" width="56" height="56" alt=""><div><div class="side__app">' + esc(cfg.APP_NAME) +
        '</div><div class="side__dept">APSACS DHA-I R Phase 1</div></div></div>' +
        '<div id="side-user"></div>' +
        '<nav aria-label="Main"><ul class="side__list" id="side-list"></ul></nav>' +
        '<div class="side__bottom"><button class="side__logout" id="side-logout" type="button">Log out</button></div>';
      document.getElementById("side-logout").addEventListener("click", function () { Auth.logout(); });
    }
    render();
    var scrim = document.getElementById("scrim"), menu = document.getElementById("menu-btn");
    if (menu) menu.addEventListener("click", function () { open(!document.body.classList.contains("side-open")); });
    if (scrim) scrim.addEventListener("click", function () { open(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") open(false); });
  }

  /* Every logged-in page starts here: guard -> frame -> page code. The saved profile is used at once (no waiting for
     the server); a fresh copy is fetched in the background to keep the menu and class list up to date.
     needAdmin = true sends teachers back to Home. The server checks every request again anyway. */
  /* Warn (once per browser session) when the deployed backend is older than this website. Without this the only symptom is
     cryptic red errors on every page. The health call is public and costs one request. */
  var REQUIRED_BUILD = 17;
  function checkBackend(p) {
    try { if (sessionStorage.getItem("aps-staff:build-ok") === "1") return; } catch (e) { /* ignore */ }
    Api.health().then(function (r) {
      if (r && r.build >= REQUIRED_BUILD) { try { sessionStorage.setItem("aps-staff:build-ok", "1"); } catch (e) { /* ignore */ } return; }
      var main = document.querySelector("main"), box = document.createElement("div");
      box.className = "notice notice--bad"; box.setAttribute("role", "alert");
      box.textContent = p && p.role === "admin"
        ? "The backend (Google Apps Script) is older than this website, so some pages will show errors. Fix: open Apps Script, paste ALL the latest .gs files, run setupSystem(), then Deploy > Manage deployments > pencil > Version: New version > Deploy."
        : "The school system is being updated. Some pages may not work for a short while. Please try again later.";
      if (main) main.insertBefore(box, main.firstChild);
    }).catch(function () { /* offline: nothing to say */ });
  }

  function start(activeId, needAdmin, ready) {
    if (!Auth.requireSession()) return;
    mount(activeId);
    function go(p) {
      if (needAdmin && p.role !== "admin") { location.replace("dashboard.html"); return; }
      ready(p); checkBackend(p);
    }
    function refresh() {
      return Api.staff.me().then(function (p) { Storage.setProfile(p); profile = p; render(); return p; });
    }
    var cached = Storage.getProfile();
    if (cached && cached.role) {
      go(cached);
      refresh().catch(function () { /* a dead session is handled by Api.authed (redirects to login) */ });
      return;
    }
    refresh().then(go).catch(function (e) {
      var box = document.getElementById("page-msg");
      if (box) UI.say(box, e.message, "bad");
    });
  }

  window.Shell = { mount: mount, start: start, TABS: TABS };
})();
