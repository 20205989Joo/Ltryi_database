// menulook.js
window.addEventListener('DOMContentLoaded', () => {
  const icon = document.getElementById('menulook_icon');
  const mainPage = document.querySelector('.main-page');
  if (!icon || !mainPage) return;

  icon.addEventListener('click', () => {
    const existing = document.getElementById('menu-pdf-popup');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'menu-pdf-popup';
container.style = `
  position: absolute;
  inset: 0;
  margin: auto;
  width: 340px;
  max-height: 90%;
  background: #fffaf2;
  z-index: 9999;
  border: 2px solid #7e3106;
  border-radius: 14px;
  box-shadow: 0 6px 12px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;


    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✖';
    closeBtn.style = `
      position: absolute;
      top: 8px;
      right: 12px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      z-index: 10000;
    `;
    closeBtn.onclick = () => container.remove();

    const contentHTML = `
      <div style="width: 100%; height: 100%; overflow-y: auto; padding-top: 24px ; font-family: 'Gowun Batang', serif; font-size: 16px; color: #4a3728; line-height: 1.8; text-align: center;">
        <div style="font-size: 22px; font-weight: bold; margin-bottom: 20px; color: #7e3106;">- LTRYI 정규 MENU- </div>

        <div style="margin-bottom: 14px;">
          <div style="font-weight: bold;">단어 훈련</div>
          <div style="font-size: 13px; color: #7e6b5a;"> CEFR A1~C1. 단계별 필수 어휘 정리</div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-weight: bold;">연어</div>
          <div style="font-size: 13px; color: #7e6b5a;"> 외우면 해석속도 20배, 숙련자 추천 </div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-weight: bold;">기초 문법</div>
          <div style="font-size: 13px; color: #7e6b5a;"> 실사용 ⬆ 내신이론 ⬇ 최소 문법. 초보 복습용 추천</div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold;">단계별 번역</div>
          <div style="font-size: 13px; color: #7e6b5a;">문장 구조를 알아서 확장하기</div>
        </div>

<div style="display: inline-block; width: 80%; border-top: 1px dashed #b79d87; margin: 12px 0;"></div>


        <div style="margin: 2px 0 10px; font-weight: bold;">활용 방법</div>
        <div style="font-size: 14px; color: #5f4b3b; line-height: 2;">
          1. 접시에서 <span class="highlight-button orange"style ="line-height: 1.6";> 다운로드</span> 후 <br>
          2. pdf로 열어서 숙제 풀기! <br>
          3. 시험 있으면 <span class="highlight-button green" style = "line-height: 1.6";>시험볼게요</span><br>
          4. 끝나고 <span class="highlight-button blue"style = "line-height: 1.6">완료했어요</span>로 저장 <br>
          5. 반납함에 넣어주세용
        </div>

        <div style="margin-top: 24px; margin-bottom:40px; font-size: 12px; color: #a0846c;">
          새로운 과목이 점점 추가될 예정입니다.
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .highlight-button {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 8px;
        color: white;
        font-size: 13px;
        font-weight: bold;
      }
      .highlight-button.green {
        background-color: #2e7d32;
      }
      .highlight-button.blue {
        background-color: #1976d2;
      }
        .highlight-button.orange {
  background-color: #f17b2a;
}
    `;

    container.innerHTML = contentHTML;
    container.appendChild(closeBtn);
    document.head.appendChild(style);  // 스타일 한 번만 붙이면 됨
    mainPage.appendChild(container);
  });
});
