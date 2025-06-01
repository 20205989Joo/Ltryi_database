// ✅ 1. 팝업 HTML 삽입
function injectKioskPopupHTML() {
  const popupHTML = `
    <div id="popup" class="popup" style="display: none;">
      <button class="popup-close" id="popupCloseBtn">✖</button>
      <div class="popup-content">
        <div class="popup-header-text">오늘의 숙제를 주문해주세요</div>
        <div class="tabs">
          <button class="tab active" data-tab="tukurry">
            <span class="tab-large">숙제</span><br><span class="tab-small">주세요</span>
          </button>
          <button class="tab" data-tab="etc">
            <span class="tab-large">내 숙제</span><br><span class="tab-small">할래요</span>
          </button>
        </div>
        <div class="tab-content" id="tab-tukurry">
          <button class="menu-btn square">단어</button>
          <button class="menu-btn square">문법</button>
          <button class="menu-btn square">독해</button>
        </div>
        <div class="tab-content hidden" id="tab-etc">
          <button class="menu-btn square">오늘 내 숙제</button>
          <button class="menu-btn square">시험지 만들어주세요</button>
        </div>
        <div id="sub-popup" class="sub-popup hidden">
          <button class="popup-close" id="subPopupCloseBtn">✖</button>
          <div class="sub-popup-inner"></div>
        </div>
        <div class="selection-status">
          선택된 항목:
          <div id="selectedList" class="selected-list"></div>
        </div>
        <button class="order-btn" id="finalOrderBtn">🛒 주문하기</button>
      </div>
    </div>
  `;
  document.getElementById('popup-container').innerHTML = popupHTML;
}

// ✅ 2. 상태 전역 변수
let selectedItems = [];
let currentSubItem = null;
let difficulty = 1, rangeBegin = 1, rangeEnd = 1;

// ✅ 3. 초기 kiosk UI 설정
function setupKioskUI() {
  const kiosk = document.getElementById('kiosk');
  const popup = document.getElementById('popup');
  if (!kiosk || !popup) return;

  kiosk.addEventListener('click', () => {
    popup.style.display = 'flex';
    updateSelectedDisplay();
    setupTabs();
    bindMenuButtons();
    document.getElementById('popupCloseBtn').onclick = () => popup.style.display = 'none';
    document.getElementById('finalOrderBtn').onclick = handleFinalOrder;
  });
}

// ✅ 4. 탭 전환 처리
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.remove('hidden');
    };
  });
}

// ✅ 5. 메뉴 버튼 클릭 처리
function bindMenuButtons() {
  const triggerSet = new Set(["단어", "문법", "독해"]);
  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.onclick = () => {
      const item = btn.textContent.trim();
      if (triggerSet.has(item)) {
        currentSubItem = item;
        difficulty = 1; rangeBegin = 1; rangeEnd = 1;
        renderBasicSubPopup();
      } else {
        renderSubPopup(item);
      }
    };
  });
}

