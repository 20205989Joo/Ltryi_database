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

  qordered.forEach((item, index) => {
    const dish = document.createElement('div');
    dish.className = 'dish';
    dish.textContent = item.Subcategory;
    dish.style.left = `${baseOffset + (index % 3) * gap}px`;
    dish.style.top = `${baseOffset + Math.floor(index / 3) * gap}px`;

    // ✅ 폰트 크기 자동 조절
    if (typeof window.adjustFontSize === 'function') {
      window.adjustFontSize(dish);
    }

    // ✅ 이미 완료된 항목 처리
const isDone = pending.some(p =>
  (p.label === item.Subcategory || p.Subcategory === item.Subcategory) &&
  (p.Level == null || p.Level === item.Level) &&
  (p.LessonNo == null || p.LessonNo === item.LessonNo) &&
  p.Status === 'readyToBeSent'
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

  // ✅ 숙제 완료 시 기록 저장 함수 정의
window.storePendingHomework = function(entry) {
  const userId = new URLSearchParams(window.location.search).get('id');
  const key = 'PendingUploads';
  let existing = JSON.parse(localStorage.getItem(key) || '[]');

  existing = existing.filter(e =>
    !(e.Subcategory === entry.Subcategory && e.LessonNo === entry.LessonNo && e.UserId === userId)
  );

  const newEntry = {
    UserId: userId,
    Subcategory: entry.Subcategory,
   HWType: entry.HWType || 'pdf사진',
    LessonNo: entry.LessonNo,
    Status: "readyToBeSent",
    Score: null,
    orderedFileURL: null,
    servedFileURL: null,
    timestamp: new Date().toISOString(),
    comment: entry.comment || "",
    feedbackcomment: null
  };

  existing.push(newEntry);
  localStorage.setItem(key, JSON.stringify(existing));

  // ✅ 바로 로그 출력
  console.log("📦 [저장 후 PendingUploads]", existing);

  // 시각 효과는 그대로 유지
  document.querySelectorAll('.dish').forEach(dish => {
    if (dish.textContent === entry.Subcategory) {
      dish.style.pointerEvents = 'none';
      dish.style.opacity = '0.3';
      dish.style.color = 'rgb(2, 47, 61)';
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


});

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

