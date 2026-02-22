// ✅ script-homework-submit1.js (for homework-tray_v1.html)

window.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');

  // ✅ 전송 후 항상 돌아갈 테이블(또는 메인) 페이지
  const redirectUrl = `homework-tray_v1.html?id=${encodeURIComponent(userId || '')}`;

  const kstOffset = 9 * 60 * 60 * 1000;
  const now = new Date(Date.now() + kstOffset);
  const todayStr = now.toISOString().split('T')[0];

  const statusBox = document.getElementById('submissionStatus');
  const pendingList = document.getElementById('pendingList');
  const submitBtn = document.getElementById("hwSubmitbutton");

  // 버튼 텍스트 강제 세팅
  if (submitBtn) {
    submitBtn.textContent = '여기를 눌러서 모두 전송!';
  }

  const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
  const hwplusInitial = JSON.parse(localStorage.getItem('HWPlus') || '[]');

  console.log('📦 제출 전 PendingUploads 목록:', pending);
  console.log('📦 제출 전 HWPlus 목록:', hwplusInitial);

  // === 로딩 오버레이 & 스피너 세팅 ===
  let isSubmitting = false;
  let overlay = null;

  // keyframes 추가 (로딩 스피너)
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes hwSubmitSpin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleEl);

  function createLoadingOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'hw-submit-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.25);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 5000;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: #ffffff;
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      min-width: 220px;
    `;

    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid rgba(0,0,0,0.15);
      border-top-color: #ff9800;
      animation: hwSubmitSpin 0.8s linear infinite;
    `;

    const text = document.createElement('div');
    text.textContent = '전송 중입니다...';
    text.style.cssText = `
      font-size: 14px;
      color: #333;
    `;

    box.appendChild(spinner);
    box.appendChild(text);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function showLoadingOverlay() {
    if (!overlay) createLoadingOverlay();
    overlay.style.display = 'flex';
    if (submitBtn) {
      submitBtn.style.opacity = '0.6';
      submitBtn.style.pointerEvents = 'none';
    }
  }

  function hideLoadingOverlay() {
    if (overlay) overlay.style.display = 'none';
    if (submitBtn) {
      submitBtn.style.opacity = '';
      submitBtn.style.pointerEvents = '';
    }
    isSubmitting = false;
  }

  // === 오늘 숙제 제출 여부 확인 ===
  try {
    const res = await fetch(
      `https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWPlus?userId=${userId}`
    );
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

  const FALLBACK_RANGES = {
    '단어': { 'A1': [1, 45], 'A2': [46, 89], 'B1': [90, 130], 'B2': [131, 201], 'C1': [202, 266] },
    '연어': { '900핵심연어': [1, 42] },
    '문법': { 'Basic': [1, 50] },
    '단계별 독해': { 'RCStepper': [1, 50] }
  };

  const FALLBACK_SUBCATEGORY_TOKEN = {
    '단어': 'Words',
    '연어': 'Collocations',
    '문법': 'Grammar',
    '단계별 독해': 'Pattern',
    '파편의 재구성': 'Fragments'
  };

  function getDayManager() {
    return window.DayManager || null;
  }

  function resolveSubcategoryName(subcategory) {
    const dm = getDayManager();
    if (!subcategory) return subcategory;
    if (!dm || typeof dm.resolveSubcategoryName !== 'function') return subcategory;
    return dm.resolveSubcategoryName(subcategory) || subcategory;
  }

  function inferLevelFromFallback(subcategory, lessonNo) {
    if (lessonNo == null) return null;
    const ranges = FALLBACK_RANGES[subcategory];
    if (!ranges) return null;
    for (const [level, [start, end]] of Object.entries(ranges)) {
      if (lessonNo >= start && lessonNo <= end) {
        return { level, start, day: lessonNo - start + 1 };
      }
    }
    return null;
  }

  function getLevelDayMeta(subcategory, level, lessonNo) {
    const dm = getDayManager();
    const canonicalSub = resolveSubcategoryName(subcategory);
    const lesson = lessonNo == null ? null : Number(lessonNo);

    let resolvedLevel = level ?? null;
    let day = null;

    if (dm) {
      if (!resolvedLevel && typeof dm.inferLevel === 'function' && lesson != null && !Number.isNaN(lesson)) {
        const inferred = dm.inferLevel(canonicalSub, lesson);
        resolvedLevel = inferred?.level ?? null;
      }
      if (resolvedLevel && typeof dm.getDay === 'function' && lesson != null && !Number.isNaN(lesson)) {
        day = dm.getDay(canonicalSub, resolvedLevel, lesson);
      }
    } else {
      const inferred = inferLevelFromFallback(canonicalSub, lesson);
      resolvedLevel = resolvedLevel ?? inferred?.level ?? null;
      day = inferred?.day ?? null;
    }

    return {
      canonicalSub,
      level: resolvedLevel,
      day
    };
  }

  function getSubcategoryToken(subcategory) {
    const dm = getDayManager();
    const canonicalSub = resolveSubcategoryName(subcategory);
    if (dm && typeof dm.getSubcategoryToken === 'function') {
      return dm.getSubcategoryToken(canonicalSub) || canonicalSub;
    }
    return FALLBACK_SUBCATEGORY_TOKEN[canonicalSub] || canonicalSub;
  }

  function readQuizResultsMap() {
    try {
      const raw = localStorage.getItem('QuizResultsMap');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeQuizResultsMap(mapObj) {
    localStorage.setItem('QuizResultsMap', JSON.stringify(mapObj || {}));
  }

  function readLegacyQuizResult() {
    try {
      const raw = localStorage.getItem('QuizResults');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function getQuizResultKey(quiz) {
    return String(quiz?.quiztitle || quiz?.quizTitle || '').trim();
  }

  function isDoneQuizResult(quiz) {
    return !!(quiz && typeof quiz === 'object' && quiz.teststatus === 'done');
  }

  function matchesQuizExpected(quiz, expected) {
    if (!quiz || !expected) return false;
    return (
      quiz.subcategory === expected.subcategory &&
      quiz.level === expected.level &&
      quiz.day === expected.day
    );
  }

  function getQuizResultByKey(quizKey) {
    const key = String(quizKey || '').trim();
    if (!key) return null;

    const map = readQuizResultsMap();
    const mapQuiz = map[key];
    if (mapQuiz && typeof mapQuiz === 'object') {
      return { quiz: mapQuiz, key, source: 'map' };
    }

    const legacy = readLegacyQuizResult();
    if (legacy && getQuizResultKey(legacy) === key) {
      return { quiz: legacy, key, source: 'legacy' };
    }

    return null;
  }

  function findQuizResultByExpected(expected) {
    if (!expected) return null;

    const map = readQuizResultsMap();
    for (const [key, quiz] of Object.entries(map)) {
      if (!isDoneQuizResult(quiz)) continue;
      if (matchesQuizExpected(quiz, expected)) {
        return { quiz, key, source: 'map-expected' };
      }
    }

    const legacy = readLegacyQuizResult();
    if (isDoneQuizResult(legacy) && matchesQuizExpected(legacy, expected)) {
      return { quiz: legacy, key: getQuizResultKey(legacy), source: 'legacy-expected' };
    }

    return null;
  }

  function getDoneInWebQuizBundle(item, canonicalSub, meta) {
    const metaInfo = meta || getLevelDayMeta(canonicalSub, item.Level, item.LessonNo);
    const expected = {
      subcategory: getSubcategoryToken(canonicalSub),
      level: metaInfo.level ?? null,
      day: metaInfo.day != null ? `Day${metaInfo.day}` : null
    };

    const pendingQuizKey = String(item.QuizKey || '').trim();
    if (pendingQuizKey) {
      const byKey = getQuizResultByKey(pendingQuizKey);
      if (byKey && isDoneQuizResult(byKey.quiz)) {
        return { ...byKey, expected, matchedBy: 'quizKey' };
      }
    }

    const byExpected = findQuizResultByExpected(expected);
    if (byExpected) {
      return { ...byExpected, expected, matchedBy: 'expected' };
    }

    return { quiz: null, key: pendingQuizKey || '', source: '', expected, matchedBy: '' };
  }

  function removeSubmittedQuizResult(quizKey) {
    const key = String(quizKey || '').trim();
    if (key) {
      const map = readQuizResultsMap();
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        delete map[key];
        writeQuizResultsMap(map);
        console.log(`🧹 QuizResultsMap 제거 완료: ${key}`);
      }
    }

    const legacy = readLegacyQuizResult();
    if (!legacy) return;

    const legacyKey = getQuizResultKey(legacy);
    if (!key || (legacyKey && legacyKey === key)) {
      localStorage.removeItem('QuizResults');
      console.log('🧹 QuizResults(legacy) 정리 완료');
    }
  }

  // === 제출 대기 카드 렌더링 ===
  if (!pendingList) {
    console.warn('❌ pendingList 요소가 없습니다.');
  } else if (pending.length === 0) {
    pendingList.innerHTML =
      '<div style="color:#888; font-size:13px;">⏳ 제출 대기 중인 숙제가 없습니다.</div>';
  } else {
    pending.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'pending-card';

      const canonicalSub = resolveSubcategoryName(item.Subcategory);
      item.Subcategory = canonicalSub;
      const meta = getLevelDayMeta(canonicalSub, item.Level, item.LessonNo);
      const level = meta.level ?? null;
      const day = meta.day ?? null;
      const levelStr = level ? ` (${level}${day ? `, Day${day}` : ''})` : '';
      const title = `${canonicalSub}${levelStr}`;
      const detail = [item.comment, item.detail].filter(Boolean).join(' - ') || '설명 없음';

      // 디버그: doneinweb 매칭 확인용
      if (item.HWType === 'doneinweb') {
        const bundle = getDoneInWebQuizBundle(item, canonicalSub, { level, day });
        if (bundle.quiz) {
          console.log('🔍 로드시 비교 로그 →', {
            quizKey: item.QuizKey || bundle.key || '',
            matchedBy: bundle.matchedBy,
            expected: bundle.expected,
            actual: {
              subcategory: bundle.quiz.subcategory,
              level: bundle.quiz.level,
              day: bundle.quiz.day,
              quiztitle: bundle.quiz.quiztitle || bundle.quiz.quizTitle
            }
          });
        } else {
          console.warn(`❌ QuizResults/QuizResultsMap 없음 – ${item.Subcategory}`);
        }
      }

      let inputHTML = '';
      if (item.HWType !== 'doneinweb') {
        inputHTML = `
          <input type="file"
                 class="file-input"
                 data-subcategory="${item.Subcategory}"
                 data-level="${item.Level ?? ''}"
                 data-lessonno="${item.LessonNo ?? ''}"
                 multiple
                 accept="*/*"
                 style="margin-top: 6px; width: 100%;" />
        `;
      }

      card.innerHTML = `
        <div><b>${title}</b></div>
        <div style="font-size: 12px; color: #555;">📝 ${detail}</div>
        ${inputHTML}
      `;

      pendingList.appendChild(card);

      // ✅ 파일 선택 여부에 따라 카드에 filled 클래스 토글
      if (item.HWType === 'doneinweb') {
        // 웹에서 푼 시험은 자동으로 '채워진' 상태
        card.classList.add('filled');
      } else {
        const input = card.querySelector('.file-input');
        if (input) {
          const updateFilled = () => {
            if (input.files && input.files.length > 0) {
              card.classList.add('filled');
            } else {
              card.classList.remove('filled');
            }
          };
          // 초기 한 번 호출 (브라우저가 파일 상태 기억하는 경우 대비)
          updateFilled();
          input.addEventListener('change', updateFilled);
        }
      }
    });
  }

  if (!submitBtn) return;

  submitBtn.addEventListener("click", async () => {
    if (isSubmitting) return;
    isSubmitting = true;
    showLoadingOverlay();

    let updated = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
    let hwplus = JSON.parse(localStorage.getItem('HWPlus') || '[]');

    let anySubmitted = false;
    const successMessages = [];
    const failMessages = [];
    const errorMessages = [];

    // 작은 유틸: 정규화
    const normalizeLevel = v => (v == null ? null : String(v));
    const normalizeNo = v => {
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    };

    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      if (!item) continue;
      const canonicalSub = resolveSubcategoryName(item.Subcategory);
      item.Subcategory = canonicalSub;

      try {
        // === 1) 웹에서 푼 시험 (doneinweb) ===
        if (item.HWType === 'doneinweb') {
          const meta = getLevelDayMeta(canonicalSub, item.Level, item.LessonNo);
          const metaLevel = meta.level ?? null;
          const bundle = getDoneInWebQuizBundle(item, canonicalSub, meta);
          const quiz = bundle.quiz;
          const expected = bundle.expected;

          if (!quiz) {
            failMessages.push(`❌ ${item.Subcategory}: 시험 결과 없음`);
            continue;
          }

          const expectedMatch = matchesQuizExpected(quiz, expected);
          if (!expectedMatch) {
            if (bundle.matchedBy === 'quizKey') {
              console.warn('QuizKey matched but metadata differs; continuing submit.', {
                expected,
                actual: quiz,
                quizKey: bundle.key
              });
            } else {
              console.warn(`❌ 매칭 실패 – 제출 생략`, { expected, actual: quiz });
              failMessages.push(`❌ ${item.Subcategory}: 시험 결과와 숙제 정보가 일치하지 않아 제출 생략`);
              continue;
            }
          }

          if (!Array.isArray(quiz.testspecific) || quiz.testspecific.length === 0) {
            failMessages.push(`❌ ${item.Subcategory}: 시험 결과 상세 없음`);
            continue;
          }

          const txtContent = quiz.testspecific.map(r =>
            `번호: ${r.no}, 문제: ${r.word}, 본인 답: ${r.selected}, 정답 여부: ${r.correct ? '⭕' : '❌'}`
          ).join('\n');

          const file = new File([txtContent], `${item.Subcategory}_결과.txt`, { type: "text/plain" });

          const formData = new FormData();
          formData.append("UserId", userId);
          formData.append("Subcategory", canonicalSub);
          formData.append("HWType", item.HWType);
          formData.append("LessonNo", item.LessonNo ?? 0);
          formData.append("Comment", item.comment || "");
          formData.append("HWImage", file);

          const res = await fetch(
            "https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveHWPlus",
            { method: "POST", body: formData }
          );
          const result = await res.json();

          if (res.ok) {
            anySubmitted = true;
            // PendingUploads에서 이 항목 제거
            updated[i] = null;

            // ✅ HWPlus에서 정확히 일치하는 (Subcategory + Level + LessonNo)만 제거
            const deleteLevel = item.Level ?? metaLevel ?? null;
            const deleteLessonNo = item.LessonNo ?? null;

            hwplus = hwplus.filter(entry => {
              if (resolveSubcategoryName(entry.Subcategory) !== canonicalSub) return true;
              const entryLevel = normalizeLevel(entry.Level);
              const entryNo = normalizeNo(entry.LessonNo);
              const targetLevel = normalizeLevel(deleteLevel);
              const targetNo = normalizeNo(deleteLessonNo);
              return !(entryLevel === targetLevel && entryNo === targetNo);
            });

            removeSubmittedQuizResult(bundle.key || getQuizResultKey(quiz));
            successMessages.push(`✅ ${item.Subcategory} 제출 완료 (URL: ${result.url || 'N/A'})`);

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

            const progressSubject = getSubcategoryToken(canonicalSub);
            if (progressSubject) {
              await fetch("/api/updateProgressMatrix", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  UserId: userId,
                  Subject: progressSubject,
                  LessonNo: item.LessonNo ?? 0,
                  Status: "done",
                  RegisteredBy: "system"
                })
              });
            }

          } else {
            failMessages.push(`❌ ${item.Subcategory} 제출 실패: ${result.message || res.status}`);
          }

        } else {
          // === 2) 사진/파일 업로드형 ===

          // 이 항목에 대응하는 input 찾기 (Subcategory + Level + LessonNo 기준)
          const selector = `.file-input[data-subcategory="${item.Subcategory}"]` +
            `[data-level="${item.Level ?? ''}"][data-lessonno="${item.LessonNo ?? ''}"]`;
          const input = document.querySelector(selector);
          const files = input?.files;

          if (!files || files.length === 0) {
            console.warn(`📭 [${item.Subcategory}] 파일이 선택되지 않음 – 제출 생략`);
            failMessages.push(`📭 ${item.Subcategory}: 파일이 선택되지 않아 제출 생략`);
            continue;
          }

          for (const file of files) {
            const formData = new FormData();
            formData.append("UserId", userId);
            formData.append("Subcategory", canonicalSub);
            formData.append("HWType", item.HWType || "pdf사진");
            formData.append("LessonNo", item.LessonNo ?? 0);
            formData.append("Comment", item.comment || "");
            formData.append("HWImage", file);

            const res = await fetch(
              "https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveHWPlus",
              { method: "POST", body: formData }
            );
            const result = await res.json();

            if (res.ok) {
              anySubmitted = true;
              successMessages.push(`✅ ${item.Subcategory} 제출 완료 (URL: ${result.url || 'N/A'})`);

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

              const progressSubject = getSubcategoryToken(canonicalSub);
              if (progressSubject) {
                await fetch("/api/updateProgressMatrix", {
                  method: "POST",
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    UserId: userId,
                    Subject: progressSubject,
                    LessonNo: item.LessonNo ?? 0,
                    Status: "done",
                    RegisteredBy: "system"
                  })
                });
              }

            } else {
              failMessages.push(`❌ ${item.Subcategory} 제출 실패: ${result.message || res.status}`);
            }
          }

          // 제출 성공 후 PendingUploads/ HWPlus에서 이 항목 제거
          updated[i] = null;

          const meta = getLevelDayMeta(canonicalSub, item.Level, item.LessonNo);
          const metaLevel = meta.level ?? null;
          const deleteLevel = item.Level ?? metaLevel ?? null;
          const deleteLessonNo = item.LessonNo ?? null;

          hwplus = hwplus.filter(entry => {
            if (resolveSubcategoryName(entry.Subcategory) !== canonicalSub) return true;
            const entryLevel = normalizeLevel(entry.Level);
            const entryNo = normalizeNo(entry.LessonNo);
            const targetLevel = normalizeLevel(deleteLevel);
            const targetNo = normalizeNo(deleteLessonNo);
            return !(entryLevel === targetLevel && entryNo === targetNo);
          });
        }

      } catch (err) {
        console.error(err);
        errorMessages.push(`🚨 ${item.Subcategory} 서버 오류`);
      }
    }

    // 로컬 저장소 정리
    localStorage.setItem('PendingUploads', JSON.stringify(updated.filter(Boolean)));
    localStorage.setItem('HWPlus', JSON.stringify(hwplus));

    console.log('📦 제출 후 PendingUploads:', JSON.parse(localStorage.getItem('PendingUploads') || '[]'));
    console.log('📦 제출 후 HWPlus:', JSON.parse(localStorage.getItem('HWPlus') || '[]'));

    // ✅ 최종 피드백 & 이동
    if (anySubmitted) {
      hideLoadingOverlay();

      let msg = '숙제 제출이 완료되었습니다!\n';
      if (successMessages.length) {
        msg += '\n[성공]\n' + successMessages.join('\n');
      }
      if (failMessages.length || errorMessages.length) {
        msg += '\n\n[주의]\n' + [...failMessages, ...errorMessages].join('\n');
      }

      alert(msg);

      // 🔥 여기서 무조건 homework-tray_v1.html?id=... 로 이동 (뒤로가기 방지)
      window.location.replace(redirectUrl);

    } else {
      hideLoadingOverlay();
      alert("📎 선택된 파일이 없거나 전송할 항목이 없습니다.");
    }
  });
});
