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
          <button class="menu-btn square">레벨테스트</button>
        </div>
        <div class="tab-content hidden" id="tab-etc">
          <button class="menu-btn square">오늘 내 숙제</button>
          <button class="menu-btn square">시험지 만들어주세요</button>
          <button class="menu-btn square">Prologue Question</button>
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

let selectedItems = [];
let currentSubItem = null;

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

function bindMenuButtons() {
  const allowedItems = new Set(["레벨테스트", "Prologue Question"]);
  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.disabled = false;
    btn.onclick = () => {
      const item = btn.textContent.trim();
      if (btn.disabled) return;

      if (allowedItems.has(item)) {
        currentSubItem = item;
        renderBasicSubPopup();
        btn.disabled = true;
      } else {
        renderBlockedSubPopup(item);
      }
    };
  });
}

function renderBlockedSubPopup(label) {
  const inner = document.querySelector('.sub-popup-inner');
  const subPopup = document.getElementById('sub-popup');
  inner.innerHTML = `
    <div class="sub-popup-title">${label}</div>
    <div class="sub-popup-desc" style="font-size: 14px; margin: 12px 0; color: #ccc;">
      튜토리얼 맛보기에요. 지금은 담을 수 없어요~
    </div>
  `;
  document.getElementById('subPopupCloseBtn').onclick = () => subPopup.classList.add('hidden');
  subPopup.classList.remove('hidden');
}

function renderBasicSubPopup() {
  const inner = document.querySelector('.sub-popup-inner');
  const subPopup = document.getElementById('sub-popup');

  inner.innerHTML = `
    <div class="sub-popup-title">난이도를 선택해주세요</div>
    <div class="option-group">
      <button class="option-btn active" data-value="free">free</button>
    </div>
    <div class="sub-popup-title">범위를 선택해주세요</div>
    <div class="option-group">
      <button class="option-btn active" data-value="free">free</button>
    </div>
    <button id="subPopupConfirm" class="order-btn">담기</button>
  `;

  document.getElementById('subPopupConfirm').onclick = () => {
    selectedItems.push({ label: currentSubItem, difficulty: 0, rangeBegin: 0, rangeEnd: 0 });
    updateSelectedDisplay();
    subPopup.classList.add('hidden');
  };

  document.getElementById('subPopupCloseBtn').onclick = () => subPopup.classList.add('hidden');
  subPopup.classList.remove('hidden');
}

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
    tag.textContent = `${item.label} (난이도: free, 범위: free)`;

    const delBtn = document.createElement('span');
    delBtn.textContent = ' ✖';
    delBtn.style.cursor = 'pointer';
    delBtn.onclick = () => {
      selectedItems.splice(index, 1);

      const menuBtn = Array.from(document.querySelectorAll('.menu-btn'))
        .find(btn => btn.textContent.trim() === item.label);
      if (menuBtn) menuBtn.disabled = false;

      updateSelectedDisplay();
    };

    tag.appendChild(delBtn);
    list.appendChild(tag);
  });
}

function handleFinalOrder() {
  const qordered = [];
  let receiptText = '';

  selectedItems.forEach(entry => {
    qordered.push({ WhichHW: entry.label, QLevel: 0, QNo: 0 });
    receiptText += `${entry.label} (난이도: free, 범위: free)\n`;
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
  document.getElementById('kiosk').style.pointerEvents = 'none';
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

window.addEventListener('DOMContentLoaded', () => {
  injectKioskPopupHTML();
  setupKioskUI();
});
