const SUBJECT_CONFIG = {
  vocab: { label: "단어", subcategory: "단어" },
  grammar: { label: "문법", subcategory: "문법" },
  pattern: { label: "구문", subcategory: "단계별 독해" }
};

const TEMP_CEFR_TOP_PERCENT = {
  A1: 95,
  A2: 80,
  B1: 60,
  B2: 35,
  C1: 15,
  C2: 5
};

function subjectLabel(key) {
  return SUBJECT_CONFIG[key]?.label || key;
}

function getDayManager() {
  const dm = window.DayManager;
  if (!dm || typeof dm.getSubcategoryDefinition !== "function") {
    throw new Error("DayManager가 로드되지 않았습니다. day_manager.js를 먼저 로드해주세요.");
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

function isCompletedStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "done" || normalized === "complete" || normalized === "completed") {
    return true;
  }
  if (/^\d+%$/.test(normalized)) {
    return parseInt(normalized, 10) >= 100;
  }
  return false;
}

function buildCurriculumMeta(subject) {
  const dm = getDayManager();
  const subcategory = SUBJECT_CONFIG[subject]?.subcategory;
  if (!subcategory) return null;

  const def = dm.getSubcategoryDefinition(subcategory);
  if (!def || !def.levels) return null;

  const lessonSet = new Set();
  const levelRanges = [];

  for (const [level, rawRange] of Object.entries(def.levels)) {
    if (!Array.isArray(rawRange) || rawRange.length < 2) continue;
    const start = Number(rawRange[0]);
    const end = Number(rawRange[1]);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end < start) {
      continue;
    }
    levelRanges.push({ level, start, end });
    for (let lesson = start; lesson <= end; lesson++) {
      lessonSet.add(lesson);
    }
  }

  const sortedLessons = [...lessonSet].sort((a, b) => a - b);
  levelRanges.sort((a, b) => a.start - b.start || a.end - b.end);

  return {
    subcategory,
    lessonSet,
    sortedLessons,
    levelRanges,
    totalLessons: sortedLessons.length
  };
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

function countCompletedWithinCurriculum(curriculumMeta, completedLessons) {
  let count = 0;
  for (const lesson of curriculumMeta.sortedLessons) {
    if (completedLessons.has(lesson)) count += 1;
  }
  return count;
}

function getFrontierLesson(curriculumMeta, completedLessons) {
  let frontier = 0;
  for (const lesson of curriculumMeta.sortedLessons) {
    if (!completedLessons.has(lesson)) break;
    frontier = lesson;
  }
  return frontier;
}

function getTrackLevelFromLesson(levelRanges, lessonNo) {
  if (!levelRanges.length) return null;
  if (!lessonNo) return levelRanges[0].level;

  for (const range of levelRanges) {
    if (lessonNo >= range.start && lessonNo <= range.end) return range.level;
  }
  return lessonNo > levelRanges[levelRanges.length - 1].end
    ? levelRanges[levelRanges.length - 1].level
    : levelRanges[0].level;
}

function estimateTemporaryCEFR(completionPercent) {
  if (completionPercent < 20) return "A1";
  if (completionPercent < 40) return "A2";
  if (completionPercent < 60) return "B1";
  if (completionPercent < 80) return "B2";
  return "C1";
}

function toCEFRLevel(trackLevel, completionPercent) {
  const normalized = String(trackLevel || "").toUpperCase();
  if (["A1", "A2", "B1", "B2", "C1", "C2"].includes(normalized)) {
    return normalized;
  }
  return estimateTemporaryCEFR(completionPercent);
}

function getTempTopPercent(cefrLevel) {
  return TEMP_CEFR_TOP_PERCENT[cefrLevel] ?? 70;
}

