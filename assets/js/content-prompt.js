/* content-prompt.js (staff) — the copy-ready AI prompts for the two CSV formats of the Practice & exercises page.
   Plain text made in the browser; nothing is sent anywhere. Keep the column rules here the same as the server's checks (Practice.gs). */
(function () {
  function levelNote(cls) { return window.PromptKit ? PromptKit.levelNote(cls) : ""; }

  var COMMON = [
    "FORMAT RULES (very important, my website rejects the whole file if one row breaks a rule):",
    "- Output ONLY a CSV (comma separated, UTF-8) inside one code block. No explanation before or after.",
    "- The first line is the header, exactly as given below. One question per line. Put any cell that contains a comma, a quote or a line break inside double quotes, and write a quote inside a cell as two quotes (\"\").",
    "- Maths: write formulas between single dollar signs, for example $\\frac{3}{4}$, $x^2$, $4\\ \\text{cm}$, $\\times$, $\\div$. Never use a single dollar sign for money; write Rs 50 instead.",
    "- Never leave a required cell empty. Do not invent facts that are not in the book."
  ];

  function practice(o) {
    var L = [];
    L.push("You are helping a Pakistani maths teacher (Federal Board, Class " + o.cls + ") prepare PRACTICE QUESTIONS for students. Use the attached book pages / material" + (o.chapter ? " of the chapter \"" + o.chapter + "\"" : "") + (o.topic ? " (topics: " + o.topic + ")" : "") + ".");
    L.push("Write " + o.count + " practice questions, from easy to challenging (about 40% easy, 40% medium, 20% challenging). " + levelNote(o.cls) + (o.extra ? " " + o.extra : ""));
    L.push("");
    L.push("HEADER (copy exactly): chapter,topic,difficulty,type,question,optionA,optionB,optionC,optionD,answer,items,acceptedAnswers,hint,solution,subtopic");
    L.push("");
    L.push("COLUMNS:");
    L.push("- chapter: the chapter name" + (o.chapter ? ", always \"" + o.chapter + "\"" : "") + " (same spelling in every row).");
    L.push("- topic: the topic inside the chapter (up to 60 characters). subtopic: optional.");
    L.push("- difficulty: easy, medium or challenging.");
    L.push("- type: one of mcq, tf, fill, short, long, order.");
    L.push("- question: the question text.");
    L.push("- mcq: fill optionA, optionB (and optionC, optionD if you have them; no gaps, no two equal options); answer = the letter A, B, C or D.");
    L.push("- tf (true/false): answer = true or false. Leave the options empty.");
    L.push("- fill: answer = the exact short answer (a number or a word). acceptedAnswers = other accepted spellings separated by | (for example 0.5|.5|1/2), or empty.");
    L.push("- order: items = the pieces in ANY order separated by | ; answer = the same pieces in the RIGHT order separated by | (same spelling).");
    PromptKit.orderLines().forEach(function (x) { L.push(x); });
    L.push("- short / long: answer = a model answer written in a sentence or two (students compare their own answer with it).");
    L.push("- hint: one short helpful nudge that does not give the answer away (optional but recommended, up to 400 characters).");
    L.push("- solution: REQUIRED for every question. A clear step-by-step explanation a student can follow (at least one full sentence).");
    L.push("");
    COMMON.forEach(function (x) { L.push(x); });
    L.push("");
    L.push("EXAMPLE ROWS:");
    L.push("Decimals,Adding,easy,mcq,What is $0.5+0.25$?,0.75,0.30,0.525,1.0,A,,,Line up the decimal points.,Write 0.50 + 0.25 and add each column to get 0.75.,");
    L.push("Decimals,Adding,easy,tf,\"$0.5$ is greater than $0.25$.\",,,,,true,,,Think of half and a quarter.,Half is bigger than a quarter so the statement is true.,");
    L.push("Decimals,Place value,medium,fill,What is $3.20 + 1.80$?,,,,,5,,5.0|5.00,,Add the hundredths then the tenths and the ones to get 5.,");
    L.push("Decimals,Order,medium,order,Arrange from smallest to largest.,,,,,0.2|0.25|0.5,0.5|0.2|0.25,,Compare the tenths first.,Writing them with two decimals: 0.20 < 0.25 < 0.50.,");
    L.push("Algebra,Absolute value,challenging,order,Put the steps that solve $\\lvert x-3 \\rvert = 5$ in the right order.,,,,,$\\lvert x-3 \\rvert = 5$|$x-3=5 \\text{ or } x-3=-5$|$x=8 \\text{ or } x=-2$,$x=8 \\text{ or } x=-2$|$\\lvert x-3 \\rvert = 5$|$x-3=5 \\text{ or } x-3=-5$,,Remove the bars first.,Split into two cases: $x-3=5$ or $x-3=-5$. So $x=8$ or $x=-2$.,");
    return L.join("\n");
  }

  function exercises(o) {
    var L = [];
    L.push("You are helping a Pakistani maths teacher (Federal Board, Class " + o.cls + ") turn a textbook EXERCISE or WORKSHEET into a CSV with a written solution for every question. Use the attached book pages" + (o.chapter ? " of the chapter \"" + o.chapter + "\"" : "") + (o.topic ? " (exercise/worksheet: " + o.topic + ")" : "") + ".");
    L.push("Copy EVERY question of the exercise in the same order and numbering as the book, and write the full worked solution for each. " + levelNote(o.cls) + (o.extra ? " " + o.extra : ""));
    L.push("");
    L.push("HEADER (copy exactly): chapter,collectionType,collectionName,qNo,question,solution,answer,videoUrl");
    L.push("");
    L.push("COLUMNS:");
    L.push("- chapter: the chapter name" + (o.chapter ? ", always \"" + o.chapter + "\"" : "") + " (same spelling in every row).");
    L.push("- collectionType: exercise (for a textbook exercise) or worksheet.");
    L.push("- collectionName: the name as printed, for example Exercise 3.2 or Worksheet 1 (same text in every row of that exercise).");
    L.push("- qNo: the question number as in the book, for example 1, 2, 3(a), 3(b) (up to 12 characters, no spaces).");
    L.push("- question: the full question text. For a multi-part question write each part as its own row (3(a), 3(b)).");
    L.push("- solution: REQUIRED. The full written, step-by-step solution a student can follow.");
    L.push("- answer: the short final answer (optional).");
    L.push("- videoUrl: leave EMPTY. The teacher adds YouTube links later, only for questions that have a video.");
    L.push("");
    COMMON.forEach(function (x) { L.push(x); });
    L.push("");
    L.push("EXAMPLE ROWS:");
    L.push("Decimals,exercise,Exercise 3.2,1(a),Add $1.5$ and $2.5$.,\"Line up the decimal points: $1.5 + 2.5 = 4.0$.\",4,");
    L.push("Decimals,exercise,Exercise 3.2,1(b),Subtract $1.25$ from $3$.,\"Write 3 as 3.00 then subtract: $3.00 - 1.25 = 1.75$.\",1.75,");
    return L.join("\n");
  }

  window.ContentPrompt = { practice: practice, exercises: exercises };
})();
