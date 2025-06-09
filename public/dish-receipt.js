// ✅ kiosk_receipt.js의 계산 기준 그대로 가져오기
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

function showReceiptFromQordered(latestLabel = null) {
  if (!document.getElementById('receipt-animation-style')) {
    const style = document.createElement('style');
    style.id = 'receipt-animation-style';
    style.innerHTML = `
      @keyframes receiptShadowPop {
        0% { box-shadow: 0 0 0px rgba(80, 200, 120, 0); }
        100% { box-shadow: 0 0 30px 25px rgba(80, 200, 120, 0.4); }
      }
    `;
    document.head.appendChild(style);
  }

  const hwItems = JSON.parse(localStorage.getItem('HWPlus') || '[]');
  const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');

  const container = document.createElement('div');
  container.id = 'temp-receipt';
  container.className = 'receipt-box';
  container.style = `
    position: absolute;
    top: 120px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 2px dashed #444;
    border-radius: 8px;
    width: 240px;
    padding: 16px;
    font-family: monospace;
    font-size: 13px;
    color: #222;
    box-shadow: 2px 2px 8px rgba(0,0,0,0.2);
    z-index: 20;
    opacity: 1;
    transition: opacity 1s ease;
    animation: receiptShadowPop 0.3s ease-out forwards;
  `;

  let content = '<div class="receipt-title">📄 주문 영수증</div><div class="receipt-content">';

  hwItems.forEach(entry => {
    const isChecked = pending.some(p =>
      (p.label === entry.Subcategory || p.Subcategory === entry.Subcategory) &&
      (p.Level == null || p.Level === entry.Level) &&
      (p.LessonNo == null || p.LessonNo === entry.LessonNo) &&
      p.Status === 'readyToBeSent'
    );

    let line = '';
    if (entry.Level && entry.LessonNo !== undefined) {
      const meta = inferLevel(entry.Subcategory, entry.Level, entry.LessonNo);
      const dayStr = meta ? `Day ${meta.day}` : `Lesson ${entry.LessonNo}`;
      line = `${entry.Subcategory} > ${entry.Level} > ${dayStr}`;
    } else {
      line = `${entry.Subcategory}`;
    }

    const highlight = entry.Subcategory === latestLabel || (entry.Subcategory === "Customorder" && latestLabel === "Customorder");
    const style = `
      ${isChecked ? 'color: green;' : ''}
      ${highlight ? 'font-weight: bold; animation: flashText 0.5s linear 1;' : ''}
    `;

    content += `<div style="${style}">${line}${isChecked ? ' ✔️' : ''}</div>`;
  });

  content += '</div>';
  container.innerHTML = content;

  document.querySelector('.main-page').appendChild(container);

  setTimeout(() => {
    container.style.opacity = 0;
    setTimeout(() => container.remove(), 1000);
  }, 3000);
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('receipt_icon')?.addEventListener('click', () => {
    showReceiptFromQordered();
  });
});
