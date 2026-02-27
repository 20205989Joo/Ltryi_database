(function () {
  "use strict";

  var alphaState = {
    bypassOnce: false,
    lastNextNode: null,
    timerId: null,
    hookScheduled: false,
    isRunningHooks: false,
    fallbackLockEnabled: false,
    fallbackDetectedCount: 0,
    fallbackLockedCount: 0,
    lastFallbackReason: "",
    lastFallbackRoute: "",
    callTrace: [],
    fallbackLogs: [],
    nightOverlayEnabled: false,
    questionCapEnabled: false,
    questionCapValue: 20,
    questionCapAppliedCount: 0,
    questionCapLastLabel: "",
    tourQCapValue: 1,
    panelControlsVisible: true,
    round2TargetPath: "herma-l1e2.html?round2=1&round2Script=herma-l1e2_round2.js",
    round2JumpCount: 0,
    lastRound2Url: ""
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function hasTourFlagInQuery() {
    try {
      var sp = new URLSearchParams(window.location.search || "");
      return String(sp.get("fullTour") || "").trim() === "1";
    } catch (_) {
      return false;
    }
  }

  function readTourStateSafe() {
    try {
      if (!window.sessionStorage) return null;
      var raw = sessionStorage.getItem("HermaFullTourState");
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function isTourModeActive() {
    if (hasTourFlagInQuery()) return true;
    var saved = readTourStateSafe();
    return !!(saved && saved.active);
  }

  function parsePositiveIntOr(raw, fallback) {
    var n = Number(raw);
    if (!isFinite(n) || n <= 0) return Number(fallback || 1);
    return Math.max(1, Math.floor(n));
  }

  function readTourQCapFromState() {
    var saved = readTourStateSafe();
    if (saved && typeof saved === "object") {
      var q = parsePositiveIntOr(saved.qcap, 0);
      if (q > 0) return q;
    }
    try {
      var sp = new URLSearchParams(window.location.search || "");
      var fromQuery = parsePositiveIntOr(sp.get("imsi_qcap") || sp.get("qcap"), 0);
      if (fromQuery > 0) return fromQuery;
    } catch (_) {}
    var fromStorage = parsePositiveIntOr(getStorageSafe("alphaTourQCap"), 1);
    return fromStorage > 0 ? fromStorage : 1;
  }

  function writeTourQCapToState(nextQCap) {
    var qcap = parsePositiveIntOr(nextQCap, 1);
    setStorageSafe("alphaTourQCap", String(qcap));

    var saved = readTourStateSafe();
    if (saved && typeof saved === "object") {
      saved.qcap = qcap;
      saved.updatedAt = nowIso();
      try {
        sessionStorage.setItem("HermaFullTourState", JSON.stringify(saved));
      } catch (_) {}
    }

    return qcap;
  }

  function syncTourQCapQuery(nextQCap) {
    var qcap = parsePositiveIntOr(nextQCap, 1);
    try {
      var url = new URL(window.location.href);
      url.searchParams.set("imsi_qcap", String(qcap));
      window.history.replaceState(null, "", url.toString());
    } catch (_) {}
  }

  function getNextBtn() {
    return byId("next-btn");
  }

  function getSubmitBtn() {
    return byId("submit-btn");
  }

  function getStorageSafe(key) {
    try {
      return window.localStorage ? localStorage.getItem(key) : null;
    } catch (_) {
      return null;
    }
  }

  function setStorageSafe(key, value) {
    try {
      if (window.localStorage) localStorage.setItem(key, value);
    } catch (_) {}
  }

  function removeStorageSafe(key) {
    try {
      if (window.localStorage) localStorage.removeItem(key);
    } catch (_) {}
  }

  function readStorageJsonObjectSafe(key) {
    try {
      var raw = getStorageSafe(key);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed;
    } catch (_) {
      return {};
    }
  }

  function toBaseQuizKeySafe(key) {
    return String(key || "").trim().replace(/_round2$/i, "");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function noteCall(name) {
    if (!name) return;
    alphaState.callTrace.push({ name: String(name), ts: nowIso() });
    if (alphaState.callTrace.length > 60) alphaState.callTrace.shift();
  }

  function getRecentRoute(maxLen) {
    var n = Number(maxLen || 8);
    var names = alphaState.callTrace.slice(-n).map(function (x) {
      return x.name;
    });
    return names.join(" -> ");
  }

  function getQuestionLabelText() {
    var el = document.querySelector(".q-label");
    return el ? String(el.textContent || "").trim() : "";
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

  function getCurrentIndexBindingSafe() {
    try {
      if (typeof currentIndex === "undefined") return null;
      return Number(currentIndex);
    } catch (_) {
      return null;
    }
  }

  function setCurrentIndexBindingSafe(nextIndex) {
    try {
      if (typeof currentIndex === "undefined") return false;
      currentIndex = Number(nextIndex);
      return true;
    } catch (_) {
      return false;
    }
  }

  function getResultsArraySafe() {
    try {
      if (typeof results === "undefined") return null;
      if (!Array.isArray(results)) return null;
      return results;
    } catch (_) {
      return null;
    }
  }

  function getRound2TargetPath() {
    try {
      var query = new URLSearchParams(window.location.search || "");
      var qPath = String(query.get("round2Target") || "").trim();
      if (qPath) return qPath;
    } catch (_) {}

    var stored = String(getStorageSafe("alphaRound2TargetPath") || "").trim();
    if (stored) return stored;
    return String(alphaState.round2TargetPath || "herma-l1e2.html?round2=1&round2Script=herma-l1e2_round2.js");
  }

  function getQuestionDisplayWord(question, index) {
    var q = question || {};
    var i = Number(index || 0) + 1;
    if (typeof q.word !== "undefined" && String(q.word).trim()) return String(q.word).trim();
    if (typeof q.questionEn !== "undefined" && String(q.questionEn).trim()) return String(q.questionEn).trim();
    if (typeof q.question !== "undefined" && String(q.question).trim()) return String(q.question).trim();
    if (typeof q.rawQuestion !== "undefined" && String(q.rawQuestion).trim()) return String(q.rawQuestion).trim();
    if (typeof q.qNumber !== "undefined") return "Q" + String(q.qNumber);
    return "Q" + String(i);
  }

  function getQuestionSelectedValue(question, fallbackWord) {
    var q = question || {};
    var candidates = [
      q.selected,
      q.answer,
      q.modelAnswer,
      q.modelEnglish,
      q.modelKorean,
      q.rawAnswer,
      q.questionEn,
      q.question,
      q.rawQuestion,
      fallbackWord
    ];
    for (var i = 0; i < candidates.length; i++) {
      var text = String(candidates[i] == null ? "" : candidates[i]).trim();
      if (text) return text;
    }
    return "alpha-round2-auto";
  }

  function buildAutoPassRow(question, index) {
    var word = getQuestionDisplayWord(question, index);
    return {
      no: Number(index || 0) + 1,
      word: word,
      selected: getQuestionSelectedValue(question, word),
      correct: true,
      qNumber: (question && typeof question.qNumber !== "undefined") ? question.qNumber : (Number(index || 0) + 1)
    };
  }

  function synthesizePassingResults() {
    var arrQ = getQuestionsArraySafe();
    var arrR = getResultsArraySafe();
    if (!arrQ || !arrR) return false;
    if (!arrQ.length) return false;

    arrR.splice(0, arrR.length);
    for (var i = 0; i < arrQ.length; i++) {
      arrR.push(buildAutoPassRow(arrQ[i], i));
    }

    setCurrentIndexBindingSafe(arrQ.length);
    return true;
  }

  function buildResultPayloadFromGlobals() {
    var arrR = getResultsArraySafe();
    if (!arrR || !arrR.length) return null;

    var payload = { results: arrR };
    try {
      if (typeof quizTitle !== "undefined") payload.quizTitle = quizTitle;
    } catch (_) {}
    try {
      if (typeof subcategory !== "undefined") payload.subcategory = subcategory;
    } catch (_) {}
    try {
      if (typeof level !== "undefined") payload.level = level;
    } catch (_) {}
    try {
      if (typeof day !== "undefined") payload.day = day;
    } catch (_) {}
    payload.passScore = 80;
    return payload;
  }

  function showResultPopupSafe() {
    try {
      if (typeof window.showResultPopup === "function") {
        noteCall("showResultPopup");
        window.showResultPopup();
        return true;
      }
    } catch (_) {}

    try {
      var show = window.DishQuizResultsTable && window.DishQuizResultsTable.show;
      if (typeof show === "function") {
        var payload = buildResultPayloadFromGlobals();
        if (!payload) return false;
        show(payload);
        return true;
      }
    } catch (_) {}
    return false;
  }

  function getCurrentQuizKey() {
    try {
      var sp = new URLSearchParams(window.location.search || "");
      return String(sp.get("key") || "").trim();
    } catch (_) {
      return "";
    }
  }

  function resolveCurrentQuizKeySafe() {
    var fromQuery = getCurrentQuizKey();
    if (fromQuery) return fromQuery;
    try {
      if (typeof quizTitle !== "undefined") {
        var t = String(quizTitle || "").trim();
        if (t) return t;
      }
    } catch (_) {}
    return "";
  }

  function clearMapEntrySafe(storageKey, keys) {
    var list = Array.isArray(keys) ? keys : [keys];
    var map = readStorageJsonObjectSafe(storageKey);
    var changed = false;
    for (var i = 0; i < list.length; i++) {
      var key = String(list[i] || "").trim();
      if (!key) continue;
      if (!Object.prototype.hasOwnProperty.call(map, key)) continue;
      delete map[key];
      changed = true;
    }
    if (!changed) return false;
    setStorageSafe(storageKey, JSON.stringify(map));
    return true;
  }

  function clearLegacyQuizResultsSafe(keys) {
    var list = Array.isArray(keys) ? keys : [keys];
    var raw = getStorageSafe("QuizResults");
    if (!raw) return false;

    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {
      removeStorageSafe("QuizResults");
      return true;
    }
    if (!parsed || typeof parsed !== "object") {
      removeStorageSafe("QuizResults");
      return true;
    }

    var storedKey = String(parsed.quiztitle || parsed.quizTitle || "").trim();
    if (!storedKey) return false;
    for (var i = 0; i < list.length; i++) {
      if (storedKey !== String(list[i] || "").trim()) continue;
      removeStorageSafe("QuizResults");
      return true;
    }
    return false;
  }

  function getCurrentFlowStateSafe(baseKey) {
    var key = toBaseQuizKeySafe(baseKey);
    if (!key) return null;
    var map = readStorageJsonObjectSafe("HermaRound2FlowMap");
    var entry = map[key];
    return entry && typeof entry === "object" ? entry : null;
  }

  function clearRound2FlowAndQuizState() {
    noteCall("alphaResetRound2Flow");

    var resolvedKey = resolveCurrentQuizKeySafe();
    var baseKey = toBaseQuizKeySafe(resolvedKey);
    if (!baseKey) {
      baseKey = toBaseQuizKeySafe(ensureRound2QuizKey(resolvedKey));
    }
    var round2Key = ensureRound2QuizKey(baseKey || resolvedKey);

    var keys = [];
    if (baseKey) keys.push(baseKey);
    if (round2Key && keys.indexOf(round2Key) < 0) keys.push(round2Key);
    if (resolvedKey && keys.indexOf(resolvedKey) < 0) keys.push(resolvedKey);

    if (baseKey) {
      clearMapEntrySafe("HermaRound2FlowMap", baseKey);
    }
    clearMapEntrySafe("QuizResultsMap", keys);
    clearLegacyQuizResultsSafe(keys);
    removeStorageSafe("alphaRound2LastJump");

    try {
      if (window.DishQuizFlow && typeof window.DishQuizFlow.clearFlowState === "function" && baseKey) {
        window.DishQuizFlow.clearFlowState(baseKey);
      }
    } catch (_) {}

    try {
      var target = new URL(window.location.href);
      target.searchParams.delete("round2");
      target.searchParams.delete("round2Script");
      if (baseKey) target.searchParams.set("key", baseKey);
      window.location.replace(target.toString());
      return true;
    } catch (_) {
      window.location.reload();
      return true;
    }
  }

  function ensureRound2QuizKey(key) {
    var fromKey = String(key || "").trim();
    if (!fromKey) {
      try {
        if (typeof quizTitle !== "undefined") {
          fromKey = String(quizTitle || "").trim();
        }
      } catch (_) {}
    }

    if (!fromKey) {
      var sub = "Grammar";
      var lv = "aisth";
      var d = "102";
      try {
        if (typeof subcategory !== "undefined" && String(subcategory || "").trim()) sub = String(subcategory || "").trim();
      } catch (_) {}
      try {
        if (typeof level !== "undefined" && String(level || "").trim()) lv = String(level || "").trim();
      } catch (_) {}
      try {
        if (typeof day !== "undefined" && String(day || "").trim()) d = String(day || "").trim();
      } catch (_) {}
      fromKey = "quiz_" + sub + "_" + lv + "_" + d;
    }

    if (/_round2$/i.test(fromKey)) return fromKey;
    return fromKey + "_round2";
  }

  function parseRound2MetaFromKey(quizKey) {
    var key = ensureRound2QuizKey(quizKey);
    var parts = String(key || "").split("_");
    var out = {
      quizTitle: key,
      subcategory: "Grammar",
      level: "aisth",
      day: "1"
    };
    if (parts.length >= 4) {
      out.subcategory = parts[1] || out.subcategory;
      out.level = parts[2] || out.level;
      out.day = parts[3] || out.day;
    }
    return out;
  }

  function getRound2QuestionTotal() {
    var label = getQuestionLabelText();
    if (label) {
      var m = label.match(/\/\s*(\d+)/);
      if (m) {
        var n = Number(m[1]);
        if (isFinite(n) && n > 0) return Math.floor(n);
      }
    }

    try {
      var keys = Object.keys(window);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (!/Round2/.test(String(k))) continue;
        var mod = window[k];
        if (!mod || typeof mod.getState !== "function") continue;
        var st = mod.getState();
        var qCount = Number(st && st.questionCount ? st.questionCount : 0);
        if (isFinite(qCount) && qCount > 0) return Math.floor(qCount);
      }
    } catch (_) {}

    var arrQ = getQuestionsArraySafe();
    if (arrQ && arrQ.length) return arrQ.length;
    return 10;
  }

  function getCurrentRound2QuestionNo() {
    var label = getQuestionLabelText();
    if (label) {
      var m = label.match(/Q\.\s*(\d+)/i);
      if (m) {
        var n = Number(m[1]);
        if (isFinite(n) && n > 0) return Math.floor(n);
      }
      var m2 = label.match(/^\s*(\d+)\s*\/\s*\d+/);
      if (m2) {
        var n2 = Number(m2[1]);
        if (isFinite(n2) && n2 > 0) return Math.floor(n2);
      }
    }
    return 1;
  }

  function buildSyntheticRound2Results(total, correctCount, baseNo) {
    var t = Number(total || 0);
    if (!(isFinite(t) && t > 0)) t = 10;
    t = Math.floor(t);

    var c = Number(correctCount || 0);
    if (!isFinite(c)) c = 0;
    c = Math.max(0, Math.min(t, Math.floor(c)));

    var firstNo = Number(baseNo || 1);
    if (!(isFinite(firstNo) && firstNo > 0)) firstNo = 1;
    firstNo = Math.floor(firstNo);

    var rows = [];
    for (var i = 0; i < t; i++) {
      var ok = i < c;
      var no = firstNo + i;
      rows.push({
        no: no,
        word: "R2 Alpha / Q" + String(no),
        selected: ok ? "alpha-r2-right" : "alpha-r2-wrong",
        correct: ok,
        qNumber: no
      });
    }
    return rows;
  }

  function showSyntheticRound2Result(correctCount, totalCount, baseNo) {
    var show = window.DishQuizResultsTable && window.DishQuizResultsTable.show;
    if (typeof show !== "function") return false;

    var total = Number(totalCount || 0);
    if (!(isFinite(total) && total > 0)) total = getRound2QuestionTotal();
    total = Math.max(1, Math.floor(total));

    var correct = Number(correctCount || 0);
    if (!isFinite(correct)) correct = 0;
    correct = Math.max(0, Math.min(total, Math.floor(correct)));

    var key = ensureRound2QuizKey(getCurrentQuizKey());
    var meta = parseRound2MetaFromKey(key);
    var payload = {
      results: buildSyntheticRound2Results(total, correct, baseNo),
      quizTitle: meta.quizTitle,
      subcategory: meta.subcategory,
      level: meta.level,
      day: meta.day,
      passScore: 80
    };

    try {
      show(payload);
      return true;
    } catch (_) {
      return false;
    }
  }

  function alphaRound2Right() {
    noteCall("alphaRound2Right");
    forceGradeOnly("right");
  }

  function alphaRound2Wrong() {
    noteCall("alphaRound2Wrong");
    forceGradeOnly("wrong");
  }

  function buildRound2Url(targetPath) {
    try {
      var currentUrl = new URL(window.location.href);
      var targetUrl = new URL(String(targetPath || ""), window.location.href);

      currentUrl.searchParams.forEach(function (value, key) {
        if (!targetUrl.searchParams.has(key)) {
          targetUrl.searchParams.set(key, value);
        }
      });

      var fromName = String(currentUrl.pathname || "").split("/").pop() || "";
      targetUrl.searchParams.set("alphaRound2", "1");
      if (fromName) targetUrl.searchParams.set("alphaFrom", fromName);

      return targetUrl.toString();
    } catch (_) {
      return "";
    }
  }

  function persistRound2Jump(targetUrl, didPassSynthesis, didShowResult) {
    var payload = {
      at: nowIso(),
      from: window.location.href,
      to: String(targetUrl || ""),
      synthesized: !!didPassSynthesis,
      showedResult: !!didShowResult,
      route: getRecentRoute(10)
    };
    try {
      setStorageSafe("alphaRound2LastJump", JSON.stringify(payload));
    } catch (_) {}
  }

  function forceToRound2() {
    noteCall("alphaForceToRound2");

    if (typeof window.startQuiz === "function") {
      var arrQBefore = getQuestionsArraySafe();
      if (!arrQBefore || !arrQBefore.length) {
        try {
          window.startQuiz();
        } catch (_) {}
      }
    }

    var didPassSynthesis = synthesizePassingResults();
    var didShowResult = showResultPopupSafe();
    var targetPath = getRound2TargetPath();
    var targetUrl = buildRound2Url(targetPath);
    if (!targetUrl) return;

    alphaState.round2JumpCount += 1;
    alphaState.lastRound2Url = targetUrl;
    renderRound2ButtonState();
    persistRound2Jump(targetUrl, didPassSynthesis, didShowResult);

    window.setTimeout(function () {
      window.location.assign(targetUrl);
    }, didShowResult ? 240 : 80);
  }

  function applyQuestionCap() {
    if (!alphaState.questionCapEnabled) return false;
    var arr = getQuestionsArraySafe();
    if (!arr || !arr.length) return false;

    var cap = Number(alphaState.questionCapValue || 20);
    if (!(cap > 0)) return false;
    if (arr.length <= cap) return false;

    arr.splice(cap);
    alphaState.questionCapAppliedCount += 1;
    alphaState.questionCapLastLabel = getQuestionLabelText();

    try {
      var idx = getCurrentIndexBindingSafe();
      if (idx !== null && isFinite(idx) && idx >= arr.length && arr.length > 0) {
        currentIndex = arr.length - 1;
      }
    } catch (_) {}

    return true;
  }

  function captureStackSnippet() {
    try {
      throw new Error("alpha-fallback-trace");
    } catch (err) {
      var s = String((err && err.stack) || "");
      return s
        .split("\n")
        .slice(2, 8)
        .map(function (line) { return line.trim(); })
        .join(" | ");
    }
  }

  function recordFallbackEvent(type, nextBtn, submitBtn) {
    var route = getRecentRoute(10);
    alphaState.lastFallbackRoute = route;

    var row = {
      time: nowIso(),
      type: String(type || ""),
      reason: alphaState.lastFallbackReason || "",
      route: route,
      question: getQuestionLabelText(),
      lockOn: !!alphaState.fallbackLockEnabled,
      nextDisabled: !!(nextBtn && nextBtn.disabled),
      submitDisabled: !!(submitBtn && submitBtn.disabled),
      stack: captureStackSnippet()
    };

    alphaState.fallbackLogs.push(row);
    if (alphaState.fallbackLogs.length > 120) alphaState.fallbackLogs.shift();

    if (window.console && typeof console.warn === "function") {
      console.warn("[AlphaTester fallback]", row);
    }
  }

  function printFallbackLogs() {
    var rows = alphaState.fallbackLogs.map(function (x, idx) {
      return {
        idx: idx + 1,
        time: x.time,
        type: x.type,
        reason: x.reason,
        route: x.route,
        question: x.question,
        lockOn: x.lockOn
      };
    });
    if (window.console && typeof console.table === "function") {
      console.table(rows);
    } else if (window.console && typeof console.log === "function") {
      console.log(rows);
    }
    return rows;
  }

  function clearFallbackLogs() {
    alphaState.fallbackLogs.length = 0;
    alphaState.lastFallbackRoute = "";
    renderFallbackPanelState();
  }

  function renderNightOverlayState() {
    var overlay = byId("alpha-night-overlay");
    if (overlay) {
      var display = alphaState.nightOverlayEnabled ? "block" : "none";
      if (overlay.style.display !== display) overlay.style.display = display;
    }

    var btn = byId("alpha-night-overlay-btn");
    if (btn) {
      var label = alphaState.nightOverlayEnabled ? "NIGHT OVERLAY: ON" : "NIGHT OVERLAY: OFF";
      if (btn.textContent !== label) btn.textContent = label;
      btn.style.background = alphaState.nightOverlayEnabled ? "#151515" : "#2d2f35";
      btn.style.borderColor = alphaState.nightOverlayEnabled ? "#323232" : "#454953";
      btn.style.color = "#f4f4f4";
    }
  }

  function renderQuestionCapState() {
    var btn = byId("alpha-qcap20-btn");
    if (!btn) return;
    var on = !!alphaState.questionCapEnabled;
    btn.textContent = on ? "Q CAP20: ON" : "Q CAP20: OFF";
    btn.style.background = on ? "#1e5e2b" : "#2d2f35";
    btn.style.borderColor = on ? "#2d8a41" : "#454953";
    btn.style.color = "#f4f4f4";
    btn.title = "Limit loaded questions to first 20";
  }

  function renderTourQCapState() {
    var input = byId("alpha-tour-qcap-input");
    if (input) input.value = String(alphaState.tourQCapValue || 1);

    var btn = byId("alpha-tour-qcap-apply-btn");
    if (btn) {
      btn.textContent = "TOUR QCAP APPLY";
      btn.style.background = "#2d2f35";
      btn.style.borderColor = "#454953";
      btn.style.color = "#f4f4f4";
      btn.title = "Apply tour question cap for learn/round2";
    }
  }

  function renderPanelControlsState() {
    var wrap = byId("alpha-controls-wrap");
    var btn = byId("alpha-controls-toggle-btn");
    if (wrap) wrap.style.display = alphaState.panelControlsVisible ? "flex" : "none";
    if (btn) {
      btn.textContent = alphaState.panelControlsVisible ? "HIDE BUTTONS" : "SHOW BUTTONS";
      btn.style.background = alphaState.panelControlsVisible ? "#2d2f35" : "#1f5f2e";
      btn.style.borderColor = alphaState.panelControlsVisible ? "#454953" : "#2f8b44";
      btn.style.color = "#f4f4f4";
    }
  }

  function togglePanelControls() {
    alphaState.panelControlsVisible = !alphaState.panelControlsVisible;
    setStorageSafe("alphaPanelControlsVisible", alphaState.panelControlsVisible ? "1" : "0");
    renderPanelControlsState();
  }

  function applyTourQCap(nextQCap) {
    var qcap = parsePositiveIntOr(nextQCap, alphaState.tourQCapValue || 1);
    alphaState.tourQCapValue = qcap;
    writeTourQCapToState(qcap);
    if (isTourModeActive()) syncTourQCapQuery(qcap);

    try {
      if (window.ImsiQuestionsCompressor && typeof window.ImsiQuestionsCompressor.setLimit === "function") {
        window.ImsiQuestionsCompressor.setLimit(qcap);
      }
      if (window.ImsiQuestionsCompressor && typeof window.ImsiQuestionsCompressor.enable === "function") {
        window.ImsiQuestionsCompressor.enable();
      }
    } catch (_) {}

    try {
      var route = getRound2RouteMeta();
      if (route.isRound2) {
        var info = pickActiveRound2ModuleInfo(false);
        if (info && info.mod && typeof info.mod.mount === "function") {
          info.mod.mount({ force: true, maxQuestions: qcap });
        }
      }
    } catch (_) {}

    try {
      if (window.HermaRound2LifeUI && typeof window.HermaRound2LifeUI.sync === "function") {
        setTimeout(function () { window.HermaRound2LifeUI.sync(); }, 0);
      }
    } catch (_) {}

    renderTourQCapState();
    renderFlowHud();
  }

  function renderRound2ButtonState() {
    var btn = byId("alpha-to-round2-btn");
    if (!btn) return;
    var targetPath = getRound2TargetPath();
    btn.textContent = "TO ROUND2";
    btn.style.background = "#0f3a60";
    btn.style.borderColor = "#1a5f9b";
    btn.style.color = "#f4f4f4";
    btn.title = "Force pass + jump to: " + targetPath;
  }

  function renderResetFlowButtonState() {
    var btn = byId("alpha-reset-flow-btn");
    if (!btn) return;
    var key = resolveCurrentQuizKeySafe();
    var base = toBaseQuizKeySafe(key);
    btn.textContent = "RESET R1/R2 FLOW";
    btn.style.background = "#4d2222";
    btn.style.borderColor = "#8b3a3a";
    btn.style.color = "#f4f4f4";
    btn.title = "Clear learn/round2 progress for key: " + (base || "-");
  }

  function ensureNightOverlay() {
    if (!document.body) return;

    var overlay = byId("alpha-night-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "alpha-night-overlay";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.background = "rgba(0,0,0,0.48)";
      overlay.style.zIndex = "2147483000";
      overlay.style.display = "none";

      var mainPage = document.querySelector(".main-page");
      if (mainPage && mainPage.parentNode === document.body) {
        document.body.insertBefore(overlay, mainPage);
      } else {
        document.body.appendChild(overlay);
      }
    }

    renderNightOverlayState();
  }

  function toggleNightOverlay() {
    alphaState.nightOverlayEnabled = !alphaState.nightOverlayEnabled;
    setStorageSafe("alphaNightOverlayEnabled", alphaState.nightOverlayEnabled ? "1" : "0");
    renderNightOverlayState();
  }

  function toggleQuestionCap() {
    alphaState.questionCapEnabled = !alphaState.questionCapEnabled;
    setStorageSafe("alphaQuestionCap20Enabled", alphaState.questionCapEnabled ? "1" : "0");
    if (alphaState.questionCapEnabled) applyQuestionCap();
    renderQuestionCapState();
  }

  function wrapTraceFunction(name) {
    var fn = window[name];
    if (typeof fn !== "function") return;
    if (fn.__alphaTraceWrapped) return;

    var wrapped = function () {
      noteCall(name);
      return fn.apply(this, arguments);
    };
    wrapped.__alphaTraceWrapped = true;
    wrapped.__alphaTraceOriginal = fn;
    if (fn.__alphaWrappedSubmit) wrapped.__alphaWrappedSubmit = true;
    if (fn.__alphaWrappedGoNext) wrapped.__alphaWrappedGoNext = true;
    window[name] = wrapped;
  }

  function wrapTraceFunctions() {
    var names = [
      "startQuiz",
      "renderIntro",
      "renderQuestion",
      "renderComposeStage",
      "renderPickStage",
      "renderViewStage",
      "renderTranslateStage",
      "submitAnswer",
      "submitKorean",
      "autoGradeEnglish",
      "goTranslateAuto",
      "goNext",
      "enterPairStage",
      "enterTranslateStage",
      "onItClicked",
      "onReduceDragDone"
    ];
    for (var i = 0; i < names.length; i++) {
      wrapTraceFunction(names[i]);
    }
  }

  function wrapBuildQuestionsFromRows() {
    if (typeof window.buildQuestionsFromRows !== "function") return;
    var original = window.buildQuestionsFromRows;
    if (original.__alphaWrappedBuildQuestions) return;

    var wrapped = function () {
      var out = original.apply(this, arguments);
      applyQuestionCap();
      return out;
    };
    wrapped.__alphaWrappedBuildQuestions = true;
    wrapped.__alphaOriginal = original;
    window.buildQuestionsFromRows = wrapped;
  }

  function wrapStartQuizForQuestionCap() {
    if (typeof window.startQuiz !== "function") return;
    var original = window.startQuiz;
    if (original.__alphaWrappedStartQuizQCap) return;

    var wrapped = function () {
      applyQuestionCap();
      return original.apply(this, arguments);
    };
    wrapped.__alphaWrappedStartQuizQCap = true;
    wrapped.__alphaOriginal = original;
    window.startQuiz = wrapped;
  }

  function lockNext(reason) {
    var nextBtn = getNextBtn();
    if (!nextBtn) return;
    nextBtn.disabled = true;
    nextBtn.dataset.alphaLock = "1";
    if (reason) nextBtn.dataset.alphaLockReason = reason;
  }

  function unlockNext(reason) {
    var nextBtn = getNextBtn();
    if (!nextBtn) return;
    nextBtn.disabled = false;
    nextBtn.dataset.alphaLock = "0";
    if (reason) nextBtn.dataset.alphaUnlockReason = reason;
  }

  function syncNextOnRender() {
    var nextBtn = getNextBtn();
    if (!nextBtn) {
      alphaState.lastNextNode = null;
      return;
    }

    if (alphaState.lastNextNode !== nextBtn) {
      alphaState.lastNextNode = nextBtn;
      lockNext("new-question");
    }
  }

  function maybeApplyFallbackLock() {
    var nextBtn = getNextBtn();
    var submitBtn = getSubmitBtn();
    if (!nextBtn || !submitBtn) return;

    if (nextBtn.disabled || submitBtn.disabled) {
      nextBtn.dataset.alphaFallbackOpen = "0";
      return;
    }

    if (nextBtn.dataset.alphaFallbackOpen !== "1") {
      nextBtn.dataset.alphaFallbackOpen = "1";
      alphaState.fallbackDetectedCount += 1;
      alphaState.lastFallbackReason = "next-open-before-submit-lock";
      recordFallbackEvent("detected", nextBtn, submitBtn);
    }

    if (!alphaState.fallbackLockEnabled) return;

    lockNext("fallback-lock");
    alphaState.fallbackLockedCount += 1;
    nextBtn.dataset.alphaFallbackOpen = "0";
    recordFallbackEvent("locked", nextBtn, submitBtn);
  }

  function maybeUnlockAfterSubmit() {
    var submitBtn = getSubmitBtn();
    if (!submitBtn) return;
    if (submitBtn.disabled) {
      unlockNext("submit-locked");
    }
  }

  function wrapSubmitAnswer() {
    if (typeof window.submitAnswer !== "function") return;

    var original = window.submitAnswer;
    if (original.__alphaWrappedSubmit) return;

    var wrapped = function () {
      var out = original.apply(this, arguments);
      setTimeout(function () {
        maybeUnlockAfterSubmit();
      }, 0);
      return out;
    };

    wrapped.__alphaWrappedSubmit = true;
    wrapped.__alphaOriginal = original;
    window.submitAnswer = wrapped;
  }

  function isNextLocked() {
    var nextBtn = getNextBtn();
    return !!(nextBtn && nextBtn.disabled);
  }

  function getRound2RouteMeta() {
    var key = "";
    var round2 = "";
    var round2Script = "";
    var dishQuizKey = "";
    try {
      var sp = new URLSearchParams(window.location.search || "");
      key = String(sp.get("key") || "").trim();
      round2 = String(sp.get("round2") || "").trim();
      round2Script = String(sp.get("round2Script") || "").trim();
      dishQuizKey = String(sp.get("dishQuizKey") || "").trim();
    } catch (_) {}
    var isRound2 = (round2 === "1") || /_round2$/i.test(key) || !!round2Script;
    return {
      key: key,
      round2: round2,
      round2Script: round2Script,
      dishQuizKey: dishQuizKey,
      isRound2: isRound2
    };
  }

  function pickActiveRound2ModuleInfo(requireMounted) {
    var mustMounted = !!requireMounted;
    var best = null;
    var bestScore = -1;

    try {
      var keys = Object.keys(window);
      for (var i = 0; i < keys.length; i++) {
        var key = String(keys[i] || "");
        if (!/^HermaL\d+E\d+Round2$/.test(key)) continue;

        var mod = window[key];
        if (!mod || typeof mod.goNext !== "function") continue;

        var st = null;
        var mounted = false;
        var loading = false;
        var qCount = 0;
        if (typeof mod.getState === "function") {
          try {
            st = mod.getState() || {};
            mounted = !!st.mounted;
            loading = !!st.loading;
            qCount = Number(st.questionCount || 0);
          } catch (_) {}
        }
        if (mustMounted && !mounted) continue;

        var score = 0;
        if (mod.__loaded) score += 1;
        if (mounted) score += 100;
        if (!loading) score += 1;
        if (qCount > 0) score += 2;

        if (score > bestScore) {
          best = {
            name: key,
            mod: mod,
            state: st,
            score: score
          };
          bestScore = score;
        }
      }
    } catch (_) {}

    return best;
  }

  function pickActiveRound2Module(requireMounted) {
    var info = pickActiveRound2ModuleInfo(requireMounted);
    return info ? info.mod : null;
  }

  function syncRound2GlobalAliases() {
    var route = getRound2RouteMeta();
    if (!route.isRound2) return false;
    var info = pickActiveRound2ModuleInfo(true);
    if (!info || !info.mod) return false;
    var mod = info.mod;

    var changed = false;
    if (typeof mod.goNext === "function" && window.goNext !== mod.goNext) {
      window.goNext = mod.goNext;
      changed = true;
    }
    if (typeof mod.submitAnswer === "function" && window.submitAnswer !== mod.submitAnswer) {
      window.submitAnswer = mod.submitAnswer;
      changed = true;
    }
    return changed;
  }

  function resolveGoNextHandler() {
    var route = getRound2RouteMeta();
    if (route.isRound2) syncRound2GlobalAliases();
    if (typeof window.goNext === "function") return window.goNext;
    var mod = pickActiveRound2Module(route.isRound2);
    if (mod && typeof mod.goNext === "function") return mod.goNext;
    return null;
  }

  function renderFlowHud() {
    var hud = byId("alpha-flow-hud");
    if (!hud) return;

    var route = getRound2RouteMeta();
    var quizKey = resolveCurrentQuizKeySafe();
    var baseKey = toBaseQuizKeySafe(quizKey || route.key || "");
    var flow = getCurrentFlowStateSafe(baseKey);
    var info = pickActiveRound2ModuleInfo(false);
    var st = info && info.state ? info.state : null;
    var mounted = st ? !!st.mounted : false;
    var loading = st ? !!st.loading : false;
    var qCount = st ? Number(st.questionCount || 0) : 0;
    var qIndex = st ? Number(st.currentIndex || 0) : 0;
    var forceNext = !!window.__alphaForceNext;
    var forceOnly = !!window.__alphaForceOnlyGrade;
    var forceResult = String(window.__alphaForceResult || "").trim() || "-";
    var lastCall = alphaState.callTrace.length ? alphaState.callTrace[alphaState.callTrace.length - 1].name : "-";
    var lines = [
      "[ALPHA FLOW HUD]",
      "ctx: " + (route.isRound2 ? "round2" : "learn"),
      "key: " + (route.key || "-"),
      "round2: " + (route.round2 || "-") + " / script: " + (route.round2Script || "-"),
      "dishQuizKey: " + (route.dishQuizKey || "-"),
      "flow: " + (flow ? (String(flow.phase || "-") + " / relearn=" + !!flow.requireRelearn + " / retry=" + Number(flow.retryCount || 0)) : "-"),
      "activeModule: " + (info ? info.name : "-"),
      "mounted: " + mounted + " / loading: " + loading + " / q: " + qCount + " / idx: " + qIndex,
      "force: next=" + forceNext + " gradeOnly=" + forceOnly + " result=" + forceResult,
      "trigger: " + lastCall,
      "route: " + (getRecentRoute(6) || "-")
    ];
    hud.textContent = lines.join("\n");
  }

  function wrapGoNext() {
    if (getRound2RouteMeta().isRound2) syncRound2GlobalAliases();
    if (typeof window.goNext !== "function") return;

    var original = window.goNext;
    if (original.__alphaWrappedGoNext) return;

    var wrapped = function () {
      if (!alphaState.bypassOnce && isNextLocked()) return;
      alphaState.bypassOnce = false;
      return original.apply(this, arguments);
    };

    wrapped.__alphaWrappedGoNext = true;
    wrapped.__alphaOriginal = original;
    window.goNext = wrapped;
  }

  function forceGoNext(forceResult) {
    var goNextHandler = resolveGoNextHandler();
    if (typeof goNextHandler !== "function") return;

    var nextBtn = getNextBtn();
    var wasLocked = !!(nextBtn && nextBtn.disabled);
    var desiredResult = String(forceResult || "").trim().toLowerCase();

    alphaState.bypassOnce = true;
    window.__alphaForceNext = true;
    window.__alphaForceOnlyGrade = false;
    if (desiredResult) window.__alphaForceResult = desiredResult;
    if (nextBtn) nextBtn.disabled = false;

    try {
      goNextHandler();
    } finally {
      window.__alphaForceNext = false;
      window.__alphaForceOnlyGrade = false;
      window.__alphaForceResult = "";
      setTimeout(function () {
        var currentNextBtn = getNextBtn();
        if (wasLocked && currentNextBtn === nextBtn && nextBtn && nextBtn.dataset.alphaLock !== "0") {
          nextBtn.disabled = true;
        }
      }, 0);
    }
  }

  function forceGradeOnly(forceResult) {
    var goNextHandler = resolveGoNextHandler();
    if (typeof goNextHandler !== "function") return;

    var desiredResult = String(forceResult || "").trim().toLowerCase();
    alphaState.bypassOnce = true;
    window.__alphaForceNext = true;
    window.__alphaForceOnlyGrade = true;
    if (desiredResult) window.__alphaForceResult = desiredResult;

    try {
      goNextHandler();
    } finally {
      window.__alphaForceNext = false;
      window.__alphaForceOnlyGrade = false;
      window.__alphaForceResult = "";
    }
  }

  function renderFallbackPanelState() {
    var fallbackButton = byId("alpha-fallback-lock-btn");
    if (fallbackButton) {
      var btnLabel = alphaState.fallbackLockEnabled ? "FALLBACK LOCK: ON" : "FALLBACK LOCK: OFF";
      if (fallbackButton.textContent !== btnLabel) fallbackButton.textContent = btnLabel;
      fallbackButton.style.background = alphaState.fallbackLockEnabled ? "#7a1f1f" : "#2d2f35";
      fallbackButton.style.borderColor = alphaState.fallbackLockEnabled ? "#9f2b2b" : "#454953";
      fallbackButton.style.color = "#f4f4f4";
    }

    var fallbackStatus = byId("alpha-fallback-status");
    if (fallbackStatus) {
      var reason = alphaState.lastFallbackReason ? " / " + alphaState.lastFallbackReason : "";
      var routeTail = alphaState.lastFallbackRoute ? " / route: " + alphaState.lastFallbackRoute : "";
      var statusText =
        "fallback hit: " +
        alphaState.fallbackDetectedCount +
        " | locked: " +
        alphaState.fallbackLockedCount +
        reason +
        routeTail;
      if (fallbackStatus.textContent !== statusText) {
        fallbackStatus.textContent = statusText;
      }
    }
  }

  function toggleFallbackLock() {
    alphaState.fallbackLockEnabled = !alphaState.fallbackLockEnabled;
    renderFallbackPanelState();
    maybeApplyFallbackLock();
  }

  function ensureDebugPanel() {
    var hasGoNext = typeof resolveGoNextHandler() === "function";
    var panel = byId("alpha-tester-panel");

    if (!panel && document.body) {
      panel = document.createElement("div");
      panel.id = "alpha-tester-panel";
      panel.style.position = "fixed";
      panel.style.right = "14px";
      panel.style.bottom = "14px";
      panel.style.zIndex = "2147483647";
      panel.style.display = "none";
      panel.style.flexDirection = "column";
      panel.style.gap = "6px";
      panel.style.width = "330px";

      var flowHud = document.createElement("pre");
      flowHud.id = "alpha-flow-hud";
      flowHud.style.margin = "0";
      flowHud.style.padding = "8px";
      flowHud.style.borderRadius = "10px";
      flowHud.style.border = "1px solid #454953";
      flowHud.style.background = "rgba(16,17,20,0.92)";
      flowHud.style.color = "#d7dee9";
      flowHud.style.font = "600 10px/1.35 Consolas, 'Courier New', monospace";
      flowHud.style.whiteSpace = "pre-wrap";
      flowHud.style.wordBreak = "break-all";

      var controlsToggleButton = document.createElement("button");
      controlsToggleButton.id = "alpha-controls-toggle-btn";
      controlsToggleButton.type = "button";
      controlsToggleButton.style.border = "1px solid #454953";
      controlsToggleButton.style.borderRadius = "10px";
      controlsToggleButton.style.padding = "8px 10px";
      controlsToggleButton.style.font = "700 12px/1 sans-serif";
      controlsToggleButton.style.letterSpacing = "0.2px";
      controlsToggleButton.style.cursor = "pointer";
      controlsToggleButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      controlsToggleButton.addEventListener("click", function () {
        togglePanelControls();
      });

      var controlsWrap = document.createElement("div");
      controlsWrap.id = "alpha-controls-wrap";
      controlsWrap.style.display = "flex";
      controlsWrap.style.flexDirection = "column";
      controlsWrap.style.gap = "6px";

      var fallbackButton = document.createElement("button");
      fallbackButton.id = "alpha-fallback-lock-btn";
      fallbackButton.type = "button";
      fallbackButton.style.border = "1px solid #454953";
      fallbackButton.style.borderRadius = "10px";
      fallbackButton.style.padding = "8px 10px";
      fallbackButton.style.font = "700 12px/1 sans-serif";
      fallbackButton.style.letterSpacing = "0.2px";
      fallbackButton.style.cursor = "pointer";
      fallbackButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      fallbackButton.addEventListener("click", function () {
        toggleFallbackLock();
      });

      var logButton = document.createElement("button");
      logButton.id = "alpha-fallback-log-btn";
      logButton.type = "button";
      logButton.textContent = "PRINT FALLBACK LOG";
      logButton.style.border = "1px solid #454953";
      logButton.style.borderRadius = "10px";
      logButton.style.padding = "8px 10px";
      logButton.style.font = "700 12px/1 sans-serif";
      logButton.style.letterSpacing = "0.2px";
      logButton.style.cursor = "pointer";
      logButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      logButton.style.background = "#2d2f35";
      logButton.style.color = "#f4f4f4";
      logButton.addEventListener("click", function () {
        printFallbackLogs();
      });

      var nightButton = document.createElement("button");
      nightButton.id = "alpha-night-overlay-btn";
      nightButton.type = "button";
      nightButton.style.border = "1px solid #454953";
      nightButton.style.borderRadius = "10px";
      nightButton.style.padding = "8px 10px";
      nightButton.style.font = "700 12px/1 sans-serif";
      nightButton.style.letterSpacing = "0.2px";
      nightButton.style.cursor = "pointer";
      nightButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      nightButton.style.background = "#2d2f35";
      nightButton.style.color = "#f4f4f4";
      nightButton.addEventListener("click", function () {
        toggleNightOverlay();
      });

      var qcapButton = document.createElement("button");
      qcapButton.id = "alpha-qcap20-btn";
      qcapButton.type = "button";
      qcapButton.style.border = "1px solid #454953";
      qcapButton.style.borderRadius = "10px";
      qcapButton.style.padding = "8px 10px";
      qcapButton.style.font = "700 12px/1 sans-serif";
      qcapButton.style.letterSpacing = "0.2px";
      qcapButton.style.cursor = "pointer";
      qcapButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      qcapButton.style.background = "#2d2f35";
      qcapButton.style.color = "#f4f4f4";
      qcapButton.addEventListener("click", function () {
        toggleQuestionCap();
      });

      var tourQCapRow = document.createElement("div");
      tourQCapRow.style.display = "flex";
      tourQCapRow.style.alignItems = "center";
      tourQCapRow.style.gap = "6px";

      var tourQCapInput = document.createElement("input");
      tourQCapInput.id = "alpha-tour-qcap-input";
      tourQCapInput.type = "number";
      tourQCapInput.min = "1";
      tourQCapInput.step = "1";
      tourQCapInput.value = String(alphaState.tourQCapValue || 1);
      tourQCapInput.style.flex = "1";
      tourQCapInput.style.height = "30px";
      tourQCapInput.style.border = "1px solid #454953";
      tourQCapInput.style.borderRadius = "8px";
      tourQCapInput.style.background = "rgba(16,17,20,0.92)";
      tourQCapInput.style.color = "#f4f4f4";
      tourQCapInput.style.padding = "0 8px";
      tourQCapInput.style.font = "700 12px/1 sans-serif";
      tourQCapInput.style.boxSizing = "border-box";
      tourQCapInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          applyTourQCap(tourQCapInput.value);
        }
      });

      var tourQCapApplyButton = document.createElement("button");
      tourQCapApplyButton.id = "alpha-tour-qcap-apply-btn";
      tourQCapApplyButton.type = "button";
      tourQCapApplyButton.style.border = "1px solid #454953";
      tourQCapApplyButton.style.borderRadius = "10px";
      tourQCapApplyButton.style.padding = "8px 10px";
      tourQCapApplyButton.style.font = "700 12px/1 sans-serif";
      tourQCapApplyButton.style.letterSpacing = "0.2px";
      tourQCapApplyButton.style.cursor = "pointer";
      tourQCapApplyButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      tourQCapApplyButton.style.background = "#2d2f35";
      tourQCapApplyButton.style.color = "#f4f4f4";
      tourQCapApplyButton.addEventListener("click", function () {
        applyTourQCap(tourQCapInput.value);
      });

      tourQCapRow.appendChild(tourQCapInput);
      tourQCapRow.appendChild(tourQCapApplyButton);

      var round2Button = document.createElement("button");
      round2Button.id = "alpha-to-round2-btn";
      round2Button.type = "button";
      round2Button.style.border = "1px solid #1a5f9b";
      round2Button.style.borderRadius = "10px";
      round2Button.style.padding = "8px 10px";
      round2Button.style.font = "700 12px/1 sans-serif";
      round2Button.style.letterSpacing = "0.2px";
      round2Button.style.cursor = "pointer";
      round2Button.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      round2Button.style.background = "#0f3a60";
      round2Button.style.color = "#f4f4f4";
      round2Button.addEventListener("click", function () {
        forceToRound2();
      });

      var resetFlowButton = document.createElement("button");
      resetFlowButton.id = "alpha-reset-flow-btn";
      resetFlowButton.type = "button";
      resetFlowButton.style.border = "1px solid #8b3a3a";
      resetFlowButton.style.borderRadius = "10px";
      resetFlowButton.style.padding = "8px 10px";
      resetFlowButton.style.font = "700 12px/1 sans-serif";
      resetFlowButton.style.letterSpacing = "0.2px";
      resetFlowButton.style.cursor = "pointer";
      resetFlowButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      resetFlowButton.style.background = "#4d2222";
      resetFlowButton.style.color = "#f4f4f4";
      resetFlowButton.addEventListener("click", function () {
        clearRound2FlowAndQuizState();
      });

      var round2RightButton = document.createElement("button");
      round2RightButton.id = "alpha-r2-right-btn";
      round2RightButton.type = "button";
      round2RightButton.textContent = "R2 ALPHA RIGHT";
      round2RightButton.style.border = "1px solid #2f8b44";
      round2RightButton.style.borderRadius = "10px";
      round2RightButton.style.padding = "8px 10px";
      round2RightButton.style.font = "700 12px/1 sans-serif";
      round2RightButton.style.letterSpacing = "0.2px";
      round2RightButton.style.cursor = "pointer";
      round2RightButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      round2RightButton.style.background = "#1f5f2e";
      round2RightButton.style.color = "#f4f4f4";
      round2RightButton.title = "Show round2 pass result";
      round2RightButton.addEventListener("click", function () {
        alphaRound2Right();
      });

      var round2WrongButton = document.createElement("button");
      round2WrongButton.id = "alpha-r2-wrong-btn";
      round2WrongButton.type = "button";
      round2WrongButton.textContent = "R2 ALPHA WRONG";
      round2WrongButton.style.border = "1px solid #9f2b2b";
      round2WrongButton.style.borderRadius = "10px";
      round2WrongButton.style.padding = "8px 10px";
      round2WrongButton.style.font = "700 12px/1 sans-serif";
      round2WrongButton.style.letterSpacing = "0.2px";
      round2WrongButton.style.cursor = "pointer";
      round2WrongButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.20)";
      round2WrongButton.style.background = "#7a1f1f";
      round2WrongButton.style.color = "#f4f4f4";
      round2WrongButton.title = "Show round2 fail result";
      round2WrongButton.addEventListener("click", function () {
        alphaRound2Wrong();
      });

      var nextButton = document.createElement("button");
      nextButton.id = "alpha-next-btn";
      nextButton.type = "button";
      nextButton.textContent = "ALPHA NEXT";
      nextButton.style.background = "#101114";
      nextButton.style.color = "#f4f4f4";
      nextButton.style.border = "1px solid #2f3238";
      nextButton.style.borderRadius = "10px";
      nextButton.style.padding = "8px 10px";
      nextButton.style.font = "700 12px/1 sans-serif";
      nextButton.style.letterSpacing = "0.4px";
      nextButton.style.cursor = "pointer";
      nextButton.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)";
      nextButton.addEventListener("click", function () {
        forceGoNext();
      });

      var hint = document.createElement("div");
      hint.textContent = "Alt+Shift+N";
      hint.style.font = "600 10px/1.2 sans-serif";
      hint.style.color = "#101114";
      hint.style.background = "rgba(255,255,255,0.88)";
      hint.style.border = "1px solid rgba(0,0,0,0.08)";
      hint.style.borderRadius = "7px";
      hint.style.padding = "4px 6px";
      hint.style.textAlign = "center";

      var fallbackStatus = document.createElement("div");
      fallbackStatus.id = "alpha-fallback-status";
      fallbackStatus.style.font = "600 10px/1.2 sans-serif";
      fallbackStatus.style.color = "#101114";
      fallbackStatus.style.background = "rgba(255,255,255,0.88)";
      fallbackStatus.style.border = "1px solid rgba(0,0,0,0.08)";
      fallbackStatus.style.borderRadius = "7px";
      fallbackStatus.style.padding = "4px 6px";
      fallbackStatus.style.textAlign = "center";

      controlsWrap.appendChild(fallbackButton);
      controlsWrap.appendChild(logButton);
      controlsWrap.appendChild(nightButton);
      controlsWrap.appendChild(qcapButton);
      controlsWrap.appendChild(tourQCapRow);
      controlsWrap.appendChild(round2Button);
      controlsWrap.appendChild(resetFlowButton);
      controlsWrap.appendChild(round2RightButton);
      controlsWrap.appendChild(round2WrongButton);
      controlsWrap.appendChild(nextButton);
      controlsWrap.appendChild(hint);
      controlsWrap.appendChild(fallbackStatus);

      panel.appendChild(flowHud);
      panel.appendChild(controlsToggleButton);
      panel.appendChild(controlsWrap);
      document.body.appendChild(panel);
    }

    if (panel) {
      panel.style.display = hasGoNext ? "flex" : "none";
      renderFallbackPanelState();
      renderNightOverlayState();
      renderQuestionCapState();
      renderTourQCapState();
      renderPanelControlsState();
      renderRound2ButtonState();
      renderResetFlowButtonState();
      renderFlowHud();
    }
  }

  function onKeyDown(ev) {
    var key = String(ev.key || "");
    if (ev.altKey && ev.shiftKey && (key === "N" || key === "n")) {
      ev.preventDefault();
      forceGoNext();
    }
  }

  function isInsideAlphaPanel(node) {
    var el = node && node.nodeType === 1 ? node : (node && node.parentElement ? node.parentElement : null);
    if (!el) return false;
    return !!(el.closest && el.closest("#alpha-tester-panel"));
  }

  function scheduleHooks() {
    if (alphaState.hookScheduled) return;
    alphaState.hookScheduled = true;
    setTimeout(function () {
      alphaState.hookScheduled = false;
      runHooks();
    }, 0);
  }

  function runHooks() {
    if (alphaState.isRunningHooks) return;
    alphaState.isRunningHooks = true;
    syncRound2GlobalAliases();
    wrapSubmitAnswer();
    wrapGoNext();
    wrapBuildQuestionsFromRows();
    wrapStartQuizForQuestionCap();
    wrapTraceFunctions();
    applyQuestionCap();
    syncNextOnRender();
    maybeApplyFallbackLock();
    ensureNightOverlay();
    ensureDebugPanel();
    renderFlowHud();
    alphaState.isRunningHooks = false;
  }

  function start() {
    if (!isTourModeActive()) {
      var panel = byId("alpha-tester-panel");
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      return;
    }

    var storedNight = getStorageSafe("alphaNightOverlayEnabled");
    alphaState.nightOverlayEnabled = (storedNight === null) ? true : (storedNight === "1");
    var storedQCap = getStorageSafe("alphaQuestionCap20Enabled");
    alphaState.questionCapEnabled = (storedQCap === "1");
    alphaState.tourQCapValue = readTourQCapFromState();
    var storedControls = getStorageSafe("alphaPanelControlsVisible");
    alphaState.panelControlsVisible = (storedControls === null) ? true : (storedControls === "1");
    runHooks();
    document.addEventListener("keydown", onKeyDown);

    var rootNode = document.documentElement || document.body;
    if (rootNode) {
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var m = mutations[i];
          if (isInsideAlphaPanel(m.target)) continue;
          scheduleHooks();
          return;
        }
      });
      observer.observe(rootNode, { childList: true, subtree: true });
    }

    if (!alphaState.timerId) {
      alphaState.timerId = window.setInterval(runHooks, 1200);
    }

    window.alphaForceNext = forceGoNext;
    window.alphaToggleFallbackLock = toggleFallbackLock;
    window.alphaPrintFallbackLogs = printFallbackLogs;
    window.alphaClearFallbackLogs = clearFallbackLogs;
    window.alphaFallbackLogs = alphaState.fallbackLogs;
    window.alphaToggleNightOverlay = toggleNightOverlay;
    window.alphaToggleQuestionCap = toggleQuestionCap;
    window.alphaApplyQuestionCap = applyQuestionCap;
    window.alphaApplyTourQCap = applyTourQCap;
    window.alphaTogglePanelControls = togglePanelControls;
    window.alphaToRound2 = forceToRound2;
    window.alphaResetRound2Flow = clearRound2FlowAndQuizState;
    window.alphaRound2Right = alphaRound2Right;
    window.alphaRound2Wrong = alphaRound2Wrong;
    window.r2_alpharight = alphaRound2Right;
    window.r2_alphawrong = alphaRound2Wrong;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
