/* remarks.js (staff) — copy check sheet for a class, free remarks, and the history (edit your own entries; the administrator can void).
   Every entry says whether the student sees it and whether it is meant for the parent. The server checks scope and every rule again.
   All server text is shown as text. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var me = null, tab = "copy", roster = [], rows = {}, qs = location.search;
  var qStudent = decodeURIComponent((qs.match(/[?&]student=([^&]+)/) || [])[1] || "");
  var qClass = parseInt((qs.match(/[?&]c=(\d+)/) || [])[1] || "0", 10), qSec = decodeURIComponent((qs.match(/[?&]s=([A-Za-z0-9]+)/) || [])[1] || "").toUpperCase();
  var STATUS = { checked: "Copy checked", incomplete: "Copy incomplete", absent: "Absent", not_received: "Copy not received", other: "Other (write a remark)" };
  var STATUS_CLS = { checked: "status--active", incomplete: "status--pending", absent: "status--archived", not_received: "status--suspended", other: "status--archived" };

  function today() { return new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10); }
  function flash(text, k) { UI.say($("flash"), text, k || "ok"); window.scrollTo(0, 0); }
  function fmtDate(d) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); var M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return m ? Number(m[3]) + " " + M[Number(m[2]) - 1] + " " + m[1] : (d || ""); }
  function parseKey(k) { var m = /^(\d+)(.*)$/.exec(k); return { cls: parseInt(m[1], 10), sec: m[2] }; }
  function fillClassSelect(sel, preset) {
    clear(sel); (me.assignments || []).forEach(function (k) { var o = h("option", "", "Class " + k); o.value = k; sel.appendChild(o); });
    if (preset) sel.value = preset;
  }
  function loadRoster(key) {
    var p = parseKey(key);
    return Api.staff.listStudents({ classLevel: p.cls, section: p.sec }).then(function (r) { return (r.students || []).filter(function (s) { return s.status !== "archived"; }); });
  }

  /* ---------- tabs ---------- */
  function drawTabs() {
    var box = clear($("tabs"));
    [["copy", "Copy check"], ["note", "Write a remark"], ["hist", "History"]].forEach(function (x) {
      var b = h("button", "chip chip--btn" + (tab === x[0] ? " is-on" : ""), x[1]); b.type = "button"; b.setAttribute("aria-pressed", tab === x[0] ? "true" : "false");
      b.addEventListener("click", function () { tab = x[0]; show(); }); box.appendChild(b);
    });
  }
  function show() { drawTabs(); ["copy", "note", "hist"].forEach(function (t) { $("tab-" + t).hidden = tab !== t; }); if (tab === "hist") history(); }

  /* ---------- copy check sheet ---------- */
  function sheet() {
    UI.clear($("cc-msg")); var key = $("cc-class").value; if (!key) return;
    loadRoster(key).then(function (list) {
      roster = list; rows = {}; var box = clear($("cc-list")); $("cc-empty").hidden = list.length > 0; $("cc-foot").hidden = list.length === 0;
      list.forEach(function (s) {
        var c = h("article", "rowcard"), top = h("div", "rowcard__top"), left = h("div");
        left.appendChild(h("div", "rowcard__name", UI.name(s.studentName))); left.appendChild(h("div", "small muted", "Father: " + UI.name(s.fatherName)));
        top.appendChild(left);
        var sel = h("select", "input input--status"); sel.setAttribute("aria-label", "Status of " + UI.name(s.studentName));
        var o0 = h("option", "", "— not checked —"); o0.value = ""; sel.appendChild(o0);
        Object.keys(STATUS).forEach(function (k) { var o = h("option", "", STATUS[k]); o.value = k; sel.appendChild(o); });
        top.appendChild(sel); c.appendChild(top);
        var more = h("div", "ccmore"); more.hidden = true;
        var txt = h("input", "input"); txt.maxLength = 500; txt.placeholder = "Remark (optional, required for “Other”)"; txt.setAttribute("aria-label", "Remark for " + UI.name(s.studentName));
        var l1 = h("label", "check check--inline"), show = h("input"); show.type = "checkbox"; show.checked = true; l1.appendChild(show); l1.appendChild(h("span", "", "Show to the student"));
        var l2 = h("label", "check check--inline"), par = h("input"); par.type = "checkbox"; l2.appendChild(par); l2.appendChild(h("span", "", "Tell the parent"));
        var flags = h("div", "checks"); flags.appendChild(l1); flags.appendChild(l2);
        more.appendChild(txt); more.appendChild(flags); c.appendChild(more);
        sel.addEventListener("change", function () { more.hidden = !sel.value; c.classList.toggle("rowcard--set", !!sel.value); count(); });
        rows[s.studentId] = { sel: sel, txt: txt, show: show, par: par, more: more, card: c };
        box.appendChild(c);
      });
      count();
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }
  function count() { var n = 0; Object.keys(rows).forEach(function (id) { if (rows[id].sel.value) n++; }); $("cc-count").textContent = n + " of " + roster.length + " students set."; }
  function setAll(v) { Object.keys(rows).forEach(function (id) { rows[id].sel.value = v; rows[id].more.hidden = !v; rows[id].card.classList.toggle("rowcard--set", !!v); }); count(); }
  function saveSheet() {
    var items = [], bad = "";
    Object.keys(rows).forEach(function (id) {
      var r = rows[id]; if (!r.sel.value) return;
      var text = r.txt.value.trim(), s = roster.filter(function (x) { return x.studentId === id; })[0];
      if (r.sel.value === "other" && text.length < 2) bad = bad || "Write a remark for " + UI.name(s.studentName) + " (status “Other”).";
      items.push({ studentId: id, status: r.sel.value, text: text, showToStudent: r.show.checked, tellParent: r.par.checked });
    });
    if (bad) { UI.say($("cc-msg"), bad, "bad"); return; }
    if (!items.length) { UI.say($("cc-msg"), "Set the status of at least one student first.", "bad"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test($("cc-date").value)) { UI.say($("cc-msg"), "Choose the date of the check.", "bad"); return; }
    UI.busy($("cc-save"), true, "Saving…"); UI.clear($("cc-msg"));
    Api.staff.addRemarks("copy", $("cc-date").value, items).then(function (r) {
      UI.busy($("cc-save"), false); setAll("");
      flash("Saved " + r.added + " entr" + (r.added === 1 ? "y" : "ies") + (r.skipped ? " · " + r.skipped + " already saved, skipped" : "") + ".");
    }).catch(function (e) { UI.busy($("cc-save"), false); UI.say($("cc-msg"), e.message, "bad"); });
  }

  /* ---------- free remark ---------- */
  function fillStudents(selectedId) {
    loadRoster($("nt-class").value).then(function (list) {
      var sel = clear($("nt-student")); list.forEach(function (s) { var o = h("option", "", UI.name(s.studentName) + " — " + s.studentId.slice(-4)); o.value = s.studentId; sel.appendChild(o); });
      if (selectedId) sel.value = selectedId;
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }
  function saveNote(ev) {
    ev.preventDefault(); UI.clear($("nt-msg"));
    var id = $("nt-student").value, text = $("nt-text").value.trim();
    if (!id) { UI.say($("nt-msg"), "Choose a student.", "bad"); return; }
    if (text.length < 2) { UI.say($("nt-msg"), "Write the remark.", "bad"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test($("nt-date").value)) { UI.say($("nt-msg"), "Choose the date.", "bad"); return; }
    UI.busy($("nt-save"), true, "Saving…");
    Api.staff.addRemarks("note", $("nt-date").value, [{ studentId: id, text: text, showToStudent: $("nt-show").checked, tellParent: $("nt-parent").checked }]).then(function () {
      UI.busy($("nt-save"), false); $("nt-text").value = ""; flash("Remark saved.");
    }).catch(function (e) { UI.busy($("nt-save"), false); UI.say($("nt-msg"), e.message, "bad"); });
  }

  /* ---------- history ---------- */
  function entry(r) {
    var c = h("article", "rowcard" + (r.active ? "" : " rowcard--void")), top = h("div", "rowcard__top"), left = h("div");
    left.appendChild(h("div", "rowcard__name", UI.name(r.studentName) + " · Class " + r.classLevel + r.section));
    left.appendChild(h("div", "small muted", fmtDate(r.noteDate) + " · " + (r.kind === "copy" ? "Copy check" : "Remark") + " · by " + UI.name(r.byTeacherName)));
    top.appendChild(left);
    if (r.kind === "copy") top.appendChild(h("span", "status " + (STATUS_CLS[r.status] || ""), STATUS[r.status] || r.status));
    c.appendChild(top);
    if (r.text) c.appendChild(h("p", "ans__written", r.text));
    var flags = h("div", "chiprow");
    flags.appendChild(h("span", "chip" + (r.showToStudent ? " chip--easy" : ""), r.showToStudent ? "Student can see" : "Teachers only"));
    if (r.tellParent) flags.appendChild(h("span", "chip chip--medium", "Tell the parent"));
    if (!r.active) flags.appendChild(h("span", "chip chip--challenging", "Voided"));
    c.appendChild(flags);
    var acts = h("div", "actions");
    if (r.canEdit && r.active) { var eb = h("button", "btn btn--small btn--ghost", "Edit"); eb.type = "button"; eb.addEventListener("click", function () { editForm(c, r); }); acts.appendChild(eb); }
    if (me.role === "admin") {
      var vb = h("button", "btn btn--small btn--ghost", r.active ? "Void" : "Restore"); vb.type = "button";
      vb.addEventListener("click", function () { UI.busy(vb, true, "…"); Api.staff.setRemarkActive(r.remarkId, !r.active).then(function () { flash(r.active ? "Entry voided. The student no longer sees it." : "Entry restored."); history(); }).catch(function (e) { UI.busy(vb, false); flash(e.message, "bad"); }); });
      acts.appendChild(vb);
    }
    if (acts.childNodes.length) c.appendChild(acts);
    return c;
  }
  function editForm(card, r) {
    var f = h("div", "ask__form");
    var sel = null;
    if (r.kind === "copy") { sel = h("select", "input"); Object.keys(STATUS).forEach(function (k) { var o = h("option", "", STATUS[k]); o.value = k; sel.appendChild(o); }); sel.value = r.status; f.appendChild(sel); }
    var ta = h("textarea", "input input--area"); ta.rows = 3; ta.maxLength = 500; ta.value = r.text || ""; f.appendChild(ta);
    var l1 = h("label", "check check--inline"), a = h("input"); a.type = "checkbox"; a.checked = r.showToStudent; l1.appendChild(a); l1.appendChild(h("span", "", "Show to the student"));
    var l2 = h("label", "check check--inline"), b = h("input"); b.type = "checkbox"; b.checked = r.tellParent; l2.appendChild(b); l2.appendChild(h("span", "", "Tell the parent"));
    var cb = h("div", "checks"); cb.appendChild(l1); cb.appendChild(l2); f.appendChild(cb);
    var msg = h("div"); msg.setAttribute("role", "alert"); msg.hidden = true; f.appendChild(msg);
    var row = h("div", "actions"), save = h("button", "btn btn--small", "Save changes"), cancel = h("button", "btn btn--small btn--ghost", "Cancel"); save.type = "button"; cancel.type = "button";
    row.appendChild(save); row.appendChild(cancel); f.appendChild(row);
    cancel.addEventListener("click", function () { history(); });
    save.addEventListener("click", function () {
      var fields = { text: ta.value.trim(), showToStudent: a.checked, tellParent: b.checked }; if (sel) fields.status = sel.value;
      UI.busy(save, true, "Saving…");
      Api.staff.updateRemark(r.remarkId, fields).then(function () { flash("Entry updated."); history(); }).catch(function (e) { UI.busy(save, false); UI.say(msg, e.message, "bad"); });
    });
    card.appendChild(f);
  }
  function history() {
    var f = { kind: $("hs-kind").value };
    if (qStudent) f.studentId = qStudent; else { var p = parseKey($("hs-class").value || "0"); if (p.cls) { f.classLevel = p.cls; if (p.sec) f.section = p.sec; } }
    if ($("hs-from").value) f.from = $("hs-from").value; if ($("hs-to").value) f.to = $("hs-to").value;
    if (me.role === "admin" && $("hs-void").checked) f.includeVoided = true;
    Api.staff.listRemarks(f).then(function (r) {
      var box = clear($("hs-list")); $("hs-empty").hidden = r.remarks.length > 0;
      r.remarks.forEach(function (x) { box.appendChild(entry(x)); });
      if (r.capped) box.appendChild(h("p", "small muted", "Showing the newest " + r.remarks.length + " of " + r.total + ". Narrow the dates to see older ones."));
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("remarks", false, function (profile) {
    me = profile;
    if (!(me.assignments || []).length) { UI.say($("page-msg"), "No class has been assigned to you yet. Please ask the administrator.", "bad"); return; }
    var t = today(); $("cc-date").value = t; $("nt-date").value = t; $("cc-date").max = t; $("nt-date").max = t;
    var preset = qClass && qSec ? qClass + qSec : "";
    ["cc-class", "nt-class", "hs-class"].forEach(function (id) { fillClassSelect($(id), preset); });
    if (me.role === "admin") $("hs-void-l").hidden = false;
    $("cc-class").addEventListener("change", sheet);
    $("nt-class").addEventListener("change", function () { fillStudents(); });
    $("cc-allok").addEventListener("click", function () { setAll("checked"); });
    $("cc-clear").addEventListener("click", function () { setAll(""); });
    $("cc-save").addEventListener("click", saveSheet);
    $("nt-form").addEventListener("submit", saveNote);
    $("hs-go").addEventListener("click", history);
    if (qStudent) {
      if (!/^WHA-STU-\d{7}$/.test(qStudent)) { location.replace("remarks.html"); return; }
      tab = "hist";
      Api.staff.listIssues(qStudent).then(function (r) {
        var s = r.student, key = s.classLevel + (s.section || "");
        ["cc-class", "nt-class", "hs-class"].forEach(function (id) { $(id).value = key; });
        $("hs-student").hidden = false; $("hs-student").textContent = "Showing remarks of " + UI.name(s.studentName) + " (" + key + "). To see the whole class instead, open Remarks from the menu.";
        $("hs-class").disabled = true; sheet(); fillStudents(qStudent); show();
      }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
    } else { sheet(); fillStudents(); show(); }
  });
})();
