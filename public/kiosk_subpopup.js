// kiosk_subpopup.js

window.selectedItems = [];
const MAX_SELECTION_LIMIT = 6;

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

function getLevelVisual(subcategory, level) {
  const canonicalSub = resolveSubcategoryName(subcategory);
  if (canonicalSub !== '문법') return null;

  const normalized = String(level || '').trim().toLowerCase();
  if (normalized === 'basic') return { variant: 'basic', rank: '1' };
  if (normalized === 'herma') return { variant: 'herma', rank: '2' };
  if (normalized === 'pleks') return { variant: 'pleks', rank: '3' };
  return null;
}

function setAddButtonEnabled(enabled) {
  const addBtn = document.getElementById('subPopupAddBtn');
  if (!addBtn) return;
  addBtn.disabled = !enabled;
  addBtn.style.opacity = enabled ? '1' : '0.45';
  addBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
}

function isSameSelectionItem(a, b) {
  return (
    (a?.label || null) === (b?.label || null) &&
    (a?.Subcategory || null) === (b?.Subcategory || null) &&
    (a?.Level || null) === (b?.Level || null) &&
    (a?.LessonNo ?? null) === (b?.LessonNo ?? null)
  );
}

function buildProgressEntry(temp, lessonNo) {
  return {
    label: temp.label,
    Subcategory: temp.Subcategory,
    Level: temp.Level,
    LessonNo: lessonNo
  };
}

function collectRangeEntriesToAdd(temp, startLessonNo, endLessonNo) {
  const start = Number(startLessonNo);
  const end = Number(endLessonNo);
  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) return [];

  const results = [];
  for (let lessonNo = start; lessonNo <= end; lessonNo += 1) {
    const entry = buildProgressEntry(temp, lessonNo);
    const duplicate = selectedItems.some(item => isSameSelectionItem(item, entry));
    if (!duplicate) {
      results.push(entry);
    }
  }
  return results;
}

function exceedsSelectionLimit(addCount) {
  return selectedItems.length + Number(addCount || 0) > MAX_SELECTION_LIMIT;
}

function getRemainingSelectionSlots() {
  return Math.max(0, MAX_SELECTION_LIMIT - selectedItems.length);
}

function alertSelectionLimit() {
  const remaining = getRemainingSelectionSlots();
  if (remaining <= 0) {
    alert(`최대 ${MAX_SELECTION_LIMIT}개까지 담을 수 있어요.\n지금은 더 담을 수 없어요.`);
    return;
  }
  alert(`최대 ${MAX_SELECTION_LIMIT}개까지 담을 수 있어요.\n지금은 ${remaining}개까지 더 담을 수 있어요.`);
}

