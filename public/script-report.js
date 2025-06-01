const userId = new URLSearchParams(window.location.search).get('id');
const display = document.getElementById('displayArea');
const subBox = document.getElementById('subChoiceBox');
const dialogueBox = document.getElementById('dialogueBox');

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

document.querySelectorAll('.main-choice').forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.cat;
    const list = menuData[cat];
    subBox.innerHTML = '';
    list.forEach(item => {
      const b = document.createElement('button');
      b.textContent = item.label;
      b.onclick = () => {
        subBox.style.display = 'none';

        if (item.type === 'summary') {
          display.innerHTML = `
            <div class="summary-grid">
              <div class="stat-box">
                <div class="label">성실함</div>
                <div class="bar"><div class="fill" style="width: 72%;"></div></div>
              </div>
              <div class="stat-box">
                <div class="label">정확도</div>
                <div class="bar"><div class="fill" style="width: 88%;"></div></div>
              </div>
              <div class="stat-box">
                <div class="label">속도</div>
                <div class="icon">🐢</div>
              </div>
            </div>
          `;
          dialogueBox.innerHTML = `
            <div>📋 <b>${item.label}</b></div>
            <div style="font-size: 13px;">
              당신은 지난주 평균보다 2회 더 숙제를 냈어요. 아주 좋아요!<br>
              단어 숙제에서 특히 정확도가 높았어요. 평균보다 12점 높아요.<br>
              제출은 평균보다 약간 늦어요. 밤 10시쯤 제출하는 패턴이 있어요.
            </div>
            <button id="backBtn">← 돌아가기</button>
          `;
        }

        if (item.type === 'recommend') {
          display.innerHTML = `
            <div class="summary-grid">
              <div class="stat-box">
                <div class="label">단어</div>
                <div class="bar"><div class="fill" style="width: 45%;"></div></div>
              </div>
              <div class="stat-box">
                <div class="label">문법</div>
                <div class="bar"><div class="fill" style="width: 30%;"></div></div>
              </div>
              <div class="stat-box">
                <div class="label">독해</div>
                <div class="bar"><div class="fill" style="width: 5%; background:#f88;"></div></div>
              </div>
            </div>
          `;
          dialogueBox.innerHTML = `
            <div>📋 <b>${item.label}</b></div>
            <div style="font-size: 13px;">
              최근 단어는 A1~A2 위주로 15일차까지 진행하셨네요.<br>
              문법은 기초 1~5단계만 끝냈어요. 이제 중급 Day 1이 딱이에요!<br>
              독해는 아직 시작하지 않으셨어요. <b>파편의 재구성</b>으로 가볍게 시작해볼까요?
            </div>
            <button id="backBtn">← 돌아가기</button>
          `;
        }

        if (item.type === 'exam' || item.type === 'grading') {
          const pending = JSON.parse(localStorage.getItem('PendingUploads') || '[]');
          const filtered = pending.filter(p => p.type === 'upload' && p.grading === true);
          const labelList = filtered.map(p => {
            const title = p.WhichHW || '무제';
            const level = p.QLevel ? `Lv.${p.QLevel}` : '';
            const no = p.QNo ? ` Day ${p.QNo}` : '';
            return `- ${title} ${level}${no}`;
          });

          display.innerHTML = `
            <div style="text-align:center;">
              <img src="icon_exam.png" alt="icon" style="width: 80px; opacity: 0.7;" />
              <p style="margin-top: 6px;">요청한 시험지를 확인했어요!</p>
            </div>
          `;
          dialogueBox.innerHTML = `
            <div>📋 <b>${item.label}</b></div>
            <div style="font-size: 13px;">
              총 ${labelList.length}개의 시험 요청이 있었어요.<br>
              ${labelList.length > 0 ? labelList.join('<br>') : '아직 요청된 시험지가 없네요.'}
            </div>
            <button id="backBtn">← 돌아가기</button>
          `;
        }

        if (item.type === 'counsel') {
          display.innerHTML = `
            <div style="text-align:center;">
              <div style="font-size: 36px;">☎</div>
              <p>DEEP 한 분석/상담은 이쪽으로! </p>
            </div>
          `;
          dialogueBox.innerHTML = `
            <div>📋 <b>${item.label}</b></div>
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
            formData.append("UserId", userId);
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

              const result = await res.json();
              if (res.ok) {
                alert("✅ 상담 요청이 전송되었어요!");
                location.reload();
              } else {
                alert("❌ 전송 실패: " + result.message);
              }
            } catch (err) {
              console.error(err);
              alert("🚨 서버 오류가 발생했습니다.");
            }
          };
        }

        document.getElementById('backBtn').onclick = () => location.reload();
      };
      subBox.appendChild(b);
    });
    subBox.style.display = 'block';
  });
});
