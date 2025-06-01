function subjectLabel(key) {
  return { vocab: "단어", grammar: "문법", pattern: "구문", reading: "독해" }[key] || key;
}

const CEFR_LEVELS = {
  vocab: { A1: [1,10], A2: [11,20], B1: [21,30], B2: [31,40], C1: [41,50] },
  grammar: { A1: [1,10], A2: [11,20], B1: [21,30] },
  pattern: { A1: [1,10], A2: [11,20], B1: [21,30], B2: [31,40], C1: [41,50] },
  reading: { A1: [1,10], A2: [11,20], B1: [21,30], B2: [31,40] }
};

async function loadStudentProgress() {
  const res = await fetch('student-progress.xlsx');
  const arrayBuffer = await res.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const [_, ...subjects] = rows[0];
  const lessons = {};
  for (const subj of subjects) lessons[subj.toLowerCase()] = {};

  for (let i = 1; i < rows.length; i++) {
    const [lessonRaw, ...statuses] = rows[i];
    if (!lessonRaw || typeof lessonRaw !== 'string') continue;
    const lessonNumber = lessonRaw.replace('lesson', '');
    statuses.forEach((status, idx) => {
      const subj = subjects[idx];
      if (!subj) return;
      const key = subj.toLowerCase();
      if (status) lessons[key][lessonNumber] = status;
    });
  }

  return lessons;
}

function getProgressRate(subjectData) {
  if (!subjectData) return 0;
  const entries = Object.entries(subjectData).filter(([_, v]) => !v.startsWith("endby"));
  const total = entries.length;
  const passed = entries.filter(([_, v]) => v === "done").length;
  return Math.round((passed / total) * 100);
}

function estimateLevel(subjectData, levels) {
  if (!subjectData || !levels) return "-";
  for (const [level, [start, end]] of Object.entries(levels)) {
    let passCount = 0;
    let total = 0;
    for (let i = start; i <= end; i++) {
      const status = subjectData[i.toString()];
      if (status && !status.startsWith("endby")) {
        total++;
        if (status === "done") passCount++;
      }
    }
    if (total > 0 && passCount / total >= 0.8) return level;
  }
  return "초입";
}

function findNextLesson(subjectData) {
  if (!subjectData) return null;
  const entries = Object.entries(subjectData)
    .filter(([k, v]) => !v.startsWith("endby"))
    .map(([k, v]) => ({ num: parseInt(k), status: v }))
    .sort((a, b) => a.num - b.num);
  const next = entries.find(e => e.status === "notyet");
  return next ? next.num : null;
}

function analyzeStudentProgress(progressData) {
  const result = {};
  for (const subject of Object.keys(progressData)) {
    const subjectData = progressData[subject];
    const levelMap = CEFR_LEVELS[subject];
    result[subject] = {
      rate: getProgressRate(subjectData),
      level: estimateLevel(subjectData, levelMap),
      next: findNextLesson(subjectData)
    };
  }
  return result;
}

// ✅ 진도 분석
async function summaryMain() {
  const userId = new URLSearchParams(location.search).get("id");
  const progress = await loadStudentProgress();
  const analysis = analyzeStudentProgress(progress);

  // ✅ 성실도 API 호출
  let diligenceText = '';
  try {
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getDiligenceStats?userId=${userId}`);
    const d = await res.json();

    const latestDay = d.recent7Days?.reverse().find(e => e.count > 0)?.date || null;

    diligenceText = `
      <br><br>
      🕒 <b>성실도 분석</b><br>
      총 <b>${d.totalSubmissions}</b>건 제출, 지각 <b>${d.lateCount}</b>회 (${d.lateRate}% 지각률)<br>
      평균 지각시간: <b>${d.averageLateMinutes}분</b><br>
      가장 자주 제출한 과목: <b>${d.mostFrequentSubject}</b><br>
      최근 7일 중 <b>${d.recent7Days.filter(e => e.count > 0).length}</b>일 제출<br>
      가장 최근 제출일: <b>${latestDay || '없음'}</b>
    `;
  } catch (err) {
    diligenceText = "<br><br>🚨 성실도 분석 불러오기 실패";
    console.error("getDiligenceStats 에러:", err);
  }

  // ✅ 진도 디스플레이
  const display = document.getElementById('displayArea');
  display.innerHTML = `
    <div class="summary-grid">
      ${Object.entries(analysis).map(([subject, data]) => `
        <div class="stat-box">
          <div class="label">${subjectLabel(subject)}</div>
          <div class="bar"><div class="fill" style="width: ${data.rate}%;"></div></div>
        </div>
      `).join('')}
    </div>
  `;

  // ✅ 대화 박스
  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = `
    <div>📋 <b>저 지금 잘하고있나요?</b></div>
    <div style="font-size: 13px;">
      ${Object.entries(analysis).map(([subject, data]) => `
        <b>${subjectLabel(subject)}</b>: ${data.level} 수준, 진도율 ${data.rate}%<br>
        ${data.next ? `다음 숙제는 Lesson ${data.next}번이에요.` : '숙제를 전부 완료하셨어요!'}<br><br>
      `).join('')}
      ${diligenceText}
    </div>
    <button id="backBtn">← 돌아가기</button>
  `;
  document.getElementById('backBtn').onclick = () => location.reload();
}


// ✅ 숙제 추천
async function recommendMain() {
  const progress = await loadStudentProgress();
  const analysis = analyzeStudentProgress(progress);

  const display = document.getElementById('displayArea');
  display.innerHTML = `
    <div class="summary-grid">
      ${['vocab', 'grammar', 'reading'].map(subject => {
        const data = analysis[subject];
        return `
          <div class="stat-box">
            <div class="label">${subjectLabel(subject)}</div>
            <div class="bar"><div class="fill" style="width: ${data?.rate || 0}%;"></div></div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  const dialogueBox = document.getElementById('dialogueBox');
  dialogueBox.innerHTML = `
    <div>📋 <b>저 뭐하면 좋죠</b></div>
    <div style="font-size: 13px;">
      최근 <b>단어</b>는 ${analysis.vocab?.level} 수준, Lesson ${analysis.vocab?.next}번쯤이 적당해요.<br>
      <b>문법</b>은 ${analysis.grammar?.level}까지 끝냈어요. 다음은 Lesson ${analysis.grammar?.next}번 추천!<br>
      <b>독해</b>는 ${analysis.reading?.rate}% 진행됐어요. 필요한 경우 <b>파편의 재구성</b>부터 시작해보세요.
    </div>
    <button id="backBtn">← 돌아가기</button>
  `;

  document.getElementById('backBtn').onclick = () => location.reload();
}
