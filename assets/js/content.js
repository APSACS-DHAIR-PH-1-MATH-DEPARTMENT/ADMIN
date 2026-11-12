/* content.js (staff) — Practice & exercises: import CSV (check, then save), copy-ready AI prompt, browse what is added,
   set a YouTube video on an exercise question, archive / restore (administrator).
   All server text is shown as text (Kit.tex for maths). The server re-checks everything; the CSV text is only sent, never kept. */
(function () {
  var $ = UI.$, h = Kit.h, tex = Kit.tex, clear = Kit.clear;
  var me = null, kind = "practice", checkedText = "", lastOk = false, MAX_FILE = 700000;
  var KINDS = { practice: "Practice questions", exercises: "Exercises & worksheets" };

  function flash(text, k) { UI.say($("flash"), text, k || "ok"); window.scrollTo(0, 0); }
  function classes() { var seen = {}, out = []; (me.assignments || []).forEach(function (k) { var c = parseInt(k, 10); if (c && !seen[c]) { seen[c] = 1; out.push(c); } }); return out.sort(function (a, b) { return a - b; }); }
  function fillClass(sel, keep) {
    var cur = keep ? sel.value : ""; clear(sel);
    classes().forEach(function (c) { var o = h("option", "", "Class " + c); o.value = String(c); sel.appendChild(o); });
    if (cur) sel.value = cur;
  }

  /* ---------- kind tabs ---------- */
  function tabs() {
    var box = clear($("kind-tabs"));
    Object.keys(KINDS).forEach(function (k) {
      var b = h("button", "chip chip--btn" + (kind === k ? " is-on" : ""), KINDS[k]); b.type = "button"; b.setAttribute("aria-pressed", kind === k ? "true" : "false");
      b.addEventListener("click", function () { kind = k; reset(); tabs(); texts(); prompt(); browse(); });
      box.appendChild(b);
    });
  }
  function texts() {
    $("imp-title").textContent = "Add " + (kind === "practice" ? "practice questions" : "exercises or worksheets");
    $("imp-text").placeholder = kind === "practice" ? "chapter,topic,difficulty,type,question,optionA,optionB,optionC,optionD,answer,items,acceptedAnswers,hint,solution,subtopic" : "chapter,collectionType,collectionName,qNo,question,solution,answer,videoUrl";
    $("pr-hint").textContent = kind === "practice"
      ? "Copy this prompt into an AI (ChatGPT, Claude, Gemini …) together with the book pages. It writes a CSV you can paste or save as a .csv file above."
      : "Copy this prompt into an AI together with the pages of the exercise or worksheet. It copies every question and writes the solution. Add video links later from the list below.";
    $("pr-topic-l").textContent = kind === "practice" ? "Topic(s)" : "Exercise / worksheet name";
    $("pr-count-l").textContent = kind === "practice" ? "How many questions?" : "(not needed for exercises)";
    $("pr-count").disabled = kind !== "practice";
  }

  /* ---------- the AI prompt ---------- */
  function prompt() {
    var o = { cls: $("imp-class").value, chapter: $("pr-chapter").value.trim(), topic: $("pr-topic").value.trim(), count: Math.max(5, Math.min(60, parseInt($("pr-count").value, 10) || 20)), extra: $("pr-extra").value.trim() };
    $("pr-out").value = kind === "practice" ? ContentPrompt.practice(o) : ContentPrompt.exercises(o);
  }

  /* ---------- import: check, then save ---------- */
  function reset() { clear($("imp-out")); UI.clear($("imp-msg")); $("imp-save").disabled = true; lastOk = false; checkedText = ""; }
  function api(save) { var cls = parseInt($("imp-class").value, 10), csv = $("imp-text").value; return kind === "practice" ? Api.staff.importPractice(cls, csv, save) : Api.staff.importExercises(cls, csv, save); }

  function showResult(r) {
    var box = clear($("imp-out"));
    var chips = h("div", "chiprow");
    chips.appendChild(h("span", "chip", r.rows + " rows"));
    if (r.ok) { chips.appendChild(h("span", "chip chip--easy", r.added + " new")); chips.appendChild(h("span", "chip chip--medium", r.updated + " will be updated")); }
    else chips.appendChild(h("span", "chip chip--challenging", r.errorCount + " problem" + (r.errorCount === 1 ? "" : "s")));
    box.appendChild(chips);
    if (r.summary && r.summary.length) {
      var wrap = h("div", "tablewrap"), tb = h("table", "table"), th = h("thead"), tr = h("tr");
      [ "Chapter", kind === "practice" ? "Topics (questions)" : "Exercises / worksheets (questions)", "Total"].forEach(function (x) { tr.appendChild(h("th", "", x)); }); th.appendChild(tr); tb.appendChild(th);
      var body = h("tbody");
      r.summary.forEach(function (s) { var row = h("tr"); row.appendChild(h("td", "", s.chapter)); row.appendChild(h("td", "", s.groups.map(function (g) { return g.name + " (" + g.count + ")"; }).join(" · "))); row.appendChild(h("td", "", String(s.total))); body.appendChild(row); });
      tb.appendChild(body); wrap.appendChild(tb); box.appendChild(wrap);
    }
    if (!r.ok) {
      var bad = h("div", "notice notice--bad"); bad.appendChild(h("b", "", "Nothing was saved. Fix these and check again:"));
      var ul = h("ul", "errlist");
      r.errors.forEach(function (e) { ul.appendChild(h("li", "", (e.line ? "Line " + e.line + (e.id ? " (" + e.id + ")" : "") + ": " : "") + e.message)); });
      bad.appendChild(ul); if (r.errorCount > r.errors.length) bad.appendChild(h("p", "small", "…and " + (r.errorCount - r.errors.length) + " more."));
      box.appendChild(bad);
    }
  }

  function doCheck(ev) {
    if (ev) ev.preventDefault();
    UI.clear($("imp-msg")); var text = $("imp-text").value;
    if (text.trim().length < 20) { UI.say($("imp-msg"), "Choose a CSV file or paste the CSV text first.", "bad"); return; }
    if (text.length > 700000) { UI.say($("imp-msg"), "The text is too large. Split it into smaller files.", "bad"); return; }
    $("imp-save").disabled = true; lastOk = false; UI.busy($("imp-check"), true, "Checking…");
    api(false).then(function (r) { UI.busy($("imp-check"), false); showResult(r); lastOk = !!r.ok; checkedText = text + "|" + $("imp-class").value; $("imp-save").disabled = !r.ok; if (r.ok) UI.say($("imp-msg"), "The file is fine. Press “Save these questions” to add them.", "ok"); })
      .catch(function (e) { UI.busy($("imp-check"), false); UI.say($("imp-msg"), e.message, "bad"); });
  }
  function doSave() {
    if (!lastOk || checkedText !== $("imp-text").value + "|" + $("imp-class").value) { UI.say($("imp-msg"), "The text changed. Press “Check the file” again first.", "bad"); $("imp-save").disabled = true; return; }
    UI.busy($("imp-save"), true, "Saving…");
    api(true).then(function (r) {
      UI.busy($("imp-save"), false); $("imp-save").disabled = true; lastOk = false;
      if (!r.ok || !r.saved) { showResult(r); UI.say($("imp-msg"), "Nothing was saved. " + (r.errors && r.errors[0] ? r.errors[0].message : ""), "bad"); return; }
      reset(); $("imp-text").value = ""; $("imp-file").value = "";
      flash("Saved: " + r.added + " new, " + r.updated + " updated. Students of Class " + $("imp-class").value + " can see them now.");
      $("br-class").value = $("imp-class").value; browse();
    }).catch(function (e) { UI.busy($("imp-save"), false); UI.say($("imp-msg"), e.message, "bad"); });
  }
  function onFile() {
    var f = $("imp-file").files[0]; if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name) && !/^text\//.test(f.type || "")) { UI.say($("imp-msg"), "“" + f.name + "” is not a CSV file. Save it as .csv first.", "bad"); return; }
    if (f.size > MAX_FILE) { UI.say($("imp-msg"), "“" + f.name + "” is too large. Split it into smaller files.", "bad"); return; }
    var rd = new FileReader();
    rd.onload = function () { $("imp-text").value = String(rd.result || "").replace(/^﻿/, ""); reset(); doCheck(); };
    rd.onerror = function () { UI.say($("imp-msg"), "Could not read the file.", "bad"); };
    rd.readAsText(f, "utf-8");
  }

  /* ---------- browse ---------- */
  function browse(keep) {
    var cls = parseInt($("br-class").value, 10); if (keep !== true) $("br-detail").hidden = true;
    if (!cls) return;
    var call = kind === "practice" ? Api.staff.listPractice(cls) : Api.staff.listExercises(cls);
    call.then(function (r) {
      var box = clear($("br-chapters")); $("br-empty").hidden = r.chapters.length > 0;
      r.chapters.forEach(function (ch) {
        var c = h("article", "rowcard"), top = h("div", "rowcard__top"), left = h("div");
        left.appendChild(h("div", "rowcard__name", ch.chapter));
        left.appendChild(h("div", "small muted", ch.total + " question" + (ch.total === 1 ? "" : "s") + (ch.active !== undefined && ch.active !== ch.total ? " · " + ch.active + " active" : "")));
        top.appendChild(left); c.appendChild(top);
        if (kind === "practice") {
          c.appendChild(h("p", "small", ch.topics.map(function (t) { return t.topic + " (" + t.count + ")"; }).join(" · ")));
          var b = h("button", "btn btn--small", "Open the questions"); b.type = "button"; b.addEventListener("click", function () { openList(cls, ch, null); }); var a = h("div", "actions"); a.appendChild(b); c.appendChild(a);
        } else {
          var cols = h("div", "actions");
          ch.collections.forEach(function (col) {
            var b2 = h("button", "btn btn--small btn--ghost", col.collectionName + " (" + col.count + (col.videos ? ", " + col.videos + " video" : "") + ")"); b2.type = "button";
            b2.addEventListener("click", function () { openList(cls, ch, col); }); cols.appendChild(b2);
          });
          c.appendChild(cols);
        }
        box.appendChild(c);
      });
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  function qCard(q, onChange) {
    var c = h("article", "ans " + (q.active ? "ans--right" : "ans--blank")), top = h("div", "ans__top");
    top.appendChild(h("span", "ans__n", q.questionId || q.exerciseQuestionId));
    if (q.qNo !== undefined) top.appendChild(h("span", "chip", "Q " + q.qNo));
    if (q.topic) top.appendChild(h("span", "chip", q.topic));
    if (q.difficulty) top.appendChild(h("span", "chip chip--" + q.difficulty, Kit.DIFF[q.difficulty] || q.difficulty));
    if (q.type) top.appendChild(h("span", "chip", q.type));
    if (q.videoId) top.appendChild(h("span", "chip chip--marks", "video"));
    if (!q.active) top.appendChild(h("span", "chip chip--gold", "archived"));
    top.appendChild(h("span", "small muted", q.mine ? "added by you" : "added by " + UI.name(q.createdByName || "")));
    c.appendChild(top); c.appendChild(tex("div", "qtext qtext--sm", q.question));
    if (q.options && q.options.length) { var ul = h("ul", "optlist"); q.options.forEach(function (o) { ul.appendChild(tex("li", o.key === q.answer ? "optlist__right" : "", o.key + ") " + o.text)); }); c.appendChild(ul); }
    if (q.items && q.items.length) c.appendChild(h("p", "small", "Pieces: " + q.items.join(" | ")));
    var ans = h("p", "small"); ans.appendChild(h("b", "", "Answer: ")); var as = h("span"); TeX.set(as, q.type === "order" ? q.answer.split("|").join(" → ") : q.answer); ans.appendChild(as); c.appendChild(ans);
    if (q.hint) { var hp = h("p", "small"); hp.appendChild(h("b", "", "Hint: ")); var hs = h("span"); TeX.set(hs, q.hint); hp.appendChild(hs); c.appendChild(hp); }
    var sp = h("div", "ans__why"); sp.appendChild(h("b", "", "Solution: ")); var ss = h("span", "ans__written"); TeX.set(ss, q.solution); sp.appendChild(ss); c.appendChild(sp);
    var acts = h("div", "actions");
    if (q.exerciseQuestionId && (q.mine || me.role === "admin")) {
      var vrow = h("div", "markrow"), vin = h("input", "input"); vin.type = "url"; vin.maxLength = 200; vin.value = q.videoUrl || ""; vin.placeholder = "YouTube link (leave empty for no video)"; vin.setAttribute("aria-label", "YouTube link");
      var vb = h("button", "btn btn--small btn--ghost", "Save video"); vb.type = "button";
      vb.addEventListener("click", function () {
        UI.busy(vb, true, "Saving…");
        Api.staff.setExerciseVideo(q.exerciseQuestionId, vin.value.trim()).then(function (r) { flash(r.exercise.videoId ? "Video saved for " + q.exerciseQuestionId + "." : "Video removed from " + q.exerciseQuestionId + "."); onChange(); })
          .catch(function (e) { UI.busy(vb, false); flash(e.message, "bad"); });
      });
      vrow.appendChild(vin); vrow.appendChild(vb); c.appendChild(vrow);
    }
    if (me.role === "admin") {
      var ab = h("button", "btn btn--small btn--ghost", q.active ? "Archive" : "Restore"); ab.type = "button";
      ab.addEventListener("click", function () {
        UI.busy(ab, true, "…");
        var p = q.questionId ? Api.staff.setPracticeActive(q.questionId, !q.active) : Api.staff.setExerciseActive(q.exerciseQuestionId, !q.active);
        p.then(function () { flash((q.active ? "Archived " : "Restored ") + (q.questionId || q.exerciseQuestionId) + "."); onChange(); }).catch(function (e) { UI.busy(ab, false); flash(e.message, "bad"); });
      });
      acts.appendChild(ab); c.appendChild(acts);
    }
    return c;
  }

  function openList(cls, ch, col, stay) {
    var p = col ? Api.staff.listExercises(cls, ch.chapterRef, col.collectionType, col.collectionName) : Api.staff.listPractice(cls, ch.chapterRef);
    p.then(function (r) {
      $("br-detail").hidden = false; $("br-title").textContent = ch.chapter + (col ? " — " + col.collectionName : "");
      $("br-sub").textContent = r.total + " question" + (r.total === 1 ? "" : "s") + (r.total > r.questions.length ? " (showing the first " + r.questions.length + ")" : "") + " · Class " + cls;
      var box = clear($("br-list"));
      r.questions.forEach(function (q) { box.appendChild(qCard(q, function () { openList(cls, ch, col, true); browse(true); })); });
      if (!stay) $("br-detail").scrollIntoView({ block: "start" });
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }
  Shell.start("content", false, function (profile) {
    me = profile;
    fillClass($("imp-class")); fillClass($("br-class"));
    if (!classes().length) { UI.say($("page-msg"), "No class has been assigned to you yet. Please ask the administrator.", "bad"); return; }
    tabs(); texts(); prompt(); browse();
    $("imp-form").addEventListener("submit", doCheck);
    $("imp-save").addEventListener("click", doSave);
    $("imp-file").addEventListener("change", onFile);
    $("imp-text").addEventListener("input", function () { if (lastOk) { lastOk = false; $("imp-save").disabled = true; } });
    $("imp-class").addEventListener("change", function () { reset(); prompt(); $("br-class").value = $("imp-class").value; browse(); });
    $("br-class").addEventListener("change", browse);
    ["pr-chapter", "pr-topic", "pr-count", "pr-extra"].forEach(function (id) { $(id).addEventListener("input", prompt); });
    $("pr-copy").addEventListener("click", function () { PromptKit.copy($("pr-copy"), $("pr-out")); });
    $("br-close").addEventListener("click", function () { $("br-detail").hidden = true; });
  });
})();
