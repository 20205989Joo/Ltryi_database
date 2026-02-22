// dishquiz_resultstable.js
// Same structure and wording as dish-quiz.js result popup.

(function () {
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
    localStorage.setItem("QuizResultsMap", JSON.stringify(map));
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
    const quizTitle = typeof payload === "string" ? payload : (payload?.quizTitle || "");

    if (payload && typeof payload === "object") {
      const queued = tryQueueDoneInWebAndGoTray(payload);
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
              (r) => `
            <tr>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${r.no}</td>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${r.word}</td>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${r.selected}</td>
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

  window.DishQuizResultsTable = { show, bindDebugButton };
})();
