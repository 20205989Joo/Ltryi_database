window.adjustFontSize = function (el, maxFont = 22, minFont = 10) {
  const text = el.textContent.trim();
  const length = text.length;

  // 기본 스타일 초기화
  el.style.whiteSpace = 'nowrap';
  el.style.lineHeight = 'normal';
  el.style.wordBreak = 'normal';
  el.style.textAlign = 'center';
  el.style.fontSize = maxFont + 'px';

  // 글자 수 기반 기본 폰트 결정
  let baseFont;
  if (length <= 2) {
    baseFont = 22;
  } else if (length <= 5) {
    baseFont = 18;
  } else {
    baseFont = 14;
    el.style.whiteSpace = 'normal';
    el.style.wordBreak = 'break-word';
    el.style.lineHeight = '1.2';
  }

  el.style.fontSize = baseFont + 'px';

  // 폰트 줄이기 조건 (scrollWidth > offsetWidth)
  const containerWidth = el.offsetWidth;
  while (el.scrollWidth > containerWidth && baseFont > minFont) {
    baseFont--;
    el.style.fontSize = baseFont + 'px';
  }
};
