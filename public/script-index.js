function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ✅ 로그인 버튼 클릭 시
document.getElementById('loginButton')?.addEventListener('click', async function () {
  const iosTutorialId = localStorage.getItem('tutorialIdForSubscription');
  const isIOS = Boolean(iosTutorialId);

  let permission = 'granted';
  if (!isIOS) {
    permission = await Notification.requestPermission();
    if (permission === 'denied') {
      alert("🚫 브라우저 알림이 차단되어 있습니다.\n설정에서 직접 알림 허용을 해주세요.");
      return;
    }
  }

  const enteredUsername = document.getElementById('username').value.trim();
  const enteredPassword = document.getElementById('password').value.trim();
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
        body: JSON.stringify({ userId: enteredUsername, password: enteredPassword })
      }
    );

    if (response.status === 200) {
      const data = await response.json();
      const userId = data.userId || enteredUsername;
      const userType = data.userType || 'student';
      const isRegistered = data.isRegistered === true;

      if (!isRegistered) {
        alert("💳 이 계정은 아직 등록되지 않았습니다.\n결제 또는 등록이 완료되어야 사용할 수 있어요.");
        return;
      }

      localStorage.setItem('currentUserId', userId);

      // ✅ iOS 푸시 구독 ID 처리
      if (isIOS && iosTutorialId) {
        try {
          await fetch('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/append-tutorial-id-fromios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, tutorialId: iosTutorialId })
          });
        } catch (err) {
          console.warn("iOS tutorialId append 실패:", err);
        }
      }

      // ✅ 일반 환경에서 푸시 구독 처리
      else if (!isIOS && permission === 'granted') {
        try {
          await navigator.serviceWorker.register('service-worker.js');
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });

          await fetch('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/login-subscription-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, subscription })
          });
        } catch (err) {
          console.warn("알림 등록 실패 (무시됨):", err);
        }
      }

      // ✅ 사용자 유형에 따라 리다이렉트
      if (userType === 'student') {
        window.location.href = `student-room.html?id=${userId}`;
      } else if (userType === 'parent') {
        window.location.href = `parents-room.html?id=${userId}`;
      } else if (userType === 'teacher') {
        window.location.href = `teacher-room.html?id=${userId}`;
      } else {
        alert("🚨 알 수 없는 사용자 유형입니다. 관리자에게 문의해주세요.");
      }

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

// ✅ 엔터로 로그인
document.getElementById('password')?.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    document.getElementById('loginButton')?.click();
  }
});

// ✅ 튜토리얼 진입 버튼 클릭 시
document.getElementById('btnTStudentTutorial')?.addEventListener('click', () => {
  const tutorialId = localStorage.getItem('tutorialIdForSubscription');
  if (!tutorialId) {
    alert("❌ tutorial ID가 없습니다.\n먼저 '일단 시도!'를 눌러 tutorial ID를 발급받아야 합니다.");
    return;
  }
  window.location.href = `tutorial/student-room_tutorial.html?id=${tutorialId}`;
});

// ✅ 튜토리얼 바로 실행 버튼
document.getElementById('launchStudentTutorial')?.addEventListener('click', () => {
  const userId = localStorage.getItem('currentUserId') || 'Tutorial';
  window.location.href = `tutorial/student-room_tutorial.html?id=${userId}`;
});

// ✅ 부모 튜토리얼 진입
document.getElementById('btnTParentsTutorial')?.addEventListener('click', () => {
  window.location.href = 'tutorial/parents-room_tutorial.html?id=ParentsSample';
});

// ✅ 회원가입
document.getElementById('signupButton')?.addEventListener('click', () => {
  window.location.href = 'register.html';
});
