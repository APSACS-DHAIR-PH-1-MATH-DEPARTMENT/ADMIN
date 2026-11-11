/* test-questions.js (staff) — build 10. The questions of ONE test made from CSV / typed questions: read them with their answers and
   correct a mistake. Optionally re-mark the answers students already gave. The kind of question cannot change. */
(function () {
  var $ = UI.$, h = Kit.h, tex = Kit.tex, clear = Kit.clear;
  var id = decodeURIComponent((location.search.match(/[?&]id=([A-Za-z0-9-]+)/) || [])[1] || "");
  var data = null, tagList = [], tagGroups = [];
  var TYPE_NAME = { mcq: "Multiple choice", tf: "True / false", fill: "Fill in", order: "Put in order" };

  function flash(text, kind) { UI.say($("q-flash"), text, kind || "ok"); $("q-flash").scrollIntoView(); }
  function field(label, el) { var w = h("div"); w.appendChild(h("label", "", label)); w.appendChild(el); return w; }
  function select(list) { var s = h("select", "input"); list.forEach(function (o) { var x = h("option", "", o[1]); x.value = o[0]; s.appendChild(x); }); return s; }
  function area(v, max) { var t = h("textarea", "input input--area"); t.maxLength = max || 900; t.value = v || ""; return t; }
  function shuffle(a) { var b = a.slice(), k = 0, same = true; while (same && k++ < 20) { for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = b[i]; b[i] = b[j]; b[j] = t; } same = b.join("|") === a.join("|"); } return b; }

  function show(q, i) {
    var c = h("article", "ans ans--right"), top = h("div", "ans__top");
    top.appendChild(h("span", "ans__n", "Q" + (i + 1))); top.appendChild(h("span", "small muted", q.questionId)); top.appendChild(h("span", "chip", TYPE_NAME[q.type] || q.type));
    top.appendChild(h("span", "chip chip--" + q.difficulty, Kit.DIFF[q.difficulty] || q.difficulty)); if (q.topic) top.appendChild(h("span", "chip", q.topic));
    c.appendChild(top); c.appendChild(tex("div", "qtext qtext--sm", q.question));
    if (q.type === "mcq") {
      var ul = h("ul", "optlist");
      ["A", "B", "C", "D"].forEach(function (L) {
        var t = q["option" + L]; if (!t) return; var li = h("li", L === q.answer ? "optlist__right" : ""); li.appendChild(h("b", "", L + ". ")); li.appendChild(tex("span", "", t));
        var tag = q["err" + L]; if (tag && L !== q.answer) li.appendChild(h("span", "small muted", "  ← " + (Kit.TAG[tag] || tag))); if (L === q.answer) li.appendChild(h("span", "small", "  ✓ correct"));
        ul.appendChild(li);
      });
      c.appendChild(ul);
    } else if (q.type === "order") {
      c.appendChild(h("div", "ans__line ans__line--right", "Correct order: " + String(q.answer).split("|").join(" → ")));
    } else c.appendChild(h("div", "ans__line ans__line--right", "Answer: " + q.answer + (q.acceptedAnswers ? "  (also accepted: " + String(q.acceptedAnswers).split("|").join(", ") + ")" : "")));
    if (q.slips) c.appendChild(h("div", "small muted", "Known slips: " + q.slips));
    if (q.explanation) { var ex = h("div", "ans__why"); ex.appendChild(h("b", "", "Why: ")); ex.appendChild(tex("span", "", q.explanation)); c.appendChild(ex); }
    if (data.editable && data.assessment.canManage) {
      var slot = h("div"), eb = h("button", "btn btn--small btn--ghost", "Edit this question"); eb.type = "button";
      eb.addEventListener("click", function () { if (slot.firstChild) { clear(slot); return; } slot.appendChild(form(q, function () { clear(slot); })); });
      var acts = h("div", "actions"); acts.appendChild(eb); c.appendChild(acts); c.appendChild(slot);
    }
    return c;
  }

  function form(q, close) {
    var f = h("div", "editform"), get = {};
    var diff = select([["easy", "Easy"], ["medium", "Medium"], ["challenging", "Challenging"]]); diff.value = q.difficulty;
    var topic = h("input", "input"); topic.maxLength = 60; topic.value = q.topic || "";
    var g = h("div", "formgrid"); g.appendChild(field("Difficulty", diff)); g.appendChild(field("Topic", topic)); f.appendChild(g);
    var qt = area(q.question); f.appendChild(field("Question", qt));
    var tagState = { tags: tagList, groups: tagGroups }, clsN = data.assessment.classLevel;
    var radios = {}, optIn = {}, optTag = {};
    if (q.type === "mcq") {
      var mc = h("div"); mc.appendChild(h("div", "label", "Options — tick the correct one"));
      ["A", "B", "C", "D"].forEach(function (L) {
        var row = h("div", "optrow"), r = h("input"); r.type = "radio"; r.name = "c-" + q.questionId; r.checked = q.answer === L; r.setAttribute("aria-label", "Option " + L + " is correct"); radios[L] = r;
        var t = h("input", "input"); t.maxLength = 200; t.value = q["option" + L] || ""; t.placeholder = "Option " + L; optIn[L] = t; var s = PromptKit.tagSelect(tagState, clsN); s.value = q["err" + L] || ""; optTag[L] = s;
        row.appendChild(r); row.appendChild(t); row.appendChild(s); mc.appendChild(row);
      });
      f.appendChild(mc);
    } else if (q.type === "tf") { get.tf = select([["true", "True"], ["false", "False"]]); get.tf.value = q.answer; f.appendChild(field("Correct answer", get.tf)); }
    else if (q.type === "fill") {
      get.fa = h("input", "input"); get.fa.maxLength = 200; get.fa.value = q.answer; get.fx = h("input", "input"); get.fx.maxLength = 300; get.fx.value = q.acceptedAnswers || "";
      get.fs = h("input", "input"); get.fs.maxLength = 400; get.fs.value = q.slips || ""; get.fs.placeholder = "e.g. 4.00~CARRY;5.1~PLACE";
      f.appendChild(field("Correct answer", get.fa)); f.appendChild(field("Other accepted answers (separate with |)", get.fx)); f.appendChild(field("Common wrong answers with tag (optional)", get.fs));
    } else {
      get.oi = area(String(q.answer).split("|").join("\n"), 500); f.appendChild(field("Items in the CORRECT order, one per line", get.oi));
    }
    var ex = area(q.explanation, 600); f.appendChild(field("Explanation", ex));
    var rm = null;
    if (data.attempts > 0) {
      var l = h("label", "check"), cb = h("input"); cb.type = "checkbox"; cb.checked = true; rm = cb; l.appendChild(cb);
      l.appendChild(h("span", "", "Re-mark the " + data.attempts + " attempt" + (data.attempts === 1 ? "" : "s") + " already made, so scores and reports follow this correction")); f.appendChild(l);
    }
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true; f.appendChild(msg);
    var acts = h("div", "actions"), save = h("button", "btn btn--small", "Save"), cancel = h("button", "btn btn--small btn--ghost", "Cancel"); save.type = "button"; cancel.type = "button"; acts.appendChild(save); acts.appendChild(cancel); f.appendChild(acts);
    cancel.addEventListener("click", close);
    save.addEventListener("click", function () {
      UI.clear(msg);
      var p = { difficulty: diff.value, topic: topic.value.trim(), question: qt.value.trim(), explanation: ex.value.trim() };
      if (q.type === "mcq") {
        var ans = "A"; ["A", "B", "C", "D"].forEach(function (L) { if (radios[L].checked) ans = L; });
        p.answer = ans; ["A", "B", "C", "D"].forEach(function (L) { p["option" + L] = optIn[L].value.trim(); p["err" + L] = (L !== ans && optIn[L].value.trim()) ? optTag[L].value : ""; });
      } else if (q.type === "tf") p.answer = get.tf.value;
      else if (q.type === "fill") { p.answer = get.fa.value.trim(); p.acceptedAnswers = get.fx.value.trim(); p.slips = get.fs.value.trim(); }
      else { var lines = get.oi.value.split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean), joined = lines.join("|"); if (joined !== q.answer) { p.answer = joined; p.items = shuffle(lines).join("|"); } }
      if (rm) p.remark = rm.checked;
      UI.busy(save, true, "Saving…");
      Api.staff.updateTestQuestion(id, q.questionId, p).then(function (r) {
        UI.busy(save, false);
        flash(r.changed ? "Saved." + (r.remarked ? " " + r.remarked + " attempt" + (r.remarked === 1 ? "" : "s") + " re-marked." : "") : "Nothing was changed.", "ok");
        if (r.changed) load();
      }).catch(function (e) { UI.busy(save, false); UI.say(msg, e.message, "bad"); });
    });
    return f;
  }

  function draw() {
    var a = data.assessment;
    $("q-title").textContent = a.title;
    $("q-sub").textContent = "Class " + a.classLevel + a.sections.join(", " + a.classLevel) + " · " + a.chapter + " · " + data.questions.length + " questions";
    $("q-note").textContent = !data.editable ? (a.status === "archived" ? "This test is in the archive. Restore it to edit." : "Questions of tests made from the question bank are changed in the question bank.")
      : (data.attempts ? data.attempts + " attempt(s) already made. If you correct an answer, tick “Re-mark” so those students' scores follow the correction. Every change is recorded." : "Nobody has taken this test yet, so you can change anything freely.");
    var box = clear($("q-list")); data.questions.forEach(function (q, i) { box.appendChild(show(q, i)); });
  }
  function load() {
    return Api.staff.testQuestions(id).then(function (r) { data = r; draw(); $("loading").hidden = true; $("q-wrap").hidden = false; }).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("tests", false, function () {
    if (!id) { $("loading").hidden = true; UI.say($("page-msg"), "No test chosen. Go back to the list of tests.", "bad"); return; }
    Api.staff.assessmentOptions().then(function (o) { tagList = o.tags || []; tagGroups = o.tagGroups || []; }).catch(function () {}).then(load);
  });
})();
