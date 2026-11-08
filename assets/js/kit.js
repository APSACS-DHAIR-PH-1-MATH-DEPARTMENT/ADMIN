/* kit.js — small DOM helpers for the test / report / question pages. Everything from the server goes in as TEXT
   (textContent / TeX.set), never as HTML. */
(function () {
  function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined && text !== null) e.textContent = text; return e; }
  function tex(tag, cls, text) { var e = h(tag, cls); TeX.set(e, text); return e; }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function barClass(p) { return p < 40 ? "bar--low" : (p < 60 ? "bar--mid" : "bar--high"); }
  function bar(label, valueText, pct) {
    var row = h("div", "bar " + barClass(pct)), top = h("div", "bar__top");
    top.appendChild(h("span", "bar__l", label)); top.appendChild(h("span", "bar__v", valueText));
    var track = h("div", "bar__track"), fill = h("div", "bar__fill"); fill.style.width = Math.max(2, Math.min(100, pct)) + "%";
    track.appendChild(fill); row.appendChild(top); row.appendChild(track); return row;
  }
  var DIFF = { easy: "Easy", medium: "Medium", challenging: "Challenging" };
  var TAG = { ALIGN: "Decimal points not lined up", PLACE: "Place value mistake", CARRY: "Carrying mistake", BORROW: "Borrowing mistake", DIGITS: "Compared digits, not value", ORDER: "Ordered backwards", CALC: "Calculation slip", CONCEPT: "Concept mistake", FORMULA: "Wrong formula", FACES: "Wrong number of faces", ADDED: "Added instead of multiplied", UNITS: "Units mistake", SCALING: "Scaling mistake", UNCLASSIFIED: "No clear pattern" };
  function mins(sec) { sec = Math.max(0, Math.round(sec || 0)); return Math.floor(sec / 60) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60); }
  window.Kit = { h: h, tex: tex, clear: clear, bar: bar, DIFF: DIFF, TAG: TAG, mins: mins };
})();
