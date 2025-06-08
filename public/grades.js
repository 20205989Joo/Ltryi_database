window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');
  if (!userId) return;

  try {
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWPlus?userId=${userId}`);
    const data = await res.json();

    const dateMap = {};
    let todayQGrade = 0;
    const todayItems = [];

    // ✅ 오늘 날짜 (KST 기준 문자열)
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv-SE');  // ex: "2025-06-07"
    console.log("📌 [기준 now 시각 (로컬 KST)]:", now.toString());
    console.log("📅 [기준 날짜 (YYYY-MM-DD)] :", todayStr);

    data.forEach(item => {
      const timestamp = item.Timestamp;
      const rawDateStr = timestamp?.slice(0, 10); // "YYYY-MM-DD"
      const score = Number(item.Score);

      console.log("🧾 [원본 Timestamp (ISO)]      :", timestamp);
      console.log("📅 [날짜 문자열 비교 기준]    :", rawDateStr);
      console.log("📦 [Subcategory / Score]     :", item.Subcategory, "/", score);

      if (!isNaN(score)) {
        if (!dateMap[rawDateStr]) dateMap[rawDateStr] = 0;
        dateMap[rawDateStr] += score;

        if (rawDateStr === todayStr) {
          console.log("✅ [오늘 숙제로 판정됨]");
          todayQGrade += score;
          todayItems.push(item);
        } else {
          console.log("❌ [오늘 숙제가 아님]");
        }
      }
    });

    // ✅ 누적 점수 계산
    const sortedDates = Object.keys(dateMap).sort();
    const dailyGrades = [];
    const cumulativeGrades = [];
    let cumulativeTotal = 0;

    sortedDates.forEach(date => {
      const value = dateMap[date];
      dailyGrades.push(value);
      cumulativeTotal += value;
      cumulativeGrades.push(cumulativeTotal);
    });

    // ✅ 오늘 점수 표시 + 숙제 요약
    const todayEl = document.getElementById('todayPoint');
    const todayWrapper = todayEl?.parentElement;

    if (todayEl) {
      todayEl.textContent = `${todayQGrade}`;

      const details = todayItems
        .filter(item =>
          item.Subcategory &&
          item.Score !== null &&
          item.Score !== '' &&
          !isNaN(Number(item.Score)) &&
          Number(item.Score) > 0
        )
        .map(item => `${item.Subcategory}: ${Number(item.Score)}점`);

      let detailEl = document.getElementById('todayPointDetails');
      if (!detailEl) {
        detailEl = document.createElement('div');
        detailEl.id = 'todayPointDetails';

        Object.assign(detailEl.style, {
          position: 'absolute',
          top: '-150px',
          left: '20px',
          fontSize: '11px',
          color: '#fffde0',
          lineHeight: '1.2',
          whiteSpace: 'pre-line',
          maxWidth: '130px',
          pointerEvents: 'none',
          opacity: '0.85',
          zIndex: '6'
        });

        todayWrapper?.appendChild(detailEl);
      }

      detailEl.textContent = details.join('\n');
    }

    // ✅ 차트 그리기
    const ctx = document.getElementById('submissionChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedDates,
        datasets: [
          {
            type: 'bar',
            label: '일일 점수',
            data: dailyGrades,
            backgroundColor: '#FFDBAC',
            borderColor: '#D28C45',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            type: 'line',
            label: '누적 점수',
            data: cumulativeGrades,
            borderColor: '#FFF2C9',
            backgroundColor: 'transparent',
            tension: 0.3,
            fill: false,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: { display: false },
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: {
              color: '#FFF9E2',
              font: { weight: 'bold' }
            },
            grid: { color: 'rgba(255,255,255,0.1)' }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: '#FFF9E2',
              stepSize: 1,
              font: { weight: 'bold' }
            },
            grid: { color: 'rgba(255,255,255,0.15)' }
          }
        }
      }
    });

  } catch (err) {
    console.error("❌ 데이터 불러오기 실패:", err);
  }
});
