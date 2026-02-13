// kiosk_subpopup.js

window.selectedItems = [];

function getDayManager() {
  return window.DayManager || null;
}

function resolveSubcategoryName(subcategory) {
  const dm = getDayManager();
  if (!subcategory || !dm || typeof dm.resolveSubcategoryName !== 'function') return subcategory;
  return dm.resolveSubcategoryName(subcategory) || subcategory;
}

function needsLevelAndDay(subcategory) {
  const dm = getDayManager();
  const canonicalSub = resolveSubcategoryName(subcategory);
  if (!dm || typeof dm.listLevels !== 'function') return true;
  const levels = dm.listLevels(canonicalSub) || [];
  return levels.length > 0;
}

function setAddButtonEnabled(enabled) {
  const addBtn = document.getElementById('subPopupAddBtn');
  if (!addBtn) return;
  addBtn.disabled = !enabled;
  addBtn.style.opacity = enabled ? '1' : '0.45';
  addBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

function updateSelectedDisplay() {
  const list = document.getElementById('selectedList');
  if (!list) return;
  list.innerHTML = '';

  selectedItems.forEach((item, index) => {
    const tag = document.createElement('div');
    tag.className = 'selected-tag';

    let dayStr = '';
    if (item.Level && item.LessonNo !== undefined) {
      const dm = getDayManager();
      const canonicalSub = resolveSubcategoryName(item.Subcategory);
      const day = dm && typeof dm.getDay === 'function'
        ? dm.getDay(canonicalSub, item.Level, item.LessonNo)
        : null;
      if (day != null) dayStr = ` - Day ${day}`;
    }

    tag.innerHTML = `
      ${item.label}${item.Subcategory ? ' - ' + item.Subcategory : ''}
      ${item.Level ? ' - ' + item.Level : ''}
      ${dayStr}
      <span class="remove-tag" data-index="${index}">✖</span>
    `;
    list.appendChild(tag);
  });

  document.querySelectorAll('.remove-tag').forEach(span => {
    span.onclick = () => {
      const idx = parseInt(span.dataset.index, 10);
      selectedItems.splice(idx, 1);
      updateSelectedDisplay();
    };
  });
}

// ✅ 기본 서브팝업 (단어/문법/독해/구문)
function renderBasicSubPopup(label) {
  const subPopup = document.getElementById('sub-popup');
  const container = document.querySelector('.sub-popup-inner');
  if (!subPopup || !container) return;

  subPopup.classList.remove('hidden');
  container.innerHTML = '';

  const temp = { label };

  container.innerHTML = `
    <div style="position: relative; min-height: 290px; padding-bottom: 70px;">
      <div class="sub-section" id="subcategorySection"></div>
      <div class="sub-section" id="levelSection"></div>
      <div class="sub-section" id="lessonSection"></div>

      <div class="sub-footer" style="position:absolute; bottom:16px; width:100%; text-align:center;">
        <button class="order-btn confirm-btn" id="subPopupAddBtn">🛒 담기</button>
      </div>
    </div>
  `;

  document.getElementById('subPopupCloseBtn').onclick = () => {
    subPopup.classList.add('hidden');
  };

  document.getElementById('subPopupAddBtn').onclick = () => {
    const requiresProgress = needsLevelAndDay(temp.Subcategory);
    if (temp.Subcategory && !requiresProgress) {
      alert('다음 업데이트를 기다려주세요!');
      return;
    }

    const isValid =
      temp.Subcategory &&
      (
        (temp.Level && temp.LessonNo !== undefined && temp.LessonNo !== null)
      );

    if (isValid) {
      const duplicate = selectedItems.some(
        item =>
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

  setAddButtonEnabled(false);
  renderSubcategoryOptions(label, temp);
}

function renderSubcategoryOptions(label, temp) {
  const section = document.getElementById('subcategorySection');
  if (!section) return;

  const dm = getDayManager();
  const subcategories =
    dm && typeof dm.listSubcategories === 'function'
      ? dm.listSubcategories(label)
      : [];

  section.innerHTML = '세부 유형을 골라주세요:<br>';
  (subcategories || []).forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn small';
    btn.innerText = sub;
    btn.onclick = () => {
      temp.Subcategory = resolveSubcategoryName(sub);
      temp.Level = null;
      temp.LessonNo = null;
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

  const dm = getDayManager();
  const sub = resolveSubcategoryName(temp.Subcategory);
  const levels =
    dm && typeof dm.listLevels === 'function'
      ? dm.listLevels(sub)
      : [];

  if (!levels || levels.length === 0) {
    temp.Level = null;
    temp.LessonNo = null;
    section.innerHTML = '다음 업데이트를 기다려주세요!';
    const lessonSection = document.getElementById('lessonSection');
    if (lessonSection) lessonSection.innerHTML = '';
    setAddButtonEnabled(false);
    alert('다음 업데이트를 기다려주세요!');
    return;
  }

  setAddButtonEnabled(false);
  section.innerHTML = '난이도를 골라주세요:<br>';
  (levels || []).forEach(level => {
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

function renderLessonOptions(temp) {
  const section = document.getElementById('lessonSection');
  if (!section) return;

  section.innerHTML = 'Day를 골라주세요:<br>';
  const dm = getDayManager();
  const sub = resolveSubcategoryName(temp.Subcategory);
  const range = dm && typeof dm.getRange === 'function'
    ? dm.getRange(sub, temp.Level)
    : null;
  if (!range) return;
  const { start, end } = range;
  const total = end - start + 1;

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '8px';
  wrapper.style.marginTop = '8px';

  const minus = document.createElement('button');
  minus.textContent = '－';
  const plus = document.createElement('button');
  plus.textContent = '＋';
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.pattern = '[0-9]*';
  input.value = 1;
  input.style.width = '60px';
  input.style.textAlign = 'center';

  let currentDay = 1;

  const dayToLessonNo = day => start + (day - 1);

  const parseTypedDay = raw => {
    if (!/^\d+$/.test(raw)) return null;
    const day = Number(raw);
    if (day < 1 || day > total) return null;
    return day;
  };

  const setDay = day => {
    const next = Math.min(Math.max(Number(day) || 1, 1), total);
    currentDay = next;
    input.value = String(next);
    temp.LessonNo = dayToLessonNo(next);
    setAddButtonEnabled(true);
  };

  const commitTypedDay = () => {
    const typed = input.value.trim();
    const parsed = parseTypedDay(typed);
    if (parsed == null) {
      setDay(currentDay);
      return;
    }
    setDay(parsed);
  };

  minus.onclick = () => {
    setDay(currentDay - 1);
  };

  plus.onclick = () => {
    setDay(currentDay + 1);
  };

  input.addEventListener('focus', () => {
    input.select();
  });

  input.addEventListener('input', () => {
    const typed = input.value.trim();
    if (typed === '') {
      temp.LessonNo = null;
      setAddButtonEnabled(false);
      return;
    }

    const parsed = parseTypedDay(typed);
    if (parsed == null) {
      temp.LessonNo = null;
      setAddButtonEnabled(false);
      return;
    }

    currentDay = parsed;
    temp.LessonNo = dayToLessonNo(parsed);
    setAddButtonEnabled(true);
  });

  input.addEventListener('blur', commitTypedDay);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTypedDay();
      input.blur();
    }
  });

  setDay(1);

  wrapper.appendChild(minus);
  wrapper.appendChild(input);
  wrapper.appendChild(plus);
  section.appendChild(wrapper);
}

// ✅ 셀프 체크 전용 팝업
function renderSelfCheckSubPopup() {
  const container = document.querySelector('.sub-popup-inner');
  const subPopup = document.getElementById('sub-popup');
  if (!container || !subPopup) return;

  subPopup.classList.remove('hidden');
  container.innerHTML = `
    <div style="position: relative; min-height: 240px; padding-bottom: 70px;">
      <div style="margin: 12px 0 18px; font-size: 14px;">
        어떤 셀프 체크를 할지 골라주세요.
      </div>

      <div style="display:flex; gap:10px; justify-content:center; margin-bottom:12px;">
        <button class="menu-btn small" data-selfcheck="베이스 체커">베이스 체커</button>
        <button class="menu-btn small" data-selfcheck="셀프 단어시험">셀프 단어시험</button>
      </div>

      <div class="sub-footer" style="position:absolute; bottom:16px; width:100%; text-align:center;">
        <button class="order-btn confirm-btn" id="subPopupAddBtn">🛒 담기</button>
      </div>
    </div>
  `;

  document.getElementById('subPopupCloseBtn').onclick = () => {
    subPopup.classList.add('hidden');
  };

  let choice = null;
  container.querySelectorAll('[data-selfcheck]').forEach(btn => {
    btn.addEventListener('click', () => {
      choice = btn.getAttribute('data-selfcheck');
      container.querySelectorAll('[data-selfcheck]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.getElementById('subPopupAddBtn').onclick = () => {
    if (!choice) {
      alert('먼저 항목을 선택해주세요!');
      return;
    }
    const duplicate = selectedItems.some(item => item.label === choice);
    if (!duplicate) {
      selectedItems.push({ label: choice });
      updateSelectedDisplay();
    }
    subPopup.classList.add('hidden');
  };
}

// ✅ 기본 renderSubPopup 확장
function renderSubPopup(label) {
  if (label === '셀프 체크') {
    renderSelfCheckSubPopup();
    return;
  }

  const container = document.querySelector('.sub-popup-inner');
  const subPopup = document.getElementById('sub-popup');
  if (!container || !subPopup) return;

  subPopup.classList.remove('hidden');
  container.innerHTML = `
    <div style="position: relative; min-height: 240px; padding-bottom: 70px;">
      <div class="info-message" style="margin-top: 50px;">*상세 내용은 테이블에서 작성해주세요</div>
      <div class="sub-footer" style="position:absolute; bottom:16px; width:100%; text-align:center;">
        <button class="order-btn confirm-btn" id="subPopupAddBtn">🛒 담기</button>
      </div>
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
