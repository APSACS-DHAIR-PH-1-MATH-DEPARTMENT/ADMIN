/* activity.js — administrator: the activity log (who changed what, and when). Read only. */
(function () {
  var $ = UI.$;
  var timer = null, requestNo = 0;

  /* "archiveStudent" -> "Archive student" */
  function words(action) {
    var t = String(action || "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function rowHtml(e) {
    return '<article class="logrow">' +
      '<div class="logrow__top"><span>' + UI.esc(DT.format(e.at)) + "</span><span>" + UI.esc(UI.name(e.actorName) || e.actorId) + " · " + UI.esc(e.role === "Administrator" ? "Administrator" : "Teacher") + "</span></div>" +
      '<div class="logrow__what">' + UI.esc(words(e.action)) + (e.targetId ? ' <span class="idbox">' + UI.esc(e.targetId) + "</span>" : "") + "</div>" +
      (e.summary ? '<div class="logrow__sum">' + UI.esc(e.summary) + "</div>" : "") +
      (e.oldValue ? '<div class="logrow__old">Before: ' + UI.esc(e.oldValue) + "</div>" : "") +
      "</article>";
  }

  function load() {
    var n = ++requestNo;
    var f = { limit: Number($("f-limit").value) || 150 };
    var a = $("f-action").value.trim(), t = $("f-target").value.trim();
    if (a) f.action = a;
    if (t) f.targetId = t;
    Api.staff.auditLog(f).then(function (r) {
      if (n !== requestNo) return;
      $("count").textContent = r.total + (r.total === 1 ? " entry" : " entries") + (r.total > r.entries.length ? " (showing the newest " + r.entries.length + ")" : "");
      $("list").innerHTML = r.entries.length ? r.entries.map(rowHtml).join("") : '<p class="muted">Nothing logged yet.</p>';
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  Shell.start("activity", true, function () {
    ["f-action", "f-target"].forEach(function (id) { $(id).addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(load, 350); }); });
    $("f-limit").addEventListener("change", load);
    load();
  });
})();
