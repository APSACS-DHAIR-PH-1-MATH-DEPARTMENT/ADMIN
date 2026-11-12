/* class.js — the students of ONE class+section, each as a card with the things a teacher can do
   (disciplinary issues, add an issue, remarks later). The server decides who may see which class. */
(function () {
  var $ = UI.$;
  var qs = location.search;
  var cls = parseInt((qs.match(/[?&]c=(\d+)/) || [])[1] || "0", 10);
  var sec = decodeURIComponent((qs.match(/[?&]s=([A-Za-z0-9]+)/) || [])[1] || "").toUpperCase();
  var all = [], timer = null;
  var STATUS = { pending: "Waiting", active: "Active", suspended: "Suspended" };

  function cardHtml(s) {
    var link = "student.html?id=" + encodeURIComponent(s.studentId) + "&c=" + cls + "&s=" + encodeURIComponent(sec);
    var n = s.issueCount, open = s.openIssueCount;
    return '<article class="rowcard">' +
      '<div class="rowcard__top"><div><div class="rowcard__name">' + UI.esc(UI.name(s.studentName)) + '</div>' +
      '<div class="small muted">Father: ' + UI.esc(UI.name(s.fatherName)) + '</div></div>' +
      '<span class="status status--' + UI.esc(s.status) + '">' + UI.esc(STATUS[s.status] || s.status) + "</span></div>" +
      '<div class="rowcard__meta"><span class="idbox">' + UI.esc(s.studentId) + "</span>" +
      (n ? '<span>' + n + (n === 1 ? " issue" : " issues") + (open ? " · <b>" + open + " open</b>" : " · all resolved") + "</span>" : "<span>No issues</span>") + "</div>" +
      '<div class="actions">' +
      '<a class="btn btn--small" href="' + UI.esc(link) + '#issues">Disciplinary issues' + (n ? " (" + n + ")" : "") + "</a>" +
      '<a class="btn btn--small btn--ghost" href="' + UI.esc(link) + '#add-issue">+ Add issue</a>' +
      '<a class="btn btn--small btn--ghost" href="remarks.html?student=' + encodeURIComponent(s.studentId) + '">Remarks</a>' +
      '<a class="btn btn--small btn--ghost" href="student-report.html?id=' + encodeURIComponent(s.studentId) + '">Report</a>' +
      "</div></article>";
  }

  function draw() {
    var q = $("c-q").value.trim().toLowerCase();
    var list = all.filter(function (s) { return !q || (s.studentName + " " + s.fatherName + " " + s.studentId).toLowerCase().indexOf(q) !== -1; });
    $("student-list").innerHTML = list.map(cardHtml).join("");
    $("class-empty").hidden = all.length > 0;
  }

  Shell.start("classes", false, function () {
    if (!cls || !sec) { location.replace("classes.html"); return; }
    $("class-title").textContent = "Class " + cls + sec;
    if ($("go-copy")) $("go-copy").href = "remarks.html?c=" + cls + "&s=" + encodeURIComponent(sec);
    if ($("go-over")) $("go-over").href = "overview.html?c=" + cls + "&s=" + encodeURIComponent(sec);
    document.title = "Class " + cls + sec + " — Staff Portal";
    Api.staff.listStudents({ classLevel: cls, section: sec }).then(function (r) {
      all = r.students;
      $("class-sub").textContent = r.count + (r.count === 1 ? " student" : " students") + " · Section " + sec;
      draw();
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
    $("c-q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(draw, 200); });
  });
})();
