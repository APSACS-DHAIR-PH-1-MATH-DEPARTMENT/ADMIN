/* content.js (staff) — Practice & exercises: import CSV (check, then save), copy-ready AI prompt, browse what is added,
   set a YouTube video on an exercise question, archive / restore (administrator).
   Many CSV files can be chosen or dropped at once (up to 20, one class per batch); each file is recognised as practice or exercises
   from its first row, checked on the server one at a time, and only the files without problems are saved.
   All server text is shown as text (Kit.tex for maths). The server re-checks everything; the CSV text is only sent, never kept. */
(function () {
  var $ = UI.$, h = Kit.h, tex = Kit.tex, clear = Kit.clear;
  var me = null, kind = "practice", MAX_FILE = 700000;
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
      b.addEventListener("click", function () { kind = k; tabs(); texts(); prompt(); browse(); });
      box.appendChild(b);
    });
  }
  function texts() {
    $("pr-hint").textContent = kind === "practice"
      ? "Copy this prompt into an AI (ChatGPT, Claude, Gemini …) together with the book pages. It writes a CSV you can paste above or save as a .csv file and drop in the box."
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

  /* ---------- import: many CSV files (or pasted text), checked one by one, then saved ---------- */
  var MAX_FILES = 20, PASTED = "Pasted text";
  var queue = [], working = false, seq = 0;
  var KIND_NAME = { practice: "Practice questions", exercises: "Exercises & worksheets" };
  var STATE_TEXT = { "new": "Waiting", checking: "Checking…", ok: "Fine, ready to save", bad: "Has problems, will not be saved", saving: "Saving…", saved: "Saved", error: "Could not check" };
  var STATE_CHIP = { "new": "chip--pending", checking: "chip--pending", ok: "chip--easy", bad: "chip--challenging", saving: "chip--pending", saved: "chip--easy", error: "chip--challenging" };
  var UNKNOWN_HEADER = "The first row (the column names) is not one this page knows. A practice file starts with chapter, topic, difficulty, type, question … and an exercises file with chapter, collectionType, collectionName, qNo, question …";

  /* The kind of a CSV comes from its first row, so the right check runs whichever button is highlighted above. */
  function detectKind(text) {
    var line = String(text).replace(/^﻿/, "").split(/\r?\n/, 1)[0] || "";
    var cols = line.split(",").map(function (s) { return s.replace(/^\s*"?|"?\s*$/g, "").toLowerCase(); });
    function has(n) { return cols.indexOf(n) !== -1; }
    if (has("collectiontype") && has("collectionname") && has("qno")) return "exercises";
    if (has("topic") && has("difficulty") && has("type")) return "practice";
    return "";
  }

  function call(k, cls, csv, save) { return k === "practice" ? Api.staff.importPractice(cls, csv, save) : Api.staff.importExercises(cls, csv, save); }
  function classNo() { return parseInt($("imp-class").value, 10); }

  function pushItem(name, text, problem) {
    var k = problem ? "" : detectKind(text);
    var it = { id: ++seq, name: name, text: text, kind: k, state: "new", result: null, msg: "" };
    if (problem) { it.state = "bad"; it.msg = problem; }
    else if (text.trim().length < 20) { it.state = "bad"; it.msg = "The file is empty or too short."; }
    else if (!k) { it.state = "bad"; it.msg = UNKNOWN_HEADER; }
    queue.push(it);
    return it;
  }

  function showResult(box, r, itemKind, saved) {
    var chips = h("div", "chiprow");
    chips.appendChild(h("span", "chip", r.rows + (r.rows === 1 ? " row" : " rows")));
    if (r.ok) { chips.appendChild(h("span", "chip chip--easy", r.added + " new")); chips.appendChild(h("span", "chip chip--medium", r.updated + (saved ? " updated" : " will be updated"))); }
    else chips.appendChild(h("span", "chip chip--challenging", r.errorCount + " problem" + (r.errorCount === 1 ? "" : "s")));
    box.appendChild(chips);
    if (r.summary && r.summary.length) {
      var wrap = h("div", "tablewrap"), tb = h("table", "table"), th = h("thead"), tr = h("tr");
      [ "Chapter", itemKind === "practice" ? "Topics (questions)" : "Exercises / worksheets (questions)", "Total"].forEach(function (x) { tr.appendChild(h("th", "", x)); }); th.appendChild(tr); tb.appendChild(th);
      var body = h("tbody");
      r.summary.forEach(function (s) { var row = h("tr"); row.appendChild(h("td", "", s.chapter)); row.appendChild(h("td", "", s.groups.map(function (g) { return g.name + " (" + g.count + ")"; }).join(" · "))); row.appendChild(h("td", "", String(s.total))); body.appendChild(row); });
      tb.appendChild(body); wrap.appendChild(tb); box.appendChild(wrap);
    }
    if (!r.ok) {
      var bad = h("div", "notice notice--bad"); bad.appendChild(h("b", "", "Nothing was saved from this file. Fix these and add it again:"));
      var ul = h("ul", "errlist");
      r.errors.forEach(function (e) { ul.appendChild(h("li", "", (e.line ? "Line " + e.line + (e.id ? " (" + e.id + ")" : "") + ": " : "") + e.message)); });
      bad.appendChild(ul); if (r.errorCount > r.errors.length) bad.appendChild(h("p", "small", "…and " + (r.errorCount - r.errors.length) + " more."));
      box.appendChild(bad);
    }
  }

  function card(it) {
    var c = h("article", "fileitem fileitem--" + it.state), top = h("div", "fileitem__top");
    top.appendChild(h("span", "fileitem__name", it.name));
    if (it.kind) top.appendChild(h("span", "chip", KIND_NAME[it.kind]));
    top.appendChild(h("span", "chip " + STATE_CHIP[it.state], STATE_TEXT[it.state]));
    if (!working) { var x = h("button", "btn btn--small btn--ghost", "Remove"); x.type = "button"; x.addEventListener("click", function () { queue = queue.filter(function (q) { return q.id !== it.id; }); render(); }); top.appendChild(x); }
    c.appendChild(top);
    if (it.state === "error") {
      c.appendChild(h("div", "notice notice--bad", it.msg));
      if (!working) { var t = h("button", "btn btn--small", "Try again"); t.type = "button"; t.addEventListener("click", function () { it.state = "new"; it.msg = ""; render(); runChecks(); }); c.appendChild(t); }
    } else if (it.msg) c.appendChild(h("div", "notice notice--bad", it.msg));
    if (it.result) showResult(c, it.result, it.kind, it.state === "saved");
    return c;
  }

  function render() {
    var box = clear($("imp-files")), good = 0;
    queue.forEach(function (it) { if (it.state === "ok") good++; box.appendChild(card(it)); });
    $("imp-save").disabled = working || !good;
    $("imp-save").textContent = good ? "Save " + good + (good === 1 ? " good file" : " good files") : "Save the good files";
    $("imp-check").disabled = working;
    $("imp-class").disabled = working;
    $("imp-clear").hidden = !queue.length; $("imp-clear").disabled = working;
  }

  /* One request at a time (the server keeps its own lock), so ten files do not race each other. */
  function runChecks() {
    if (working) return;
    var list = queue.filter(function (it) { return it.state === "new"; }), cls = classNo(), i = 0;
    if (!list.length) { render(); return; }
    working = true; render();
    (function next() {
      if (i >= list.length) { working = false; render(); return; }
      var it = list[i++]; it.state = "checking"; render();
      call(it.kind, cls, it.text, false)
        .then(function (r) { it.result = r; it.state = r.ok ? "ok" : "bad"; })
        .catch(function (e) { it.state = "error"; it.msg = (e && e.message) || "Something went wrong. Try again."; })
        .then(next);
    })();
  }

  function saveAll() {
    if (working) return;
    var list = queue.filter(function (it) { return it.state === "ok"; }), cls = classNo(), i = 0, n = { files: 0, added: 0, updated: 0, failed: 0 }, kinds = {}, pastedSaved = false;
    if (!list.length) return;
    working = true; UI.clear($("imp-msg")); render();
    (function next() {
      if (i >= list.length) { working = false; $("imp-file").value = ""; finish(); return; }
      var it = list[i++]; it.state = "saving"; render();
      call(it.kind, cls, it.text, true)
        .then(function (r) {
          if (r.ok && r.saved) { it.state = "saved"; it.result = r; n.files++; n.added += r.added; n.updated += r.updated; kinds[it.kind] = true; if (it.name === PASTED) pastedSaved = true; }
          else { it.state = "bad"; it.result = r; n.failed++; }
        })
        .catch(function (e) { it.state = "error"; it.msg = (e && e.message) || "Something went wrong. Try again."; n.failed++; })
        .then(next);
    })();
    function finish() {
      if (pastedSaved) $("imp-text").value = "";
      render();
      var msg = "Saved " + n.files + (n.files === 1 ? " file" : " files") + ": " + n.added + " new, " + n.updated + " updated. Students of Class " + cls + " can see them now.";
      if (n.failed) msg += " " + n.failed + (n.failed === 1 ? " file was" : " files were") + " not saved: see the list.";
      flash(msg, n.failed ? "bad" : "ok");
      var ks = Object.keys(kinds);
      if (ks.length === 1) { kind = ks[0]; tabs(); texts(); prompt(); }
      $("br-class").value = String(cls); browse();
    }
  }

  /* Reads one file; resolves { name, text, problem } so the list keeps the order the files were chosen in. */
  function readFile(f) {
    return new Promise(function (resolve) {
      if (!/\.(csv|txt)$/i.test(f.name) && !/^text\//.test(f.type || "")) { resolve({ name: f.name, text: "", problem: "This is not a CSV file. Save it as .csv first." }); return; }
      if (f.size > MAX_FILE) { resolve({ name: f.name, text: "", problem: "This file is too large. Split it into smaller files." }); return; }
      var rd = new FileReader();
      rd.onload = function () { resolve({ name: f.name, text: String(rd.result || "").replace(/^\uFEFF/, ""), problem: "" }); };
      rd.onerror = function () { resolve({ name: f.name, text: "", problem: "Could not read this file." }); };
      rd.readAsText(f, "utf-8");
    });
  }

  function addFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length || working) return;
    UI.clear($("imp-msg"));
    var room = Math.max(0, MAX_FILES - queue.length), take = files.slice(0, room);
    if (files.length > take.length) UI.say($("imp-msg"), "Up to " + MAX_FILES + " files at a time. " + take.length + " added; add the rest after saving these.", "bad");
    Promise.all(take.map(readFile)).then(function (read) {
      read.forEach(function (f) {
        var dup = !f.problem && queue.some(function (q) { return q.name === f.name && q.text === f.text && q.state !== "saved"; });
        if (!dup) pushItem(f.name, f.text, f.problem);
      });
      render(); runChecks();
    });
  }

  function checkPasted(ev) {
    if (ev) ev.preventDefault();
    if (working) return;
    UI.clear($("imp-msg")); var text = $("imp-text").value;
    if (text.trim().length < 20) { UI.say($("imp-msg"), "Paste the CSV text first, or drop CSV files above.", "bad"); return; }
    if (text.length > MAX_FILE) { UI.say($("imp-msg"), "The text is too large. Split it into smaller files.", "bad"); return; }
    queue = queue.filter(function (q) { return q.name !== PASTED || q.state === "saved"; });
    if (queue.length >= MAX_FILES) { UI.say($("imp-msg"), "The list already has " + MAX_FILES + " files. Save or clear them first.", "bad"); return; }
    pushItem(PASTED, text); render(); runChecks();
  }

  function wireDrop() {
    var dz = $("imp-drop");
    function over(e) { e.preventDefault(); dz.classList.add("is-over"); }
    function out(e) { if (!e.relatedTarget || !dz.contains(e.relatedTarget)) dz.classList.remove("is-over"); }
    dz.addEventListener("dragenter", over); dz.addEventListener("dragover", over);
    dz.addEventListener("dragleave", out); dz.addEventListener("dragend", out);
    dz.addEventListener("drop", function (e) { e.preventDefault(); dz.classList.remove("is-over"); addFiles(e.dataTransfer && e.dataTransfer.files); });
    dz.addEventListener("click", function () { if (!working) $("imp-file").click(); });
    dz.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && !working) { e.preventDefault(); $("imp-file").click(); } });
    $("imp-file").addEventListener("change", function () { addFiles($("imp-file").files); $("imp-file").value = ""; });
    /* a file dropped just outside the box must not make the browser open it and leave this page */
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("drop", function (e) { e.preventDefault(); });
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
    if (q.items && q.items.length) { var pp = h("p", "small", "Pieces: "), ps = h("span"); TeX.set(ps, q.items.join("  ,  ")); pp.appendChild(ps); c.appendChild(pp); }
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
    $("imp-form").addEventListener("submit", checkPasted);
    $("imp-save").addEventListener("click", saveAll);
    $("imp-clear").addEventListener("click", function () { if (working) return; queue = []; UI.clear($("imp-msg")); render(); });
    wireDrop(); render();
    $("imp-class").addEventListener("change", function () {
      queue.forEach(function (it) { if (it.state !== "saved" && it.kind) { it.state = "new"; it.result = null; it.msg = ""; } });
      prompt(); $("br-class").value = $("imp-class").value; browse(); render(); runChecks();
    });
    $("br-class").addEventListener("change", browse);
    ["pr-chapter", "pr-topic", "pr-count", "pr-extra"].forEach(function (id) { $(id).addEventListener("input", prompt); });
    $("pr-copy").addEventListener("click", function () { PromptKit.copy($("pr-copy"), $("pr-out")); });
    $("br-close").addEventListener("click", function () { $("br-detail").hidden = true; });
  });
})();
