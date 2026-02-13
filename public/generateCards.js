(async () => {
  const resp = await fetch('CEFR - C1 단어-뜻-예문 편집.xlsx');
  const arrayBuffer = await resp.arrayBuffer();

  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: ['Word', 'Korean Meaning', 'Part of Speech', 'Example Sentence', '예문','일련번호', 'Day'],
    range: 1
  });

  const container = document.getElementById('main');
  let prevDay = null;

  rows.forEach((row, idx) => {
    const currentDay = row["Day"];

    // 🔹 Day title-card 삽입
if (currentDay !== prevDay) {
  // 🔹 Day 시작마다 페이지 구분선 삽입
  const pageBreak = document.createElement('div');
  pageBreak.className = 'page-divider';
  container.appendChild(pageBreak);

  // 🔹 Day title-card 삽입
  const dayTitle = document.createElement('div');
  dayTitle.className = 'card title-card';
  dayTitle.innerHTML = `<div class="word-title">📘 ${currentDay}</div>`;
  container.appendChild(dayTitle);

  // 🔹 title-divider (깔끔한 구분선)
  const titleDivider = document.createElement('div');
  titleDivider.className = 'vine-divider title-divider';
  container.appendChild(titleDivider);

  prevDay = currentDay;
}


    // 🔹 구분선 삽입 로직
    if (idx > 0) {
      if ((idx - 4) % 5 === 0) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page-divider';
        container.appendChild(pageDiv);
      } else {
        const divider = document.createElement('div');
        divider.className = 'vine-divider';
        divider.innerHTML = `<img src="vine-divider2.png" alt="vine" />`;
        container.appendChild(divider);
      }
    }

    // 🔹 카드 생성
    const card = document.createElement('div');
    card.className = 'card';

    const watermark = document.createElement('div');
    watermark.className = 'card-watermark';
    watermark.textContent = idx + 1;
    card.appendChild(watermark);

const contentHTML = `
  <div class="left-section">
    <div class="word-title">${row["Word"]}</div>
    <div class="meaning-line">
      <div class="meaning">${row["Korean Meaning"]}</div>
      <div class="pos">(${row["Part of Speech"]})</div>
    </div>
  </div>
  <div class="right-section">
    <div class="example-en">${row["Example Sentence"]}</div>
    <div class="example-kr">${row["예문"]}</div>
  </div>
`;

    card.insertAdjacentHTML('beforeend', contentHTML);

    container.appendChild(card);
  });
})();