function updateSelectedDisplay() {
  const list = document.getElementById('selectedList');
  if (!list) return;
  list.innerHTML = '';

  selectedItems.forEach((item, index) => {
    const tag = document.createElement('div');
    tag.className = 'selected-tag';

    let dayLabel = '';
    if (item.Level && item.LessonNo !== undefined) {
      const dm = getDayManager();
      const canonicalSub = resolveSubcategoryName(item.Subcategory);
      const day = dm && typeof dm.getDay === 'function'
        ? dm.getDay(canonicalSub, item.Level, item.LessonNo)
        : null;
      if (day != null) dayLabel = `Day ${day}`;
    }

    const mainLabel = item.Subcategory || item.label || '기타';
    const parts = [mainLabel];
    if (item.Level) parts.push(item.Level);
    if (dayLabel) parts.push(dayLabel);

    tag.innerHTML = `
      ${parts.join(' - ')}
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
    <div style="position: relative; min-height: 330px; padding-bottom: 70px;">
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

    const hasBaseSelection = temp.Subcategory && temp.Level;
    const daySelection = temp.DaySelection || null;
    const isMultiReady =
      daySelection &&
      daySelection.mode === 'multi' &&
      daySelection.phase === 'ready' &&
      Number.isInteger(daySelection.startLessonNo) &&
      Number.isInteger(daySelection.endLessonNo);

    if (!hasBaseSelection) {
      alert('모든 항목을 선택해주세요!');
      return;
    }

    if (isMultiReady) {
      const entriesToAdd = collectRangeEntriesToAdd(
        temp,
        daySelection.startLessonNo,
        daySelection.endLessonNo
      );

      if (entriesToAdd.length === 0) {
        alert('이미 담긴 Day 범위예요.');
        return;
      }

      if (exceedsSelectionLimit(entriesToAdd.length)) {
        alertSelectionLimit();
        return;
      }

      selectedItems.push(...entriesToAdd);
      updateSelectedDisplay();
      subPopup.classList.add('hidden');
      return;
    }

    const hasSingleDay = temp.LessonNo !== undefined && temp.LessonNo !== null;
    if (!hasSingleDay) {
      alert('모든 항목을 선택해주세요!');
      return;
    }

    const singleEntry = buildProgressEntry(temp, temp.LessonNo);
    const duplicate = selectedItems.some(item => isSameSelectionItem(item, singleEntry));

    if (duplicate) {
      alert('이미 담긴 Day예요.');
      return;
    }

    if (exceedsSelectionLimit(1)) {
      alertSelectionLimit();
      return;
    }

    selectedItems.push(singleEntry);
    updateSelectedDisplay();
    subPopup.classList.add('hidden');
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

  section.innerHTML = `
    <div class="sub-section-header">
      <span class="sub-section-title">세부 유형을 선택해주세요</span>
    </div>
    <div class="sub-option-grid"></div>
  `;
  const optionGrid = section.querySelector('.sub-option-grid');

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
    optionGrid?.appendChild(btn);
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
  section.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'sub-section-header';
  header.innerHTML = '<span class="sub-section-title">난이도를 선택해주세요</span>';
  section.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'level-grid';
  section.appendChild(grid);

  (levels || []).forEach(level => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn small level-btn';

    const visual = getLevelVisual(sub, level);
    if (visual?.variant) btn.classList.add(`level-${visual.variant}`);

    if (visual?.rank) {
      btn.classList.add('has-rank');
      const levelRank = document.createElement('span');
      levelRank.className = 'level-rank';
      levelRank.textContent = visual.rank;
      btn.appendChild(levelRank);
    }

    const levelName = document.createElement('span');
    levelName.className = 'level-name';
    levelName.textContent = level;
    btn.appendChild(levelName);

    btn.onclick = () => {
      temp.Level = level;
      document.querySelectorAll('#levelSection .menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLessonOptions(temp);
    };
    grid.appendChild(btn);
  });
}

function renderLessonOptions(temp) {
  const section = document.getElementById('lessonSection');
  if (!section) return;

  const dm = getDayManager();
  const sub = resolveSubcategoryName(temp.Subcategory);
  const range = dm && typeof dm.getRange === 'function'
    ? dm.getRange(sub, temp.Level)
    : null;
  if (!range) return;
  const { start, end } = range;
  const totalFromManager = dm && typeof dm.getTotalDays === 'function'
    ? dm.getTotalDays(sub, temp.Level)
    : null;
  const total = Number.isInteger(totalFromManager) && totalFromManager > 0
    ? totalFromManager
    : (end - start + 1);

  section.innerHTML = `
    <div class="sub-section-header sub-section-header--day">
      <span class="sub-section-title">Day를 선택해주세요</span>
      <span class="sub-section-hint-inline">1 ~ ${total} Day</span>
    </div>
  `;

  const dayTitle = section.querySelector('.sub-section-title');
  const dayHint = section.querySelector('.sub-section-hint-inline');
  const addBtn = document.getElementById('subPopupAddBtn');

  const wrapper = document.createElement('div');
  wrapper.className = 'day-stepper';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'day-stepper-btn';
  minus.textContent = '－';
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'day-stepper-btn';
  plus.textContent = '＋';
  const input = document.createElement('input');
  input.className = 'day-stepper-input';
  input.type = 'text';
  input.inputMode = 'numeric';
  input.pattern = '[0-9]*';
  input.value = 1;

  let currentDay = 1;
  const daySelection = {
    mode: 'single',
    phase: 'idle',
    startDay: null,
    endDay: null,
    startLessonNo: null,
    endLessonNo: null
  };
  temp.DaySelection = daySelection;

  const dayToLessonNo = day => start + (day - 1);

  const parseTypedDay = raw => {
    if (!/^\d+$/.test(raw)) return null;
    const day = Number(raw);
    if (day < 1 || day > total) return null;
    return day;
  };

  const setAddButtonMode = (mode, enabled) => {
    if (addBtn) {
      if (mode === 'multi') {
        addBtn.textContent = '🧺 여러개 담기';
        addBtn.classList.add('multi-add-mode');
      } else {
        addBtn.textContent = '🛒 담기';
        addBtn.classList.remove('multi-add-mode');
      }
    }
    setAddButtonEnabled(enabled);
  };

  const applyDayGuide = guide => {
    if (!dayTitle || !dayHint) return;
    dayTitle.classList.remove('day-guide-start', 'day-guide-end');

    if (guide === 'start') {
      dayTitle.textContent = '시작 day를 선택해주세요';
      dayTitle.classList.add('day-guide-start');
      dayHint.textContent = `1 ~ ${total} Day`;
      return;
    }

    if (guide === 'end') {
      dayTitle.textContent = '끝 day를 선택해주세요';
      dayTitle.classList.add('day-guide-end');
      dayHint.textContent = daySelection.startDay != null
        ? `시작: Day ${daySelection.startDay}`
        : `1 ~ ${total} Day`;
      return;
    }

    if (guide === 'ready') {
      dayTitle.textContent = '끝 day를 선택해주세요';
      dayTitle.classList.add('day-guide-end');
      dayHint.textContent = daySelection.startDay != null && daySelection.endDay != null
        ? `선택: Day ${daySelection.startDay} ~ Day ${daySelection.endDay}`
        : `1 ~ ${total} Day`;
      return;
    }

    dayTitle.textContent = 'Day를 선택해주세요';
    dayHint.textContent = `1 ~ ${total} Day`;
  };

  const multiToggleBtn = document.createElement('button');
  multiToggleBtn.type = 'button';
  multiToggleBtn.className = 'day-multi-toggle-btn';
  multiToggleBtn.textContent = '여러개 담기';

  const setMultiToggleState = ({ text, modeClass = '', disabled = false }) => {
    multiToggleBtn.textContent = text;
    multiToggleBtn.classList.remove('mode-start', 'mode-end');
    if (modeClass) {
      multiToggleBtn.classList.add(modeClass);
    }
    multiToggleBtn.disabled = !!disabled;
  };

  const setDay = day => {
    const next = Math.min(Math.max(Number(day) || 1, 1), total);
    currentDay = next;
    input.value = String(next);

    if (daySelection.mode === 'single') {
      temp.LessonNo = dayToLessonNo(next);
      setAddButtonMode('single', true);
      return;
    }

    temp.LessonNo = null;

    if (daySelection.phase === 'ready') {
      daySelection.phase = 'end';
      daySelection.endDay = null;
      daySelection.endLessonNo = null;
      applyDayGuide('end');
      setMultiToggleState({ text: '여기까지 끝', modeClass: 'mode-end', disabled: false });
      setAddButtonMode('multi', false);
      return;
    }

    if (daySelection.phase === 'start') {
      setAddButtonMode('single', false);
      return;
    }

    setAddButtonMode('multi', false);
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

  const startMultiSelection = () => {
    daySelection.mode = 'multi';
    daySelection.phase = 'start';
    daySelection.startDay = null;
    daySelection.endDay = null;
    daySelection.startLessonNo = null;
    daySelection.endLessonNo = null;

    temp.LessonNo = null;
    applyDayGuide('start');
    setMultiToggleState({ text: '여기서 시작', modeClass: 'mode-start', disabled: false });
    setAddButtonMode('single', false);
  };

  const confirmStartDay = () => {
    daySelection.mode = 'multi';
    daySelection.phase = 'end';
    daySelection.startDay = currentDay;
    daySelection.startLessonNo = dayToLessonNo(currentDay);
    daySelection.endDay = null;
    daySelection.endLessonNo = null;

    applyDayGuide('end');
    setMultiToggleState({ text: '여기까지 끝', modeClass: 'mode-end', disabled: false });
    setAddButtonMode('multi', false);
  };

  const confirmEndDay = () => {
    if (!Number.isInteger(daySelection.startDay)) {
      alert('먼저 시작 Day를 선택해주세요.');
      return;
    }

    if (currentDay < daySelection.startDay) {
      alert('끝 Day는 시작 Day보다 같거나 커야 해요.');
      return;
    }

    const candidateStartLessonNo = daySelection.startLessonNo;
    const candidateEndLessonNo = dayToLessonNo(currentDay);
    const entriesToAdd = collectRangeEntriesToAdd(
      temp,
      candidateStartLessonNo,
      candidateEndLessonNo
    );

    if (entriesToAdd.length === 0) {
      alert('이미 담긴 Day 범위예요.');
      return;
    }

    if (exceedsSelectionLimit(entriesToAdd.length)) {
      alertSelectionLimit();
      return;
    }

    daySelection.phase = 'ready';
    daySelection.endDay = currentDay;
    daySelection.endLessonNo = candidateEndLessonNo;
    applyDayGuide('ready');
    setMultiToggleState({ text: '여기까지 끝', modeClass: 'mode-end', disabled: true });
    setAddButtonMode('multi', true);
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
    setDay(parsed);
  });

  input.addEventListener('blur', commitTypedDay);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTypedDay();
      input.blur();
    }
  });

  multiToggleBtn.addEventListener('click', () => {
    if (multiToggleBtn.disabled) return;

    if (daySelection.mode === 'single') {
      startMultiSelection();
      return;
    }

    if (daySelection.phase === 'start') {
      confirmStartDay();
      return;
    }

    confirmEndDay();
  });

  setDay(1);
  applyDayGuide('single');
  setMultiToggleState({ text: '여러개 담기', modeClass: '', disabled: false });
  setAddButtonMode('single', true);

  wrapper.appendChild(minus);
  wrapper.appendChild(input);
  wrapper.appendChild(plus);
  section.appendChild(wrapper);
  section.appendChild(multiToggleBtn);
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

  if (label === '모의고사 전용도구') {
    const container = document.querySelector('.sub-popup-inner');
    const subPopup = document.getElementById('sub-popup');
    if (!container || !subPopup) return;

    subPopup.classList.remove('hidden');
    container.innerHTML = `
      <div style="position: relative; min-height: 220px; padding-bottom: 70px;">
        <div style="margin: 18px 0 14px; font-size: 14px; text-align:center;">
          모의고사 전용 도구를 상차림에 담습니다.
        </div>
        <div style="font-size:12px; color:#666; text-align:center;">
          담은 뒤 테이블에서 바로 사용할 수 있어요.
        </div>
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
