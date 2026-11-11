/* student-cards.js — one student as a card, with the actions the administrator may use.
   Used by the Home page (waiting list) and the Students page.
   StudentCards.render(listEl, students, ctx)  ctx = { isAdmin, classes, sections, say(text, kind), changed() } */
(function () {
  var STATUS_LABEL = { pending: "Waiting", active: "Active", suspended: "Suspended", archived: "Archived" };

  function options(list, selected, prefix) {
    return list.map(function (v) { return '<option value="' + UI.esc(v) + '"' + (String(v) === String(selected) ? " selected" : "") + ">" + UI.esc((prefix || "") + v) + "</option>"; }).join("");
  }

  function cardHtml(s, ctx) {
    var admin = ctx.isAdmin, acts = "", archived = s.status === "archived";
    if (!archived) acts += '<a class="btn btn--small btn--ghost" href="student.html?id=' + encodeURIComponent(s.studentId) + '&c=' + encodeURIComponent(s.classLevel) + '&s=' + encodeURIComponent(s.section || "") + '#issues">Issues' + (s.issueCount ? " (" + s.issueCount + ")" : "") + "</a>";
    if (admin && archived) {
      acts += '<button class="btn btn--small" data-act="restore" type="button">Restore</button>' +
        '<button class="btn btn--small btn--danger" data-act="delopen" type="button">Delete permanently…</button>';
    } else if (admin) {
      if (s.status === "pending") acts += '<button class="btn btn--small" data-act="approve" type="button">Approve</button>';
      if (s.status === "active") acts += '<button class="btn btn--small btn--ghost" data-act="resend" type="button">Send ID email again</button>' +
        '<button class="btn btn--small btn--ghost" data-act="resetpin" type="button">Reset password</button>' +
        '<button class="btn btn--small btn--danger" data-act="suspend" type="button">Suspend</button>';
      if (s.status === "suspended") acts += '<button class="btn btn--small" data-act="reactivate" type="button">Reactivate</button>';
      acts += '<button class="btn btn--small btn--ghost" data-act="edit" type="button">Edit</button>';
      acts += '<button class="btn btn--small btn--ghost" data-act="archive" type="button">Archive</button>';
    }
    return '<article class="rowcard' + (archived ? " rowcard--archived" : "") + '" data-id="' + UI.esc(s.studentId) + '">' +
      '<div class="rowcard__top"><div><div class="rowcard__name">' + UI.esc(UI.name(s.studentName)) + '</div>' +
      '<div class="small muted">Class ' + UI.esc(s.classLevel) + " · Section " + UI.esc(s.section || "—") + '</div></div>' +
      '<span class="status status--' + UI.esc(s.status) + '">' + UI.esc(STATUS_LABEL[s.status] || s.status) + "</span></div>" +
      '<div class="rowcard__meta"><span class="idbox">' + UI.esc(s.studentId) + "</span><span>Father: " + UI.esc(UI.name(s.fatherName)) + " (" + UI.esc(s.fatherOccupation) + ")</span><span>" + UI.esc(s.email) + "</span>" + (archived && s.archivedAt ? "<span>Archived " + UI.esc(DT.dateOnly(s.archivedAt)) + "</span>" : "") + "</div>" +
      (acts ? '<div class="actions">' + acts + "</div>" : "") +
      (admin && archived ? ('<form class="delform" hidden>' +
      '<p class="notice notice--bad"><strong>This cannot be undone.</strong> The student, the login, issues, feedback, test attempts and answers, remarks and points are removed for ever. The Student ID is never given to anybody else.</p>' +
      '<label>Type the Student ID <span class="idbox">' + UI.esc(s.studentId) + '</span> to confirm<input class="input" data-d="confirmId" autocomplete="off" autocapitalize="characters" maxlength="20"></label>' +
      '<label>Administrator password<input class="input" data-d="password" type="password" autocomplete="new-password" maxlength="64"></label>' +
      '<div class="actions"><button class="btn btn--small btn--danger" data-act="delete" type="button">Delete permanently</button><button class="btn btn--small btn--ghost" data-act="delcancel" type="button">Cancel</button></div>' + "</form>") : "") +
      (admin && !archived ? ('<form class="editform" hidden>' +
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
    if ((b = btn("archive"))) UI.confirmTap(b, "Archive? Tap again", function () {
      run(b, Api.staff.archiveStudent(s.studentId), function () { return s.studentName + " is archived: hidden from teachers and logged out. You can restore the student from Status > Archived."; });
    });
    if ((b = btn("restore"))) b.addEventListener("click", function () {
      run(b, Api.staff.restoreStudent(s.studentId), function (r) { return s.studentName + " is restored (status: " + r.status + ")."; });
    });
    var del = card.querySelector(".delform");
    if (del) del.addEventListener("submit", function (e) { e.preventDefault(); });   // Enter must never submit the page; only the red button deletes
    if ((b = btn("delopen"))) b.addEventListener("click", function () { del.hidden = !del.hidden; if (!del.hidden) del.querySelector('[data-d="confirmId"]').focus(); });
    if ((b = btn("delcancel"))) b.addEventListener("click", function () { del.hidden = true; del.reset(); });
    if ((b = btn("delete"))) b.addEventListener("click", function () {
      var id = del.querySelector('[data-d="confirmId"]').value.trim(), pw = del.querySelector('[data-d="password"]').value;
      if (id !== s.studentId) { ctx.say("Type the Student ID exactly as shown: " + s.studentId, "bad"); return; }
      if (!pw) { ctx.say("Enter the administrator password.", "bad"); return; }
      run(b, Api.staff.deleteStudent(s.studentId, id, pw), function () { return s.studentName + " (" + s.studentId + ") was deleted permanently."; });
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
