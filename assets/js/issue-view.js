/* issue-view.js — draws a list of disciplinary issues with their actions (what was done, by whom, when),
   and the buttons staff use on them. Used by student.js.
   IssueView.render(listEl, issues, ctx)
     ctx = { options: {categories, severities, actionTypes, takenBy}, isAdmin, say(text, kind), changed() } */
(function () {
  var SEV = { minor: "Minor", moderate: "Moderate", serious: "Serious" };

  function opts(list, selected) {
    return list.map(function (v) { return '<option value="' + UI.esc(v) + '"' + (v === selected ? " selected" : "") + ">" + UI.esc(v) + "</option>"; }).join("");
  }
  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }

  function actionHtml(a) {
    return '<li class="tl__item"><div class="tl__head"><span class="chip ' + (a.takenBy === "school" ? "chip--gold" : "") + '">' + (a.takenBy === "school" ? "School" : "Teacher") + "</span> <b>" + UI.esc(a.actionType) + "</b></div>" +
      (a.note ? '<div class="tl__note">' + UI.esc(a.note) + "</div>" : "") +
      '<div class="small muted">' + UI.esc(DT.format(a.takenAt)) + " · recorded by " + UI.esc(a.actorName) + "</div></li>";
  }

  function issueHtml(i, ctx) {
    var o = ctx.options, open = i.status === "open";
    return '<article class="issue issue--' + UI.esc(i.severity) + '" data-id="' + UI.esc(i.issueId) + '">' +
      '<div class="rowcard__top"><div><div class="rowcard__name">' + UI.esc(i.title) + '</div>' +
      '<div class="small muted">' + UI.esc(i.category) + " · <b>" + UI.esc(SEV[i.severity] || cap(i.severity)) + "</b></div></div>" +
      '<span class="status status--' + (open ? "pending" : "active") + '">' + (open ? "Open" : "Resolved") + "</span></div>" +
      '<div class="issue__when"><b>Happened:</b> ' + UI.esc(DT.format(i.occurredAt)) + '<br><span class="small muted">Reported by ' + UI.esc(i.reportedByName) + " on " + UI.esc(DT.format(i.createdAt)) +
      (i.resolvedAt && !open ? " · resolved " + UI.esc(DT.format(i.resolvedAt)) : "") + "</span></div>" +
      (i.description ? '<p class="issue__desc">' + UI.esc(i.description) + "</p>" : "") +
      '<div class="label">What was done</div>' +
      (i.actions.length ? '<ol class="tl">' + i.actions.map(actionHtml).join("") + "</ol>" : '<p class="small muted">No action recorded yet.</p>') +
      '<div class="actions">' +
      '<button class="btn btn--small" data-act="addaction" type="button">+ Record an action</button>' +
      '<button class="btn btn--small btn--ghost" data-act="' + (open ? "resolve" : "reopen") + '" type="button">' + (open ? "Mark resolved" : "Reopen") + "</button>" +
      '<button class="btn btn--small btn--ghost" data-act="edit" type="button">Edit</button>' +
      (ctx.isAdmin ? '<button class="btn btn--small btn--danger" data-act="void" type="button">Remove</button>' : "") + "</div>" +

      '<form class="editform" data-form="action" hidden>' +
      '<div class="formgrid"><div><label>Done by</label><select class="input" data-f="takenBy"><option value="teacher">Teacher</option><option value="school">School</option></select></div>' +
      '<div><label>What was done</label><select class="input" data-f="actionType">' + opts(o.actionTypes, "") + "</select></div></div>" +
      '<label>When <span class="muted">(Pakistan time)</span></label><input class="input" type="datetime-local" data-f="takenAt" value="' + UI.esc(DT.nowInput()) + '">' +
      '<label>Note <span class="muted">(optional)</span></label><textarea class="input input--area" data-f="note" rows="2" maxlength="500"></textarea>' +
      '<div class="actions"><button class="btn btn--small" data-act="saveaction" type="button">Save action</button><button class="btn btn--small btn--ghost" data-act="cancel" type="button">Cancel</button></div></form>' +

      '<form class="editform" data-form="edit" hidden>' +
      '<label>Title</label><input class="input" data-f="title" maxlength="80" value="' + UI.esc(i.title) + '">' +
      '<div class="formgrid"><div><label>Type</label><select class="input" data-f="category">' + opts(o.categories, i.category) + "</select></div>" +
      '<div><label>How serious?</label><select class="input" data-f="severity">' + opts(o.severities, i.severity) + "</select></div></div>" +
      '<label>When it happened <span class="muted">(Pakistan time)</span></label><input class="input" type="datetime-local" data-f="occurredAt" value="' + UI.esc(DT.toInput(i.occurredAt)) + '">' +
      '<label>Details</label><textarea class="input input--area" data-f="description" rows="3" maxlength="1000">' + UI.esc(i.description) + "</textarea>" +
      '<div class="actions"><button class="btn btn--small" data-act="saveedit" type="button">Save changes</button><button class="btn btn--small btn--ghost" data-act="cancel" type="button">Cancel</button></div></form>' +
      "</article>";
  }

  function values(form) {
    var out = {};
    Array.prototype.forEach.call(form.querySelectorAll("[data-f]"), function (el) { out[el.getAttribute("data-f")] = el.value.trim(); });
    return out;
  }

  function wire(card, i, ctx) {
    function btn(a) { return card.querySelector('[data-act="' + a + '"]'); }
    function form(n) { return card.querySelector('[data-form="' + n + '"]'); }
    function run(b, p, okText) {
      if (b) UI.busy(b, true, "Please wait…");
      p.then(function () { ctx.say(okText, "ok"); ctx.changed(); }).catch(function (e) { if (b) UI.busy(b, false); ctx.say(e.message, "bad"); });
    }
    function toggle(name) {
      ["action", "edit"].forEach(function (n) { form(n).hidden = n !== name || !form(n).hidden; });
    }
    btn("addaction").addEventListener("click", function () { toggle("action"); });
    btn("edit").addEventListener("click", function () { toggle("edit"); });
    Array.prototype.forEach.call(card.querySelectorAll('[data-act="cancel"]'), function (b) { b.addEventListener("click", function () { form("action").hidden = true; form("edit").hidden = true; }); });
    var b;
    if ((b = btn("resolve"))) b.addEventListener("click", function () { run(b, Api.staff.setIssueStatus(i.issueId, "resolved"), "Marked as resolved."); });
    if ((b = btn("reopen"))) b.addEventListener("click", function () { run(b, Api.staff.setIssueStatus(i.issueId, "open"), "Reopened."); });
    if ((b = btn("void"))) UI.confirmTap(b, "Sure? Tap again", function () { run(b, Api.staff.voidIssue(i.issueId), "The issue was removed from the lists."); });
    btn("saveaction").addEventListener("click", function () {
      var v = values(form("action"));
      if (!v.takenAt) return ctx.say("Please choose when it was done.", "bad");
      run(btn("saveaction"), Api.staff.addAction({ issueId: i.issueId, takenBy: v.takenBy, actionType: v.actionType, note: v.note, takenAt: v.takenAt }), "Action saved.");
    });
    btn("saveedit").addEventListener("click", function () {
      var v = values(form("edit"));
      if (v.title.length < 3) return ctx.say("Please write a short title.", "bad");
      run(btn("saveedit"), Api.staff.updateIssue(i.issueId, v), "Changes saved.");
    });
  }

  function render(listEl, issues, ctx) {
    listEl.innerHTML = issues.map(function (i) { return issueHtml(i, ctx); }).join("");
    Array.prototype.forEach.call(listEl.querySelectorAll(".issue"), function (card, k) { wire(card, issues[k], ctx); });
  }

  window.IssueView = { render: render };
})();
