/* overview.js (staff) — one card per student of the teacher's classes. All server text is shown as text. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var me = null, timer = null, qs = location.search;
  var qClass = parseInt((qs.match(/[?&]c=(\d+)/) || [])[1] || "0", 10), qSec = decodeURIComponent((qs.match(/[?&]s=([A-Za-z0-9]+)/) || [])[1] || "").toUpperCase();

  function card(s) {
    var c = h("article", "scard" + (s.needsSupport ? " scard--support" : ""));
    var top = h("div", "scard__top"), left = h("div");
    left.appendChild(h("div", "scard__name", UI.name(s.studentName))); left.appendChild(h("div", "small muted", "Class " + s.classLevel + s.section + " · " + s.studentId));
    top.appendChild(left);
    top.appendChild(h("div", s.averagePct === null ? "scard__score scard__score--none" : "scard__score", s.averagePct === null ? "No test yet" : s.averagePct + "%"));
    c.appendChild(top);
    if (s.averagePct !== null) c.appendChild(Kit.bar("Average of " + s.tests + " test" + (s.tests === 1 ? "" : "s"), s.averagePct + "%", s.averagePct));
    var chips = h("div", "chiprow");
    if (s.needsSupport) chips.appendChild(h("span", "chip chip--challenging", "Needs support"));
    if (s.pendingMarks) chips.appendChild(h("span", "chip chip--medium", s.pendingMarks + " answer" + (s.pendingMarks === 1 ? "" : "s") + " to mark"));
    if (s.openIssues) chips.appendChild(h("span", "chip chip--medium", s.openIssues + " open issue" + (s.openIssues === 1 ? "" : "s")));
    if (s.openRequests) chips.appendChild(h("span", "chip", s.openRequests + " open request" + (s.openRequests === 1 ? "" : "s")));
    var cr = s.copyRecent || {};
    if (cr.incomplete) chips.appendChild(h("span", "chip chip--medium", "Copy incomplete ×" + cr.incomplete));
    if (cr.absent) chips.appendChild(h("span", "chip", "Absent ×" + cr.absent));
    if (cr.notReceived) chips.appendChild(h("span", "chip chip--challenging", "Copy not received ×" + cr.notReceived));
    if (chips.childNodes.length) c.appendChild(chips);
    if (s.weakestTopic) c.appendChild(h("p", "small", "Weakest topic: " + s.weakestTopic.topic + " (" + s.weakestTopic.pct + "%)"));
    if (s.lastTest) c.appendChild(h("p", "small muted", "Last test: " + s.lastTest.title + " — " + s.lastTest.scorePct + "%"));
    if (s.lastCopy) c.appendChild(h("p", "small muted", "Last copy check: " + s.lastCopy.date + " — " + s.lastCopy.status.replace("_", " ")));
    var acts = h("div", "actions");
    var a = h("a", "btn btn--small", "Full report"); a.href = "student-report.html?id=" + encodeURIComponent(s.studentId); acts.appendChild(a);
    var b = h("a", "btn btn--small btn--ghost", "Remarks"); b.href = "remarks.html?student=" + encodeURIComponent(s.studentId); acts.appendChild(b);
    var d = h("a", "btn btn--small btn--ghost", "Issues"); d.href = "student.html?id=" + encodeURIComponent(s.studentId); acts.appendChild(d);
    c.appendChild(acts);
    return c;
  }

  function load() {
    var f = { sort: $("ov-sort").value }, k = $("ov-class").value;
    if (k) { var m = /^(\d+)(.*)$/.exec(k); f.classLevel = parseInt(m[1], 10); if (m[2]) f.section = m[2]; }
    var q = $("ov-q").value.trim(); if (q) f.search = q;
    $("loading").hidden = false;
    Api.staff.overviewList(f).then(function (r) {
      $("loading").hidden = true;
      var box = clear($("ov-list")); r.students.forEach(function (s) { box.appendChild(card(s)); });
      $("ov-empty").hidden = r.students.length > 0;
      $("ov-count").textContent = r.total + " student" + (r.total === 1 ? "" : "s") + (r.capped ? " (showing the first " + r.students.length + "; choose a class)" : "");
    }).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("overview", false, function (profile) {
    me = profile;
    var sel = $("ov-class"), o = h("option", "", "All my classes"); o.value = ""; sel.appendChild(o);
    (me.assignments || []).forEach(function (k) { var x = h("option", "", "Class " + k); x.value = k; sel.appendChild(x); });
    if (qClass && qSec) sel.value = qClass + qSec;
    sel.addEventListener("change", load); $("ov-sort").addEventListener("change", load);
    $("ov-q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(load, 300); });
    load();
  });
})();
