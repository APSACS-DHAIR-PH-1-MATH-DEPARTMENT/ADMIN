/* prompt-kit.js (staff) — build 11. Shared by the two AI-prompt makers (test-prompt.js for tests, bank-prompt.js for the question bank):
   the grouped "mistake patterns" picker (filtered by class level), the wording about the class level, and the Copy button.
   The prompt is plain text made in the browser; nothing is sent to an AI by the site. */
(function () {
  var h = Kit.h, clear = Kit.clear;

  function levelNote(cls) {
    cls = parseInt(cls, 10) || 0;
    if (cls && cls <= 2) return "Use very short sentences, tiny numbers and everyday pictures a young child knows.";
    if (cls && cls <= 4) return "Use simple sentences, small numbers and everyday situations (shopping in rupees, school, family).";
    if (cls && cls <= 6) return "Use clear, simple English and everyday Pakistani situations (rupees, local names, cricket, school). Keep numbers friendly for Class " + cls + " and make the harder questions need two steps.";
    if (cls && cls <= 8) return "Use clear English. Class " + cls + " students can handle two-step and three-step word problems, negative numbers and basic algebra where the chapter has them; stay inside what the Federal Board Class " + cls + " book teaches.";
    if (cls && cls <= 10) return "Use board-exam style for Class " + cls + ": precise wording, formula-based and multi-step questions, but only content from the Federal Board Class " + cls + " book.";
    if (cls) return "Use board-exam style for Class " + cls + ": precise wording and multi-step questions, only content from the Federal Board Class " + cls + " syllabus.";
    return "Match the wording and number sizes to the class level.";
  }

  function visible(g, cls) { cls = parseInt(cls, 10); return !cls || (cls >= g.from && cls <= g.to); }
  function groupsOf(state) {
    if (state.groups && state.groups.length) return state.groups;
    return [{ key: "all", name: "Mistake patterns", from: 1, to: 12 }];
  }
  function tagsOf(state, g) { return state.tags.filter(function (t) { return state.groups && state.groups.length ? t.group === g.key : true; }); }

  /* Draws the grouped tick-boxes into `box`. Keeps what was ticked when it is drawn again (for example after the class changes). */
  function renderTags(box, state, cls, onChange, name) {
    var keep = {}; Array.prototype.forEach.call(box.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { keep[i.value] = true; });
    clear(box);
    groupsOf(state).filter(function (g) { return visible(g, cls); }).forEach(function (g) {
      var list = tagsOf(state, g); if (!list.length) return;
      var wrap = h("div", "taggroup"), head = h("div", "taggroup__h"); head.appendChild(h("b", "", g.name));
      var all = h("button", "linkbtn", "tick all"); all.type = "button";
      var boxes = h("div", "checks");
      list.forEach(function (t) {
        var l = h("label", "check check--inline"), i = h("input"); i.type = "checkbox"; i.name = name; i.value = t.tag; i.checked = !!keep[t.tag]; i.addEventListener("change", onChange);
        l.appendChild(i); l.appendChild(h("span", "", t.label)); boxes.appendChild(l);
      });
      all.addEventListener("click", function () { var ins = boxes.querySelectorAll("input"), on = !Array.prototype.every.call(ins, function (i) { return i.checked; }); Array.prototype.forEach.call(ins, function (i) { i.checked = on; }); onChange(); });
      head.appendChild(all); wrap.appendChild(head); wrap.appendChild(boxes); box.appendChild(wrap);
    });
  }
  function picked(name) { return Array.prototype.map.call(document.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; }); }

  /* Lines for the prompt that tell the AI which tags it may use. */
  function tagLines(state, pickedTags, cls) {
    var byTag = {}; state.tags.forEach(function (t) { byTag[t.tag] = t; });
    var L = [];
    if (pickedTags.length) {
      L.push("- Mistake tags (errA to errD, slips): use ONLY these, choosing the closest one for each wrong option or slip; leave the tag empty if none fits: " + pickedTags.map(function (t) { return t + " (" + (byTag[t] ? byTag[t].label : t) + ")"; }).join(", ") + ".");
    } else {
      L.push("- Mistake tags (errA to errD, slips): use ONLY tags from this list, choosing the closest one for each wrong option or slip; leave the tag empty if none fits. Never invent a tag.");
      groupsOf(state).filter(function (g) { return visible(g, cls); }).forEach(function (g) {
        var list = tagsOf(state, g); if (list.length) L.push("    " + g.name + ": " + list.map(function (t) { return t.tag + " = " + t.label; }).join("; "));
      });
    }
    return L;
  }

  function copy(btn, ta) {
    var orig = btn.getAttribute("data-label") || btn.textContent; btn.setAttribute("data-label", orig);
    function done(ok) { btn.textContent = ok ? "Copied ✓" : "Press Ctrl+C"; setTimeout(function () { btn.textContent = orig; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(function () { done(true); }, function () { ta.select(); done(false); });
    else { ta.select(); try { done(document.execCommand("copy")); } catch (e) { done(false); } }
  }

  /* A <select> of mistake tags grouped by topic area (groups that fit the class first). First option = "no tag". */
  function tagSelect(state, cls, emptyLabel) {
    var s = h("select", "input"), o0 = h("option", "", emptyLabel || "— mistake (optional) —"); o0.value = ""; s.appendChild(o0);
    var gs = groupsOf(state).slice().sort(function (a, b) { return (visible(b, cls) ? 1 : 0) - (visible(a, cls) ? 1 : 0); });
    gs.forEach(function (g) {
      var list = tagsOf(state, g); if (!list.length) return;
      var og = h("optgroup"); og.label = g.name; list.forEach(function (t) { var o = h("option", "", t.label); o.value = t.tag; og.appendChild(o); }); s.appendChild(og);
    });
    return s;
  }

  window.PromptKit = { levelNote: levelNote, renderTags: renderTags, picked: picked, tagLines: tagLines, tagSelect: tagSelect, copy: copy };
})();
