// ver1.1_26.02.22
(function () {
  "use strict";

  var FLOW_STORAGE_KEY = "HermaRound2FlowMap";
  var DEFAULT_RELEARN_LIMIT = 6;

  var state = {
    enabled: true,
    limit: 4,
    wrappedBuild: false,
    wrappedStart: false,
    timerId: null,
    observer: null,
    appliedCount: 0,
    lastAppliedSize: 0,
    flowEnforced: false,
    round2Mode: false,
    relearnShuffleApplied: false
  };

  function readQueryLimit() {
    try {
      var sp = new URLSearchParams(window.location.search || "");
      var raw = sp.get("imsi_qcap") || sp.get("qcap");
      if (raw === null || raw === "") return;
      if (/^(off|false|0)$/i.test(String(raw))) {
        state.enabled = false;
        return;
      }
      var n = Number(raw);
      if (isFinite(n) && n > 0) state.limit = Math.floor(n);
    } catch (_) {}
  }

  function getCurrentParamsSafe() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function normalizeQuizKey(key) {
    return String(key || "").trim();
  }

  function toBaseQuizKey(key) {
    return normalizeQuizKey(key).replace(/_round2$/i, "");
  }

  function getCurrentQuizKeyFromQuery() {
    var sp = getCurrentParamsSafe();
    return normalizeQuizKey(sp.get("key") || "");
  }

  function isRound2Mode() {
    var sp = getCurrentParamsSafe();
    var key = getCurrentQuizKeyFromQuery();
    if (/_round2$/i.test(key)) return true;
    return String(sp.get("round2") || "").trim() === "1";
  }

  function readFlowMap() {
    try {
      var raw = localStorage.getItem(FLOW_STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function getFlowStateForCurrentQuiz() {
    var baseKey = toBaseQuizKey(getCurrentQuizKeyFromQuery());
    if (!baseKey) return null;
    var map = readFlowMap();
    var entry = map[baseKey];
    return entry && typeof entry === "object" ? entry : null;
  }

  function applyFlowOverride() {
    state.flowEnforced = false;
    state.round2Mode = isRound2Mode();
    state.relearnShuffleApplied = false;

    if (state.round2Mode) {
      state.enabled = false;
      return;
    }

    var entry = getFlowStateForCurrentQuiz();
    if (!entry || !entry.requireRelearn) return;

    var minLearn = Number(entry.minLearnCount || DEFAULT_RELEARN_LIMIT);
    if (!(isFinite(minLearn) && minLearn > 0)) minLearn = DEFAULT_RELEARN_LIMIT;

    state.enabled = true;
    state.limit = Math.floor(minLearn);
    state.flowEnforced = true;
  }

  function getQuestionsArraySafe() {
    try {
      if (typeof questions === "undefined") return null;
      if (!Array.isArray(questions)) return null;
      return questions;
    } catch (_) {
      return null;
    }
  }

  function clampCurrentIndexSafe(arr) {
    try {
      if (typeof currentIndex === "undefined") return;
      var idx = Number(currentIndex);
      if (!isFinite(idx)) return;
      if (idx >= arr.length && arr.length > 0) currentIndex = arr.length - 1;
      if (idx < 0) currentIndex = 0;
    } catch (_) {}
  }

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  function shouldShuffleForRelearn() {
    if (!state.flowEnforced) return false;
    if (state.round2Mode) return false;
    var cap = Number(state.limit || 0);
    if (!(cap > 0)) return false;
    return cap >= DEFAULT_RELEARN_LIMIT;
  }

  function applyQuestionCap() {
    if (!state.enabled) return false;
    var arr = getQuestionsArraySafe();
    if (!arr || !arr.length) return false;
    var cap = Number(state.limit || 20);
    if (!(cap > 0)) return false;
    if (arr.length <= cap) return false;

    if (shouldShuffleForRelearn() && !state.relearnShuffleApplied) {
      shuffleInPlace(arr);
      state.relearnShuffleApplied = true;
    }

    arr.splice(cap);
    clampCurrentIndexSafe(arr);
    state.appliedCount += 1;
    state.lastAppliedSize = arr.length;
    return true;
  }

  function wrapBuildQuestionsFromRows() {
    if (state.wrappedBuild) return;
    if (typeof window.buildQuestionsFromRows !== "function") return;

    var original = window.buildQuestionsFromRows;
    if (original.__imsiQCapWrappedBuild) {
      state.wrappedBuild = true;
      return;
    }

    var wrapped = function () {
      var out = original.apply(this, arguments);
      applyQuestionCap();
      return out;
    };
    wrapped.__imsiQCapWrappedBuild = true;
    wrapped.__imsiQCapOriginal = original;
    window.buildQuestionsFromRows = wrapped;
    state.wrappedBuild = true;
  }

  function wrapStartQuiz() {
    if (state.wrappedStart) return;
    if (typeof window.startQuiz !== "function") return;

    var original = window.startQuiz;
    if (original.__imsiQCapWrappedStart) {
      state.wrappedStart = true;
      return;
    }

    var wrapped = function () {
      applyQuestionCap();
      return original.apply(this, arguments);
    };
    wrapped.__imsiQCapWrappedStart = true;
    wrapped.__imsiQCapOriginal = original;
    window.startQuiz = wrapped;
    state.wrappedStart = true;
  }

  function runHooks() {
    wrapBuildQuestionsFromRows();
    wrapStartQuiz();
    applyQuestionCap();
  }

  function exposeApi() {
    window.ImsiQuestionsCompressor = {
      enable: function () {
        state.enabled = true;
        return applyQuestionCap();
      },
      disable: function () {
        state.enabled = false;
        return true;
      },
      setLimit: function (n) {
        var v = Number(n);
        if (!(v > 0) || !isFinite(v)) return false;
        state.limit = Math.floor(v);
        return applyQuestionCap();
      },
      apply: applyQuestionCap,
      status: function () {
        var arr = getQuestionsArraySafe();
        return {
          enabled: state.enabled,
          limit: state.limit,
          questionsLength: arr ? arr.length : null,
          appliedCount: state.appliedCount,
          lastAppliedSize: state.lastAppliedSize,
          flowEnforced: state.flowEnforced,
          round2Mode: state.round2Mode
        };
      }
    };
  }

  function start() {
    readQueryLimit();
    applyFlowOverride();
    runHooks();
    exposeApi();

    var root = document.documentElement || document.body;
    if (root && typeof MutationObserver === "function") {
      state.observer = new MutationObserver(function () {
        runHooks();
      });
      state.observer.observe(root, { childList: true, subtree: true });
    }

    if (!state.timerId) {
      state.timerId = window.setInterval(runHooks, 1200);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
