/* tests.js (staff) — list of diagnostic tests, create a new one, publish / close. The server checks every rule again. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var opts = null, me = null;
  var STATUS = { draft: ["Draft", "status--pending"], published: ["Published", "status--active"], closed: ["Closed", "status--suspended"] };
  var WINDOW = { upcoming: "Not open yet", open: "Open now", closed: "Closing time passed" };

  function flash(text, kind) { UI.say($("flash"), text, kind || "ok"); window.scrollTo(0, 0); }

  /* ---------- list ---------- */
  function card(t) {
    var st = STATUS[t.status] || STATUS.draft;
    var c = h("article", "rowcard");
    var top = h("div", "rowcard__top"), left = h("div");
    left.appendChild(h("div", "rowcard__name", t.title));
    left.appendChild(h("div", "small muted", "Class " + t.classLevel + t.sections.join(", " + t.classLevel) + " · " + t.chapter));
    top.appendChild(left); top.appendChild(h("span", "status " + st[1], st[0])); c.appendChild(top);
    var meta = h("div", "test__facts");
    [t.questionCount + " questions", "⏱ " + t.timeLimitMin + " min", t.maxAttempts + (t.maxAttempts === 1 ? " attempt" : " attempts"), t.resultVisibility === "afterClose" ? "Result after closing" : "Result at once"].forEach(function (x) { meta.appendChild(h("span", "chip", x)); });
    c.appendChild(meta);
    c.appendChild(h("p", "small", "Submitted " + t.submitted + " of " + t.students + " students" + (t.started > t.submitted ? " · " + (t.started - t.submitted) + " still working or timed out" : "")));
    var when = [];
    if (t.opensAt) when.push("Opens " + DT.format(t.opensAt)); if (t.closesAt) when.push("Closes " + DT.format(t.closesAt));
    if (t.status === "published" && t.window && WINDOW[t.window]) when.push(WINDOW[t.window]);
    if (when.length) c.appendChild(h("p", "small muted", when.join(" · ")));
    c.appendChild(h("p", "small muted", "Created by " + t.createdByName));
    var actions = h("div", "actions");
    var rep = h("a", "btn btn--small", "Results & diagnosis"); rep.href = "report.html?id=" + encodeURIComponent(t.assessmentId); actions.appendChild(rep);
    if (t.canManage) {
      [["published", "Publish", t.status !== "published" && t.status !== "closed"], ["closed", "Close test", t.status === "published"], ["published", "Re-open", t.status === "closed"], ["draft", "Back to draft", t.status === "published" && t.started === 0]].forEach(function (a) {
        if (!a[2]) return;
        var b = h("button", "btn btn--small btn--ghost", a[1]); b.type = "button";
        b.addEventListener("click", function () {
          UI.busy(b, true, "…");
          Api.staff.setAssessmentStatus(t.assessmentId, a[0]).then(function () { flash("Done: “" + t.title + "” is now " + a[0] + ".", "ok"); load(); }).catch(function (e) { UI.busy(b, false); flash(e.message, "bad"); });
        });
        actions.appendChild(b);
      });
    }
    c.appendChild(actions); return c;
  }

  function load() {
    return Api.staff.listAssessments().then(function (r) {
      var box = clear($("t-list")); r.assessments.forEach(function (t) { box.appendChild(card(t)); });
      $("t-empty").hidden = r.assessments.length > 0;
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  /* ---------- new-test form ---------- */
  function classesOf() { var seen = {}, out = []; opts.assignments.forEach(function (k) { var c = parseInt(k, 10); if (!seen[c]) { seen[c] = 1; out.push(c); } }); return out.sort(function (a, b) { return a - b; }); }
  function chaptersFor(cls) { return opts.chapters.filter(function (c) { return c.classLevel === cls; }); }
  function checkbox(name, value, label, checked, extra) {
    var l = h("label", "check check--inline"), i = h("input"); i.type = "checkbox"; i.value = value; i.name = name; i.checked = !!checked;
    l.appendChild(i); l.appendChild(h("span", "", label)); if (extra) i.addEventListener("change", extra); return l;
  }
  function ticked(name) { return Array.prototype.map.call(document.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; }); }

  function fillClass() {
    var cls = parseInt($("n-class").value, 10);
    var secs = clear($("n-sections")); opts.assignments.filter(function (k) { return parseInt(k, 10) === cls; }).forEach(function (k) { var s = k.replace(/^\d+/, ""); secs.appendChild(checkbox("sec", s, cls + s, true)); });
    var sel = clear($("n-chapter")); var chs = chaptersFor(cls);
    if (!chs.length) sel.appendChild(h("option", "", "No questions for this class yet")); chs.forEach(function (c) { var o = h("option", "", c.chapter + " (" + c.active + " questions)"); o.value = c.chapterRef; sel.appendChild(o); });
    fillTopics();
  }
  function fillTopics() {
    var cls = parseInt($("n-class").value, 10), ref = $("n-chapter").value;
    var ch = chaptersFor(cls).filter(function (c) { return c.chapterRef === ref; })[0];
    var box = clear($("n-topics")); if (!ch) { total(); return; }
    ch.topics.forEach(function (t) { var cb = checkbox("topic", t.topic, t.topic + " (" + t.active + ")", true, total); cb.firstChild.setAttribute("data-active", String(t.active)); box.appendChild(cb); });
    total();
  }
  function total() {
    var per = parseInt($("n-per").value, 10) || 0, el = $("n-total"), lim = opts.limits;
    var boxes = document.querySelectorAll('input[name="topic"]:checked'), all = 0, n = boxes.length;
    Array.prototype.forEach.call(boxes, function (b) { all += Math.min(per, parseInt(b.getAttribute("data-active"), 10) || 0); });   // a topic cannot give more questions than it has
    el.textContent = n + " topic(s), up to " + per + " each = " + all + " questions. " + (all > lim.maxQuestions ? "That is more than " + lim.maxQuestions + ". Reduce it." : "If you leave the time empty it will be " + Math.max(lim.timeMin, Math.min(lim.timeMax, all)) + " minutes (one minute per question).");
    el.className = "hint" + (all > lim.maxQuestions ? " hint--bad" : "");
  }

  function submit(ev) {
    ev.preventDefault();
    var msg = $("n-msg"), btn = $("n-save"); UI.clear(msg);
    var p = {
      title: $("n-title").value.trim(), classLevel: parseInt($("n-class").value, 10), chapterRef: $("n-chapter").value, sections: ticked("sec"), topics: ticked("topic"),
      perTopic: parseInt($("n-per").value, 10), maxAttempts: parseInt($("n-attempts").value, 10), resultVisibility: $("n-vis").value,
      opensAt: $("n-opens").value, closesAt: $("n-closes").value, publish: $("n-publish").checked
    };
    if ($("n-time").value.trim()) p.timeLimitMin = parseInt($("n-time").value, 10);
    if (!p.title) { UI.say(msg, "Please type a title.", "bad"); return; }
    if (!p.topics.length) { UI.say(msg, "Tick at least one topic.", "bad"); return; }
    UI.busy(btn, true, "Creating…");
    Api.staff.createAssessment(p).then(function (r) {
      UI.busy(btn, false); var a = r.assessment;
      $("new-form").hidden = true; $("new-toggle").setAttribute("aria-expanded", "false"); $("n-title").value = "";
      flash("“" + a.title + "” created: " + a.questionCount + " questions, " + a.timeLimitMin + " minutes, " + (a.status === "published" ? "published" : "saved as a draft") + ".", "ok"); load();
    }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  }

  Shell.start("tests", false, function (profile) {
    me = profile;
    $("new-toggle").addEventListener("click", function () {
      var f = $("new-form"), open = f.hidden; f.hidden = !open; this.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && !opts) {
        Api.staff.assessmentOptions().then(function (o) {
          opts = o; var sel = $("n-class"); classesOf().forEach(function (c) { var x = h("option", "", "Class " + c); x.value = String(c); sel.appendChild(x); });
          sel.addEventListener("change", fillClass); $("n-chapter").addEventListener("change", fillTopics); $("n-per").addEventListener("input", total);
          $("n-per").max = String(o.limits.perTopicMax); $("n-time").min = String(o.limits.timeMin); $("n-time").max = String(o.limits.timeMax);
          fillClass();
        }).catch(function (e) { UI.say($("n-msg"), e.message, "bad"); });
      }
    });
    $("new-form").addEventListener("submit", submit);
    load();
  });
})();
