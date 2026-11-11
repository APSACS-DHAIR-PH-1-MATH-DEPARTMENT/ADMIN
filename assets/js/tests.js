/* tests.js (staff) — build 10. List of diagnostic tests: results, availability (make unavailable / available again for N minutes,
   hours or days), edit details, questions, and (administrator) archive / restore. The "New test" form lives in test-new.js. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var me = null;
  var STATUS = { draft: ["Draft", "status--pending"], published: ["Available", "status--active"], closed: ["Unavailable", "status--suspended"], archived: ["Archived", "status--archived"] };
  var WINDOW = { upcoming: "Not open yet", open: "Open now", closed: "Closing time passed" };

  function flash(text, kind) { UI.say($("flash"), text, kind || "ok"); window.scrollTo(0, 0); }
  function isAdmin() { return !!me && me.role === "admin"; }
  function field(label, el) { var w = h("div"); w.appendChild(h("label", "", label)); w.appendChild(el); return w; }
  function sel(list) { var s = h("select", "input"); list.forEach(function (o) { var x = h("option", "", o[1]); x.value = o[0]; s.appendChild(x); }); return s; }
  function btn(text, ghost) { var b = h("button", "btn btn--small" + (ghost ? " btn--ghost" : ""), text); b.type = "button"; return b; }

  /* ---------- availability panel ---------- */
  function availabilityPanel(t, done) {
    var p = h("div", "editform");
    p.appendChild(h("p", "small muted", "Students can start a test only while it is available. Results and attempts are never lost."));
    var mode = sel([["now", "Make it available now"], ["schedule", "Open it at a time I choose"]]);
    var opens = h("input", "input"); opens.type = "datetime-local"; opens.value = DT.nowInput();
    var when = field("Opens (Pakistan time)", opens); when.hidden = true;
    mode.addEventListener("change", function () { when.hidden = mode.value !== "schedule"; });
    var dur = h("input", "input"); dur.type = "number"; dur.min = "1"; dur.inputMode = "numeric"; dur.placeholder = "blank = until I close it";
    var unit = sel([["minutes", "minutes"], ["hours", "hours"], ["days", "days"]]); unit.value = "hours";
    var g = h("div", "formgrid"); g.appendChild(field("Stay available for", dur)); g.appendChild(field("Unit", unit));
    p.appendChild(field("When", mode)); p.appendChild(when); p.appendChild(g);
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true; p.appendChild(msg);
    var acts = h("div", "actions"), go = btn("Apply"), off = btn("Make unavailable now", true);
    go.addEventListener("click", function () {
      UI.clear(msg); var f = { mode: mode.value }; if (mode.value === "schedule") f.opensAt = opens.value;
      if (dur.value.trim()) { f.durationValue = parseInt(dur.value, 10); f.durationUnit = unit.value; }
      UI.busy(go, true, "…");
      Api.staff.setAvailability(t.assessmentId, f).then(function () { done("“" + t.title + "” is now " + (mode.value === "schedule" ? "scheduled." : "available" + (dur.value.trim() ? " for " + dur.value + " " + unit.value + "." : " until you close it."))); }).catch(function (e) { UI.busy(go, false); UI.say(msg, e.message, "bad"); });
    });
    off.addEventListener("click", function () {
      UI.busy(off, true, "…");
      Api.staff.setAvailability(t.assessmentId, { mode: "off" }).then(function () { done("“" + t.title + "” is now unavailable. Students cannot start it; results are kept."); }).catch(function (e) { UI.busy(off, false); UI.say(msg, e.message, "bad"); });
    });
    acts.appendChild(go); if (t.status === "published") acts.appendChild(off); p.appendChild(acts); return p;
  }

  /* ---------- edit-details panel ---------- */
  function editPanel(t, done) {
    var p = h("div", "editform");
    var ti = h("input", "input"); ti.maxLength = 80; ti.value = t.title;
    var tm = h("input", "input"); tm.type = "number"; tm.min = "5"; tm.max = "180"; tm.value = String(t.timeLimitMin);
    var at = sel([["1", "1 attempt"], ["2", "2 attempts"], ["3", "3 attempts"]]); at.value = String(t.maxAttempts);
    var vs = sel([["now", "Right after they submit"], ["afterClose", "After the test closes"]]); vs.value = t.resultVisibility;
    p.appendChild(field("Title", ti)); var g = h("div", "formgrid"); g.appendChild(field("Time limit (minutes)", tm)); g.appendChild(field("Attempts allowed", at)); p.appendChild(g); p.appendChild(field("Students see the result", vs));
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true; p.appendChild(msg);
    var go = btn("Save changes"); go.addEventListener("click", function () {
      UI.clear(msg); UI.busy(go, true, "Saving…");
      Api.staff.updateAssessment(t.assessmentId, { title: ti.value.trim(), timeLimitMin: parseInt(tm.value, 10), maxAttempts: parseInt(at.value, 10), resultVisibility: vs.value })
        .then(function () { done("Saved: “" + ti.value.trim() + "”."); }).catch(function (e) { UI.busy(go, false); UI.say(msg, e.message, "bad"); });
    });
    p.appendChild(go); return p;
  }

  /* ---------- one test card ---------- */
  function card(t) {
    var st = STATUS[t.status] || STATUS.draft;
    var c = h("article", "rowcard" + (t.status === "archived" ? " rowcard--archived" : ""));
    var top = h("div", "rowcard__top"), left = h("div");
    left.appendChild(h("div", "rowcard__name", t.title));
    left.appendChild(h("div", "small muted", "Class " + t.classLevel + t.sections.join(", " + t.classLevel) + " · " + t.chapter));
    top.appendChild(left); top.appendChild(h("span", "status " + st[1], st[0])); c.appendChild(top);
    var meta = h("div", "test__facts");
    [t.questionCount + " questions", "⏱ " + t.timeLimitMin + " min", t.maxAttempts + (t.maxAttempts === 1 ? " attempt" : " attempts"), t.resultVisibility === "afterClose" ? "Result after closing" : "Result at once", t.source === "custom" ? "Own questions" : "Question bank"].forEach(function (x) { meta.appendChild(h("span", "chip", x)); });
    c.appendChild(meta);
    c.appendChild(h("p", "small", "Submitted " + t.submitted + " of " + t.students + " students" + (t.started > t.submitted ? " · " + (t.started - t.submitted) + " still working or timed out" : "")));
    var when = [];
    if (t.opensAt) when.push("Opens " + DT.format(t.opensAt)); if (t.closesAt) when.push("Closes " + DT.format(t.closesAt));
    if (t.status === "published" && t.window && WINDOW[t.window]) when.push(WINDOW[t.window]);
    if (when.length) c.appendChild(h("p", "small muted", when.join(" · ")));
    c.appendChild(h("p", "small muted", "Created by " + UI.name(t.createdByName)));

    var actions = h("div", "actions"), slot = h("div");
    function reload(text) { flash(text, "ok"); load(); }
    if (t.status !== "archived") {
      var rep = h("a", "btn btn--small", "Results & diagnosis"); rep.href = "report.html?id=" + encodeURIComponent(t.assessmentId); actions.appendChild(rep);
    }
    if (t.canManage && t.status !== "archived") {
      var panel = null;
      function toggle(kind, make) { return function () { if (panel === kind) { clear(slot); panel = null; return; } clear(slot); slot.appendChild(make()); panel = kind; }; }
      var av = btn(t.status === "published" ? "Availability" : "Make available…", true); av.addEventListener("click", toggle("av", function () { return availabilityPanel(t, reload); })); actions.appendChild(av);
      var ed = btn("Edit details", true); ed.addEventListener("click", toggle("ed", function () { return editPanel(t, reload); })); actions.appendChild(ed);
      if (t.source === "custom") { var qs = h("a", "btn btn--small btn--ghost", "Questions"); qs.href = "test-questions.html?id=" + encodeURIComponent(t.assessmentId); actions.appendChild(qs); }
      if (t.status === "published" && t.started === 0) { var dr = btn("Back to draft", true); dr.addEventListener("click", function () { UI.busy(dr, true, "…"); Api.staff.setAssessmentStatus(t.assessmentId, "draft").then(function () { reload("“" + t.title + "” is back to a draft."); }).catch(function (e) { UI.busy(dr, false); flash(e.message, "bad"); }); }); actions.appendChild(dr); }
    }
    if (isAdmin()) {
      if (t.status === "archived") {
        var rs = btn("Restore", true); rs.addEventListener("click", function () { UI.busy(rs, true, "…"); Api.staff.restoreAssessment(t.assessmentId).then(function () { reload("“" + t.title + "” restored (it is Unavailable until you make it available)."); }).catch(function (e) { UI.busy(rs, false); flash(e.message, "bad"); }); });
        actions.appendChild(rs);
      } else {
        var ar = btn("Archive", true); UI.confirmTap(ar, "Tap again to archive", function () { UI.busy(ar, true, "…"); Api.staff.archiveAssessment(t.assessmentId).then(function () { reload("“" + t.title + "” archived. Students and teachers no longer see it; results are kept. You can restore it."); }).catch(function (e) { UI.busy(ar, false); flash(e.message, "bad"); }); });
        actions.appendChild(ar);
      }
    }
    c.appendChild(actions); c.appendChild(slot); return c;
  }

  function load() {
    return Api.staff.listAssessments().then(function (r) {
      var live = r.assessments.filter(function (t) { return t.status !== "archived"; }), old = r.assessments.filter(function (t) { return t.status === "archived"; });
      var box = clear($("t-list")); live.forEach(function (t) { box.appendChild(card(t)); });
      $("t-empty").hidden = live.length > 0;
      $("t-archive").hidden = !old.length; $("t-archive-sum").textContent = "Archived tests (" + old.length + ")";
      var ab = clear($("t-archive-list")); old.forEach(function (t) { ab.appendChild(card(t)); });
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("tests", false, function (profile) {
    me = profile;
    TestNew.onCreated(function (made, all) { flash(made.length + " test" + (made.length === 1 ? "" : "s") + " created" + (made[0] && made[0].status === "published" ? " — live for students now." : " (saved as draft)."), "ok"); load(); });
    $("new-toggle").addEventListener("click", function () {
      var f = $("new-form"), open = f.hidden; f.hidden = !open; this.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) TestNew.open();
    });
    load();
  });
})();
