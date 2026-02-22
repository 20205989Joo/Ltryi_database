// ver1.1_26.02.22
(function () {
  "use strict";

  var state = {
    enabled: true,
    limit: 4,
    wrappedBuild: false,
    wrappedStart: false,
    timerId: null,
    observer: null,
    appliedCount: 0,
    lastAppliedSize: 0
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

  function applyQuestionCap() {
    if (!state.enabled) return false;
    var arr = getQuestionsArraySafe();
    if (!arr || !arr.length) return false;
    var cap = Number(state.limit || 20);
    if (!(cap > 0)) return false;
    if (arr.length <= cap) return false;

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
          lastAppliedSize: state.lastAppliedSize
        };
      }
    };
  }

  function start() {
    readQueryLimit();
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
