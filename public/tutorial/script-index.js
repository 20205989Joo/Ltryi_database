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

