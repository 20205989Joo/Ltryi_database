window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');
  if (!userId) return;

  try {
    // 🟢 숙제 제출 데이터 불러오기
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWImages?userId=${userId}`);
    const data = await res.json();

    const submissionSet = new Set();
    data.forEach(item => {
      const d = new Date(item.Timestamp);
      const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000); // ★ KST 보정
      const key = `${kstDate.getFullYear()}-${(kstDate.getMonth() + 1)
        .toString().padStart(2, '0')}-${kstDate.getDate().toString().padStart(2, '0')}`;
      submissionSet.add(key);
    });

    // 📆 영어 월명 표시 (세로)
    const monthNames = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];
    const today = new Date();
    const monthName = monthNames[today.getMonth()];
    const monthLabel = document.getElementById('calendarMonth');
    if (monthLabel) {
      monthLabel.textContent = monthName;
    }

    // 🗓️ 달력 테이블 그리기
    const calendarTable = document.getElementById('calendarTable');
    calendarTable.innerHTML = "";

    // 요일 헤더
    const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];
    const weekRow = document.createElement('tr');
    for (let i = 0; i < 7; i++) {
      const th = document.createElement('td');
      th.innerText = weekLabels[i];
      th.style.fontWeight = 'bold';
      weekRow.appendChild(th);
    }
    calendarTable.appendChild(weekRow);

    // 시작 날짜: 이번 달 1일이 포함된 주의 일요일
    const year = today.getFullYear();
    const firstOfMonth = new Date(year, today.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    // ✅ 총 5주 출력
    for (let week = 0; week < 5; week++) {
      const row = document.createElement('tr');
      for (let day = 0; day < 7; day++) {
        const cellDate = new Date(start);
        cellDate.setDate(start.getDate() + week * 7 + day);

        const key = `${cellDate.getFullYear()}-${(cellDate.getMonth() + 1)
          .toString().padStart(2, '0')}-${cellDate.getDate().toString().padStart(2, '0')}`;

        const td = document.createElement('td');
        td.innerText = cellDate.getDate();

        // 🔸 흐리게 처리 (이달이 아닌 날짜)
        if (cellDate.getMonth() !== today.getMonth()) {
          td.classList.add('dimmed');
        }

        if (submissionSet.has(key)) {
          td.classList.add('submitted');
          td.title = "숙제 제출됨";
        } else {
          td.classList.add('not-submitted');
          td.title = "미제출";
        }

        row.appendChild(td);
      }
      calendarTable.appendChild(row);
    }

  } catch (err) {
    console.error("캘린더 데이터 오류:", err);
  }
});
