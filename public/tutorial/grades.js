window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const userId = params.get('id');
  if (!userId) return;

  try {
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWImages?userId=${userId}`);
    const data = await res.json();

    const dateMap = {};
    const cumulativeMap = {};
    let cumulativeTotal = 0;
    let todayQGrade = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    data.forEach(item => {
      const date = new Date(item.Timestamp);
      const dateStr = date.toISOString().slice(0, 10); // 'YYYY-MM-DD'

      const qgrade = Number(item.QGrade);
      if (!isNaN(qgrade)) {
        if (!dateMap[dateStr]) dateMap[dateStr] = 0;
        dateMap[dateStr] += qgrade;

        if (dateStr === todayStr) todayQGrade += qgrade;
      }
    });

    // 누적 계산
    const sortedDates = Object.keys(dateMap).sort();
    const dailyGrades = [];
    const cumulativeGrades = [];

    sortedDates.forEach(date => {
      const value = dateMap[date];
      dailyGrades.push(value);
      cumulativeTotal += value;
      cumulativeGrades.push(cumulativeTotal);
    });

    // 오늘 점수 표시
    const todayEl = document.getElementById('todayPoint');
    if (todayEl) todayEl.textContent = `${todayQGrade}`;

    // 그래프 그리기
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
        backgroundColor: '#FFDBAC',      // 카페 크림톤
        borderColor: '#D28C45',
        borderWidth: 1,
        borderRadius: 6
      },
      {
        type: 'line',
        label: '누적 점수',
        data: cumulativeGrades,
        borderColor: '#FFF2C9',          // 연한 노란 선
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
      title: {
        display: false
      },
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#FFF9E2', // 날짜 라벨 색
          font: {
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(255,255,255,0.1)' // 연한 하얀 선
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#FFF9E2',
          stepSize: 1,
          font: {
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(255,255,255,0.15)'
        }
      }
    }
  }
});


  } catch (err) {
    console.error("데이터 불러오기 실패:", err);
  }
});
