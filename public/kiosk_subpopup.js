// kiosk_subpopup.js

window.selectedItems = [];

function updateSelectedDisplay() {
  const list = document.getElementById('selectedList');
  if (!list) return;
  list.innerHTML = '';
  selectedItems.forEach((item, index) => {
    const tag = document.createElement('div');
    tag.className = 'selected-tag';
    tag.innerHTML = `
      ${item.label}${item.Subcategory ? ' - ' + item.Subcategory : ''}
      ${item.Level ? ' - ' + item.Level : ''}
      ${item.LessonNo !== undefined ? ' - Day ' + item.LessonNo : ''}
      <span class="remove-tag" data-index="${index}">✖</span>
    `;
    list.appendChild(tag);
  });

  document.querySelectorAll('.remove-tag').forEach(span => {
    span.onclick = () => {
      const idx = parseInt(span.dataset.index);
      selectedItems.splice(idx, 1);
      updateSelectedDisplay();
    };
  });
}

function renderBasicSubPopup(label) {
  const subPopup = document.getElementById('sub-popup');
  const container = document.querySelector('.sub-popup-inner');
  if (!subPopup || !container) return;

  subPopup.classList.remove('hidden');
  container.innerHTML = '';

  const temp = { label };

  container.innerHTML = `
    <div class="sub-section" id="subcategorySection"></div>
    <div class="sub-section" id="levelSection"></div>
    <div class="sub-section" id="lessonSection"></div>
    <div class="sub-footer">
      <button class="order-btn confirm-btn" id="subPopupAddBtn">🛒 담기</button>
    </div>
  `;

  document.getElementById('subPopupCloseBtn').onclick = () => {
    subPopup.classList.add('hidden');
  };

  document.getElementById('subPopupAddBtn').onclick = () => {
    if (temp.Subcategory && temp.Level && temp.LessonNo) {
      const duplicate = selectedItems.some(item =>
        item.label === temp.label &&
        item.Subcategory === temp.Subcategory &&
        item.Level === temp.Level &&
        item.LessonNo === temp.LessonNo
      );
      if (!duplicate) {
        selectedItems.push({ ...temp });
        updateSelectedDisplay();
      }
      subPopup.classList.add('hidden');
    } else {
      alert('모든 항목을 선택해주세요!');
    }
  };

  renderSubcategoryOptions(label, temp);
}

function renderSubcategoryOptions(label, temp) {
  const section = document.getElementById('subcategorySection');
  if (!section) return;

  const map = {
    '단어': ['단어', '연어'],
    '문법': ['기초문법'],
    '구문': ['단계별 독해'],
    '독해': ['파편의 재구성']
  };

  section.innerHTML = '세부 유형을 골라주세요:<br>';
  map[label]?.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn small';
    btn.innerText = sub;
    btn.onclick = () => {
      temp.Subcategory = sub;
      renderLevelOptions(temp);
    };
    section.appendChild(btn);
  });
}

function renderLevelOptions(temp) {
  const section = document.getElementById('levelSection');
  if (!section) return;

  const levelMap = {
    '단어': ['1단계', '2단계', '3단계'],
    '연어': ['1단계', '2단계'],
    '기초문법': ['1단계'],
    '단계별 독해': ['1단계', '2단계'],
    '파편의 재구성': ['1단계']
  };

  section.innerHTML = '난이도를 골라주세요:<br>';
  const levels = levelMap[temp.Subcategory] || [];
  levels.forEach(level => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn small';
    btn.innerText = level;
    btn.onclick = () => {
      temp.Level = level;
      renderLessonOptions(temp);
    };
    section.appendChild(btn);
  });
}

function renderLessonOptions(temp) {
  const section = document.getElementById('lessonSection');
  if (!section) return;

  const lessonMap = {
    '단어': {
      '1단계': [1, 2, 3],
      '2단계': [4, 5, 6],
      '3단계': [7, 8, 9]
    },
    '연어': {
      '1단계': [10, 11],
      '2단계': [12, 13]
    },
    '기초문법': {
      '1단계': [14, 15, 16]
    },
    '단계별 독해': {
      '1단계': [17, 18],
      '2단계': [19, 20]
    },
    '파편의 재구성': {
      '1단계': [21, 22, 23]
    }
  };

  section.innerHTML = 'Day를 골라주세요:<br>';
  const lessons = lessonMap[temp.Subcategory]?.[temp.Level] || [];
  lessons.forEach(day => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn small';
    btn.innerText = `Day ${day}`;
    btn.onclick = () => {
      temp.LessonNo = day;
    };
    section.appendChild(btn);
  });
}

function renderSubPopup(label) {
  const container = document.querySelector('.sub-popup-inner');
  const subPopup = document.getElementById('sub-popup');
  if (!container || !subPopup) return;

  subPopup.classList.remove('hidden');
  container.innerHTML = `
    <div class="info-message">
      상세 내용은 테이블에서 작성해주세요
    </div>
    <div class="sub-footer">
      <button class="order-btn confirm-btn" id="subPopupAddBtn">🛒 담기</button>
    </div>
  `;

  document.getElementById('subPopupCloseBtn').onclick = () => {
    subPopup.classList.add('hidden');
  };

  document.getElementById('subPopupAddBtn').onclick = () => {
    const duplicate = selectedItems.some(item => item.label === label);
    if (!duplicate) {
      selectedItems.push({ label });
      updateSelectedDisplay();
    }
    subPopup.classList.add('hidden');
  };
}
