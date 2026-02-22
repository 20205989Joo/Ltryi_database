// pleks-resultstable.js
// Generic result popup table for Pleks quizzes.

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

  function defaultReturnToTray(quizTitle) {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id") || "";
    const target = new URL("../homework-tray_v1.html", window.location.href);
    if (userId) target.searchParams.set("id", userId);
    if (quizTitle) target.searchParams.set("quizKey", quizTitle || "");
    window.location.replace(target.toString());
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function show(options) {
    const opts = options || {};
    const results = Array.isArray(opts.results) ? opts.results : [];
    const quizTitle = opts.quizTitle || "";
    const subcategory = opts.subcategory || "";
    const level = opts.level || "";
    const day = opts.day || "";
    const passScore = Number.isFinite(opts.passScore) ? Number(opts.passScore) : 80;

    const { totalQuestions, correctCount, score } = computeScore(results);
    const canSubmit = score >= passScore;

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

    let content = document.getElementById("result-content");
    if (!content) {
      content = document.createElement("div");
      content.id = "result-content";
      content.className = "popup-content";
      popup.innerHTML = "";
      popup.appendChild(content);
    }

    window.restartQuiz = typeof opts.onRestart === "function" ? opts.onRestart : defaultRestart;
    window.returnToTray = typeof opts.onSubmit === "function"
      ? opts.onSubmit
      : () => defaultReturnToTray(quizTitle);

    const rowsHtml = results
      .map((r) => {
        const mark = r.correct ? "O" : "X";
        return `
          <tr>
            <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.no ?? "")}</td>
            <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.word ?? "")}</td>
            <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.selected ?? "")}</td>
            <td style="padding:6px; border-bottom:1px solid #eee;">${mark}</td>
          </tr>
        `;
      })
      .join("");

    content.innerHTML = `
      <div style="font-weight:900; font-size:16px; margin-bottom:8px;">결과</div>
      <div style="margin-bottom:8px; font-size:14px;">
        점수: <b>${score}</b>점 (${correctCount} / ${totalQuestions})
      </div>
      ${
        canSubmit
          ? `<div style="margin-bottom:10px; font-size:12px; color:#2e7d32;">기준 점수(${passScore}) 이상입니다.</div>`
          : `<div style="margin-bottom:10px; font-size:12px; color:#c62828;">기준 점수(${passScore}) 미만입니다.</div>`
      }
      <div style="max-height:260px; overflow-y:auto; margin-bottom:14px;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#f6f6f6;">
              <th style="padding:6px; border-bottom:1px solid #ccc;">번호</th>
              <th style="padding:6px; border-bottom:1px solid #ccc;">문제</th>
              <th style="padding:6px; border-bottom:1px solid #ccc;">내 답</th>
              <th style="padding:6px; border-bottom:1px solid #ccc;">정오</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
      <div style="display:flex; justify-content:space-between; gap:10px; margin-top:8px;">
        <button class="quiz-btn" onclick="restartQuiz()">다시하기</button>
        <button class="quiz-btn" id="submit-btn" ${canSubmit ? "" : "disabled"} onclick="returnToTray()">제출하러 가기</button>
      </div>
    `;

    popup.style.display = "flex";

    const submitBtn = document.getElementById("submit-btn");
    if (submitBtn && !canSubmit) {
      submitBtn.style.opacity = "0.5";
      submitBtn.style.cursor = "not-allowed";
    }
  }

  window.PleksResultsTable = { show };
})();
