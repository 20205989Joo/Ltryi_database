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

  const RANGES = {
    '단어': { 'A1': [1, 45], 'A2': [46, 89], 'B1': [90, 130], 'B2': [131, 202], 'C1': [203, 266] },
    '연어': { '900핵심연어': [1, 42] },
    '문법': { 'Basic': [1, 50] },
    '단계별 독해': { 'RCStepper': [1, 50] }
  };

  const subcategoryMap = {
    '단어': 'Words',
    '연어': 'Collocations',
    '문법': 'Grammar',
    '단계별 독해': 'Pattern',
    '파편의 재구성': 'Fragments'
  };

  function inferLevel(subcategory, lessonNo) {
    const ranges = RANGES[subcategory];
    if (!ranges) return null;
    for (const [level, [start, end]] of Object.entries(ranges)) {
      if (lessonNo >= start && lessonNo <= end) return { level, start };
    }
    return null;
  }

  if (pending.length === 0) {
    pendingList.innerHTML = '<div style="color:#888; font-size:13px;">⏳ 제출 대기 중인 숙제가 없습니다.</div>';
  } else {
    pending.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'pending-card';

      const meta = inferLevel(item.Subcategory, item.LessonNo);
      const level = meta?.level;
      const day = meta ? item.LessonNo - meta.start + 1 : null;
      const levelStr = level ? ` (${level}, Day${day})` : '';
      const title = `${item.Subcategory}${levelStr}`;
      const detail = [item.comment, item.detail].filter(Boolean).join(' - ') || '설명 없음';

      if (item.HWType === 'doneinweb') {
        const quizRaw = localStorage.getItem('QuizResults');
        if (quizRaw) {
          const result = JSON.parse(quizRaw);
          const expectedDayStr = `Day${day}`;
          console.log('🔍 로드시 비교 로그 →', {
            expected: { subcategory: item.Subcategory, level, day: expectedDayStr },
            actual: { subcategory: result.subcategory, level: result.level, day: result.day }
          });
        } else {
          console.warn(`❌ QuizResults 없음 – ${item.Subcategory}`);
        }
      }

      let inputHTML = '';
      if (item.HWType !== 'doneinweb') {
      inputHTML = `<input type="file" class="file-input" data-subcategory="${item.Subcategory}" multiple accept="*/*" style="margin-top: 6px; width: 100%;" />`;
      }

      card.innerHTML = `
        <div><b>${title}</b></div>
        <div style="font-size: 12px; color: #555;">📝 ${detail}</div>
        ${inputHTML}
      `;

      pendingList.appendChild(card);
    });
  }

  if (!submitBtn) return;

  submitBtn.addEventListener("click", async () => {
  let updated = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
  let hwplus = JSON.parse(localStorage.getItem('HWPlus') || '[]');
  let anySubmitted = false;

  for (let i = 0; i < updated.length; i++) {
    const item = updated[i];

    if (item.HWType === 'doneinweb') {
      const quizRaw = localStorage.getItem('QuizResults');
      if (!quizRaw) {
        alert(`❌ ${item.Subcategory}: 시험 결과 없음`);
        continue;
      }

      const quiz = JSON.parse(quizRaw);
      const meta = inferLevel(item.Subcategory, item.LessonNo);
      const level = meta?.level;
      const start = meta?.start ?? 1;
      const day = item.LessonNo - start + 1;
      const expectedSub = subcategoryMap[item.Subcategory] || item.Subcategory;
      const expected = { subcategory: expectedSub, level, day: `Day${day}` };

      if (
        quiz.subcategory !== expected.subcategory ||
        quiz.level !== expected.level ||
        quiz.day !== expected.day
      ) {
        console.warn(`❌ 매칭 실패 – 제출 생략`, { expected, actual: quiz });
        continue;
      }

      const txtContent = quiz.testspecific.map(r =>
        `번호: ${r.no}, 문제: ${r.word}, 본인 답: ${r.selected}, 정답 여부: ${r.correct ? '⭕' : '❌'}`
      ).join('\n');

      const file = new File([txtContent], `${item.Subcategory}_결과.txt`, { type: "text/plain" });

      const formData = new FormData();
      formData.append("UserId", userId);
      formData.append("Subcategory", item.Subcategory);
      formData.append("HWType", item.HWType);
      formData.append("LessonNo", item.LessonNo ?? 0);
      formData.append("Comment", item.comment || "");
      formData.append("HWImage", file);

      try {
        const res = await fetch("https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveHWPlus", {
          method: "POST",
          body: formData
        });

        const result = await res.json();

        if (res.ok) {
          anySubmitted = true;
          updated[i] = null;
          hwplus = hwplus.filter(entry => entry.Subcategory !== item.Subcategory);
          localStorage.removeItem('QuizResults');
          console.log('🧹 QuizResults 초기화 완료');
          alert(`✅ ${item.Subcategory} 제출 완료!\nURL: ${result.url}`);

          // diligence
          await fetch("/api/logDiligence", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              UserId: userId,
              Subcategory: item.Subcategory,
              LessonNo: item.LessonNo ?? 0,
              RegisteredBy: 'system'
            })
          });

          if (item.Subcategory in subcategoryMap) {
            await fetch("/api/updateProgressMatrix", {
              method: "POST",
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                UserId: userId,
                Subject: subcategoryMap[item.Subcategory],
                LessonNo: item.LessonNo ?? 0,
                Status: "done",
                RegisteredBy: "system"
              })
            });
          }

        } else {
          alert(`❌ ${item.Subcategory} 제출 실패: ${result.message}`);
        }
      } catch (err) {
        alert(`🚨 ${item.Subcategory} 서버 오류`);
        console.error(err);
      }

    } else {
      const input = document.querySelector(`.file-input[data-subcategory="${item.Subcategory}"]`);
      const files = input?.files;

      if (!files || files.length === 0) {
        console.warn(`📭 [${item.Subcategory}] 파일이 선택되지 않음 – 제출 생략`);
        continue;
      }

      for (const file of files) {
        const formData = new FormData();
        formData.append("UserId", userId);
        formData.append("Subcategory", item.Subcategory);
        formData.append("HWType", item.HWType || "pdf사진");
        formData.append("LessonNo", item.LessonNo ?? 0);
        formData.append("Comment", item.comment || "");
        formData.append("HWImage", file);

        try {
          const res = await fetch("https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveHWPlus", {
            method: "POST",
            body: formData
          });

          const result = await res.json();

          if (res.ok) {
            anySubmitted = true;
            alert(`✅ ${item.Subcategory} 제출 완료!\nURL: ${result.url}`);

            // diligence
            await fetch("/api/logDiligence", {
              method: "POST",
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                UserId: userId,
                Subcategory: item.Subcategory,
                LessonNo: item.LessonNo ?? 0,
                RegisteredBy: 'system'
              })
            });

            if (item.Subcategory in subcategoryMap) {
              await fetch("/api/updateProgressMatrix", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  UserId: userId,
                  Subject: subcategoryMap[item.Subcategory],
                  LessonNo: item.LessonNo ?? 0,
                  Status: "done",
                  RegisteredBy: "system"
                })
              });
            }

          } else {
            alert(`❌ ${item.Subcategory} 제출 실패: ${result.message}`);
          }

        } catch (err) {
          alert(`🚨 ${item.Subcategory} 서버 오류`);
          console.error(err);
        }
      }

      updated[i] = null;
      hwplus = hwplus.filter(entry => entry.Subcategory !== item.Subcategory);
    }
  }

  localStorage.setItem('PendingUploads', JSON.stringify(updated.filter(Boolean)));
  localStorage.setItem('HWPlus', JSON.stringify(hwplus));

  if (anySubmitted) location.reload();
  else alert("📎 선택된 파일이 없거나 전송할 항목이 없습니다.");
});

});
