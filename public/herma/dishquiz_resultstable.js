// dishquiz_resultstable.js
// Same structure and wording as dish-quiz.js result popup.

(function () {
  function computeScore(results) {
    const totalQuestions = results.length;
    const correctCount = results.filter((r) => r.correct).length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    return { totalQuestions, correctCount, score };
  }

  function defaultRestart() {
    window.location.reload();
  }

  function defaultReturnToTray(quizTitle) {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id") || "";
    const url = `homework-tray_v1.html?id=${encodeURIComponent(userId)}&quizKey=${encodeURIComponent(quizTitle || "")}`;
    window.location.replace(url);
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

    localStorage.setItem("QuizResults", JSON.stringify(resultObject));

    const popupId = opts.popupId || "result-popup";
    const popup = document.getElementById(popupId);
    if (!popup) return;

    window.restartQuiz = typeof opts.onRestart === "function" ? opts.onRestart : defaultRestart;
    window.returnToTray = typeof opts.onSubmit === "function"
      ? opts.onSubmit
      : () => defaultReturnToTray(quizTitle);

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
