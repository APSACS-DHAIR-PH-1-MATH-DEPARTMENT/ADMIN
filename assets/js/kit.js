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
  var TAG = { ALIGN: "Decimal points not lined up", PLACE: "Place value mistake", CARRY: "Carrying mistake", BORROW: "Borrowing mistake", DIGITS: "Compared digits, not value", ORDER: "Ordered backwards", CALC: "Calculation slip", CONCEPT: "Concept mistake", FORMULA: "Wrong formula", FACES: "Wrong number of faces", ADDED: "Added instead of multiplied", UNITS: "Units mistake", SCALING: "Scaling mistake", UNCLASSIFIED: "No clear pattern", OPERATION: "Wrong operation chosen", MISSTEP: "Skipped or wrong step", READ: "Misread the question", COPY: "Copying mistake", ANSFORM: "Answer not in the asked form", ZEROS: "Zero / place-holder mistake", MULTI: "Multiplication step mistake", DIVIDE: "Division mistake", REMAINDER: "Remainder mishandled", BODMAS: "BODMAS / order of operations", ROUND: "Rounding / estimation mistake", FACTOR: "Factor / multiple mix-up", HCFLCM: "HCF / LCM mix-up", PRIME: "Prime / composite mistake", DECSHIFT: "Decimal point misplaced in x or ÷", FRACADD: "Added tops and bottoms", LCDEN: "Common denominator mistake", SIMPLIFY: "Simplifying mistake", RECIP: "Fraction division mistake", MIXED: "Mixed / improper conversion mistake", FRACCMP: "Fraction comparison mistake", PERCENT: "Percentage mistake", RATIO: "Ratio / proportion mistake", UNITARY: "Unitary method mistake", PROFIT: "Profit / loss / discount mistake", INTEREST: "Simple interest mistake", SIGN: "Sign mistake (negatives)", NUMLINE: "Number line / direction mistake", LIKETERMS: "Combined unlike terms", EXPAND: "Brackets / expansion mistake", TRANSPOSE: "Transposing mistake", SUBST: "Substitution mistake", EXPONENT: "Power / index rule mistake", SQRT: "Square / square root confusion", IDENT: "Algebraic identity mistake", FACTORISE: "Factorisation mistake", AREAPERI: "Area / perimeter mixed up", ANGLE: "Angle rule mistake", RADIUS: "Radius / diameter mix-up", PYTH: "Pythagoras mistake", SHAPE: "Shape property mistake", SYMM: "Symmetry / transformation mistake", MEAN: "Mean / median / mode mix-up", GRAPH: "Graph / table reading mistake", PROB: "Probability mistake" };
  function mins(sec) { sec = Math.max(0, Math.round(sec || 0)); return Math.floor(sec / 60) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60); }
  window.Kit = { h: h, tex: tex, clear: clear, bar: bar, DIFF: DIFF, TAG: TAG, mins: mins };
})();
