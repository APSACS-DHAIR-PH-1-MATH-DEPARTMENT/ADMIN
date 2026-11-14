/* weekly-student.js (staff) — every weekly report of ONE student (newest first), with when it was read and what the parent wrote,
   and "Download PDF" (the browser's print window; the print style opens every report fully). All server text is shown as text. */
(function () {
  var $ = UI.$, h = Kit.h, clear = Kit.clear;
  var qs = location.search;
  var id = decodeURIComponent((qs.match(/[?&]id=([A-Za-z0-9\-]+)/) || [])[1] || "");
  var qClass = parseInt((qs.match(/[?&]c=(\d+)/) || [])[1] || "0", 10), qSec = decodeURIComponent((qs.match(/[?&]s=([A-Za-z0-9]+)/) || [])[1] || "").toUpperCase();
  var cards = [], saved = [];

  function openAll(on) { cards.forEach(function (c) { c.setOpen(on); }); }

  function beforePrint() { saved = cards.map(function (c) { return c.classList.contains("is-open"); }); openAll(true); }
  function afterPrint() { cards.forEach(function (c, i) { c.setOpen(!!saved[i]); }); }

  function show(r) {
    var s = r.student;
    document.title = UI.name(s.studentName) + " — weekly reports — Staff Portal";
    $("ws-title").textContent = UI.name(s.studentName);
    $("ws-sub").textContent = "Class " + s.classLevel + s.section + " · " + s.studentId + " · Father: " + UI.name(s.fatherName);
    var back = $("back-link");
    if (qClass && qSec) { back.href = "weekly.html?c=" + qClass + "&s=" + encodeURIComponent(qSec); }
    $("ws-parents").href = "parents.html?c=" + s.classLevel + "&s=" + encodeURIComponent(s.section);
    var ph = clear($("ws-printhead"));
    ph.appendChild(h("h2", "", "Weekly reports — " + UI.name(s.studentName)));
    ph.appendChild(h("p", "", "Class " + s.classLevel + s.section + " · " + s.studentId + " · printed " + DT.format(new Date().toISOString())));
    var box = clear($("ws-list"));
    cards = r.reports.map(function (rep, i) { var c = ReportView.card(rep, { open: i === 0, latest: i === 0, idx: i }); box.appendChild(c); return c; });
    $("ws-empty").hidden = r.reports.length > 0;
    $("ws-print").disabled = !r.reports.length; $("ws-all").disabled = !r.reports.length;
    $("loading").hidden = true;
  }

  Shell.start("weekly", false, function () {
    if (!/^WHA-STU-\d{7}$/.test(id)) { location.replace("weekly.html"); return; }
    $("ws-print").addEventListener("click", function () { window.print(); });
    $("ws-all").addEventListener("click", function () {
      var anyClosed = cards.some(function (c) { return !c.classList.contains("is-open"); });
      openAll(anyClosed);
      $("ws-all").textContent = anyClosed ? "Close all" : "Open all";
    });
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    Api.staff.reportOf(id).then(show).catch(function (e) {
      $("loading").hidden = true;
      UI.say($("page-msg"), /was not found/.test(e.message || "") && !/Student/.test(e.message) ? "Weekly reports are not switched on yet. The backend must be updated first." : e.message, "bad");
    });
  });
})();
