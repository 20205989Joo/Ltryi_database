const urlParams = new URLSearchParams(window.location.search);
const userId = urlParams.get('id');

const kstOffset = 9 * 60 * 60 * 1000;
const now = new Date(Date.now() + kstOffset);
const year = now.getFullYear();
const month = now.getMonth() + 1;

window.addEventListener('DOMContentLoaded', async () => {
  const statusBox = document.getElementById('submissionStatus');
  const pendingList = document.getElementById('pendingList');
  const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');

  try {
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWImages?userId=${userId}`);
    const data = await res.json();
    const todayStr = now.toISOString().split('T')[0];
    const list = Array.isArray(data) ? data : [];
    const hasToday = list.some(item => item.Timestamp?.startsWith(todayStr));

    if (hasToday) {
      statusBox.textContent = "✅ 오늘 숙제 제출됨";
      statusBox.style.backgroundColor = "#a7e9af";
    } else {
      statusBox.textContent = "❌ 오늘 숙제 미제출";
      statusBox.style.backgroundColor = "#f9c0c0";
    }
  } catch (err) {
    console.warn("❗ 오늘 숙제 확인 실패:", err);
    statusBox.textContent = "⚠️ 서버 응답 오류";
    statusBox.style.backgroundColor = "#fdd";
  }

  if (pending.length === 0) {
    pendingList.innerHTML = '<div style="color:#888; font-size:13px;">⏳ 제출 대기 중인 숙제가 없습니다.</div>';
    return;
  }

  pending.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'pending-card';

    const qInfo = (item.QLevel && item.QNo)
      ? `(난이도: ${item.QLevel}, 범위: ${item.QNo})`
      : '';

    const commentLine = [item.comment, item.detail].filter(Boolean).join(' - ') || '설명 없음';

    card.innerHTML = `
      <div><b>${item.label}</b> ${qInfo}</div>
      <div style="font-size: 12px; color: #555;">📝 ${commentLine}</div>
    `;

    const input = document.createElement('input');
    input.type = 'file';
    input.className = 'file-input';
    input.dataset.label = item.label;
    input.style = 'margin-top: 6px; width: 100%;';

    input.addEventListener('change', checkTutorialPendingListReady);

    card.appendChild(input);
    pendingList.appendChild(card);
  });

  const submitBtn = document.getElementById('hwSubmitbutton');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
  showLoadingPopup();

  let updated = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
  let qordered = JSON.parse(localStorage.getItem('Qordered') || '[]');
  let anySubmitted = false;

  for (let i = 0; i < updated.length; i++) {
    const item = updated[i];
    const input = document.querySelector(`.file-input[data-label="${item.label}"]`);
    const file = input?.files?.[0];

    if (!file) continue;

    const formData = new FormData();
    formData.append("UserId", userId);
    formData.append("QLevel", item.QLevel ?? '7');
    formData.append("QYear", year.toString());
    formData.append("QMonth", month.toString());
    formData.append("QNo", item.QNo ?? '1');
    formData.append("WhichHW", item.label);
    const comment = [item.comment, item.detail].filter(Boolean).join(' - ') || item.label;
    formData.append("Comment", comment);
    formData.append("HWImage", file);

    try {
      const res = await fetch("https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveHWImages", {
        method: "POST",
        body: formData
      });

      const result = await res.json();

      if (res.ok) {
        updated[i] = null;
        qordered = qordered.filter(entry => entry.WhichHW !== item.label);
        anySubmitted = true;
      }
    } catch (err) {
      console.error(err);
    }
  }

  localStorage.setItem('PendingUploads', JSON.stringify(updated.filter(Boolean)));
  localStorage.setItem('Qordered', JSON.stringify(qordered));
  localStorage.setItem('tutorial_submit', 'done');

  hideLoadingPopup();

if (anySubmitted) {
  hideLoadingPopup();

  // ✅ 카드들 제거
  pendingList.innerHTML = `
    <div style="color: #1976d2; font-weight: bold; font-size: 14px; text-align: center; padding: 16px;">
      ✅ 모든 숙제가 제출되었습니다.<br>수고하셨어요!
    </div>
  `;

  // ✅ 튜토리얼 step 진행
  if (window.advanceStep) {
    window.advanceStep('done:toserver');
  }
}

});

  }
});

function checkTutorialPendingListReady() {
  const inputs = Array.from(document.querySelectorAll('.file-input'));
  const selected = new Set();

  inputs.forEach((input) => {
    if (input.files?.length > 0) {
      selected.add(input.dataset.label);
    }
  });

  if (selected.size === inputs.length && inputs.length > 0) {
    if (window.advanceStep && !window._tutorialPendingStepFired) {
      window._tutorialPendingStepFired = true;
      window.advanceStep('done:pendinglist');
    }
  }
}

function showLoadingPopup() {
  const popup = document.createElement('div');
  popup.id = 'loadingPopup';
  popup.style = `
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0,0,0,0.5);
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Gowun Batang', sans-serif;
  `;

  popup.innerHTML = `
    <div style="
      background: white;
      padding: 20px 30px;
      border-radius: 12px;
      box-shadow: 0 0 10px rgba(0,0,0,0.3);
      font-size: 16px;
      font-weight: bold;
    ">📤 숙제 전송 중입니다...</div>
  `;

  document.body.appendChild(popup);
}

function hideLoadingPopup() {
  document.getElementById('loadingPopup')?.remove();
}
