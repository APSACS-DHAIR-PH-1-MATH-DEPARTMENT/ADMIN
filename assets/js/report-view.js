/* report-view.js — one weekly report as a card, written for STAFF (third person: "took", "answered"), plus the small helpers the
   weekly-report pages share. Needs Kit (kit.js), DT (datetime.js) and UI. Everything from the server goes in as TEXT; bar widths are set
   through the CSSOM (the strict CSP forbids style="" attributes). Nothing here is ever built with innerHTML. */
(function () {
  var h = Kit.h;
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var LABEL = { "Excellent": ["status--active", "excellent"], "Good": ["status--active", "good"], "Needs improvement": ["status--pending", "mid"], "Needs attention": ["status--suspended", "low"] };

  function add(parent) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) parent.appendChild(arguments[i]); return parent; }
  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function clampPct(p) { return Math.max(0, Math.min(100, Math.round(num(p)))); }
  function hasNum(v) { return v !== null && v !== undefined && v !== ""; }
  function section(title) { var s = h("section", "rep__sec"); s.appendChild(h("h3", "rep__h", title)); return s; }
  function labelOf(r) { return LABEL[r.label] || LABEL.Good; }

  function trendText(r) {
    var d = hasNum(r.trendDelta) ? num(r.trendDelta) : 0;
    if (r.trend === "up") return "Up " + plural(d, "point", "points") + " from last week";
    if (r.trend === "down") return "Down " + plural(Math.abs(d), "point", "points") + " from last week";
    if (r.trend === "steady") return "About the same as last week";
    return "First report";
  }

  function dayLabel(date) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || "");
    if (!m) return date || "";
    return DAYS[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()];
  }

  /* https://wa.me/<number without +>?text=<message>. Only a number the server marked valid (waNumber) is used; otherwise "" (no link). */
  function waUrl(waNumber, text) {
    if (!/^\d{10,15}$/.test(String(waNumber || ""))) return "";
    return "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(String(text || ""));
  }

  /* A WhatsApp button that is a real link when there is a valid number, and a greyed-out one (aria-disabled) when there is not. */
  function waButton(waNumber, text, label) {
    var a = h("a", "btn btn--small wa", label || "WhatsApp");
    var url = waUrl(waNumber, text);
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; }
    else { a.setAttribute("aria-disabled", "true"); a.setAttribute("role", "link"); a.title = "No valid WhatsApp number for this parent"; }
    return a;
  }

  /* ---------- the sections of one report ---------- */

  function overall(r, d) {
    var s = section("The week in one number");
    var row = h("div", "rep__score"), lab = labelOf(r);
    add(row, h("div", "score score--" + lab[1], clampPct(r.performancePct) + "%"));
    add(row, add(h("div"), h("div", "status " + lab[0], r.label), h("div", "small muted rep__trend", trendText(r))));
    s.appendChild(row);
    var w = d.weights || {};
    [["Tests", r.testsPct, w.tests, "no test taken this week"], ["Practice accuracy", r.practicePct, w.practice, "no practice questions answered"], ["Participation", r.participationPct, w.participation, "no data"]].forEach(function (p) {
      if (hasNum(p[1])) s.appendChild(Kit.bar(p[0] + " · counts " + Math.round(num(p[2])) + "%", clampPct(p[1]) + "%", clampPct(p[1])));
      else s.appendChild(h("p", "rep__line", p[0] + ": " + p[3] + "."));
    });
    return s;
  }

  function testsSection(d) {
    var t = d.tests || {}, items = t.items || [], s = section("Tests");
    var taken = num(t.taken), avail = num(t.available);
    s.appendChild(h("p", "rep__line", avail === 0 ? "No test was open this week." : "Took " + taken + " of " + plural(avail, "test", "tests") + "." + (hasNum(t.avgPct) ? " Average: " + clampPct(t.avgPct) + "%." : "")));
    items.forEach(function (i) {
      var it = h("div", "rep__item");
      it.appendChild(Kit.bar(i.title || "Test", num(i.marks) + " / " + num(i.total) + " · " + clampPct(i.pct) + "%", clampPct(i.pct)));
      if (i.chapter) it.appendChild(h("div", "small muted", i.chapter));
      if (num(i.pending) > 0) it.appendChild(h("div", "small rep__note", plural(num(i.pending), "written answer was", "written answers were") + " not yet marked at 5:00 PM on Friday, so not counted."));
      s.appendChild(it);
    });
    return s;
  }

  function practiceSection(d) {
    var p = d.practice || {}, s = section("Practice");
    if (!num(p.attempted) && !num(p.solutionsViewed)) { s.appendChild(h("p", "rep__line", "No practice questions this week.")); return s; }
    s.appendChild(h("p", "rep__line", "Answered " + plural(num(p.attempted), "question", "questions") + ", " + num(p.rightFirstTime) + " right at the first try" + (hasNum(p.accuracyPct) ? " (" + clampPct(p.accuracyPct) + "%)" : "") +
      ". Opened " + plural(num(p.solutionsViewed), "solution", "solutions") + ". Practice days: " + num(p.days) + "."));
    (p.chapters || []).forEach(function (c) {
      var a = num(c.attempted), box = h("div", "rep__item");
      if (a) box.appendChild(Kit.bar(c.chapter || c.ref, num(c.rightFirstTime) + " of " + a + " right first time", Math.round(num(c.rightFirstTime) * 100 / a)));
      else box.appendChild(h("p", "rep__line", (c.chapter || c.ref) + ": no question answered"));
      if (num(c.solutionsViewed)) box.appendChild(h("div", "small muted", plural(num(c.solutionsViewed), "solution", "solutions") + " viewed"));
      s.appendChild(box);
    });
    return s;
  }

  function exercisesSection(d) {
    var e = d.exercises || {}, s = section("Exercises");
    if (!num(e.solutionsViewed)) { s.appendChild(h("p", "rep__line", "No exercise solution was opened this week.")); return s; }
    s.appendChild(h("p", "rep__line", "Opened " + plural(num(e.solutionsViewed), "exercise solution", "exercise solutions") + "."));
    var ul = h("ul", "rep__ul");
    (e.chapters || []).forEach(function (c) { ul.appendChild(h("li", "", (c.chapter || c.ref) + " — " + num(c.solutionsViewed))); });
    s.appendChild(ul);
    return s;
  }

  function dailySection(d) {
    var days = d.daily || [], s = section("Days");
    s.appendChild(h("p", "small muted", "Questions answered and solutions viewed on each day (Pakistan time)."));
    var max = 1;
    days.forEach(function (x) { if (num(x.n) > max) max = num(x.n); });
    var box = h("div", "dbars");
    days.forEach(function (x) {
      var col = h("div", "dbars__col"), track = h("div", "dbars__track"), fill = h("div", "dbars__bar");
      fill.style.height = (num(x.n) ? Math.max(6, Math.round(num(x.n) * 100 / max)) : 0) + "%";
      track.appendChild(fill);
      add(col, h("div", "dbars__n", String(num(x.n))), track, h("div", "dbars__lab", dayLabel(x.date)));
      box.appendChild(col);
    });
    s.appendChild(box);
    return s;
  }

  function participationSection(r, d) {
    var p = d.participation || {}, t = d.tests || {}, pr = d.practice || {}, s = section("Participation");
    s.appendChild(Kit.bar("Participation", clampPct(r.participationPct) + "%", clampPct(r.participationPct)));
    s.appendChild(h("p", "rep__line", num(t.available) > 0 ? "Tests: took " + num(t.taken) + " of " + num(t.available) + " (" + clampPct(p.testsPart) + "%)." : "Tests: none were open this week, so they are not counted here."));
    s.appendChild(h("p", "rep__line", "Practice days: " + num(pr.days) + " (" + num(p.daysTarget || 3) + " days in a week is full marks)."));
    return s;
  }

  /* What the parent / child did with the report: read time and the parent's comment, and the "sent" mark. */
  function statusBlock(r) {
    var box = h("div", r.read ? "rep__read" : "rep__unread");
    if (r.read) {
      box.appendChild(h("p", "rep__line", "Read on " + DT.format(r.read.readAt) + "."));
      box.appendChild(h("p", "ans__written", r.read.comment ? "Parent's comment: " + r.read.comment : "No comment from the parent."));
    } else {
      box.appendChild(h("p", "rep__line", "Not read yet."));
    }
    if (r.sent) box.appendChild(h("p", "small", "WhatsApp message marked as sent" + (r.sent.sentByName ? " by " + r.sent.sentByName : "") + " on " + DT.format(r.sent.sentAt) + "."));
    else box.appendChild(h("p", "small", "WhatsApp message not marked as sent."));
    return box;
  }

  /* One report = one card. opts.open = start opened; opts.idx = unique number for the aria-controls id. */
  function card(r, opts) {
    opts = opts || {};
    var d = r.data || {}, lab = labelOf(r);
    var art = h("article", "rowcard acc" + (opts.latest ? " acc--latest" : ""));
    art.setAttribute("data-report", r.reportId);
    var head = h("button", "acc__head"); head.type = "button";
    var bodyId = "rep-body-" + (opts.idx || 0);
    head.setAttribute("aria-controls", bodyId);
    var left = add(h("div", "acc__title"), h("div", "rowcard__name", "Week ending " + DT.dateOnly(r.periodEnd)), h("div", "small muted", trendText(r)));
    var unread = h("span", "status status--pending acc__unread", "Not read yet"); unread.hidden = !!r.read;
    var right = add(h("div", "acc__right"), unread, h("span", "score score--small score--" + lab[1], clampPct(r.performancePct) + "%"), h("span", "status " + lab[0], r.label));
    add(head, left, right);
    var body = h("div", "acc__body"); body.id = bodyId;
    add(body, overall(r, d), testsSection(d), practiceSection(d), exercisesSection(d), dailySection(d), participationSection(r, d), statusBlock(r));
    body.appendChild(h("p", "small muted rep__foot", "System-generated report · made " + DT.format(r.generatedAt) + " · covers " + DT.dateOnly(r.periodStart) + " to " + DT.dateOnly(r.periodEnd) + "."));
    function setOpen(on) { head.setAttribute("aria-expanded", on ? "true" : "false"); body.hidden = !on; art.classList.toggle("is-open", on); }
    head.addEventListener("click", function () { setOpen(body.hidden); });
    setOpen(!!opts.open);
    art.setOpen = setOpen;
    return add(art, head, body);
  }

  window.ReportView = { card: card, waUrl: waUrl, waButton: waButton, trendText: trendText, labelOf: labelOf, LABEL: LABEL, plural: plural };
})();
