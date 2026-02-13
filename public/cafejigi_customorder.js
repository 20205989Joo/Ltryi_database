// 📅 날짜 포맷
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
}

// 파일 타입 구분
function detectFileType(url) {
  if (!url) return 'unknown';
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
    return 'image';
  }
  if (lower.endsWith('.pdf')) {
    return 'pdf';
  }
  return 'unknown';
}

// 시험지 / 채점 결과 라벨
function getOrderLabel(entry) {
  if (entry.Subcategory === '시험지 만들어주세요') return '시험지';
  if (entry.Subcategory === '채점만 해주세요') return '채점 결과';
  return entry.Subcategory || '자료';
}

// 🔍 위쪽 display-window 미리보기 + 다운로드
function renderPreview(entry) {
  const display = document.getElementById('displayArea');
  if (!display) return;

  // 선택 전 안내
  if (!entry) {
    display.innerHTML = `
      <div class="preview-wrapper">
        <div class="preview-header">
          주문하셨던 시험지나 채점 결과가 있으면<br>
          아래 목록에서 하나 골라보세요.
        </div>
      </div>
    `;
    return;
  }

  const url = entry.servedFileURL;
  const fileType = detectFileType(url);
  const label = getOrderLabel(entry);
  const time = formatDate(entry.Timestamp);
  const comment = entry.Comment || '';

  let bodyHtml = '';

  if (fileType === 'image') {
    bodyHtml = `
      <div class="preview-body">
        <img src="${url}" alt="미리보기">
      </div>
    `;
  } else if (fileType === 'pdf') {
    bodyHtml = `
      <div class="preview-body">
        <iframe src="${url}" title="PDF preview"></iframe>
      </div>
    `;
  } else {
    bodyHtml = `
      <div class="preview-body">
        이 파일 형식은 간단 미리보기 대신 열어서 보는 게 좋겠어요.
      </div>
    `;
  }

  const commentHtml = comment
    ? `<div class="preview-comment" style="font-size:10px; opacity:0.85; line-height:1.3;">
         💬 ${comment}
       </div>`
    : '';

  // 🔻 다운로드 버튼은 display-window의 하단에 고정 (CSS에서 sticky 처리)
  display.innerHTML = `
    <div class="preview-wrapper">
      <div class="preview-header">
        <b>${label}</b><br>
        <span class="preview-date">${time}</span>
      </div>
      ${bodyHtml}
      ${commentHtml}
      <div class="preview-download-container">
        <a href="${url}" target="_blank" class="preview-download-btn">
          다운로드
        </a>
      </div>
    </div>
  `;
}

// 아래 대화창 목록의 한 줄
function buildListItem(entry, index) {
  const time = formatDate(entry.Timestamp);
  const label = getOrderLabel(entry);
  const comment = entry.Comment || '';

  return `
    <div class="file-item" data-index="${index}">
      <div class="file-item-header">
        <span class="file-item-date">${time}</span>
        <span class="file-item-type">${label}</span>
      </div>
      ${comment ? `<div class="file-item-comment">${comment}</div>` : ''}
    </div>
  `;
}

// 핵심: 시험지 + 채점 결과 통합 목록 로드
async function loadCustomList() {
  const display = document.getElementById('displayArea');
  const dialogueBox = document.getElementById('dialogueBox');
  if (!display || !dialogueBox) return;

  // 이 모드에서만 대화창 크게
  dialogueBox.classList.add('expanded-list');

  dialogueBox.innerHTML = `
    <div class="dialogue-title">
      주문하셨던 시험지 / 채점 결과 목록이에요.
    </div>
    <div id="fileList" class="file-list"></div>
    <button id="dialogueBackBtn" class="dialogue-back">← 돌아가기</button>
  `;

  // ← 돌아가기: 페이지 새로고침해서 원래 메뉴로
  const backBtn = document.getElementById('dialogueBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      location.reload();
    });
  }

  // 위쪽 미리보기 영역 초기 안내
  renderPreview(null);

  const apiUserId = new URLSearchParams(location.search).get('id') || 'anonymous';

  try {
    const res = await fetch(
      `https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWPlus?userId=${encodeURIComponent(apiUserId)}`
    );

    if (!res.ok) {
      console.error("getHWPlus HTTP 에러 상태:", res.status);
      const msg = res.status === 404
        ? "서버에서 기록을 찾지 못했어요. (코드 404)"
        : `자료를 불러오지 못했어요. (코드 ${res.status})`;

      const listEl = document.getElementById('fileList');
      if (listEl) {
        listEl.innerHTML = `<div class="file-empty">${msg}</div>`;
      }
      display.innerHTML = `
        <div class="preview-wrapper">
          <div class="preview-header">${msg}</div>
        </div>
      `;
      return;
    }

    let data;
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text();
      console.error("getHWPlus JSON 파싱 실패. 원본 응답:", text);
      throw e;
    }

    if (!Array.isArray(data)) {
      console.error("getHWPlus 응답이 배열이 아닙니다:", data);
      const listEl = document.getElementById('fileList');
      if (listEl) {
        listEl.innerHTML = `<div class="file-empty">응답 형식이 예상과 달라요.</div>`;
      }
      display.innerHTML = `
        <div class="preview-wrapper">
          <div class="preview-header">🚨 자료 형식을 이해하지 못했어요.</div>
        </div>
      `;
      return;
    }

    // ✅ checked + servedFileURL + 두 Subcategory만 필터
    const allowedSub = ['시험지 만들어주세요', '채점만 해주세요'];

    let filtered = data.filter(item =>
      item.Status === 'checked' &&
      item.servedFileURL &&
      allowedSub.includes(item.Subcategory)
    );

    // 최신순 정렬
    filtered.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

    const listEl = document.getElementById('fileList');
    if (!listEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `
        <div class="file-empty">
          📭 아직 도착한 시험지나 채점 결과가 없습니다.
        </div>
      `;
      renderPreview(null);
      return;
    }

    // 리스트 렌더링
    listEl.innerHTML = filtered
      .map((entry, index) => buildListItem(entry, index))
      .join('');

    const items = listEl.querySelectorAll('.file-item');

    // 클릭 시 선택 / 미리보기
    items.forEach(item => {
      item.addEventListener('click', () => {
        items.forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');

        const idx = parseInt(item.dataset.index, 10);
        const selected = filtered[idx];
        renderPreview(selected);
      });
    });

    // 기본으로 맨 위 항목 자동 선택
    if (filtered.length > 0 && items[0]) {
      items[0].classList.add('selected');
      renderPreview(filtered[0]);
    }

  } catch (err) {
    console.error("주문 자료 불러오기 실패:", err);
    const listEl = document.getElementById('fileList');
    if (listEl) {
      listEl.innerHTML = `
        <div class="file-empty">
          🚨 자료를 불러오는 중 오류가 발생했습니다.
        </div>
      `;
    }
    const display = document.getElementById('displayArea');
    if (display) {
      display.innerHTML = `
        <div class="preview-wrapper">
          <div class="preview-header">
            🚨 자료를 불러오는 중 오류가 발생했습니다.
          </div>
        </div>
      `;
    }
  }
}

// 🔓 "저 주실 거 있어요"에서 바로 들어올 진입점
window.customAllMain = function () {
  loadCustomList();
};
