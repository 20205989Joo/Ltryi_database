// dish-quiz.js

let subcategory = '';
let level = '';
let day = '';

let currentIndex = 0;
let currentTimer = null;
let questions = [];
let results = [];
let quizData = [];
let selectedDay = '';
let quizTitle = '';

// 🔧 이 문제에서 이미 답을 처리했는지 여부
let isAnswered = false;

function readQuizResultsMap() {
  try {
    const raw = localStorage.getItem('QuizResultsMap');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function storeQuizResultWithMap(resultObject) {
  localStorage.setItem('QuizResults', JSON.stringify(resultObject));

  const quizKey = String(resultObject?.quiztitle || resultObject?.quizTitle || '').trim();
  if (!quizKey) return;

  const map = readQuizResultsMap();
  map[quizKey] = resultObject;
  localStorage.setItem('QuizResultsMap', JSON.stringify(map));
}

window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('key');
  const id = params.get('id'); // 필요하면 나중에 사용

  if (!key) return alert('시험 key 정보가 없습니다.');

  quizTitle = key;
  const parts = key.split('_');
  if (parts.length < 4) return alert('시험 key 형식이 잘못되었습니다.');

  subcategory = parts[1];
  level = parts[2];
  day = parts[3];
  console.log('✅ 파싱된 값:', { subcategory, level, day });

  try {
    const res = await fetch(`${level}.xlsx`);
    const data = await res.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    quizData = XLSX.utils.sheet_to_json(sheet);
  } catch (e) {
    console.error(e);
    alert('문제 파일을 불러오는 중 오류가 발생했습니다.');
    return;
  }

  renderInstruction();
  document.getElementById('back-btn')?.addEventListener('click', () => history.back());
});

function renderInstruction() {
  const quizArea = document.getElementById('quiz-area');
  quizArea.innerHTML = `
    <div style="
      background: #fff3e0;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      font-size: 14px;
    ">
      <div style="font-size:18px; font-weight:bold; color: #7e3106; margin-bottom: 12px;">📘 시험 안내</div>
      <ul style="margin-bottom: 16px; padding-left: 20px; line-height: 1.6;">
        <li>총 20문제가 출제됩니다.</li>
        <li>각 문제당 <b>3초</b>의 시간이 주어집니다.</li>
        <li>정답을 고르지 못하면 <b>자동 오답 처리</b>됩니다.</li>
      </ul>
      <div style="font-weight: bold; margin-bottom: 10px; color: #444;">
        과목: ${subcategory} / 난이도: ${level} / Day: ${day}
      </div>
      <button class="quiz-btn" style="width: 100%;" onclick="startQuiz()">🚀 시험 시작</button>
    </div>
  `;
}

function startQuiz() {
  const dayNormalized = day.replace(/[^0-9]/g, '');
  let dayData = quizData.filter(q => {
    const qDay = String(q['Day']).replace(/[^0-9]/g, '');
    return qDay === dayNormalized;
  });

  // ✅ 문제 순서를 랜덤하게 섞기
  dayData.sort(() => 0.5 - Math.random());

  if (dayData.length === 0) return alert('해당 Day의 문제가 없습니다.');

  questions = dayData.map(entry => {
    const wrongs = quizData
      .filter(q => q['Korean Meaning'] !== entry['Korean Meaning'])
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)
      .map(q => q['Korean Meaning']);

    const options = [...wrongs, entry['Korean Meaning']].sort(() => 0.5 - Math.random());

    return {
      word: entry['Word'],
      answer: entry['Korean Meaning'],
      options
    };
  });

  currentIndex = 0;
  results = [];
  renderQuestion();
}

