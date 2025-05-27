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
      tooltip_xyhw: row.tooltip_xyhw ? String(row.tooltip_xyhw) : null // ✅ 여기를 변경
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
  const choiceReady = localStorage.getItem('tutorial_choice_ready') === 'done'; // ✅ 새 플래그

  const path = window.location.pathname;

  if (path.includes('student-room')) {
    if (tray && submit && report && grades) {
      const pointEl = document.getElementById('todayPoint');
      if (pointEl) pointEl.textContent = '20';
      return 40;  // ✅ grades까지 완료 → step 41부터 시작
    }
    if (tray && submit && report) {
      const pointEl = document.getElementById('todayPoint');
      if (pointEl) pointEl.textContent = '20';
      return 33;
    }
    if (tray && submit) return 27;
    if (tray) return 20;
    return 0;
  }

  if (path.includes('tutorial_ending')) return 45;
  if (path.includes('homework-tray')) return 14;
  if (path.includes('homework-submit')) return 22;

  if (path.includes('report-analysis')) {
    if (choiceReady) {
      // ✅ UI 복구: choice1, choice2 → active로
      ['choice1', 'choice2'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
          btn.classList.remove('choice-disabled', 'choice-visible');
          btn.classList.add('choice-active');
        }
      });
      return 31; // ✅ step 31부터 복구
    }
    return 28;
  }

  if (path.includes('grades-calendar')) return 34;

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
    showDialogue(step.message, next);
  } else if (step.type === 'highlight') {
    showHighlight(step, next);
  } else if (step.type === 'quiz') {
    showMiniTestInsideDialogue(step.message);  // ✅ 여기서 퀴즈 UI 출력
    return;
  } else {
    showDialogue(step.message, next);
  }
}



  function advanceStep(trigger) {
  const step = currentSteps[currentIndex];
  console.log("🔁 Trigger Received:", trigger, '| Current Step:', step?.step);

  handleUnlockByStep(step.step);

  if (!trigger) return;

  // ✅ 클릭 트리거
  if (trigger.startsWith('click:')) {
    const selector = trigger.split(':')[1];
    const target = document.querySelector(selector);

    if (target) {
      const listener = () => {
        target.removeEventListener('click', listener);

        // 특별 처리: 성적표 돌아가기
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

// 👉 delay 트리거: 자동 진행 (highlight에서만)
else if (trigger?.startsWith('delay:')) {
  const ms = parseInt(trigger.split(':')[1], 10);
  console.log(`⏱ highlight 딜레이 ${ms}ms 후 다음 step`);
  setTimeout(() => {
    showStep(currentSteps[++currentIndex]);
  }, ms);
}



  // ✅ 완료 조건 트리거 (예: tray 완료)
  else if (trigger === 'done:tray') {
    console.log("📦 모든 dish 완료됨 → 다음 step 이동");
    showStep(currentSteps[++currentIndex]);
  }

  else if (trigger === 'done:pendinglist') {
  console.log("🎯 trigger: done:pendinglist 수신됨");
  showStep(currentSteps[++currentIndex]);
}

else if (trigger === 'done:toserver') {
  console.log("✅ 트리거 수신: done:toserver");
  showStep(currentSteps[++currentIndex]);
}

else if (trigger === 'done:order') {
  console.log("🛒 done:order 수신 → 다음 스텝 이동");
  showStep(currentSteps[++currentIndex]);
}


  // ✅ 기본 next 트리거
  else if (trigger === 'next') {
    const stepNo = step?.step;
    console.log("📌 next → step", stepNo);

    // 특수 케이스: 뒤로가기 버튼
    if (stepNo === 20) {
      showCustomBackButton(step.message);
      return;
    }

    // 특수 케이스: push 알림 전송
    if (stepNo === 37) {
      const userId = localStorage.getItem('currentUserId');
       console.log("🧪 step 37 - userId:", userId);
      if (userId) {
        fetch('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: '❗ 숙제 제출이 1시간 남았습니다.',
            body: '제한시간 전에 꼭! 제출해주세요.'
          })
        })
          .then(res => res.json())
          .then(data => console.log('📨 Push sent:', data))
          .catch(err => console.error('❌ Push error:', err));
      }
    }

    // 특수 케이스: 튜토리얼 종료
if (stepNo === 40) {
  localStorage.setItem('tutorial_grades', 'done');
  window.location.href = `student-room_tutorial.html?id=${userId}`;
  return;
}


    if (stepNo === 45) {
  window.location.href = `tutorial_ending.html?id=${userId}`;
      return;
    }

    showStep(currentSteps[++currentIndex]);
  }

  // ✅ 예외 처리
  else {
    console.warn("⚠️ 알 수 없는 trigger 형식:", trigger);
  }
}



