/* student-cards.js — one student as a card, with the actions the administrator may use.
   Used by the Home page (waiting list) and the Students page.
   StudentCards.render(listEl, students, ctx)  ctx = { isAdmin, classes, sections, say(text, kind), changed() } */
(function () {
  var STATUS_LABEL = { pending: "Waiting", active: "Active", suspended: "Suspended" };

  function options(list, selected, prefix) {
    return list.map(function (v) { return '<option value="' + UI.esc(v) + '"' + (String(v) === String(selected) ? " selected" : "") + ">" + UI.esc((prefix || "") + v) + "</option>"; }).join("");
  }

  function cardHtml(s, ctx) {
    var admin = ctx.isAdmin, acts = "";
    acts += '<a class="btn btn--small btn--ghost" href="student.html?id=' + encodeURIComponent(s.studentId) + '&c=' + encodeURIComponent(s.classLevel) + '&s=' + encodeURIComponent(s.section || "") + '#issues">Issues' + (s.issueCount ? " (" + s.issueCount + ")" : "") + "</a>";
    if (admin) {
      if (s.status === "pending") acts += '<button class="btn btn--small" data-act="approve" type="button">Approve</button>';
      if (s.status === "active") acts += '<button class="btn btn--small btn--ghost" data-act="resend" type="button">Send ID email again</button>' +
        '<button class="btn btn--small btn--ghost" data-act="resetpin" type="button">Reset password</button>' +
        '<button class="btn btn--small btn--danger" data-act="suspend" type="button">Suspend</button>';
      if (s.status === "suspended") acts += '<button class="btn btn--small" data-act="reactivate" type="button">Reactivate</button>';
      acts += '<button class="btn btn--small btn--ghost" data-act="edit" type="button">Edit</button>';
    }
    return '<article class="rowcard" data-id="' + UI.esc(s.studentId) + '">' +
      '<div class="rowcard__top"><div><div class="rowcard__name">' + UI.esc(s.studentName) + '</div>' +
      '<div class="small muted">Class ' + UI.esc(s.classLevel) + " · Section " + UI.esc(s.section || "—") + '</div></div>' +
      '<span class="status status--' + UI.esc(s.status) + '">' + UI.esc(STATUS_LABEL[s.status] || s.status) + "</span></div>" +
      '<div class="rowcard__meta"><span class="idbox">' + UI.esc(s.studentId) + "</span><span>Father: " + UI.esc(s.fatherName) + " (" + UI.esc(s.fatherOccupation) + ")</span><span>" + UI.esc(s.email) + "</span></div>" +
      (acts ? '<div class="actions">' + acts + "</div>" : "") +
      (admin ? ('<form class="editform" hidden>' +
      '<label>Student name<input class="input" data-f="studentName" value="' + UI.esc(s.studentName) + '" maxlength="80"></label>' +
      "<label>Father's name<input class=\"input\" data-f=\"fatherName\" value=\"" + UI.esc(s.fatherName) + '" maxlength="80"></label>' +
      "<label>Father's occupation<input class=\"input\" data-f=\"fatherOccupation\" value=\"" + UI.esc(s.fatherOccupation) + '" maxlength="80"></label>' +
      '<label>Parent email<input class="input" data-f="email" type="email" value="' + UI.esc(s.email) + '" maxlength="120"></label>' +
      '<label>Class<select class="input" data-f="classLevel">' + options(ctx.classes, s.classLevel, "Class ") + "</select></label>" +
      '<label>Section<select class="input" data-f="section">' + options(ctx.sections, s.section, "Section ") + "</select></label>" +
      '<div class="actions"><button class="btn btn--small" data-act="save" type="button">Save changes</button><button class="btn btn--small btn--ghost" data-act="cancel" type="button">Cancel</button></div>' + "</form>") : "") +
      "</article>";
  }

  function wire(card, s, ctx) {
    function btn(act) { return card.querySelector('[data-act="' + act + '"]'); }
    function run(button, promise, okText) {
      if (button) UI.busy(button, true, "Please wait…");
      promise.then(function (r) { ctx.say(okText(r), "ok"); ctx.changed(); })
        .catch(function (e) { if (button) UI.busy(button, false); ctx.say(e.message, "bad"); });
    }
    var b;
    if ((b = btn("approve"))) b.addEventListener("click", function () {
      run(b, Api.staff.approveStudent(s.studentId), function (r) {
        return r.emailSent ? s.studentName + " approved. The ID email was sent to " + s.email + "."
          : s.studentName + " approved, but the email could NOT be sent. Give the parent this ID yourself: " + s.studentId;
      });
    });
    if ((b = btn("resend"))) b.addEventListener("click", function () {
      run(b, Api.staff.resendApproval(s.studentId), function (r) { return r.emailSent ? "The ID email was sent again to " + s.email + "." : "The email could NOT be sent (mail limit?). ID: " + s.studentId; });
    });
    if ((b = btn("resetpin"))) UI.confirmTap(b, "Sure? Tap again", function () {
      run(b, Api.staff.resetStudentPin(s.studentId), function () { return s.studentName + "'s password was cleared. The parent can set a new one with the First time tab."; });
    });
    if ((b = btn("suspend"))) UI.confirmTap(b, "Sure? Tap again", function () {
      run(b, Api.staff.setStudentStatus(s.studentId, "suspended"), function () { return s.studentName + " is suspended and logged out."; });
    });
    if ((b = btn("reactivate"))) b.addEventListener("click", function () {
      run(b, Api.staff.setStudentStatus(s.studentId, "active"), function () { return s.studentName + " is active again."; });
    });
    var form = card.querySelector(".editform");
    if ((b = btn("edit"))) b.addEventListener("click", function () { form.hidden = !form.hidden; });
    if ((b = btn("cancel"))) b.addEventListener("click", function () { form.hidden = true; });
    if ((b = btn("save"))) b.addEventListener("click", function () {
      var fields = {};
      Array.prototype.forEach.call(form.querySelectorAll("[data-f]"), function (el) {
        var k = el.getAttribute("data-f"), v = el.value.trim();
        fields[k] = k === "classLevel" ? Number(v) : v;
      });
      run(b, Api.staff.updateStudent(s.studentId, fields), function () { return "Details of " + fields.studentName + " were saved."; });
    });
  }

  function render(listEl, students, ctx) {
    listEl.innerHTML = students.map(function (s) { return cardHtml(s, ctx); }).join("");
    Array.prototype.forEach.call(listEl.querySelectorAll(".rowcard"), function (card, i) { wire(card, students[i], ctx); });
  }

  window.StudentCards = { render: render };
})();
