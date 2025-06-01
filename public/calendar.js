// calendar.js
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');
  if (!userId) return;

  try {
    // 🟢 숙제 제출 데이터 가져오기
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWPlus?userId=${userId}`);
    const data = await res.json();

    const kstOffset = 9 * 60 * 60 * 1000;

    // ✅ 제출 날짜 KST 기준으로 정리 (grades.js와 동일)
    const submissionSet = new Set();
    data.forEach(item => {
      const raw = new Date(item.Timestamp);
      const kstKey = new Date(raw.getTime() + kstOffset).toISOString().slice(0, 10);
      submissionSet.add(kstKey);

      console.log(`📅 숙제 Timestamp: ${item.Timestamp} → KST 날짜: ${kstKey} / ${item.Subcategory}`);
    });

    // ✅ 현재 날짜도 KST 기준
    const now = new Date();
    const kstNow = new Date(now.getTime() + kstOffset);
    const currentYear = kstNow.getFullYear();
    const currentMonth = kstNow.getMonth(); // 0-based

    // 📆 월 이름 표시
    const monthNames = [
      "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
      "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];
    const monthLabel = document.getElementById('calendarMonth');
    if (monthLabel) monthLabel.textContent = monthNames[currentMonth];

    // 📆 달력 DOM 초기화
    const calendarTable = document.getElementById('calendarTable');
    calendarTable.innerHTML = "";

    const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];
    const weekRow = document.createElement('tr');
    for (let i = 0; i < 7; i++) {
      const th = document.createElement('td');
      th.innerText = weekLabels[i];
      th.style.fontWeight = 'bold';
      weekRow.appendChild(th);
    }
    calendarTable.appendChild(weekRow);

    // 🗓️ 달력 시작일: 해당 월 1일이 포함된 주의 일요일
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    // ✅ 5주치 달력 출력
    for (let week = 0; week < 5; week++) {
      const row = document.createElement('tr');
      for (let day = 0; day < 7; day++) {
        const cellDate = new Date(start);
        cellDate.setDate(start.getDate() + week * 7 + day);

        const key = cellDate.toISOString().slice(0, 10); // ✅ UTC 기준으로 key 뽑고
        const kstKey = new Date(cellDate.getTime() + kstOffset).toISOString().slice(0, 10); // ✅ 보정

        const td = document.createElement('td');
        td.innerText = cellDate.getDate();

        // 🔸 이달이 아닌 날짜는 흐리게
        if (cellDate.getMonth() !== currentMonth) {
          td.classList.add('dimmed');
        }

        if (submissionSet.has(kstKey)) {
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
    console.error("📛 캘린더 데이터 오류:", err);
  }
});
