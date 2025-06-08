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
  const isSafari = isIos && ua.includes("safari") && !ua.includes("crios") && !ua.includes("fxios") && !ua.includes("edgios") && !ua.includes("chrome");
  
  const isKakao = /kakao(talk)?/.test(ua);  // ✅ "kakao", "kakaotalk" 둘 다 대응
  const isSamsung = /samsungbrowser/.test(ua);
  const isChrome = /chrome/.test(ua) && !isSamsung;

  console.log("🔍 감지된 브라우저 환경:", navigator.userAgent);

  if (isKakao) return 'kakao';
  if (isSafari) return 'ios-safari';
  if (isSamsung) return 'samsung-browser';
  return null;
}


function isIosPwa() {
  if (localStorage.getItem('forcePwaMode') === 'true') {
    console.warn("🧪 PWA 테스트 모드 활성화됨");
    return true;
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  return isIos && isStandalone;
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
    position: fixed;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.85);
    color: white;
    z-index: 99999;
    font-family: sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 20px;
  `;

  blocker.innerHTML = `
    <div id="safari-step1">
      <div style="font-size: 18px; margin-bottom: 20px;">
        📱 iOS Safari에서는 알림 기능이 제한됩니다.<br><br>
        <b>공유 버튼</b> (<span style="font-size: 18px;">⬆️</span>)을 눌러<br>
        <b>"홈 화면에 추가"</b>를 선택해주세요.
      </div>
      <div style="font-size: 16px; margin-bottom: 10px;">
        🔑 연결코드 입력
      </div>
      <input id="link-code" placeholder="예: 177"
        style="font-size: 20px; text-align: center; padding: 10px;
              border: 2px solid #ccc; border-radius: 8px; width: 160px;" />
      <button id="to-step2-btn" style="
        margin-top: 60px;
        padding: 10px 16px;
        font-size: 15px;
        background: #ffee99;
        color: #333;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        line-height:0.8;
left: 48%;
      ">다음</button>
    </div>

    <div id="safari-step2" style="display:none;">
      <div style="font-size: 17px; margin-bottom: 18px;">
        📬 푸시를 받으셨나요?<br>
        받았다면 아래 확인을 눌러주세요!
      </div>
      <button id="confirm-btn" style="
        margin-top: 80px;
        padding: 10px 16px;
        font-size: 15px;
        background: #c8ffd4;
        color: #333;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        line-height:0.8;
        left: 44%;
      ">확인</button>

          <button id="retry-btn" style="
  margin-top: 80px;
  padding: 10px 16px;
  width : 100px;
  font-size: 14px;
  background: transparent;
  border: 1px solid #ccc;
  border-radius: 6px;
  color: #ccc;
  cursor: pointer;
  line-height: 0.8;
  left: 51%;
">못받았어요</button>

    </div>
  `;

  document.body.appendChild(blocker);

  const step1 = blocker.querySelector('#safari-step1');
  const step2 = blocker.querySelector('#safari-step2');
  const input = blocker.querySelector('#link-code');
  const nextBtn = blocker.querySelector('#to-step2-btn');
  const confirmBtn = blocker.querySelector('#confirm-btn');

const retryBtn = blocker.querySelector('#retry-btn');

retryBtn.onclick = () => {
  localStorage.removeItem('tutorialIdForSubscription');
  alert("🗑️ 연결코드 저장을 초기화했습니다. 다시 시도해주세요.");
  location.reload();
};


  nextBtn.onclick = async () => {
    const code = input.value.trim();
    if (!/^\d+$/.test(code)) {
      alert("숫자만 입력해주세요!");
      return;
    }

    const userId = 'tutorial' + code;
    localStorage.setItem('tutorialIdForSubscription', userId);
    console.log(`📦 tutorialIdForSubscription 저장됨: ${userId}`);

    try {
      const res = await fetch('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: '🔔 연결코드 확인',
          body: `Safari로 돌아가서 "연결코드 ${code}"를 입력해주세요.`
        })
      });

      const result = await res.json();
      console.log("📨 푸시 전송 결과:", result);

      step1.style.display = 'none';
      step2.style.display = 'flex';
    } catch (err) {
      console.error("❌ 푸시 전송 실패:", err);
      alert("⚠️ 푸시 전송 중 문제가 발생했습니다.");
    }
  };

  confirmBtn.onclick = () => {
    alert("✅ 연결 완료! Safari 설정이 완료되었습니다.");
    blocker.remove();
  };
}

function insertPwaOverlay() {
  const tutorialId = localStorage.getItem('tutorialIdForSubscription');
  const blocker = document.createElement('div');
  blocker.id = 'pwa-overlay-blocker';
  blocker.style = `
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    z-index: 99999;
    font-family: sans-serif;
  `;

  blocker.innerHTML = `
    <div style="
      text-align: center;
      font-size: 16px;
      margin-top: 260px;
      padding: 0 20px;
    ">
      📲 <b>연결코드<b>를 받기 위해 <br><br>알림을 허용해주세요!
    </div>
    <button id="pwa-noti-btn" style="
      position: absolute;
      left: 50%;
      top: 400px;
      width: 150px;
      height: 50px;
      transform: translateX(-50%);
      padding: 20px 20px;
      font-size: 15px;
      font-weight: bold;
      background: #ffee99;
      color: #333;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      line-height: .3;
    ">🔔 알림 허용</button>
    <div id="code-display" style="
      display: none;
      text-align: center;
      font-size: 16px;
      margin-top: 440px;
    "></div>
  `;

  document.body.appendChild(blocker);
  const button = blocker.querySelector('#pwa-noti-btn');
  const display = blocker.querySelector('#code-display');

  // ✅ 이미 tutorialId가 있다면 연결코드만 표시
  if (tutorialId) {
    const code = tutorialId.replace('tutorial', '');
    display.innerHTML = `
      <div style="margin-top: -310px;">
        ✅ 연결코드: <span style="
  font-weight: bold;
  font-size: 40px;
  color: #ffeb3b;
  text-shadow: 0 0 6px rgba(255, 235, 59, 0.6),
               0 0 12px rgba(255, 235, 59, 0.3);
               padding-left: 12px;
"> ${code}</span><br>
        <br><br>이제 <span style="
    color: #64b5f6;
    font-weight: bold;
    text-shadow: 0 0 6px rgba(100, 181, 246, 0.6),
                 0 0 12px rgba(100, 181, 246, 0.3);
  ">Safari</span>로 돌아가서<br>이 코드를 입력해주세요!
      </div>
    `;
    display.style.display = 'block';
    button.style.display = 'none';
    return;
  }

  // ✅ 새로 발급받는 흐름
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

        const code = data.userId.replace('tutorial', '');

        // 연결코드 push
        await fetch('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.userId,
            title: '🔔 연결코드 안내',
            body: `Safari에서 입력할 연결코드는 [${code}]입니다.`
          })
        });

        display.innerHTML = `
          <div style="margin-top: -310px;">
            ✅ 연결코드: <span style="
  font-weight: bold;
  font-size: 40px;
  color: #ffeb3b;
  text-shadow: 0 0 6px rgba(255, 235, 59, 0.6),
               0 0 12px rgba(255, 235, 59, 0.3);
               padding-left : 12px;
">${code}</span><br>
            <br><br>이제 <span style="
    color: #64b5f6;
    font-weight: bold;
    text-shadow: 0 0 6px rgba(100, 181, 246, 0.6),
                 0 0 12px rgba(100, 181, 246, 0.3);
  ">Safari</span>로 돌아가서<br>이 코드를 입력해주세요!
          </div>
        `;
        display.style.display = 'block';
        button.style.display = 'none';

      } else {
        alert("❌ tutorialId 발급 실패: 서버 응답 이상");
      }

    } catch (err) {
      console.error("❌ 알림 권한 또는 tutorial ID 발급 실패:", err);
      alert("⚠️ 알림 설정 중 오류가 발생했습니다.");
    }
  };
}

function insertNormalOverlay() {
  const blocker = document.createElement('div');
  blocker.id = 'normal-overlay-blocker';
  blocker.style = `
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.75);
    color: white;
    z-index: 99999;
    font-family: sans-serif;
  `;

  blocker.innerHTML = `
    <div style="
      text-align: center;
      font-size: 16px;
      margin-top: 280px;
      padding: 0 20px;
    ">
      📲 알림 기능을 위해 요청을 허용해주세요.
    </div>
    <button id="normal-noti-btn" style="
      position: absolute;
      left: 50%;
      top: 360px;
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
    ">🔔 알림 허용</button>
  `;

  document.body.appendChild(blocker);

  const button = blocker.querySelector('#normal-noti-btn');

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
}




window.addEventListener('DOMContentLoaded', () => {
  insertTesterToggles();               // ✅ 즉시 버튼 넣기
  runOverlayDecisionLogic();           // ✅ 오버레이 삽입 조건 분리 처리

  // ✅ 서비스워커는 완전히 비동기 처리
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => {
        console.log('✅ 서비스워커 등록 성공:', reg.scope);
        return reg.pushManager.getSubscription();
      })
      .then(sub => {
        console.log(`📬 pushManager 구독 상태: ${sub ? '✅ 있음' : '❌ 없음'}`);
      })
      .catch(err => {
        console.error('❌ 서비스워커 등록 실패:', err);
      });
  }
});

function runOverlayDecisionLogic() {
  let log = "📋 디버그 로그\n----------------\n";
  const ua = navigator.userAgent;
  const tutorialId = localStorage.getItem('tutorialIdForSubscription');
  const problem = detectBrowserIssue();
  const permission = Notification.permission;

  log += `📱 UserAgent: ${ua}\n`;
  log += `🔍 문제 감지됨: ${problem || '없음'}\n`;
  log += `🔔 알림 권한 상태: ${permission}\n`;
  log += `🧾 tutorialId 존재 여부: ${tutorialId ? '✅ 있음' : '❌ 없음'}\n`;

  const hasPushSubscription = false;  // 초기값 false. SW 등록 이후 비동기로 별도 확인.

  if (isIosPwa()) {
    if (!tutorialId) {
      insertPwaOverlay();
      log += "📲 iOS PWA 환경 → 조건 미충족 → insertPwaOverlay()\n";
    } else {
      log += "✅ iOS PWA 환경 → 조건 충족 → 오버레이 생략\n";
    }
  } else if (problem === 'ios-safari') {
    if (!tutorialId) {
      insertIosFallbackOverlay();
      log += "📱 iOS Safari 환경 → 조건 미충족 → insertIosFallbackOverlay()\n";
    } else {
      log += "✅ iOS Safari 환경 → 조건 충족 → 오버레이 생략\n";
    }
  } else if (['kakao', 'samsung-browser'].includes(problem)) {
    showEnvironmentTip(problem);
    log += `⚠️ ${problem} 브라우저 환경 → showEnvironmentTip()\n`;
  } else {
    if (!tutorialId) {
      insertNormalOverlay();
      log += "🖥️ 일반 브라우저 → 조건 미충족 → insertNormalOverlay()\n";
    } else {
      log += "✅ 일반 브라우저 → 조건 충족 → 오버레이 생략\n";
    }
  }

  console.log(log);
}




// 테스터 버튼들
function insertTesterToggles() {
  // Safari 모드 토글
  const safariBtn = document.createElement('button');
  safariBtn.textContent = 'Safari 강제 ON/OFF';
  safariBtn.style = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 100003;
    padding: 6px 12px;
    font-size: 13px;
    border-radius: 6px;
    border: none;
    background: #ffe082;
    color: #333;
    cursor: pointer;
  `;
  safariBtn.onclick = () => {
    const key = 'forceSafariMode';
    if (localStorage.getItem(key) === 'true') {
      localStorage.removeItem(key);
      alert("Safari 강제모드 OFF");
    } else {
      localStorage.setItem(key, 'true');
      alert("Safari 강제모드 ON");
    }
    location.reload();
  };

  /*// PWA 모드 토글
  const pwaBtn = document.createElement('button');
  pwaBtn.textContent = 'PWA 강제 ON/OFF';
  pwaBtn.style = `
    position: fixed;
    bottom: 60px;
    left: 20px;
    z-index: 100003;
    padding: 6px 12px;
    font-size: 13px;
    border-radius: 6px;
    border: none;
    background: #c8e6c9;
    color: #333;
    cursor: pointer;
  `;
  pwaBtn.onclick = () => {
    const key = 'forcePwaMode';
    if (localStorage.getItem(key) === 'true') {
      localStorage.removeItem(key);
      alert("PWA 강제모드 OFF");
    } else {
      localStorage.setItem(key, 'true');
      alert("PWA 강제모드 ON");
    }
    location.reload();
  };

  // 구독 전체 리셋
  const resetPushBtn = document.createElement('button');
  resetPushBtn.textContent = '🧨 푸시 구독 삭제';
  resetPushBtn.style = `
    position: fixed;
    bottom: 100px;
    left: 20px;
    z-index: 100003;
    padding: 6px 12px;
    font-size: 13px;
    border-radius: 6px;
    border: none;
    background: #ffccbc;
    color: #333;
    cursor: pointer;
  `;
  resetPushBtn.onclick = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      localStorage.removeItem('tutorialIdForSubscription');
      alert('푸시 구독 및 ID 삭제됨');
    } catch (err) {
      alert('❌ 구독 삭제 실패');
    }
    location.reload();
  };

  // tutorialIdForSubscription만 삭제
  const resetIdOnlyBtn = document.createElement('button');
  resetIdOnlyBtn.textContent = '🧽 tutorialId만 삭제';
  resetIdOnlyBtn.style = `
    position: fixed;
    bottom: 140px;
    left: 20px;
    z-index: 100003;
    padding: 6px 12px;
    font-size: 13px;
    border-radius: 6px;
    border: none;
    background: #dcedc8;
    color: #333;
    cursor: pointer;
  `;
  resetIdOnlyBtn.onclick = () => {
    localStorage.removeItem('tutorialIdForSubscription');
    alert('🧽 tutorialIdForSubscription 삭제됨');
    location.reload();
  };
*/
  //document.body.appendChild(safariBtn);
  //document.body.appendChild(pwaBtn);
  //document.body.appendChild(resetPushBtn);
  //document.body.appendChild(resetIdOnlyBtn);

    // fallback overlay 강제 호출
  const fallbackBtn = document.createElement('button');
  fallbackBtn.textContent = '📱 iOS fallbackOverlay 강제 실행';
  fallbackBtn.style = `
    position: fixed;
    bottom: 180px;
    left: 20px;
    z-index: 100003;
    padding: 6px 12px;
    font-size: 13px;
    border-radius: 6px;
    border: none;
    background: #f8bbd0;
    color: #333;
    cursor: pointer;
  `;
  fallbackBtn.onclick = () => {
    localStorage.removeItem('tutorialIdForSubscription');
    alert('🧽 tutorialId 삭제됨. fallback overlay 실행!');
    if (typeof insertIosFallbackOverlay === 'function') {
      insertIosFallbackOverlay();
    } else {
      alert('⚠️ insertIosFallbackOverlay() 함수가 정의되지 않았습니다.');
    }
  };

  const ua = navigator.userAgent.toLowerCase();
  const isIosSafari = /iphone|ipad|ipod/.test(ua) &&
                      ua.includes("safari") &&
                      !ua.includes("crios") &&
                      !ua.includes("fxios") &&
                      !ua.includes("edgios") &&
                      !ua.includes("chrome");

  if (isIosSafari || localStorage.getItem('forceSafariMode') === 'true') {
    document.body.appendChild(fallbackBtn);
  }

}
