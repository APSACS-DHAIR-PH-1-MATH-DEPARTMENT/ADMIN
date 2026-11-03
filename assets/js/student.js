/* student.js — one student: add a disciplinary issue, see every issue with what was done about it. */
(function () {
  var $ = UI.$;
  var id = decodeURIComponent((location.search.match(/[?&]id=([^&]+)/) || [])[1] || "");
  var options = null, me = null;

  function say(text, kind) { UI.say($("flash"), text, kind); window.scrollTo(0, $("flash").getBoundingClientRect().top + window.pageYOffset - 80); }

  function load() {
    return Api.staff.listIssues(id).then(function (r) {
      var s = r.student;
      $("st-name").textContent = s.studentName;
      $("st-sub").textContent = "Class " + s.classLevel + s.section + " · Father: " + s.fatherName + " · " + s.studentId;
      document.title = s.studentName + " — Staff Portal";
      $("back-link").href = "class.html?c=" + s.classLevel + "&s=" + encodeURIComponent(s.section || "");
      $("back-link").textContent = "← Class " + s.classLevel + s.section;
      var open = r.issues.filter(function (i) { return i.status === "open"; }).length;
      $("issue-count").textContent = r.issues.length + (open ? " · " + open + " open" : "");
      $("issues-empty").hidden = r.issues.length > 0;
      IssueView.render($("issue-list"), r.issues, { options: options, isAdmin: me.role === "admin", say: say, changed: load });
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("classes", false, function (profile) {
    me = profile;
    if (!/^WHA-STU-\d{7}$/.test(id)) { location.replace("classes.html"); return; }
    Api.staff.issueOptions().then(function (o) {
      options = o;
      $("i-cat").innerHTML = o.categories.map(function (c) { return '<option value="' + UI.esc(c) + '">' + UI.esc(c) + "</option>"; }).join("");
      $("i-sev").innerHTML = o.severities.map(function (c) { return '<option value="' + UI.esc(c) + '">' + UI.esc(c.charAt(0).toUpperCase() + c.slice(1)) + "</option>"; }).join("");
      $("i-when").value = DT.nowInput();
      return load();
    }).then(function () {
      if (location.hash === "#add-issue") { var f = $("add-issue"); if (f) { f.scrollIntoView(); $("i-title").focus(); } }
      if (location.hash === "#issues") { var l = $("issue-list"); if (l) l.scrollIntoView(); }
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });

    $("i-cat").addEventListener("change", function () { if (!$("i-title").value) $("i-title").value = $("i-cat").value === "Other" ? "" : $("i-cat").value; });

    $("issue-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var title = $("i-title").value.trim();
      if (title.length < 3) return say("Please write a short title for the issue.", "bad");
      if (!$("i-when").value) return say("Please choose when it happened.", "bad");
      UI.busy($("i-save"), true, "Saving…");
      Api.staff.addIssue({ studentId: id, title: title, category: $("i-cat").value, severity: $("i-sev").value, occurredAt: $("i-when").value, description: $("i-desc").value.trim() })
        .then(function () {
          UI.busy($("i-save"), false);
          $("i-title").value = ""; $("i-desc").value = ""; $("i-when").value = DT.nowInput();
          say("The issue was saved. The student can now see it on their Disciplinary issues tab.", "ok");
          return load();
        }).catch(function (e) { UI.busy($("i-save"), false); say(e.message, "bad"); });
    });
  });
})();
