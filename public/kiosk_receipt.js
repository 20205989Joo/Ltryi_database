// kiosk_receipt.js

window.handleFinalOrder = function () {
  const hwPlusEntries = [];
  let receiptText = '';

  // ✅ selectedItems가 window에 정의되어 있어야 함
  if (!Array.isArray(window.selectedItems) || window.selectedItems.length === 0) {
    alert("선택된 항목이 없습니다.");
    return;
  }

  window.selectedItems.forEach(entry => {
    // 학습형 항목: label, Subcategory, Level, LessonNo가 모두 있는 경우
    if (entry.Subcategory && entry.Level && entry.LessonNo !== undefined) {
      hwPlusEntries.push({
        Subcategory: entry.Subcategory,
        Level: entry.Level,
        LessonNo: entry.LessonNo
      });

      receiptText += `${entry.label} > ${entry.Subcategory} > ${entry.Level} > Day ${entry.LessonNo}\n`;
    }

    // 단순 항목: label만 있는 경우 (e.g. "오늘 내 숙제", "시험지 만들어주세요")
    else {
      hwPlusEntries.push({
        Subcategory: entry.label,
        Level: null,
        LessonNo: null
      });

      receiptText += `${entry.label}\n`;
    }
  });

  // ✅ localStorage에 저장
  localStorage.setItem('HWPlus', JSON.stringify(hwPlusEntries));

  // ✅ 로그 확인
  console.log("✅ [저장된 HWPlus]:", hwPlusEntries);

  // ✅ 팝업 닫기
  const popup = document.getElementById('popup');
  if (popup) popup.style.display = 'none';

  // ✅ 트레이 표시
  const tray = document.getElementById('food-tray');
  if (tray) tray.style.display = 'block';

  // ✅ 영수증 아이콘 생성 (최초만)
  if (!document.getElementById('receipt_icon')) {
    const icon = document.createElement('img');
    icon.src = 'receipt_icon.png';
    icon.id = 'receipt_icon';
    icon.className = 'receipt-icon';
    icon.onclick = () => showReceiptAgain(receiptText);
    document.querySelector('.main-page').appendChild(icon);
  }

  // ✅ 영수증 표시
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

  // 🧹 취소 이벤트
  document.getElementById('cancelOrderBtn')?.addEventListener('click', () => {
    localStorage.removeItem('HWPlus');
    receipt.remove();

    const icon = document.getElementById('receipt_icon');
    if (icon) icon.remove();

    alert('🗑 주문이 취소되었습니다!');
     location.reload(); 
  });

  // 자동 사라짐 (필요 없으면 이 부분 삭제 가능)
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
      receiptText += `${entry.Subcategory} > ${entry.Level} > Day ${entry.LessonNo}\n`;
    } else {
      receiptText += `${entry.Subcategory || entry.label || '기타'}\n`;
    }
  });

  showReceiptAgain(receiptText);
};
