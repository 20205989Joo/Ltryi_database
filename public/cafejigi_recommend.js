// 추천 기능: DayManager 기준으로 난이도(level) + Day 계산

const SUBJECT_CONFIG = {
  vocab: { label: "단어", subcategory: "단어" },
  grammar: { label: "문법", subcategory: "문법" },
  pattern: { label: "구문", subcategory: "단계별 독해" }
};

function getDayManager() {
  const dm = window.DayManager;
  if (!dm || typeof dm.getSubcategoryDefinition !== "function") {
    throw new Error("DayManager가 로드되지 않았습니다.");
  }
  return dm;
}

function parseRangeString(rangeStr) {
  const ranges = String(rangeStr || "").split(",");
  const numbers = new Set();
  for (const rawPart of ranges) {
    const part = rawPart.trim();
    if (/^\d+$/.test(part)) {
      numbers.add(parseInt(part, 10));
      continue;
    }
    if (/^\d+~\d+$/.test(part)) {
      const [start, end] = part.split("~").map(Number);
      for (let i = start; i <= end; i++) numbers.add(i);
    }
  }
  return [...numbers];
}

function collectCompletedLessons(subjectData) {
  const completed = new Set();
  for (const [key, status] of Object.entries(subjectData || {})) {
    if (!isCompletedStatus(status)) continue;
    const lessons = parseRangeString(key);
    for (const lesson of lessons) {
      if (Number.isInteger(lesson) && lesson > 0) {
        completed.add(lesson);
      }
    }
  }
  return completed;
}

function isCompletedStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return (
    normalized === "done" ||
    normalized === "complete" ||
    normalized === "completed" ||
    /^\d+%$/.test(normalized)
  );
}

function subjectLabel(subject) {
  return SUBJECT_CONFIG[subject]?.label || subject;
}

async function loadStudentProgress() {
  const userId = new URLSearchParams(location.search).get("id") || "Tester";
  const res = await fetch(
    `https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getProgressMatrixAll?UserId=${userId}`
  );
  const raw = await res.json();

  const lessons = {};
  for (const subject in raw) {
    if (!Object.prototype.hasOwnProperty.call(SUBJECT_CONFIG, subject)) continue;
    lessons[subject] = {};
    for (const { LessonNo, Status } of raw[subject]) {
      lessons[subject][LessonNo.toString()] = Status;
    }
  }
  return lessons;
}

function buildCurriculumMeta(subject) {
  const dm = getDayManager();
  const subcategory = SUBJECT_CONFIG[subject]?.subcategory;
  if (!subcategory) return null;

  const def = dm.getSubcategoryDefinition(subcategory);
  if (!def || !def.levels) return null;

  const lessonSet = new Set();
  for (const rawRange of Object.values(def.levels)) {
    if (!Array.isArray(rawRange) || rawRange.length < 2) continue;
    const start = Number(rawRange[0]);
    const end = Number(rawRange[1]);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end < start) {
      continue;
    }
    for (let lesson = start; lesson <= end; lesson++) {
      lessonSet.add(lesson);
    }
  }

  const sortedLessons = [...lessonSet].sort((a, b) => a - b);
  return {
    subcategory,
    sortedLessons,
    totalLessons: sortedLessons.length
  };
}

function countCompletedWithinCurriculum(curriculumMeta, completedLessons) {
  let count = 0;
  for (const lesson of curriculumMeta.sortedLessons) {
    if (completedLessons.has(lesson)) count += 1;
  }
  return count;
}

function findNextLesson(curriculumMeta, completedLessons) {
  if (!curriculumMeta || !curriculumMeta.totalLessons) return null;

  for (const lesson of curriculumMeta.sortedLessons) {
    if (!completedLessons.has(lesson)) return lesson;
  }
  return null;
}

function resolveLevelDay(subcategory, lessonNo) {
  const dm = getDayManager();

  if (typeof dm.inferLevel === "function") {
    const inferred = dm.inferLevel(subcategory, lessonNo);
    if (inferred) {
      const totalDays =
        typeof dm.getTotalDays === "function"
          ? dm.getTotalDays(subcategory, inferred.level)
          : null;
      return { level: inferred.level, day: inferred.day, totalDays };
    }
  }

  if (typeof dm.listLevels === "function" && typeof dm.getDay === "function") {
    const levels = dm.listLevels(subcategory) || [];
    for (const level of levels) {
      const day = dm.getDay(subcategory, level, lessonNo);
      if (day != null) {
        const totalDays =
          typeof dm.getTotalDays === "function" ? dm.getTotalDays(subcategory, level) : null;
        return { level, day, totalDays };
      }
    }
  }

  return { level: "-", day: "-", totalDays: null };
}

