/* requests.js (staff) — build 14. The inbox of student requests, the question lookup by ID, and the most-asked questions.
   help    : the student did not understand a question -> a short reply (+ optional https link, e.g. a YouTube video)
   recheck : the student thinks a mark is wrong -> look at the answers, change marks / remarks if needed, and reply (marks and reply are saved together)
   All server text is shown as text. A reply link is used only if it starts with https://. */
(function () {
  var $ = UI.$, h = Kit.h, tex = Kit.tex, clear = Kit.clear;
  var status = "open", type = "", data = null;

  function flash(text, kind) { UI.say($("q-flash"), text, kind || "ok"); window.scrollTo(0, 0); }
  function studentLine(s) { return UI.name(s.studentName) + " · Class " + s.classLevel + s.section; }
  function fmtMarks(n) { return String(Math.round(n * 10) / 10); }
  function scoreText(s) { return s ? fmtMarks(s.marks) + " / " + fmtMarks(s.total) + " marks (" + s.pct + "%)" : ""; }
  function changeLine(c) {
    var p = [];
    if (c.marksBefore !== c.marksAfter) p.push("marks " + (c.marksBefore === null ? "not marked" : fmtMarks(c.marksBefore)) + " → " + fmtMarks(c.marksAfter) + " of " + fmtMarks(c.max));
    if (c.remarkBefore !== c.remarkAfter) p.push("remark: " + (c.remarkAfter ? "“" + c.remarkAfter + "”" : "removed"));
    return c.questionId + ": " + p.join("; ");
  }

  /* ---------- filters ---------- */
  function filters() {
    var f = clear($("q-filters")), c = data.counts;
    [["open", "Waiting", c.open], ["answered", "Answered", c.answered], ["closed", "Closed", c.closed], ["all", "All", c.open + c.answered + c.closed]].forEach(function (x) {
      var b = h("button", "chip chip--btn" + (status === x[0] ? " is-on" : ""), x[1] + " (" + x[2] + ")"); b.type = "button"; b.setAttribute("aria-pressed", status === x[0] ? "true" : "false");
      b.addEventListener("click", function () { status = x[0]; load(); }); f.appendChild(b);
    });
    var t = clear($("q-types"));
    [["", "All types"], ["help", "Help on a question"], ["recheck", "Recheck of marks"]].forEach(function (x) {
      var b = h("button", "chip chip--btn" + (type === x[0] ? " is-on" : ""), x[1]); b.type = "button"; b.setAttribute("aria-pressed", type === x[0] ? "true" : "false");
      b.addEventListener("click", function () { type = x[0]; load(); }); t.appendChild(b);
    });
  }

  /* ---------- one request ---------- */
  function replyForm(r, extra) {
    var form = h("form", "reply"); form.noValidate = true;
    var l1 = h("label", "", "Your reply to the student"), ta = h("textarea", "input input--written"); ta.rows = 3; ta.maxLength = 1000; ta.id = "rp-" + r.requestId; l1.setAttribute("for", ta.id);
    ta.value = r.response || "";
    var l2 = h("label", "", "Link (optional — a video or a page; must start with https://)"), lk = h("input", "input"); lk.id = ta.id + "-l"; l2.setAttribute("for", lk.id); lk.maxLength = 300; lk.type = "url"; lk.value = r.responseLink || ""; lk.placeholder = "https://";
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true;
    var send = h("button", "btn btn--small", r.status === "answered" ? "Update reply" : (r.type === "recheck" ? "Save marks and reply" : "Send reply")); send.type = "submit";
    form.appendChild(l1); form.appendChild(ta); form.appendChild(l2); form.appendChild(lk);
    if (extra) form.appendChild(extra.el);
    form.appendChild(msg); var acts = h("div", "actions"); acts.appendChild(send); form.appendChild(acts);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault(); UI.clear(msg);
      var text = ta.value.trim(), link = lk.value.trim(), changes = [];
      if (text.length < 2) { UI.say(msg, "Write a short reply (at least 2 letters).", "bad"); ta.focus(); return; }
      if (link && !/^https:\/\//i.test(link)) { UI.say(msg, "The link must start with https://", "bad"); lk.focus(); return; }
      if (extra) { try { changes = extra.read(); } catch (e) { UI.say(msg, e.message, "bad"); return; } }
      UI.busy(send, true, "Saving…");
      Api.staff.respondRequest(r.requestId, text, link, changes).then(function (res) {
        UI.busy(send, false);
        flash("Reply sent to " + UI.name(r.student.studentName) + "." + (res.changed ? " " + res.changed + " answer(s) changed; the score is updated." : (r.type === "recheck" ? " No marks were changed." : "")), "ok");
        load();
      }).catch(function (e) { UI.busy(send, false); UI.say(msg, e.message, "bad"); });
    });
    return form;
  }

  /* the answers the student asked to recheck, each with marks + remark fields (loaded only when the teacher opens them) */
  function recheckBox(r, holder) {
    var box = h("div", "recheck"), state = { rows: [] };
    var open = h("button", "btn btn--small btn--ghost", "Open the answers"); open.type = "button";
    var area = h("div"); box.appendChild(open); box.appendChild(area);
    var api = { el: box, read: function () { var out = []; state.rows.forEach(function (x) { var c = x.read(); if (c) out.push(c); }); return out; } };
    open.addEventListener("click", function () {
      UI.busy(open, true, "Loading…");
      Api.staff.studentAssessmentReport(r.assessmentId, r.student.studentId, r.attemptId).then(function (rep) {
        UI.busy(open, false); open.hidden = true; clear(area); state.rows = [];
        var want = r.questionIds && r.questionIds.length ? r.questionIds : null;
        var list = (rep.answers || []).filter(function (a) { return !want || want.indexOf(a.questionId) >= 0; });
        if (rep.attempt) area.appendChild(h("p", "small muted", "Score now: " + (rep.attempt.marksObtained !== undefined ? fmtMarks(rep.attempt.marksObtained) + " / " + fmtMarks(rep.attempt.marksTotal) + " marks (" + rep.attempt.scorePct + "%)" : rep.attempt.scorePct + "%") + (want ? "" : " · the whole test was asked to be rechecked")));
        list.forEach(function (a, i) {
          var c = h("article", "ans ans--" + (a.pending ? "pending" : (a.isCorrect ? "right" : "wrong")));
          var top = h("div", "ans__top"); top.appendChild(h("b", "", a.questionId)); top.appendChild(h("span", "chip", a.topic)); top.appendChild(h("span", "small muted", (a.manual ? "written · " : "") + fmtMarks(a.marksAwarded === null ? 0 : a.marksAwarded) + " / " + fmtMarks(a.marks) + " marks")); c.appendChild(top);
          c.appendChild(tex("div", "qtext qtext--sm", a.question || ""));
          var y = h("div", "ans__line"); y.appendChild(h("b", "", "Answered: "));
          if (a.answered) { if (a.manual) { var w = h("span", "ans__written"); w.textContent = String(a.givenText); y.appendChild(w); } else y.appendChild(tex("span", "", String(a.givenText).replace(/\|/g, " , "))); } else y.appendChild(h("span", "muted", "none"));
          c.appendChild(y);
          var m = h("div", "ans__line ans__line--right"); m.appendChild(h("b", "", a.manual ? "Model answer: " : "Right answer: "));
          if (a.manual) { var mw = h("span", "ans__written"); mw.textContent = String(a.correctText); m.appendChild(mw); } else m.appendChild(tex("span", "", String(a.correctText).replace(/\|/g, " , ")));
          c.appendChild(m);
          var f = AnswerEdit.fields(a, r.requestId); state.rows.push(f); c.appendChild(f.el);
          area.appendChild(c);
        });
        if (!list.length) area.appendChild(h("p", "muted", "These answers are not in the report any more (the test may have been changed)."));
        else area.appendChild(h("p", "hint", "Change a mark only if it was wrong. Leave a card untouched to keep it as it is. The marks you set here are saved together with your reply."));
      }).catch(function (e) { UI.busy(open, false); UI.say($("q-flash"), e.message, "bad"); });
    });
    return api;
  }

  function reqCard(r) {
    var c = h("article", "rowcard req req--" + r.status), top = h("div", "rowcard__top"), left = h("div");
    left.appendChild(h("div", "rowcard__name", studentLine(r.student)));
    left.appendChild(h("div", "small muted", (r.type === "recheck" ? "Recheck · " + (r.testTitle || "test") : "Help on question " + r.targetId + (r.testTitle ? " · " + r.testTitle : "")) + " · " + DT.format(r.createdAt)));
    top.appendChild(left);
    top.appendChild(h("span", "status " + (r.status === "open" ? "status--pending" : (r.status === "answered" ? "status--active" : "status--archived")), r.status === "open" ? "Waiting" : (r.status === "answered" ? "Answered" : "Closed by student")));
    c.appendChild(top);
    if (r.type === "help" && r.questionText) c.appendChild(tex("div", "qtext qtext--sm", r.questionText));
    if (r.type === "recheck") c.appendChild(h("p", "small", r.questionIds.length ? "Questions: " + r.questionIds.join(", ") : "The whole test"));
    if (r.studentNote) { var n = h("p", "small"); n.appendChild(h("b", "", r.type === "recheck" ? "Student’s reason: " : "Student’s note: ")); n.appendChild(document.createTextNode(r.studentNote)); c.appendChild(n); }
    if (r.type === "help" && r.assessmentId && /^T\d/.test(r.targetId)) { var ed = h("a", "small", "Edit this question in the test"); ed.href = "test-questions.html?id=" + encodeURIComponent(r.assessmentId); c.appendChild(ed); }
    if (r.status !== "open" && r.response) {
      var rep = h("div", "ans__why"); rep.appendChild(h("b", "", (r.respondedByName ? UI.name(r.respondedByName) : "Teacher") + " replied: ")); var t = h("span", "ans__written"); t.textContent = r.response; rep.appendChild(t);
      if (r.responseLink && /^https:\/\//i.test(r.responseLink)) { var a = h("a", "small", " " + r.responseLink); a.href = r.responseLink; a.target = "_blank"; a.rel = "noopener noreferrer"; rep.appendChild(document.createElement("br")); rep.appendChild(a); }
      c.appendChild(rep);
      if (r.scoreBefore && r.scoreAfter) c.appendChild(h("p", "small", "Score: " + scoreText(r.scoreBefore) + " → " + scoreText(r.scoreAfter)));
      if (r.changes && r.changes.length) { var ul = h("ul", "advice"); r.changes.forEach(function (x) { ul.appendChild(h("li", "small", changeLine(x))); }); c.appendChild(ul); }
    }
    if (r.status === "closed") return c;
    var tog = h("button", "linkbtn", r.status === "open" ? "Reply" : "Reply again / edit"); tog.type = "button"; tog.setAttribute("aria-expanded", "false");
    var holder = h("div"); holder.hidden = true; var built = false;
    tog.addEventListener("click", function () {
      holder.hidden = !holder.hidden; tog.setAttribute("aria-expanded", holder.hidden ? "false" : "true");
      if (!holder.hidden && !built) { built = true; holder.appendChild(replyForm(r, r.type === "recheck" ? recheckBox(r) : null)); }
    });
    c.appendChild(tog); c.appendChild(holder);
    return c;
  }

  function draw() {
    filters();
    var box = clear($("q-list"));
    data.requests.forEach(function (r) { box.appendChild(reqCard(r)); });
    var em = $("q-empty"); em.hidden = data.requests.length > 0;
    em.textContent = status === "open" ? "No request is waiting. Well done!" : "Nothing to show here.";
  }

  function load() {
    UI.clear($("page-msg"));
    return Api.staff.listRequests(status, type).then(function (r) { data = r; $("loading").hidden = true; $("q-wrap").hidden = false; draw(); })
      .catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), e.message, "bad"); });
  }

  /* ---------- question lookup ---------- */
  function lookup(qid) {
    var out = clear($("lk-out")), msg = $("lk-msg"); UI.clear(msg);
    $("lk-id").value = qid;
    var btn = $("lk-go"); UI.busy(btn, true, "Looking…");
    Api.staff.questionLookup(qid).then(function (r) {
      UI.busy(btn, false);
      var q = r.question, c = h("div", "card card--inner");
      c.appendChild(h("p", "small muted", q.questionId + (q.topic ? " · " + q.topic : "") + (q.difficulty ? " · " + (Kit.DIFF[q.difficulty] || q.difficulty) : "") + (r.test ? " · in test: " + r.test.title : " · question bank")));
      c.appendChild(tex("div", "qtext", q.question || ""));
      var ol = h("ul", "advice"), no = 0;
      ["A", "B", "C", "D"].forEach(function (k) { if (q["option" + k]) { no++; ol.appendChild(tex("li", "", k + ". " + q["option" + k])); } });
      if (no) c.appendChild(ol);
      if (q.answer) { var ra = h("p", "small"); ra.appendChild(h("b", "", "Answer: ")); var rv = h("span", q.type === "short" || q.type === "long" ? "ans__written" : ""); if (q.type === "short" || q.type === "long") rv.textContent = String(q.answer); else TeX.set(rv, String(q.answer).replace(/\|/g, " , ")); ra.appendChild(rv); c.appendChild(ra); }
      if (q.explanation) { var ex = h("div", "ans__why"); ex.appendChild(h("b", "", "Why: ")); ex.appendChild(tex("span", "", q.explanation)); c.appendChild(ex); }
      var s = r.stats;
      c.appendChild(h("p", "", s.answered ? s.correct + " of " + s.answered + " students answered it right (" + s.pct + "%)" + (s.waitingMarks ? " · " + s.waitingMarks + " answers wait for marks" : "") : "Nobody has answered it yet" + (s.waitingMarks ? " (" + s.waitingMarks + " answers wait for marks)" : "") + "."));
      c.appendChild(h("p", "", r.flags.requests ? r.flags.students + " student(s) asked for help on it (" + r.flags.open + " still waiting)." : "Nobody has asked for help on it."));
      if (r.test && r.test.canManage) { var ed = h("a", "btn btn--small btn--ghost", "Edit this question in the test"); ed.href = "test-questions.html?id=" + encodeURIComponent(r.test.assessmentId); c.appendChild(ed); }
      out.appendChild(c);
      if (r.requests.length) { var l = h("div", "list"); r.requests.forEach(function (x) { l.appendChild(reqCard(x)); }); out.appendChild(h("h3", "", "Requests on this question")); out.appendChild(l); }
    }).catch(function (e) { UI.busy(btn, false); UI.say(msg, e.message, "bad"); });
  }
  $("lk-form").addEventListener("submit", function (ev) { ev.preventDefault(); var v = $("lk-id").value.trim(); if (v.length < 3) { UI.say($("lk-msg"), "Type the question ID, for example T000012-003.", "bad"); return; } lookup(v); });

  /* ---------- most asked ---------- */
  function flagged() {
    Api.staff.flaggedQuestions().then(function (r) {
      var box = clear($("fl-list")); $("fl-empty").hidden = r.questions.length > 0;
      r.questions.forEach(function (x) {
        var c = h("article", "rowcard"), top = h("div", "rowcard__top"), l = h("div");
        l.appendChild(h("div", "rowcard__name", x.questionId + (x.topic ? " · " + x.topic : "")));
        l.appendChild(h("div", "small muted", x.students + " student" + (x.students === 1 ? "" : "s") + " asked" + (x.open ? " · " + x.open + " waiting" : "")));
        top.appendChild(l); var b = h("button", "btn btn--small btn--ghost", "Look up"); b.type = "button"; b.addEventListener("click", function () { lookup(x.questionId); $("lk-form").scrollIntoView(); }); top.appendChild(b); c.appendChild(top);
        if (x.questionText) c.appendChild(tex("div", "qtext qtext--sm", x.questionText));
        box.appendChild(c);
      });
    }).catch(function () { /* the list is a bonus; the inbox above still works */ });
  }

  Shell.start("requests", false, function () { load(); flagged(); });
})();
