(function initHermaL4E2Round2(global) {
  "use strict";

  if (!global || global.HermaL4E2Round2) return;

  var MODULE_NAME = "HermaL4E2Round2";
  var SCRIPT_NAME = "herma-l4e2_round2.js";
  var STYLE_ID = "herma-l4e2-round2-style";
  var INSTRUCTION_KR = "\uD55C\uAD6D\uC5B4 \uB73B\uC5D0 \uAC78\uB9DE\uC740 \uC601\uC5B4 \uBB38\uC7A5\uC744 \uACE0\uB974\uC138\uC694";
  var MEANING_FALLBACK_KR = "\uB73B \uB370\uC774\uD130 \uC5C6\uC74C";

  var DEFAULTS = {
    excelFile: "LTRYI-herma-round2-master.xlsx",
    lesson: 4,
    exercise: 2,
    round: 2,
    maxQuestions: 10,
    passScore: 80,
    hostId: "quiz-area",
    popupId: "result-popup",
    xlsxCdn: "https://unpkg.com/xlsx/dist/xlsx.full.min.js",
    resultTableScript: "dishquiz_resultstable.js",
    toastScript: "herma-toastfx.js",
  };

  var state = {
    mounted: false,
    loading: false,
    config: cloneObject(DEFAULTS),
    userId: "",
    subcategory: "Grammar",
    level: "Basic",
    day: "116",
    quizTitle: "quiz_Grammar_Basic_116_round2",
    rawRows: [],
    questions: [],
    currentIndex: 0,
    results: [],
    questionLocked: false,
    handlersBound: false,
    selectedChoice: -1,
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function cloneObject(obj) {
    return Object.assign({}, obj || {});
  }

  function parseParamsSafe() {
    try {
      return new URLSearchParams(global.location.search || "");
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function ensureRound2QuizKey(key) {
    var s = String(key || "").trim();
    if (!s) {
      return "quiz_" + state.subcategory + "_" + state.level + "_" + state.day + "_round2";
    }
    if (/_round2$/i.test(s)) return s;
    return s + "_round2";
  }

  function applyQueryParams() {
    var params = parseParamsSafe();
    var key = params.get("key");
    var id = params.get("id");

    if (id) state.userId = id;

    if (key) {
      state.quizTitle = ensureRound2QuizKey(key);
      var parts = key.split("_");
      if (parts.length >= 4) {
        state.subcategory = parts[1] || state.subcategory;
        state.level = parts[2] || state.level;
        state.day = parts[3] || state.day;
      }
    } else {
      state.quizTitle = ensureRound2QuizKey("");
    }
  }

  function normalizeToken(token) {
    return String(token || "")
      .replace(/[\u2018\u2019\u2032`]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .trim()
      .replace(/^[\s"'`([{<]+|[\s"'`)\]}>]+$/g, "")
      .replace(/^[,.;:!?]+|[,.;:!?]+$/g, "")
      .toLowerCase();
  }

  function normalizeSentence(text) {
    return String(text || "")
      .replace(/[\u2018\u2019\u2032`]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim()
      .replace(/[.?!]\s*$/, "")
      .toLowerCase();
  }

  function ensurePeriod(text) {
    var s = String(text || "").trim();
    if (!s) return "";
    return s.replace(/[.?!]\s*$/, "") + ".";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isRowAllEmpty(row) {
    var keys = Object.keys(row || {});
    if (!keys.length) return true;
    return keys.every(function (k) {
      return String(row[k] == null ? "" : row[k]).trim() === "";
    });
  }

  function parseBooleanCell(value, fallback) {
    var raw = String(value == null ? "" : value).trim().toLowerCase();
    if (!raw) return fallback;
    return !(raw === "0" || raw === "n" || raw === "no" || raw === "false");
  }

  function shouldFailFastNow() {
    var total = Number(state.questions && state.questions.length ? state.questions.length : state.config.maxQuestions || 0);
    if (!(total > 0)) return false;

    var pass = Number(state.config && state.config.passScore ? state.config.passScore : 80);
    if (!(pass > 0 && pass <= 100)) pass = 80;

    var requiredCorrect = Math.ceil(total * (pass / 100));
    var maxWrongAllowed = total - requiredCorrect;

    var wrongCount = state.results.filter(function (r) {
      return !(r && r.correct);
    }).length;

    return wrongCount > maxWrongAllowed;
  }

  function shouldAutoActivate() {
    var params = parseParamsSafe();
    var round2 = String(params.get("round2") || "").trim();
    var key = String(params.get("key") || "").trim();
    var script = String(params.get("round2Script") || "").trim();
    if (round2 === "1") return true;
    if (/_round2$/i.test(key)) return true;
    if (script && script.toLowerCase().indexOf(SCRIPT_NAME.toLowerCase()) !== -1) return true;

    var cfg = global.__hermaRound2InjectConfig;
    if (cfg && typeof cfg === "object") {
      var cfgScript = String(cfg.script || "").trim();
      var cfgAuto = cfg.autoMount;
      if (cfgAuto && cfgScript.toLowerCase().indexOf(SCRIPT_NAME.toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      if (!url) {
        reject(new Error("script url is empty"));
        return;
      }
      var el = document.createElement("script");
      el.src = url;
      el.async = true;
      el.onload = function () {
        resolve();
      };
      el.onerror = function () {
        reject(new Error("failed to load script: " + url));
      };
      document.head.appendChild(el);
    });
  }

  function ensureDependencies() {
    var tasks = [];

    if (typeof global.XLSX === "undefined") {
      tasks.push(loadScript(state.config.xlsxCdn));
    }

    if (!global.DishQuizResultsTable || typeof global.DishQuizResultsTable.show !== "function") {
      tasks.push(loadScript(state.config.resultTableScript));
    }

    if (!global.HermaToastFX || typeof global.HermaToastFX.show !== "function") {
      tasks.push(loadScript(state.config.toastScript));
    }

    return Promise.all(tasks).then(function () { return true; });
  }

  function ensureStyles() {
    if (byId(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".r42-sheet-box{background:#fff;border:2px solid #101010;border-radius:8px;padding:10px;margin-bottom:12px;}",
      ".r42-sheet-head{font-size:12px;font-weight:900;letter-spacing:0.06em;color:#101010;text-transform:uppercase;margin-bottom:6px;}",
      ".r42-q-label{font-weight:900;font-size:16px;margin-bottom:10px;color:#111;}",
      ".r42-instruction{font-size:17px;font-weight:900;color:#111;margin-bottom:10px;}",
      ".r42-stem-box{border:1px solid #b8b8b8;border-radius:4px;padding:10px;margin:8px 0 6px;background:#fff;}",
      ".r42-stem{font-size:15px;line-height:1.75;color:#101010;margin:4px 0;word-break:keep-all;}",
      ".r42-choice-list{display:flex;flex-direction:column;gap:8px;margin-top:16px;}",
      ".r42-choice-btn{display:block;width:100%;text-align:left;padding:10px 12px;border:1px solid #111;border-radius:8px;background:#fff;color:#111;font-size:14px;line-height:1.5;font-weight:700;cursor:pointer;}",
      ".r42-choice-btn i{font-style:italic;font-weight:900;}",
      ".r42-choice-btn:hover{background:#f6f6f6;}",
      ".r42-choice-btn.is-selected{background:#e9ecef;border-width:2px;}",
      ".r42-choice-btn:disabled{opacity:0.75;cursor:not-allowed;}",
      ".r42-btn-row{display:flex;gap:10px;margin-top:12px;}",
      ".r42-quiz-btn{flex:1;margin-top:0;padding:7px 12px;font-size:13px;background:#1f1f1f;color:#fff;border:1px solid #0a0a0a;border-radius:6px;cursor:pointer;font-weight:900;}",
      ".r42-quiz-btn:disabled{opacity:0.5;cursor:not-allowed;}",
      ".r42-feedback{margin-top:7px;font-weight:900;font-size:12px;min-height:15px;}",
      ".r42-feedback.ok{color:#1d6d20;}",
      ".r42-feedback.bad{color:#a32323;}"
    ].join("");
    document.head.appendChild(style);
  }

  function getHostArea() {
    return byId(state.config.hostId);
  }

  function shuffleArray(arr) {
    var a = Array.isArray(arr) ? arr.slice() : [];
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function splitWordTokens(text) {
    var matches = String(text || "").match(/[A-Za-z]+(?:['??][A-Za-z]+)*/g);
    if (!matches) return [];
    return matches.map(function (w) { return normalizeToken(w); }).filter(Boolean);
  }

  function isStopword(word) {
    var stopwords = new Set([
      "a", "an", "the", "and", "or", "but", "if", "to", "of", "for", "in", "on", "at", "by", "with",
      "from", "as", "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did",
      "will", "would", "should", "can", "could", "may", "might", "must", "have", "has", "had",
      "this", "that", "these", "those", "it", "its", "he", "she", "they", "we", "you", "i", "my",
      "your", "our", "their", "his", "her", "them", "me", "us", "there", "here", "not"
    ]);
    return stopwords.has(String(word || "").toLowerCase());
  }

  function isRelatedWord(a, b) {
    var x = normalizeToken(a);
    var y = normalizeToken(b);
    if (!x || !y) return false;
    if (x === y) return true;

    var minLen = 4;
    if (x.length >= minLen && y.length >= minLen && (x.indexOf(y) === 0 || y.indexOf(x) === 0)) {
      return true;
    }

    function roughStem(w) {
      if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
      if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
      if (w.length > 4 && /es$/.test(w)) return w.slice(0, -2);
      if (w.length > 3 && /s$/.test(w)) return w.slice(0, -1);
      return w;
    }

    var xs = roughStem(x);
    var ys = roughStem(y);
    return !!(xs && ys && (xs === ys || xs.indexOf(ys) === 0 || ys.indexOf(xs) === 0));
  }

  function findCommonKeyword(sentenceA, sentenceB) {
    var wordsA = splitWordTokens(sentenceA);
    var wordsB = splitWordTokens(sentenceB);
    if (!wordsA.length || !wordsB.length) return "";

    var candidates = [];
    wordsA.forEach(function (wa) {
      if (!wa || isStopword(wa)) return;
      for (var i = 0; i < wordsB.length; i++) {
        var wb = wordsB[i];
        if (!wb || isStopword(wb)) continue;
        if (isRelatedWord(wa, wb)) {
          var key = wa.length <= wb.length ? wa : wb;
          if (!key || isStopword(key)) continue;
          candidates.push(key);
          break;
        }
      }
    });

    if (!candidates.length) return "";
    candidates.sort(function (a, b) { return b.length - a.length; });
    return candidates[0];
  }

  function italicizeCommonKeyword(sentence, keyword) {
    var text = String(sentence || "");
    var key = normalizeToken(keyword);
    if (!key) return escapeHtml(text);

    var parts = text.split(/(\s+)/);
    return parts.map(function (part) {
      if (!part || /^\s+$/.test(part)) return part;
      var m = part.match(/^([^A-Za-z']*)([A-Za-z]+(?:['??][A-Za-z]+)*)([^A-Za-z']*)$/);
      if (!m) return escapeHtml(part);

      var head = m[1] || "";
      var word = m[2] || "";
      var tail = m[3] || "";
      if (isRelatedWord(word, key)) {
        return escapeHtml(head) + "<i>" + escapeHtml(word) + "</i>" + escapeHtml(tail);
      }
      return escapeHtml(part);
    }).join("");
  }

  function dedupeSentenceList(list) {
    var seen = new Set();
    var out = [];
    (list || []).forEach(function (item) {
      var s = ensurePeriod(String(item || "").trim());
      if (!s) return;
      var key = normalizeSentence(s);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(s);
    });
    return out;
  }

  function resolveModelAnswer(modelAnswer, options) {
    var candidate = ensurePeriod(String(modelAnswer || "").trim());
    var normalized = normalizeSentence(candidate);
    if (normalized) {
      for (var i = 0; i < options.length; i++) {
        if (normalizeSentence(options[i]) === normalized) {
          return options[i];
        }
      }
    }
    return options[0] || candidate;
  }

  function wireBackButton() {
    if (state.handlersBound) return;
    state.handlersBound = true;

    var backBtn = byId("back-btn");
    if (!backBtn) return;

    backBtn.addEventListener("click", function () {
      global.history.back();
    });
  }

  function buildQuestionsFromRows() {
    var filtered = state.rawRows
      .filter(function (r) {
        return Number(r["Lesson"]) === state.config.lesson &&
          Number(r["Exercise"]) === state.config.exercise;
      })
      .filter(function (r) {
        if (typeof r["Round"] === "undefined" || String(r["Round"]).trim() === "") return true;
        return Number(r["Round"]) === state.config.round;
      })
      .sort(function (a, b) {
        return Number(a["QNumber"]) - Number(b["QNumber"]);
      });

    if (state.config.maxQuestions > 0) {
      filtered = filtered.slice(0, state.config.maxQuestions);
    }

    state.questions = filtered.map(function (r, idx) {
      var active = parseBooleanCell(r["Active"], true);
      var options = dedupeSentenceList([
        r["SentenceA"],
        r["SentenceB"],
      ]);
      var modelAnswerRaw = String(r["ModelAnswer"] != null ? r["ModelAnswer"] : (r["Answer"] || "")).trim();
      var modelAnswer = resolveModelAnswer(modelAnswerRaw, options);

      return {
        no: idx + 1,
        qNumber: Number(r["QNumber"]) || idx + 1,
        title: String(r["Title"] || "").trim() || "Herma L4-E2 Round2",
        instruction: String(r["Instruction"] || "").trim() || INSTRUCTION_KR,
        koreanMeaning: String(
          r["KoreanMeaning"] != null ? r["KoreanMeaning"] :
          (r["MeaningKR"] != null ? r["MeaningKR"] :
          (r["Korean"] != null ? r["Korean"] : ""))
        ).trim(),
        modelAnswer: modelAnswer,
        options: options,
        renderedOptions: [],
        renderedOptionHtml: [],
        active: active,
      };
    }).filter(function (q) {
      return !!q.active && !!q.koreanMeaning && !!q.modelAnswer && q.options.length === 2;
    });
  }

  function loadExcelRows(filename) {
    var bust = "v=" + Date.now();
    var url = filename.indexOf("?") >= 0 ? (filename + "&" + bust) : (filename + "?" + bust);

    return fetch(url, { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("fetch failed: " + res.status);
        return res.arrayBuffer();
      })
      .then(function (buf) {
        var wb = global.XLSX.read(buf, { type: "array" });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        var rows = global.XLSX.utils.sheet_to_json(sheet, { defval: "" });
        return rows.filter(function (r) { return !isRowAllEmpty(r); });
      });
  }

  function renderIntro() {
    var area = getHostArea();
    if (!area) return;

    var total = state.questions.length;
    var instruction = (state.questions[0] && state.questions[0].instruction) || INSTRUCTION_KR;

    area.innerHTML = [
      '<div class="r42-sheet-box">',
      '  <div class="r42-sheet-head">Round2 Test</div>',
      '  <div class="r42-instruction">' + escapeHtml(instruction) + "</div>",
      '  <div style="font-size:13px;line-height:1.55;color:#1f1f1f;margin-bottom:8px;">',
      "    \uD55C\uAD6D\uC5B4 \uB73B\uC5D0 \uB9DE\uB294 \uC601\uC5B4 \uBB38\uC7A5\uC744 \uD558\uB098 \uACE0\uB974\uC138\uC694.",
      "  </div>",
      '  <div style="font-size:12px;line-height:1.5;color:#2b2b2b;margin-bottom:8px;">',
      "    Total Questions: " + total,
      "  </div>",
      '  <button class="r42-quiz-btn" style="width:100%; margin-top:12px;" onclick="HermaL4E2Round2.startQuiz()">Start</button>',
      "</div>"
    ].join("\n");
  }

  function buildChoiceButtonHTML(option, idx) {
    return [
      '<button class="r42-choice-btn" type="button" data-choice="' + idx + '" id="r42-choice-' + idx + '">',
      String(option || ""),
      "</button>"
    ].join("");
  }

  function applyChoiceSelectionUI() {
    var q = state.questions[state.currentIndex];
    if (!q) return;
    var buttons = Array.from(document.querySelectorAll(".r42-choice-btn[data-choice]"));
    buttons.forEach(function (btn) {
      var idx = Number(btn.getAttribute("data-choice"));
      var selected = idx === state.selectedChoice;
      btn.classList.toggle("is-selected", selected);
    });
  }

  function wireChoiceEvents() {
    var buttons = Array.from(document.querySelectorAll(".r42-choice-btn[data-choice]"));
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (state.questionLocked) return;
        state.selectedChoice = Number(btn.getAttribute("data-choice"));
        applyChoiceSelectionUI();
      });
    });
  }

  function renderQuestion() {
    var area = getHostArea();
    if (!area) return;

    var q = state.questions[state.currentIndex];
    if (!q) {
      showResultPopup();
      return;
    }

    state.questionLocked = false;
    state.selectedChoice = -1;

    area.innerHTML = [
      '<div class="r42-q-label">Q. ' + (state.currentIndex + 1) + " / " + state.questions.length + "</div>",
      '<div class="r42-sheet-box">',
      '  <div class="r42-instruction">' + escapeHtml(q.instruction || INSTRUCTION_KR) + "</div>",
      '  <div class="r42-stem-box">',
      '    <div class="r42-stem">\uD55C\uAD6D\uC5B4 \uB73B : ' + escapeHtml(q.koreanMeaning || MEANING_FALLBACK_KR) + "</div>",
      "  </div>",
      '  <div class="r42-choice-list">',
      q.renderedOptionHtml.map(function (opt, idx) { return buildChoiceButtonHTML(opt, idx); }).join(""),
      "  </div>",
      '  <div class="r42-feedback" id="feedback-line"></div>',
      '  <div class="r42-btn-row">',
      '    <button class="r42-quiz-btn" id="submit-btn" onclick="HermaL4E2Round2.submitAnswer()">\uC81C\uCD9C</button>',
      '    <button class="r42-quiz-btn" id="next-btn" onclick="HermaL4E2Round2.goNext()" disabled>\uB2E4\uC74C</button>',
      "  </div>",
      "</div>"
    ].join("\n");

    wireChoiceEvents();
  }

  function startQuiz() {
    if (!state.questions.length) {
      alert("No questions found for this round2.");
      return;
    }
    state.questions.forEach(function (q) {
      q.renderedOptions = shuffleArray(q.options);
      if (q.renderedOptions.length < 2) {
        q.renderedOptions = q.options.slice();
      }
      var commonKeyword = findCommonKeyword(q.renderedOptions[0], q.renderedOptions[1]);
      q.renderedOptionHtml = q.renderedOptions.map(function (opt) {
        return italicizeCommonKeyword(opt, commonKeyword);
      });
    });
    state.currentIndex = 0;
    state.results = [];
    renderQuestion();
  }

  function submitAnswer() {
    if (state.questionLocked) return;

    var q = state.questions[state.currentIndex];
    if (!q) return;

    var feedback = byId("feedback-line");
    var submitBtn = byId("submit-btn");
    var nextBtn = byId("next-btn");
    var choiceButtons = Array.from(document.querySelectorAll(".r42-choice-btn[data-choice]"));

    if (state.selectedChoice < 0 || state.selectedChoice >= q.renderedOptions.length) {
      if (feedback) {
        feedback.className = "r42-feedback bad";
        feedback.textContent = "\uBB38\uC7A5\uC744 \uBA3C\uC800 \uC120\uD0DD\uD558\uC138\uC694.";
      }
      if (global.HermaToastFX) global.HermaToastFX.show("no", "Select one sentence.");
      return;
    }

    var selectedSentence = String(q.renderedOptions[state.selectedChoice] || "").trim();
    var isCorrect = normalizeSentence(selectedSentence) === normalizeSentence(q.modelAnswer);

    state.results.push({
      no: state.currentIndex + 1,
      word: "Herma L4-E2 Round2 / Q" + q.qNumber,
      selected: selectedSentence,
      correct: isCorrect,
      qNumber: q.qNumber,
      modelAnswer: q.modelAnswer,
    });

    if (shouldFailFastNow()) {
      showResultPopup();
      return;
    }

    state.questionLocked = true;
    choiceButtons.forEach(function (btn) {
      btn.disabled = true;
    });
    if (submitBtn) submitBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = false;

    if (feedback) {
      feedback.className = isCorrect ? "r42-feedback ok" : "r42-feedback bad";
      feedback.textContent = isCorrect ? "" : ("\uC815\uB2F5\uC740 : " + q.modelAnswer);
    }

    if (global.HermaToastFX) {
      global.HermaToastFX.show(isCorrect ? "ok" : "no", isCorrect ? "\uC815\uB2F5" : "\uC624\uB2F5!");
    }
  }

  function pushForcedIncorrectResult(q) {
    if (!q) return;
    var forceResult = String(global.__alphaForceResult || "").toLowerCase();
    var forceCorrect = forceResult === "right" || forceResult === "correct" || forceResult === "ok";    state.results.push({
      no: state.currentIndex + 1,
      word: "Herma L4-E2 Round2 / Q" + q.qNumber,
      selected: forceCorrect ? (q.modelAnswer || "alpha-force-right") : "alpha-force-next",
      correct: forceCorrect,
      qNumber: q.qNumber,
      modelAnswer: q.modelAnswer,
    });
  }

  function goNext() {
    var isForced = !!global.__alphaForceNext;
    if (!state.questionLocked && !isForced) return;

    var forceOnlyGrade = isForced && !!global.__alphaForceOnlyGrade;
    if (forceOnlyGrade && state.questionLocked) return;

    if (!state.questionLocked && isForced) {
      var q = state.questions[state.currentIndex];
      pushForcedIncorrectResult(q);
      if (forceOnlyGrade) {
        state.questionLocked = true;

        var submitBtn = byId("submit-btn");
        var nextBtn = byId("next-btn");
        if (submitBtn) submitBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = false;

        var feedback = byId("feedback-line");
        var forceResult = String(global.__alphaForceResult || "").toLowerCase();
        var forceCorrect = forceResult === "right" || forceResult === "correct" || forceResult === "ok";
        if (feedback) {
          var baseFeedbackClass = "r2-feedback";
          if (feedback.classList && feedback.classList.length) {
            baseFeedbackClass = feedback.classList[0];
          }
          feedback.className = forceCorrect ? (baseFeedbackClass + " ok") : (baseFeedbackClass + " bad");
          feedback.textContent = forceCorrect ? "" : ("\uC815\uB2F5\uC740 : " + (q && q.modelAnswer ? q.modelAnswer : ""));
        }
        if (global.HermaToastFX) {
          global.HermaToastFX.show(forceCorrect ? "ok" : "no", forceCorrect ? "\uC815\uB2F5" : "\uC624\uB2F5!");
        }
        return;
      }
    }
    if (shouldFailFastNow()) {
      showResultPopup();
      return;
    }
    state.currentIndex += 1;
    if (state.currentIndex >= state.questions.length) {
      showResultPopup();
      return;
    }
    renderQuestion();
  }

  function showResultPopup() {
    if (global.DishQuizResultsTable && typeof global.DishQuizResultsTable.show === "function") {
      global.DishQuizResultsTable.show({
        results: state.results,
        quizTitle: state.quizTitle,
        subcategory: state.subcategory,
        level: state.level,
        day: state.day,
        passScore: state.config.passScore,
      });
      return;
    }

    alert("dishquiz_resultstable.js is not loaded.");
  }

  function bindGlobalAliases() {
    global.startQuiz = startQuiz;
    global.renderQuestion = renderQuestion;
    global.submitAnswer = submitAnswer;
    global.goNext = goNext;
  }

  function initializeRound2(options) {
    var opts = cloneObject(options || {});
    state.config = Object.assign(cloneObject(DEFAULTS), state.config, opts);
    state.loading = true;

    applyQueryParams();
    wireBackButton();
    ensureStyles();
    bindGlobalAliases();

    return ensureDependencies()
      .then(function () {
        if (global.HermaToastFX && typeof global.HermaToastFX.init === "function") {
          global.HermaToastFX.init({ hostId: "cafe_int", top: 10 });
        }
        return true;
      })
      .then(function () {
        return loadExcelRows(state.config.excelFile);
      })
      .then(function (rows) {
        state.rawRows = rows;
        buildQuestionsFromRows();
        state.mounted = true;
        renderIntro();
      })
      .catch(function (err) {
        console.error(err);
        alert("Failed to load round2 data.");
      })
      .finally(function () {
        state.loading = false;
      });
  }

  function mount(options) {
    if (state.loading) return Promise.resolve(false);

    var opts = cloneObject(options || {});
    if (!opts.force && state.mounted) {
      bindGlobalAliases();
      renderIntro();
      return Promise.resolve(true);
    }

    return initializeRound2(opts).then(function () {
      return true;
    });
  }

  function getStateSnapshot() {
    return {
      mounted: state.mounted,
      loading: state.loading,
      questionCount: state.questions.length,
      currentIndex: state.currentIndex,
      quizTitle: state.quizTitle,
      config: cloneObject(state.config),
    };
  }

  global[MODULE_NAME] = {
    mount: mount,
    startQuiz: startQuiz,
    renderQuestion: renderQuestion,
    submitAnswer: submitAnswer,
    goNext: goNext,
    showResultPopup: showResultPopup,
    getState: getStateSnapshot,
    scriptName: SCRIPT_NAME,
    __loaded: true,
  };

  function autoBoot() {
    if (!shouldAutoActivate()) return;
    mount({ force: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoBoot);
  } else {
    autoBoot();
  }
})(window);
