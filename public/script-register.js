window.addEventListener("DOMContentLoaded", async () => {
  const vapidPublicKey = 'BEvKBnLcnotYEeOBexk0i-_2oK5aU3epudG8lszhppdiGeiDT2JPbkXF-THFDYXcWjiGNktD7gIOj4mE_MC_9nE';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  let tutorialId = null;

  // ✅ 알림 권한 및 튜토리얼 ID 발급
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('알림 권한 거부됨');

    await navigator.serviceWorker.register('service-worker.js');
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    const res = await fetch('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/grant-tutorial-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });

    const data = await res.json();
    tutorialId = data.userId || null;
    console.log("✅ 튜토리얼 ID 받아옴:", tutorialId);
  } catch (err) {
    console.error("❌ 튜토리얼 ID 요청 실패:", err);
    alert("튜토리얼 ID를 가져오는 데 실패했습니다. 알림 권한을 확인해주세요.");
  }

  // ✅ 출생년도 드롭다운 채우기
  const birthYearSelect = document.getElementById("birthYear");
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= 1930; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = `${year}년생`;
    birthYearSelect.appendChild(option);
  }

  // ✅ 유저 유형 변경 시 동적 필드 표시 제어
  const userTypeSelect = document.getElementById("userType");
  const guardianContactGroup = document.getElementById("guardianContactGroup");
  const connectedToGroup = document.getElementById("connectedToGroup");

  userTypeSelect.addEventListener("change", () => {
    const type = userTypeSelect.value;
    guardianContactGroup.style.display = (type === "student") ? "block" : "none";
    connectedToGroup.style.display = (type === "parent") ? "block" : "none";
  });

  // ✅ 초기 표시 상태 설정
  guardianContactGroup.style.display = (userTypeSelect.value === "student") ? "block" : "none";
  connectedToGroup.style.display = (userTypeSelect.value === "parent") ? "block" : "none";

  const submitBtn = document.getElementById("submitRegister");
  if (!submitBtn) return;

  submitBtn.addEventListener("click", async () => {
    const userId = document.getElementById("userId").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const deadline = document.getElementById("deadline").value;
    const name = document.getElementById("name").value.trim();
    const birthYear = document.getElementById("birthYear").value;
    const userType = document.getElementById("userType").value;
    const guardianContact = document.getElementById("guardianContact")?.value.trim();
    const connectedTo = document.getElementById("connectedTo")?.value.trim();

if (
  !userId || !password || !confirmPassword || !phone ||
  !deadline || !name || !birthYear || !userType ||
  (userType === "student" && !guardianContact) ||
  (userType === "parent" && !connectedTo)
) {
  alert("모든 항목을 입력해주세요.");
  return;
}

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (userType === "student" && !guardianContact) {
      alert("학생 유형일 경우 보호자 연락처는 필수입니다.");
      return;
    }

    if (userType === "parent" && !connectedTo) {
      alert("자녀의 ID를 입력해주세요.");
      return;
    }

    const now = new Date();
    const createdAt = now.toISOString().slice(0, 19).replace("T", " ");

    const body = {
      userId,
      password,
      tutorialIds: tutorialId ? [tutorialId] : [],
      createdAt,
      isRegistered: 0,
      phoneNumber: phone,
      deadline,
      coin: 0,
      userType,
      name,
      birthYear,
      guardianContact: userType === 'student' ? guardianContact : null,
      connectedTo
    };

    console.log("🚀 회원가입 요청 바디:", body);

    try {
      const res = await fetch("https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (res.status === 409) {
        alert("중복된 ID입니다. 다른 ID를 입력해주세요.");
        return;
      }

      if (res.ok) {
        alert("회원가입이 완료되었습니다!");
        window.location.href = "index.html";
      } else {
        console.error("❌ 서버 응답 오류:", result);
        alert("회원가입에 실패했습니다. 다시 시도해주세요.");
      }
    } catch (err) {
      console.error("❌ 네트워크 오류:", err);
      alert("네트워크 오류가 발생했습니다.");
    }
  });
});
