const studentSelect = document.getElementById('studentSelect');
const dateSelect = document.getElementById('dateSelect');
const imageContainer = document.getElementById('imageContainer');

let allData = [];

// 1. 초기화: 특정 학생들 고정 등록 (또는 나중에 API로 받을 수 있음)
const studentList = ['user301', 'user302', 'user303', 'user304', 'user305', 'Tester'];

studentList.forEach(id => {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = id;
  studentSelect.appendChild(option);
});

studentSelect.addEventListener('change', async function () {
  const userId = this.value;
  imageContainer.innerHTML = '';
  dateSelect.innerHTML = '<option>날짜 선택</option>';

  try {
    const res = await fetch(`https://port-0-ltryi-database-1ru12mlw3glz2u.sel5.cloudtype.app/api/getHWImages?userId=${userId}`);
    const data = await res.json();

    allData = data;

const uniqueDates = [...new Set(
  data.map(entry => {
    const d = new Date(entry.Timestamp);
    const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000); // KST 보정
    return `${kstDate.getFullYear()}-${(kstDate.getMonth() + 1).toString().padStart(2, '0')}-${kstDate.getDate().toString().padStart(2, '0')}`;
  })
)];

    uniqueDates.forEach(date => {
      const opt = document.createElement('option');
      opt.value = date;
      opt.textContent = date;
      dateSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('불러오기 실패:', err);
  }
});

dateSelect.addEventListener('change', function () {
  const selectedDate = this.value;
  imageContainer.innerHTML = '';

const filtered = allData.filter(entry => {
  const d = new Date(entry.Timestamp);
  const kstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000); // KST 보정
  const dateStr = `${kstDate.getFullYear()}-${(kstDate.getMonth() + 1).toString().padStart(2, '0')}-${kstDate.getDate().toString().padStart(2, '0')}`;
  return dateStr === selectedDate;
});

  filtered.forEach(entry => {
    if (entry.HWImageURL) {
      const card = document.createElement('div');
      card.className = 'image-card';
      card.innerHTML = `
        <div><b>${entry.WhichHW ?? '제목 없음'}</b> (${selectedDate})</div>
        <img src="${entry.HWImageURL}" alt="숙제 이미지" />
      `;
      imageContainer.appendChild(card);
    }
  });
});
