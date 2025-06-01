window.addEventListener('DOMContentLoaded', () => {
  const trayArea = document.getElementById('tray-area');
  const cafeInt = document.getElementById('cafe_int');
  const qordered = JSON.parse(localStorage.getItem('Qordered') || '[]');
  const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');

  const baseOffset = 10;
  const gap = 90;

  qordered.forEach((item, index) => {
    const dish = document.createElement('div');
    dish.className = 'dish';
    dish.style.left = `${baseOffset + (index % 3) * gap}px`;
    dish.style.top = `${baseOffset + Math.floor(index / 3) * gap}px`;
    dish.textContent = item.WhichHW;

    window.adjustFontSize(dish);

    const isDone = pending.some(p =>
      p.label === item.WhichHW &&
      p.QLevel === item.QLevel &&
      p.QNo === item.QNo &&
      p.type === 'upload'
    );

    if (isDone) {
      dish.style.pointerEvents = 'none';
      dish.style.opacity = '0.3';
      dish.style.color = 'rgb(2, 47, 61)';

      const doneTag = document.createElement('div');
      doneTag.className = 'done-label';
      doneTag.textContent = '(완료됨)';
      dish.appendChild(doneTag);
    } else {
      dish.addEventListener('click', () => showDishPopup(item));
    }

    trayArea.appendChild(dish);
  });

  window.storePendingHomework = function(entry) {
    const key = 'PendingUploads';
    let existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing = existing.filter(e =>
      !(e.label === entry.label && e.QLevel === entry.QLevel && e.QNo === entry.QNo)
    );
    existing.push(entry);
    localStorage.setItem(key, JSON.stringify(existing));

    document.querySelectorAll('.dish').forEach(dish => {
      if (dish.textContent === entry.label) {
        dish.style.pointerEvents = 'none';
        dish.style.opacity = '0.6';
        if (!dish.querySelector('.done-label')) {
          const doneTag = document.createElement('div');
          doneTag.className = 'done-label';
          doneTag.textContent = '(완료됨)';
          doneTag.style = `
            font-size: 11px;
            color: #666;
            margin-top: 2px;
            text-align: center;
            width: 100%;
          `;
          dish.appendChild(doneTag);
        }
      }
    });
  };

  if (!document.getElementById('flash-style')) {
    const style = document.createElement('style');
    style.id = 'flash-style';
    style.innerHTML = `
      @keyframes flashText {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);
  }

  document.getElementById('receipt_icon')?.addEventListener('click', () => showReceiptFromQordered());

function showDishPopup(item) {
  const old = document.getElementById('popup-container');
  if (old) old.remove();

  const popupContainer = document.createElement('div');
  popupContainer.id = 'popup-container';
  popupContainer.style = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 10001;
    pointer-events: none;
  `;

  const popup = document.createElement('div');
  popup.style = `
    position: absolute;
    top: 160px;
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    min-height: 140px;
    background: #fffaf2;
    border: 2px solid #7e3106;
    border-radius: 14px;
    padding: 16px;
    font-size: 14px;
    color: #333;
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    z-index: 10001;
    text-align: center;
    pointer-events: auto;
  `;

  const hw = item.WhichHW;
  const key = `downloaded_HW_${hw}_${item.QLevel}_${item.QNo}`;
  const downloaded = localStorage.getItem(key) === 'true';

  let content = `
    <div style="font-weight:bold; font-size: 15px; margin-bottom: 10px;">📥 ${hw}</div>
  `;

  if (hw === '레벨테스트' || hw === 'Prologue Question') {
    const filename = hw === '레벨테스트' ? '레벨테스트.pdf' : 'PrologueQuestions.pdf';

  // ✅ 1페이지 미리보기 iframe 추가
  content += `
    <div style="margin-bottom: 8px;">
      <iframe src="${filename}#page=1" width="100%" height="180px"
        style="border: 1px solid #aaa; border-radius: 6px;"></iframe>
    </div>
  `;

    if (downloaded) {
      content += `
        <div style="margin-bottom: 10px;">숙제를 다시 다운로드하거나, 완료 후 제출할 수 있어요.</div>
        <div style="display: flex; gap: 6px; justify-content: center;">
          <a href="${filename}" download class="room-btn" id="download-a"
            style="flex: 1; text-decoration: none; height: 18px; display: inline-flex; align-items: center; justify-content: center;">
            📂 다시 다운로드
          </a>
          <button class="room-btn" style="background: #1976d2; flex: 1;" id="upload-btn">✅ 완료했어요!</button>
        </div>
      `;
    } else {
      content += `
        <div style="margin-bottom: 10px;">해당 숙제를 다운로드하세요.</div>
        <a href="${filename}" download class="room-btn" id="download-btn"
          style="flex: 1; text-decoration: none; height: 18px; display: inline-flex; align-items: center; justify-content: center;">
          📂 다운로드
        </a>
      `;
    }
  }

  content += `
    <button id="close-popup" class="room-btn" style="
      margin-top: 14px;
      width: 100%;
      background: #f17b2a;
    ">닫기</button>
  `;

  popup.innerHTML = content;

  // 🔒 닫기 버튼 강제 잠금 처리
  const closeBtn = popup.querySelector('#close-popup');
  if (closeBtn) {
    closeBtn.disabled = true;
    closeBtn.style.opacity = '0.5';
    closeBtn.style.cursor = 'not-allowed';
    closeBtn.innerText = '닫기 (잠김)';
  }

  popup.querySelector('#download-btn')?.addEventListener('click', () => {
    localStorage.setItem(key, 'true');
    showDishPopup(item); // 재렌더링
  });

  popup.querySelector('#download-a')?.addEventListener('click', () => {
    localStorage.setItem(key, 'true');
  });

  popup.querySelector('#upload-btn')?.addEventListener('click', () => {
    storePendingHomework({
      label: hw,
      type: 'upload',
      timestamp: new Date().toISOString(),
      comment: 'Tutorial 중 작성됨',
      QLevel: item.QLevel,
      QNo: item.QNo
    });

    checkTutorialTrayComplete(); // ✅ 튜토리얼 단계 점검 함수

    document.getElementById('popup-container')?.remove();
    showReceiptFromQordered(hw);
  });

  popup.querySelector('#custom-complete-btn')?.addEventListener('click', () => {
    let detail = '';
    let comment = '';

    if (hw === '오늘 내 숙제') {
      detail = document.getElementById('custom_hwtype')?.value.trim();
      comment = document.getElementById('custom_hwdesc')?.value.trim();
    } else if (hw === '시험지 만들어주세요') {
      detail = document.getElementById('custom_exam_type')?.value.trim();
      comment = document.getElementById('custom_exam_desc')?.value.trim();
    }

    storePendingHomework({
      label: hw,
      type: 'upload',
      timestamp: new Date().toISOString(),
      comment,
      detail
    });

    document.getElementById('popup-container')?.remove();
    showReceiptFromQordered(hw);
  });

  popupContainer.appendChild(popup);
  document.querySelector('.main-page').appendChild(popupContainer);
}


  window.clearDownloadHistory = () => {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('downloaded_HW_')) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('PendingUploads');
  alert('📦 Dish가 다시 차려졌습니다!');
  location.reload(); // ✅ 새로고침 추가
};

});

