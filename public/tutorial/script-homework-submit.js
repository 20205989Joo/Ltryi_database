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
      <input type="file" class="file-input" data-label="${item.label}" style="margin-top: 6px; width: 100%;" />
    `;

    pendingList.appendChild(card);
  });

  const submitBtn = document.getElementById('hwSubmitbutton');
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      let updated = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
      let qordered = JSON.parse(localStorage.getItem('Qordered') || '[]');
      let anySubmitted = false;

      for (let i = 0; i < updated.length; i++) {
        const item = updated[i];
        const input = document.querySelector(`.file-input[data-label="${item.label}"]`);
        const file = input?.files?.[0];

        if (!file) {
          console.warn(`📭 [${item.label}] 파일이 선택되지 않음 – 제출 생략`);
          continue;
        }

        const formData = new FormData();
        formData.append("UserId", userId);
        formData.append("QLevel", item.QLevel ?? '7');
        formData.append("QYear", year.toString());
        formData.append("QMonth", month.toString());
        formData.append("QNo", item.QNo ?? '1');
        formData.append("WhichHW", item.label); // ✅ 한글 그대로
        const comment = [item.comment, item.detail].filter(Boolean).join(' - ') || item.label;
        formData.append("Comment", comment);
        formData.append("HWImage", file);

        for (let pair of formData.entries()) {
          console.log(`📤 ${pair[0]} →`, pair[1]);
        }

        try {
          const res = await fetch("https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveHWImages", {
            method: "POST",
            body: formData
          });

          const result = await res.json();

          if (res.ok) {
            alert(`✅ ${item.label} 제출 완료!\nURL: ${result.url}`);
            updated[i] = null;
            // ✅ Qordered에서도 제거
            qordered = qordered.filter(entry => entry.WhichHW !== item.label);
            anySubmitted = true;
          } else {
            alert(`❌ ${item.label} 제출 실패: ${result.message}`);
          }
        } catch (err) {
          alert(`🚨 ${item.label} 서버 오류`);
          console.error(err);
        }
      }

      localStorage.setItem('PendingUploads', JSON.stringify(updated.filter(Boolean)));
      localStorage.setItem('Qordered', JSON.stringify(qordered));
      localStorage.setItem('tutorial_submit', 'done');

      if (anySubmitted) location.reload();
      else alert("📎 선택된 파일이 없거나 전송할 항목이 없습니다.");
    });
  }
});
