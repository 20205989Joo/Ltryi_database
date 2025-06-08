console.log("📘 튜토리얼용 todaypreview 시작");

window.addEventListener("DOMContentLoaded", async () => {
  const display = document.querySelector(".display-window");
  const label = document.getElementById("todayLabel");

  if (!display || !label) {
    console.error("❌ display 또는 label 요소가 없습니다.");
    return;
  }

  try {
    const res = await fetch("/parents-room_tutorial_data.json");
    const json = await res.json();
    const today = json.todayPreview;
    const imageList = [
      { url: "dpwindow_instructions1.png", submittedAgo: "2시간 전" },
      { url: "dpwindow_instructions2.png", submittedAgo: "2시간 전" },
    ];

display.innerHTML = "";

const overlay = document.createElement("div");
overlay.innerHTML = [
  "오늘 학생이",
  "제출한 숙제가",
  "여기서 보여집니다.⬇"
].join("<br>");
overlay.style.top = "10px";
overlay.style.left = "12px";
overlay.style.fontSize = "12px";
overlay.style.color = "white";
overlay.style.background = "rgba(0,0,0,0.4)";
overlay.style.padding = "4px 18px";
overlay.style.borderRadius = "6px";
overlay.style.width = "110px";
overlay.style.boxShadow = "0px 0px 10px 4px rgb(216, 164, 142)";

display.appendChild(overlay);

    
    imageList.forEach((entry, index) => {
      const card = document.createElement("div");
      card.className = "image-card";
      card.style.position = "relative";

      

      const img = document.createElement("img");
      img.src = entry.url;
      img.alt = `제출된 숙제 ${index + 1}`;
      img.style.width = "100%";
      card.appendChild(img);



          display.appendChild(card);
    });


    label.textContent = "오늘의 숙제 : 제출됨";
    label.style.background = "rgba(43, 156, 54, 0.8)";
  } catch (err) {
    console.error("❌ 오늘 숙제 미리보기 오류:", err);
    display.innerHTML = `<div style="color:red;">데이터를 불러오지 못했습니다.</div>`;
    label.textContent = "오늘의 숙제 : X";
    label.style.background = "rgba(181, 78, 40, 0.8)";
  }

  // 📮 상담 기능은 그대로 유지
  document.getElementById("choiceCounsel")?.addEventListener("click", () => {
    const dialogueBox = document.querySelector(".npc-dialogue-box");
    dialogueBox.style.top = '300px';
    dialogueBox.style.height = '200px';
    dialogueBox.innerHTML = `
      <div style="font-size: 13px; font-weight: bold; margin-bottom: 6px;">📮 선생님께 상담 요청</div>
      <textarea id="counselMessage" rows="4" placeholder="이곳에서 선생님께 상담을 요청할 수 있습니다." style="width:100%; font-size:13px; margin-bottom:10px;"></textarea>
      <button id="backBtn" style="margin-top: 10px; top : 150px;">← 돌아가기</button>
    `;
    

    document.getElementById("sendCounselBtn")?.addEventListener("click", () => {
      const msg = document.getElementById("counselMessage").value.trim();
      if (!msg) return alert("내용을 입력해주세요.");
      dialogueBox.innerHTML = `
        <div style="color:lightgreen; font-weight:bold;">✅ 상담 요청이 전송된 것으로 간주됩니다!</div>
        <button id="backBtn" style="margin-top: 10px;">← 돌아가기</button>
      `;
      document.getElementById("backBtn").onclick = () => location.reload();
    });

    document.getElementById("backBtn").onclick = () => location.reload();
  });
});
