/* classes.js — one card per class+section the signed-in staff member is assigned to (the administrator sees all). */
(function () {
  var $ = UI.$;
  Shell.start("classes", false, function (profile) {
    $("classes-sub").textContent = profile.role === "admin"
      ? "All classes and sections. Choose one to see its students."
      : "Your classes: " + (profile.assignments || []).join(", ") + ". Choose one to see its students.";
    Api.staff.summary().then(function (s) {
      $("classes-empty").hidden = s.groups.length > 0;
      $("class-grid").innerHTML = s.groups.map(function (g) {
        return '<a class="classcard" href="class.html?c=' + g.classLevel + "&s=" + encodeURIComponent(g.section) + '">' +
          '<span class="classcard__name">' + UI.esc(g.key) + "</span>" +
          '<span class="classcard__sub">Class ' + UI.esc(g.classLevel) + " · Section " + UI.esc(g.section) + "</span>" +
          '<span class="classcard__stats"><span>' + g.total + (g.total === 1 ? " student" : " students") + "</span>" +
          (g.openIssues ? '<span class="chip chip--gold">' + g.openIssues + " open issue" + (g.openIssues === 1 ? "" : "s") + "</span>" : "") + "</span></a>";
      }).join("");
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  });
})();