function renderQuestion() {
  // 🔧 이전 문제 타이머가 남아 있으면 정리
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }

  if (currentIndex >= questions.length) {
    return showResultPopup();
  }

  // 새 문제 시작 → 아직 답 안 함
  isAnswered = false;

  const quizArea = document.getElementById('quiz-area');
  const q = questions[currentIndex];

  quizArea.innerHTML = `
    <div style="font-weight:bold; font-size:18px; margin-bottom:10px;">
      ${currentIndex + 1}. ${q.word}
    </div>
    <div id="timer-bar" style="
      height: 8px;
      background: green;
      width: 100%;
    "></div>
    <div style="margin-top:12px; display:flex; flex-direction:column; gap:6px;">
      ${q.options
        .map(
          (opt, i) =>
            `<button class="quiz-btn" onclick="checkAnswer('${opt.replace(/'/g, "\\'")}')">${opt}</button>`
        )
        .join('')}
    </div>
    <div id="feedback" style="margin-top:12px; font-weight:bold;"></div>
  `;

  const bar = document.getElementById('timer-bar');
  if (bar) {
    // 처음엔 꽉 찬 상태
    bar.style.transition = 'none';
    bar.style.width = '100%';

    // 리플로우 강제
    void bar.offsetWidth;

    // 3초 동안 100% → 0%로 줄어드는 애니메이션
    bar.style.transition = 'width 3s linear';
    bar.style.width = '0%';
  }

  currentTimer = setTimeout(() => {
    checkAnswer(null); // 시간 초과
  }, 3000);
}

function checkAnswer(selected) {
  // 🔧 이미 이 문제 처리했으면 무시
  if (isAnswered) return;
  isAnswered = true;

  // 🔧 타이머 중단
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }

  // 🔧 타이머 바 현재 위치에서 얼리기
  const bar = document.getElementById('timer-bar');
  if (bar) {
    const currentWidth = getComputedStyle(bar).width; // px 단위
    bar.style.transition = 'none';
    bar.style.width = currentWidth; // 그대로 고정
    bar.style.opacity = '0.85'; // 살짝 톤 다운(선택 완료 느낌)
  }

  const q = questions[currentIndex];
  if (!q) {
    // 방어 코드
    return;
  }

  const correct = q.answer === selected;

  results.push({
    no: currentIndex + 1,
    word: q.word,
    selected: selected || '시간 초과',
    correct
  });

  const feedback = document.getElementById('feedback');
  if (feedback) {
    feedback.textContent = correct ? '정답입니다 ✅' : '오답입니다 ❌';
  }

  // 🔧 버튼 중복 클릭 방지
  const buttons = document.querySelectorAll('#quiz-area .quiz-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
  });

  setTimeout(() => {
    currentIndex++;
    renderQuestion();
  }, 800);
}

function showResultPopup() {
  // 혹시 남아 있는 타이머 정리
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }
  isAnswered = true;

  // ✅ 점수 계산
  const totalQuestions = results.length;
  const correctCount = results.filter(r => r.correct).length;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const canSubmit = score >= 80;

  const resultObject = {
    quiztitle: quizTitle,
    subcategory,
    level,
    day,
    teststatus: 'done',
    testspecific: results
  };

  storeQuizResultWithMap(resultObject);

  const popup = document.getElementById('result-popup');

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
            r => `
          <tr>
            <td style="padding:6px; border-bottom: 1px solid #eee;">${r.no}</td>
            <td style="padding:6px; border-bottom: 1px solid #eee;">${r.word}</td>
            <td style="padding:6px; border-bottom: 1px solid #eee;">${r.selected}</td>
            <td style="padding:6px; border-bottom: 1px solid #eee;">${r.correct ? '⭕' : '❌'}</td>
          </tr>
        `
          )
          .join('')}
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
          ${canSubmit ? '' : 'disabled'}
          onclick="returnToTray()"
        >
          🍽 제출하러 가기
        </button>
      </div>
    </div>
  `;

  popup.style.display = 'flex';

  // 🔧 점수 미달 시 버튼 비주얼 비활성화 처리
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn && !canSubmit) {
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
  }
}

function restartQuiz() {
  window.location.reload();
}

function returnToTray() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id') || '';

  // ✅ quizKey(=quizTitle)를 같이 들고 트레이로 복귀
  const url = `homework-tray_v1.html?id=${encodeURIComponent(userId)}&quizKey=${encodeURIComponent(quizTitle)}`;

  // ✅ 뒤로 가기로 다시 퀴즈로 못 돌아오게 history 교체
  window.location.replace(url);
}
