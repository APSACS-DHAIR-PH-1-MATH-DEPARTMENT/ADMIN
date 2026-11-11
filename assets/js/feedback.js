/* feedback.js — administrator: approve or reject what students wrote. Approved feedback shows on every student's Feedback tab. */
(function () {
  var $ = UI.$;
  var current = "pending";

  function say(text, kind) { UI.say($("flash"), text, kind); }

  function cardHtml(f) {
    var acts = "";
    if (f.status !== "approved") acts += '<button class="btn btn--small" data-d="approve" type="button">Approve</button>';
    if (f.status !== "rejected") acts += '<button class="btn btn--small btn--danger" data-d="reject" type="button">Reject</button>';
    if (f.status !== "pending") acts += '<button class="btn btn--small btn--ghost" data-d="pending" type="button">Move back to waiting</button>';
    return '<article class="rowcard" data-id="' + UI.esc(f.feedbackId) + '">' +
      '<div class="rowcard__top"><div><div class="rowcard__name">' + UI.esc(UI.name(f.studentName)) + '</div><div class="small muted">Shown as “' + UI.esc(UI.name(f.displayName)) + " · " + UI.esc(f.classLabel) + "”</div></div>" +
      '<span class="small muted">' + UI.esc(DT.format(f.createdAt)) + "</span></div>" +
      '<p class="quote">' + UI.esc(f.message) + "</p>" +
      '<div class="actions">' + acts + "</div></article>";
  }

  function load() {
    return Api.staff.listFeedback(current).then(function (r) {
      $("fb-empty").hidden = r.feedback.length > 0;
      $("fb-list").innerHTML = r.feedback.map(cardHtml).join("");
      Array.prototype.forEach.call($("fb-list").querySelectorAll(".rowcard"), function (card) {
        var fid = card.getAttribute("data-id");
        Array.prototype.forEach.call(card.querySelectorAll("[data-d]"), function (b) {
          b.addEventListener("click", function () {
            var d = b.getAttribute("data-d");
            UI.busy(b, true, "Please wait…");
            Api.staff.reviewFeedback(fid, d).then(function () {
              say(d === "approve" ? "Approved. It now shows on every student's Feedback tab." : d === "reject" ? "Rejected. Nobody else will see it." : "Moved back to waiting.", "ok");
              load();
            }).catch(function (e) { UI.busy(b, false); say(e.message, "bad"); });
          });
        });
      });
    }).catch(function (e) { UI.say($("page-msg"), e.message, "bad"); });
  }

  function setTab(name) {
    current = name;
    ["pending", "approved", "rejected"].forEach(function (n) { $("fb-" + n).setAttribute("aria-selected", String(n === name)); });
    UI.clear($("flash"));
    load();
  }

  Shell.start("feedback", true, function () {
    ["pending", "approved", "rejected"].forEach(function (n) { $("fb-" + n).addEventListener("click", function () { setTab(n); }); });
    load();
  });
})();
