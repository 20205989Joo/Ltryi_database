// ver1.1_26.02.22
(function () {
  "use strict";

  var state = {
    wrapped: false,
    timerId: null,
    observer: null
  };

  function hasDishQuizCallInSource(fn) {
    try {
      return /DishQuizResultsTable/.test(String(fn));
    } catch (_) {
      return false;
    }
  }

  function readGlobal(name) {
    try {
      if (typeof window[name] === "undefined") return undefined;
      return window[name];
    } catch (_) {
      return undefined;
    }
  }

  function readQuizResultsFromStorage() {
    try {
      var raw = window.localStorage && window.localStorage.getItem("QuizResults");
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function normalizePayloadFromStorage(quiz) {
    if (!quiz || typeof quiz !== "object") return null;

    var results = Array.isArray(quiz.testspecific)
      ? quiz.testspecific
      : (Array.isArray(quiz.results) ? quiz.results : null);
    if (!Array.isArray(results)) return null;

    return {
      results: results,
      quizTitle: quiz.quizTitle || quiz.quiztitle || "",
      subcategory: quiz.subcategory,
      level: quiz.level,
      day: quiz.day,
      passScore: quiz.passScore
    };
  }

  function normalizePayloadFromGlobals() {
    var payload = {};

    var results = readGlobal("results");
    if (Array.isArray(results)) payload.results = results;

    var quizTitle = readGlobal("quizTitle");
    if (typeof quizTitle !== "undefined") payload.quizTitle = quizTitle;

    var subcategory = readGlobal("subcategory");
    if (typeof subcategory !== "undefined") payload.subcategory = subcategory;

    var level = readGlobal("level");
    if (typeof level !== "undefined") payload.level = level;

    var day = readGlobal("day");
    if (typeof day !== "undefined") payload.day = day;

    var passScore = readGlobal("passScore");
    if (typeof passScore !== "undefined") payload.passScore = passScore;

    return Array.isArray(payload.results) ? payload : null;
  }

  function buildPayload() {
    var fromStorage = normalizePayloadFromStorage(readQuizResultsFromStorage());
    if (fromStorage) return fromStorage;
    return normalizePayloadFromGlobals();
  }

  function tryShowResultsTable() {
    try {
      var show = window.DishQuizResultsTable && window.DishQuizResultsTable.show;
      if (typeof show !== "function") return false;
      var payload = buildPayload();
      if (!payload || !Array.isArray(payload.results)) return false;
      show(payload);
      return true;
    } catch (_) {
      return false;
    }
  }

  function wrapNamedResultFunction(name) {
    if (!name) return false;
    if (typeof window[name] !== "function") return false;

    var original = window[name];
    if (original.__imsiResultBridgeWrapped) {
      state.wrapped = true;
      return true;
    }

    if (hasDishQuizCallInSource(original)) {
      state.wrapped = true;
      return true;
    }

    var wrapped = function () {
      var out = original.apply(this, arguments);
      tryShowResultsTable();
      return out;
    };
    wrapped.__imsiResultBridgeWrapped = true;
    wrapped.__imsiResultBridgeOriginal = original;
    window[name] = wrapped;
    state.wrapped = true;
    return true;
  }

  function runHooks() {
    wrapNamedResultFunction("showResultPopup");
    wrapNamedResultFunction("renderFinalResult");
  }

  function start() {
    runHooks();

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
