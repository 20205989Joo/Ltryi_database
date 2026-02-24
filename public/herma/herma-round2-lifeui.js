(function (global) {
  "use strict";

  var FULL_TOUR_STORAGE_KEY = "HermaFullTourState";
  var MAX_LIVES = 3;
  var HEART_FILLED = "\u2665";
  var HEART_EMPTY = "\u2661";
  var POP_TEXT = "\uBF71!";
  var INTRO_START_LABEL = "\uD14C\uC2A4\uD2B8 \uC2DC\uC791!";
  var INTRO_TITLE_LINES = [
    "\uC774\uC81C",
    "\uD14C\uC2A4\uD2B8\uAC00",
    "\uC2DC\uC791\uB429\uB2C8\uB2E4"
  ];
  var INTRO_WARN_TOP = "\uC2E4\uD328\uD560 \uACBD\uC6B0";
  var INTRO_WARN_SUB = "(\uC815\uB2F5\uB960 80% \uBBF8\uB9CC)";
  var INTRO_WARN_BOLD = "\uCC98\uC74C\uC73C\uB85C";
  var INTRO_WARN_TAIL = " \uB3CC\uC544\uAC00\uAC8C \uB429\uB2C8\uB2E4!";

  var state = {
    lives: MAX_LIVES,
    wrongByQuestion: Object.create(null),
    lastQuestionKey: "",
    fullTourCapAppliedByScript: Object.create(null),
    fullTourCapPendingByScript: Object.create(null),
    fullTourCapValueByScript: Object.create(null),
  };

  var areaObserver = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function getHostArea() {
    return byId("quiz-area");
  }

  function isRound2Context() {
    try {
      var params = new URLSearchParams(global.location.search || "");
      if (params.get("round2") === "1") return true;
      if (params.get("round2Script")) return true;
      var key = String(params.get("key") || "").trim();
      if (/_round2$/i.test(key)) return true;
    } catch (_) {}

    if (global.__hermaRound2InjectConfig) return true;
    return false;
  }

  function hasFullTourFlagInQuery() {
    try {
      var params = new URLSearchParams(global.location.search || "");
      return String(params.get("fullTour") || "").trim() === "1";
    } catch (_) {
      return false;
    }
  }

  function readFullTourState() {
    try {
      var raw = sessionStorage.getItem(FULL_TOUR_STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function isFullTourMode() {
    if (hasFullTourFlagInQuery()) return true;
    var saved = readFullTourState();
    return !!(saved && saved.active);
  }

  function parseTourQCap(value, fallback) {
    var n = Number(value);
    if (!isFinite(n) || n <= 0) return Number(fallback || 0);
    return Math.max(1, Math.floor(n));
  }

  function getTourQCap() {
    var saved = readFullTourState();
    if (saved && typeof saved === "object") {
      var fromState = parseTourQCap(saved.qcap, 0);
      if (fromState > 0) return fromState;
    }
    try {
      var params = new URLSearchParams(global.location.search || "");
      var fromQuery = parseTourQCap(params.get("imsi_qcap") || params.get("qcap"), 0);
      if (fromQuery > 0) return fromQuery;
    } catch (_) {}
    return 1;
  }

  function hasRound2QLabelClass(el) {
    if (!el || !el.classList) return false;
    return Array.from(el.classList).some(function (cls) {
      return /^r\d+-q-label$/.test(cls);
    });
  }

  function parseQuestionInfoFromText(text) {
    var raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return null;
    var m = raw.match(/Q\.?\s*(\d+)\s*\/\s*(\d+)/i) || raw.match(/(\d+)\s*\/\s*(\d+)/);
    if (!m) return null;
    return {
      index: parseInt(m[1], 10),
      total: parseInt(m[2], 10),
    };
  }

  function findRound2QuestionLabel(area) {
    if (!area) return null;
    var labels = Array.from(area.querySelectorAll('[class*="q-label"]'));
    return labels.find(function (el) {
      if (!hasRound2QLabelClass(el)) return false;
      var txt = String(el.textContent || "");
      return /Q\.?\s*\d+\s*\/\s*\d+/i.test(txt) || /\d+\s*\/\s*\d+/.test(txt);
    }) || null;
  }

  function getCurrentQuestionInfo(area) {
    var label = findRound2QuestionLabel(area);
    if (!label) return null;
    var textNode = label.querySelector('[data-r2-life-qtext="1"]');
    var parsed = parseQuestionInfoFromText(textNode ? textNode.textContent : label.textContent);
    if (!parsed) return null;
    parsed.label = label;
    return parsed;
  }

  function getQuestionKey(info) {
    if (!info) return "";
    return String(info.index || "") + "/" + String(info.total || "");
  }

  function isRound2QuestionScreen(area) {
    if (!area) return false;
    var info = getCurrentQuestionInfo(area);
    if (!info) return false;
    return !!area.querySelector("#submit-btn") && !!area.querySelector("#next-btn");
  }

  function getSlotInputs(area) {
    if (!area) return [];
    return Array.from(area.querySelectorAll('input[class*="slot-input"]'));
  }

  function normalizeSlotToken(value) {
    return String(value == null ? "" : value)
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, "");
  }

  function clearWrongMarks(area) {
    if (!area) return;
    getSlotInputs(area).forEach(function (el) {
      el.classList.remove("r2-slot-wrong");
    });
    var freeInput = area.querySelector('.r43-answer-input, input[id$="word-input"]');
    if (freeInput) freeInput.classList.remove("r2-slot-wrong");
  }

  function applyWrongMarks(area) {
    if (!area) return;
    var slots = getSlotInputs(area);
    if (slots.length) {
      slots.forEach(function (el) {
        var expected = normalizeSlotToken(el.getAttribute("data-expected") || "");
        var user = normalizeSlotToken(el.value || "");
        var wrong = !!(expected && user && user !== expected);
        el.classList.toggle("r2-slot-wrong", wrong);
      });
      return;
    }

    var freeInput = area.querySelector('.r43-answer-input, input[id$="word-input"]');
    if (freeInput && normalizeSlotToken(freeInput.value || "")) {
      freeInput.classList.add("r2-slot-wrong");
    }
  }

  function bindWrongMarkInputReset(area) {
    if (!area) return;
    getSlotInputs(area).forEach(function (el) {
      if (el.dataset.r2WrongBound === "1") return;
      el.dataset.r2WrongBound = "1";
      el.addEventListener("input", function () {
        el.classList.remove("r2-slot-wrong");
      });
    });
    var freeInput = area.querySelector('.r43-answer-input, input[id$="word-input"]');
    if (freeInput && freeInput.dataset.r2WrongBound !== "1") {
      freeInput.dataset.r2WrongBound = "1";
      freeInput.addEventListener("input", function () {
        freeInput.classList.remove("r2-slot-wrong");
      });
    }
  }

  function syncWrongMarkByFeedback() {
    var area = getHostArea();
    if (!area || !isRound2QuestionScreen(area)) return;

    bindWrongMarkInputReset(area);

    var feedback = area.querySelector("#feedback-line");
    if (!feedback || !/\bbad\b/.test(String(feedback.className || ""))) {
      clearWrongMarks(area);
      return;
    }
    applyWrongMarks(area);
  }

  function isRound2IntroScreen(area) {
    if (!area) return false;
    var startBtn = area.querySelector('button[onclick*="Round2"][onclick*="startQuiz"]');
    if (!startBtn) return false;
    var hasSubmit = !!area.querySelector("#submit-btn, button[onclick*=\"submitAnswer\"]");
    var hasQuestionLabel = !!findRound2QuestionLabel(area);
    if (hasSubmit || hasQuestionLabel) return false;
    return true;
  }

  function ensureIntroBanner() {
    var area = getHostArea();
    if (!area) return;

    var existing = area.querySelector('[data-r2-life-intro-banner="1"]');
    var existingDivider = area.querySelector('[data-r2-life-intro-divider="1"]');
    var startBtn = area.querySelector('button[onclick*="Round2"][onclick*="startQuiz"]');
    if (startBtn && startBtn.textContent !== INTRO_START_LABEL) {
      startBtn.textContent = INTRO_START_LABEL;
    }

    if (!isRound2IntroScreen(area)) {
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      if (existingDivider && existingDivider.parentNode) existingDivider.parentNode.removeChild(existingDivider);
      return;
    }

    var targetBox = area.querySelector('.r2-sheet-box, [class*="sheet-box"]');
    if (!targetBox) targetBox = area;
    var instructionNode = targetBox.querySelector('[class*="instruction"]');
    var sheetHeadNode = targetBox.querySelector('[class*="sheet-head"]');

    if (!existingDivider) {
      var divider = document.createElement("div");
      divider.setAttribute("data-r2-life-intro-divider", "1");
      divider.style.borderTop = "1px dashed #8b8b8b";
      divider.style.margin = "6px 0 18px";
      divider.style.height = "0";
      if (sheetHeadNode && sheetHeadNode.parentNode === targetBox) {
        targetBox.insertBefore(divider, sheetHeadNode.nextSibling);
      } else if (instructionNode && instructionNode.parentNode === targetBox) {
        targetBox.insertBefore(divider, instructionNode);
      } else {
        targetBox.insertBefore(divider, targetBox.firstChild);
      }
    }

    if (existing) return;

    var banner = document.createElement("div");
    banner.setAttribute("data-r2-life-intro-banner", "1");
    banner.style.minHeight = "146px";
    banner.style.margin = "16px 0 18px";
    banner.style.padding = "20px 12px 18px";
    banner.style.border = "2px solid #101010";
    banner.style.borderRadius = "10px";
    banner.style.background = "linear-gradient(180deg,#ffffff 0%,#efefef 100%)";
    banner.style.display = "flex";
    banner.style.flexDirection = "column";
    banner.style.justifyContent = "center";
    banner.style.alignItems = "center";
    banner.style.gap = "0";
    banner.style.boxSizing = "border-box";

    INTRO_TITLE_LINES.forEach(function (line) {
      var row = document.createElement("div");
      row.textContent = line;
      row.style.fontSize = "24px";
      row.style.fontWeight = "900";
      row.style.letterSpacing = "0.04em";
      row.style.lineHeight = "1.08";
      row.style.color = "#0f0f0f";
      banner.appendChild(row);
    });

    var inBoxDivider = document.createElement("div");
    inBoxDivider.style.width = "100%";
    inBoxDivider.style.borderTop = "1px dashed #8b8b8b";
    inBoxDivider.style.margin = "12px 0 10px";
    inBoxDivider.style.height = "0";
    banner.appendChild(inBoxDivider);

    var warnWrap = document.createElement("div");
    warnWrap.style.color = "#c62828";
    warnWrap.style.fontSize = "14px";
    warnWrap.style.fontWeight = "400";
    warnWrap.style.textAlign = "center";
    warnWrap.style.lineHeight = "1.3";

    var warnLineTop = document.createElement("div");
    warnLineTop.textContent = INTRO_WARN_TOP;
    warnWrap.appendChild(warnLineTop);

    var warnLineSub = document.createElement("div");
    warnLineSub.textContent = INTRO_WARN_SUB;
    warnLineSub.style.fontSize = "12px";
    warnLineSub.style.marginBottom = "2px";
    warnWrap.appendChild(warnLineSub);

    var warnLineBottom = document.createElement("div");
    var strong = document.createElement("strong");
    strong.textContent = INTRO_WARN_BOLD;
    warnLineBottom.appendChild(strong);
    warnLineBottom.appendChild(document.createTextNode(INTRO_WARN_TAIL));
    warnWrap.appendChild(warnLineBottom);

    banner.appendChild(warnWrap);

    if (instructionNode && instructionNode.parentNode === targetBox) {
      targetBox.insertBefore(banner, instructionNode.nextSibling);
    } else {
      targetBox.insertBefore(banner, targetBox.firstChild);
    }
  }

  function ensureStyles() {
    if (byId("r2-lifeui-style")) return;
    var style = document.createElement("style");
    style.id = "r2-lifeui-style";
    style.textContent = [
      '[data-r2-life-gauge="1"]{display:inline-flex;align-items:center;gap:4px;min-height:20px;}',
      '[data-r2-life-heart="1"]{position:relative;font-size:16px;line-height:1;color:#d12525;transform-origin:center center;display:inline-block;transition:color .15s ease, transform .15s ease, opacity .15s ease;}',
      '[data-r2-life-heart="1"].is-empty{color:#b8b8b8;opacity:.95;}',
      '[data-r2-life-heart="1"].is-pop{animation:r2LifeHeartPop .22s ease-out 1;}',
      '[data-r2-life-pop="1"]{position:absolute;left:50%;top:-12px;transform:translateX(-50%);font-size:10px;font-weight:900;color:#d12525;pointer-events:none;animation:r2LifePopText .34s ease-out 1;}',
      '.r2-slot-wrong{border-color:#c62828 !important;background:#ffe8e8 !important;box-shadow:inset 0 -2px 0 #c62828 !important;}',
      '@keyframes r2LifeHeartPop{0%{transform:scale(1);opacity:1;}45%{transform:scale(1.45);opacity:.85;}100%{transform:scale(.78);opacity:.55;}}',
      '@keyframes r2LifePopText{0%{opacity:0;transform:translate(-50%,2px) scale(.85);}30%{opacity:1;}100%{opacity:0;transform:translate(-50%,-9px) scale(1.02);}}',
    ].join("");
    document.head.appendChild(style);
  }

  function resetLives() {
    state.lives = MAX_LIVES;
    state.wrongByQuestion = Object.create(null);
    state.lastQuestionKey = "";
  }

  function updateGauge(popIndex) {
    var area = getHostArea();
    if (!area) return;
    var hearts = Array.from(area.querySelectorAll('[data-r2-life-heart="1"]'));
    if (!hearts.length) return;

    hearts.forEach(function (heart, idx) {
      var filled = idx < state.lives;
      var text = filled ? HEART_FILLED : HEART_EMPTY;
      if (heart.textContent !== text) heart.textContent = text;
      heart.classList.toggle("is-empty", !filled);

      if (typeof popIndex === "number" && popIndex === idx) {
        heart.classList.remove("is-pop");
        void heart.offsetWidth;
        heart.classList.add("is-pop");

        var pop = document.createElement("span");
        pop.setAttribute("data-r2-life-pop", "1");
        pop.textContent = POP_TEXT;
        heart.appendChild(pop);

        setTimeout(function () {
          heart.classList.remove("is-pop");
          if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
        }, 360);
      }
    });
  }

  function consumeLife(questionKey) {
    if (!questionKey) return;
    if (state.wrongByQuestion[questionKey]) return;
    state.wrongByQuestion[questionKey] = true;

    if (state.lives <= 0) return;
    var popIndex = state.lives - 1;
    state.lives -= 1;
    updateGauge(popIndex);
  }

  function ensureGauge() {
    var area = getHostArea();
    if (!area || !isRound2QuestionScreen(area)) return;

    var info = getCurrentQuestionInfo(area);
    if (!info || !info.label) return;

    ensureStyles();

    var key = getQuestionKey(info);
    if (info.index === 1 && state.lastQuestionKey !== key) {
      resetLives();
    }
    state.lastQuestionKey = key;

    var label = info.label;
    var qText = label.querySelector('[data-r2-life-qtext="1"]');
    if (!qText) {
      qText = document.createElement("span");
      qText.setAttribute("data-r2-life-qtext", "1");
      qText.textContent = String(label.textContent || "").replace(/\s+/g, " ").trim();
      while (label.firstChild) {
        label.removeChild(label.firstChild);
      }
      label.appendChild(qText);
    }

    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.justifyContent = "space-between";
    label.style.gap = "8px";

    var gauge = label.querySelector('[data-r2-life-gauge="1"]');
    if (!gauge) {
      gauge = document.createElement("span");
      gauge.setAttribute("data-r2-life-gauge", "1");
      for (var i = 0; i < MAX_LIVES; i += 1) {
        var heart = document.createElement("span");
        heart.setAttribute("data-r2-life-heart", "1");
        gauge.appendChild(heart);
      }
      label.appendChild(gauge);
    }

    updateGauge();
  }

  function handleSubmitOutcome(beforeInfo) {
    var area = getHostArea();
    if (!area || !isRound2QuestionScreen(area)) return;

    var nextBtn = area.querySelector("#next-btn");
    if (!nextBtn || nextBtn.disabled) return;

    var feedback = area.querySelector("#feedback-line");
    if (!feedback) return;
    if (!/\bbad\b/.test(String(feedback.className || ""))) return;

    var afterInfo = getCurrentQuestionInfo(area) || beforeInfo;
    consumeLife(getQuestionKey(afterInfo));
  }

  function wrapMethod(holder, key, mode) {
    if (!holder || typeof holder[key] !== "function") return;
    var original = holder[key];
    var wrappedFlag = "__r2LifeUiWrapped_" + mode;
    if (original[wrappedFlag]) return;

    var wrapped = function () {
      var beforeInfo = mode === "submit" || mode === "next" ? getCurrentQuestionInfo(getHostArea()) : null;
      var alphaForcedWrong = false;
      if (mode === "next") {
        var forceResult = String(global.__alphaForceResult || "").toLowerCase().trim();
        var forceWrong = forceResult === "wrong" || forceResult === "no" || forceResult === "bad" || forceResult === "incorrect" || forceResult === "fail";
        alphaForcedWrong = !!global.__alphaForceNext && forceWrong;
      }
      if (mode === "start") {
        resetLives();
      }

      var out = original.apply(this, arguments);
      setTimeout(function () {
        if (mode === "submit") handleSubmitOutcome(beforeInfo);
        if (mode === "next" && alphaForcedWrong) {
          consumeLife(getQuestionKey(beforeInfo));
        }
        ensureGauge();
        syncWrongMarkByFeedback();
      }, 0);
      return out;
    };

    wrapped[wrappedFlag] = true;
    wrapped.__r2LifeUiOriginal = original;
    holder[key] = wrapped;
  }

  function collectRound2Apis() {
    return Object.keys(global).map(function (name) {
      return {
        name: name,
        value: global[name],
      };
    }).filter(function (entry) {
      var obj = entry.value;
      if (!obj || typeof obj !== "object") return false;
      if (typeof obj.startQuiz !== "function") return false;
      if (typeof obj.submitAnswer !== "function") return false;
      if (typeof obj.goNext !== "function") return false;

      var scriptName = String(obj.scriptName || "");
      if (/_round2\.js$/i.test(scriptName)) return true;
      return /Round2/.test(entry.name);
    }).map(function (entry) {
      return entry.value;
    });
  }

  function ensureHooks() {
    collectRound2Apis().forEach(function (api) {
      wrapMethod(api, "startQuiz", "start");
      wrapMethod(api, "submitAnswer", "submit");
      wrapMethod(api, "goNext", "next");
    });

    wrapMethod(global, "startQuiz", "start");
    wrapMethod(global, "submitAnswer", "submit");
    wrapMethod(global, "goNext", "next");
  }

  function ensureFullTourRound2Cap() {
    if (!isRound2Context()) return;
    if (!isFullTourMode()) return;
    var targetQCap = getTourQCap();

    collectRound2Apis().forEach(function (api, idx) {
      if (!api || typeof api.mount !== "function") return;
      var key = String(api.scriptName || "").trim();
      if (!key) key = "round2_api_" + String(idx);
      if (state.fullTourCapAppliedByScript[key] && state.fullTourCapValueByScript[key] === targetQCap) return;
      if (state.fullTourCapPendingByScript[key]) return;

      state.fullTourCapPendingByScript[key] = true;

      var mountResult;
      try {
        mountResult = api.mount({
          force: true,
          maxQuestions: targetQCap
        });
      } catch (_) {
        state.fullTourCapPendingByScript[key] = false;
        state.fullTourCapAppliedByScript[key] = false;
        return;
      }

      Promise.resolve(mountResult).then(function (ok) {
        state.fullTourCapPendingByScript[key] = false;
        state.fullTourCapAppliedByScript[key] = !!ok;
        if (ok) state.fullTourCapValueByScript[key] = targetQCap;
      }).catch(function () {
        state.fullTourCapPendingByScript[key] = false;
        state.fullTourCapAppliedByScript[key] = false;
      });
    });
  }

  function sync() {
    if (!isRound2Context()) return;
    var area = getHostArea();
    if (isRound2IntroScreen(area)) {
      resetLives();
    }
    ensureHooks();
    ensureFullTourRound2Cap();
    ensureIntroBanner();
    ensureGauge();
    syncWrongMarkByFeedback();
  }

  function installAreaObserver() {
    var area = getHostArea();
    if (!area || areaObserver) return;
    areaObserver = new MutationObserver(function () {
      sync();
    });
    areaObserver.observe(area, { childList: true, subtree: true });
  }

  function boot() {
    if (!isRound2Context()) return;
    ensureHooks();
    ensureFullTourRound2Cap();
    installAreaObserver();
    sync();
    setTimeout(function () {
      ensureFullTourRound2Cap();
      sync();
    }, 120);
    setTimeout(function () {
      ensureFullTourRound2Cap();
      sync();
    }, 380);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  global.HermaRound2LifeUI = {
    sync: sync,
    reset: resetLives,
    getLives: function () { return state.lives; },
  };
})(window);
