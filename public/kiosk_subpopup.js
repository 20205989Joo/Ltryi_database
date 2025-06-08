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

  console.log("📦 전달된 label:", label); // ✅ 로그 추가
  
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
    const labelOnlyItems = ['오늘 내 숙제', '시험지 만들어주세요', '채점만 해주세요'];
    const isLabelOnly = labelOnlyItems.includes(temp.label);

    if (
      isLabelOnly ||
      (temp.Subcategory && temp.Level && temp.LessonNo !== undefined)
    ) {
      const duplicate = selectedItems.some(item =>
        item.label === temp.label &&
        (isLabelOnly || (
          item.Subcategory === temp.Subcategory &&
          item.Level === temp.Level &&
          item.LessonNo === temp.LessonNo
        ))
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
    '문법': ['문법'],
    '구문': ['단계별 독해'],
  };

  section.innerHTML = '세부 유형을 골라주세요:<br>';
  map[label]?.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn small';
    btn.innerText = sub;
    btn.onclick = () => {
      temp.Subcategory = sub;
      document.querySelectorAll('#subcategorySection .menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLevelOptions(temp);
    };
    section.appendChild(btn);
  });
}

function renderLevelOptions(temp) {
  const section = document.getElementById('levelSection');
  if (!section) return;

  const levelMap = {
    '단어': ['A1', 'A2', 'B1', 'B2', 'C1'],
    '연어': ['900핵심연어'],
    '문법': ['Basic'],
    '단계별 독해': ['RCStepper'],
  };

  section.innerHTML = '난이도를 골라주세요:<br>';
  const levels = levelMap[temp.Subcategory] || [];
  levels.forEach(level => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn small';
    btn.innerText = level;
    btn.onclick = () => {
      temp.Level = level;
      document.querySelectorAll('#levelSection .menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLessonOptions(temp);
    };
    section.appendChild(btn);
  });
}

function createDaySelector(temp, count, baseLessonNo) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '8px';
  container.style.marginTop = '8px';

  const minusBtn = document.createElement('button');
  minusBtn.textContent = '－';
  minusBtn.className = 'menu-btn small';

  const input = document.createElement('input');
  input.type = 'number';
  input.value = 1;
  input.min = 1;
  input.max = count;
  input.style.width = '60px';
  input.style.textAlign = 'center';

  const plusBtn = document.createElement('button');
  plusBtn.textContent = '＋';
  plusBtn.className = 'menu-btn small';

  const setLessonNo = () => {
    let day = parseInt(input.value);
    if (isNaN(day)) day = 1;
    if (day < 1) day = 1;
    if (day > count) day = count;
    input.value = day;
    temp.LessonNo = baseLessonNo + (day - 1);
  };

  minusBtn.onclick = () => {
    input.value = Math.max(1, parseInt(input.value || '1') - 1);
    setLessonNo();
  };

  plusBtn.onclick = () => {
    input.value = Math.min(count, parseInt(input.value || '1') + 1);
    setLessonNo();
  };

  input.oninput = setLessonNo;

  container.appendChild(minusBtn);
  container.appendChild(input);
  container.appendChild(plusBtn);

  setLessonNo(); // ✅ 초기값 설정

  return container;
}

function renderLessonOptions(temp) {
  const section = document.getElementById('lessonSection');
  if (!section) return;
  section.innerHTML = 'Day를 골라주세요:<br>';

  const RANGES = {
     '단어': {
      'A1': [1, 45],
      'A2': [46, 89],
      'B1': [90, 130],
      'B2': [131, 201],
      'C1': [202, 265]
    },
    '연어': {
      '900핵심연어': [1, 42]
    },
    '문법': {
      'Basic': [1, 50]
    },
    '단계별 독해': {
      'RCStepper': [1, 50]
    }
  };

  const range = RANGES[temp.Subcategory]?.[temp.Level];
  if (!range) return;

  const [start, end] = range;
  const count = end - start + 1;
  const selector = createDaySelector(temp, count, start);
  section.appendChild(selector);
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
