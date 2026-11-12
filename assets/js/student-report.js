/* student-report.js (staff) — the full report of ONE student: tests (latest attempt counts), topics, mistake patterns, advice,
   copy checks, remarks, issues, requests. Pick a date range, then "Download PDF" (the browser's print window, Save as PDF;
   menus and buttons are hidden by the print styles). All server text is shown as text. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var id = decodeURIComponent((location.search.match(/[?&]id=([^&]+)/) || [])[1] || ""), data = null;
  var STATUS = { checked: "Copy checked", incomplete: "Copy incomplete", absent: "Absent", not_received: "Copy not received", other: "Other" };
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function fmtDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? Number(m[3]) + " " + MON[Number(m[2]) - 1] + " " + m[1] : (d || ""); }
  function section(title) { var c = h("section", "card"); c.appendChild(h("h2", "", title)); return c; }
  function kv(label, value) { var r = h("div", "kvrow"); r.appendChild(h("span", "muted", label)); r.appendChild(h("b", "", value)); return r; }

  function draw() {
    var r = data, box = clear($("report")), st = r.student;
    var head = h("div", "card");
    var pr = h("div", "print-only"); pr.appendChild(h("p", "small muted", "APSACS DHA-I R Phase 1 · Mathematics Department — Math Leaders")); head.appendChild(pr);
    head.appendChild(h("h2", "", UI.name(st.studentName)));
    head.appendChild(h("p", "muted", "Class " + st.classLevel + st.section + " · Father: " + UI.name(st.fatherName) + " · " + st.studentId));
    head.appendChild(h("p", "small muted", "Period: " + (r.period.from || r.period.to ? (r.period.from ? fmtDate(r.period.from) : "the beginning") + " to " + (r.period.to ? fmtDate(r.period.to) : "today") : "everything so far") + " · made " + fmtDate(r.generatedAt)));
    box.appendChild(head);

    var sm = r.summary, c1 = section("Summary");
    var tiles = h("div", "tiles");
    [[sm.averagePct === null ? "—" : sm.averagePct + "%", "Average"], [String(sm.testsTaken), "Tests"], [sm.bestPct === null ? "—" : sm.bestPct + "%", "Best"]].forEach(function (x) { var t = h("div", "tile"); t.appendChild(h("div", "tile__n", x[0])); t.appendChild(h("div", "tile__l", x[1])); tiles.appendChild(t); });
    c1.appendChild(tiles);
    if (sm.needsSupport) { var n = h("div", "notice notice--bad"); n.appendChild(h("b", "", "Needs support. ")); n.appendChild(document.createTextNode((sm.supportReasons || []).join(" "))); c1.appendChild(n); }
    if (sm.attempts > sm.testsTaken) c1.appendChild(h("p", "small muted", "The average counts the latest attempt of each test (" + sm.attempts + " attempts in total)."));
    if (sm.pendingMarks) c1.appendChild(h("p", "small", sm.pendingMarks + " written answer" + (sm.pendingMarks === 1 ? " is" : "s are") + " still waiting for marking."));
    box.appendChild(c1);

    var c2 = section("Tests");
    if (!r.tests.length) c2.appendChild(h("p", "muted", "No test taken in this period."));
    else {
      var wrap = h("div", "tablewrap"), tb = h("table", "table"), th = h("thead"), tr = h("tr");
      ["Test", "Chapter", "Date", "Marks", "Score"].forEach(function (x) { tr.appendChild(h("th", "", x)); }); th.appendChild(tr); tb.appendChild(th);
      var body = h("tbody");
      r.tests.forEach(function (t) {
        var row = h("tr"); row.appendChild(h("td", "", t.title + (t.latest ? "" : " (earlier attempt)"))); row.appendChild(h("td", "", t.chapter)); row.appendChild(h("td", "", fmtDate(t.submittedAt)));
        row.appendChild(h("td", "", t.marksObtained + " / " + t.marksTotal)); row.appendChild(h("td", "", t.scorePct + "%" + (t.pendingCount ? " (+" + t.pendingCount + " unmarked)" : "") + (t.originalScorePct !== null ? " · was " + t.originalScorePct + "%" : ""))); body.appendChild(row);
      });
      tb.appendChild(body); wrap.appendChild(tb); c2.appendChild(wrap);
    }
    box.appendChild(c2);

    if (r.topics.length) {
      var c3 = section("Topics (weakest first)");
      r.topics.forEach(function (t) { c3.appendChild(Kit.bar(t.topic, t.correct + " / " + t.total + " · " + t.pct + "%", t.pct)); });
      box.appendChild(c3);
    }
    if (r.mistakeTags.length) {
      var c4 = section("Most common mistakes"); var ul = h("ul", "advice");
      r.mistakeTags.forEach(function (t) { ul.appendChild(h("li", "", t.label + " — " + t.count + " time" + (t.count === 1 ? "" : "s"))); }); c4.appendChild(ul); box.appendChild(c4);
    }
    if (r.advice.length) {
      var c5 = section("What to do next"); var ul2 = h("ul", "advice");
      r.advice.forEach(function (a) { var li = h("li"); li.appendChild(h("b", "", a.title + ". ")); li.appendChild(document.createTextNode(a.text)); ul2.appendChild(li); }); c5.appendChild(ul2); box.appendChild(c5);
    }

    var c6 = section("Copy checks and remarks");
    var cp = r.copy; c6.appendChild(h("p", "small", "Copy checks: " + cp.checked + " checked · " + cp.incomplete + " incomplete · " + cp.absent + " absent · " + cp.not_received + " not received"));
    var onlyShared = $("rp-share").checked, rem = r.remarks.filter(function (x) { return !onlyShared || x.showToStudent || x.tellParent; });
    if (!rem.length) c6.appendChild(h("p", "muted", "No remarks in this period."));
    rem.forEach(function (x) {
      var d = h("div", "kvrow"), left = h("div");
      left.appendChild(h("b", "", fmtDate(x.noteDate) + " · " + (x.kind === "copy" ? (STATUS[x.status] || "Copy check") : "Remark")));
      if (x.text) left.appendChild(h("div", "small ans__written", x.text));
      left.appendChild(h("div", "small muted", "by " + UI.name(x.byTeacherName) + (x.tellParent ? " · for the parent" : "") + (x.showToStudent ? "" : " · teachers only")));
      d.appendChild(left); c6.appendChild(d);
    });
    box.appendChild(c6);

    var c7 = section("Disciplinary issues");
    if (!r.issues.length) c7.appendChild(h("p", "muted", "None in this period."));
    r.issues.forEach(function (i) { c7.appendChild(kv(fmtDate(i.occurredAt) + " · " + i.title + " (" + i.category + ", " + i.severity + ")", i.status)); });
    box.appendChild(c7);

    var c8 = section("Help and recheck requests");
    if (!r.requests.length) c8.appendChild(h("p", "muted", "None in this period."));
    r.requests.forEach(function (q) { c8.appendChild(kv(fmtDate(q.createdAt) + " · " + (q.type === "recheck" ? "Recheck: " + (q.testTitle || "test") : "Help on " + q.targetId), q.status)); });
    box.appendChild(c8);
    $("report").hidden = false; $("rp-print").disabled = false;
  }

  function load() {
    UI.clear($("page-msg")); $("loading").hidden = false; $("report").hidden = true; $("rp-print").disabled = true;
    Api.staff.studentReport(id, $("rp-from").value, $("rp-to").value).then(function (r) {
      $("loading").hidden = true; data = r; draw(); document.title = UI.name(r.student.studentName) + " — report";
      $("back-link").href = "overview.html?c=" + r.student.classLevel + "&s=" + encodeURIComponent(r.student.section || ""); $("back-link").textContent = "← Class " + r.student.classLevel + r.student.section + " overview";
    }).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("overview", false, function () {
    if (!/^WHA-STU-\d{7}$/.test(id)) { location.replace("overview.html"); return; }
    $("rp-go").addEventListener("click", load);
    $("rp-share").addEventListener("change", function () { if (data) draw(); });
    $("rp-print").addEventListener("click", function () { window.print(); });
    load();
  });
})();
