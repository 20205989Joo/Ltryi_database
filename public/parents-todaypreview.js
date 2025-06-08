async function waitUntilChildReady() {
  while (!childId) {
    await new Promise(r => setTimeout(r, 50));
  }
}


window.addEventListener("DOMContentLoaded", async () => {

    await waitUntilChildReady();

  const display = document.querySelector(".display-window");
  const label = document.getElementById("todayLabel");

  if (!display) {
    console.error("❌ display-window 요소를 찾을 수 없습니다.");
    return;
  }

  if (!childId) {
    console.error("❌ childId가 null입니다. 자녀 정보가 아직 준비되지 않았습니다.");
    return;
  }

  try {
    const res = await fetch(`${BASE}/api/getHWPlus?userId=${childId}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.warn("❌ getHWPlus 응답이 배열이 아님:", data);
      display.innerHTML = `<div style="color:red;">불러온 숙제 데이터가 잘못되었습니다.</div>`;
      return;
    }

    const today = data.filter((entry) => isToday(entry.Timestamp));

    display.innerHTML = "";

    if (today.length > 0) {
      label.textContent = "오늘의 숙제 : 제출됨";
      label.style.background = "rgba(43, 156, 54, 0.8)";
      today.forEach((entry) => {
        const raw = entry.orderedFileURL;
        if (!raw) return;

        const card = document.createElement("div");
        card.className = "image-card";
        const title = document.createElement("div");
        title.innerHTML = `<b>${formatTime(entry.Timestamp)}</b> · <span>${entry.Subcategory ?? "숙제"}</span>`;
        card.appendChild(title);

        const urls = Array.isArray(raw) ? raw : [raw];
        urls.forEach((url) => card.appendChild(createPreview(url)));

        display.appendChild(card);
      });
    } else {
      label.textContent = "오늘의 숙제 : X";
      label.style.background = "rgba(181, 78, 40, 0.8)";
      display.innerHTML = '<div style="color:#eee">제출된 숙제가 없습니다.</div>';
    }
  } catch (err) {
    console.error("❌ 오늘 숙제 미리보기 오류:", err);
    display.innerHTML = `<div style="color:red;">데이터를 불러오지 못했습니다.</div>`;
  }

  // ✅ 상담 요청 처리 (dialogue-box에 삽입)
  document.getElementById("choiceCounsel")?.addEventListener("click", () => {
    const dialogueBox = document.querySelector(".npc-dialogue-box");
     dialogueBox.style.top = '300px';
     dialogueBox.style.height = '200px';
    dialogueBox.innerHTML = `
      <div style="font-size: 13px; font-weight: bold; margin-bottom: 6px;">📮 선생님께 상담 요청</div>
      <textarea id="counselMessage" rows="4" placeholder="숙제 진행 관련해서 편하게 문의해주세요." style="width:100%; font-size:13px; margin-bottom:10px;"></textarea>
      <button id="sendCounselBtn" style="padding: 6px 10px; background: #7e3106; color: white; border: none; border-radius: 6px; top: 100px;">보내기</button>
      <button id="backBtn" style="margin-top: -130px;">← 돌아가기</button>
    `;

    document.getElementById("sendCounselBtn")?.addEventListener("click", async () => {
      const msg = document.getElementById("counselMessage").value.trim();
      if (!msg) return alert("내용을 입력해주세요.");

      // ✅ 텍스트를 파일로 감싸기 (.txt)
      const blob = new Blob([msg], { type: "text/plain" });
      const file = new File([blob], "counsel_message.txt", { type: "text/plain" });

      const formData = new FormData();
      formData.append("UserId", userId || "anonymous");
      formData.append("Subcategory", "상담");
      formData.append("HWType", "counsel");
      formData.append("LessonNo", 0);
      formData.append("Comment", msg);
      formData.append("HWImage", file);

      try {
        const res = await fetch(`${BASE}/api/saveHWPlus`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          dialogueBox.innerHTML = `
            <div style="color:lightgreen; font-weight:bold;">✅ 상담 요청이 전송되었습니다!</div>
            <button id="backBtn" style="margin-top: 10px;">← 돌아가기</button>
          `;
          document.getElementById("backBtn").onclick = () => location.reload();
        } else {
          const result = await res.json();
          alert("❌ 전송 실패: " + result.message);
        }
      } catch (err) {
        alert("🚨 서버 오류가 발생했습니다.");
      }
    });

    document.getElementById("backBtn").onclick = () => location.reload();
  });
});


function isToday(ts) {
  const today = new Date();
  const date = new Date(new Date(ts).getTime() - 9 * 60 * 60 * 1000); // 한국시간 변환
  return today.toDateString() === date.toDateString();
}

function formatTime(ts) {
  const d = new Date(new Date(ts).getTime() - 9 * 60 * 60 * 1000); // 한국시간 변환
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function createPreview(fileUrl) {
  console.log("📎 createPreview():", fileUrl);
  const container = document.createElement('div');
  container.className = 'preview-item';
  const ext = fileUrl.split('.').pop().toLowerCase();
  console.log("📂 파일 확장자:", ext);

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
    const img = document.createElement("img");
    img.src = fileUrl;
    img.alt = "숙제 이미지";
    img.style.maxWidth = "100%";
    container.appendChild(img);
  } else if (ext === "pdf") {
    const iframe = document.createElement("iframe");
    iframe.src = fileUrl;
    iframe.style.width = "100%";
    iframe.style.height = "300px";
    container.appendChild(iframe);
  } else {
    const unsupported = document.createElement("div");
    unsupported.className = "unsupported-file";
    unsupported.innerHTML = `
      <span class="icon">📄</span>
      <span>미리보기 불가 파일 (.${ext})</span>
    `;
    container.appendChild(unsupported);
  }

  return container;
}