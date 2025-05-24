window.addEventListener('DOMContentLoaded', async () => {
  const steps = await loadTutorialSteps('tutorial_steps_full_complete.xlsx');
  runTutorial(steps);
});

async function loadTutorialSteps(xlsxURL) {
  const res = await fetch(xlsxURL);
  const arrayBuffer = await res.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return raw.map((row, idx) => {
    const triggerRaw = row.trigger;
    const triggerFinal = triggerRaw?.trim() || null;

    console.log(`📋 STEP ${idx + 1} | trigger 원본: "${triggerRaw}" → 파싱: "${triggerFinal}"`);

    return {
      step: parseInt(row.step, 10),
      type: row.type,
      speaker: row.speaker || null,
      message: row.message,
      message_summary: row.message_summary || "",
      target: row.target || null,
      trigger: triggerFinal,
      tooltip_xy: row.tooltip_xy || null
    };
  });
}

let currentIndex = 0;
let currentSteps = [];
let restoredTargets = [];

// ✅ 단계 진행 상태에 따라 시작 위치 결정
function computeResumeStep() {
  const tray = localStorage.getItem('tutorial_tray') === 'done';
  const submit = localStorage.getItem('tutorial_submit') === 'done';
  const report = localStorage.getItem('tutorial_report') === 'done';
  const grades = localStorage.getItem('tutorial_grades') === 'done';

  const path = window.location.pathname;

  if (path.includes('homework-tray')) return 15;
  if (path.includes('homework-submit')) return 22;
  if (path.includes('report-analysis')) return 29;
  if (path.includes('grades-calendar')) return 34;
  if (path.includes('student-room')) {
    if (tray && submit && report && grades) return 40;
    if (tray && submit && report) return 33;
    if (tray && submit) return 27;
    if (tray) return 20;
    return 0;
  }

  return 0;
}


function runTutorial(steps) {
  currentSteps = steps;
  currentIndex = computeResumeStep(); // ✅ resume 시작점 적용
  showStep(currentSteps[currentIndex]);
}

function showStep(step) {
  clearTutorial();
  if (!step) return;

  const next = () => advanceStep(step.trigger);

  if (step.type === 'dialogue') {
    showDialogue(step.message, next);  // ✅ trigger 반영된 콜백
  } else if (step.type === 'highlight') {
    showHighlight(step, next);         // ✅ trigger 반영된 콜백
  } else {
    // 기타 step도 trigger 기반
    showDialogue(step.message, next);
  }
}


function advanceStep(trigger) {
  console.log("🔁 Trigger Received:", trigger);

  if (!trigger) return;

  if (trigger.startsWith('click:')) {
    const selector = trigger.split(':')[1];
    const target = document.querySelector(selector);

    if (target) {
      const listener = () => {
        target.removeEventListener('click', listener);

        // 🎯 특별한 케이스 처리
        if (selector === '.go-back-from-grades') {
          localStorage.setItem('tutorial_grades', 'done');
          window.location.href = 'student-room_tutorial.html';
          return;
        }

        showStep(currentSteps[++currentIndex]);
      };
      target.addEventListener('click', listener);
    } else {
      console.warn("⚠️ 대상 요소를 찾을 수 없습니다:", selector);
    }
  }

  else if (trigger.startsWith('delay:')) {
    const delay = parseInt(trigger.split(':')[1], 10);
    setTimeout(() => showStep(currentSteps[++currentIndex]), delay);
  }

else if (trigger === 'next') {
  const stepNo = currentSteps[currentIndex].step;
  console.log("📌 현재 step:", stepNo, typeof stepNo);

  if (stepNo == 39) {
    console.log("🎉 step 40 진입");
    localStorage.setItem('tutorial_grades', 'done');
    window.location.href = 'student-room_tutorial.html';
    return;
  }

  showStep(currentSteps[++currentIndex]);
}



  else {
    console.warn("⚠️ 알 수 없는 trigger 형식:", trigger);
  }
}






function createNextButton(callback) {
  const btn = document.createElement('button');
  btn.textContent = '다음';
  btn.className = 'tutorial-next-btn';
  btn.onclick = () => {
    clearTutorial();
    callback();
  };
  return btn;
}

function showDialogue(message, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  overlay.style = `
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.6);
    z-index: 9998;
    display: flex; align-items: center; justify-content: center;
    pointer-events: auto;
  `;

  const box = document.createElement('div');
  box.className = 'tutorial-box';
  box.style = `
    background: #fff;
    padding: 20px;
    border-radius: 12px;
    max-width: 320px;
    text-align: center;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    z-index: 9999;
  `;

  const jigi = document.createElement('img');
  jigi.src = 'cafe_jigi.png';
  jigi.style = 'width: 60px; margin-bottom: 12px;';

  const msg = document.createElement('div');
  msg.innerText = message;
  msg.style = 'margin-bottom: 16px; font-size: 14px; white-space: pre-wrap;';

  const btn = createNextButton(callback);

  box.appendChild(jigi);
  box.appendChild(msg);
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function showHighlight(step, callback) {
  const els = step.target ? document.querySelectorAll(step.target) : [];

  restoredTargets = [];
  els.forEach(el => {
    const prevZ = el.style.zIndex;
    el.style.zIndex = '10001';
    el.dataset.prevZ = prevZ || '';
    restoredTargets.push(el);
  });

  const tooltip = document.createElement('div');
  tooltip.className = 'tutorial-tooltip';
  tooltip.innerText = step.message;
  tooltip.style = `
    background: #fff;
    padding: 12px 16px;
    border-radius: 10px;
    border: 2px solid #444;
    font-size: 14px;
    z-index: 10000;
    white-space: pre-wrap;
    position: fixed;
  `;

  const btn = createNextButton(callback);
  tooltip.appendChild(btn);

  const main = document.querySelector('.main-page');
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  overlay.style = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,${step.target ? '0.6' : '0.35'});
    z-index: ${step.target ? '9998' : '1'};
    pointer-events: auto;
  `;
  main.appendChild(overlay);

  if (step.tooltip_xy) {
    const [top, left] = step.tooltip_xy.split(',').map(Number);
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  } else {
    tooltip.style.top = '80%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
  }

  document.body.appendChild(tooltip);
}

function clearTutorial() {
  document.querySelectorAll('.tutorial-overlay, .tutorial-tooltip, .tutorial-next-btn').forEach(el => el.remove());

  if (restoredTargets.length > 0) {
    restoredTargets.forEach(el => {
      el.style.zIndex = el.dataset.prevZ || '';
      delete el.dataset.prevZ;
    });
    restoredTargets = [];
  }
}
