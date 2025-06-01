window.examMain = async function () {
  const display = document.getElementById('displayArea');
  display.innerText = "🧾 시험지를 준비 중입니다...";

  try {
    const res = await fetch("https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/giveExam");
    const data = await res.text();
    display.innerHTML = `<div>📄 시험지:</div><div style="margin-top: 10px;">${data}</div>`;
  } catch (err) {
    display.innerHTML = "🚨 시험지를 불러오는 중 오류가 발생했습니다.";
    console.error("시험지 로딩 실패:", err);
  }
};

window.gradingMain = async function () {
  const display = document.getElementById('displayArea');
  display.innerText = "📊 채점 결과를 불러오는 중입니다...";

  try {
    const res = await fetch("https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/showScore");
    const data = await res.text();
    display.innerHTML = `<div>✅ 채점 결과:</div><div style="margin-top: 10px;">${data}</div>`;
  } catch (err) {
    display.innerHTML = "🚨 채점 결과를 불러오는 중 오류가 발생했습니다.";
    console.error("채점 결과 로딩 실패:", err);
  }
};
