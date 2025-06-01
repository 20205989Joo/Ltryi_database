const display = document.getElementById('displayArea');
const subBox = document.getElementById('subChoiceBox');
const dialogueBox = document.getElementById('dialogueBox');
const userId = new URLSearchParams(location.search).get('id');

const menuData = {
  analysis: [
    { label: '저 뭐하면 좋죠', type: 'recommend', msg: '지금 상태에 맞는 숙제를 추천해드릴게요.' },
    { label: '저 지금 잘하고있나요?', type: 'summary', msg: '최근 학습 진행 상황을 정리해볼게요.' },
    { label: '저 도움이 필요해요', type: 'counsel', msg: '고민 있으신가요? 이야기 들어볼게요.' }
  ],
  custom: [
    { label: '시험지 주세요', type: 'exam', msg: '약속했던 시험지를 가져왔어요.' },
    { label: '채점 결과 주세요', type: 'grading', msg: '최근 채점 결과를 정리했어요.' }
  ],
  chat: [
    { label: '룰렛', type: 'gacha', msg: '운명의 룰렛을 돌려볼까요?' },
    { label: 'TMI', type: 'tmi', msg: '카페지기의 TMI! 하나 알려드릴게요.' }
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

document.querySelectorAll('.main-choice').forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.cat;
    const list = menuData[cat];
    if (!list) return;
    subBox.innerHTML = list.map(item => `<button data-type="${item.type}">${item.label}</button>`).join('');
    subBox.style.display = 'block';
  });
});

subBox.addEventListener('click', (e) => {
  if (!e.target.matches('button')) return;
  const type = e.target.dataset.type;
  const entry = Object.values(menuData).flat().find(x => x.type === type);
  display.innerText = entry?.msg || '';
  subBox.style.display = 'none';

  if (type === 'recommend') {
    loadScriptDynamically('./cafejigi_analysis.js', 'recommendMain', () => recommendMain());
  }
  else if (type === 'summary') {
    loadScriptDynamically('./cafejigi_analysis.js', 'summaryMain', () => summaryMain());
  }
  else if (type === 'exam') {
    loadScriptDynamically('./cafejigi_customorder.js', 'examMain', () => examMain());
  }
  else if (type === 'grading') {
    loadScriptDynamically('./cafejigi_customorder.js', 'gradingMain', () => gradingMain());
  }
  else if (type === 'counsel') {
    dialogueBox.innerHTML = `
      <div>📋 <b>${entry.label}</b></div>
      <div style="font-size: 13px; margin-bottom: 8px;">
        어떤 고민이 있나요? 선생님에게 남기면 확인 후 답변드릴게요.
      </div>
      <textarea id="counselMsg" style="width: 100%; height: 60px; border-radius: 6px; padding: 6px;"></textarea>
      <button id="sendCounsel" style="margin-top: 8px;">📨 보내기</button>
      <button id="backBtn" style="margin-top: 8px;">← 돌아가기</button>
    `;

    document.getElementById('sendCounsel').onclick = async () => {
      const msg = document.getElementById('counselMsg').value.trim();
      if (!msg) return alert("내용을 입력해주세요!");

      const formData = new FormData();
      const now = new Date();
      formData.append("UserId", userId || "anonymous");
      formData.append("QLevel", "7");
      formData.append("QYear", now.getFullYear());
      formData.append("QMonth", now.getMonth() + 1);
      formData.append("QNo", "1");
      formData.append("WhichHW", "help");
      formData.append("Comment", msg);

      try {
        const res = await fetch("https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/saveHWImages", {
          method: "POST",
          body: formData
        });
        if (res.ok) {
          alert("✅ 상담 요청이 전송되었어요!");
          location.reload();
        } else {
          const result = await res.json();
          alert("❌ 전송 실패: " + result.message);
        }
      } catch (err) {
        alert("🚨 서버 오류가 발생했습니다.");
      }
    };

    document.getElementById('backBtn').onclick = () => location.reload();
  }
  else {
    dialogueBox.innerHTML = `
      <div>📋 <b>${entry.label}</b></div>
      <div style="font-size: 13px;">아직 준비 중이에요. 다음 업데이트를 기다려주세요!</div>
      <button id="backBtn" style="margin-top: 8px;">← 돌아가기</button>
    `;
    document.getElementById('backBtn').onclick = () => location.reload();
  }
});
