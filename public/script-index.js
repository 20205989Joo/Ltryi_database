const users = [
    { username: 'user301', password: 'pw301', roomId: '301' },
    { username: 'user302', password: 'pw302', roomId: '302' },
    { username: 'user303', password: 'pw303', roomId: '303' },
    { username: 'user304', password: 'pw304', roomId: '304' },
    { username: 'user305', password: 'pw305', roomId: '305' },
    { username: 'userTester', password: 'testpw', roomId: 'Tester' },
    { username: 'adminLT', password: 'pwpw', roomId: 'adminLT' }
];

document.getElementById('loginButton').addEventListener('click', function () {
    const enteredUsername = document.getElementById('username').value;
    const enteredPassword = document.getElementById('password').value;

    const user = users.find(u => u.username === enteredUsername && u.password === enteredPassword);

    if (user) {
        localStorage.setItem('currentUserId', user.roomId);

        if (user.username === 'adminLT') {
            window.location.href = 'TestResult.html';
        } else {
            window.location.href = `Room.html?id=${user.roomId}`;
        }
    } else {
        alert("잘못된 사용자 이름 또는 비밀번호입니다.");
    }
});

// ✅ 테스트용 단축 버튼들

document.getElementById('btnTStudent').addEventListener('click', function () {
    window.location.href = 'student-room.html?id=Tester';
});

document.getElementById('btnTParents').addEventListener('click', function () {
    window.location.href = 'parents-room.html?id=Tester';
});

document.getElementById('btnTTeacher').addEventListener('click', function () {
    window.location.href = 'teacher-room.html?id=Tester';
});

// ✅ 튜토리얼 진입 전에 알림 설정 팝업
const vapidPublicKey = 'BEvKBnLcnotYEeOBexk0i-_2oK5aU3epudG8lszhppdiGeiDT2JPbkXF-THFDYXcWjiGNktD7gIOj4mE_MC_9nE';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

document.getElementById('btnTStudentTutorial')?.addEventListener('click', () => {
  document.getElementById('popup-student').style.display = 'block';
});

document.getElementById('confirmStudentPermission')?.addEventListener('click', async () => {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('알림 권한이 필요합니다!');
    return;
  }

  await navigator.serviceWorker.register('service-worker.js');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });

  // ✅ 튜토리얼 ID 발급 API 호출
const res = await fetch('https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/grant-tutorial-id', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ subscription })
});

  const data = await res.json();
  const userId = data.userId;

  localStorage.setItem('currentUserId', userId);
  document.getElementById('popup-student').style.display = 'none';
  document.getElementById('launchStudentTutorial').style.display = 'inline-block';
});

document.getElementById('launchStudentTutorial')?.addEventListener('click', () => {
  const userId = localStorage.getItem('currentUserId') || 'Tutorial';
  window.location.href = `tutorial/student-room_tutorial.html?id=${userId}`;
});

document.getElementById('btnTParentsTutorial')?.addEventListener('click', () => {
  window.location.href = 'tutorial/parents-room_tutorial.html?id=Tutorial';
});
