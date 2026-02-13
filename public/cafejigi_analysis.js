const TOTALS = { vocab: 250, grammar: 1500, pattern: 50 };

function subjectLabel(key) {
  return { vocab: "단어", grammar: "문법", pattern: "구문" }[key] || key;
}

function parseRangeString(rangeStr) {
  const ranges = rangeStr.split(',');
  const numbers = new Set();
  for (const part of ranges) {
    if (/^\d+$/.test(part)) numbers.add(parseInt(part));
    else if (/^\d+~\d+$/.test(part)) {
      const [start, end] = part.split('~').map(Number);
      for (let i = start; i <= end; i++) numbers.add(i);
    }
  }
  return [...numbers];
}

function calculateCompletionRatio(subject, data) {
  const total = TOTALS[subject];
  const completed = new Set();

  for (const [k, v] of Object.entries(data || {})) {
    const lessons = parseRangeString(k);
    const done = subject === 'vocab' ? v === 'done' : (v === 'done' || /^\d+%$/.test(v));
    if (done) lessons.forEach(i => completed.add(i));
  }

  return +(completed.size / total * 100).toFixed(1);
}

function estimateLevel(subject, data) {
  if (!data) return 'A1';

  if (subject === 'vocab') {
    const doneNums = Object.entries(data).flatMap(([k, v]) =>
      v === 'done' ? parseRangeString(k) : []
    );
    const max = Math.max(0, ...doneNums);
    if (max <= 50) return 'A1';
    if (max <= 100) return 'A2';
    if (max <= 150) return 'B1';
    if (max <= 200) return 'B2';
    return 'C1';
  }

  let scoreSum = 0, count = 0;
  for (const v of Object.values(data)) {
    if (v === 'done') scoreSum += 1;
    else if (/^\d+%$/.test(v)) scoreSum += parseInt(v) / 100;
    count++;
  }
  const avg = count ? scoreSum / count : 0;

  if (avg < 0.2) return 'A1';
  if (avg < 0.4) return 'A2';
  if (avg < 0.6) return 'B1';
  if (avg < 0.8) return 'B2';
  return 'C1';
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
  for (const subject of ['vocab', 'grammar', 'pattern']) {
    const data = progressData[subject];
    const percent = calculateCompletionRatio(subject, data);
    const level = estimateLevel(subject, data);
    result[subject] = { percent, level };
  }
  return result;
};

window.summaryMain = async function () {
  const userId = new URLSearchParams(location.search).get("id") || "Tester";
  const progress = await loadStudentProgress();
  const analysis = analyzeStudentProgress(progress);

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

  const display = document.getElementById('displayArea');
  display.innerHTML = `
    <div class="summary-grid">
      ${Object.entries(analysis).map(([s, d]) => `
        <div class="stat-box">
          <div class="label">${subjectLabel(s)}</div>
          <div class="bar">
            <div class="fill" style="width: ${d.percent}%"></div>
            <div class="bar-label">${d.percent}%</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const dialogueBox = document.getElementById('dialogueBox');

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
      📊 당신의 현재 단계는 .
    </div>
    <div style="display:flex; gap: 6px; justify-content: space-between; margin-bottom: 8px;">
      ${Object.entries(analysis).map(([s, d]) => {
        const subject = subjectLabel(s);
        const level = d.level;
        const percent = d.percent;
        const topPercent = Math.max(0, 100 - Math.floor(percent));
        return `
          <div class="level-badge">
            <div class="subject-title">📘 ${subject}</div>
            <div><span class="badge">${level}</span></div>
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