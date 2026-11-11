/* report.js (staff) — build 13 (marks + written answers). One test: class diagnosis, then one student's answers with the mistake type behind each wrong answer. */
(function () {
  var $ = UI.$, h = Kit.h, tex = Kit.tex, clear = Kit.clear;
  var id = decodeURIComponent((location.search.match(/[?&]id=([A-Za-z0-9-]+)/) || [])[1] || "");
  var current = null, rep = null;
  var STATUS = { submitted: "Submitted", in_progress: "Working now", expired: "Time ran out", not_started: "Not started" };

  function tile(n, l) { var t = h("div", "tile"); t.appendChild(h("div", "tile__n", String(n))); t.appendChild(h("div", "tile__l", l)); return t; }
  function bars(box, map, labelOf) {
    clear(box); var keys = Object.keys(map);
    keys.forEach(function (k) { var b = map[k]; box.appendChild(Kit.bar(labelOf ? labelOf(k) : k, b.correct + " / " + b.total + " · " + b.pct + "%", b.pct)); });
    return keys.length;
  }
  function tags(box, map) {
    clear(box); var keys = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
    keys.forEach(function (k) { var r = h("div", "kvrow"); r.appendChild(h("span", "", Kit.TAG[k] || k)); r.appendChild(h("b", "", map[k] + (map[k] === 1 ? " time" : " times"))); box.appendChild(r); });
    return keys.length;
  }
  function advice(ul, list) { clear(ul); list.forEach(function (x) { var li = h("li"); li.appendChild(h("b", "", x.title)); li.appendChild(h("div", "small", x.text)); ul.appendChild(li); }); }

  /* ---------- class view ---------- */
  function drawClass(r) {
    var a = r.assessment, c = r.counts, s = r.summary;
    $("r-title").textContent = a.title;
    $("r-sub").textContent = "Class " + a.classLevel + a.sections.join(", " + a.classLevel) + " · " + a.chapter + " · " + a.questionCount + " questions · " + a.timeLimitMin + " min";
    var t = clear($("r-tiles"));
    t.appendChild(tile(c.submitted + " / " + c.students, "Submitted")); t.appendChild(tile(c.submitted ? s.averagePct + "%" : "—", "Class average"));
    t.appendChild(tile(s.needSupport, "Need support")); t.appendChild(tile(c.inProgress + c.expired, "Working / timed out"));

    var pn = $("r-pending"), waiting = c.pendingMarking || 0;
    if (pn) {
      clear(pn); pn.hidden = !waiting;
      if (waiting) { pn.appendChild(h("b", "", waiting + " written answer" + (waiting === 1 ? " is" : "s are") + " waiting for your marks. ")); pn.appendChild(h("span", "small", "Until they are marked they are left out of every score. ")); var lk = h("a", "btn btn--small", "Mark them now"); lk.href = "marking.html?id=" + encodeURIComponent(id); pn.appendChild(lk); }
    }
    var mk = $("r-marking-link"); if (mk) { mk.href = "marking.html?id=" + encodeURIComponent(id); mk.hidden = !(a.hasManual || waiting); }
    var sup = clear($("r-support"));
    r.support.forEach(function (x) {
      var d = h("div", "rowcard"), top = h("div", "rowcard__top"); top.appendChild(h("div", "rowcard__name", UI.name(x.studentName))); top.appendChild(h("span", "status status--pending", x.scorePct + "%")); d.appendChild(top);
      d.appendChild(h("p", "small muted", "Section " + x.section + " · " + x.reasons.join(" · ")));
      var b = h("button", "btn btn--small btn--ghost", "See answers"); b.type = "button"; b.addEventListener("click", function () { openStudent(x.studentId); }); d.appendChild(b); sup.appendChild(d);
    });
    if (!r.support.length) sup.appendChild(h("p", "muted", c.submitted ? "No student needs extra support on this test." : "No results yet."));
    $("r-class").hidden = false;
    var any = c.submitted > 0;
    ["r-topics", "r-diff", "r-tags"].forEach(function (x) { clear($(x)); });
    if (any) {
      bars($("r-topics"), s.byTopic);
      $("r-diff-card").hidden = !bars($("r-diff"), s.byDifficulty, function (k) { return Kit.DIFF[k] || k; });
      $("r-tags-card").hidden = !tags($("r-tags"), s.errorTags);
      var hb = clear($("r-hard")); s.hardestQuestions.forEach(function (q) { var d = h("div", "rowcard"); d.appendChild(h("div", "small", q.questionId + " · " + q.topic + " · " + (Kit.DIFF[q.difficulty] || q.difficulty) + " — " + q.correct + "/" + q.total + " right (" + q.pct + "%)")); d.appendChild(tex("div", "qtext qtext--sm", q.question || "")); hb.appendChild(d); });
      $("r-hard-card").hidden = !s.hardestQuestions.length;
      advice($("r-recs"), s.recommendations);
    } else {
      $("r-diff-card").hidden = $("r-tags-card").hidden = $("r-hard-card").hidden = true; $("r-topics").appendChild(h("p", "muted", "No one has submitted yet."));
    }
    var tb = clear($("r-rows"));
    r.students.forEach(function (x) {
      var tr = h("tr"); tr.appendChild(h("td", "", UI.name(x.studentName))); tr.appendChild(h("td", "", x.section));
      var st = h("td"); st.appendChild(h("span", "status " + (x.status === "submitted" ? "status--active" : "status--pending"), STATUS[x.status] || x.status)); if (x.needsSupport) st.appendChild(h("span", "chip chip--gold", "support")); tr.appendChild(st);
      var sc = h("td", "", x.status === "submitted" ? scoreText(x) : "—"); if (x.status === "submitted" && x.pendingCount) sc.appendChild(h("span", "chip chip--pending", x.pendingCount + " to mark")); tr.appendChild(sc);
      var td = h("td"); var b = h("button", "linkbtn", x.status === "not_started" ? "Retake" : "Open"); b.type = "button"; b.addEventListener("click", function () { openStudent(x.studentId); }); td.appendChild(b); tr.appendChild(td); tb.appendChild(tr);
    });
  }

  function scoreText(x) { return x.marksTotal && x.marksTotal !== x.total ? x.marksObtained + " / " + x.marksTotal + " marks (" + x.scorePct + "%)" : x.correct + "/" + x.total + " (" + x.scorePct + "%)"; }

  /* ---------- one student ---------- */
  function ansCard(a, i) {
    var manual = !!a.manual, awarded = a.marksAwarded, full = manual && a.markStatus === "marked" && awarded >= a.marks;
    var kind = !a.answered ? "blank" : manual ? (a.pending ? "pending" : (full ? "right" : (awarded > 0 ? "partial" : "wrong"))) : (a.isCorrect ? "right" : "wrong"), c = h("article", "ans ans--" + kind);
    var label = kind === "pending" ? "⏳ Waiting for marks" : (manual && a.answered ? awarded + " / " + a.marks + " marks" : (kind === "right" ? "✓ Correct" : (kind === "wrong" ? "✗ Wrong" : "— Not answered")));
    var top = h("div", "ans__top"); top.appendChild(h("span", "ans__n", "Q" + (i + 1))); top.appendChild(h("span", "ans__s", label));
    if (a.marks > 1 && !(manual && a.answered)) top.appendChild(h("span", "chip chip--marks", a.marks + " marks"));
    top.appendChild(h("span", "chip", a.topic)); top.appendChild(h("span", "chip chip--" + a.difficulty, Kit.DIFF[a.difficulty] || a.difficulty)); top.appendChild(h("span", "small muted", Kit.mins(a.timeSec))); c.appendChild(top);
    c.appendChild(tex("div", "qtext qtext--sm", a.question || ""));
    var y = h("div", "ans__line"); y.appendChild(h("b", "", "Answered: ")); if (a.answered) { if (manual) { var wr = h("span", "ans__written"); wr.textContent = String(a.givenText); y.appendChild(wr); } else y.appendChild(tex("span", "", String(a.givenText).replace(/\|/g, " , "))); } else y.appendChild(h("span", "muted", "none")); c.appendChild(y);
    if (manual) { var ma = h("div", "ans__line ans__line--right"); ma.appendChild(h("b", "", "Model answer: ")); var mw = h("span", "ans__written"); mw.textContent = String(a.correctText); ma.appendChild(mw); c.appendChild(ma); }
    else if (kind !== "right") { var r = h("div", "ans__line ans__line--right"); r.appendChild(h("b", "", "Right answer: ")); r.appendChild(tex("span", "", String(a.correctText).replace(/\|/g, " , "))); c.appendChild(r); }
    if (manual && a.remark) { var rk = h("div", "ans__remark"); rk.appendChild(h("b", "", "Your remark: ")); rk.appendChild(document.createTextNode(a.remark)); c.appendChild(rk); }
    if (a.errorLabel) c.appendChild(h("div", "small", "Mistake type: " + (Kit.TAG[a.errorTag] || a.errorLabel)));
    if (a.explanation) { var ex = h("div", "ans__why"); ex.appendChild(h("b", "", "Why: ")); ex.appendChild(tex("span", "", a.explanation)); c.appendChild(ex); }
    return c;
  }
  function drawStudent(r) {
    var st = r.student; current = st.studentId;
    $("s-name").textContent = UI.name(st.studentName); $("s-meta").textContent = "Class " + st.classLevel + st.section + " · " + st.studentId + " · attempts used " + r.attempts.length + " of " + r.allowed;
    var body = clear($("s-body"));
    if (!r.attempt) { var c0 = h("div", "card"); c0.appendChild(h("p", "", r.message || "No submitted attempt.")); body.appendChild(c0); return; }
    var at = r.attempt, s = r.summary;
    var c1 = h("div", "card"); c1.appendChild(h("h2", "", "Score: " + scoreText({ correct: at.correct, total: at.total, marksObtained: at.marksObtained, marksTotal: at.marksTotal, scorePct: at.scorePct })));
    if (at.pendingCount) { var pw = h("p", ""); pw.appendChild(h("b", "", at.pendingCount + " written answer" + (at.pendingCount === 1 ? " is" : "s are") + " not marked yet, so the score is not final. ")); var pl = h("a", "btn btn--small", "Mark now"); pl.href = "marking.html?id=" + encodeURIComponent(id); pw.appendChild(pl); c1.appendChild(pw); }
    c1.appendChild(h("p", "muted", "Answered " + at.answered + " of " + at.total + " · time used " + Kit.mins(at.timeUsedSec) + (at.late ? " · handed in just after the limit" : "") + (s.needsSupport ? " · NEEDS SUPPORT: " + s.supportReasons.join("; ") : "")));
    if (s.strongest) c1.appendChild(h("p", "", "Strongest: " + s.strongest + (s.weakest ? " · Weakest: " + s.weakest : ""))); body.appendChild(c1);
    var c2 = h("div", "card"); c2.appendChild(h("h2", "", "Topics")); var tb = h("div"); bars(tb, s.byTopic); c2.appendChild(tb); body.appendChild(c2);
    var c3 = h("div", "card"); c3.appendChild(h("h2", "", "Difficulty")); var db = h("div"); if (bars(db, s.byDifficulty, function (k) { return Kit.DIFF[k] || k; })) { c3.appendChild(db); body.appendChild(c3); }
    var tg = h("div"); if (tags(tg, s.errorTags)) { var c4 = h("div", "card"); c4.appendChild(h("h2", "", "Mistake patterns")); c4.appendChild(tg); body.appendChild(c4); }
    var c5 = h("div", "card"); c5.appendChild(h("h2", "", "Suggested next steps")); var ul = h("ul", "advice"); advice(ul, r.recommendations); c5.appendChild(ul); body.appendChild(c5);
    var c6 = h("div", "card"); c6.appendChild(h("h2", "", "Every answer")); var list = h("div", "answers"); r.answers.forEach(function (a, i) { list.appendChild(ansCard(a, i)); }); c6.appendChild(list); body.appendChild(c6);
  }
  function openStudent(studentId, keepMsg) {
    $("r-class").hidden = true; $("r-student").hidden = false; clear($("s-body")); $("s-name").textContent = "Loading…"; window.scrollTo(0, 0);
    if (!keepMsg) UI.clear($("s-msg"));
    Api.staff.studentAssessmentReport(id, studentId).then(drawStudent).catch(function (e) { $("s-name").textContent = "Could not load"; UI.say($("s-msg"), e.message, "bad"); });
  }

  Shell.start("tests", false, function () {
    if (!id) { location.replace("tests.html"); return; }
    $("s-back").addEventListener("click", function () { $("r-student").hidden = true; $("r-class").hidden = false; window.scrollTo(0, 0); });
    var rb = $("s-retake"); UI.confirmTap(rb, "Sure? Tap again to allow", function () {
      UI.busy(rb, true, "…");
      Api.staff.allowRetake(id, current).then(function (r) { UI.busy(rb, false); openStudent(current, true); UI.say($("s-msg"), "Done. This student can now take the test " + r.allowed + " time(s) in total. The old attempt is kept.", "ok"); load(); })
        .catch(function (e) { UI.busy(rb, false); UI.say($("s-msg"), e.message, "bad"); });
    });
    load();
  });
  function load() {
    Api.staff.assessmentReport(id).then(function (r) { rep = r; $("loading").hidden = true; $("r-wrap").hidden = false; drawClass(r); }).catch(function (e) { $("loading").hidden = true; UI.say($("page-msg"), e.message, "bad"); });
  }
})();
