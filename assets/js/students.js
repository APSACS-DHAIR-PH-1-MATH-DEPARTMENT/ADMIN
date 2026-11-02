/* students.js — every student the signed-in staff member may see, with filters. */
(function () {
  var $ = UI.$;
  var me = null, ctxBase = null, timer = null, requestNo = 0;

  function say(text, kind) { UI.say($("flash"), text, kind); }

  function load() {
    var n = ++requestNo;
    var f = { status: $("f-status").value, classLevel: $("f-class").value, section: $("f-section").value, q: $("f-q").value.trim() };
    Object.keys(f).forEach(function (k) { if (!f[k]) delete f[k]; });
    Api.staff.listStudents(f).then(function (r) {
      if (n !== requestNo) return;   // an older answer arriving late
      $("count").textContent = r.count + (r.count === 1 ? " student" : " students") + (r.count > r.students.length ? " (showing the first " + r.students.length + ")" : "");
      StudentCards.render($("list"), r.students, {
        isAdmin: me.role === "admin", classes: ctxBase.classes, sections: ctxBase.sections, say: say, changed: load
      });
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("students", false, function (profile) {
    me = profile;
    Api.staff.summary().then(function (s) {
      ctxBase = { classes: s.classes.map(function (c) { return c.classLevel; }), sections: s.sections };
      $("f-class").innerHTML += ctxBase.classes.map(function (c) { return '<option value="' + c + '">Class ' + c + "</option>"; }).join("");
      $("f-section").innerHTML += ctxBase.sections.map(function (c) { return '<option value="' + UI.esc(c) + '">Section ' + UI.esc(c) + "</option>"; }).join("");
      ["f-status", "f-class", "f-section"].forEach(function (id) { $(id).addEventListener("change", load); });
      $("f-q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(load, 300); });
      var wanted = (location.search.match(/[?&]status=(pending|active|suspended)/) || [])[1];
      if (wanted) $("f-status").value = wanted;
      load();
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  });
})();