// ✅ 6. 기본 서브팝업
function renderBasicSubPopup() {
  const inner = document.querySelector('.sub-popup-inner');
  const subPopup = document.getElementById('sub-popup');
  inner.innerHTML = `
    <div class="sub-popup-title">난이도를 선택해주세요</div>
    <div class="sub-counter">
      <button class="counter-btn" id="diffMinus">-</button>
      <span id="difficultyLevel">1</span>
      <button class="counter-btn" id="diffPlus">+</button>
    </div>
    <div class="sub-popup-title">범위를 선택해주세요</div>
    <div class="range-dual">
      <div class="range-group">
        <div class="range-label">시작 Day</div>
        <div class="sub-counter">
          <button class="counter-btn" id="rangeBeginMinus">-</button>
          <span id="rangeBegin">1</span>
          <button class="counter-btn" id="rangeBeginPlus">+</button>
        </div>
      </div>
      <div class="range-group">
        <div class="range-label">끝 Day</div>
        <div class="sub-counter">
          <button class="counter-btn" id="rangeEndMinus">-</button>
          <span id="rangeEnd">1</span>
          <button class="counter-btn" id="rangeEndPlus">+</button>
        </div>
      </div>
    </div>
    <button id="subPopupConfirm" class="order-btn">담기</button>
  `;

  setDifficulty(1);
  setRangeBegin(1);
  setRangeEnd(1);
  bindCounter("diffMinus", "diffPlus", () => difficulty, setDifficulty, 1, 3);
  bindCounter("rangeBeginMinus", "rangeBeginPlus", () => rangeBegin, setRangeBegin);
  bindCounter("rangeEndMinus", "rangeEndPlus", () => rangeEnd, setRangeEnd);

  document.getElementById('subPopupConfirm').onclick = () => {
    selectedItems.push({ label: currentSubItem, difficulty, rangeBegin, rangeEnd });
    updateSelectedDisplay();
    subPopup.classList.add('hidden');
  };

  document.getElementById('subPopupCloseBtn').onclick = () => {
    subPopup.classList.add('hidden');
  };

  subPopup.classList.remove('hidden');
}


function renderSubPopup(type) {
  const inner = document.querySelector('.sub-popup-inner');
  const subPopup = document.getElementById('sub-popup');
  inner.innerHTML = '';
  subPopup.classList.remove('hidden');

  let label = '';

  if (type === '오늘 내 숙제') {
    label = '오늘 내 숙제';
  } else if (type === '시험지 만들어주세요') {
    label = '시험지 만들어주세요';
  } else {
    // 알 수 없는 타입일 경우 닫기
    subPopup.classList.add('hidden');
    return;
  }

  inner.innerHTML = `
    <div class="sub-popup-title">${label}</div>
    <div class="sub-popup-desc" style="font-size: 13px; margin: 8px 0 14px; color: #ccc;">
      상세내용은 테이블에서 작성해주세요.
    </div>
    <button id="subPopupConfirm" class="order-btn">담기</button>
  `;

  document.getElementById('subPopupConfirm')?.addEventListener('click', () => {
    selectedItems.push({ label }); // ✅ label만 푸시
    updateSelectedDisplay();
    subPopup.classList.add('hidden');
  });

  document.getElementById('subPopupCloseBtn')?.addEventListener('click', () => {
    subPopup.classList.add('hidden');
  });
}








// ✅ 8. 카운터 조작 함수들
function bindCounter(minusId, plusId, get, set, min = 1, max = 999) {
  document.getElementById(minusId)?.addEventListener('click', () => {
    const v = get();
    if (v > min) set(v - 1);
  });
  document.getElementById(plusId)?.addEventListener('click', () => {
    const v = get();
    if (v < max) set(v + 1);
  });
}
function setDifficulty(v) {
  difficulty = v;
  const el = document.getElementById('difficultyLevel');
  if (el) el.textContent = v;
}
function setRangeBegin(v) {
  rangeBegin = v;
  const el = document.getElementById('rangeBegin');
  if (el) el.textContent = v;
  if (rangeEnd < v) setRangeEnd(v);
}
function setRangeEnd(v) {
  rangeEnd = v;
  const el = document.getElementById('rangeEnd');
  if (el) el.textContent = v;
  if (rangeBegin > v) setRangeBegin(v);
}

// ✅ 9. 선택된 항목 출력
function updateSelectedDisplay() {
  const list = document.getElementById('selectedList');
  list.innerHTML = '';
  if (selectedItems.length === 0) {
    list.innerHTML = `<span style="color: #888;">없음</span>`;
    return;
  }
  selectedItems.forEach((item, index) => {
    const tag = document.createElement('div');
    tag.className = 'selected-tag';
    tag.textContent = item.difficulty
      ? `${item.label} (난이도: ${item.difficulty}, 범위: ${item.rangeBegin}~${item.rangeEnd})`
      : item.examType
      ? `${item.label} (${item.examType}, 난이도: ${item.difficulty}, 범위: ${item.rangeBegin}~${item.rangeEnd})`
      : item.label;

    const delBtn = document.createElement('span');
    delBtn.textContent = ' ✖';
    delBtn.style.cursor = 'pointer';
    delBtn.onclick = () => {
      selectedItems.splice(index, 1);
      updateSelectedDisplay();
    };
    tag.appendChild(delBtn);
    list.appendChild(tag);
  });
}

