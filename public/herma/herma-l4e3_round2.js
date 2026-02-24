(function initHermaL4E3Round2(global) {
  "use strict";

  if (!global || global.HermaL4E3Round2) return;

  var MODULE_NAME = "HermaL4E3Round2";
  var SCRIPT_NAME = "herma-l4e3_round2.js";
  var STYLE_ID = "herma-l4e3-round2-style";
  var INSTRUCTION_KR = "'One'\uACFC 'the other'\uAC00 \uAC00\uB9AC\uD0A4\uB294 \uB300\uC0C1\uC744 \uC4F0\uC138\uC694";
  var ANSWER_LABEL_KR = "\uB2F5";
  var INPUT_REQUIRED_MSG = "\uB2E8\uC5B4\uB97C \uC785\uB825\uD558\uC138\uC694.";

  var DEFAULTS = {
    excelFile: "LTRYI-herma-round2-master.xlsx",
    lesson: 4,
    exercise: 3,
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
    day: "117",
    quizTitle: "quiz_Grammar_Basic_117_round2",
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

  function parseAcceptedTokens(value) {
    var out = [];
    String(value == null ? "" : value)
      .split(/[|,;/\n]+/)
      .map(function (s) { return normalizeToken(s); })
      .filter(Boolean)
      .forEach(function (t) {
        if (out.indexOf(t) === -1) out.push(t);
      });
    return out;
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
      el.onload = function () { resolve(); };
      el.onerror = function () { reject(new Error("failed to load script: " + url)); };
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
      ".r43-sheet-box{background:#fff;border:2px solid #101010;border-radius:8px;padding:10px;margin-bottom:12px;}",
      ".r43-sheet-head{font-size:12px;font-weight:900;letter-spacing:0.06em;color:#101010;text-transform:uppercase;margin-bottom:6px;}",
      ".r43-q-label{font-weight:900;font-size:16px;margin-bottom:10px;color:#111;}",
      ".r43-instruction{font-size:17px;font-weight:900;color:#111;margin-bottom:10px;}",
      ".r43-stem-box{border:1px solid #b8b8b8;border-radius:4px;padding:8px 10px;margin:8px 0 6px;background:#fff;}",
      ".r43-stem{font-size:14px;line-height:1.7;color:#101010;margin:10px 0;word-break:keep-all;}",
      ".r43-answer-wrap{display:flex;align-items:center;gap:8px;margin-top:18px;}",
      ".r43-answer-label{font-size:13px;font-weight:900;color:#161616;white-space:nowrap;}",
      ".r43-answer-input{flex:1;height:28px;border:none;border-bottom:2px solid #111;border-radius:0;padding:0 2px 2px;font-size:14px;line-height:24px;outline:none;background:transparent;color:#111;}",
      ".r43-answer-input:focus{border-bottom-width:3px;}",
      ".r43-btn-row{display:flex;gap:10px;margin-top:12px;}",
      ".r43-quiz-btn{flex:1;margin-top:0;padding:7px 12px;font-size:13px;background:#1f1f1f;color:#fff;border:1px solid #0a0a0a;border-radius:6px;cursor:pointer;font-weight:900;}",
      ".r43-quiz-btn:disabled{opacity:0.5;cursor:not-allowed;}",
      ".r43-feedback{margin-top:7px;font-weight:900;font-size:12px;min-height:15px;}",
      ".r43-feedback.ok{color:#1d6d20;}",
      ".r43-feedback.bad{color:#a32323;}"
    ].join("");
    document.head.appendChild(style);
  }

  function getHostArea() {
    return byId(state.config.hostId);
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
      var modelRaw = String(r["ModelAnswer"] != null ? r["ModelAnswer"] : (r["Answer"] || "")).trim();
      var modelNorm = normalizeToken(modelRaw);
      var accepted = parseAcceptedTokens(r["AcceptedAnswers"]);
      var prompt = ensureEndMark(String(r["CombinedSentence"] || "").trim());

      if (!prompt) {
        var sentenceA = String(r["SentenceA"] || "").trim();
        var sentenceB = String(r["SentenceB"] || "").trim();
        if (sentenceA && sentenceB) {
          prompt = ensureEndMark(sentenceA + " " + sentenceB);
        } else {
          prompt = ensureEndMark(sentenceA || sentenceB);
        }
      }

      if (modelNorm && accepted.indexOf(modelNorm) === -1) accepted.push(modelNorm);

      return {
        no: idx + 1,
        qNumber: Number(r["QNumber"]) || idx + 1,
        title: String(r["Title"] || "").trim() || "Herma L4-E3 Round2",
        instruction: String(r["Instruction"] || "").trim() || INSTRUCTION_KR,
        promptSentence: prompt,
        modelAnswer: modelRaw || "",
        acceptedNorm: accepted,
        active: active,
      };
    }).filter(function (q) {
      return !!q.active && !!q.promptSentence && q.acceptedNorm.length > 0;
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
      '<div class="r43-sheet-box">',
      '  <div class="r43-sheet-head">Round2 Test</div>',
      '  <div class="r43-instruction">' + escapeHtml(instruction) + "</div>",
      '  <div style="font-size:12px;line-height:1.5;color:#2b2b2b;margin-bottom:8px;">',
      "    Total Questions: " + total,
      "  </div>",
      '  <button class="r43-quiz-btn" style="width:100%; margin-top:12px;" onclick="HermaL4E3Round2.startQuiz()">Start</button>',
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

    area.innerHTML = [
      '<div class="r43-q-label">Q. ' + (state.currentIndex + 1) + " / " + state.questions.length + "</div>",
      '<div class="r43-sheet-box">',
      '  <div class="r43-instruction">' + escapeHtml(q.instruction || INSTRUCTION_KR) + "</div>",
      '  <div class="r43-stem-box">',
      '    <div class="r43-stem">' + escapeHtml(q.promptSentence) + "</div>",
      "  </div>",
      '  <div class="r43-answer-wrap">',
      '    <span class="r43-answer-label">' + escapeHtml(ANSWER_LABEL_KR) + " :</span>",
      '    <input id="r43-word-input" class="r43-answer-input" autocomplete="off" />',
      "  </div>",
      '  <div class="r43-feedback" id="feedback-line"></div>',
      '  <div class="r43-btn-row">',
      '    <button class="r43-quiz-btn" id="submit-btn" onclick="HermaL4E3Round2.submitAnswer()">\uC81C\uCD9C</button>',
      '    <button class="r43-quiz-btn" id="next-btn" onclick="HermaL4E3Round2.goNext()" disabled>\uB2E4\uC74C</button>',
      "  </div>",
      "</div>"
    ].join("\n");

    var input = byId("r43-word-input");
    if (input) {
      input.focus();
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          if (!state.questionLocked) submitAnswer();
          else goNext();
        }
      });
    }
  }

  function startQuiz() {
    if (!state.questions.length) {
      alert("No questions found for this round2.");
      return;
    }
    state.currentIndex = 0;
    state.results = [];
    renderQuestion();
  }

  function submitAnswer() {
    if (state.questionLocked) return;

    var q = state.questions[state.currentIndex];
    if (!q) return;

    var input = byId("r43-word-input");
    var feedback = byId("feedback-line");
    var submitBtn = byId("submit-btn");
    var nextBtn = byId("next-btn");

    var raw = String(input && input.value != null ? input.value : "").trim();
    if (!raw) {
      if (feedback) {
        feedback.className = "r43-feedback bad";
        feedback.textContent = INPUT_REQUIRED_MSG;
      }
      if (global.HermaToastFX) global.HermaToastFX.show("no", "Type one word.");
      return;
    }

    var norm = normalizeToken(raw);
    var isCorrect = q.acceptedNorm.indexOf(norm) !== -1;

    state.results.push({
      no: state.currentIndex + 1,
      word: "Herma L4-E3 Round2 / Q" + q.qNumber,
      selected: raw,
      correct: isCorrect,
      qNumber: q.qNumber,
      modelAnswer: q.modelAnswer,
    });

    if (shouldFailFastNow()) {
      showResultPopup();
      return;
    }

    state.questionLocked = true;
    if (input) input.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = false;

    if (feedback) {
      feedback.className = isCorrect ? "r43-feedback ok" : "r43-feedback bad";
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
      word: "Herma L4-E3 Round2 / Q" + q.qNumber,
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
