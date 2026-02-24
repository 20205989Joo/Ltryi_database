// dishquiz_resultstable.js
// Same structure and wording as dish-quiz.js result popup.

(function () {
  const FLOW_STORAGE_KEY = "HermaRound2FlowMap";
  const FULL_TOUR_STORAGE_KEY = "HermaFullTourState";
  const RELEARN_MIN_COUNT = 6;
  const ROUND2_PASS_SCORE = 80;
  const HERMA_ROUND2_SLUGS = new Set([
    "l1e2", "l1e3", "l1e4",
    "l2e1", "l2e2", "l2e3", "l2e4",
    "l3e1", "l3e2", "l3e3", "l3e4", "l3e6",
    "l4e1", "l4e2", "l4e3",
    "l5e1", "l5e2",
    "l6e1", "l6e2", "l6e3"
  ]);
  const FULL_TOUR_SEQUENCE = [
    "l1e1", "l1e2", "l1e3", "l1e4",
    "l2e1", "l2e2", "l2e3", "l2e4",
    "l3e1", "l3e2", "l3e3", "l3e4", "l3e5", "l3e6",
    "l4e1", "l4e2", "l4e3",
    "l5e1", "l5e1b", "l5e2",
    "l6e1", "l6e2", "l6e3", "l6e4", "l6e5"
  ];

  function readQuizResultsMap() {
    try {
      const raw = localStorage.getItem("QuizResultsMap");
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function storeQuizResultWithMap(resultObject) {
    localStorage.setItem("QuizResults", JSON.stringify(resultObject));

    const quizKey = String(resultObject?.quiztitle || resultObject?.quizTitle || "").trim();
    if (!quizKey) return;

    const map = readQuizResultsMap();
    map[quizKey] = resultObject;
    if (/_round2$/i.test(quizKey)) {
      const baseKey = toBaseQuizKey(quizKey);
      if (baseKey && Object.prototype.hasOwnProperty.call(map, baseKey)) {
        delete map[baseKey];
      }
    }
    localStorage.setItem("QuizResultsMap", JSON.stringify(map));
  }

  function removeQuizResultsMapKeys(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    const map = readQuizResultsMap();
    let changed = false;
    list.forEach((k) => {
      const key = normalizeQuizKey(k);
      if (!key) return;
      if (!Object.prototype.hasOwnProperty.call(map, key)) return;
      delete map[key];
      changed = true;
    });
    if (!changed) return;
    localStorage.setItem("QuizResultsMap", JSON.stringify(map));
  }

  function readFlowMap() {
    try {
      const raw = localStorage.getItem(FLOW_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeFlowMap(map) {
    try {
      localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(map || {}));
    } catch (_) {}
  }

  function normalizeQuizKey(key) {
    return String(key || "").trim();
  }

  function toBaseQuizKey(key) {
    const s = normalizeQuizKey(key);
    return s.replace(/_round2$/i, "");
  }

  function toRound2QuizKey(key) {
    const base = toBaseQuizKey(key);
    if (!base) return "";
    return `${base}_round2`;
  }

  function getCurrentParamsSafe() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function getCurrentQuizKeyFromQuery() {
    return normalizeQuizKey(getCurrentParamsSafe().get("key") || "");
  }

  function resolveBaseQuizKey(quizTitle, subcategory, level, day) {
    const byTitle = toBaseQuizKey(quizTitle);
    if (byTitle) return byTitle;
    const byQuery = toBaseQuizKey(getCurrentQuizKeyFromQuery());
    if (byQuery) return byQuery;
    const sub = normalizeQuizKey(subcategory);
    const lv = normalizeQuizKey(level);
    const d = normalizeQuizKey(day);
    if (sub && lv && d) return `quiz_${sub}_${lv}_${d}`;
    return "";
  }

  function isRound2QuizKey(quizTitle) {
    const title = normalizeQuizKey(quizTitle);
    if (/_round2$/i.test(title)) return true;
    const queryKey = getCurrentQuizKeyFromQuery();
    if (/_round2$/i.test(queryKey)) return true;
    const params = getCurrentParamsSafe();
    return String(params.get("round2") || "").trim() === "1";
  }

  function getCurrentPageSlug() {
    const path = String(window.location.pathname || "");
    const file = path.split("/").pop() || "";
    const m = file.match(/^herma-(l\d+e\d+[a-z]*)\.html$/i);
    return m ? String(m[1]).toLowerCase() : "";
  }

  function hasRound2ForSlug(slug) {
    const s = String(slug || "").toLowerCase();
    if (!s) return false;
    return HERMA_ROUND2_SLUGS.has(s);
  }

  function hasRound2ForCurrentPage() {
    return hasRound2ForSlug(getCurrentPageSlug());
  }

  function getRound2ScriptForSlug(slug) {
    const s = String(slug || "").toLowerCase();
    if (!s || !hasRound2ForSlug(s)) return "";
    return `herma-${s}_round2.js`;
  }

  function getRound2ScriptForCurrentPage() {
    return getRound2ScriptForSlug(getCurrentPageSlug());
  }

  function readFullTourState() {
    try {
      const raw = sessionStorage.getItem(FULL_TOUR_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeFullTourState(nextState) {
    try {
      sessionStorage.setItem(FULL_TOUR_STORAGE_KEY, JSON.stringify(nextState || {}));
    } catch (_) {}
  }

  function clearFullTourState() {
    try {
      sessionStorage.removeItem(FULL_TOUR_STORAGE_KEY);
    } catch (_) {}
  }

  function hasFullTourFlagInQuery() {
    const params = getCurrentParamsSafe();
    return String(params.get("fullTour") || "").trim() === "1";
  }

  function getFullTourIndexBySlug(slug) {
    const s = String(slug || "").toLowerCase();
    if (!s) return -1;
    return FULL_TOUR_SEQUENCE.indexOf(s);
  }

  function parseTourQCap(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 1;
    return Math.max(1, Math.floor(n));
  }

  function buildPageUrlBySlug(slug, nextParams) {
    const s = String(slug || "").toLowerCase();
    if (!s) return "";
    const target = new URL(`herma-${s}.html`, window.location.href);
    const params = nextParams || {};
    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v === null || v === undefined || v === "") {
        target.searchParams.delete(k);
      } else {
        target.searchParams.set(k, String(v));
      }
    });
    return target.toString();
  }

  function goToFullTourStep(slug, phase, qcap) {
    const params = getCurrentParamsSafe();
    const userId = String(params.get("id") || "").trim();
    const script = phase === "round2" ? getRound2ScriptForSlug(slug) : "";
    const targetKey = script ? toRound2QuizKey(getCurrentQuizKeyFromQuery() || "") : "";
    const cap = parseTourQCap(qcap);

    const url = buildPageUrlBySlug(slug, {
      id: userId || null,
      key: targetKey || null,
      fullTour: "1",
      imsi_qcap: String(cap),
      round2: script ? "1" : null,
      round2Script: script || null,
      alphaRound2: null,
      alphaFrom: null,
      dishQuizKey: null
    });
    if (!url) return false;
    window.location.replace(url);
    return true;
  }

  function finishFullTour() {
    clearFullTourState();
    const params = getCurrentParamsSafe();
    const userId = String(params.get("id") || "").trim();
    const target = new URL("herma-round1_leveljump.html", window.location.href);
    if (userId) target.searchParams.set("id", userId);
    window.location.replace(target.toString());
    return true;
  }

  function handleFullTourFlow(args) {
    const data = args || {};
    const slug = String(data.slug || "").toLowerCase();
    if (!slug) return { handled: false, active: false };

    const fromQuery = hasFullTourFlagInQuery();
    const saved = readFullTourState();
    if (!fromQuery && !(saved && saved.active)) {
      return { handled: false, active: false };
    }

    const indexBySlug = getFullTourIndexBySlug(slug);
    if (indexBySlug < 0) return { handled: false, active: true };

    const inRound2 = !!data.inRound2;
    const hasRound2 = hasRound2ForSlug(slug);
    const nextIndex = indexBySlug + 1;
    const nextSlug = nextIndex < FULL_TOUR_SEQUENCE.length ? FULL_TOUR_SEQUENCE[nextIndex] : "";
    const qcap = parseTourQCap(saved && saved.qcap);

    const baseState = saved && typeof saved === "object" ? saved : {};
    const nextState = Object.assign({}, baseState, {
      active: true,
      mode: "full-tour",
      index: indexBySlug,
      phase: inRound2 ? "round2" : "learn",
      qcap: qcap,
      sequence: FULL_TOUR_SEQUENCE.slice(),
      updatedAt: new Date().toISOString()
    });
    writeFullTourState(nextState);

    if (!inRound2) {
      if (hasRound2) {
        nextState.phase = "round2";
        writeFullTourState(nextState);
        return { handled: goToFullTourStep(slug, "round2", qcap), active: true };
      }

      if (nextSlug) {
        nextState.index = nextIndex;
        nextState.phase = "learn";
        writeFullTourState(nextState);
        return { handled: goToFullTourStep(nextSlug, "learn", qcap), active: true };
      }

      return { handled: finishFullTour(), active: true };
    }

    if (nextSlug) {
      nextState.index = nextIndex;
      nextState.phase = "learn";
      writeFullTourState(nextState);
      return { handled: goToFullTourStep(nextSlug, "learn", qcap), active: true };
    }

    return { handled: finishFullTour(), active: true };
  }

  function upsertFlowState(baseQuizKey, patch) {
    const key = toBaseQuizKey(baseQuizKey);
    if (!key) return null;
    const map = readFlowMap();
    const prev = map[key] && typeof map[key] === "object" ? map[key] : {};
    const next = Object.assign({}, prev, patch || {}, {
      updatedAt: new Date().toISOString()
    });
    map[key] = next;
    writeFlowMap(map);
    return next;
  }

  function clearFlowState(baseQuizKey) {
    const key = toBaseQuizKey(baseQuizKey);
    if (!key) return;
    const map = readFlowMap();
    if (!Object.prototype.hasOwnProperty.call(map, key)) return;
    delete map[key];
    writeFlowMap(map);
  }

  function getFlowState(baseQuizKey) {
    const key = toBaseQuizKey(baseQuizKey);
    if (!key) return null;
    const map = readFlowMap();
    const entry = map[key];
    return entry && typeof entry === "object" ? entry : null;
  }

  function buildCurrentPageUrl(nextParams) {
    const target = new URL(window.location.href);
    const params = nextParams || {};
    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v === null || v === undefined || v === "") {
        target.searchParams.delete(k);
      } else {
        target.searchParams.set(k, String(v));
      }
    });
    return target.toString();
  }

  function goToRound2(baseQuizKey, round2Script) {
    const params = getCurrentParamsSafe();
    const userId = params.get("id") || "";
    const targetKey = toRound2QuizKey(baseQuizKey);
    const url = buildCurrentPageUrl({
      id: userId || null,
      key: targetKey || null,
      round2: "1",
      round2Script: round2Script || null
    });
    window.location.replace(url);
  }

  function goToLearn(baseQuizKey) {
    const params = getCurrentParamsSafe();
    const userId = params.get("id") || "";
    const url = buildCurrentPageUrl({
      id: userId || null,
      key: toBaseQuizKey(baseQuizKey) || null,
      round2: null,
      round2Script: null
    });
    window.location.replace(url);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getProblemLabel(row, index) {
    const fallback = Number(index) + 1;
    const no = Number(row && row.no);
    const seq = Number.isFinite(no) && no > 0 ? Math.floor(no) : fallback;
    return `Q${seq}`;
  }

  function normalizeDiffToken(token) {
    return String(token == null ? "" : token)
      .toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, "");
  }

  function splitTextUnits(text) {
    return String(text == null ? "" : text)
      .split(/(\s+)/)
      .filter((chunk) => chunk !== "")
      .map((chunk, idx) => ({
        idx,
        raw: chunk,
        isSpace: /^\s+$/.test(chunk),
        norm: normalizeDiffToken(chunk)
      }));
  }

  function toComparableTokens(units) {
    return units
      .filter((u) => !u.isSpace && u.norm)
      .map((u) => ({ idx: u.idx, norm: u.norm }));
  }

  function buildSelectedMatchIndexSet(selectedTokens, modelTokens) {
    const n = selectedTokens.length;
    const m = modelTokens.length;
    if (!n || !m) return new Set();

    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i += 1) {
      for (let j = 1; j <= m; j += 1) {
        if (selectedTokens[i - 1].norm === modelTokens[j - 1].norm) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const matched = new Set();
    let i = n;
    let j = m;
    while (i > 0 && j > 0) {
      if (selectedTokens[i - 1].norm === modelTokens[j - 1].norm) {
        matched.add(selectedTokens[i - 1].idx);
        i -= 1;
        j -= 1;
        continue;
      }
      if (dp[i - 1][j] >= dp[i][j - 1]) i -= 1;
      else j -= 1;
    }
    return matched;
  }

  function getModelAnswerFromRow(row) {
    if (!row || typeof row !== "object") return "";
    const candidates = [
      row.modelAnswer,
      row.correctAnswer,
      row.answer,
      row.model,
      row.expected,
      row.target
    ];
    for (const c of candidates) {
      const s = String(c == null ? "" : c).trim();
      if (s) return s;
    }
    return "";
  }

  function renderSelectedAnswerHtml(row) {
    const selected = String(row && row.selected != null ? row.selected : "");
    if (!selected) return "";
    if (row && row.correct) return escapeHtml(selected);

    const model = getModelAnswerFromRow(row);
    if (!model) {
      return `<span style="color:#c62828;font-weight:700;">${escapeHtml(selected)}</span>`;
    }

    const selectedUnits = splitTextUnits(selected);
    const modelUnits = splitTextUnits(model);
    const selectedTokens = toComparableTokens(selectedUnits);
    const modelTokens = toComparableTokens(modelUnits);
    const matchedIdxSet = buildSelectedMatchIndexSet(selectedTokens, modelTokens);

    return selectedUnits.map((u) => {
      const safe = escapeHtml(u.raw);
      if (u.isSpace || !u.norm) return safe;
      if (matchedIdxSet.has(u.idx)) return safe;
      return `<span style="color:#c62828;font-weight:700;">${safe}</span>`;
    }).join("");
  }

  function renderFailAndRelearnPopup(args) {
    const data = args || {};
    const popupId = data.popupId || "result-popup";
    const popup = document.getElementById(popupId);
    if (!popup) {
      goToLearn(data.baseQuizKey || "");
      return;
    }

    const rows = Array.isArray(data.results) ? data.results : [];
    const tableRows = rows.map((r, idx) => {
      const no = r && typeof r.no !== "undefined" ? r.no : "";
      const word = getProblemLabel(r, idx);
      const selectedHtml = renderSelectedAnswerHtml(r);
      const ok = r && r.correct ? "\uC815\uB2F5" : "\uC624\uB2F5";
      return `
        <tr>
          <td style="padding:6px; border-bottom: 1px solid #eee;">${no}</td>
          <td style="padding:6px; border-bottom: 1px solid #eee;">${word}</td>
          <td style="padding:6px; border-bottom: 1px solid #eee; white-space:pre-wrap; word-break:break-word;">${selectedHtml}</td>
          <td style="padding:6px; border-bottom: 1px solid #eee;">${ok}</td>
        </tr>
      `;
    }).join("");

    window.restartQuiz = function () {
      goToLearn(data.baseQuizKey || "");
    };

    popup.innerHTML = `
      <div class="popup-content" id="result-content">
        <div style="font-weight:bold; font-size:16px; margin-bottom:8px;">\uB77C\uC6B4\uB4DC2 \uC2E4\uD328</div>
        <div style="margin-bottom:8px; font-size:14px;">
          \uC810\uC218: <b>${data.score || 0}</b> (${data.correctCount || 0} / ${data.totalQuestions || 0})
        </div>
        <div style="margin-bottom:10px; font-size:12px; color:#c62828;">
          \uC7AC\uD559\uC2B5\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. \uD559\uC2B5 \uBB38\uC81C \uC218\uB294 6\uBB38\uC81C\uB85C \uACE0\uC815\uB429\uB2C8\uB2E4.
        </div>
        <div id="result-detail" style="max-height:260px; overflow-y:auto; margin-bottom:14px;">
          <table style="width:100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background:#f6f6f6;">
                <th style="padding:6px; border-bottom:1px solid #ccc;">\uBC88\uD638</th>
                <th style="padding:6px; border-bottom:1px solid #ccc;">\uBB38\uC81C</th>
                <th style="padding:6px; border-bottom:1px solid #ccc;">\uC81C\uCD9C \uB2F5\uC548</th>
                <th style="padding:6px; border-bottom:1px solid #ccc;">\uACB0\uACFC</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        <div style="display:flex; justify-content:space-between; gap:10px; margin-top:8px;">
          <button class="quiz-btn" onclick="restartQuiz()">\uC7AC\uD559\uC2B5</button>
          <button class="quiz-btn" id="submit-btn" disabled>\uC81C\uCD9C \uBD88\uAC00</button>
        </div>
      </div>
    `;

    popup.style.display = "flex";

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn) {
      submitBtn.style.opacity = "0.5";
      submitBtn.style.cursor = "not-allowed";
    }
  }

  function handleHermaFlow(opts, scoreInfo) {
    const quizTitle = normalizeQuizKey(opts.quizTitle || "");
    const subcategory = normalizeQuizKey(opts.subcategory || "");
    const level = normalizeQuizKey(opts.level || "");
    const day = normalizeQuizKey(opts.day || "");
    const passScore = Number(opts.passScore || ROUND2_PASS_SCORE);
    const score = Number(scoreInfo.score || 0);
    const totalQuestions = Number(scoreInfo.totalQuestions || 0);
    const correctCount = Number(scoreInfo.correctCount || 0);
    const results = Array.isArray(opts.results) ? opts.results : [];

    const slug = getCurrentPageSlug();
    if (!slug) return { handled: false };

    const baseQuizKey = resolveBaseQuizKey(quizTitle, subcategory, level, day);
    const inRound2 = isRound2QuizKey(quizTitle);
    const hasRound2 = hasRound2ForCurrentPage();
    const round2Script = getRound2ScriptForCurrentPage();
    const fullTour = handleFullTourFlow({
      slug: slug,
      inRound2: inRound2,
      hasRound2: hasRound2
    });
    if (fullTour && fullTour.handled) {
      return { handled: true };
    }

    if (!inRound2 && hasRound2 && round2Script) {
      removeQuizResultsMapKeys([baseQuizKey, toRound2QuizKey(baseQuizKey)]);
      const prev = getFlowState(baseQuizKey) || {};
      upsertFlowState(baseQuizKey, {
        phase: "learn-complete",
        requireRelearn: false,
        minLearnCount: prev.minLearnCount && prev.minLearnCount > 4 ? prev.minLearnCount : 4
      });
      goToRound2(baseQuizKey, round2Script);
      return { handled: true };
    }

    if (!inRound2) {
      clearFlowState(baseQuizKey);
      return { handled: false };
    }

    if (score >= passScore) {
      clearFlowState(baseQuizKey);
      return { handled: false };
    }

    const prev = getFlowState(baseQuizKey) || {};
    const retryCount = Number(prev.retryCount || 0) + 1;
    upsertFlowState(baseQuizKey, {
      phase: "round2-failed",
      requireRelearn: true,
      minLearnCount: Math.max(RELEARN_MIN_COUNT, Number(prev.minLearnCount || 0)),
      retryCount: retryCount,
      lastRound2Score: score
    });

    renderFailAndRelearnPopup({
      popupId: opts.popupId,
      baseQuizKey: baseQuizKey,
      score: score,
      totalQuestions: totalQuestions,
      correctCount: correctCount,
      results: results
    });
    return { handled: true };
  }

  function computeScore(results) {
    const totalQuestions = results.length;
    const correctCount = results.filter((r) => r.correct).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    return { totalQuestions, correctCount, score };
  }

  function defaultRestart() {
    window.location.reload();
  }

  function parseDayNumber(dayValue) {
    const raw = String(dayValue || "").trim();
    if (!raw) return null;
    const m = raw.match(/(\d+)/);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  function parseLessonNoFromDishQuizKey(dishQuizKey) {
    const raw = String(dishQuizKey || "").trim();
    if (!raw) return null;
    const m = raw.match(/Lesson(\d+)/i);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isInteger(n) && n > 0 ? n : null;
  }

  function normalizeHermaSubcategory(raw) {
    const value = String(raw || "").trim();
    if (!value) return "문법";
    if (/^grammar$/i.test(value)) return "문법";
    return value;
  }

  function buildOneUpUrl(filename, extraParams) {
    const target = new URL(`../${filename}`, window.location.href);
    const params = extraParams || {};
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        target.searchParams.set(key, String(value));
      }
    });
    return target.toString();
  }

  function tryQueueDoneInWebAndGoTray(payload) {
    const info = payload || {};
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id") || "";
    const dishQuizKey = params.get("dishQuizKey") || "";

    const canonicalSub = normalizeHermaSubcategory(info.subcategory);
    const level = String(info.level || "herma").trim() || "herma";
    const dayNum = parseDayNumber(info.day);
    const quizKey = String(info.quizTitle || info.quiztitle || "").trim();

    let lessonNo = parseLessonNoFromDishQuizKey(dishQuizKey);
    if (!lessonNo && dayNum && /^herma$/i.test(level)) {
      // Herma lessons are currently mapped to 101+ day in the grammar range.
      lessonNo = 100 + dayNum;
    }

    if (!(Number.isInteger(lessonNo) && lessonNo > 0)) {
      return false;
    }

    const key = "PendingUploads";
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(existing)) existing = [];
    } catch (_) {
      existing = [];
    }

    existing = existing.filter((entry) => {
      if (!entry || typeof entry !== "object") return true;
      const entryQuizKey = String(entry.QuizKey || "").trim();
      if (quizKey && entryQuizKey) {
        return !(String(entry.UserId || "") === userId && entryQuizKey === quizKey);
      }
      const sameUser = String(entry.UserId || "") === userId;
      const sameSub = String(entry.Subcategory || "") === canonicalSub;
      const sameLevel = String(entry.Level || "") === level;
      const sameLesson = Number(entry.LessonNo) === lessonNo;
      return !(sameUser && sameSub && sameLevel && sameLesson);
    });

    existing.push({
      UserId: userId,
      Subcategory: canonicalSub,
      Level: level,
      QuizKey: quizKey || null,
      HWType: "doneinweb",
      LessonNo: lessonNo,
      Status: "readyToBeSent",
      Score: null,
      orderedFileURL: null,
      servedFileURL: null,
      timestamp: new Date().toISOString(),
      comment: "웹시험 완료(herma)",
      feedbackcomment: null
    });

    localStorage.setItem(key, JSON.stringify(existing));
    window.location.replace(
      buildOneUpUrl("homework-tray_v1.html", {
        id: userId,
        quizKey: info.quizTitle || ""
      })
    );
    return true;
  }

  function defaultReturnToTray(payload) {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id") || "";
    const rawQuizTitle = typeof payload === "string" ? payload : (payload?.quizTitle || "");
    const quizTitle = toBaseQuizKey(rawQuizTitle) || rawQuizTitle;

    if (payload && typeof payload === "object") {
      const normalizedPayload = Object.assign({}, payload, { quizTitle });
      const queued = tryQueueDoneInWebAndGoTray(normalizedPayload);
      if (queued) return;
    }

    window.location.replace(
      buildOneUpUrl("homework-tray_v1.html", {
        id: userId,
        quizKey: quizTitle || ""
      })
    );
  }

  function show(options) {
    const opts = options || {};
    const results = Array.isArray(opts.results) ? opts.results : [];
    const quizTitle = opts.quizTitle || "";
    const subcategory = opts.subcategory || "";
    const level = opts.level || "";
    const day = opts.day || "";

    const { totalQuestions, correctCount, score } = computeScore(results);
    const flow = handleHermaFlow(opts, {
      totalQuestions,
      correctCount,
      score
    });
    if (flow && flow.handled) return;

    const canSubmit = score >= 80;

    const resultObject = {
      quiztitle: quizTitle,
      subcategory,
      level,
      day,
      teststatus: "done",
      testspecific: results,
    };

    storeQuizResultWithMap(resultObject);

    const popupId = opts.popupId || "result-popup";
    const popup = document.getElementById(popupId);
    if (!popup) return;

    window.restartQuiz = typeof opts.onRestart === "function" ? opts.onRestart : defaultRestart;
    window.returnToTray = typeof opts.onSubmit === "function"
      ? opts.onSubmit
      : () => defaultReturnToTray({ quizTitle, subcategory, level, day });

    const table = `
      <table style="width:100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="background:#f6f6f6;">
            <th style="padding: 6px; border-bottom: 1px solid #ccc;">번호</th>
            <th style="padding: 6px; border-bottom: 1px solid #ccc;">문제</th>
            <th style="padding: 6px; border-bottom: 1px solid #ccc;">내 답안</th>
            <th style="padding: 6px; border-bottom: 1px solid #ccc;">정답 여부</th>
          </tr>
        </thead>
        <tbody>
          ${results
            .map(
              (r, idx) => `
            <tr>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${r.no}</td>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${getProblemLabel(r, idx)}</td>
              <td style="padding:6px; border-bottom: 1px solid #eee; white-space:pre-wrap; word-break:break-word;">${renderSelectedAnswerHtml(r)}</td>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${r.correct ? "⭕" : "❌"}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    popup.innerHTML = `
      <div class="popup-content" id="result-content">
        <div style="font-weight: bold; font-size:16px; margin-bottom: 8px;">📄 전체 시험지 결과</div>
        <div style="margin-bottom: 8px; font-size: 14px;">
          총 점수: <b>${score}점</b> (${correctCount} / ${totalQuestions})
        </div>
        ${
          !canSubmit
            ? `<div style="margin-bottom: 10px; font-size: 12px; color:#c62828;">
                 ⚠️ 80점 이상부터 제출할 수 있어요. 다시 한 번 풀어볼까요?
               </div>`
            : `<div style="margin-bottom: 10px; font-size: 12px; color:#2e7d32;">
                 ✅ 80점 이상입니다! 제출하러 갈 수 있어요.
               </div>`
        }
        <div id="result-detail" style="max-height: 260px; overflow-y: auto; margin-bottom: 14px;">
          ${table}
        </div>
        <div style="display:flex; justify-content: space-between; gap: 10px; margin-top:8px;">
          <button class="quiz-btn" onclick="restartQuiz()">🔁 재시험</button>
          <button
            class="quiz-btn"
            id="submit-btn"
            ${canSubmit ? "" : "disabled"}
            onclick="returnToTray()"
          >
            🍽 제출하러 가기
          </button>
        </div>
      </div>
    `;

    popup.style.display = "flex";

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn && !canSubmit) {
      submitBtn.style.opacity = "0.5";
      submitBtn.style.cursor = "not-allowed";
    }
  }

  function getDebugPayload() {
    if (typeof window.getDishQuizDebugPayload === "function") {
      try {
        return window.getDishQuizDebugPayload();
      } catch (e) {
        return null;
      }
    }
    if (window.DishQuizDebugPayload && typeof window.DishQuizDebugPayload === "object") {
      return window.DishQuizDebugPayload;
    }
    return null;
  }

  function ensureDebugButton() {
    if (!window.DishQuizResultsTableDebug) return null;
    const id = "debug-results-btn";
    let btn = document.getElementById(id);
    if (btn) return btn;

    btn = document.createElement("button");
    btn.id = id;
    btn.type = "button";
    btn.className = "quiz-btn";
    btn.textContent = window.DishQuizResultsTableDebugLabel || "결과표 호출";
    btn.style.cssText = [
      "position:fixed",
      "top:10px",
      "right:10px",
      "z-index:10000",
      "background:#6b6b6b",
      "box-shadow:0 2px 6px rgba(0,0,0,0.2)",
    ].join(";");
    document.body.appendChild(btn);
    return btn;
  }

  function bindDebugButton() {
    if (!window.DishQuizResultsTableDebug) return;
    const btn = ensureDebugButton();
    if (!btn || btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {
      const payload = getDebugPayload();
      if (!payload) {
        alert("디버그 데이터가 없습니다.");
        return;
      }
      show(payload);
    });
  }

  function initDebug() {
    bindDebugButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDebug);
  } else {
    initDebug();
  }

  window.DishQuizFlow = {
    readFlowMap,
    getFlowState,
    clearFlowState,
    toBaseQuizKey,
    toRound2QuizKey
  };

  window.DishQuizResultsTable = { show, bindDebugButton };
})();
