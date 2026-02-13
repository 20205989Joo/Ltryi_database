// dish_tray-loader.js

window.addEventListener('DOMContentLoaded', () => {
  const trayArea = document.getElementById('tray-area');
  if (!trayArea) {
    console.warn('❌ tray-area가 존재하지 않습니다.');
    return;
  }

  const qordered = JSON.parse(localStorage.getItem('HWPlus') || '[]');
  const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');

  const baseOffset = 10;
  const gap = 90;

  function getDayManager() {
    return window.DayManager || null;
  }

  function resolveSubcategoryName(subcategory) {
    const dm = getDayManager();
    if (!subcategory || !dm || typeof dm.resolveSubcategoryName !== 'function') return subcategory;
    return dm.resolveSubcategoryName(subcategory) || subcategory;
  }

  function getLevelDayMeta(subcategory, level, lessonNo) {
    const dm = getDayManager();
    const canonicalSub = resolveSubcategoryName(subcategory);
    const lesson = lessonNo != null ? Number(lessonNo) : null;

    let resolvedLevel = level ?? null;
    if (!resolvedLevel && dm && typeof dm.inferLevel === 'function' && lesson != null) {
      const inferred = dm.inferLevel(canonicalSub, lesson);
      resolvedLevel = inferred?.level ?? null;
    }

    let day = null;
    if (dm && resolvedLevel && typeof dm.getDay === 'function' && lesson != null) {
      day = dm.getDay(canonicalSub, resolvedLevel, lesson);
    }

    return {
      subcategory: canonicalSub,
      level: resolvedLevel,
      day
    };
  }

  // ✅ 공통 "완료됨" 처리 (부제목에 붙이기)
  function disableDish(dish) {
    dish.style.pointerEvents = 'none';
    dish.style.opacity = '0.3';
    dish.style.color = 'rgb(2, 47, 61)';

    const subtitleEl = dish.querySelector('.dish-subtitle');
    if (subtitleEl) {
      const txt = subtitleEl.textContent.trim();
      if (!txt.includes('완료됨')) {
        subtitleEl.textContent = txt ? `${txt} · 완료됨` : '완료됨';
      }
      subtitleEl.style.color = '#666';
      subtitleEl.style.opacity = '0.9';
    } else {
      // 부제목이 전혀 없는 예외 상황 대비
      const inner = dish.querySelector('.dish-inner') || dish;
      const sub = document.createElement('div');
      sub.className = 'dish-subtitle';
      sub.textContent = '완료됨';
      sub.style.fontSize = '10px';
      sub.style.color = '#666';
      sub.style.marginTop = '2px';
      sub.style.textAlign = 'center';
      inner.appendChild(sub);
    }
  }

  qordered.forEach((item, index) => {
    const canonicalSub = resolveSubcategoryName(item.Subcategory);
    item.Subcategory = canonicalSub;

    const dish = document.createElement('div');
    dish.className = 'dish';
    dish.style.left = `${baseOffset + (index % 3) * gap}px`;
    dish.style.top = `${baseOffset + Math.floor(index / 3) * gap}px`;

    // ✅ dataset으로 이 접시의 키 저장
    dish.dataset.subcategory = canonicalSub || '';
    dish.dataset.level = item.Level ?? '';
    dish.dataset.lessonNo =
      item.LessonNo != null ? String(item.LessonNo) : '';

    // ✅ 부제목용 Level / Day 계산
    const meta = getLevelDayMeta(canonicalSub, item.Level, item.LessonNo);
    const level = meta.level;
    const day = meta.day;

    let subtitleText = '';
    if (level && day != null) {
      subtitleText = `${level} · Day ${day}`;
    } else if (level) {
      subtitleText = `${level}`;
    } else if (item.LessonNo != null) {
      subtitleText = `Day ${item.LessonNo}`;
    }

    // ✅ 내부 컨테이너 만들기 (세로 정렬 강제)
    const inner = document.createElement('div');
    inner.className = 'dish-inner';
    inner.style.display = 'flex';
    inner.style.flexDirection = 'column';
    inner.style.alignItems = 'center';
    inner.style.justifyContent = 'center';
    inner.style.width = '100%';
    inner.style.height = '100%';
    inner.style.textAlign = 'center';

    const titleEl = document.createElement('div');
    titleEl.className = 'dish-title';
    titleEl.textContent = canonicalSub;
    titleEl.style.fontWeight = 'bold';

    const subtitleEl = document.createElement('div');
    subtitleEl.className = 'dish-subtitle';
    subtitleEl.textContent = subtitleText;
    subtitleEl.style.fontSize = '10px';
    subtitleEl.style.marginTop = '2px';
    subtitleEl.style.color = '#234';

    inner.appendChild(titleEl);
    inner.appendChild(subtitleEl);
    dish.appendChild(inner);

    // ✅ 폰트 크기 자동 조절 – 제목에만 적용
    if (typeof window.adjustFontSize === 'function') {
      window.adjustFontSize(titleEl);
    }

    // ✅ 이미 완료된 접시인지 PendingUploads 기준으로 체크
    const isDone = pending.some(p =>
      resolveSubcategoryName(p.Subcategory) === canonicalSub &&
      (p.Level == null || p.Level === item.Level) &&
      (p.LessonNo == null || String(p.LessonNo) === String(item.LessonNo)) &&
      p.Status === 'readyToBeSent'
    );

    if (isDone) {
      disableDish(dish);
    } else {
      dish.addEventListener('click', () => {
        if (typeof window.showDishPopup === 'function') {
          window.showDishPopup(item);
        } else {
          console.warn('❌ showDishPopup 함수가 없습니다.');
        }
      });
    }

    trayArea.appendChild(dish);
  });

  // ✅ 숙제 완료 시 PendingUploads에 기록 + 해당 접시만 완료 처리
  window.storePendingHomework = function (entry) {
    const userId = new URLSearchParams(window.location.search).get('id');
    const key = 'PendingUploads';
    let existing = JSON.parse(localStorage.getItem(key) || '[]');

    const subcategory = entry.Subcategory;
    const canonicalSub = resolveSubcategoryName(subcategory);
    const level = entry.Level ?? null;
    const lessonNo = entry.LessonNo ?? null;

    // 같은 유저 / 같은 과목+레벨+LessonNo 인 기존 pending 제거
    existing = existing.filter(e =>
      !(
        resolveSubcategoryName(e.Subcategory) === canonicalSub &&
        (e.Level ?? null) === level &&
        (e.LessonNo ?? null) === lessonNo &&
        e.UserId === userId
      )
    );

    const newEntry = {
      UserId: userId,
      Subcategory: canonicalSub,
      Level: level,
      HWType: entry.HWType || 'pdf사진',
      LessonNo: lessonNo,
      Status: 'readyToBeSent',
      Score: null,
      orderedFileURL: null,
      servedFileURL: null,
      timestamp: new Date().toISOString(),
      comment: entry.comment || '',
      feedbackcomment: null
    };

    existing.push(newEntry);
    localStorage.setItem(key, JSON.stringify(existing));

    console.log('📦 [저장 후 PendingUploads]', existing);

    // ✅ 방금 저장한 항목과 동일한 접시만 "완료됨" 표시
    document.querySelectorAll('.dish').forEach(dish => {
      const dishSub = dish.dataset.subcategory;
      const dishLevel = dish.dataset.level || null;
      const dishLessonNo =
        dish.dataset.lessonNo !== '' ? Number(dish.dataset.lessonNo) : null;

      if (
        dishSub === canonicalSub &&
        (level == null || dishLevel === level) &&
        (lessonNo == null || dishLessonNo === Number(lessonNo))
      ) {
        disableDish(dish);
      }
    });
  };

  // ✅ 퀴즈에서 돌아온 경우: 해당 dish 팝업 자동 오픈
  const params = new URLSearchParams(window.location.search);
  const autoQuizKey = params.get('quizKey');

  if (
    autoQuizKey &&
    typeof window.buildFilename === 'function' &&
    typeof window.showDishPopup === 'function'
  ) {
    try {
      const target = qordered.find(item => {
        try {
          const filename = window.buildFilename(item);
          if (!filename) return false;
          const keyWithoutExt = filename.replace(/\.pdf$/, '');
          return keyWithoutExt === autoQuizKey;
        } catch (e) {
          console.warn('🚫 buildFilename 실패:', e);
          return false;
        }
      });

      if (target) {
        // DOM 렌더링이 모두 끝난 뒤 살짝 딜레이 후 팝업 오픈
        setTimeout(() => {
          window.showDishPopup(target);
        }, 50);
      }
    } catch (err) {
      console.warn('자동 팝업 열기 실패:', err);
    }
  }
});

// ⛏️ 다운로드/제출 기록 전체 초기화용 (디버그용 버튼에서 쓸 수 있음)
window.clearDownloadHistory = function () {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('downloaded_HW_')) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('PendingUploads');
  alert('📦 다운로드 및 제출 기록이 초기화되었습니다!');
};
