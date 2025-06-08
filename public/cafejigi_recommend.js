// 📦 추천 기능 전용 JS - 바닐라 방식, 전역 함수 사용

// 전체 레슨 수 정의 (분석용에서 따로 공유되지 않으므로 독립 정의)
const TOTALS = { vocab: 250, grammar: 1500, pattern: 50 };

// ✅ 범위 문자열 파싱 (예: '1', '2~4,7' → [1,2,3,4,7])
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

// ✅ 과목 라벨 한글 변환
function subjectLabel(key) {
  return { vocab: "단어", grammar: "문법", pattern: "구문" }[key] || key;
}

// ✅ 학생 진도 데이터 로드
async function loadStudentProgress() {
  const userId = new URLSearchParams(location.search).get("id") || "Tester";
  const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getProgressMatrixAll?UserId=${userId}`);
  const raw = await res.json();

  const lessons = {};
  for (const subject in raw) {
    if (subject === 'rc' || subject === 'reading') continue; // rc 제거
    lessons[subject] = {};
    for (const { LessonNo, Status } of raw[subject]) {
      lessons[subject][LessonNo.toString()] = Status;
    }
  }
  return lessons;
}

// ✅ 완료한 마지막 레슨 + 1 계산
function findNextLesson(subject, subjectData) {
  const total = TOTALS[subject];
  if (!total || !subjectData) return null;

  let lastDone = 0;
  for (const [k, v] of Object.entries(subjectData)) {
    const nums = parseRangeString(k);
    const isDone = v === 'done' || /^\d+%$/.test(v);
    if (isDone) {
      nums.forEach(n => {
        if (n > lastDone) lastDone = n;
      });
    }
  }

  const next = lastDone + 1;
  return next <= total ? next : null;
}

// ✅ 추천 진도 출력
window.recommendMain = async function () {
  const userId = new URLSearchParams(location.search).get("id") || "Tester";
  const display = document.getElementById('displayArea');
  const dialogueBox = document.getElementById('dialogueBox');

  display.innerHTML = "🤖 학습 데이터를 분석 중입니다...";

  try {
    const progress = await loadStudentProgress();
    console.log('[DEBUG] progress:', progress); // 디버깅용 로그

    const recommended = [];

    for (const subject of ['vocab', 'grammar', 'pattern']) {
      const subjectData = progress[subject];
      const next = findNextLesson(subject, subjectData);
      if (next != null) {
        recommended.push({
          subject,
          label: subjectLabel(subject),
          lesson: next
        });
      }
    }

    if (recommended.length === 0) {
      dialogueBox.innerHTML = `
        <div>✅ 이미 모든 과목의 숙제를 완료하셨어요!</div>
        <button id="backBtn">← 돌아가기</button>
      `;
      display.innerHTML = '';
      document.getElementById('backBtn').onclick = () => location.reload();
      return;
    }

    let resultHTML = `
      <div>📋 <b>저 뭐하면 좋죠?</b></div>
      <div style="font-size: 13px;">
        최근 진도가 어디였는 지, 확인해드릴게요!<br>
        <b>통계가 쌓이면</b>더욱 세밀한 분석이 가능합니다!<br><br>
    `;

    recommended.forEach(r => {
      resultHTML += `👉 <b>${r.label}</b> 과목의 Lesson <b>${r.lesson}</b>을 해보세요!<br>`;
    });

    resultHTML += `</div><button id="backBtn">← 돌아가기</button>`;
    dialogueBox.innerHTML = resultHTML;
    display.innerHTML = '';
    document.getElementById('backBtn').onclick = () => location.reload();

  } catch (err) {
    console.error('❌ 추천 분석 실패:', err);
    display.innerHTML = "🚨 추천 분석 중 오류가 발생했습니다.";
  }
};
