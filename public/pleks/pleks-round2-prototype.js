(function () {
  "use strict";

  var state = {
    activeScript: "",
    activeChoiceId: "",
    injectedAt: "",
  };
  var introBannerObserver = null;
  var INTRO_START_LABEL = "\uD14C\uC2A4\uD2B8 \uC2DC\uC791!";
  var INTRO_BANNER_MAIN_LINES = [
    "\uC774\uC81C",
    "\uD14C\uC2A4\uD2B8\uAC00",
    "\uC2DC\uC791\uB429\uB2C8\uB2E4",
  ];
  var INTRO_FAIL_LINE_1 = "\uC2E4\uD328\uD560 \uACBD\uC6B0";
  var INTRO_FAIL_LINE_1_SUB = "(\uC815\uB2F5\uB960 80% \uBBF8\uB9CC)";
  var INTRO_FAIL_BOLD = "\uCC98\uC74C\uC73C\uB85C";
  var INTRO_FAIL_LINE_2_TAIL = "\uB3CC\uC544\uAC00\uAC8C \uB429\uB2C8\uB2E4!";
  var ENERGY_MAX_LIVES = 3;
  var ENERGY_HEART_FILLED = "\u2665";
  var ENERGY_HEART_EMPTY = "\u2661";
  var energyState = {
    lives: ENERGY_MAX_LIVES,
    wrongByQuestion: {},
    lastQuestionKey: "",
  };

  var scriptChoices = [
    {
      id: "l1e1",
      short: "1-1",
      label: "L1-E1",
      script: "pleks-l1e1_round2.js",
      mountApi: "PleksL1E1Round2",
      livePage: "pleks-l1e1.html",
      enabled: false,
    },
    {
      id: "l1e2",
      short: "1-2",
      label: "L1-E2",
      script: "pleks-l1e2_round2.js",
      mountApi: "PleksL1E2Round2",
      livePage: "pleks-l1e2.html",
      enabled: true,
    },
    {
      id: "l1e3",
      short: "1-3",
      label: "L1-E3",
      script: "pleks-l1e3_round2.js",
      mountApi: "PleksL1E3Round2",
      livePage: "pleks-l1e3.html",
      enabled: true,
    },
    {
      id: "l1e4",
      short: "1-4",
      label: "L1-E4",
      script: "pleks-l1e4_round2.js",
      mountApi: "PleksL1E4Round2",
      livePage: "pleks-l1e4.html",
      enabled: true,
    },
    {
      id: "l2e1",
      short: "2-1",
      label: "L2-E1",
      script: "pleks-l2e1_round2.js",
      mountApi: "PleksL2E1Round2",
      livePage: "pleks-l2e1.html",
      enabled: true,
    },
    {
      id: "l2e2",
      short: "2-2",
      label: "L2-E2",
      script: "pleks-l2e2_round2.js",
      mountApi: "PleksL2E2Round2",
      livePage: "pleks-l2e2.html",
      enabled: true,
    },
    {
      id: "l2e3",
      short: "2-3",
      label: "L2-E3",
      script: "pleks-l2e3_round2.js",
      mountApi: "PleksL2E3Round2",
      livePage: "pleks-l2e3.html",
      enabled: true,
    },
    {
      id: "l2e4",
      short: "2-4",
      label: "L2-E4",
      script: "pleks-l2e4_round2.js",
      mountApi: "PleksL2E4Round2",
      livePage: "pleks-l2e4.html",
      enabled: true,
    },
    {
      id: "l3e1",
      short: "3-1",
      label: "L3-E1",
      script: "pleks-l3e1_round2.js",
      mountApi: "PleksL3E1Round2",
      livePage: "pleks-l3e1.html",
      enabled: true,
    },
    {
      id: "l3e2",
      short: "3-2",
      label: "L3-E2",
      script: "pleks-l3e2_round2.js",
      mountApi: "PleksL3E2Round2",
      livePage: "pleks-l3e2.html",
      enabled: true,
    },
    {
      id: "l3e3",
      short: "3-3",
      label: "L3-E3",
      script: "pleks-l3e3_round2.js",
      mountApi: "PleksL3E3Round2",
      livePage: "pleks-l3e3.html",
      enabled: true,
    },
    {
      id: "l3e4",
      short: "3-4",
      label: "L3-E4",
      script: "pleks-l3e4_round2.js",
      mountApi: "PleksL3E4Round2",
      livePage: "pleks-l3e4.html",
      enabled: true,
    },
    {
      id: "l3e6",
      short: "3-6",
      label: "L3-E6",
      script: "pleks-l3e6_round2.js",
      mountApi: "PleksL3E6Round2",
      livePage: "pleks-l3e6.html",
      enabled: true,
    },
    {
      id: "l4e1",
      short: "4-1",
      label: "L4-E1",
      script: "pleks-l4e1_round2.js",
      mountApi: "PleksL4E1Round2",
      livePage: "pleks-l4e1.html",
      enabled: true,
    },
    {
      id: "l4e2",
      short: "4-2",
      label: "L4-E2",
      script: "pleks-l4e2_round2.js",
      mountApi: "PleksL4E2Round2",
      livePage: "pleks-l4e2.html",
      enabled: true,
    },
    {
      id: "l4e3",
      short: "4-3",
      label: "L4-E3",
      script: "pleks-l4e3_round2.js",
      mountApi: "PleksL4E3Round2",
      livePage: "pleks-l4e3.html",
      enabled: true,
    },
    {
      id: "l5e1",
      short: "5-1",
      label: "L5-E1",
      script: "pleks-l5e1_round2.js",
      mountApi: "PleksL5E1Round2",
      livePage: "pleks-l5e1.html",
      enabled: true,
    },
    {
      id: "l5e2",
      short: "5-2",
      label: "L5-E2",
      script: "pleks-l5e2_round2.js",
      mountApi: "PleksL5E2Round2",
      livePage: "pleks-l5e2.html",
      enabled: true,
    },
    {
      id: "l6e1",
      short: "6-1",
      label: "L6-E1",
      script: "pleks-l6e1_round2.js",
      mountApi: "PleksL6E1Round2",
      livePage: "pleks-l6e1.html",
      enabled: true,
    },
    {
      id: "l6e2",
      short: "6-2",
      label: "L6-E2",
      script: "pleks-l6e2_round2.js",
      mountApi: "PleksL6E2Round2",
      livePage: "pleks-l6e2.html",
      enabled: true,
    },
    {
      id: "l6e3",
      short: "6-3",
      label: "L6-E3",
      script: "pleks-l6e3_round2.js",
      mountApi: "PleksL6E3Round2",
      livePage: "pleks-l6e3.html",
      enabled: true,
    },
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function readCurrentParams() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function wireBackButton() {
    var backBtn = byId("back-btn");
    if (!backBtn) return;
    backBtn.addEventListener("click", function () {
      history.back();
    });
  }

  function isRound2IntroScreen(area) {
    if (!area) return false;
    var startBtn = area.querySelector('button[onclick*="startQuiz"]');
    if (!startBtn) return false;
    var hasSubmit = !!area.querySelector('#submit-btn, button[onclick*="submitAnswer"]');
    var hasQuestionLabel = !!area.querySelector(".q-label, .r2-q-label");
    if (hasSubmit || hasQuestionLabel) return false;
    return true;
  }

  function ensureRound2IntroBanner() {
    var area = byId("quiz-area");
    if (!area) return;

    var existing = area.querySelector('[data-r2-intro-banner="1"]');
    var existingDivider = area.querySelector('[data-r2-intro-divider="1"]');
    var startBtn = area.querySelector('button[onclick*="startQuiz"]');
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
      divider.setAttribute("data-r2-intro-divider", "1");
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
    banner.setAttribute("data-r2-intro-banner", "1");
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

    INTRO_BANNER_MAIN_LINES.forEach(function (line) {
      var titleRow = document.createElement("div");
      titleRow.textContent = line;
      titleRow.style.fontSize = "24px";
      titleRow.style.fontWeight = "900";
      titleRow.style.letterSpacing = "0.04em";
      titleRow.style.lineHeight = "1.08";
      titleRow.style.color = "#0f0f0f";
      banner.appendChild(titleRow);
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

    var warnLine1 = document.createElement("div");
    warnLine1.textContent = INTRO_FAIL_LINE_1;
    warnWrap.appendChild(warnLine1);

    var warnLine1Sub = document.createElement("div");
    warnLine1Sub.textContent = INTRO_FAIL_LINE_1_SUB;
    warnLine1Sub.style.fontSize = "12px";
    warnLine1Sub.style.marginBottom = "2px";
    warnWrap.appendChild(warnLine1Sub);

    var warnLine2 = document.createElement("div");
    var boldWord = document.createElement("strong");
    boldWord.textContent = INTRO_FAIL_BOLD;
    warnLine2.appendChild(boldWord);
    warnLine2.appendChild(document.createTextNode(" " + INTRO_FAIL_LINE_2_TAIL));
    warnWrap.appendChild(warnLine2);
    banner.appendChild(warnWrap);

    if (instructionNode && instructionNode.parentNode === targetBox) {
      targetBox.insertBefore(banner, instructionNode);
    } else {
      targetBox.insertBefore(banner, targetBox.firstChild);
    }
  }

  function resetRound2EnergyState() {
    energyState.lives = ENERGY_MAX_LIVES;
    energyState.wrongByQuestion = {};
    energyState.lastQuestionKey = "";
  }

  function ensureRound2EnergyStyles() {
    if (byId("r2-energy-style")) return;
    var style = document.createElement("style");
    style.id = "r2-energy-style";
    style.textContent = [
      '[data-r2-energy-gauge="1"]{display:inline-flex;align-items:center;gap:4px;min-height:20px;}',
      '[data-r2-energy-heart="1"]{position:relative;font-size:16px;line-height:1;color:#d12525;transform-origin:center center;display:inline-block;transition:color .15s ease, transform .15s ease, opacity .15s ease;}',
      '[data-r2-energy-heart="1"].is-empty{color:#b8b8b8;opacity:.95;}',
      '[data-r2-energy-heart="1"].is-pop{animation:r2HeartPop .22s ease-out 1;}',
      '[data-r2-energy-pop="1"]{position:absolute;left:50%;top:-12px;transform:translateX(-50%);font-size:10px;font-weight:900;color:#d12525;pointer-events:none;animation:r2PopText .34s ease-out 1;}',
      '@keyframes r2HeartPop{0%{transform:scale(1);opacity:1;}45%{transform:scale(1.45);opacity:.85;}100%{transform:scale(.78);opacity:.55;}}',
      '@keyframes r2PopText{0%{opacity:0;transform:translate(-50%,2px) scale(.85);}30%{opacity:1;}100%{opacity:0;transform:translate(-50%,-9px) scale(1.02);}}',
    ].join("");
    document.head.appendChild(style);
  }

  function findRound2QuestionLabel(area) {
    if (!area) return null;
    var labels = Array.from(area.querySelectorAll('[class*="-q-label"], .q-label'));
    return labels.find(function (el) {
      var text = String(el.textContent || "");
      return /Q\.?\s*\d+\s*\/\s*\d+/i.test(text) || /\d+\s*\/\s*\d+/.test(text);
    }) || null;
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

  function getCurrentQuestionInfo(area) {
    var label = findRound2QuestionLabel(area);
    if (!label) return null;
    var textNode = label.querySelector('[data-r2-qtext="1"]');
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

  function updateEnergyGaugeDisplay(popIndex) {
    var area = byId("quiz-area");
    if (!area) return;
    var hearts = Array.from(area.querySelectorAll('[data-r2-energy-heart="1"]'));
    if (!hearts.length) return;

    hearts.forEach(function (heart, idx) {
      var isFilled = idx < energyState.lives;
      var targetChar = isFilled ? ENERGY_HEART_FILLED : ENERGY_HEART_EMPTY;
      if (heart.textContent !== targetChar) heart.textContent = targetChar;
      heart.classList.toggle("is-empty", !isFilled);
      if (typeof popIndex === "number" && popIndex === idx) {
        heart.classList.remove("is-pop");
        void heart.offsetWidth;
        heart.classList.add("is-pop");
        var pop = document.createElement("span");
        pop.setAttribute("data-r2-energy-pop", "1");
        pop.textContent = "\uBF71!";
        heart.appendChild(pop);
        setTimeout(function () {
          heart.classList.remove("is-pop");
          if (pop && pop.parentNode) pop.parentNode.removeChild(pop);
        }, 360);
      }
    });
  }

  function consumeLifeForQuestion(questionKey) {
    if (!questionKey) return;
    if (energyState.wrongByQuestion[questionKey]) return;
    energyState.wrongByQuestion[questionKey] = true;
    if (energyState.lives <= 0) return;
    var popIndex = energyState.lives - 1;
    energyState.lives -= 1;
    updateEnergyGaugeDisplay(popIndex);
  }

  function ensureRound2EnergyGauge() {
    var area = byId("quiz-area");
    if (!area || !isRound2QuestionScreen(area)) return;

    var info = getCurrentQuestionInfo(area);
    if (!info || !info.label) return;

    ensureRound2EnergyStyles();

    var questionKey = getQuestionKey(info);
    if (info.index === 1 && energyState.lastQuestionKey !== questionKey) {
      resetRound2EnergyState();
    }
    energyState.lastQuestionKey = questionKey;

    var label = info.label;
    var qText = label.querySelector('[data-r2-qtext="1"]');
    if (!qText) {
      qText = document.createElement("span");
      qText.setAttribute("data-r2-qtext", "1");
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

    var gauge = label.querySelector('[data-r2-energy-gauge="1"]');
    if (!gauge) {
      gauge = document.createElement("span");
      gauge.setAttribute("data-r2-energy-gauge", "1");
      for (var i = 0; i < ENERGY_MAX_LIVES; i += 1) {
        var heart = document.createElement("span");
        heart.setAttribute("data-r2-energy-heart", "1");
        gauge.appendChild(heart);
      }
      label.appendChild(gauge);
    }

    updateEnergyGaugeDisplay();
  }

  function handleRound2SubmitOutcome(beforeInfo) {
    var area = byId("quiz-area");
    if (!area || !isRound2QuestionScreen(area)) return;
    var nextBtn = area.querySelector("#next-btn");
    if (!nextBtn || nextBtn.disabled) return;

    var feedback = area.querySelector("#feedback-line");
    if (!feedback) return;
    if (!/\bbad\b/.test(String(feedback.className || ""))) return;

    var afterInfo = getCurrentQuestionInfo(area) || beforeInfo;
    consumeLifeForQuestion(getQuestionKey(afterInfo));
  }

  function wrapRound2Method(holder, key, mode) {
    if (!holder || typeof holder[key] !== "function") return;
    var original = holder[key];
    var flagName = "__r2EnergyWrapped_" + mode;
    if (original[flagName]) return;

    var wrapped = function () {
      var beforeInfo = mode === "submit" || mode === "next" ? getCurrentQuestionInfo(byId("quiz-area")) : null;
      var alphaForcedWrong = false;
      if (mode === "next") {
        var forceResult = String(window.__alphaForceResult || "").toLowerCase().trim();
        var forceWrong = forceResult === "wrong" || forceResult === "no" || forceResult === "bad" || forceResult === "incorrect" || forceResult === "fail";
        alphaForcedWrong = !!window.__alphaForceNext && forceWrong;
      }
      if (mode === "start") {
        resetRound2EnergyState();
      }
      var out = original.apply(this, arguments);
      setTimeout(function () {
        if (mode === "submit") handleRound2SubmitOutcome(beforeInfo);
        if (mode === "next" && alphaForcedWrong) {
          consumeLifeForQuestion(getQuestionKey(beforeInfo));
        }
        ensureRound2EnergyGauge();
      }, 0);
      return out;
    };
    wrapped[flagName] = true;
    wrapped.__r2EnergyOriginal = original;
    holder[key] = wrapped;
  }

  function ensureRound2EnergyHooks() {
    var choice = getCurrentChoice();
    var api = choice && choice.mountApi ? window[choice.mountApi] : null;

    if (api) {
      wrapRound2Method(api, "startQuiz", "start");
      wrapRound2Method(api, "submitAnswer", "submit");
      wrapRound2Method(api, "goNext", "next");
      window.startQuiz = api.startQuiz;
      window.submitAnswer = api.submitAnswer;
      window.goNext = api.goNext;
    }

    wrapRound2Method(window, "startQuiz", "start");
    wrapRound2Method(window, "submitAnswer", "submit");
    wrapRound2Method(window, "goNext", "next");
  }

  function syncRound2PrototypeEnhancers() {
    ensureRound2IntroBanner();
    ensureRound2EnergyHooks();
    ensureRound2EnergyGauge();
  }

  function installIntroBannerObserver() {
    var area = byId("quiz-area");
    if (!area) return;
    if (introBannerObserver) return;

    introBannerObserver = new MutationObserver(function () {
      syncRound2PrototypeEnhancers();
    });
    introBannerObserver.observe(area, { childList: true, subtree: true });
    syncRound2PrototypeEnhancers();
  }

  function ensureAlphaCompatibilityHooks() {
    if (typeof window.startQuiz !== "function") window.startQuiz = function () {};
    if (typeof window.submitAnswer !== "function") window.submitAnswer = function () {};
    if (typeof window.goNext !== "function") window.goNext = function () {};
  }

  function setStatus(message, isError) {
    var el = byId("inject-status");
    if (!el) return;
    el.textContent = String(message || "");
    el.style.color = isError ? "#a32323" : "#2a2a2a";
  }

  function getChoiceById(choiceId) {
    return scriptChoices.find(function (x) {
      return String(x.id) === String(choiceId);
    }) || null;
  }

  function getDefaultChoice() {
    return scriptChoices.find(function (x) { return !!x.enabled; }) || null;
  }

  function getCurrentChoice() {
    return getChoiceById(state.activeChoiceId) || getDefaultChoice();
  }

  function markActiveButton(choiceId) {
    state.activeChoiceId = String(choiceId || "");
    var buttons = Array.from(document.querySelectorAll(".proto-hex-btn[data-choice]"));
    buttons.forEach(function (btn) {
      var isActive = String(btn.getAttribute("data-choice") || "") === state.activeChoiceId;
      btn.classList.toggle("is-active", isActive);
    });
  }

  function cacheBust(url) {
    var sep = url.indexOf("?") >= 0 ? "&" : "?";
    return url + sep + "v=" + Date.now();
  }

  function removeExistingInjectedScript(scriptName) {
    var prev = document.querySelector('script[data-round2-script="' + scriptName + '"]');
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
  }

  function mountIfAvailable(choice) {
    if (!choice) return false;
    var api = window[choice.mountApi];
    if (!api || typeof api.mount !== "function") return false;
    api.mount({ force: true, autoMount: true });
    return true;
  }

  function injectRound2Script(choice) {
    if (!choice || !choice.enabled) return;

    resetRound2EnergyState();

    window.__PleksRound2InjectConfig = {
      script: choice.script,
      autoMount: true,
      force: true,
      source: "prototype",
    };

    state.activeScript = choice.script;
    state.injectedAt = new Date().toISOString();
    markActiveButton(choice.id);
    setStatus("Loading " + choice.script + " ...", false);

    if (mountIfAvailable(choice)) {
      setStatus("Mounted from existing API: " + choice.mountApi, false);
      setTimeout(syncRound2PrototypeEnhancers, 0);
      return;
    }

    removeExistingInjectedScript(choice.script);

    var scriptEl = document.createElement("script");
    scriptEl.src = cacheBust(choice.script);
    scriptEl.async = true;
    scriptEl.dataset.round2Script = choice.script;
    scriptEl.onload = function () {
      if (mountIfAvailable(choice)) {
        setStatus("Injected + mounted: " + choice.script, false);
        setTimeout(syncRound2PrototypeEnhancers, 0);
      } else {
        setStatus("Injected but mount API not found: " + choice.mountApi, true);
      }
    };
    scriptEl.onerror = function () {
      setStatus("Failed to load script: " + choice.script, true);
    };
    document.body.appendChild(scriptEl);
  }

  function buildLiveRound2Url(choice) {
    var params = readCurrentParams();
    var target = new URL(choice.livePage || "pleks-l1e2.html", window.location.href);

    if (params.get("id")) target.searchParams.set("id", params.get("id"));
    if (params.get("key")) target.searchParams.set("key", params.get("key"));

    target.searchParams.set("round2", "1");
    target.searchParams.set("round2Script", choice.script);
    return target.toString();
  }

  function openLiveRound2(choiceId) {
    var choice = getChoiceById(choiceId) || getCurrentChoice();
    if (!choice || !choice.enabled) return;
    window.location.assign(buildLiveRound2Url(choice));
  }

  function renderChoiceButton(choice) {
    var disabled = !choice.enabled;
    var readyClass = choice.enabled ? "is-ready" : "is-pending";
    return [
      '<button class="proto-hex-btn ' + readyClass + '" data-choice="' + escapeHtml(choice.id) + '" ',
      'title="' + escapeHtml(choice.label) + '" ',
      (disabled ? "disabled " : ""),
      'type="button">',
      '<span class="proto-hex-main">' + escapeHtml(choice.short) + "</span>",
      "</button>"
    ].join("");
  }

  function getLessonKey(choice) {
    var short = String(choice && choice.short ? choice.short : "");
    var lesson = short.split("-")[0];
    if (!lesson) lesson = "etc";
    return lesson;
  }

  function buildLessonGroups() {
    var groups = {};
    var order = [];
    scriptChoices.forEach(function (choice) {
      var lesson = getLessonKey(choice);
      if (!groups[lesson]) {
        groups[lesson] = [];
        order.push(lesson);
      }
      groups[lesson].push(choice);
    });
    return {
      order: order,
      groups: groups,
    };
  }

  function renderLessonRows() {
    var packed = buildLessonGroups();
    return packed.order.map(function (lesson) {
      var choices = packed.groups[lesson] || [];
      return [
        '<div class="proto-lesson-row">',
        '  <div class="proto-lesson-tag">L' + escapeHtml(lesson) + "</div>",
        '  <div class="proto-hex-row">',
        choices.map(renderChoiceButton).join(""),
        "  </div>",
        "</div>"
      ].join("\n");
    }).join("\n");
  }

  function renderLauncher() {
    var area = byId("quiz-area");
    if (!area) return;

    area.innerHTML = [
      '<div class="sheet-box">',
      '  <div class="sheet-head">ROUND2 SCRIPT INJECTOR</div>',
      '  <div style="font-size:17px;font-weight:900;margin-bottom:8px;color:#161616;">Round2 Hex Selector</div>',
      '  <div style="font-size:13px;line-height:1.6;color:#2f2f2f;margin-bottom:10px;">',
      "    Gray = ready / White = not ready",
      "  </div>",
      '  <div class="proto-lesson-grid">',
      renderLessonRows(),
      "  </div>",
      '  <div style="display:flex;gap:8px;margin-top:10px;">',
      '    <button id="proto-live-open" style="flex:1;height:34px;border:1px solid #111;border-radius:8px;background:#1e1e1e;color:#f4f4f4;font-weight:800;cursor:pointer;">Open Selected Live</button>',
      '    <button id="proto-refresh" style="flex:1;height:34px;border:1px solid #999;border-radius:8px;background:#efefef;color:#1f1f1f;font-weight:800;cursor:pointer;">Reset</button>',
      "  </div>",
      '  <div id="inject-status" style="margin-top:10px;min-height:18px;font-size:12px;font-weight:700;color:#2a2a2a;">Select a hex button.</div>',
      "</div>"
    ].join("\n");

    Array.from(document.querySelectorAll(".proto-hex-btn[data-choice]")).forEach(function (btn) {
      var id = btn.getAttribute("data-choice");
      btn.addEventListener("click", function () {
        var choice = getChoiceById(id);
        if (!choice) return;
        markActiveButton(id);
        if (choice.enabled) {
          injectRound2Script(choice);
        } else {
          setStatus("Not ready: " + choice.label, false);
        }
      });
    });

    var openBtn = byId("proto-live-open");
    if (openBtn) {
      openBtn.addEventListener("click", function () {
        var choice = getCurrentChoice();
        if (!choice) return;
        openLiveRound2(choice.id);
      });
    }

    var resetBtn = byId("proto-refresh");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        window.location.reload();
      });
    }

    var defaultChoice = getDefaultChoice();
    markActiveButton(defaultChoice ? defaultChoice.id : "");
  }

  window.addEventListener("DOMContentLoaded", function () {
    wireBackButton();
    ensureAlphaCompatibilityHooks();
    renderLauncher();
    installIntroBannerObserver();
  });
})();