function showMiniTestInsideDialogue(message) {
  clearTutorial();

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
    max-width: 340px;
    text-align: center;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    z-index: 9999;
    font-family: 'Gowun Batang', serif;
  `;

  const jigi = document.createElement('img');
  jigi.src = 'cafe_jigi.png';
  jigi.style = 'width: 60px; margin-bottom: 12px;';

  const msg = document.createElement('div');
  msg.innerText = message;
  msg.style = 'margin-bottom: 14px; font-size: 14px; white-space: pre-wrap;';

  const choices = ['키오스크', '테이블', '제출함', '카페지기', '칠판'];
  const correctAnswer = '테이블';

  const feedback = document.createElement('div');
  feedback.style = 'margin-top: 12px; font-size: 13px; color: red; height: 18px;';

  const choiceContainer = document.createElement('div');
  choiceContainer.style = `
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    max-width: 280px;
    margin: 0 auto;
  `;

  choices.forEach((choice) => {
    const btn = document.createElement('button');
    btn.textContent = choice;
    btn.style = `
      flex: 0 1 28%;
      padding: 6px 10px;
      border: 1px solid #ccc;
      border-radius: 8px;
      background: white;
      font-size: 13px;
      transition: background 0.3s;
    `;
    btn.onclick = () => {
      if (choice === correctAnswer) {
        btn.style.background = '#d2f5c2';
        feedback.textContent = '';
        setTimeout(() => {
          document.body.removeChild(overlay);
          showStep(currentSteps[++currentIndex]);
        }, 500);
      } else {
        btn.style.background = '#eeeeee';
        feedback.textContent = '다시 생각해보세요!';
      }
    };
    choiceContainer.appendChild(btn);
  });

  box.appendChild(jigi);
  box.appendChild(msg);
  box.appendChild(choiceContainer);
  box.appendChild(feedback);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}





function createNextButton(callback) {
  const btn = document.createElement('button');
  btn.textContent = '다음';
  btn.className = 'tutorial-next-btn';
  btn.onclick = () => {
    console.log('✅ 다음 버튼 클릭됨 → currentIndex before:', currentIndex);
    console.log('👉 callback 내용:', callback.toString());
    clearTutorial();
    callback();
    console.log('➡️ callback 실행됨 → currentIndex after:', currentIndex);
  };
  return btn;
}

const backButtonSteps = [20, 27]; // ✅ 여러 stepNo 지원하도록 배열 정의

function showDialogue(message, callback) {
  const step = currentSteps[currentIndex];
  const trigger = step.trigger;
  const stepNo = step.step;

  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  overlay.style = `
    position: fixed; top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.6);
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
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

  box.appendChild(jigi);
  box.appendChild(msg);

  // ✅ stepNo이 backButtonSteps에 포함되면 → "뒤로가기" 버튼만 생성
  if (backButtonSteps.includes(stepNo)) {
    const btn = document.createElement('button');
    btn.textContent = '⬅ 뒤로가기';
    btn.className = 'tutorial-next-btn';
    btn.onclick = () => {
window.location.href = `student-room_tutorial.html?id=${userId}`;

    };
    box.appendChild(btn);
  }

  // ✅ 일반적인 next 트리거일 경우만 "다음" 버튼 생성
  else if (trigger === 'next') {
    const btn = createNextButton(callback);
    box.appendChild(btn);
  }

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}



