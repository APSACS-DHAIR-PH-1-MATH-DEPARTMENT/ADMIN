/* ui.js — tiny helpers shared by every page (no framework). */
(function () {
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(id) { return document.getElementById(id); }

  /* Shows a message in a notice box. kind: "ok" | "bad" | "info". aria-live makes screen readers read it. */
  function say(el, text, kind) {
    if (!el) return;
    el.hidden = false;
    el.className = "notice notice--" + (kind || "info");
    el.textContent = text;
  }
  function clear(el) { if (el) { el.hidden = true; el.textContent = ""; } }

  /* Disables a button while a request runs, so one tap = one request. */
  function busy(btn, on, busyLabel) {
    if (!btn) return;
    if (on) { btn.setAttribute("data-label", btn.textContent); btn.disabled = true; if (busyLabel) btn.textContent = busyLabel; }
    else { btn.disabled = false; var l = btn.getAttribute("data-label"); if (l) btn.textContent = l; }
  }

  /* Wires every <button data-toggle-pin="inputId"> to show/hide that PIN field. */
  function wirePinToggles(root) {
    var btns = (root || document).querySelectorAll("[data-toggle-pin]");
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener("click", function () {
        var input = $(b.getAttribute("data-toggle-pin"));
        if (!input) return;
        var show = input.type === "password";
        input.type = show ? "text" : "password";
        b.textContent = show ? "Hide" : "Show";
        b.setAttribute("aria-pressed", show ? "true" : "false");
      });
    });
  }

  /* Keeps only digits in an input (PIN / code fields). */
  function digitsOnly(input) {
    input.addEventListener("input", function () {
      var v = input.value.replace(/\D+/g, "");
      if (v !== input.value) input.value = v;
    });
  }

  /* Two-tap confirmation without a pop-up: first tap changes the label, a second tap within 4 s runs fn. */
  function confirmTap(btn, sureLabel, fn) {
    var original = btn.textContent, armed = false, timer = null;
    btn.addEventListener("click", function () {
      if (!armed) {
        armed = true; btn.textContent = sureLabel; btn.classList.add("is-armed");
        timer = setTimeout(function () { armed = false; btn.textContent = original; btn.classList.remove("is-armed"); }, 4000);
        return;
      }
      clearTimeout(timer); armed = false; btn.textContent = original; btn.classList.remove("is-armed");
      fn();
    });
  }

  window.UI = { confirmTap: confirmTap, esc: esc, $: $, say: say, clear: clear, busy: busy, wirePinToggles: wirePinToggles, digitsOnly: digitsOnly };
  window.esc = esc;
})();
