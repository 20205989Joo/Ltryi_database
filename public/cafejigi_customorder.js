function formatDate(timestamp) {
  const date = new Date(timestamp);
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}`;
}

window.examMain = async function () {
  const display = document.getElementById('displayArea');
  display.innerText = "🧾 시험지를 확인 중입니다...";

  try {
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWPlus?userId=${userId}`);
    const data = await res.json();

    const filtered = data.filter(item =>
      item.Status === 'checked' &&
      item.Subcategory === '시험지 만들어주세요' &&
      item.servedFileURL
    );

    if (filtered.length === 0) {
      display.innerHTML = "📭 아직 받은 시험지가 없습니다.";
    } else {
      display.innerHTML = filtered.map(entry => `
        <div class="card" style="border:1px solid #aaa; padding:10px; margin-bottom:10px; border-radius:8px; font-size:10px; background-color:rgba(0, 0, 0, 0.4);">
          <div style="margin-bottom: 6px;">
            🗓 <b>${formatDate(entry.Timestamp)}</b> 에 주문하셨던 
            <b>[${entry.Subcategory}]</b>, <br>나왔습니다!<br>
          </div>
          <a href="${entry.servedFileURL}" downloads style="
            display: inline-block;
            padding: 4px 5px;
            border: 1px solid #a78f6f;
            border-radius: 5px;
            background-color: #f4f1ed;
            color: #5c4b3b;
            text-decoration: none;
            font-size: 10px;
            width:90%;
          " onmouseover="this.style.backgroundColor='#e7e1db'" onmouseout="this.style.backgroundColor='#f4f1ed'">
            📥 다운로드
          </a>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("시험지 불러오기 실패:", err);
    display.innerHTML = "🚨 시험지를 불러오는 중 오류가 발생했습니다.";
  }
};


window.gradingMain = async function () {
  const display = document.getElementById('displayArea');
  display.innerText = "📊 채점 결과를 불러오는 중입니다...";

  try {
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWPlus?userId=${userId}`);
    const data = await res.json();

    const filtered = data.filter(item =>
      item.Status === 'checked' &&
      item.Subcategory === '채점만 해주세요' &&
      item.servedFileURL
    );

    if (filtered.length === 0) {
      display.innerHTML = "📭 아직 채점 결과가 도착하지 않았습니다.";
    } else {
      display.innerHTML = filtered.map(entry => `
        <div class="card" style="border:1px solid #aaa; padding:10px; margin-bottom:10px; border-radius:8px; font-size:10px; background-color:rgba(0, 0, 0, 0.4);">
          <div style="margin-bottom: 6px;">
            🗓 <b>${formatDate(entry.Timestamp)}</b> 에 주문하셨던 
            <b>[${entry.Subcategory}]</b>, <br>나왔습니다!<br>
          </div>
          <a href="${entry.servedFileURL}" target="_blank" style="
            display: inline-block;
            padding: 4px 5px;
            border: 1px solid #a78f6f;
            border-radius: 5px;
            background-color: #f4f1ed;
            color: #5c4b3b;
            text-decoration: none;
            font-size: 10px;
            width:90%;
          " onmouseover="this.style.backgroundColor='#e7e1db'" onmouseout="this.style.backgroundColor='#f4f1ed'">
            📥 다운로드
          </a>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("채점 결과 불러오기 실패:", err);
    display.innerHTML = "🚨 채점 결과를 불러오는 중 오류가 발생했습니다.";
  }
};