function showHighlight(step, callback) {
  console.log("🧪 tooltip_xyhw:", step.tooltip_xyhw);

  const trigger = step.trigger;
  const els = step.target ? document.querySelectorAll(step.target) : [];

  restoredTargets = [];
  els.forEach(el => {
    const prevZ = el.style.zIndex;
    el.style.zIndex = '10001';
    el.dataset.prevZ = prevZ || '';
    restoredTargets.push(el);
  });

  const useMask = (
    step.target === '.tabs' ||
    step.target === '.popup-content' ||
    step.target === '#popup' ||
    step.target === '.order-btn' ||
    step.target === '.tab-content' ||
    step.target === '.receipt-box' ||
    step.target === '#finalOrderBtn' ||
    step.target === '#pendingList' ||
    step.target === '#hwSubmitbutton' ||
    step.target === '#choice1' ||
    step.target === '#choice2' ||
    step.target === '#choice3' ||
    step.target === '#subChoiceBox' ||
    step.target === '#chalkboard' ||
    step.target === '#chalkboard_grades' ||
    step.target === '.calendar-section'
  );

  if (step.target && useMask) {
    setTimeout(() => {
      const el = document.querySelector(step.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        const padding = 4;
        createSimpleHoleOverlay(
          rect.left - padding,
          rect.top - padding,
          rect.width + 2 * padding,
          rect.height + 2 * padding
        );
      } else {
        console.warn('❌ spotlight 대상 요소를 찾을 수 없음:', step.target);
      }
    }, 1);
  }

  if (!useMask) {
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
  }

  const tooltip = document.createElement('div');
  tooltip.className = 'tutorial-tooltip';
  tooltip.innerText = step.message;
tooltip.style = `
        background: #fffaf2;
      padding: 12px 16px;
      border-radius: 10px;
      border: 2px solid #444;
      font-size: 14px;
      z-index: 10006;
      white-space: pre-wrap;
      position: absolute;
      box-sizing: border-box;
      cursor: move;
      resize: both;
`;


  if (step.tooltip_xyhw && typeof step.tooltip_xyhw === 'string' && step.tooltip_xyhw.includes('_')) {
    const [top, left, width, height] = step.tooltip_xyhw.split('_').map(Number);
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    if (!isNaN(width)) tooltip.style.width = `${width}px`;
    if (!isNaN(height)) tooltip.style.height = `${height}px`;
  } else {
    tooltip.style.top = '80%';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
  }

  document.body.appendChild(tooltip);

  if (trigger?.startsWith('click:')) {
    const selector = trigger.split(':')[1];
    const target = document.querySelector(selector);
    if (target) {
      const listener = () => {
        target.removeEventListener('click', listener);
        showStep(currentSteps[++currentIndex]);
      };
      target.addEventListener('click', listener);
    } else {
      console.warn('⚠️ trigger 대상 요소를 찾을 수 없습니다:', selector);
    }
  } else if (trigger === 'next') {
    const btn = createNextButton(() => {
      console.log('🟡 highlight → next 클릭됨 → advanceStep 호출로 변경');
      advanceStep('next');
    });
    tooltip.appendChild(btn);
  } else if (trigger?.startsWith('delay:')) {
    const ms = parseInt(trigger.split(':')[1], 10);
    console.log(`⏱ highlight 딜레이 ${ms}ms 후 advanceStep 호출`);
    setTimeout(() => {
      advanceStep(trigger);
    }, ms);
  }
}






