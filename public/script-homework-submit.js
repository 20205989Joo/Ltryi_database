window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');
  const kstOffset = 9 * 60 * 60 * 1000;
  const now = new Date(Date.now() + kstOffset);
  const todayStr = now.toISOString().split('T')[0];

  const statusBox = document.getElementById('submissionStatus');
  const pendingList = document.getElementById('pendingList');
  const submitBtn = document.getElementById("hwSubmitbutton");

  const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
  const hwplus = JSON.parse(localStorage.getItem('HWPlus') || '[]');

  console.log('📦 제출 전 PendingUploads 목록:', pending);

  // ✅ 오늘 숙제 제출 여부 체크
  try {
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWPlus?userId=${userId}`);
    const data = await res.json();
    const hasToday = data.some(item => item.Timestamp?.startsWith(todayStr));
    if (hasToday) {
      statusBox.textContent = "✅ 오늘 숙제 제출됨";
      statusBox.style.backgroundColor = "#a7e9af";
    } else {
      statusBox.textContent = "❌ 오늘 숙제 미제출";
      statusBox.style.backgroundColor = "#f9c0c0";
    }
  } catch (err) {
    console.warn("❗ 오늘 숙제 확인 실패:", err);
  }

  // ✅ 제출 대기 목록 표시
  if (pending.length === 0) {
    pendingList.innerHTML = '<div style="color:#888; font-size:13px;">⏳ 제출 대기 중인 숙제가 없습니다.</div>';
  } else {
    pending.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'pending-card';

      const title = item.Subcategory || '숙제';
      const detail = [item.comment, item.detail].filter(Boolean).join(' - ') || '설명 없음';

      card.innerHTML = `
        <div><b>${title}</b> ${item.LessonNo ? `(Day ${item.LessonNo})` : ''}</div>
        <div style="font-size: 12px; color: #555;">📝 ${detail}</div>
        <input type="file" class="file-input" data-subcategory="${item.Subcategory}" style="margin-top: 6px; width: 100%;" />
      `;

      pendingList.appendChild(card);
    });
  }

  // ✅ 제출 버튼 처리
  if (!submitBtn) return;

  submitBtn.addEventListener("click", async () => {
    let updated = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
    let hwplus = JSON.parse(localStorage.getItem('HWPlus') || '[]');
    let anySubmitted = false;

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      const input = document.querySelector(`.file-input[data-subcategory="${item.Subcategory}"]`);
      const file = input?.files?.[0];

      if (!file) {
        console.warn(`📭 [${item.Subcategory}] 파일이 선택되지 않음 – 제출 생략`);
        continue;
      }

      const formData = new FormData();
      formData.append("UserId", userId);
      formData.append("Subcategory", item.Subcategory);
      formData.append("HWType", item.HWType || "pdf사진");
      formData.append("LessonNo", item.LessonNo ?? 0); // ← 수정된 부분: 빈 문자열 대신 0
      formData.append("Comment", item.comment || "");
      formData.append("HWImage", file);

      for (let pair of formData.entries()) {
        console.log(`📤 ${pair[0]} →`, pair[1]);
      }

      try {
        const res = await fetch("https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveHWPlus", {
          method: "POST",
          body: formData
        });

        let result;
        try {
          result = await res.json();
        } catch (e) {
          console.warn("⚠️ JSON 파싱 실패 – HTML 오류 페이지일 수 있음:", e);
          result = { message: "서버에서 예상치 못한 응답이 돌아왔습니다." };
        }

        if (res.ok) {
          alert(`✅ ${item.Subcategory} 제출 완료!\nURL: ${result.url}`);
          updated[i] = null;
          hwplus = hwplus.filter(entry => entry.Subcategory !== item.Subcategory);
          anySubmitted = true;
        } else {
          alert(`❌ ${item.Subcategory} 제출 실패: ${result.message}`);
        }
      } catch (err) {
        alert(`🚨 ${item.Subcategory} 서버 오류`);
        console.error(err);
      }
    }

    localStorage.setItem('PendingUploads', JSON.stringify(updated.filter(Boolean)));
    localStorage.setItem('HWPlus', JSON.stringify(hwplus));

    if (anySubmitted) location.reload();
    else alert("📎 선택된 파일이 없거나 전송할 항목이 없습니다.");
  });
});
