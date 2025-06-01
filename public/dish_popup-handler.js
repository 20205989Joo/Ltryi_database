window.showDishPopup = function(item) {
  const cafeInt = document.getElementById('cafe_int');
  if (!cafeInt) {
    console.warn('❌ cafe_int가 없습니다.');
    return;
  }

  const old = document.getElementById('popup-container');
  if (old) old.remove();

  const popupContainer = document.createElement('div');
  popupContainer.id = 'popup-container';
  popupContainer.style = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 999;
    pointer-events: none;
  `;

  const popup = document.createElement('div');
  popup.style = `
    position: absolute;
    top: 160px;
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    min-height: 140px;
    background: #fffaf2;
    border: 2px solid #7e3106;
    border-radius: 14px;
    padding: 16px;
    font-size: 14px;
    color: #333;
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    z-index: 1001;
    text-align: center;
    pointer-events: auto;
  `;

  const hw = item.Subcategory;
  const key = `downloaded_HW_${hw}_${item.Level}_${item.LessonNo}`;
  const downloaded = localStorage.getItem(key) === 'true';

  let content = `<div style="font-weight:bold; font-size: 15px; margin-bottom: 10px;">📥 ${hw}</div>`;

  const filename = "CEFR_A1.pdf";

  const isRegularHW = ["단어", "연어", "기초문법", "파편의 재구성"].includes(hw);

  if (isRegularHW) {
    content += `
      <div style="margin-bottom: 8px;">
        <iframe src="${filename}#page=1" width="100%" height="180px"
          style="border: 1px solid #aaa; border-radius: 6px;"></iframe>
      </div>
    `;
  }

  if (isRegularHW) {
    if (downloaded) {
      content += `
        <div style="margin-bottom: 10px;">숙제를 다시 다운로드하거나, 완료 후 제출할 수 있어요.</div>
        <div style="display: flex; gap: 6px; justify-content: center;">
          <a href="${filename}" download class="room-btn" id="download-a"
            style="flex: 1; text-decoration: none; height: 18px;
         display: inline-flex; align-items: center; justify-content: center;">📂 다시 다운로드</a>
          <button class="room-btn" style="background: #1976d2; flex: 1;" id="upload-btn">✅ 완료했어요!</button>
        </div>
      `;
    } else {
      content += `
        <div style="margin-bottom: 10px;">해당 숙제를 다운로드하세요.</div>
        <a href="${filename}" download class="room-btn" id="download-btn"
          style="flex: 1; text-decoration: none; height: 18px;
         display: inline-flex; align-items: center; justify-content: center;">📂 다운로드</a>
      `;
    }
  } else if (["오늘 내 숙제", "시험지 만들어주세요", "채점만 해주세요", "이거 잘 모르겠어요"].includes(hw)) {
    let question = "어떤 숙제인가요?";
    let explanation = "간단히 설명해주세요.";

    if (hw === "시험지 만들어주세요") {
      question = "어떤 시험지가 필요하신가요?";
      explanation = "시험지 구성이나 범위를 알려주세요.";
    } else if (hw === "채점만 해주세요") {
      question = "어떤 걸 채점해드릴까요?";
      explanation = "채점 기준이나 요청 사항이 있다면 적어주세요.";
    } else if (hw === "이거 잘 모르겠어요") {
      question = "어떤 부분이 어려우셨나요?";
      explanation = "잘 모르겠는 이유를 자유롭게 적어주세요.";
    }

    content += `
      <label>${question}</label>
      <input type="text" id="custom_hwtype" style="width:100%; margin-bottom:6px;" />
      <label>${explanation}</label>
      <textarea id="custom_hwdesc" rows="3" style="width:100%; resize:none;"></textarea>
      <button class="room-btn" style="background:#1976d2; margin-top: 6px;" id="custom-complete-btn">✅ 완료했어요!</button>
    `;
  } else {
    content += `<div style="margin: 12px 0;">단어 퀴즈를 풀어보아요!</div>`;
  }

  content += `
    <button id="close-popup" class="room-btn" style="margin-top:14px; width:100%; background:#f17b2a;">닫기</button>
  `;

  popup.innerHTML = content;

  popup.querySelector('#close-popup')?.addEventListener('click', () => popupContainer.remove());

  popup.querySelector('#download-btn')?.addEventListener('click', () => {
    localStorage.setItem(key, 'true');
    showDishPopup(item);
  });

  popup.querySelector('#download-a')?.addEventListener('click', () => {
    localStorage.setItem(key, 'true');
  });

  popup.querySelector('#upload-btn')?.addEventListener('click', () => {
    window.storePendingHomework({
      Subcategory: item.Subcategory,
      HWType: "pdf사진",
      LessonNo: item.LessonNo,
      Status: "readyToBeSent",
      comment: "완료 후 제출 예정"
    });
    popupContainer.remove();
    window.showReceiptFromQordered(item.Subcategory);
  });

  popup.querySelector('#custom-complete-btn')?.addEventListener('click', () => {
    let detail = document.getElementById('custom_hwtype')?.value.trim();
    let explanation = document.getElementById('custom_hwdesc')?.value.trim();

    const combinedComment = `[${detail}] ${explanation}`;

    window.storePendingHomework({
      Subcategory: item.Subcategory,
      HWType: "사진촬영",
      LessonNo: null,
      Status: "readyToBeSent",
      comment: combinedComment
    });
    popupContainer.remove();
    window.showReceiptFromQordered(item.Subcategory);
  });

  popupContainer.appendChild(popup);
  cafeInt.appendChild(popupContainer);
};
