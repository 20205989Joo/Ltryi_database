const RECEIPT_RANGES = {
  '단어': {
    'A1': [1, 45],
    'A2': [46, 89],
    'B1': [90, 130],
    'B2': [131, 201],
    'C1': [202, 266]
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

function inferLevel(subcategory, level, lessonNo) {
  const range = RECEIPT_RANGES?.[subcategory]?.[level];
  if (!range) return null;
  const [start, end] = range;
  if (lessonNo >= start && lessonNo <= end) {
    const day = lessonNo - start + 1;
    return { start, day };
  }
  return null;
}

window.handleFinalOrder = function () {
  const MAX_LIMIT = 6;

  // ✅ 이미 고른 항목 체크
  if (!Array.isArray(window.selectedItems) || window.selectedItems.length === 0) {
    alert("선택된 항목이 없습니다.");
    return;
  }

  if (window.selectedItems.length > MAX_LIMIT) {
    alert(`❌ 하루 최대 ${MAX_LIMIT}개까지만 주문할 수 있어요!\n현재 ${window.selectedItems.length}개 담으셨습니다.`);
    return;
  }

  // ✅ 이하 기존 로직 유지
  const hwPlusEntries = [];
  let receiptText = '';

  window.selectedItems.forEach(entry => {
    if (entry.Subcategory && entry.Level && entry.LessonNo !== undefined) {
      hwPlusEntries.push({
        Subcategory: entry.Subcategory,
        Level: entry.Level,
        LessonNo: entry.LessonNo
      });

      const meta = inferLevel(entry.Subcategory, entry.Level, entry.LessonNo);
      const dayStr = meta ? `Day ${meta.day}` : `Lesson ${entry.LessonNo}`;
      receiptText += `${entry.label || entry.Subcategory} > ${entry.Level} > ${dayStr}\n`;
    } else {
      hwPlusEntries.push({
        Subcategory: entry.label,
        Level: null,
        LessonNo: null
      });
      receiptText += `${entry.label}\n`;
    }
  });

  localStorage.setItem('HWPlus', JSON.stringify(hwPlusEntries));
  console.log("✅ [저장된 HWPlus]:", hwPlusEntries);

  const popup = document.getElementById('popup');
  if (popup) popup.style.display = 'none';

  const tray = document.getElementById('food-tray');
  if (tray) tray.style.display = 'block';

  if (!document.getElementById('receipt_icon')) {
    const icon = document.createElement('img');
    icon.src = 'receipt_icon.png';
    icon.id = 'receipt_icon';
    icon.className = 'receipt-icon';
    icon.onclick = () => window.showReceiptFromHWPlus();  // ✅ 최신 반영
    document.querySelector('.main-page').appendChild(icon);
  }

  showReceiptAgain(receiptText);
};


function showReceiptAgain(text) {
  const existing = document.getElementById('temp-receipt');
  if (existing) existing.remove();

  const receipt = document.createElement('div');
  receipt.id = 'temp-receipt';
  receipt.className = 'receipt-box';
  receipt.innerHTML = `
    <div class="receipt-title">📄 주문 영수증</div>
    <div class="receipt-content">${text.trim().replace(/\n/g, '<br>')}</div>
    <div style="text-align: right;">
      <button class="room-btn" style="
        background-color : rgb(241, 96, 91);
        color: rgb(254, 254, 254);
        font-size: 12px;
        padding: 4px 8px;
        height: auto;
        box-shadow: none;
        border: 1px solid #ccc;
        border-radius: 6px;
        cursor: pointer;
      " id="cancelOrderBtn">🗑 주문 취소</button>
    </div>
  `;
  document.querySelector('.main-page').appendChild(receipt);

  document.getElementById('cancelOrderBtn')?.addEventListener('click', () => {
    localStorage.removeItem('HWPlus');
    receipt.remove();
    const icon = document.getElementById('receipt_icon');
    if (icon) icon.remove();
    alert('🗑 주문이 취소되었습니다!');
    location.reload();
  });

  setTimeout(() => {
    receipt.style.opacity = 0;
    setTimeout(() => receipt.remove(), 1000);
  }, 3000);
}

window.showReceiptFromHWPlus = function () {
  const hwPlusEntries = JSON.parse(localStorage.getItem('HWPlus') || '[]');
  if (hwPlusEntries.length === 0) return;

  let receiptText = '';
  hwPlusEntries.forEach(entry => {
    if (entry.Subcategory && entry.Level && entry.LessonNo !== undefined) {
      const meta = inferLevel(entry.Subcategory, entry.Level, entry.LessonNo);
      const dayStr = meta ? `Day ${meta.day}` : `Day ${entry.LessonNo}`;
      receiptText += `${entry.Subcategory} > ${entry.Level} > ${dayStr}\n`;
    } else {
      receiptText += `${entry.Subcategory || entry.label || '기타'}\n`;
    }
  });

  showReceiptAgain(receiptText);
};
