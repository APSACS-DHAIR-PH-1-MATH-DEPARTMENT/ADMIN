/* test-new.js (staff) — build 13. The "New test" form: the questions come from CSV files (drag-drop or choose; one file = one test),
   pasted CSV text, or are typed by hand — NOT from the question bank. Every file/typed question is checked by the server
   (staff/createCustomTest with save:false) before the test is created. The CSV text is only checked and then forgotten. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var opts = null, drafts = [], seq = 0, nodes = {}, onCreated = null, busyCreate = false;
  var MAX_FILE = 700000;
  var TYPE_NAME = { mcq: "Multiple choice", tf: "True / false", fill: "Fill in", order: "Put in order", short: "Short answer", long: "Long answer" };
  function isManual(t) { return t === "short" || t === "long"; }
  function marksOf(q) { var n = parseInt(q.marks, 10); return n >= 1 ? n : 1; }

  function classesOf() { var seen = {}, out = []; opts.assignments.forEach(function (k) { var c = parseInt(k, 10); if (!seen[c]) { seen[c] = 1; out.push(c); } }); return out.sort(function (a, b) { return a - b; }); }
  function ticked(name) { return Array.prototype.map.call(document.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; }); }
  function formBase() { return { classLevel: parseInt($("n-class").value, 10), chapter: $("n-chapter").value.trim(), topic: $("n-topic").value.trim() }; }

  function fillClass() {
    var cls = parseInt($("n-class").value, 10), secs = clear($("n-sections"));
    opts.assignments.filter(function (k) { return parseInt(k, 10) === cls; }).forEach(function (k) {
      var s = k.replace(/^\d+/, ""), l = h("label", "check check--inline"), i = h("input"); i.type = "checkbox"; i.value = s; i.name = "sec"; i.checked = true;
      l.appendChild(i); l.appendChild(h("span", "", cls + s)); secs.appendChild(l);
    });
  }

  /* ---------- drafts ---------- */
  function newDraft(title, source, name) { var d = { id: ++seq, title: String(title).slice(0, 80), source: source, name: name || "", questions: [], errors: [], errorCount: 0, counts: null, busy: false, failed: "" }; drafts.push(d); return d; }
  function titleFromFile(n) { var t = String(n).replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim(); return t.length >= 3 ? t : "Test"; }

  function previewCsv(text, name, source) {
    var d = newDraft(titleFromFile(name), source, name); d.busy = true; render(d); updateCount();
    var b = formBase(); var p = { csv: text.replace(/^﻿/, ""), save: false, classLevel: b.classLevel }; if (b.chapter) p.chapter = b.chapter; if (b.topic) p.topic = b.topic;
    Api.staff.createCustomTest(p).then(function (r) {
      d.busy = false; d.questions = r.questions || []; d.errors = r.errors || []; d.errorCount = r.errorCount || 0; d.counts = r.counts; render(d); updateCount();
    }).catch(function (e) { d.busy = false; d.errors = [{ line: 0, message: e.message }]; d.errorCount = 1; d.questions = []; render(d); updateCount(); });
  }
  function addFiles(list) {
    Array.prototype.forEach.call(list, function (f) {
      if (!/\.(csv|txt)$/i.test(f.name) && !/^text\//.test(f.type || "")) { UI.say($("n-msg"), "“" + f.name + "” is not a CSV file. Save it as .csv first.", "bad"); return; }
      if (f.size > MAX_FILE) { UI.say($("n-msg"), "“" + f.name + "” is too large. Split it into smaller files.", "bad"); return; }
      var rd = new FileReader();
      rd.onload = function () { previewCsv(String(rd.result || ""), f.name, "csv"); };
      rd.onerror = function () { UI.say($("n-msg"), "Could not read “" + f.name + "”.", "bad"); };
      rd.readAsText(f, "utf-8");
    });
  }

  function chips(d) {
    var box = h("div", "chiprow"), c = d.counts; if (!c) return box;
    box.appendChild(h("span", "chip", c.total + " questions"));
    if (c.totalMarks) box.appendChild(h("span", "chip chip--marks", c.totalMarks + " marks"));
    if (c.manual) box.appendChild(h("span", "chip chip--pending", c.manual + " checked by you"));
    Object.keys(c.byType || {}).forEach(function (k) { box.appendChild(h("span", "chip", c.byType[k] + " " + (TYPE_NAME[k] || k))); });
    ["easy", "medium", "challenging"].forEach(function (k) { if (c.byDifficulty && c.byDifficulty[k]) box.appendChild(h("span", "chip chip--" + k, c.byDifficulty[k] + " " + Kit.DIFF[k])); });
    return box;
  }

  function answerText(q) {
    if (q.type === "order") return String(q.answer).split("|").join(" → ");
    if (q.type === "mcq") return q.answer + ". " + (q["option" + q.answer] || "");
    if (isManual(q.type)) return "(model answer) " + q.answer;
    return q.answer;
  }
  function questionList(d, box) {
    clear(box);
    d.questions.forEach(function (q, i) {
      var r = h("div", "qprev"), top = h("div", "qprev__top");
      top.appendChild(h("b", "", "Q" + (i + 1))); top.appendChild(h("span", "chip", TYPE_NAME[q.type] || q.type)); top.appendChild(h("span", "chip chip--marks", marksOf(q) + (marksOf(q) === 1 ? " mark" : " marks"))); top.appendChild(h("span", "chip chip--" + q.difficulty, Kit.DIFF[q.difficulty] || q.difficulty));
      if (q.topic) top.appendChild(h("span", "small muted", q.topic));
      var rm = h("button", "linkbtn", "Remove"); rm.type = "button"; rm.addEventListener("click", function () { d.questions.splice(i, 1); d.counts = recount(d.questions); render(d); }); top.appendChild(rm);
      r.appendChild(top); r.appendChild(Kit.tex("div", "qtext qtext--sm", q.question)); r.appendChild(h("div", "small", "Answer: " + answerText(q)));
      box.appendChild(r);
    });
  }
  function recount(rows) {
    var c = { total: rows.length, totalMarks: 0, manual: 0, byType: {}, byDifficulty: {}, byTopic: {} };
    rows.forEach(function (q) { c.totalMarks += marksOf(q); if (isManual(q.type)) c.manual++; c.byType[q.type] = (c.byType[q.type] || 0) + 1; c.byDifficulty[q.difficulty] = (c.byDifficulty[q.difficulty] || 0) + 1; c.byTopic[q.topic] = (c.byTopic[q.topic] || 0) + 1; });
    return c;
  }

  function render(d) {
    var old = nodes[d.id], c = h("article", "rowcard draft" + (d.errorCount ? " draft--bad" : ""));
    var head = h("div", "rowcard__top"), ti = h("input", "input"); ti.maxLength = 80; ti.value = d.title; ti.setAttribute("aria-label", "Title of this test");
    ti.addEventListener("input", function () { d.title = ti.value; }); head.appendChild(ti);
    var rm = h("button", "btn btn--small btn--ghost", "Remove test"); rm.type = "button"; rm.addEventListener("click", function () { drafts = drafts.filter(function (x) { return x !== d; }); delete nodes[d.id]; c.parentNode.removeChild(c); updateCount(); }); head.appendChild(rm);
    c.appendChild(head);
    c.appendChild(h("p", "small muted", d.source === "typed" ? "Typed by you" : (d.source === "pasted" ? "Pasted CSV" : "File: " + d.name)));
    if (d.busy) c.appendChild(h("p", "muted", "Checking the questions…"));
    else {
      if (d.counts) c.appendChild(chips(d));
      if (d.errorCount) {
        var er = h("div", "notice notice--bad"); er.setAttribute("role", "alert");
        er.appendChild(h("b", "", d.errorCount + " problem" + (d.errorCount === 1 ? "" : "s") + " — fix the file and drop it again (or remove this test):"));
        var ul = h("ul", "errlist"); d.errors.slice(0, 12).forEach(function (e) { ul.appendChild(h("li", "", (e.line ? "Line " + e.line + ": " : "") + e.message)); });
        if (d.errorCount > 12) ul.appendChild(h("li", "", "…and " + (d.errorCount - 12) + " more."));
        er.appendChild(ul); c.appendChild(er);
      }
      if (d.failed) { var f = h("div", "notice notice--bad", d.failed); f.setAttribute("role", "alert"); c.appendChild(f); }
      if (d.questions.length && !d.errorCount) {
        var det = h("details", "qdet"), sm = h("summary", "", "Preview the " + d.questions.length + " questions (with answers)"), body = h("div"); det.appendChild(sm); det.appendChild(body);
        det.addEventListener("toggle", function () { if (det.open) questionList(d, body); }); c.appendChild(det);
      }
      if (!d.errorCount || d.source === "typed") { var slot = h("div"); c.appendChild(slot); manualSlot(d, slot); }
    }
    if (old && old.parentNode) old.parentNode.replaceChild(c, old); else $("n-drafts").appendChild(c);
    nodes[d.id] = c;
  }

  /* ---------- typing a question by hand ---------- */
  function field(label, el) { var w = h("div"); w.appendChild(h("label", "", label)); w.appendChild(el); return w; }
  function select(list) { var s = h("select", "input"); list.forEach(function (o) { var x = h("option", "", o[1]); x.value = o[0]; s.appendChild(x); }); return s; }
  function shuffle(a) { var b = a.slice(), k = 0, same = true; while (same && k++ < 20) { for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = b[i]; b[i] = b[j]; b[j] = t; } same = b.join("|") === a.join("|"); } return b; }

  function manualSlot(d, slot) {
    var openBtn = h("button", "btn btn--small btn--ghost", "+ Type a question"); openBtn.type = "button";
    openBtn.addEventListener("click", function () { clear(slot); slot.appendChild(manualForm(d, function () { clear(slot); manualSlot(d, slot); })); });
    slot.appendChild(openBtn);
  }
  function manualForm(d, close) {
    var f = h("div", "editform");
    var type = select([["mcq", "Multiple choice"], ["tf", "True / false"], ["fill", "Fill in the answer"], ["order", "Put in order"], ["short", "Short answer (you mark it)"], ["long", "Long answer (you mark it)"]]);
    var diff = select([["easy", "Easy"], ["medium", "Medium"], ["challenging", "Challenging"]]); diff.value = "medium";
    var topic = h("input", "input"); topic.maxLength = 60; topic.value = $("n-topic").value.trim() || $("n-chapter").value.trim(); topic.placeholder = "Topic of this question";
    var mk = h("input", "input"); mk.type = "number"; mk.min = "1"; mk.max = "20"; mk.value = "1"; mk.setAttribute("inputmode", "numeric");
    var g1 = h("div", "formgrid"); g1.appendChild(field("Kind of question", type)); g1.appendChild(field("Difficulty", diff)); g1.appendChild(field("Marks (1 to 20)", mk)); f.appendChild(g1); f.appendChild(field("Topic", topic));
    var q = h("textarea", "input input--area"); q.maxLength = 900; q.placeholder = "Write the question. Maths between single dollar signs, e.g. $\\frac{3}{4}$"; f.appendChild(field("Question", q));

    var mc = h("div"); mc.appendChild(h("div", "label", "Options — tick the correct one; for wrong options you may pick the mistake it shows"));
    var optIn = {}, optTag = {}, radios = {}, tagState = { tags: opts.tags || [], groups: opts.tagGroups || [] };
    ["A", "B", "C", "D"].forEach(function (L, i) {
      var row = h("div", "optrow"), r = h("input"); r.type = "radio"; r.name = "mq-correct-" + d.id; r.value = L; r.checked = i === 0; r.setAttribute("aria-label", "Option " + L + " is correct"); radios[L] = r;
      var t = h("input", "input"); t.maxLength = 200; t.placeholder = "Option " + L; optIn[L] = t; var s = PromptKit.tagSelect(tagState, $("n-class").value); optTag[L] = s;
      row.appendChild(r); row.appendChild(t); row.appendChild(s); mc.appendChild(row);
    });
    var tfBox = h("div"), tf = select([["true", "True"], ["false", "False"]]); tfBox.appendChild(field("Correct answer", tf));
    var fillBox = h("div"), fa = h("input", "input"); fa.maxLength = 200; var fx = h("input", "input"); fx.maxLength = 300; fx.placeholder = "e.g. 5.0|5.00";
    fillBox.appendChild(field("Correct answer", fa)); fillBox.appendChild(field("Other accepted answers (optional, separate with |)", fx));
    var ordBox = h("div"), oi = h("textarea", "input input--area"); oi.placeholder = "One value per line, in the CORRECT order. Students will see them shuffled."; ordBox.appendChild(field("Items in the correct order", oi));
    var wrBox = h("div"), wa = h("textarea", "input input--area"); wa.maxLength = 800; wa.placeholder = "The model answer: final result and the marking points, e.g. Step 1 … (1) Step 2 … (1) Answer … (1)"; wrBox.appendChild(field("Model answer / marking points (only you see this until the answer is marked)", wa));
    f.appendChild(mc); f.appendChild(tfBox); f.appendChild(fillBox); f.appendChild(ordBox); f.appendChild(wrBox);
    var defaultMarks = { short: "3", long: "5" };
    function swap() { mc.hidden = type.value !== "mcq"; tfBox.hidden = type.value !== "tf"; fillBox.hidden = type.value !== "fill"; ordBox.hidden = type.value !== "order"; wrBox.hidden = !isManual(type.value); if (isManual(type.value) && mk.value === "1") mk.value = defaultMarks[type.value]; else if (!isManual(type.value) && (mk.value === "3" || mk.value === "5")) mk.value = "1"; }
    type.addEventListener("change", swap); swap();
    var ex = h("textarea", "input input--area"); ex.maxLength = 600; ex.placeholder = "Why is this the answer? (shown to the student after the test)"; f.appendChild(field("Explanation / worked solution (required)", ex));
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true; f.appendChild(msg);
    var acts = h("div", "actions"), add = h("button", "btn btn--small", "Add question"), cancel = h("button", "btn btn--small btn--ghost", "Cancel"); add.type = "button"; cancel.type = "button";
    acts.appendChild(add); acts.appendChild(cancel); f.appendChild(acts);
    cancel.addEventListener("click", close);
    add.addEventListener("click", function () {
      UI.clear(msg);
      var rec = { type: type.value, difficulty: diff.value, topic: topic.value.trim(), question: q.value.trim(), explanation: ex.value.trim(), marks: String(parseInt(mk.value, 10) || 1) };
      if (rec.type === "mcq") {
        var ans = "A"; ["A", "B", "C", "D"].forEach(function (L) { if (radios[L].checked) ans = L; });
        rec.answer = ans; ["A", "B", "C", "D"].forEach(function (L) { rec["option" + L] = optIn[L].value.trim(); rec["err" + L] = (L !== ans && optIn[L].value.trim()) ? optTag[L].value : ""; });
      } else if (rec.type === "tf") rec.answer = tf.value;
      else if (isManual(rec.type)) rec.answer = wa.value.trim();
      else if (rec.type === "fill") { rec.answer = fa.value.trim(); rec.acceptedAnswers = fx.value.trim(); }
      else { var lines = oi.value.split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean); rec.answer = lines.join("|"); rec.items = shuffle(lines).join("|"); }
      var b = formBase(), n = d.questions.length, p = { save: false, classLevel: b.classLevel, questions: d.questions.concat([rec]) }; if (b.chapter) p.chapter = b.chapter; if (b.topic) p.topic = b.topic;
      UI.busy(add, true, "Checking…");
      Api.staff.createCustomTest(p).then(function (r) {
        UI.busy(add, false);
        var mine = (r.errors || []).filter(function (e) { return e.line === n + 1; });
        if (mine.length) { UI.say(msg, mine.map(function (e) { return e.message; }).join(" "), "bad"); return; }
        d.questions.push(r.questions[n]); d.counts = recount(d.questions); d.errors = []; d.errorCount = 0; render(d); updateCount();
      }).catch(function (e) { UI.busy(add, false); UI.say(msg, e.message, "bad"); });
    });
    return f;
  }

  function updateCount() {
    var ok = drafts.filter(function (d) { return !d.busy && !d.errorCount && d.questions.length; }).length;
    $("n-count").textContent = drafts.length ? drafts.length + " test(s) ready to check: " + ok + " ok" + (ok < drafts.length ? ", " + (drafts.length - ok) + " need attention" : "") + "." : "No tests added yet. Drop a CSV file, paste CSV text, or type the questions yourself.";
    $("n-save").textContent = drafts.length > 1 ? "Create " + drafts.length + " tests" : "Create test";
  }

  /* ---------- create ---------- */
  function settings() {
    var mode = ticked("n-mode")[0] || "now";
    var s = { maxAttempts: parseInt($("n-attempts").value, 10), resultVisibility: $("n-vis").value, mode: mode };
    if ($("n-time").value.trim()) s.timeLimitMin = parseInt($("n-time").value, 10);
    if (mode === "schedule") s.opensAt = $("n-opens").value;
    if (mode !== "draft" && $("n-dur").value.trim()) { s.durationValue = parseInt($("n-dur").value, 10); s.durationUnit = $("n-unit").value; }
    return s;
  }
  function submit(ev) {
    ev.preventDefault(); if (busyCreate) return;
    var msg = $("n-msg"), btn = $("n-save"); UI.clear(msg);
    var b = formBase(), secs = ticked("sec");
    if (!drafts.length) { UI.say(msg, "Add at least one test: drop a CSV file, paste CSV text, or type questions.", "bad"); return; }
    if (b.chapter.length < 3) { UI.say(msg, "Type the chapter name (3 letters or more).", "bad"); return; }
    if (!secs.length) { UI.say(msg, "Tick at least one section.", "bad"); return; }
    var bad = drafts.filter(function (d) { return d.busy || d.errorCount || d.questions.length < 3 || String(d.title).trim().length < 3; });
    if (bad.length) { UI.say(msg, "Fix these first: every test needs a title (3 letters or more), at least 3 questions, and no problems in the file.", "bad"); return; }
    busyCreate = true; UI.busy(btn, true, "Creating…");
    var made = [], queue = drafts.slice();
    (function next() {
      var d = queue.shift();
      if (!d) { finish(); return; }
      var p = Object.assign({ save: true, title: d.title.trim(), classLevel: b.classLevel, sections: secs, chapter: b.chapter, topic: b.topic, questions: d.questions }, settings());
      Api.staff.createCustomTest(p).then(function (r) {
        if (!r.saved) { d.failed = (r.errors && r.errors[0] && r.errors[0].message) || "The server did not accept this test."; render(d); return stop(); }
        made.push(r.assessment); drafts = drafts.filter(function (x) { return x !== d; }); if (nodes[d.id] && nodes[d.id].parentNode) nodes[d.id].parentNode.removeChild(nodes[d.id]); delete nodes[d.id]; next();
      }).catch(function (e) { d.failed = e.message; render(d); stop(); });
    })();
    function stop() { busyCreate = false; UI.busy(btn, false); updateCount(); UI.say(msg, made.length ? made.length + " test(s) were created; the others had a problem (see the red note on them)." : "No test was created. See the red note on the test.", "bad"); if (made.length && onCreated) onCreated(made, false); }
    function finish() {
      busyCreate = false; UI.busy(btn, false); updateCount();
      $("new-form").hidden = true; $("new-toggle").setAttribute("aria-expanded", "false");
      if (onCreated) onCreated(made, true);
    }
  }

  /* ---------- open / wiring ---------- */
  var wired = false;
  function wire() {
    if (wired) return; wired = true;
    var sel = $("n-class"); classesOf().forEach(function (c) { var x = h("option", "", "Class " + c); x.value = String(c); sel.appendChild(x); });
    sel.addEventListener("change", fillClass); fillClass();
    $("n-time").min = String(opts.limits.timeMin); $("n-time").max = String(opts.limits.timeMax);
    var dz = $("n-drop"), fi = $("n-files");
    dz.addEventListener("click", function () { fi.click(); });
    dz.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.click(); } });
    fi.addEventListener("change", function () { addFiles(fi.files); fi.value = ""; });
    ["dragenter", "dragover"].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (n) { dz.addEventListener(n, function (e) { e.preventDefault(); dz.classList.remove("is-over"); }); });
    dz.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files); });
    /* a file dropped beside the box must not make the browser open it */
    window.addEventListener("dragover", function (e) { e.preventDefault(); }); window.addEventListener("drop", function (e) { e.preventDefault(); });
    $("n-paste-go").addEventListener("click", function () { var t = $("n-paste").value; if (!t.trim()) { UI.say($("n-msg"), "Paste the CSV text first.", "bad"); return; } UI.clear($("n-msg")); previewCsv(t, "Pasted test", "pasted"); $("n-paste").value = ""; });
    $("n-typed").addEventListener("click", function () { var d = newDraft("Typed test " + (drafts.filter(function (x) { return x.source === "typed"; }).length + 1), "typed"); render(d); updateCount(); });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="n-mode"]'), function (r) { r.addEventListener("change", modeChange); }); modeChange();
    $("new-form").addEventListener("submit", submit);
    TestPrompt.init(opts);
  }
  function modeChange() {
    var m = ticked("n-mode")[0] || "now"; $("n-when").hidden = m !== "schedule"; $("n-durbox").hidden = m === "draft";
  }
  function open() {
    if (opts) { wire(); TestPrompt.init(opts); updateCount(); return Promise.resolve(); }
    return Api.staff.assessmentOptions().then(function (o) { opts = o; wire(); updateCount(); }).catch(function (e) { UI.say($("n-msg"), e.message, "bad"); });
  }
  window.TestNew = { open: open, onCreated: function (fn) { onCreated = fn; } };
})();
