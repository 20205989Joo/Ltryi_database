window.addEventListener('DOMContentLoaded', async () => {
  const res = await fetch(`${BASE}/api/whosmychild?userId=${userId}`);
  const data = await res.json();
  childId = data.childId;
});



// ✅ 분석 로직
window.summaryMain = async function () {
  const progress = await loadStudentProgress();
  const analysis = analyzeStudentProgress(progress);

  let diligenceText = '';
  try {
    const res = await fetch(`${BASE}/api/getDiligenceStats?userId=${childId}`);
    const stats = await res.json();
    const recent7 = stats.recent7Days;
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

  const dialogueBox = document.querySelector('.npc-dialogue-box');
  dialogueBox.style.bottom = '63px';
  dialogueBox.innerHTML = `
    <div style="font-size: 13px; font-weight: bold; margin-bottom: 4px;">📊 자녀분의 현재 단계는 ... </div>
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


document.getElementById("choiceStatus")?.addEventListener("click", summaryMain);

function subjectLabel(key) {
  return { vocab: '단어', grammar: '문법', rc: '독해' }[key] || key;
}

function analyzeStudentProgress(progressData) {
  const TOTALS = { vocab: 250, grammar: 1500, pattern: 50 };

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

  return Object.fromEntries(
    Object.entries(progressData).map(([subject, data]) => {
      const total = TOTALS[subject];
      const completed = new Set();

      for (const [k, v] of Object.entries(data || {})) {
        const lessons = parseRangeString(k);
        const done = subject === 'vocab' ? v === 'done' : (v === 'done' || /^\d+%$/.test(v));
        if (done) lessons.forEach(i => completed.add(i));
      }

      const percent = +(completed.size / total * 100).toFixed(1);
      let level = 'A1';
      if (percent >= 80) level = 'C1';
      else if (percent >= 60) level = 'B2';
      else if (percent >= 40) level = 'B1';
      else if (percent >= 20) level = 'A2';

      return [subject, { percent, level }];
    })
  );
}


async function loadStudentProgress() {
  const res = await fetch(`${BASE}/api/getProgressMatrixAll?UserId=${childId}`);
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
}


function calculateDiligenceFromRecent7(arr) {
  let longestStreak = 0;
  let current = 0;
  let lateCount = 0;
  let totalThisWeek = 0;
  let lateMinutes = 0;

  arr.forEach(day => {
    if (day.count > 0) {
      current++;
      totalThisWeek += day.count;
      if (day.late) {
        lateCount += day.late;
        lateMinutes += day.late * 20;
      }
    } else {
      longestStreak = Math.max(longestStreak, current);
      current = 0;
    }
  });
  longestStreak = Math.max(longestStreak, current);

  return {
    totalThisWeek,
    longestStreak,
    lateCount,
    avgLate: lateCount ? Math.round(lateMinutes / lateCount) : 0
  };
}

