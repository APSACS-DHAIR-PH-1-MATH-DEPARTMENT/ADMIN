/* teachers.js — administrator only: add teachers, choose their classes, suspend / reactivate. */
(function () {
  var $ = UI.$;
  var classes = [], sections = [];

  function say(text, kind) { UI.say($("flash"), text, kind); }

  /* A grid: one row per class, one tick box per section. A teacher can be given any mix, e.g. 7A, 8B and 8C. */
  function grid(chosenPairs) {
    var head = '<div class="pairs__row pairs__row--head"><span></span>' + sections.map(function (s) { return '<span>Section ' + UI.esc(s) + "</span>"; }).join("") + "</div>";
    var rows = classes.map(function (c) {
      return '<div class="pairs__row"><span class="pairs__cls">Class ' + c + "</span>" + sections.map(function (s) {
        var k = c + s;
        return '<label class="pairs__cell"><input type="checkbox" data-pair="' + UI.esc(k) + '"' + (chosenPairs.indexOf(k) !== -1 ? " checked" : "") + '><span class="pairs__k">' + UI.esc(k) + "</span></label>";
      }).join("") + "</div>";
    }).join("");
    return '<div class="pairs">' + head + rows + "</div>";
  }
  function chosen(root) {
    return Array.prototype.map.call(root.querySelectorAll("input[data-pair]:checked"), function (i) { return i.getAttribute("data-pair"); });
  }

  function cardHtml(t) {
    var isAdmin = t.role === "admin";
    var status = t.status === "active" ? (isAdmin || t.hasPin ? "Active" : "Waiting for PIN") : "Suspended";
    var acts = '<button class="btn btn--small btn--ghost" data-act="edit" type="button">Edit</button>';
    if (!isAdmin) acts += t.status === "active"
      ? '<button class="btn btn--small btn--danger" data-act="suspend" type="button">Suspend</button>'
      : '<button class="btn btn--small" data-act="reactivate" type="button">Reactivate</button>';
    return '<article class="rowcard" data-id="' + UI.esc(t.teacherId) + '">' +
      '<div class="rowcard__top"><div><div class="rowcard__name">' + UI.esc(t.fullName) + '</div><div class="small muted">' + UI.esc(t.email) + "</div></div>" +
      '<span class="status status--' + (t.status === "active" ? "active" : "suspended") + '">' + UI.esc(status) + "</span></div>" +
      '<div class="rowcard__meta"><span>' + (isAdmin ? "Administrator — all classes and sections" : "Teacher — " + UI.esc(t.assignments.join(", "))) + "</span></div>" +
      '<div class="actions">' + acts + "</div>" +
      '<form class="editform" hidden><label>Full name<input class="input" data-f="fullName" value="' + UI.esc(t.fullName) + '" maxlength="80"></label>' +
      (isAdmin ? "" : '<div class="label">Classes and sections</div>' + grid(t.assignments)) +
      '<div class="actions"><button class="btn btn--small" data-act="save" type="button">Save changes</button><button class="btn btn--small btn--ghost" data-act="cancel" type="button">Cancel</button></div></form></article>';
  }

  function wire(card, t) {
    function btn(a) { return card.querySelector('[data-act="' + a + '"]'); }
    function run(b, p, okText) {
      if (b) UI.busy(b, true, "Please wait…");
      p.then(function () { say(okText, "ok"); load(); }).catch(function (e) { if (b) UI.busy(b, false); say(e.message, "bad"); });
    }
    var form = card.querySelector(".editform"), b;
    btn("edit").addEventListener("click", function () { form.hidden = !form.hidden; });
    btn("cancel").addEventListener("click", function () { form.hidden = true; });
    btn("save").addEventListener("click", function () {
      var fields = { fullName: form.querySelector('[data-f="fullName"]').value.trim() };
      if (t.role !== "admin") fields.assignments = chosen(form);
      run(btn("save"), Api.staff.updateTeacher(t.teacherId, fields), "Saved. " + fields.fullName + " will see the new classes at once.");
    });
    if ((b = btn("suspend"))) UI.confirmTap(b, "Sure? Tap again", function () { run(b, Api.staff.updateTeacher(t.teacherId, { status: "suspended" }), t.fullName + " is suspended and logged out."); });
    if ((b = btn("reactivate"))) b.addEventListener("click", function () { run(b, Api.staff.updateTeacher(t.teacherId, { status: "active" }), t.fullName + " is active again."); });
  }

  function load() {
    return Api.staff.listTeachers().then(function (r) {
      classes = r.classes; sections = r.sections;
      if (!$("t-classes").innerHTML) $("t-classes").innerHTML = grid([]);
      $("t-list").innerHTML = r.teachers.map(cardHtml).join("");
      Array.prototype.forEach.call($("t-list").querySelectorAll(".rowcard"), function (card, i) { wire(card, r.teachers[i]); });
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("teachers", true, function () {
    $("t-add").addEventListener("click", function () {
      var name = $("t-name").value.trim(), email = $("t-email").value.trim(), picked = chosen($("t-classes"));
      if (name.length < 2) return say("Please type the teacher's name.", "bad");
      if (!Auth.isValidEmail(email)) return say("Please type a correct email address.", "bad");
      if (!picked.length) return say("Tick at least one class and section.", "bad");
      UI.busy($("t-add"), true, "Adding…");
      Api.staff.createTeacher(name, email, picked).then(function (r) {
        UI.busy($("t-add"), false);
        say(r.emailSent ? name + " was added. An email with the Set-PIN link was sent to " + r.teacher.email + "."
          : name + " was added, but the email could NOT be sent. Ask them to open the staff login page and use the First time tab with " + r.teacher.email + ".", r.emailSent ? "ok" : "info");
        $("t-name").value = ""; $("t-email").value = "";
        Array.prototype.forEach.call($("t-classes").querySelectorAll("input"), function (i) { i.checked = false; });
        load();
      }).catch(function (e) { UI.busy($("t-add"), false); say(e.message, "bad"); });
    });
    load();
  });
})();
