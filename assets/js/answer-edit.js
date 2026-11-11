/* answer-edit.js (staff) — build 14. Change the marks and/or the remark of ONE answer after the test was marked
   (used by the Request screen for a recheck and by the test report "Change marks").
   AnswerEdit.fields(answer, key)  -> { el, read() }   read() = null when nothing changed, else { questionId, marks?, remark? } (throws Error with a readable text if a mark is not valid)
   AnswerEdit.panel({ assessmentId, attemptId, answer, onSaved(result) }) -> a "Change marks / remark" button that opens the fields with a Save button
   Everything is built with textContent. The server checks every rule again (marks 0 .. the question's marks in steps of 0.5; only your own classes). */
(function () {
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
  function fmt(n) { return String(Math.round(n * 10) / 10); }

  function fields(a, key) {
    var el = h("div", "adj"), iid = "adj-" + key + "-" + a.questionId;
    var row = h("div", "markrow"), lab = h("label", "", "Marks (0 to " + fmt(a.marks) + ")"), inp = h("input", "input input--marks");
    inp.id = iid; lab.setAttribute("for", iid); inp.type = "number"; inp.min = "0"; inp.max = String(a.marks); inp.step = "0.5"; inp.setAttribute("inputmode", "decimal");
    var start = a.marksAwarded === null || a.marksAwarded === undefined ? "" : fmt(a.marksAwarded);
    inp.value = start;
    var quick = h("div", "markquick");
    [["0", 0], ["½", a.marks / 2], ["Full", a.marks]].forEach(function (q) {
      var b = h("button", "btn btn--small btn--ghost", q[0]); b.type = "button"; b.setAttribute("aria-label", "Set marks to " + fmt(q[1]));
      b.addEventListener("click", function () { inp.value = fmt(Math.round(q[1] * 2) / 2); inp.focus(); }); quick.appendChild(b);
    });
    row.appendChild(lab); row.appendChild(inp); row.appendChild(quick); el.appendChild(row);
    var rl = h("label", "", "Remark for the student (optional)"), rk = h("input", "input"); rk.id = iid + "-r"; rl.setAttribute("for", rk.id); rk.maxLength = 300; rk.value = a.remark || "";
    el.appendChild(rl); el.appendChild(rk);
    return {
      el: el,
      read: function () {
        var out = { questionId: a.questionId }, any = false, raw = inp.value.trim();
        if (raw !== start) {
          var v = Number(raw);
          if (raw === "" || !isFinite(v) || v < 0 || v > a.marks || Math.round(v * 2) !== v * 2) throw new Error(a.questionId + ": enter marks from 0 to " + fmt(a.marks) + " (steps of 0.5).");
          out.marks = v; any = true;
        }
        if (rk.value.trim() !== (a.remark || "")) { out.remark = rk.value.trim(); any = true; }
        return any ? out : null;
      }
    };
  }

  function panel(o) {
    var box = h("div", "adjpanel"), open = h("button", "linkbtn", "Change marks / remark"); open.type = "button"; open.setAttribute("aria-expanded", "false");
    var form = h("div", "adjpanel__form"); form.hidden = true;
    var f = fields(o.answer, o.attemptId), msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true;
    var save = h("button", "btn btn--small", "Save change"); save.type = "button";
    form.appendChild(f.el); form.appendChild(msg); form.appendChild(save);
    open.addEventListener("click", function () { form.hidden = !form.hidden; open.setAttribute("aria-expanded", form.hidden ? "false" : "true"); });
    save.addEventListener("click", function () {
      UI.clear(msg); var c;
      try { c = f.read(); } catch (e) { UI.say(msg, e.message, "bad"); return; }
      if (!c) { UI.say(msg, "Nothing is different yet.", "bad"); return; }
      UI.busy(save, true, "Saving…");
      Api.staff.adjustAnswers(o.assessmentId, o.attemptId, [c]).then(function (r) { UI.busy(save, false); if (o.onSaved) o.onSaved(r); })
        .catch(function (e) { UI.busy(save, false); UI.say(msg, e.message, "bad"); });
    });
    box.appendChild(open); box.appendChild(form);
    return box;
  }

  window.AnswerEdit = { fields: fields, panel: panel };
})();
