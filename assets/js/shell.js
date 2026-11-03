/* shell.js — the page frame for every logged-in staff page: top bar + sidebar (drawer on phones,
   always visible on wide screens), built at RUNTIME from one list.
   Adding a tab later = one line in TABS (ready:true when its page exists). Links are RELATIVE. */
(function () {
  var TABS = [
    { id: "dashboard", label: "Home",     icon: "🏠", href: "dashboard.html", ready: true },
    { id: "classes",   label: "Classes",  icon: "🏫", href: "classes.html",   ready: true },
    { id: "students",  label: "All students", icon: "🎓", href: "students.html", ready: true, adminOnly: true },
    { id: "teachers",  label: "Teachers", icon: "👩‍🏫", href: "teachers.html",  ready: true, adminOnly: true },
    { id: "feedback",  label: "Feedback", icon: "💬", href: "feedback.html",  ready: true, adminOnly: true },
    { id: "remarks",   label: "Remarks",  icon: "📝", href: "remarks.html",   ready: false }
  ];
  var activeTab = "";
  var profile = null;

  function esc(s) { return UI.esc(s); }
  function isAdmin() { return !!profile && profile.role === "admin"; }

  function navHtml() {
    return TABS.filter(function (t) { return !t.adminOnly || isAdmin(); }).map(function (t) {
      var inner = '<span class="side__icon" aria-hidden="true">' + t.icon + '</span><span class="side__label">' + esc(t.label) + "</span>";
      if (!t.ready) return '<li><span class="side__item is-soon" aria-disabled="true">' + inner + '<span class="side__tag">Soon</span></span></li>';
      var on = t.id === activeTab;
      return '<li><a class="side__item' + (on ? " is-active" : "") + '" href="' + esc(t.href) + '"' + (on ? ' aria-current="page"' : "") + ">" + inner + "</a></li>";
    }).join("");
  }

  function userHtml() {
    if (!profile) return "";
    var meta = profile.role === "admin" ? "Administrator" : "Teacher · " + (profile.assignments || []).join(", ");
    return '<div class="side__user"><div class="side__uname">' + esc(profile.fullName) + '</div><div class="side__umeta">' + esc(meta) + "</div></div>";
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
        '<button class="menu-btn" id="menu-btn" type="button" aria-label="Open menu" aria-controls="app-side" aria-expanded="false">☰</button>' +
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
  function start(activeId, needAdmin, ready) {
    if (!Auth.requireSession()) return;
    mount(activeId);
    function go(p) {
      if (needAdmin && p.role !== "admin") { location.replace("dashboard.html"); return; }
      ready(p);
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
