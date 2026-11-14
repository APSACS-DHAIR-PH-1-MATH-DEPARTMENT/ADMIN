/* parents.js (staff) — the parents of one class + section: the ready weekly-report message with a one-tap WhatsApp button, the "sent" mark,
   whether the child read the report, and (at the top) the children who have not read their last 3 reports. The parent's number is only ever
   shown to staff of that class and the administrator (the server decides). WhatsApp is opened with a wa.me link; nothing is sent automatically. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var me = null, timer = null, rows = [], alerts = [], filter = "all", qs = location.search;
  var qClass = parseInt((qs.match(/[?&]c=(\d+)/) || [])[1] || "0", 10), qSec = decodeURIComponent((qs.match(/[?&]s=([A-Za-z0-9]+)/) || [])[1] || "").toUpperCase();

  function flash(text, kind) { UI.say($("pa-flash"), text, kind); }

  function phoneText(p) { return p ? p.replace(/^\+92(\d{3})(\d{7})$/, "0$1 $2") : "No number"; }

  function sentPill(sent) {
    return h("span", "pill " + (sent ? "pill--ok" : "pill--wait"), sent ? "Sent" + (sent.sentByName ? " by " + sent.sentByName : "") + " · " + DT.ago(sent.sentAt) : "Not sent yet");
  }

  /* the "Mark as sent" / "Undo" button; kind = "report" | "alert"; done(newSent) tells the caller to redraw */
  function sentButton(reportId, kind, sent, done) {
    var b = h("button", "btn btn--small " + (sent ? "btn--ghost" : ""), sent ? "Undo sent" : "Mark as sent"); b.type = "button";
    b.addEventListener("click", function () {
      UI.busy(b, true, "Saving…");
      Api.staff.markReportSent(reportId, kind, !sent).then(function (r) { done(r.sent); }).catch(function (e) { UI.busy(b, false); flash(e.message, "bad"); });
    });
    return b;
  }

  function numberEditor(s, redraw) {
    var wrap = h("div", "formgrid"); wrap.hidden = true;
    var inp = h("input", "input"); inp.type = "tel"; inp.setAttribute("autocomplete", "off"); inp.setAttribute("aria-label", "New WhatsApp number for " + s.studentName); inp.placeholder = "03001234567";
    var save = h("button", "btn btn--small", "Save number"); save.type = "button";
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true;
    wrap.appendChild(inp); wrap.appendChild(save); wrap.appendChild(msg);
    save.addEventListener("click", function () {
      UI.clear(msg); UI.busy(save, true, "Saving…");
      Api.staff.setParentPhone(s.studentId, inp.value.trim()).then(function () { loadList(); loadAlerts(); flash("Number saved for " + UI.name(s.studentName) + ".", "ok"); })
        .catch(function (e) { UI.busy(save, false); UI.say(msg, e.message, "bad"); });
    });
    return wrap;
  }

  function messageBox(text) {
    var d = h("details", "rep__how"); d.appendChild(h("summary", "", "Show the message"));
    d.appendChild(h("div", "msgbox", text));
    return d;
  }

  function reportLine(r) {
    var line = h("div", "wkrow__main");
    if (!r) { line.appendChild(h("span", "pill pill--none", "No report yet")); return line; }
    var lab = ReportView.labelOf(r);
    line.appendChild(h("span", "small muted", "Week ending " + DT.dateOnly(r.periodEnd)));
    line.appendChild(h("span", "score score--small score--" + lab[1], Math.round(r.performancePct) + "%"));
    line.appendChild(h("span", "status " + lab[0], r.label));
    line.appendChild(h("span", "pill " + (r.read ? "pill--ok" : "pill--wait"), r.read ? "Read " + DT.format(r.read.readAt) : "Not read"));
    return line;
  }

  function parentCard(s) {
    var art = h("article", "rowcard wkrow"), main = h("div", "wkrow__main");
    main.appendChild(h("div", "rowcard__name", UI.name(s.studentName)));
    main.appendChild(h("span", "small muted", "Class " + s.classLevel + s.section));
    if (s.alert) main.appendChild(h("span", "pill pill--bad", s.unreadStreak + " not read in a row"));
    art.appendChild(main);
    var meta = h("div", "rowcard__meta");
    meta.appendChild(h("span", "", "Father: " + UI.name(s.fatherName)));
    meta.appendChild(h("span", "phone", phoneText(s.parentPhone)));
    art.appendChild(meta);
    art.appendChild(reportLine(s.report));
    if (s.report && s.report.read && s.report.read.comment) art.appendChild(h("p", "ans__written", "Parent's comment: " + s.report.read.comment));
    var editor = numberEditor(s);
    var acts = h("div", "actions");
    if (s.report) {
      acts.appendChild(ReportView.waButton(s.waNumber, s.message, "WhatsApp the report"));
      acts.appendChild(sentButton(s.report.reportId, "report", s.sent, function (sent) { s.sent = sent; s.report.sent = sent; redrawOne(s, art); }));
      art.appendChild(h("div", "wkrow__main")).appendChild(sentPill(s.sent));
    }
    var ch = h("button", "btn btn--small btn--ghost", s.parentPhone ? "Change number" : "Add number"); ch.type = "button";
    ch.addEventListener("click", function () { editor.hidden = !editor.hidden; });
    acts.appendChild(ch);
    var link = h("a", "btn btn--small btn--ghost", "Reports"); link.href = "weekly-student.html?id=" + encodeURIComponent(s.studentId) + "&c=" + s.classLevel + "&s=" + encodeURIComponent(s.section); acts.appendChild(link);
    art.appendChild(acts);
    art.appendChild(editor);
    if (s.report && s.message) art.appendChild(messageBox(s.message));
    return art;
  }

  function redrawOne(s, old) { if (old.parentNode) old.parentNode.replaceChild(parentCard(s), old); if (filter !== "all") draw(); }

  function alertCard(a) {
    var art = h("article", "rowcard wkrow"), main = h("div", "wkrow__main");
    main.appendChild(h("div", "rowcard__name", UI.name(a.studentName)));
    main.appendChild(h("span", "small muted", "Class " + a.classLevel + a.section));
    main.appendChild(h("span", "pill pill--bad", a.streak + " reports in a row not read"));
    art.appendChild(main);
    var meta = h("div", "rowcard__meta");
    meta.appendChild(h("span", "", "Father: " + UI.name(a.fatherName)));
    meta.appendChild(h("span", "phone", phoneText(a.parentPhone)));
    art.appendChild(meta);
    art.appendChild(h("div", "wkrow__main")).appendChild(sentPill(a.sent));
    var acts = h("div", "actions");
    acts.appendChild(ReportView.waButton(a.waNumber, a.message, "WhatsApp the parent"));
    acts.appendChild(sentButton(a.reportId, "alert", a.sent, function (sent) { a.sent = sent; art.parentNode.replaceChild(alertCard(a), art); }));
    var link = h("a", "btn btn--small btn--ghost", "Reports"); link.href = "weekly-student.html?id=" + encodeURIComponent(a.studentId) + "&c=" + a.classLevel + "&s=" + encodeURIComponent(a.section); acts.appendChild(link);
    art.appendChild(acts);
    art.appendChild(messageBox(a.message));
    return art;
  }

  function matches(s) {
    var q = $("pa-q").value.trim().toLowerCase();
    if (q && (s.studentName + " " + s.fatherName + " " + s.studentId).toLowerCase().indexOf(q) === -1) return false;
    if (filter === "notsent") return !!s.report && !s.sent;
    if (filter === "unread") return !!s.report && !s.report.read;
    if (filter === "nonumber") return !s.waNumber;
    return true;
  }

  function draw() {
    var list = rows.filter(matches), box = clear($("pa-list"));
    list.forEach(function (s) { box.appendChild(parentCard(s)); });
    $("pa-empty").hidden = list.length > 0;
  }

  function drawAlerts() {
    var box = clear($("al-list"));
    alerts.forEach(function (a) { box.appendChild(alertCard(a)); });
    $("alerts").hidden = alerts.length === 0;
    $("alerts").querySelector("h2").textContent = "Not reading the reports (" + alerts.length + ")";
  }

  function loadList() {
    var k = $("pa-class").value, m = /^(\d+)(.*)$/.exec(k || "");
    if (!m) { $("loading").hidden = true; return Promise.resolve(); }
    return Api.staff.parentsList(parseInt(m[1], 10), m[2] || "").then(function (r) { rows = r.rows; $("loading").hidden = true; draw(); })
      .catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), /was not found/.test(e.message || "") ? "This page needs the latest backend (build 24)." : e.message, "bad"); });
  }

  function loadAlerts() {
    return Api.staff.reportAlerts().then(function (r) { alerts = r.alerts; drawAlerts(); }).catch(function () { /* the list below still works */ });
  }

  Shell.start("parents", false, function (profile) {
    me = profile;
    var sel = $("pa-class");
    (me.assignments || []).forEach(function (k) { var x = h("option", "", "Class " + k); x.value = k; sel.appendChild(x); });
    if (qClass && qSec && (me.assignments || []).indexOf(qClass + qSec) !== -1) sel.value = qClass + qSec;
    sel.addEventListener("change", function () { $("loading").hidden = false; loadList(); });
    $("pa-q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(draw, 200); });
    Array.prototype.forEach.call(document.querySelectorAll("#pa-filters .chip--btn"), function (b) {
      b.addEventListener("click", function () {
        filter = b.getAttribute("data-f");
        Array.prototype.forEach.call(document.querySelectorAll("#pa-filters .chip--btn"), function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        draw();
      });
    });
    loadAlerts(); loadList();
  });
})();
