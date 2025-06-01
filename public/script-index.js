const vapidPublicKey = 'BEvKBnLcnotYEeOBexk0i-_2oK5aU3epudG8lszhppdiGeiDT2JPbkXF-THFDYXcWjiGNktD7gIOj4mE_MC_9nE';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ✅ 로그인 처리 (API 연결)
document.getElementById('loginButton').addEventListener('click', async function () {
  // 1. 알림 권한 요청 (한 번만, 조용히)
  const permission = await Notification.requestPermission();

  if (permission === 'denied') {
    alert("🚫 브라우저 알림이 차단되어 있습니다.\n설정에서 직접 알림 허용을 해주세요.");
    return; // ❗ 원하면 로그인 차단도 가능 (선택사항)
  }

  // 2. 로그인 입력 확인
  const enteredUsername = document.getElementById('username').value;
  const enteredPassword = document.getElementById('password').value;

  if (!enteredUsername || !enteredPassword) {
    alert("ID와 비밀번호를 모두 입력해주세요.");
    return;
  }

  try {
    const response = await fetch(
      'https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: enteredUsername,
          password: enteredPassword
        })
      }
    );

    if (response.status === 200) {
      const data = await response.json();
      const userId = data.userId || enteredUsername;

      localStorage.setItem('currentUserId', userId);
      window.location.href = `student-room.html?id=${userId}`;
    } else if (response.status === 401) {
      alert("잘못된 ID 또는 비밀번호입니다.");
    } else {
      alert("로그인 중 오류가 발생했습니다.");
    }
  } catch (error) {
    console.error(error);
    alert("네트워크 오류로 로그인할 수 없습니다.");
  }
});



// ✅ 테스트용 단축 버튼들
document.getElementById('btnTStudent')?.addEventListener('click', function () {
  window.location.href = 'student-room.html?id=Tester';
});

document.getElementById('btnTParents')?.addEventListener('click', function () {
  window.location.href = 'parents-room.html?id=Tester';
});

document.getElementById('btnTTeacher')?.addEventListener('click', function () {
  window.location.href = 'teacher-room.html?id=Tester';
});

// ✅ 튜토리얼 진입 전에 알림 설정 팝업
document.getElementById('btnTStudentTutorial')?.addEventListener('click', () => {
  document.getElementById('popup-student').style.display = 'block';
});

document.getElementById('confirmStudentPermission')?.addEventListener('click', async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert("알림 권한이 필요합니다.");
      return;
    }

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
    const userId = data.userId;
    localStorage.setItem('currentUserId', userId);

    // ✅ 팝업 닫고 바로 튜토리얼 페이지로 이동
    document.getElementById('popup-student').style.display = 'none';
    window.location.href = `tutorial/student-room_tutorial.html?id=${userId}`;

  } catch (err) {
    console.error("튜토리얼 ID 발급 실패:", err);
    alert("알림 설정에 실패했습니다. 다시 시도해주세요.");
  }
});


document.getElementById('launchStudentTutorial')?.addEventListener('click', () => {
  const userId = localStorage.getItem('currentUserId') || 'Tutorial';
  window.location.href = `tutorial/student-room_tutorial.html?id=${userId}`;
});

document.getElementById('btnTParentsTutorial')?.addEventListener('click', () => {
  window.location.href = 'tutorial/parents-room_tutorial.html?id=Tutorial';
});

// ✅ 회원가입 버튼 → register.html로 이동
document.getElementById('signupButton')?.addEventListener('click', () => {
  window.location.href = 'register.html';
});
