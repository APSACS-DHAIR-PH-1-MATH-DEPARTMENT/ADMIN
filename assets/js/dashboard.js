/* dashboard.js — Home: counts, per-class table, and the list of registrations waiting for approval. */
(function () {
  var $ = UI.$;
  var me = null, summary = null;

  function say(text, kind) { UI.say($("flash"), text, kind); window.scrollTo(0, $("flash").getBoundingClientRect().top + window.pageYOffset - 80); }

  function load() {
    return Promise.all([Api.staff.summary(), Api.staff.listStudents({ status: "pending" })]).then(function (r) {
      summary = r[0]; var pending = r[1];
      $("t-pending").textContent = summary.totals.pending;
      $("t-active").textContent = summary.totals.active;
      $("t-suspended").textContent = summary.totals.suspended;
      $("class-rows").innerHTML = summary.classes.map(function (c) {
        return "<tr><td>Class " + UI.esc(c.classLevel) + "</td><td>" + c.pending + "</td><td>" + c.active + "</td><td>" + c.suspended + "</td></tr>";
      }).join("");

      var isAdmin = me.role === "admin";
      $("pending-empty").hidden = pending.count > 0;
      $("pending-note").hidden = isAdmin || pending.count === 0;
      $("approve-all").hidden = !isAdmin || pending.count === 0;
      $("approve-all").textContent = "Approve everyone waiting (" + pending.count + ")";
      StudentCards.render($("pending-list"), pending.students, {
        isAdmin: isAdmin, classes: summary.classes.map(function (c) { return c.classLevel; }), sections: summary.sections,
        say: say, changed: function () { load(); }
      });
      $("home").hidden = false;
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("dashboard", false, function (profile) {
    me = profile;
    $("greet").textContent = "Assalam o Alaikum, " + profile.fullName + "!";
    $("hello-sub").textContent = profile.role === "admin" ? "Administrator — all classes" : "Teacher — Class " + profile.classes.join(", ");
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
