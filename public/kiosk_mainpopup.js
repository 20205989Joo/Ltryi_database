// kiosk_mainpopup.js

// 팝업 HTML 구조 삽입
function injectKioskPopupHTML() {
  const html = `
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
          <button class="menu-btn square">구문</button>
        </div>

        <div class="tab-content hidden" id="tab-etc">
          <button class="menu-btn square">오늘 내 숙제</button>
          <button class="menu-btn square">시험지 만들어주세요</button>
        <button class="menu-btn square">채점만 해주세요</button>
          <button class="menu-btn square">이거 잘 모르겠어요</button>
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

  const container = document.getElementById('popup-container');
  if (container) container.innerHTML = html;
}

// 팝업 UI 초기 설정
function setupKioskUI() {
  const kiosk = document.getElementById('kiosk');
  if (!kiosk) return;

  kiosk.addEventListener('click', () => {
    const popup = document.getElementById('popup');
    if (!popup) return;

    popup.style.display = 'flex';

    updateSelectedDisplay();   // ⬅️ 전역 함수 (subpopup.js에서 정의됨)
    setupTabs();
    bindMenuButtons();

    document.getElementById('popupCloseBtn').onclick = () => {
      popup.style.display = 'none';
    };

    document.getElementById('finalOrderBtn').onclick = handleFinalOrder; // ⬅️ receipt.js에서 정의됨
  });
}

// 탭 전환 처리
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.add('hidden'));

      tab.classList.add('active');
      const targetId = 'tab-' + tab.dataset.tab;
      const content = document.getElementById(targetId);
      if (content) content.classList.remove('hidden');
    });
  });
}

// 메뉴 버튼 클릭 처리
function bindMenuButtons() {
  const triggerSet = new Set(["단어", "문법", "독해", "구문"]);

  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = btn.textContent.trim();
      if (triggerSet.has(label)) {
        renderBasicSubPopup(label); // ⬅️ subpopup.js에서 정의됨
      } else {
        renderSubPopup(label);      // ⬅️ subpopup.js에서 정의됨
      }
    });
  });

  const subPopupClose = document.getElementById('subPopupCloseBtn');
  if (subPopupClose) {
    subPopupClose.onclick = () => {
      document.getElementById('sub-popup')?.classList.add('hidden');
    };
  }
}

// 최초 실행
window.addEventListener('DOMContentLoaded', () => {
  injectKioskPopupHTML();
  setupKioskUI();
});
