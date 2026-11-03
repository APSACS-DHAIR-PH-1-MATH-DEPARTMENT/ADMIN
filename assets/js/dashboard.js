/* dashboard.js — Home: counts, per-class table, and the list of registrations waiting for approval. */
(function () {
  var $ = UI.$;
  var me = null, summary = null;

  function say(text, kind) { UI.say($("flash"), text, kind); window.scrollTo(0, $("flash").getBoundingClientRect().top + window.pageYOffset - 80); }

  function issueRow(i) {
    return '<a class="rowcard rowcard--link" href="student.html?id=' + encodeURIComponent(i.student.studentId) + '">' +
      '<div class="rowcard__top"><div><div class="rowcard__name">' + UI.esc(i.student.studentName) + '</div>' +
      '<div class="small muted">Class ' + UI.esc(i.student.classLevel) + UI.esc(i.student.section) + " · " + UI.esc(i.title) + '</div></div>' +
      '<span class="status status--' + (i.status === "open" ? "pending" : "active") + '">' + (i.status === "open" ? "Open" : "Resolved") + "</span></div>" +
      '<div class="small muted">' + UI.esc(DT.format(i.occurredAt)) + " · reported by " + UI.esc(i.reportedByName) + "</div></a>";
  }

  function load() {
    return Promise.all([Api.staff.summary(), me.role === "admin" ? Api.staff.listStudents({ status: "pending" }) : Promise.resolve(null), Api.staff.listIssues()]).then(function (r) {
      summary = r[0]; var pending = r[1], issues = r[2].issues;
      $("t-pending").textContent = summary.totals.pending;
      $("t-active").textContent = summary.totals.active;
      $("t-suspended").textContent = summary.totals.suspended;
      $("t-issues").textContent = summary.totals.openIssues;
      $("class-rows").innerHTML = summary.groups.map(function (g) {
        return '<tr><td><a href="class.html?c=' + g.classLevel + "&s=" + encodeURIComponent(g.section) + '">Class ' + UI.esc(g.key) + "</a></td><td>" + g.pending + "</td><td>" + g.active + "</td><td>" + g.suspended + "</td><td>" + g.openIssues + "</td></tr>";
      }).join("");
      $("issues-empty").hidden = issues.length > 0;
      $("issue-list").innerHTML = issues.slice(0, 8).map(issueRow).join("");

      var isAdmin = me.role === "admin";
      $("pending-card").hidden = !isAdmin;
      if (isAdmin && pending) {
        $("pending-empty").hidden = pending.count > 0;
        $("pending-note").hidden = true;
        $("approve-all").hidden = pending.count === 0;
        $("approve-all").textContent = "Approve everyone waiting (" + pending.count + ")";
        StudentCards.render($("pending-list"), pending.students, {
          isAdmin: true, classes: summary.groups.map(function (g) { return g.classLevel; }).filter(function (c, k, arr) { return arr.indexOf(c) === k; }), sections: summary.sections,
          say: say, changed: function () { load(); }
        });
      }
      $("home").hidden = false;
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("dashboard", false, function (profile) {
    me = profile;
    $("greet").textContent = "Assalam o Alaikum, " + profile.fullName + "!";
    $("hello-sub").textContent = profile.role === "admin" ? "Administrator — all classes and sections" : "Teacher — " + (profile.assignments || []).join(", ");
    var all = $("approve-all");
    UI.confirmTap(all, "Sure? Tap again to approve all", function () {
      UI.busy(all, true, "Approving…");
      Api.staff.approveAllPending().then(function (r) {
        UI.busy(all, false);
        var text = r.approved + " student(s) approved.";
        if (r.stoppedForMailQuota) text += " Stopped because the daily email limit is nearly used up; " + r.remaining + " still waiting — approve them tomorrow.";
        if (r.emailFailed.length) text += " Emails not sent for: " + r.emailFailed.join(", ") + " (give these IDs to the parents yourself).";
        say(text, r.emailFailed.length || r.stoppedForMailQuota ? "info" : "ok");
        load();
      }).catch(function (e) { UI.busy(all, false); say(e.message, "bad"); });
    });
    load();
  });
})();
