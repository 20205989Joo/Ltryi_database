// kiosk_mainpopup.js

function getDayManager() {
  return window.DayManager || null;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getCurriculumCategories() {
  const dm = getDayManager();

  if (
    !dm ||
    typeof dm.listCategories !== 'function' ||
    typeof dm.listSubcategories !== 'function'
  ) {
    return ['단어', '문법', '구문', '독해'];
  }

  const categories = dm.listCategories();
  const selectable = categories.filter(category => {
    if (category === '기타') return false;
    const subs = dm.listSubcategories(category) || [];
    return subs.length > 0;
  });

  return selectable.length > 0 ? selectable : ['단어', '문법', '구문', '독해'];
}

// 팝업 HTML 구조 삽입
function injectKioskPopupHTML() {
  const curriculumButtonsHtml = getCurriculumCategories()
    .map(category => (
      `<button class="menu-btn square" data-menu-type="curriculum">${escapeHtml(category)}</button>`
    ))
    .join('');

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
          ${curriculumButtonsHtml}
        </div>

        <div class="tab-content hidden" id="tab-etc">
          <button class="menu-btn square" data-menu-type="etc">오늘 내 숙제</button>
          <button class="menu-btn square" data-menu-type="etc">셀프 체크</button>
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

    // ⬇️ 전역 함수 (kiosk_subpopup.js에서 정의)
    updateSelectedDisplay();
    setupTabs();
    bindMenuButtons();

    document.getElementById('popupCloseBtn').onclick = () => {
      popup.style.display = 'none';
    };

    // ⬇️ 최종 주문 → kiosk_receipt.js의 handleFinalOrder
    document.getElementById('finalOrderBtn').onclick = handleFinalOrder;
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
  document.querySelectorAll('#tab-tukurry .menu-btn, #tab-etc .menu-btn').forEach(btn => {
    btn.onclick = () => {
      const label = btn.textContent.trim();
      const menuType = btn.dataset.menuType;
      if (menuType === 'curriculum') {
        // ⬇️ 세부 유형 + Level + Day까지 고르는 기본 서브팝업
        renderBasicSubPopup(label);
      } else {
        // ⬇️ 그 외 (오늘 내 숙제, 셀프 체크 등)
        renderSubPopup(label);
      }
    };
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
