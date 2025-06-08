function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

function detectBrowserIssue() {
  if (localStorage.getItem('forceSafariMode') === 'true') {
    console.warn("🧪 Safari 테스트 모드 활성화됨");
    return 'ios-safari';
  }
    if (localStorage.getItem('forceKakaoMode') === 'true') {
    console.warn("🧪 카카오 브라우저 테스트 모드 활성화됨");
    return 'kakao';
  }

  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isSafari = isIos && ua.includes("safari") && !ua.includes("crios") && !ua.includes("fxios");
  const isKakao = /kakaotalk/.test(ua);
  const isSamsung = /samsungbrowser/.test(ua);
  const isChrome = /chrome/.test(ua) && !isSamsung;

  console.log("🔍 감지된 브라우저 환경:", navigator.userAgent);

  if (isKakao) return 'kakao';
  if (isSafari) return 'ios-safari';
  if (isSamsung) return 'samsung-browser';
  return null;
}

function showEnvironmentTip(type) {
  const messageMap = {
    'kakao': "일부 기능이 카카오 브라우저에서는 정상 작동하지 않을 수 있습니다. 아래 버튼을 눌러 Chrome으로 열어주세요.",
    'ios-safari': "📱 IOS에서는 알림 기능을 비롯해 주요 기능이 제한될 수 있습니다. 업데이트를 기다려주세요.",
    'samsung-browser': "Samsung 브라우저에서는 알림 기능이 제한될 수 있습니다. Chrome 사용을 권장합니다."
  };

  const tip = document.createElement('div');
  tip.innerHTML = `
    <div style="
      position: fixed;
      bottom: 10px;
      left: 10px;
      right: 10px;
      background: #fff8e1;
      color: #333;
      padding: 14px 18px;
      border-radius: 10px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      font-size: 14px;
      line-height: 1.5;
      z-index: 9999;
    ">
      ${messageMap[type] || "이 브라우저 환경에서는 일부 기능에 제한이 있을 수 있습니다."}
      ${type === 'kakao' ? `<br><a href="intent://ltryi.world#Intent;scheme=https;package=com.android.chrome;end" style="color: #1a73e8;">📎 Chrome으로 열기</a>` : ''}
    </div>
  `;
  document.body.appendChild(tip);
}

function insertIosFallbackOverlay() {
  const blocker = document.createElement('div');
  blocker.id = 'ios-overlay-blocker';
  blocker.style = `
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.75);
    color: white;
    z-index: 99999;
    font-family: sans-serif;
  `;

  const msg = document.createElement('div');
  msg.innerHTML = `
    <div style="text-align: center; font-size: 16px; margin-top: 260px;">
      📱 iOS는 현재 시험 버전입니다.<br>일부 기능이 제한될 수 있습니다.
    </div>
  `;

  const button = document.createElement('button');
  button.textContent = '🚧 일단 시도!';
  button.id = 'ios-try-btn';
  button.style = `
    position: absolute;
    left: 50%;
    top: 340px;
    width: 150px;
    height: 30px;
    transform: translateX(-50%);
    padding: 20px 20px;
    font-size: 15px;
    font-weight: bold;
    background: #ffee99;
    color: #333;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    line-height: .2;
  `;

  button.onclick = async () => {
    const rand = Math.floor(10000000 + Math.random() * 90000000);
    const fakeSub = {
      endpoint: `https://fake.endpoint/${rand}`,
      keys: {
        auth: btoa('auth' + rand),
        p256dh: btoa('p256dh' + rand)
      }
    };

    try {
      const response = await fetch('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/grant-tutorial-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: fakeSub })
      });

      const data = await response.json();
      if (data.userId) {
        localStorage.setItem('tutorialIdForSubscription', data.userId);
        console.log('✅ tutorial ID 저장됨 (iOS fallback):', data.userId);
        blocker.remove();
      } else {
        alert("❌ tutorialId 발급 실패: 서버 응답 이상");
      }

    } catch (err) {
      console.error("❌ iOS fallback 실패:", err);
      alert("⚠️ fallback 처리 중 오류가 발생했습니다.");
    }
  };

  blocker.appendChild(msg);
  blocker.appendChild(button);
  document.body.appendChild(blocker);
}

function insertPwaOverlay() {
  const blocker = document.createElement('div');
  blocker.id = 'pwa-overlay-blocker';
  blocker.style = `
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.75);
    color: white;
    z-index: 99999;
    font-family: sans-serif;
  `;

  const msg = document.createElement('div');
  msg.textContent = "📲 알림 기능을 위해 요청을 허용해주세요.";
  msg.style = `
    text-align: center;
    font-size: 16px;
    margin-top: 300px;
  `;

  const button = document.createElement('button');
  button.textContent = '🔔 알림 허용';
  button.id = 'pwa-noti-btn';
  button.style = `
    position: absolute;
    left: 50%;
    top: 400px;
    width: 150px;
    height: 30px;
    transform: translateX(-50%);
    padding: 20px 20px;
    font-size: 15px;
    font-weight: bold;
    background: #ffee99;
    color: #333;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    line-height: .2;
  `;

  button.onclick = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert("🚫 알림 권한이 허용되지 않았습니다.\n설정에서 수동으로 허용해주세요.");
        return;
      }

      await navigator.serviceWorker.register('service-worker.js');
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      const response = await fetch('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/grant-tutorial-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription })
      });

      const data = await response.json();
      if (data.userId) {
        localStorage.setItem('tutorialIdForSubscription', data.userId);
        console.log('✅ tutorial ID 저장됨:', data.userId);
        blocker.remove();
      } else {
        alert("❌ tutorialId 발급 실패: 서버 응답 이상");
      }

    } catch (err) {
      console.error("❌ 알림 권한 또는 tutorial ID 발급 실패:", err);
      alert("⚠️ 알림 설정 중 오류가 발생했습니다.");
    }
  };

  blocker.appendChild(msg);
  blocker.appendChild(button);
  document.body.appendChild(blocker);
}

