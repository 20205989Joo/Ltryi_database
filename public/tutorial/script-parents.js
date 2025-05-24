const params = new URLSearchParams(window.location.search);
const userId = params.get('id');
const API_URL = 'https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWImages?userId=' + userId;

// 오늘 날짜 판별
function isToday(timestampStr) {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const todayKST = new Date(now.getTime() - tzOffset + 9 * 60 * 60 * 1000);

  const submitted = new Date(new Date(timestampStr).getTime() + 9 * 60 * 60 * 1000);

  return (
    todayKST.getFullYear() === submitted.getFullYear() &&
    todayKST.getMonth() === submitted.getMonth() &&
    todayKST.getDate() === submitted.getDate()
  );
}

// 날짜 + 시간 문자열
function formatDateTime(timestampStr) {
  const date = new Date(timestampStr);
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${hours}:${mins}`;
}

// 숙제 로드 및 렌더링
fetch(API_URL)
  .then(res => res.json())
  .then(data => {
    console.log('[📦 전체 데이터]', data);

    const container = document.getElementById('displayArea');
    const label = document.getElementById('todayLabel');
    container.innerHTML = '';

    const todayHomework = data.filter(entry => isToday(entry.Timestamp));

    if (todayHomework.length > 0) {
      label.textContent = '오늘의 숙제 : 제출됨';
        label.style.background = 'rgba(43, 156, 54, 0.8)';
        label.style.color = '#fff'

      todayHomework.forEach(entry => {
        if (!entry.HWImageURL) return;

        const titleText = entry.WhichHW ?? '제목 없음';
        const timeText = formatDateTime(entry.Timestamp).split(' ')[1];

        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = `
          <div><b>${titleText}</b> (🕒 ${timeText})</div>
          <img src="${entry.HWImageURL}" alt="숙제 이미지" />
        `;
        container.appendChild(card);
      });

    } else {
      label.textContent = '오늘의 숙제 :  X';
      label.style.background = 'rgba(181, 78, 40, 0.8)';
      container.innerHTML = '<div style="color:#eee;">제출된 숙제가 없습니다.</div>';
    }
  })
  .catch(err => {
    console.error('불러오기 실패:', err);
    const label = document.getElementById('todayLabel');
    const container = document.getElementById('displayArea');
    label.textContent = '오늘의 숙제 : 확인 실패';
    container.textContent = '데이터를 불러오지 못했습니다.';
  });

// Grades 포탈 이동 버튼
document.getElementById('goGrades')?.addEventListener('click', () => {
  window.location.href = `grades-calendar.html?id=${userId}`;
});

// 메뉴 팝업
const popupBox = document.getElementById('popupBox');
const popupContent = document.getElementById('popupContent');

const responses = {
  choiceStatus: "최근 제출률은 또래보다 약간 높은 편이에요. 단어 숙제는 특히 열심히 하고 있답니다.",
  choiceSuggest: "이번 주는 문법 중급 Day 3과 독해 시작 단계를 추천드려요!",
  choiceCounsel: "상담 요청은 따로 메시지를 남겨주시면 선생님이 확인 후 연락드릴게요. ✉️"
};

['choiceStatus', 'choiceSuggest', 'choiceCounsel'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', () => {
      popupContent.innerHTML = responses[id];
      popupBox.style.display = 'block';
    });
  }
});