function createSimpleHoleOverlay(x, y, w, h) {
   console.log('🕳️ spotlight:', x, y, w, h); // ✅ 이 안에 넣어야 x, y 등이 유효함
  const overlay = document.createElement('div');
  overlay.className = 'tutorial-mask-overlay';

  overlay.style = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    z-index: 9997;
    pointer-events: auto;
    clip-path: polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%,
      0% 0%,
      ${x}px ${y}px, ${x}px ${y + h}px,
      ${x + w}px ${y + h}px, ${x + w}px ${y}px,
      ${x}px ${y}px
    );
  `;

  document.body.appendChild(overlay);
}



function clearTutorial() {
  document.querySelectorAll('.tutorial-overlay, .tutorial-tooltip, .tutorial-next-btn, .tutorial-mask-overlay')
    .forEach(el => el.remove());

  if (restoredTargets.length > 0) {
    restoredTargets.forEach(el => {
      el.style.zIndex = el.dataset.prevZ || '';
      delete el.dataset.prevZ;
    });
    restoredTargets = [];
  }
}

function showCustomBackButton(message) {
  clearTutorial();

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

  const btn = document.createElement('button');
  btn.className = 'tutorial-next-btn';
  btn.innerText = '⬅ 뒤로가기';
  btn.onclick = () => {
      window.location.href = `student-room_tutorial.html?id=${userId}`;
  };

  box.appendChild(jigi);
  box.appendChild(msg);
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}


// 잠금 해금 처리


function lockAllInteractive() {
  const allInteractive = [
    '#kiosk',
    '#return-ham',
    '.table-1',
    '.table-2',
    '.table-3',
    '#chalkboard',
    '#calendar',
    '#cafe_jigi',
    '#food-tray',
    '.cafe_billboard'
  ];
  allInteractive.forEach(lockElement);
}


function handleUnlockByStep(stepNo) {
  if (stepNo === 1) {
    lockAllInteractive(); // 🔒 튜토리얼 처음 시작 시 전부 잠금
  }

  if (stepNo === 5) unlockElement('#kiosk');
  if (stepNo === 11) lockElement('#kiosk');

  if (stepNo === 12) {
    ['.table-1', '.table-2', '.table-3'].forEach(selector => unlockElement(selector));
  }

  if (stepNo === 22) unlockElement('#return-ham');
  if (stepNo === 28) unlockElement('#cafe_jigi');
  if (stepNo === 33) unlockElement('#chalkboard');
  if (stepNo === 34) unlockElement('#calendar');

    if ([6, 7, 8].includes(stepNo)) createClickBlocker();
  if (stepNo === 9) removeClickBlocker();

  if (stepNo === 15) removeClickBlocker();


  // ✅ choice 버튼 단계별 해금 처리
  if (stepNo === 29) {
    const btn = document.getElementById('choice1');
    if (btn) {
      btn.classList.remove('choice-disabled');
      btn.classList.add('choice-visible');
    }
  }

  if (stepNo === 30) {
    const btn = document.getElementById('choice2');
    if (btn) {
      btn.classList.remove('choice-disabled');
      btn.classList.add('choice-visible');
    }
  }

  if (stepNo === 31) {
    ['choice1', 'choice2'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.remove('choice-visible');
        btn.classList.add('choice-active');
      }
        // ✅ 플래그 저장
  localStorage.setItem('tutorial_choice_ready', 'done');
    });
  }

if (stepNo === 32) {
  const btn = document.getElementById('choice3');
  if (btn) {
    btn.classList.remove('choice-disabled');
    btn.classList.add('choice-active');
    btn.textContent = '나가서 점수 받아보기'
  }


}

}




function lockElement(selector) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.classList.add('locked');
    el.classList.remove('unlocked');
  });
}

function unlockElement(selector) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.classList.remove('locked');
    el.classList.add('unlocked');
  });
}



//마스크 오버레이 blocker 추가. 에휴

function createClickBlocker() {
  if (document.getElementById('tutorial-click-blocker')) return;

  const blocker = document.createElement('div');
  blocker.id = 'tutorial-click-blocker';
  blocker.style = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: transparent;
    z-index: 10004; /* 🚫 모든 것 위에 덮어버림 */
    pointer-events: auto;
  `;
  document.body.appendChild(blocker);
}

function removeClickBlocker() {
  const blocker = document.getElementById('tutorial-click-blocker');
  if (blocker) blocker.remove();
}