window.addEventListener('DOMContentLoaded', async () => {
  let log = "📋 디버그 로그\n----------------\n";
  const ua = navigator.userAgent;
  const tutorialId = localStorage.getItem('tutorialIdForSubscription');
  const problem = detectBrowserIssue();
  const permission = Notification.permission;

  log += `📱 UserAgent: ${ua}\n`;
  log += `🔍 문제 감지됨: ${problem || '없음'}\n`;
  log += `🔔 알림 권한 상태: ${permission}\n`;
  log += `🧾 tutorialId 존재 여부: ${tutorialId ? '✅ 있음' : '❌ 없음'}\n`;

  const hasPushSubscription = await navigator.serviceWorker.ready
    .then(reg => reg.pushManager.getSubscription())
    .then(sub => {
      log += `📬 pushManager 구독 상태: ${sub ? '✅ 있음' : '❌ 없음'}\n`;
      return !!sub;
    })
    .catch(err => {
      log += `❌ pushManager 오류: ${err}\n`;
      return false;
    });

if (problem === 'ios-safari' && !tutorialId) {
  insertIosFallbackOverlay();
  log += "🧪 iOS fallback 오버레이 표시됨\n";
} else if (problem === 'kakao' || problem === 'samsung-browser') {
  showEnvironmentTip(problem);
  log += `⚠️ ${problem} 환경 팁 무조건 표시됨\n`;
} else if (problem && !hasPushSubscription) {
  showEnvironmentTip(problem);
  log += "⚠️ 일반 브라우저 환경 팁 표시됨\n";
} else if (!tutorialId && !hasPushSubscription) {
  insertPwaOverlay();
  log += "🧱 insertPwaOverlay() 호출됨\n";
}


  // ✅ Safari 테스트 토글 버튼
  const testBtn = document.createElement('button');
  testBtn.textContent = '🧪 Safari 테스트';
  testBtn.style = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 100000;
    padding: 10px 14px;
    font-size: 14px;
    background: #bbf;
    border: none;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    cursor: pointer;
  `;
  testBtn.onclick = () => {
    const current = localStorage.getItem('forceSafariMode') === 'true';
    localStorage.setItem('forceSafariMode', current ? 'false' : 'true');
    alert(`🧪 Safari 테스트 모드가 ${!current ? '활성화' : '비활성화'}되었습니다.\n페이지를 새로고침 해주세요.`);
  };
  document.body.appendChild(testBtn);

  console.log(log);

  // ✅ tutorialId 제거 버튼
const clearBtn = document.createElement('button');
clearBtn.textContent = '🗑️ tutorialId 제거';
clearBtn.style = `
  position: fixed;
  top: 60px;
  right: 20px;
  z-index: 100000;
  padding: 10px 14px;
  font-size: 14px;
  background: #fcc;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  cursor: pointer;
`;
clearBtn.onclick = () => {
  localStorage.removeItem('tutorialIdForSubscription');
  alert("🗑️ tutorialId가 제거되었습니다. 페이지를 새로고침합니다.");
  location.reload();
};
document.body.appendChild(clearBtn);
const overlayTestBtn = document.createElement('button');
overlayTestBtn.textContent = '🔔 오버레이 테스트';
overlayTestBtn.style = `
  position: fixed;
  top: 140px;
  right: 20px;
  z-index: 100000;
  padding: 10px 14px;
  font-size: 14px;
  background: #ffd;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  cursor: pointer;
`;
overlayTestBtn.onclick = () => {
  console.log('🧪 insertPwaOverlay() 수동 호출');
  insertPwaOverlay();
};
document.body.appendChild(overlayTestBtn);

// ✅ 테스트용 카카오 브라우저 강제 모드
const kakaoTestBtn = document.createElement('button');
kakaoTestBtn.textContent = '🧪 카카오 브라우저 테스트';
kakaoTestBtn.style = `
  position: fixed;
  top: 100px;
  right: 20px;
  z-index: 100000;
  padding: 10px 14px;
  font-size: 14px;
  background: #ffe0e0;
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  cursor: pointer;
`;
kakaoTestBtn.onclick = () => {
  const current = localStorage.getItem('forceKakaoMode') === 'true';
  localStorage.setItem('forceKakaoMode', current ? 'false' : 'true');
  alert(`🧪 카카오 브라우저 테스트 모드가 ${!current ? '활성화' : '비활성화'}되었습니다.\n페이지를 새로고침 해주세요.`);
};
document.body.appendChild(kakaoTestBtn);

});