function showReceiptFromQordered(latestLabel = null) {

    // ✅ 1. 애니메이션 스타일 삽입 (한 번만)
if (!document.getElementById('receipt-animation-style')) {
  const style = document.createElement('style');
  style.id = 'receipt-animation-style';
  style.innerHTML = `
    @keyframes receiptShadowPop {
      0% {
        box-shadow: 0 0 0px rgba(80, 200, 120, 0);
      }
      100% {
        box-shadow: 0 0 30px 25px rgba(80, 200, 120, 0.4);
      }
    }
  `;
  document.head.appendChild(style);
}
    // ✅ 2. 나머지 원래 receipt 로직
  const qordered = JSON.parse(localStorage.getItem('Qordered') || '[]');
  const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');

  const container = document.createElement('div');
  container.id = 'temp-receipt';
  container.className = 'receipt-box';
  container.style = `
    position: absolute;
    top: 120px;
    left:  50%;
    transform: translateX(-50%);
    background: white;
    border: 2px dashed #444;
    border-radius: 8px;
    width: 240px;
    padding: 16px;
    font-family: monospace;
    font-size: 13px;
    color: #222;
    z-index: 20;
    opacity: 1;
  animation: receiptShadowPop 0.3s ease-out forwards;
    transition: opacity 1s ease;
  `;

  let content = '<div class="receipt-title">📄 주문 영수증</div><div class="receipt-content">';
  qordered.forEach(entry => {
    const isChecked = pending.some(p =>
      p.label === entry.WhichHW &&
      (p.QLevel == null || p.QLevel === entry.QLevel) &&
      (p.QNo == null || p.QNo === entry.QNo) &&
      p.type === 'upload'
    );
    const line = entry.QLevel && entry.QNo
      ? `${entry.WhichHW} (난이도: ${entry.QLevel}, 범위: ${entry.QNo})`
      : `${entry.WhichHW}`;
    const highlight = entry.WhichHW === latestLabel;
    const style = `
      ${isChecked ? 'color: green;' : ''}
      ${highlight ? 'font-weight: bold; animation: flashText 0.5s linear 1;' : ''}
    `;
    content += `<div style="${style}">${line}${isChecked ? ' ✔️ Check!' : ''}</div>`;
  });

  content += '</div>';
  container.innerHTML = content;
  document.querySelector('.main-page').appendChild(container);

  setTimeout(() => {
    container.style.opacity = 0;
    setTimeout(() => container.remove(), 1000);
  }, 3000);
}

function checkTutorialTrayComplete() {
  const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
  const hasLevelTest = pending.some(p => p.label === '레벨테스트' && p.type === 'upload');
  const hasPrologue = pending.some(p => p.label === 'Prologue Question' && p.type === 'upload');

  if (hasLevelTest && hasPrologue) {
    localStorage.setItem('tutorial_tray', 'done');
    console.log('✅ tutorial_tray = done');
  }
}

function checkTutorialTrayComplete() {
  const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
  const hasLevelTest = pending.some(p => p.label === '레벨테스트' && p.type === 'upload');
  const hasPrologue = pending.some(p => p.label === 'Prologue Question' && p.type === 'upload');

  if (hasLevelTest && hasPrologue) {
    localStorage.setItem('tutorial_tray', 'done');
    console.log('✅ tutorial_tray = done');

    // ✅ 튜토리얼용 트리거 실행
    if (window.advanceStep && !window._tutorialTrayStepFired) {
      window._tutorialTrayStepFired = true; // 중복방지
      window.advanceStep('done:tray');
    }
  }
}
