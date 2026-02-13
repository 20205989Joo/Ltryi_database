const display = document.getElementById('displayArea');
const subBox = document.getElementById('subChoiceBox');
const dialogueBox = document.getElementById('dialogueBox');
const userId = new URLSearchParams(location.search).get('id');

const menuData = {
  analysis: [
    { label: '저 뭐하면 좋죠', type: 'recommend', msg: '지금 상태에 맞는 숙제를 추천해드릴게요.' },
    { label: '저 지금 잘하고있나요?', type: 'summary', msg: '최근 학습 진행 상황을 정리해볼게요.' }
    // ⬇️ 여기 있던 "저 도움이 필요해요"는 chat 탭으로 이동
  ],
  // custom 항목은 통합 주문함만 쓰지만, 메타로 남겨둠
  custom: [
    { label: '시험지 주세요', type: 'exam', msg: '약속했던 시험지를 가져왔어요.' },
    { label: '채점 결과 주세요', type: 'grading', msg: '최근 채점 결과를 정리했어요.' }
  ],
  chat: [
    { label: '저 도움이 필요해요', type: 'counsel', msg: '고민 있으신가요? 이야기 들어볼게요.' },
    // { label: '룰렛', type: 'gacha', msg: '운명의 룰렛을 돌려볼까요?' },
    // { label: 'TMI', type: 'tmi', msg: '카페지기의 TMI! 하나 알려드릴게요.' }
  ]
};

function loadScriptDynamically(src, fnName, callback) {
  if (document.querySelector(`script[src="${src}"]`)) {
    waitUntilReady(fnName, callback);
    return;
  }
  const s = document.createElement('script');
  s.src = src;
  s.onload = () => waitUntilReady(fnName, callback);
  document.head.appendChild(s);
}

function waitUntilReady(fnName, callback, retry = 0) {
  if (typeof window[fnName] === 'function') {
    callback();
  } else if (retry < 10) {
    setTimeout(() => waitUntilReady(fnName, callback, retry + 1), 30);
  } else {
    console.error(`❌ ${fnName} is not defined after loading`);
  }
}

// 🔹 상단 메인 버튼들 클릭
document.querySelectorAll('.main-choice').forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.cat;

    // ✅ "저 주실 거 있어요" → 시험지/채점 통합 주문함 바로 열기
    if (cat === 'custom') {
      display.innerText = '주문하셨던 시험지 / 채점 결과를 불러와볼게요.';
      subBox.style.display = 'none';

      loadScriptDynamically(
        './cafejigi_customorder.js',
        'customAllMain',
        () => customAllMain()
      );
      return;
    }

    // 그 외(analysis, chat)는 기존처럼 서브 버튼 노출
    const list = menuData[cat];
    if (!list) return;

    subBox.innerHTML = list
      .map(item => `<button data-type="${item.type}">${item.label}</button>`)
      .join('');
    subBox.style.display = 'block';
  });
});

// 🔹 서브 버튼 영역 클릭 (analysis / chat 용)
subBox.addEventListener('click', (e) => {
  if (!e.target.matches('button')) return;

  const type = e.target.dataset.type;
  const entry = Object.values(menuData).flat().find(x => x.type === type);

  display.innerText = entry?.msg || '';
  subBox.style.display = 'none';

  if (type === 'recommend') {
    // 진행상황 기반 숙제 추천
    loadScriptDynamically('./cafejigi_recommend.js', 'recommendMain', () => recommendMain());
  }
  else if (type === 'summary') {
    // 학습 요약 리포트
    loadScriptDynamically('./cafejigi_analysis.js', 'summaryMain', () => summaryMain());
  }
  else if (type === 'counsel') {
    // 상담 요청 폼
    dialogueBox.innerHTML = `
      <div>📋 <b>${entry.label}</b></div>
      <div style="font-size: 13px; margin-bottom: 8px;">
        궁금하신 점이나 <br> 도움이 필요한 걸 적어서, 저에게 보내주세요. <br> 물론 카톡도 가능!
      </div>
      <textarea id="counselMsg" style="width: 100%; height: 100px; border-radius: 6px; padding: 6px;"></textarea>
      <button id="sendCounsel" style="margin-top: 8px;">📨 보내기</button>
      <button id="backBtn" style="margin-top: 8px;">← 돌아가기</button>
    `;

    // 상담 모드는 높이 조금 더 여유 줌
    dialogueBox.style.maxHeight = '320px';

    document.getElementById('sendCounsel').onclick = async () => {
      const msg = document.getElementById('counselMsg').value.trim();
      if (!msg) return alert("내용을 입력해주세요!");

      // 텍스트를 파일(.txt)로 감싸서 전송
      const blob = new Blob([msg], { type: 'text/plain' });
      const file = new File([blob], 'counsel_message.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append("UserId", userId || "anonymous");
      formData.append("Subcategory", "상담");
      formData.append("HWType", "counsel");
      formData.append("LessonNo", 0);
      formData.append("Comment", msg);
      formData.append("HWImage", file);

      try {
        const res = await fetch(
          "https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveHWPlus",
          {
            method: "POST",
            body: formData
          }
        );

        if (res.ok) {
          dialogueBox.innerHTML = `
            <div style="color:lightgreen; font-weight:bold;">✅ 상담 요청이 전송되었습니다!</div>
            <button id="backBtn" style="margin-top: 8px;">← 돌아가기</button>
          `;
          document.getElementById('backBtn').onclick = () => location.reload();
        } else {
          const result = await res.json();
          alert("❌ 전송 실패: " + result.message);
        }
      } catch (err) {
        console.error(err);
        alert("🚨 서버 오류가 발생했습니다.");
      }
    };

    document.getElementById('backBtn').onclick = () => location.reload();
  }
  else {
    // (현재는 룰렛/TMI 주석 처리로 안 들어오지만, 방어용)
    dialogueBox.innerHTML = `
      <div>📋 <b>${entry?.label || '준비 중'}</b></div>
      <div style="font-size: 13px;">아직 준비 중이에요. 다음 업데이트를 기다려주세요!</div>
      <button id="backBtn" style="margin-top: 8px;">← 돌아가기</button>
    `;
    document.getElementById('backBtn').onclick = () => location.reload();
  }
});