function resetDialogueBoxToDefault(dialogueBox) {
  dialogueBox.classList.remove("expanded-list");
  dialogueBox.style.top = "309px";
  dialogueBox.style.bottom = "20px";
  dialogueBox.style.left = "17px";
  dialogueBox.style.width = "313px";
  dialogueBox.style.minHeight = "0";
  dialogueBox.style.maxHeight = "none";
  dialogueBox.style.overflowY = "hidden";
}

function buildRecommendationItem(rec) {
  const dayValue = rec.day !== "-" && rec.day != null ? rec.day : "-";
  const totalDaysValue = rec.totalDays != null ? rec.totalDays : "-";
  return `
    <div class="recommend-item">
      <div class="recommend-item-subject">${rec.label}</div>
      <div class="recommend-item-right">
        <div class="recommend-item-line">
          <span class="recommend-item-key">난이도</span>
          <span class="recommend-item-level">${rec.level}</span>
        </div>
        <div class="recommend-item-line">
          <span class="recommend-item-key">현재</span>
          <span class="recommend-item-day">Day ${dayValue} / ${totalDaysValue}</span>
        </div>
      </div>
    </div>
  `;
}

function buildFocusSuggestion(subjectSnapshots) {
  const valid = subjectSnapshots.filter(
    s => Number.isFinite(s.percent) && Number.isFinite(s.completedCount)
  );
  if (valid.length < 2) return "";

  const sortedByProgress = [...valid].sort((a, b) => b.percent - a.percent);
  const top = sortedByProgress[0];
  const second = sortedByProgress[1];
  const spread = top.percent - second.percent;

  const totalCompleted = valid.reduce((sum, s) => sum + s.completedCount, 0);
  const othersCompleted = totalCompleted - top.completedCount;
  const dominantByCount =
    top.completedCount >= 8 && top.completedCount >= Math.max(1, othersCompleted * 1.8);
  const dominantByPercent = top.percent >= 20 && spread >= 20;
  if (!dominantByCount && !dominantByPercent) return "";

  const candidates = valid
    .filter(s => s.subject !== top.subject && s.nextLesson != null)
    .sort((a, b) => a.percent - b.percent);
  const target = candidates[0];
  if (!target) return "";

  return `💡 지금은 <b>${top.label}</b> 위주로만 하고 계시네요. <b>${target.label}</b>를 도전해보시는 건 어때요?`;
}

window.recommendMain = async function () {
  const display = document.getElementById("displayArea");
  const dialogueBox = document.getElementById("dialogueBox");
  resetDialogueBoxToDefault(dialogueBox);

  display.innerHTML = "🤖 추천 경로를 계산 중입니다...";

  try {
    getDayManager();
    const progress = await loadStudentProgress();
    const recommended = [];
    const snapshots = [];

    for (const subject of Object.keys(SUBJECT_CONFIG)) {
      const curriculum = buildCurriculumMeta(subject);
      if (!curriculum) continue;

      const completedLessons = collectCompletedLessons(progress[subject] || {});
      const completedCount = countCompletedWithinCurriculum(curriculum, completedLessons);
      const percent = curriculum.totalLessons
        ? (completedCount / curriculum.totalLessons) * 100
        : 0;
      const nextLesson = findNextLesson(curriculum, completedLessons);

      snapshots.push({
        subject,
        label: subjectLabel(subject),
        percent,
        completedCount,
        nextLesson
      });

      if (nextLesson == null) continue;

      const meta = resolveLevelDay(curriculum.subcategory, nextLesson);
      recommended.push({
        subject,
        label: subjectLabel(subject),
        level: meta.level,
        day: meta.day,
        totalDays: meta.totalDays
      });
    }

    if (recommended.length === 0) {
      dialogueBox.innerHTML = `
        <div>✅ 이미 모든 과목의 커리큘럼을 완료했어요!</div>
        <button id="backBtn">← 돌아가기</button>
      `;
      display.innerHTML = "";
      document.getElementById("backBtn").onclick = () => location.reload();
      return;
    }

    const itemsHtml = recommended.map(buildRecommendationItem).join("");

    const focusSuggestion = buildFocusSuggestion(snapshots);
    const focusHtml = focusSuggestion
      ? `<div class="recommend-tip">${focusSuggestion}</div>`
      : "";

    const resultHTML = `
      <div class="recommend-wrap">
        <div class="recommend-title">당신의 최신 진도는 :</div>
        <div class="recommend-list">${itemsHtml}</div>
        ${focusHtml}
      </div>
      <button id="backBtn">← 돌아가기</button>
    `;

    dialogueBox.innerHTML = resultHTML;
    display.innerHTML = "✅ 최신 진도 기반 추천을 준비했어요.";
    document.getElementById("backBtn").onclick = () => location.reload();
  } catch (err) {
    console.error("❌ 추천 분석 실패:", err);
    display.innerHTML = "🚨 추천 분석 중 오류가 발생했습니다.";
  }
};
