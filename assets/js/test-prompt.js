/* test-prompt.js (staff) — build 11. Makes the "paper pattern -> AI prompt" for a CSV TEST, and keeps the teacher's saved patterns.
   General: any class (1-12), any chapter or topic, any mix of the four auto-marked question kinds. Nothing is sent to an AI by the site. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var state = { tags: [], groups: [] }, patterns = [], loaded = false, wired = false;
  var NUM = ["pg-mcq", "pg-tf", "pg-fill", "pg-order", "pg-easy", "pg-medium", "pg-challenging"];

  function num(id, max) { var n = parseInt($(id).value, 10); return isNaN(n) || n < 0 ? 0 : Math.min(n, max || 200); }
  function ctx() { return { cls: $("n-class").value, chapter: $("n-chapter").value.trim(), topic: $("n-topic").value.trim() }; }

  function build() {
    var c = ctx(), mcq = num("pg-mcq"), tf = num("pg-tf"), fill = num("pg-fill"), order = num("pg-order"), total = mcq + tf + fill + order;
    var e = num("pg-easy", 100), m = num("pg-medium", 100), ch = num("pg-challenging", 100), notes = $("pg-notes").value.trim();
    var L = [];
    L.push("Write " + (total || "N") + " mathematics questions for a diagnostic test for Class " + (c.cls || "?") + " students (Federal Board / APSACS, Pakistan).");
    L.push("Chapter: " + (c.chapter || "(chapter name)") + "  |  Topic: " + (c.topic || "all topics of the chapter, spread the questions across them"));
    L.push(PromptKit.levelNote(c.cls));
    L.push("Kinds of question (only these four, they are marked automatically): " + mcq + " mcq (multiple choice), " + tf + " tf (true/false), " + fill + " fill (type the answer), " + order + " order (arrange values in order). Do NOT write short-answer or long-answer questions.");
    L.push("Difficulty mix: about " + e + "% easy, " + m + "% medium, " + ch + "% challenging. Easy = one step, medium = two steps or a small word problem, challenging = multi-step or needs a trap to be avoided.");
    if (notes) L.push("Extra notes: " + notes);
    L.push("");
    L.push("Reply with ONLY one CSV file, inside a single code block, nothing else. The first line must be exactly:");
    L.push("topic,difficulty,type,question,optionA,optionB,optionC,optionD,answer,items,acceptedAnswers,explanation,errA,errB,errC,errD,slips");
    L.push("");
    L.push("Rules for every row (one question per line):");
    L.push("- Put a field in double quotes if it contains a comma, and write a quote inside a field as \"\".");
    L.push("- topic: the sub-topic, up to 60 characters. difficulty: easy, medium or challenging. type: mcq, tf, fill or order.");
    L.push("- Write maths with single dollar signs, for example $\\frac{3}{4}$ or $4\\ \\text{cm}$. Use plain text for simple numbers.");
    L.push("- Every question must have exactly ONE correct answer. Check each calculation twice. Do not repeat a question.");
    L.push("- explanation: required. One or two clear sentences with the working, saying WHY the answer is right (the student reads it after the test).");
    L.push("- mcq: fill optionA to optionD (at least two, in order, all different). answer = the letter A, B, C or D. Spread the correct letter around. Leave items, acceptedAnswers and slips empty.");
    L.push("- tf: answer = true or false. Leave the option columns, items, acceptedAnswers and slips empty.");
    L.push("- fill: answer = the correct value (no units inside the answer if you can avoid it). acceptedAnswers = other accepted forms separated by | (for example 5.0|5.00), or empty. Leave the option columns and items empty.");
    L.push("- order: items = the values in a SHUFFLED order separated by |. answer = the same values in the CORRECT order separated by |.");
    L.push("- errA to errD (mcq only): for every WRONG option write the mistake tag that explains why a student would pick it. Leave the correct option's tag empty. Make wrong options come from real mistakes, not random numbers.");
    L.push("- slips (fill and order, optional): common wrong answers with their tag, written wrong~TAG and separated by ; for example 4.00~CARRY");
    PromptKit.tagLines(state, PromptKit.picked("pg-tag"), c.cls).forEach(function (x) { L.push(x); });
    L.push("- Do not add any other column. Do not number the questions.");
    return L.join("\n");
  }
  function refresh() {
    var total = num("pg-mcq") + num("pg-tf") + num("pg-fill") + num("pg-order");
    var sum = num("pg-easy", 100) + num("pg-medium", 100) + num("pg-challenging", 100);
    var hint = $("pg-hint"); hint.textContent = total + " questions. Difficulty adds up to " + sum + "% " + (sum === 100 ? "✓" : "(should be 100)"); hint.className = "hint" + (sum === 100 ? "" : " hint--bad");
    $("pg-out").value = build();
  }
  function drawTags() { PromptKit.renderTags($("pg-tags"), state, $("n-class").value, refresh, "pg-tag"); }

  /* ---------- saved patterns ---------- */
  function config() { var c = {}; NUM.forEach(function (id) { c[id.replace("pg-", "")] = num(id, 200); }); c.tags = PromptKit.picked("pg-tag"); c.notes = $("pg-notes").value.trim().slice(0, 400); return c; }
  function apply(p) {
    var c = p.config || {};
    NUM.forEach(function (id) { var v = c[id.replace("pg-", "")]; $(id).value = v === undefined ? "" : String(v); });
    if (p.classLevel && $("n-class").querySelector('option[value="' + p.classLevel + '"]')) { $("n-class").value = String(p.classLevel); $("n-class").dispatchEvent(new Event("change")); }
    drawTags(); Array.prototype.forEach.call(document.querySelectorAll('input[name="pg-tag"]'), function (i) { i.checked = (c.tags || []).indexOf(i.value) !== -1; });
    $("pg-notes").value = c.notes || "";
    if (p.chapter && !$("n-chapter").value.trim()) $("n-chapter").value = p.chapter;
    if (p.topic && !$("n-topic").value.trim()) $("n-topic").value = p.topic;
    $("pg-name").value = p.name; refresh();
  }
  function drawPatterns(selectId) {
    var sel = clear($("pg-saved")); var o0 = h("option", "", patterns.length ? "Saved patterns…" : "No saved patterns yet"); o0.value = ""; sel.appendChild(o0);
    patterns.forEach(function (p) { var o = h("option", "", p.name); o.value = p.patternId; sel.appendChild(o); });
    if (selectId) sel.value = selectId;
    $("pg-del").hidden = !sel.value;
  }
  function selected() { var id = $("pg-saved").value; return patterns.filter(function (p) { return p.patternId === id; })[0]; }
  function loadPatterns() { return Api.staff.listPatterns().then(function (r) { patterns = r.patterns || []; drawPatterns(); }).catch(function () { drawPatterns(); }); }
  function savePattern() {
    var msg = $("pg-msg"), btn = $("pg-save"); UI.clear(msg);
    var name = $("pg-name").value.trim(); if (name.length < 3) { UI.say(msg, "Give the pattern a name (3 letters or more).", "bad"); return; }
    var c = ctx(), existing = patterns.filter(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })[0];
    var f = { name: name, chapter: c.chapter, topic: c.topic, config: config() }; if (parseInt(c.cls, 10)) f.classLevel = parseInt(c.cls, 10); if (existing) f.patternId = existing.patternId;
    UI.busy(btn, true, "Saving…");
    Api.staff.savePattern(f).then(function (r) { UI.busy(btn, false); UI.say(msg, "Pattern saved.", "ok"); return Api.staff.listPatterns().then(function (l) { patterns = l.patterns || []; drawPatterns(r.pattern && r.pattern.patternId); }); }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  }
  function removePattern() {
    var p = selected(); if (!p) return; var msg = $("pg-msg");
    Api.staff.deletePattern(p.patternId).then(function () { patterns = patterns.filter(function (x) { return x.patternId !== p.patternId; }); drawPatterns(); UI.say(msg, "Pattern deleted.", "ok"); }).catch(function (e) { UI.say(msg, e.message, "bad"); });
  }

  /* called by test-new.js when the form opens; opts = the answer of staff/assessmentOptions (tags + tagGroups) */
  function init(opts) {
    state = { tags: (opts && opts.tags) || [], groups: (opts && opts.tagGroups) || [] };
    if (!wired) {
      wired = true;
      NUM.forEach(function (id) { $(id).addEventListener("input", refresh); });
      ["n-chapter", "n-topic"].forEach(function (id) { $(id).addEventListener("input", refresh); });
      $("n-class").addEventListener("change", function () { drawTags(); refresh(); });
      $("pg-notes").addEventListener("input", refresh); $("pg-copy").addEventListener("click", function () { PromptKit.copy($("pg-copy"), $("pg-out")); });
      $("pg-save").addEventListener("click", savePattern); $("pg-del").addEventListener("click", removePattern);
      $("pg-saved").addEventListener("change", function () { var p = selected(); $("pg-del").hidden = !p; if (p) apply(p); });
      $("pg-out").addEventListener("focus", function () { this.select(); });
    }
    drawTags();
    if (!loaded) { loaded = true; loadPatterns(); }
    refresh();
  }
  window.TestPrompt = { init: init, refresh: refresh };
})();
