/* report-status.js (administrator) — where the weekly report engine stands, pause / resume, and "Build now". The server refuses teachers anyway. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var st = null;

  function say(text, kind) { UI.say($("st-flash"), text, kind); }
  function cycleText(c) { var m = /^(\d{4})(\d{2})(\d{2})$/.exec(c || ""); return m ? DT.dateOnly(m[1] + "-" + m[2] + "-" + m[3] + "T12:00:00Z") : (c || "none yet"); }

  function show(r) {
    st = r;
    $("st-made").textContent = r.reportsInLatest;
    $("st-active").textContent = r.activeStudents;
    $("st-read").textContent = r.readInLatest;
    $("st-state").textContent = r.paused ? "Paused" : "Running";
    var ul = clear($("st-lines"));
    ul.appendChild(h("li", "", "Latest Friday: " + cycleText(r.latestCycle) + ". Reports made: " + r.reportsInLatest + " of " + r.activeStudents + " active students." + (r.reportsInLatest < r.activeStudents && !r.paused ? " (A new student, or one who was suspended on Friday, has no report for that week.)" : "")));
    ul.appendChild(h("li", "", "Last week that was finished by the system: " + cycleText(r.lastCycle) + "."));
    ul.appendChild(h("li", "", "Next reports are made on " + DT.format(r.nextBuildAt) + "."));
    ul.appendChild(h("li", "", r.exactTrigger ? "The Friday 5 PM trigger is installed." : "The Friday 5 PM trigger is NOT installed. Run installWeeklyTrigger() once in the Apps Script editor. Until then the hourly safety check does the work."));
    if (r.paused) ul.appendChild(h("li", "", "Reports are PAUSED: nothing is made until you resume. The missed week is made when you resume."));
    $("st-pause").textContent = r.paused ? "Resume" : "Pause";
    $("st-box").hidden = false; $("loading").hidden = true;
  }

  function load() {
    return Api.staff.reportsStatus().then(show).catch(function (e) {
      $("loading").hidden = true;
      UI.say($("page-msg"), /was not found/.test(e.message || "") ? "Weekly reports are not switched on yet. The backend must be updated first." : e.message, "bad");
    });
  }

  Shell.start("reportstatus", true, function () {
    $("st-refresh").addEventListener("click", function () { UI.busy($("st-refresh"), true, "…"); load().then(function () { UI.busy($("st-refresh"), false); }); });
    $("st-pause").addEventListener("click", function () {
      var b = $("st-pause"), pause = !(st && st.paused);
      UI.busy(b, true, "Saving…");
      Api.staff.setReportsPaused(pause).then(function (r) { UI.busy(b, false); say(r.paused ? "Weekly reports are paused." : "Weekly reports are running again. A missed week is made at the next check or when you press Build now.", r.paused ? "info" : "ok"); return load(); })
        .catch(function (e) { UI.busy(b, false); say(e.message, "bad"); });
    });
    var build = $("st-build");
    UI.confirmTap(build, "Sure? Tap again to build", function () {
      UI.busy(build, true, "Building…");
      Api.staff.buildWeeklyReports().then(function (r) {
        UI.busy(build, false);
        say(r.paused ? "Not built: reports are paused. Press Resume first." : "Built " + r.built + " report(s) for " + cycleText(r.cycleId) + (r.alreadyBuilt ? "; " + r.alreadyBuilt + " were already there." : "."), r.paused ? "bad" : "ok");
        return load();
      }).catch(function (e) { UI.busy(build, false); say(e.message, "bad"); });
    });
    load();
  });
})();
