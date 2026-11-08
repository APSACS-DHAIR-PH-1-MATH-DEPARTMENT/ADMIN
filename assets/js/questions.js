/* questions.js (staff) — what is in the bank, CSV import (administrator), preview with answers. */
(function () {
  var $ = UI.$, h = Kit.h, tex = Kit.tex, clear = Kit.clear;
  var csvText = "", checked = false, me = null, bank = null;

  function row(cells, tag) { var r = h("tr"); cells.forEach(function (c) { r.appendChild(h(tag || "td", "", String(c))); }); return r; }

  function drawBank() {
    var box = clear($("bank")); $("bank-empty").hidden = bank.chapters.length > 0;
    bank.chapters.forEach(function (ch) {
      var d = h("div", "bankchap");
      d.appendChild(h("h3", "", "Class " + ch.classLevel + " · " + ch.chapter));
      d.appendChild(h("p", "small muted", ch.active + " active of " + ch.total + " questions · " + ch.chapterRef));
      var wrap = h("div", "tablewrap"), tb = h("table", "table"), th = h("thead"); th.appendChild(row(["Topic", "Easy", "Medium", "Challenging", "Total", ""], "th")); tb.appendChild(th);
      var body = h("tbody");
      ch.topics.forEach(function (t) {
        var r = row([t.topic, t.easy, t.medium, t.challenging, t.total]);
        var td = h("td"), b = h("button", "linkbtn", "Preview"); b.type = "button"; b.addEventListener("click", function () { preview(ch, t.topic); }); td.appendChild(b); r.appendChild(td); body.appendChild(r);
      });
      tb.appendChild(body); wrap.appendChild(tb); d.appendChild(wrap);
      var all = h("button", "btn btn--small btn--ghost", "Preview all questions of this chapter"); all.type = "button"; all.addEventListener("click", function () { preview(ch, ""); }); d.appendChild(all);
      box.appendChild(d);
    });
  }

  function loadBank() {
    return Api.staff.questionBank().then(function (r) { bank = r; drawBank(); }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  /* ---------- preview with answers ---------- */
  function qCard(q, i) {
    var c = h("article", "ans ans--right");
    var top = h("div", "ans__top");
    top.appendChild(h("span", "ans__n", q.questionId)); top.appendChild(h("span", "chip", q.topic)); top.appendChild(h("span", "chip chip--" + q.difficulty, Kit.DIFF[q.difficulty] || q.difficulty));
    top.appendChild(h("span", "chip", q.type)); if (String(q.active || "yes").toLowerCase() === "no") top.appendChild(h("span", "chip chip--gold", "inactive"));
    c.appendChild(top); c.appendChild(tex("div", "qtext qtext--sm", q.question));
    if (q.type === "mcq") {
      var ul = h("ul", "optlist");
      ["A", "B", "C", "D"].forEach(function (L) {
        var t = q["option" + L]; if (!t) return;
        var li = h("li", L === q.answer ? "optlist__right" : ""); li.appendChild(h("b", "", L + ". ")); li.appendChild(tex("span", "", t));
        var tag = q["err" + L]; if (tag && L !== q.answer) li.appendChild(h("span", "small muted", "  ← " + (Kit.TAG[tag] || tag)));
        if (L === q.answer) li.appendChild(h("span", "small", "  ✓ correct"));
        ul.appendChild(li);
      });
      c.appendChild(ul);
    } else if (q.type === "order") {
      c.appendChild(h("div", "ans__line", "Items: " + String(q.items).split("|").join(" , "))); c.appendChild(h("div", "ans__line ans__line--right", "Correct order: " + String(q.answer).split("|").join(" → ")));
    } else {
      c.appendChild(h("div", "ans__line ans__line--right", "Answer: " + q.answer + (q.acceptedAnswers ? "  (also accepted: " + String(q.acceptedAnswers).split("|").join(", ") + ")" : "")));
    }
    if (q.slips) c.appendChild(h("div", "small muted", "Known slips: " + String(q.slips).split(";").map(function (s) { var p = s.split("~"); return p[0] + " → " + (Kit.TAG[p[1]] || p[1]); }).join(" · ")));
    if (q.explanation) { var ex = h("div", "ans__why"); ex.appendChild(h("b", "", "Why: ")); ex.appendChild(tex("span", "", q.explanation)); c.appendChild(ex); }
    return c;
  }
  function preview(ch, topic) {
    var card = $("prev-card"); card.hidden = false; $("prev-title").textContent = "Class " + ch.classLevel + " · " + ch.chapter + (topic ? " · " + topic : "");
    var list = clear($("prev-list")); list.appendChild(h("p", "muted", "Loading…")); card.scrollIntoView();
    Api.staff.listQuestions(ch.classLevel, ch.chapterRef, topic).then(function (r) {
      clear(list); r.questions.forEach(function (q, i) { list.appendChild(qCard(q, i)); });
      var f = clear($("prev-filters")); var n = r.counts; f.appendChild(h("span", "chip", n.total + " shown")); Object.keys(n.byDifficulty).forEach(function (d) { f.appendChild(h("span", "chip chip--" + d, (Kit.DIFF[d] || d) + " " + n.byDifficulty[d])); });
      if (r.questions.length >= 300) f.appendChild(h("span", "chip chip--gold", "first 300 only"));
    }).catch(function (e) { clear(list); UI.say($("page-msg"), e.message, "bad"); });
  }

  /* ---------- import ---------- */
  function showResult(r) {
    var out = clear($("imp-out"));
    var s = h("div", "impsum");
    s.appendChild(h("p", r.ok ? "impsum__ok" : "impsum__bad", r.ok ? "✓ All good: " + r.rows + " questions (" + r.added + " new, " + r.updated + " updated)." + (r.saved ? " Saved." : " Nothing is saved yet.") : "✗ " + r.errorCount + " problem(s) found. Nothing was saved. Fix the file and check again."));
    r.summary.forEach(function (c) {
      s.appendChild(h("p", "small", "Class " + c.classLevel + " · " + c.chapter + " — " + c.total + " questions"));
      var ul = h("ul", "small"); Object.keys(c.topics).forEach(function (t) { var x = c.topics[t]; ul.appendChild(h("li", "", t + ": " + x.total + " (easy " + x.easy + ", medium " + x.medium + ", challenging " + x.challenging + ")")); }); s.appendChild(ul);
    });
    if (r.errors.length) {
      var ul2 = h("ul", "impsum__errs"); r.errors.forEach(function (e) { ul2.appendChild(h("li", "", "Line " + e.line + (e.questionId ? " (" + e.questionId + ")" : "") + ": " + e.message)); });
      s.appendChild(ul2); if (r.errorCount > r.errors.length) s.appendChild(h("p", "small muted", "…and " + (r.errorCount - r.errors.length) + " more."));
    }
    out.appendChild(s);
  }
  function setupImport() {
    $("imp-card").hidden = false;
    var file = $("imp-file"), check = $("imp-check"), save = $("imp-save"), msg = $("imp-msg");
    file.addEventListener("change", function () {
      UI.clear(msg); clear($("imp-out")); save.hidden = true; checked = false; csvText = ""; check.disabled = true;
      var f = file.files && file.files[0]; if (!f) return;
      if (f.size > 700000) { UI.say(msg, "That file is too large (limit about 700 KB). Split it into smaller files.", "bad"); return; }
      var rd = new FileReader(); rd.onload = function () { csvText = String(rd.result || "").replace(/^﻿/, ""); check.disabled = !csvText.trim(); }; rd.onerror = function () { UI.say(msg, "Could not read the file.", "bad"); }; rd.readAsText(f, "utf-8");
    });
    check.addEventListener("click", function () {
      UI.clear(msg); UI.busy(check, true, "Checking…"); save.hidden = true;
      Api.staff.importQuestions(csvText, false).then(function (r) { UI.busy(check, false); showResult(r); checked = r.ok; save.hidden = !r.ok; if (r.ok) save.textContent = "Save " + r.rows + " questions"; })
        .catch(function (e) { UI.busy(check, false); UI.say(msg, e.message, "bad"); });
    });
    save.addEventListener("click", function () {
      if (!checked) return; UI.busy(save, true, "Saving…");
      Api.staff.importQuestions(csvText, true).then(function (r) { UI.busy(save, false); showResult(r); save.hidden = true; checked = false; UI.say(msg, r.saved ? "Saved. The bank below is updated." : "Not saved.", r.saved ? "ok" : "bad"); loadBank(); })
        .catch(function (e) { UI.busy(save, false); UI.say(msg, e.message, "bad"); });
    });
  }

  Shell.start("questions", false, function (profile) {
    me = profile;
    if (profile.role === "admin") setupImport(); else $("q-sub").textContent = "The questions for your classes. Only the administrator can import new ones.";
    loadBank();
  });
})();
