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

window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('key');
  const id = params.get('id');

  if (!key) return alert('시험 key 정보가 없습니다.');

  quizTitle = key;
  const parts = key.split('_');
  if (parts.length < 4) return alert('시험 key 형식이 잘못되었습니다.');

  subcategory = parts[1];
  level = parts[2];
  day = parts[3];
  console.log('✅ 파싱된 값:', { subcategory, level, day });

  const res = await fetch(`${level}.xlsx`);
  const data = await res.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  quizData = XLSX.utils.sheet_to_json(sheet);

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
    const wrongs = quizData.filter(q => q['Korean Meaning'] !== entry['Korean Meaning'])
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
  if (currentIndex >= questions.length) return showResultPopup();

  const quizArea = document.getElementById('quiz-area');
  const q = questions[currentIndex];

  quizArea.innerHTML = `
    <div style="font-weight:bold; font-size:18px; margin-bottom:10px;">${currentIndex + 1}. ${q.word}</div>
    <div id="timer-bar" style="height: 8px; background: green; transition: width 3s linear; width: 100%;"></div>
    <div style="margin-top:12px; display:flex; flex-direction:column; gap:6px;">
      ${q.options.map((opt, i) => `<button class=\"quiz-btn\" onclick=\"checkAnswer('${opt.replace(/'/g, "\\'")}')\">${opt}</button>`).join('')}
    </div>
    <div id="feedback" style="margin-top:12px; font-weight:bold;"></div>
  `;

  const bar = document.getElementById('timer-bar');
  bar.offsetHeight;
  bar.style.width = '0%';

  currentTimer = setTimeout(() => {
    checkAnswer(null); // 시간 초과
  }, 3000);
}

function checkAnswer(selected) {
  clearTimeout(currentTimer);
  const q = questions[currentIndex];
  const correct = q.answer === selected;

  results.push({
    no: currentIndex + 1,
    word: q.word,
    selected: selected || '시간 초과',
    correct
  });

  const feedback = document.getElementById('feedback');
  if (feedback) feedback.textContent = correct ? '정답입니다 ✅' : '오답입니다 ❌';

  setTimeout(() => {
    currentIndex++;
    renderQuestion();
  }, 800);
}

function showResultPopup() {
  const resultObject = {
    quiztitle: quizTitle,
    subcategory,
    level,
    day,
    teststatus: 'done',
    testspecific: results
  };

  localStorage.setItem('QuizResults', JSON.stringify(resultObject));

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
        ${results.map(r => `
          <tr>
            <td style='padding:6px; border-bottom: 1px solid #eee;'>${r.no}</td>
            <td style='padding:6px; border-bottom: 1px solid #eee;'>${r.word}</td>
            <td style='padding:6px; border-bottom: 1px solid #eee;'>${r.selected}</td>
            <td style='padding:6px; border-bottom: 1px solid #eee;'>${r.correct ? '⭕' : '❌'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  popup.innerHTML = `
    <div class="popup-content" id="result-content">
      <div style="font-weight: bold; font-size:16px; margin-bottom: 12px;">📄 전체 시험지 결과</div>
      <div id="result-detail" style="max-height: 300px; overflow-y: auto;">${table}</div>
      <div style="display:flex; justify-content: space-between; gap: 10px; margin-top:20px;">
        <button class="quiz-btn" onclick="restartQuiz()">🔁 재시험</button>
        <button class="quiz-btn" onclick="returnToTray()">🍽 테이블로 돌아가기</button>
      </div>
    </div>
  `;

  popup.style.display = 'flex';
}

function restartQuiz() {
  window.location.reload();
}


function returnToTray() {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');
  window.location.href = `homework-tray.html?id=${userId}`;
}
