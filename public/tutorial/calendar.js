window.addEventListener('DOMContentLoaded', () => {
  const submissionSet = new Set();

  // ✅ 샘플 날짜 수동 지정
  const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  submissionSet.add(day(-2)); // 이틀 전: 30점
  submissionSet.add(day(-1)); // 하루 전: 10점
  submissionSet.add(day(0));  // 오늘: 20점

  // 📆 영어 월명 표시
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
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const cellDate = new Date(start);
      cellDate.setDate(start.getDate() + week * 7 + dayOffset);

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
});