function calculateDiligenceFromRecent7(recent7) {
  const totalThisWeek = recent7.reduce((acc, day) => acc + (day.count || 0), 0);
  const totalLateCount = recent7.reduce((acc, day) => acc + (day.late || 0), 0);

  let maxStreak = 0, currentStreak = 0;
  for (const day of recent7) {
    if (day.count > 0) {
      currentStreak += 1;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  const estimatedLateMinutes = totalLateCount * 20;
  const avgLate = totalLateCount ? Math.round(estimatedLateMinutes / totalLateCount) : 0;

  return {
    totalThisWeek,
    longestStreak: maxStreak,
    lateCount: totalLateCount,
    avgLate
  };
}

window.loadStudentProgress = async function () {
  const userId = new URLSearchParams(location.search).get("id") || "Tester";
  const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getProgressMatrixAll?UserId=${userId}`);
  const raw = await res.json();

  const lessons = {};
  for (const subject in raw) {
    if (!['vocab', 'grammar', 'pattern'].includes(subject)) continue;
    lessons[subject] = {};
    for (const { LessonNo, Status } of raw[subject]) {
      lessons[subject][LessonNo.toString()] = Status;
    }
  }
  return lessons;
};

window.analyzeStudentProgress = function (progressData) {
  const result = {};
  for (const subject of Object.keys(SUBJECT_CONFIG)) {
    const curriculum = buildCurriculumMeta(subject);
    if (!curriculum || curriculum.totalLessons === 0) {
      result[subject] = {
        percent: 0,
        completedCount: 0,
        totalLessons: 0,
        trackLevel: null,
        cefrLevel: "A1",
        topPercent: getTempTopPercent("A1")
      };
      continue;
    }

    const data = progressData[subject];
    const completedLessons = collectCompletedLessons(data);
    const completedCount = countCompletedWithinCurriculum(curriculum, completedLessons);
    const percent = +(completedCount / curriculum.totalLessons * 100).toFixed(1);
    const frontierLesson = getFrontierLesson(curriculum, completedLessons);
    const trackLevel = getTrackLevelFromLesson(curriculum.levelRanges, frontierLesson);
    const cefrLevel = toCEFRLevel(trackLevel, percent);
    const topPercent = getTempTopPercent(cefrLevel);

    result[subject] = {
      percent,
      completedCount,
      totalLessons: curriculum.totalLessons,
      trackLevel,
      cefrLevel,
      topPercent
    };
  }
  return result;
};

window.summaryMain = async function () {
  const userId = new URLSearchParams(location.search).get("id") || "Tester";
  const display = document.getElementById('displayArea');
  const dialogueBox = document.getElementById('dialogueBox');

  let analysis;
  try {
    getDayManager();
    const progress = await loadStudentProgress();
    analysis = analyzeStudentProgress(progress);
  } catch (err) {
    display.innerHTML = `<div style="color:red;">🚨 분석 준비 실패: ${err.message}</div>`;
    dialogueBox.innerHTML = `
      <div style="font-size:13px;">DayManager 또는 진도 데이터를 불러오지 못했어요.</div>
      <button id="backBtn" style="margin-top: 10px;">← 돌아가기</button>
    `;
    document.getElementById('backBtn').onclick = () => location.reload();
    return;
  }

  let diligenceText = '';
  try {
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getDiligenceStats?userId=${userId}`);
    if (!res.ok) throw new Error("응답 실패");

    const stats = await res.json();
    const recent7 = stats.recent7Days;
    if (!Array.isArray(recent7)) throw new Error("recent7Days가 배열 아님");

    const { totalThisWeek, longestStreak, lateCount, avgLate } = calculateDiligenceFromRecent7(recent7);

    let icon = '🐢', label = '조금 느림';
    if (longestStreak >= 5) { icon = '😎'; label = '성실함 장인'; }
    else if (longestStreak >= 3) { icon = '🙂'; label = '성실보스'; }
    else if (longestStreak >= 1) { icon = '⛵'; label = '평균적 성실함'; }

    diligenceText = `
      <div class="diligence-box">
        <div class="icon">${icon}<br><span>${label}</span></div>
        <div class="details">
          • 총 숙제 제출: <b>${totalThisWeek}</b>건<br>
          • 최장 연속 제출: <b>${longestStreak}</b>일<br>
          • 이번주 지각: <b>${lateCount}</b>회 / 평균 <b>${avgLate}</b>분
        </div>
      </div>
    `;
  } catch (err) {
    diligenceText = `<div style="color:red;">🚨 성실도 분석 실패: ${err.message}</div>`;
  }

  display.innerHTML = `
    <div class="summary-grid">
      ${Object.entries(analysis).map(([s, d]) => `
        <div class="stat-box">
          <div class="label">${subjectLabel(s)} (${d.completedCount}/${d.totalLessons})</div>
          <div class="bar">
            <div class="fill" style="width: ${d.percent}%"></div>
            <div class="bar-label">${d.percent}%</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // ✅ 요약 모드일 때 대화창을 위아래로 확장해서 사용
  //   - 위쪽: bar_bottom 시작 위치(309px)과 맞춤
  //   - 아래쪽: 카페 바닥 근처까지 내려서 리스트/박스가 넉넉하게 보이도록
  dialogueBox.style.top = '309px';      // bar_bottom 시작 위치
  dialogueBox.style.bottom = '20px';    // cafe_int 바닥 근처까지
  dialogueBox.style.left = '17px';      // 원래와 동일
  dialogueBox.style.width = '313px';    // 원래와 동일
  dialogueBox.style.minHeight = '0';
  dialogueBox.style.maxHeight = 'none';
  dialogueBox.style.overflowY = 'auto';

  dialogueBox.innerHTML = `
    <div style="font-size: 13px; font-weight: bold; margin-bottom: 4px;">
      📊 현재 레벨 분석입니다.
    </div>
    <div style="display:flex; gap: 6px; justify-content: space-between; margin-bottom: 8px;">
      ${Object.entries(analysis).map(([s, d]) => {
        const subject = subjectLabel(s);
        const level = d.cefrLevel;
        const topPercent = d.topPercent;
        return `
          <div class="level-badge">
            <div class="subject-title">📘 ${subject}</div>
            <div><span class="badge level-${level}">${level}</span></div>
            <div class="rank">상위 ${topPercent}%</div>
          </div>
        `;
      }).join('')}
    </div>

    ${diligenceText}
    <button id="backBtn" style="margin-top: 10px;">← 돌아가기</button>
  `;

  document.getElementById('backBtn').onclick = () => location.reload();
};

window.loadedCafejigiAnalysis = true;
