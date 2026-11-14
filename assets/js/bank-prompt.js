/* bank-prompt.js (staff) — build 11. AI prompt for a QUESTION BANK CSV: plain practice questions with full solutions, no paper pattern.
   Any class 1-12, any chapter. Nothing is sent to an AI by the site; the teacher copies the prompt. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var state = { tags: [], groups: [] }, ready = false;
  var NUM = ["bp-n", "bp-mcq", "bp-tf", "bp-fill", "bp-order", "bp-easy", "bp-medium", "bp-challenging", "bp-start"];

  function num(id, max) { var n = parseInt($(id).value, 10); return isNaN(n) || n < 0 ? 0 : Math.min(n, max || 500); }
  function slug(t) { return String(t || "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48); }
  function autoRef() { var c = $("bp-class").value, s = slug($("bp-chapter").value); return s ? "c" + c + "-" + s : ""; }
  function autoPrefix() { var c = $("bp-class").value, w = String($("bp-chapter").value || "").toUpperCase().replace(/[^A-Z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean); var code = w.length > 1 ? w.map(function (x) { return x.charAt(0); }).join("").slice(0, 4) : (w[0] || "").slice(0, 4); return "C" + c + (code || "CH"); }

  function build() {
    var cls = $("bp-class").value, chapter = $("bp-chapter").value.trim(), ref = $("bp-ref").value.trim() || autoRef() || "c" + cls + "-chapter-name";
    var prefix = ($("bp-prefix").value.trim() || autoPrefix()).toUpperCase(), start = num("bp-start", 9999) || 1;
    var topics = $("bp-topics").value.split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(Boolean), n = num("bp-n", 200);
    var mcq = num("bp-mcq", 100), tf = num("bp-tf", 100), fill = num("bp-fill", 100), order = num("bp-order", 100);
    var e = num("bp-easy", 100), m = num("bp-medium", 100), ch = num("bp-challenging", 100), notes = $("bp-notes").value.trim();
    var L = [];
    L.push("Write practice questions with full solutions for the question bank of a school mathematics portal. This is plain practice material (no exam paper pattern, no marks).");
    L.push("Class: " + cls + "   |   Chapter: " + (chapter || "(chapter name)") + "   (Federal Board / APSACS, Pakistan)");
    L.push(PromptKit.levelNote(cls));
    L.push("Topics: " + (topics.length ? topics.join("; ") : "all the topics of the chapter, as the Class " + cls + " book divides them") + ". Write " + (n || "N") + " questions for EACH topic" + (topics.length ? "" : " (name each topic yourself, up to 60 characters)") + ", arranged from easy to challenging inside a topic.");
    L.push("Mix of kinds: about " + mcq + "% mcq, " + tf + "% tf (true/false), " + fill + "% fill (type the answer), " + order + "% order (arrange in order). Only these four kinds; do NOT write short-answer or long-answer questions.");
    L.push("Difficulty mix: about " + e + "% easy, " + m + "% medium, " + ch + "% challenging.");
    if (notes) L.push("Extra notes: " + notes);
    L.push("");
    L.push("Reply with ONLY one CSV file, inside a single code block, nothing else. The first line must be exactly:");
    L.push("questionId,classLevel,chapterRef,chapter,topic,subtopic,difficulty,type,question,optionA,optionB,optionC,optionD,answer,items,acceptedAnswers,explanation,errA,errB,errC,errD,slips");
    L.push("");
    L.push("Rules for every row (one question per line):");
    L.push("- questionId: " + prefix + "-" + ("000" + start).slice(-3) + ", then " + prefix + "-" + ("000" + (start + 1)).slice(-3) + " and so on (continue the numbers across topics, never repeat an ID). classLevel = " + cls + " on every row. chapterRef = " + ref + " on every row. chapter = " + (chapter || "the chapter name") + " on every row.");
    L.push("- topic: up to 60 characters. subtopic: optional, up to 80 characters. difficulty: easy, medium or challenging. type: mcq, tf, fill or order.");
    L.push("- Put a field in double quotes if it contains a comma, and write a quote inside a field as \"\".");
    L.push("- Write maths with single dollar signs, for example $\\frac{3}{4}$ or $4\\ \\text{cm}$. Use plain text for simple numbers.");
    L.push("- Every question must have exactly ONE correct answer. Check each calculation twice. Do not repeat a question.");
    L.push("- explanation: required. The full worked solution in clear short steps, ending with the answer (the student reads it as the solution).");
    L.push("- mcq: fill optionA to optionD (at least two, in order, all different). answer = the letter A, B, C or D. Spread the correct letter around. Leave items, acceptedAnswers and slips empty.");
    L.push("- tf: answer = true or false. Leave the option columns, items, acceptedAnswers and slips empty.");
    L.push("- fill: answer = the correct value. acceptedAnswers = other accepted forms separated by | (for example 5.0|5.00), or empty. Leave the option columns and items empty.");
    L.push("- order: items = the values in a SHUFFLED order separated by |. answer = the same values in the CORRECT order separated by |.");
    if (order) PromptKit.orderLines().forEach(function (x) { L.push(x); });
    L.push("- errA to errD (mcq only): for every WRONG option write the mistake tag that explains why a student would pick it. Leave the correct option's tag empty. Make wrong options come from real mistakes, not random numbers.");
    L.push("- slips (fill and order, optional): common wrong answers with their tag, written wrong~TAG and separated by ; for example 4.00~CARRY");
    PromptKit.tagLines(state, PromptKit.picked("bp-tag"), cls).forEach(function (x) { L.push(x); });
    L.push("- Do not add any other column.");
    return L.join("\n");
  }
  function refresh() {
    var mix = num("bp-mcq", 100) + num("bp-tf", 100) + num("bp-fill", 100) + num("bp-order", 100), sum = num("bp-easy", 100) + num("bp-medium", 100) + num("bp-challenging", 100);
    var hint = $("bp-hint"); hint.textContent = "Kinds add up to " + mix + "% " + (mix === 100 ? "✓" : "(should be 100)") + ". Difficulty adds up to " + sum + "% " + (sum === 100 ? "✓" : "(should be 100)") + ".";
    hint.className = "hint" + (mix === 100 && sum === 100 ? "" : " hint--bad");
    $("bp-ref").placeholder = autoRef() || "filled from the chapter name"; $("bp-prefix").placeholder = autoPrefix();
    $("bp-out").value = build();
  }
  function drawTags() { PromptKit.renderTags($("bp-tags"), state, $("bp-class").value, refresh, "bp-tag"); }

  function init() {
    if (ready) return; ready = true;
    for (var c = 1; c <= 12; c++) { var o = h("option", "", "Class " + c); o.value = String(c); $("bp-class").appendChild(o); }
    $("bp-class").value = "6";
    ["bp-chapter", "bp-ref", "bp-prefix", "bp-topics", "bp-notes"].forEach(function (id) { $(id).addEventListener("input", refresh); });
    NUM.forEach(function (id) { $(id).addEventListener("input", refresh); });
    $("bp-class").addEventListener("change", function () { drawTags(); refresh(); });
    $("bp-copy").addEventListener("click", function () { PromptKit.copy($("bp-copy"), $("bp-out")); });
    $("bp-out").addEventListener("focus", function () { this.select(); });
    Api.staff.assessmentOptions().then(function (o) { state = { tags: o.tags || [], groups: o.tagGroups || [] }; drawTags(); refresh(); }).catch(function (e) { UI.say($("bp-msg"), "Could not load the mistake patterns: " + e.message, "bad"); refresh(); });
    drawTags(); refresh();
  }
  window.BankPrompt = { init: init };
})();
