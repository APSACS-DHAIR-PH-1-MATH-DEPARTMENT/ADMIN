/* marking.js (staff) — build 13. The marking screen: the written (short / long) answers of ONE test, grouped by question.
   The teacher gives marks (0 .. the question's marks, half marks allowed) and an optional remark, one answer at a time. The student's text is
   always shown as plain text. Saving re-totals that student's attempt on the server at once. */
(function () {
  var $ = UI.$, h = Kit.h, tex = Kit.tex, clear = Kit.clear;
  var id = decodeURIComponent((location.search.match(/[?&]id=([A-Za-z0-9-]+)/) || [])[1] || "");
  var data = null, showAll = false;

  function flash(text, kind) { UI.say($("m-flash"), text, kind || "ok"); }
  function fmt(n) { return String(Math.round(n * 10) / 10); }

  function counts() {
    var c = clear($("m-counts")), k = data.counts;
    c.appendChild(h("span", "chip chip--pending", k.pending + " waiting"));
    c.appendChild(h("span", "chip chip--marks", k.marked + " marked"));
  }

  function card(it) {
    var c = h("form", "ans mark mark--" + (it.markStatus === "marked" ? "done" : "wait")); c.noValidate = true;
    var top = h("div", "ans__top");
    top.appendChild(h("b", "", UI.name(it.studentName))); top.appendChild(h("span", "small muted", "Section " + it.section));
    var st = h("span", "chip " + (it.markStatus === "marked" ? "chip--marks" : "chip--pending"), it.markStatus === "marked" ? "Marked: " + fmt(it.marksAwarded) + " / " + it.marks : "Waiting");
    top.appendChild(st); c.appendChild(top);
    var a = h("div", "ans__written ans__student"); a.textContent = it.answer; c.appendChild(a);

    var row = h("div", "markrow"), lab = h("label", "", "Marks (0 to " + it.marks + ")"), inp = h("input", "input input--marks");
    var iid = "mk-" + it.attemptId + "-" + it.questionId; inp.id = iid; lab.setAttribute("for", iid);
    inp.type = "number"; inp.min = "0"; inp.max = String(it.marks); inp.step = "0.5"; inp.setAttribute("inputmode", "decimal");
    if (it.markStatus === "marked") inp.value = fmt(it.marksAwarded);
    var quick = h("div", "markquick");
    [["0", 0], ["½", it.marks / 2], ["Full", it.marks]].forEach(function (q) {
      var b = h("button", "btn btn--small btn--ghost", q[0]); b.type = "button"; b.setAttribute("aria-label", "Set marks to " + fmt(q[1]));
      b.addEventListener("click", function () { inp.value = fmt(Math.round(q[1] * 2) / 2); inp.focus(); }); quick.appendChild(b);
    });
    row.appendChild(lab); row.appendChild(inp); row.appendChild(quick); c.appendChild(row);

    var rl = h("label", "", "Remark for the student (optional)"), rid = iid + "-r", rk = h("input", "input"); rk.id = rid; rl.setAttribute("for", rid); rk.maxLength = 300; rk.value = it.remark || ""; rk.placeholder = "e.g. Good method, check the last step";
    c.appendChild(rl); c.appendChild(rk);
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true; c.appendChild(msg);
    var save = h("button", "btn btn--small", it.markStatus === "marked" ? "Update mark" : "Save mark"); save.type = "submit"; var acts = h("div", "actions"); acts.appendChild(save); c.appendChild(acts);

    c.addEventListener("submit", function (ev) {
      ev.preventDefault(); UI.clear(msg);
      var raw = inp.value.trim(), v = Number(raw);
      if (raw === "" || !isFinite(v) || v < 0 || v > it.marks || Math.round(v * 2) !== v * 2) { UI.say(msg, "Enter marks from 0 to " + it.marks + " (steps of 0.5).", "bad"); inp.focus(); return; }
      UI.busy(save, true, "Saving…");
      Api.staff.markAnswer(id, it.attemptId, it.questionId, v, rk.value.trim()).then(function (r) {
        UI.busy(save, false);
        var wasPending = it.markStatus !== "marked";
        it.markStatus = "marked"; it.marksAwarded = r.marksAwarded; it.remark = rk.value.trim();
        if (wasPending) { data.counts.pending = Math.max(0, data.counts.pending - 1); data.counts.marked++; }
        counts();
        c.className = "ans mark mark--done"; st.className = "chip chip--marks"; st.textContent = "Marked: " + fmt(r.marksAwarded) + " / " + it.marks; save.textContent = "Update mark";
        UI.say(msg, "Saved." + (r.pendingLeft ? "" : " This student has nothing left to mark."), "ok");
      }).catch(function (e) { UI.busy(save, false); UI.say(msg, e.message, "bad"); });
    });
    return c;
  }

  function draw() {
    var a = data.assessment;
    $("m-title").textContent = "Marking: " + a.title;
    $("m-sub").textContent = "Class " + a.classLevel + a.sections.join(", " + a.classLevel) + " · " + a.chapter;
    counts();
    var box = clear($("m-list")), empty = $("m-empty");
    if (!data.hasManual) { empty.hidden = false; empty.textContent = "This test has no written (short / long) questions, so there is nothing to mark."; return; }
    if (!data.items.length) { empty.hidden = false; empty.textContent = data.counts.marked ? "Everything is marked. Tick “Also show the answers I have already marked” to look at or correct a mark." : "No student has handed in a written answer yet."; return; }
    empty.hidden = true;
    var lastQ = null, group = null;
    data.items.forEach(function (it) {
      if (it.questionId !== lastQ) {
        lastQ = it.questionId; group = h("section", "card markq");
        var hd = h("div", "ans__top"); hd.appendChild(h("span", "chip", it.type === "long" ? "Long answer" : "Short answer")); hd.appendChild(h("span", "chip chip--marks", it.marks + (it.marks === 1 ? " mark" : " marks"))); if (it.topic) hd.appendChild(h("span", "small muted", it.topic));
        group.appendChild(hd); group.appendChild(tex("div", "qtext", it.question));
        var det = h("details", "qdet"), sm = h("summary", "", "Model answer and worked solution"); det.appendChild(sm);
        var mo = h("div", "ans__line ans__line--right"); mo.appendChild(h("b", "", "Model answer: ")); var mw = h("span", "ans__written"); mw.textContent = it.modelAnswer; mo.appendChild(mw); det.appendChild(mo);
        if (it.explanation) { var ex = h("div", "ans__why"); ex.appendChild(h("b", "", "Worked solution: ")); ex.appendChild(tex("span", "", it.explanation)); det.appendChild(ex); }
        group.appendChild(det); box.appendChild(group);
        det.open = true;
      }
      group.appendChild(card(it));
    });
    if (data.truncated) box.appendChild(h("p", "hint", "Only the first answers are shown. Mark these, then reload the page to see the rest."));
  }

  function load() {
    return Api.staff.markingQueue(id, showAll).then(function (r) { data = r; draw(); $("loading").hidden = true; $("m-wrap").hidden = false; })
      .catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("tests", false, function () {
    if (!id) { $("loading").hidden = true; UI.say($("page-msg"), "No test chosen. Go back to the list of tests.", "bad"); return; }
    $("m-all").addEventListener("change", function () { showAll = this.checked; load(); });
    load();
  });
})();