// ✅ 10. 주문하기 로직
function handleFinalOrder() {
  const qordered = [];
  let receiptText = '';

  selectedItems.forEach(entry => {
    // ✅ 기본 숙제 (단어, 문법, 독해)
    if (["단어", "문법", "독해"].includes(entry.label)) {
      for (let qno = entry.rangeBegin; qno <= entry.rangeEnd; qno++) {
        qordered.push({ WhichHW: entry.label, QLevel: entry.difficulty, QNo: qno });
      }
      receiptText += `${entry.label} (난이도: ${entry.difficulty}, 범위: ${entry.rangeBegin}~${entry.rangeEnd})\n`;
    }

    // ✅ 사진 찍어 올리기
    else if (entry.type === 'photo') {
      qordered.push({
        WhichHW: entry.hwtype,
        Comment: `${entry.amount} - 채점: ${entry.check}`
      });
      receiptText += `📷 ${entry.hwtype} (${entry.amount}, 채점: ${entry.check})\n`;
    }

    // ✅ 시험봐주세요
    else if (entry.type === 'request-exam') {
      for (let qno = entry.rangeBegin; qno <= entry.rangeEnd; qno++) {
        qordered.push({
          WhichHW: entry.examType,
          QLevel: entry.difficulty,
          QNo: qno
        });
      }
      receiptText += `🧪 ${entry.examType} 시험 요청 (난이도: ${entry.difficulty}, 범위: ${entry.rangeBegin}~${entry.rangeEnd})\n`;
    }

    // ✅ 시험 만들어주세요
    else if (entry.type === 'make-exam') {
      qordered.push({
        WhichHW: "시험 제작",
        Comment: entry.examName,
        HWImageURL: entry.fileName
      });
      receiptText += `🛠 시험 제작 요청: ${entry.examName} [파일: ${entry.fileName}]\n`;
    }

    // ✅ 오늘 내 숙제 / 시험지 만들어주세요
    else if (entry.label === '오늘 내 숙제' || entry.label === '시험지 만들어주세요') {
      qordered.push({
        WhichHW: entry.label
      });
      receiptText += `${entry.label}\n`;
    }
  });

  localStorage.setItem('Qordered', JSON.stringify(qordered));
  document.getElementById('popup').style.display = 'none';

  const tray = document.getElementById('food-tray');
  if (tray) tray.style.display = 'block';

  if (!document.getElementById('receipt_icon')) {
    const icon = document.createElement('img');
    icon.src = 'receipt_icon.png';
    icon.id = 'receipt_icon';
    icon.className = 'receipt-icon';
    icon.onclick = () => showReceiptAgain(receiptText);
    document.querySelector('.main-page').appendChild(icon);
  }

  showReceiptAgain(receiptText);
}



function showReceiptAgain(text) {
  const old = document.getElementById('temp-receipt');
  if (old) old.remove();

  const again = document.createElement('div');
  again.id = 'temp-receipt';
  again.className = 'receipt-box';
  again.innerHTML = `
    <div class="receipt-title">📄 주문 영수증</div>
    <div class="receipt-content">${text.trim().replace(/\n/g, '<br>')}</div>
  `;
  document.querySelector('.main-page').appendChild(again);

  setTimeout(() => {
    again.style.opacity = 0;
    setTimeout(() => again.remove(), 1000);
  }, 3000);
}

// ✅ 11. 실행 시작
window.addEventListener('DOMContentLoaded', () => {
  injectKioskPopupHTML();
  setupKioskUI();
});

