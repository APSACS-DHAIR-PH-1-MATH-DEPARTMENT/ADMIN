/* weekly.js (staff) — the weekly reports of one class + section for one Friday: score, label, trend, when it was read and the parent's comment.
   The server decides which students this staff member may see. All server text is shown as text. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var me = null, timer = null, data = null, filter = "all", qs = location.search;
  var qClass = parseInt((qs.match(/[?&]c=(\d+)/) || [])[1] || "0", 10), qSec = decodeURIComponent((qs.match(/[?&]s=([A-Za-z0-9]+)/) || [])[1] || "").toUpperCase();

  function cycleText(c) {
    var m = /^(\d{4})(\d{2})(\d{2})$/.exec(c || "");
    return m ? DT.dateOnly(m[1] + "-" + m[2] + "-" + m[3] + "T12:00:00Z") : c;
  }

  function row(s) {
    var r = s.report, art = h("article", "rowcard wkrow");
    var main = h("div", "wkrow__main");
    main.appendChild(h("div", "rowcard__name", UI.name(s.studentName)));
    main.appendChild(h("span", "small muted", "Class " + s.classLevel + s.section));
    if (r) {
      var lab = ReportView.labelOf(r);
      main.appendChild(h("span", "score score--small score--" + lab[1], Math.round(r.performancePct) + "%"));
      main.appendChild(h("span", "status " + lab[0], r.label));
    } else main.appendChild(h("span", "pill pill--none", "No report"));
    art.appendChild(main);
    var meta = h("div", "rowcard__meta");
    if (r) {
      meta.appendChild(h("span", "", ReportView.trendText(r)));
      meta.appendChild(h("span", "pill " + (r.read ? "pill--ok" : "pill--wait"), r.read ? "Read " + DT.format(r.read.readAt) : "Not read"));
      if (r.sent) meta.appendChild(h("span", "pill pill--ok", "WhatsApp sent"));
    }
    if (s.unreadStreak >= 3) meta.appendChild(h("span", "pill pill--bad", s.unreadStreak + " reports in a row not read"));
    art.appendChild(meta);
    if (r && r.read && r.read.comment) art.appendChild(h("p", "ans__written", "Parent's comment: " + r.read.comment));
    var acts = h("div", "actions");
    var a = h("a", "btn btn--small", "Open reports"); a.href = "weekly-student.html?id=" + encodeURIComponent(s.studentId) + "&c=" + s.classLevel + "&s=" + encodeURIComponent(s.section); acts.appendChild(a);
    art.appendChild(acts);
    return art;
  }

  function matches(s) {
    var q = $("wk-q").value.trim().toLowerCase();
    if (q && (s.studentName + " " + s.studentId).toLowerCase().indexOf(q) === -1) return false;
    if (filter === "unread") return !!s.report && !s.report.read;
    if (filter === "streak") return s.unreadStreak >= 3;
    if (filter === "noreport") return !s.report;
    return true;
  }

  function draw() {
    if (!data) return;
    var list = data.rows.filter(matches), box = clear($("wk-list"));
    list.forEach(function (s) { box.appendChild(row(s)); });
    $("wk-empty").hidden = list.length > 0;
  }

  function load() {
    var f = { cycle: $("wk-cycle").value }, k = $("wk-class").value, cls = 0, sec = "";
    if (k) { var m = /^(\d+)(.*)$/.exec(k); cls = parseInt(m[1], 10); sec = m[2] || ""; }
    $("loading").hidden = false; UI.clear($("page-msg"));
    Api.staff.reportsList(cls, sec, f.cycle).then(function (r) {
      $("loading").hidden = true;
      data = r;
      var sel = $("wk-cycle"), keep = r.cycleId;
      clear(sel);
      r.cycles.forEach(function (c) { var o = h("option", "", "Friday " + cycleText(c)); o.value = c; sel.appendChild(o); });
      if (!r.cycles.length) { var none = h("option", "", "No report yet"); none.value = ""; sel.appendChild(none); }
      sel.value = keep;
      $("wk-n-students").textContent = r.counts.students; $("wk-n-read").textContent = r.counts.read;
      $("wk-n-unread").textContent = r.counts.unread; $("wk-n-none").textContent = r.counts.noReport;
      $("wk-tiles").hidden = false;
      draw();
    }).catch(function (e) {
      $("loading").hidden = true;
      UI.say($("page-msg"), /was not found/.test(e.message || "") ? "Weekly reports are not switched on yet. The backend must be updated first." : e.message, "bad");
    });
  }

  Shell.start("weekly", false, function (profile) {
    me = profile;
    var sel = $("wk-class"), o = h("option", "", "All my classes"); o.value = ""; sel.appendChild(o);
    (me.assignments || []).forEach(function (k) { var x = h("option", "", "Class " + k); x.value = k; sel.appendChild(x); });
    if (qClass && qSec) sel.value = qClass + qSec;
    sel.addEventListener("change", function () { $("wk-cycle").value = ""; load(); });
    $("wk-cycle").addEventListener("change", load);
    $("wk-q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(draw, 200); });
    Array.prototype.forEach.call(document.querySelectorAll("#wk-filters .chip--btn"), function (b) {
      b.addEventListener("click", function () {
        filter = b.getAttribute("data-f");
        Array.prototype.forEach.call(document.querySelectorAll("#wk-filters .chip--btn"), function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        draw();
      });
    });
    load();
  });
})();
