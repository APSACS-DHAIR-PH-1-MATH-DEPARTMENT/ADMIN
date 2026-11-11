/* test-prompt.js (staff) — build 10. Makes the "paper pattern -> AI prompt" for a CSV test, and keeps the teacher's saved patterns.
   The prompt is plain text made here in the browser; nothing is sent to an AI by the site. The teacher copies it. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var tags = [], patterns = [], loaded = false;
  var NUM = ["pg-mcq", "pg-tf", "pg-fill", "pg-order", "pg-easy", "pg-medium", "pg-challenging"];

  function num(id, max) { var n = parseInt($(id).value, 10); return isNaN(n) || n < 0 ? 0 : Math.min(n, max || 200); }
  function tagsTicked() { return Array.prototype.map.call(document.querySelectorAll('input[name="pg-tag"]:checked'), function (i) { return i.value; }); }
  function ctx() { return { cls: $("n-class").value, chapter: $("n-chapter").value.trim(), topic: $("n-topic").value.trim() }; }

  function build() {
    var c = ctx(), mcq = num("pg-mcq"), tf = num("pg-tf"), fill = num("pg-fill"), order = num("pg-order"), total = mcq + tf + fill + order;
    var e = num("pg-easy", 100), m = num("pg-medium", 100), ch = num("pg-challenging", 100);
    var pick = tagsTicked(), notes = $("pg-notes").value.trim();
    var L = [];
    L.push("Write " + (total || "N") + " maths questions for a diagnostic test for Class " + (c.cls || "?") + " students (Pakistan, Federal curriculum).");
    L.push("Chapter: " + (c.chapter || "(chapter)") + (c.topic ? "  |  Topic: " + c.topic : ""));
    L.push("Question types: " + mcq + " mcq, " + tf + " tf (true/false), " + fill + " fill (type the answer), " + order + " order (arrange in order).");
    L.push("Difficulty mix: about " + e + "% easy, " + m + "% medium, " + ch + "% challenging.");
    if (pick.length) L.push("Make the wrong options and slips show these kinds of mistakes: " + pick.join(", ") + ".");
    if (notes) L.push("Extra notes: " + notes);
    L.push("");
    L.push("Reply with ONLY one CSV file, inside a single code block, nothing else. The first line must be exactly:");
    L.push("topic,difficulty,type,question,optionA,optionB,optionC,optionD,answer,items,acceptedAnswers,explanation,errA,errB,errC,errD,slips");
    L.push("");
    L.push("Rules for every row (one question per line):");
    L.push("- Put a field in double quotes if it contains a comma, and write a quote inside a field as \"\".");
    L.push("- topic: the sub-topic, up to 60 characters. difficulty: easy, medium or challenging. type: mcq, tf, fill or order.");
    L.push("- Write maths with single dollar signs, for example $\\frac{3}{4}$ or $4\\ \\text{cm}$.");
    L.push("- explanation: required. One or two clear sentences saying WHY the answer is right (the student reads it after the test).");
    L.push("- mcq: fill optionA to optionD (at least two, in order, all different). answer = the letter A, B, C or D. Leave items, acceptedAnswers and slips empty.");
    L.push("- tf: answer = true or false. Leave the option columns, items, acceptedAnswers and slips empty.");
    L.push("- fill: answer = the correct value. acceptedAnswers = other accepted forms separated by | (for example 5.0|5.00), or empty. Leave the option columns and items empty.");
    L.push("- order: items = the values in a SHUFFLED order separated by |. answer = the same values in the CORRECT order separated by |.");
    L.push("- errA to errD (mcq only): for every WRONG option write the mistake tag that explains why a student would pick it. Leave the correct option's tag empty.");
    L.push("- slips (fill and order, optional): common wrong answers with their tag, written wrong~TAG and separated by ; for example 4.00~CARRY");
    L.push("- Use only these tags: " + (tags.length ? tags.map(function (t) { return t.tag + " (" + t.label + ")"; }).join(", ") : "ALIGN, PLACE, CARRY, BORROW, DIGITS, ORDER, CALC, CONCEPT, FORMULA, FACES, ADDED, UNITS, SCALING") + ".");
    L.push("- Do not add any other column. Do not number the questions. Every question must have exactly one correct answer.");
    return L.join("\n");
  }
  function refresh() {
    var total = num("pg-mcq") + num("pg-tf") + num("pg-fill") + num("pg-order");
    var sum = num("pg-easy", 100) + num("pg-medium", 100) + num("pg-challenging", 100);
    var hint = $("pg-hint"); hint.textContent = total + " questions. Difficulty adds up to " + sum + "% " + (sum === 100 ? "✓" : "(should be 100)"); hint.className = "hint" + (sum === 100 ? "" : " hint--bad");
    $("pg-out").value = build();
  }

  function copy() {
    var ta = $("pg-out"), b = $("pg-copy");
    function done(ok) { var o = b.getAttribute("data-label") || "Copy prompt"; b.setAttribute("data-label", o); b.textContent = ok ? "Copied ✓" : "Press Ctrl+C"; setTimeout(function () { b.textContent = o; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(ta.value).then(function () { done(true); }, function () { ta.select(); done(false); }); }
    else { ta.select(); try { done(document.execCommand("copy")); } catch (e) { done(false); } }
  }

  /* ---------- saved patterns ---------- */
  function config() { var c = {}; NUM.forEach(function (id) { c[id.replace("pg-", "")] = num(id, 200); }); c.tags = tagsTicked(); c.notes = $("pg-notes").value.trim().slice(0, 400); return c; }
  function apply(p) {
    var c = p.config || {};
    NUM.forEach(function (id) { var v = c[id.replace("pg-", "")]; $(id).value = v === undefined ? "" : String(v); });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="pg-tag"]'), function (i) { i.checked = (c.tags || []).indexOf(i.value) !== -1; });
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
  function loadPatterns() {
    return Api.staff.listPatterns().then(function (r) { patterns = r.patterns || []; drawPatterns(); }).catch(function () { drawPatterns(); });
  }
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

  var wired = false;
  /* called once by test-new.js when the form opens; list = [{tag,label}] from staff/assessmentOptions */
  function init(tagList) {
    tags = tagList || [];
    if (!wired) {
      wired = true;
      var box = clear($("pg-tags")); tags.forEach(function (t) { var l = h("label", "check check--inline"), i = h("input"); i.type = "checkbox"; i.name = "pg-tag"; i.value = t.tag; i.addEventListener("change", refresh); l.appendChild(i); l.appendChild(h("span", "", t.label)); box.appendChild(l); });
      NUM.forEach(function (id) { $(id).addEventListener("input", refresh); });
      ["n-class", "n-chapter", "n-topic"].forEach(function (id) { $(id).addEventListener("input", refresh); $(id).addEventListener("change", refresh); });
      $("pg-notes").addEventListener("input", refresh); $("pg-copy").addEventListener("click", copy);
      $("pg-save").addEventListener("click", savePattern); $("pg-del").addEventListener("click", removePattern);
      $("pg-saved").addEventListener("change", function () { var p = selected(); $("pg-del").hidden = !p; if (p) apply(p); });
      $("pg-out").addEventListener("focus", function () { this.select(); });
    }
    if (!loaded) { loaded = true; loadPatterns(); }
    refresh();
  }
  window.TestPrompt = { init: init, refresh: refresh };
})();
