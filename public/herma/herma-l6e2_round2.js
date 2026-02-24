(function initHermaL6E2Round2(global) {
  "use strict";

  if (!global || global.HermaL6E2Round2) return;

  var MODULE_NAME = "HermaL6E2Round2";
  var SCRIPT_NAME = "herma-l6e2_round2.js";
  var STYLE_ID = "herma-l6e2-round2-style";
  var INSTRUCTION_KR = "\uBB38\uC7A5\uC744 \uC774\uC5B4\uBCF4\uC138\uC694";
  var MEANING_FALLBACK_KR = "\uB73B \uB370\uC774\uD130 \uC5C6\uC74C";

  var DEFAULTS = {
    excelFile: "LTRYI-herma-round2-master.xlsx",
    lesson: 6,
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
    day: "121",
    quizTitle: "quiz_Grammar_Basic_121_round2",
    rawRows: [],
    questions: [],
    currentIndex: 0,
    results: [],
    questionLocked: false,
    handlersBound: false,
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

  function ensureEndMark(text) {
    var s = String(text || "").trim();
    if (!s) return "";
    if (/[.?!]$/.test(s)) return s;
    return s + ".";
  }

  function ensurePeriod(text) {
    var s = String(text || "").trim();
    if (!s) return "";
    return s.replace(/[.?!]\s*$/, "") + ".";
  }

  function tokenizeAnswerCore(answer) {
    var base = String(answer || "").trim().replace(/[.?!]\s*$/, "");
    if (!base) return [];
    return base.split(/\s+/).filter(Boolean);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number(n) || min));
  }

  function isRowAllEmpty(row) {
    var keys = Object.keys(row || {});
    if (!keys.length) return true;
    return keys.every(function (k) {
      return String(row[k] == null ? "" : row[k]).trim() === "";
    });
  }

  function computeScore(results) {
    var total = results.length;
    var correctCount = results.filter(function (r) {
      return !!(r && r.correct);
    }).length;
    var score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    return { totalQuestions: total, correctCount: correctCount, score: score };
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

  function isTokenArrayEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
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
      ".r2-sheet-box{background:#fff;border:2px solid #101010;border-radius:8px;padding:10px;margin-bottom:12px;}",
      ".r2-sheet-head{font-size:12px;font-weight:900;letter-spacing:0.06em;color:#101010;text-transform:uppercase;margin-bottom:6px;}",
      ".r2-q-label{font-weight:900;font-size:16px;margin-bottom:10px;color:#111;}",
      ".r2-instruction{font-size:17px;font-weight:900;color:#111;margin-bottom:10px;}",
      ".r2-stem-box{border:1px solid #b8b8b8;border-radius:4px;padding:8px 10px;margin:8px 0 6px;background:#fff;}",
      ".r2-stem{font-size:14px;line-height:1.7;color:#101010;margin:12px 0;word-break:keep-all;}",
      ".r2-connector-pill{display:inline-block;padding:0 9px;min-height:22px;line-height:22px;border:1px solid #111;border-radius:999px;background:#efefef;font-size:13px;font-weight:900;color:#111;vertical-align:middle;}",
      ".r2-meaning{font-size:13px;line-height:1.6;color:#262626;margin:10px 0 2px;}",
      ".r2-slot-area{display:flex;align-items:flex-end;flex-wrap:wrap;gap:3px;padding:2px 0 0;min-height:44px;margin-top:18px;}",
      ".r2-fixed-token{display:inline-block;line-height:22px;padding:0 1px;font-weight:900;font-size:13px;color:#111;border-bottom:2px solid #111;}",
      ".r2-slot-input{width:48px;min-width:20px;height:22px;border:none;border-bottom:2px solid #111;border-radius:0;padding:0 1px 1px;font-size:13px;line-height:20px;text-align:center;outline:none;background:transparent;color:#111;}",
      ".r2-slot-input:focus{border-bottom-width:3px;}",
      ".r2-dot-tail{font-weight:900;font-size:16px;color:#111;line-height:20px;padding:0 1px 0 0;}",
      ".r2-btn-row{display:flex;gap:10px;margin-top:12px;}",
      ".r2-quiz-btn{flex:1;margin-top:0;padding:7px 12px;font-size:13px;background:#1f1f1f;color:#fff;border:1px solid #0a0a0a;border-radius:6px;cursor:pointer;font-weight:900;}",
      ".r2-quiz-btn:disabled{opacity:0.5;cursor:not-allowed;}",
      ".r2-feedback{margin-top:7px;font-weight:900;font-size:12px;min-height:15px;}",
      ".r2-feedback.ok{color:#1d6d20;}",
      ".r2-feedback.bad{color:#a32323;}"
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

  function buildSlotInputHTML(index, expectedToken) {
    var width = clamp((String(expectedToken || "").length * 8) + 8, 20, 80);
    var expectedAttr = String(expectedToken == null ? "" : expectedToken).replace(/"/g, "&quot;");
    return '<input class="r2-slot-input" id="r2-slot-' + index + '" data-idx="' + index + '" data-expected="' + expectedAttr + '" style="width:' + width + 'px;" autocomplete="off" />';
  }

  function getSlotElements() {
    return Array.from(document.querySelectorAll(".r2-slot-input"));
  }

  function moveFocus(targetIndex) {
    var slots = getSlotElements();
    if (!slots.length) return;
    var idx = clamp(targetIndex, 0, slots.length - 1);
    slots[idx].focus();
    slots[idx].select();
  }

  function distributeWordsFromIndex(startIndex, words) {
    var slots = getSlotElements();
    if (!slots.length) return;

    var cursor = Number(startIndex);
    for (var i = 0; i < words.length; i++) {
      if (cursor >= slots.length) break;
      slots[cursor].value = words[i];
      cursor += 1;
    }

    if (cursor < slots.length) {
      slots[cursor].focus();
    } else {
      slots[slots.length - 1].focus();
    }
  }

  function wireSlotEvents() {
    var slots = getSlotElements();
    if (!slots.length) return;

    slots.forEach(function (el, idx) {
      el.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          moveFocus(idx + 1);
          return;
        }
        if (ev.key === " " || ev.key === "Spacebar") {
          ev.preventDefault();
          moveFocus(idx + 1);
          return;
        }
        if (ev.key === "Backspace" && !String(el.value || "").trim()) {
          moveFocus(idx - 1);
        }
      });

      el.addEventListener("input", function () {
        var value = String(el.value || "");
        if (!/\s/.test(value)) return;
        var words = value.split(/\s+/).map(function (w) { return w.trim(); }).filter(Boolean);
        if (!words.length) return;
        distributeWordsFromIndex(idx, words);
      });
    });

    slots[0].focus();
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

  function formatConnectorLabel(connector) {
    var s = String(connector || "").trim();
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function parseBooleanCell(value, fallback) {
    var raw = String(value == null ? "" : value).trim().toLowerCase();
    if (!raw) return fallback;
    return !(raw === "0" || raw === "n" || raw === "no" || raw === "false");
  }

  function parseNumberCell(value, fallback) {
    var direct = Number(value);
    if (isFinite(direct)) return direct;

    var raw = String(value == null ? "" : value).trim();
    if (!raw) return Number(fallback);

    var m = raw.match(/-?\d+(?:\.\d+)?/);
    if (m) {
      var parsed = Number(m[0]);
      if (isFinite(parsed)) return parsed;
    }

    return Number(fallback);
  }

  function buildQuestionsFromRows() {
    var targetLesson = parseNumberCell(state.config.lesson, NaN);
    var targetExercise = parseNumberCell(state.config.exercise, NaN);
    var targetRound = parseNumberCell(state.config.round, NaN);
    var filtered = state.rawRows
      .filter(function (r) {
        return parseNumberCell(r["Lesson"], NaN) === targetLesson &&
          parseNumberCell(r["Exercise"], NaN) === targetExercise;
      })
      .filter(function (r) {
        if (typeof r["Round"] === "undefined" || String(r["Round"]).trim() === "") return true;
        return parseNumberCell(r["Round"], NaN) === targetRound;
      })
      .sort(function (a, b) {
        return parseNumberCell(a["QNumber"], 0) - parseNumberCell(b["QNumber"], 0);
      });

    var maxQuestions = parseNumberCell(state.config.maxQuestions, 0);
    if (maxQuestions > 0) {
      filtered = filtered.slice(0, maxQuestions);
    }

    state.questions = filtered.map(function (r, idx) {
      var modelAnswer = String(r["ModelAnswer"] != null ? r["ModelAnswer"] : (r["Answer"] || "")).trim();
      var tokens = tokenizeAnswerCore(modelAnswer);
      var firstWord = tokens[0] || String(r["FirstWord"] || "").trim();
      var blankWords = tokens.length > 0 ? tokens.slice(1) : [];

      var activeRaw = String(r["Active"] == null ? "" : r["Active"]).trim().toLowerCase();
      var isActive = true;
      if (activeRaw) {
        isActive = !(activeRaw === "0" || activeRaw === "n" || activeRaw === "no" || activeRaw === "false");
      }

      var shuffleRaw = String(r["ShuffleAB"] == null ? "" : r["ShuffleAB"]).trim().toLowerCase();
      var shuffleAB = true;
      if (shuffleRaw) {
        shuffleAB = !(shuffleRaw === "0" || shuffleRaw === "n" || shuffleRaw === "no" || shuffleRaw === "false");
      }

      var showConnector = parseBooleanCell(r["ShowConnector"], true);
      var round2Type = String(r["Round2Type"] == null ? "" : r["Round2Type"]).trim().toLowerCase();
      if (!round2Type) round2Type = showConnector ? "given-rel" : "fill-rel";

      return {
        no: idx + 1,
        qNumber: parseNumberCell(r["QNumber"], idx + 1) || idx + 1,
        title: String(r["Title"] || "").trim() || "Herma L6-E2 Round2",
        instruction: String(r["Instruction"] || "").trim() || INSTRUCTION_KR,
        sentenceA: ensureEndMark(String(r["SentenceA"] || "").trim()),
        sentenceB: ensureEndMark(String(r["SentenceB"] || "").trim()),
        sentenceC: ensureEndMark(String(r["SentenceC"] || "").trim()),
        connector: String(r["Connector"] || "").trim(),
        connectorLabel: formatConnectorLabel(r["Connector"]),
        koreanMeaning: String(
          r["KoreanMeaning"] != null ? r["KoreanMeaning"] :
          (r["MeaningKR"] != null ? r["MeaningKR"] :
          (r["Korean"] != null ? r["Korean"] : ""))
        ).trim(),
        modelAnswer: ensurePeriod(modelAnswer),
        firstWord: firstWord,
        blankWords: blankWords,
        blankNorm: blankWords.map(normalizeToken),
        active: isActive,
        shuffleAB: shuffleAB,
        showConnector: showConnector,
        round2Type: round2Type,
        swapAB: false,
        stemOrder: [],
      };
    }).filter(function (q) { return !!q.active; });
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
      '<div class="r2-sheet-box">',
      '  <div class="r2-sheet-head">Round2 Test</div>',
      '  <div class="r2-instruction">' + escapeHtml(instruction) + "</div>",
      '  <div style="font-size:13px;line-height:1.55;color:#1f1f1f;margin-bottom:8px;">',
      "    \uC81C\uC2DC\uB41C \uBB38\uC7A5\uB4E4\uC744 \uC774\uC5B4\uC11C \uD55C \uBB38\uC7A5\uC73C\uB85C \uC791\uC131\uD558\uC138\uC694.",
      "  </div>",
      '  <div style="font-size:12px;line-height:1.5;color:#2b2b2b;margin-bottom:8px;">',
      "    Total Questions: " + total,
      "  </div>",
      '  <button class="r2-quiz-btn" style="width:100%; margin-top:12px;" onclick="HermaL6E2Round2.startQuiz()">Start</button>',
      "</div>"
    ].join("\n");
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
    var sentenceByLabel = {
      A: q.sentenceA,
      B: q.sentenceB,
      C: q.sentenceC,
    };
    var stemOrder = Array.isArray(q.stemOrder) && q.stemOrder.length
      ? q.stemOrder
      : ["A", "B", "C"].filter(function (k) { return !!sentenceByLabel[k]; });
    var stemLines = stemOrder.map(function (label) {
      return '    <div class="r2-stem">' + label + ". " + escapeHtml(sentenceByLabel[label] || "") + "</div>";
    }).join("");

    area.innerHTML = [
      '<div class="r2-q-label">Q. ' + (state.currentIndex + 1) + " / " + state.questions.length + "</div>",
      '<div class="r2-sheet-box">',
      '  <div class="r2-instruction">' + escapeHtml(INSTRUCTION_KR) + "</div>",
      '  <div class="r2-stem-box">',
      stemLines,
      '    <div class="r2-meaning">(' + escapeHtml(q.koreanMeaning || MEANING_FALLBACK_KR) + ")</div>",
      "  </div>",
      '  <div class="r2-slot-area" id="r2-slot-area">',
      '    <span class="r2-fixed-token">' + escapeHtml(q.firstWord || "") + "</span>",
      q.blankWords.map(function (w, i) { return buildSlotInputHTML(i, w); }).join(""),
      '    <span class="r2-dot-tail">.</span>',
      "  </div>",
      '  <div class="r2-feedback" id="feedback-line"></div>',
      '  <div class="r2-btn-row">',
      '    <button class="r2-quiz-btn" id="submit-btn" onclick="HermaL6E2Round2.submitAnswer()">\uC81C\uCD9C</button>',
      '    <button class="r2-quiz-btn" id="next-btn" onclick="HermaL6E2Round2.goNext()" disabled>\uB2E4\uC74C</button>',
      "  </div>",
      "</div>"
    ].join("\n");

    wireSlotEvents();
  }

  function startQuiz() {
    if (!state.questions.length) {
      alert("No questions found for this round2.");
      return;
    }
    state.questions.forEach(function (q) {
      var order = ["A", "B", "C"].filter(function (label) {
        if (label === "A") return !!q.sentenceA;
        if (label === "B") return !!q.sentenceB;
        if (label === "C") return !!q.sentenceC;
        return false;
      });
      q.stemOrder = shuffleArray(order);
    });
    state.currentIndex = 0;
    state.results = [];
    renderQuestion();
  }

  function buildSentenceFromTokens(firstWord, blankTokens) {
    var tokens = [];
    if (String(firstWord || "").trim()) tokens.push(String(firstWord || "").trim());
    blankTokens.forEach(function (t) {
      tokens.push(String(t || "").trim());
    });

    var joined = tokens.join(" ").replace(/\s+([,!?;:])/g, "$1").trim();
    return joined.replace(/[.?!]\s*$/, "") + ".";
  }

  function submitAnswer() {
    if (state.questionLocked) return;

    var q = state.questions[state.currentIndex];
    if (!q) return;

    var slots = getSlotElements();
    var rawTokens = slots.map(function (el) {
      return String(el.value || "").trim();
    });
    var feedback = byId("feedback-line");
    var submitBtn = byId("submit-btn");
    var nextBtn = byId("next-btn");

    if (rawTokens.some(function (t) { return !t; })) {
      if (feedback) {
        feedback.className = "r2-feedback bad";
        feedback.textContent = "Fill all blanks before checking.";
      }
      if (global.HermaToastFX) global.HermaToastFX.show("no", "Fill all blanks.");
      return;
    }

    var userNorm = rawTokens.map(normalizeToken);
    var isCorrect = isTokenArrayEqual(userNorm, q.blankNorm);
    var selectedSentence = buildSentenceFromTokens(q.firstWord, rawTokens);

    state.results.push({
      no: state.currentIndex + 1,
      word: "Herma L6-E2 Round2 / Q" + q.qNumber,
      selected: selectedSentence,
      correct: isCorrect,
      qNumber: q.qNumber,
      connector: q.connector,
      modelAnswer: q.modelAnswer,
    });

    if (shouldFailFastNow()) {
      showResultPopup();
      return;
    }

    state.questionLocked = true;
    slots.forEach(function (el) {
      el.disabled = true;
    });
    if (submitBtn) submitBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = false;

    if (feedback) {
      feedback.className = isCorrect ? "r2-feedback ok" : "r2-feedback bad";
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
      word: "Herma L6-E2 Round2 / Q" + q.qNumber,
      selected: forceCorrect ? (q.modelAnswer || "alpha-force-right") : "alpha-force-next",
      correct: forceCorrect,
      qNumber: q.qNumber,
      connector: q.connector,
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
