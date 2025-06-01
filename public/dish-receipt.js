function showReceiptFromQordered(latestLabel = null) {
  // 애니메이션 스타일이 없으면 추가
  if (!document.getElementById('receipt-animation-style')) {
    const style = document.createElement('style');
    style.id = 'receipt-animation-style';
    style.innerHTML = `
      @keyframes receiptShadowPop {
        0% {
          box-shadow: 0 0 0px rgba(80, 200, 120, 0);
        }
        100% {
          box-shadow: 0 0 30px 25px rgba(80, 200, 120, 0.4);
        }
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
      (p.label === entry.Subcategory || (entry.Subcategory === "Customorder" && p.Subcategory === "Customorder")) &&
      (p.Level == null || p.Level === entry.Level) &&
      (p.LessonNo == null || p.LessonNo === entry.LessonNo) &&
      p.type === 'upload'
    );

    const line = entry.Level && entry.LessonNo
      ? `${entry.Subcategory} (난이도: ${entry.Level}, 범위: ${entry.LessonNo})`
      : `${entry.Subcategory}`;

    const highlight = entry.Subcategory === latestLabel || (entry.Subcategory === "Customorder" && latestLabel === "Customorder");
    const style = `
      ${isChecked ? 'color: green;' : ''}
      ${highlight ? 'font-weight: bold; animation: flashText 0.5s linear 1;' : ''}
    `;

    content += `<div style="${style}">${line}${isChecked ? ' ✔️ Check!' : ''}</div>`;
  });

  content += '</div>';
  container.innerHTML = content;

  document.querySelector('.main-page').appendChild(container);

  setTimeout(() => {
    container.style.opacity = 0;
    setTimeout(() => container.remove(), 1000);
  }, 3000);
}

// receipt 아이콘 연결
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('receipt_icon')?.addEventListener('click', () => {
    showReceiptFromQordered();
  });
});
