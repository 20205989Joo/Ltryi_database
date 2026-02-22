// ver1.1_26.02.22
// herma-l3e5.js (L4-E4: 숨은 that/be 채우기 - + 슬롯 삽입)
// ------------------------------------------------------------
// 요구사항(요약)
// - 단어 사이사이에 + 슬롯을 띄우고
// - Answer의 { } 안에 있는 토큰(예: that / were / is ...)을 학생에게 제공
// - "같은 뜻이 되려면 이걸 어디다가 넣으면 좋을까요?"를 묻는 삽입 퀴즈
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 3;
const TARGET_EXERCISE = 5;

let subcategory = "Grammar";
let level = "Basic";
let day = "113";
let quizTitle = "quiz_Grammar_Basic_113";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;

// 현재 문제 상태
let baseWords = [];
let missingTokens = [];          // ["that", "were", ...] (brace 순서)
let correctAfterList = [];       // 각 토큰의 정답 afterPos (1~baseWords.length-1 사이, 또는 baseWords.length)
let insertedByAfter = {};        // { afterPos: ["that","were"] }
let tokenCursor = 0;             // 지금 넣어야 하는 missingTokens index
let chosenAfterList = [];        // 사용자가 실제로 선택한 afterPos 기록(토큰 순서대로)

window.addEventListener("DOMContentLoaded", async () => {
  applyQueryParams();
  wireBackButton();
  injectStyles();

  try {
    rawRows = await loadExcelRows(EXCEL_FILE);
  } catch (e) {
    console.error(e);
    alert("엑셀 파일을 불러오지 못했습니다.\n" + EXCEL_FILE);
    return;
  }

  buildQuestionsFromRows();
  renderIntro();

  // fly chip element (once)
  if (!document.getElementById("fly-chip")) {
    const fc = document.createElement("div");
    fc.id = "fly-chip";
    fc.textContent = "";
    document.body.appendChild(fc);
  }
});

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --h54-blue:#2f6fdc;
      --h54-blue-bg:rgba(47,111,220,0.10);
      --h54-blue-br:rgba(47,111,220,0.55);
      --h54-orange:#d57919;
      --h54-orange-bg:rgba(213,121,25,0.12);
      --h54-orange-br:rgba(213,121,25,0.55);
    }
    .guide-box{
      background:#fff3e0;
      border:1px solid #e9c7a7;
    }
    .guide-line{
      font-weight:900;
      color:#7e3106;
      line-height:1.55;
    }
    .chip-row{
      margin-top:8px;
      display:flex;
      flex-wrap:wrap;
      gap:7px;
      min-height:34px;
    }
    .chip{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 9px;
      border-radius:999px;
      border:1px solid var(--h54-blue-br);
      background:var(--h54-blue-bg);
      color:var(--h54-blue);
      font-weight:900;
      font-size:12px;
      line-height:1.2;
      user-select:none;
    }
    .chip.active{
      border-width:2px;
      box-shadow: 0 0 0 2px rgba(47,111,220,0.14);
    }
    .chip.done{
      opacity:.45;
      filter:grayscale(0.2);
    }
    .inserted{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:2px 7px;
      border-radius:999px;
      border:1px solid var(--h54-orange-br);
      background:var(--h54-orange-bg);
      color:var(--h54-orange);
      font-weight:900;
      line-height:1.2;
      font-size:12px;
      transform: translateY(-0.5px);
    }
    .slot{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:20px;
      height:20px;
      border-radius:999px;
      border:1.5px dashed var(--h54-blue-br);
      color:var(--h54-blue);
      background:var(--h54-blue-bg);
      font-weight:900;
      font-size:12px;
      cursor:pointer;
      user-select:none;
      margin:0 2px;
      transition: transform .1s ease, box-shadow .12s ease, border-color .12s ease;
    }
    .slot:hover{
      transform: translateY(-0.5px);
      box-shadow: 0 0 0 2px rgba(47,111,220,0.12);
    }
    .slot.ok{
      border-style:solid;
      border-color:rgba(46,125,50,0.65);
      color:#2e7d32;
      background:rgba(46,125,50,0.12);
    }
    .slot.bad{
      border-style:solid;
      border-color:rgba(198,40,40,0.68);
      color:#c62828;
      background:rgba(198,40,40,0.12);
    }
    .slot.disabled{
      opacity:.4;
      cursor:not-allowed;
      pointer-events:none;
    }
    #fly-chip{
      position:fixed;
      left:-9999px;
      top:-9999px;
      transform: translate(-50%, -50%);
      z-index:9999;
      pointer-events:none;
      opacity:0;
      padding:5px 9px;
      border-radius:999px;
      border:1px solid var(--h54-blue-br);
      background:var(--h54-blue-bg);
      color:var(--h54-blue);
      font-weight:900;
      font-size:12px;
      line-height:1.2;
    }
    #fly-chip.show{ opacity:1; }
  `;
  document.head.appendChild(style);
}

/** ================== Params / Nav ================== */
function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get("key");
  const id = params.get("id");
  if (id) userId = id;

  if (key) {
    quizTitle = key;
    const parts = key.split("_");
    if (parts.length >= 4) {
      subcategory = parts[1] || subcategory;
      level = parts[2] || level;
      day = parts[3] || day;
    }
  } else {
    quizTitle = `quiz_${subcategory}_${level}_${day}`;
  }
}

function wireBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;
  backBtn.addEventListener("click", () => history.back());
}

/** ================== Load Excel ================== */
async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();

  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows.filter((r) => !isRowAllEmpty(r));
}

function isRowAllEmpty(row) {
  const keys = Object.keys(row || {});
  if (!keys.length) return true;
  return keys.every((k) => String(row[k] ?? "").trim() === "");
}

/** ================== Build Questions ================== */
function buildQuestionsFromRows() {
  const filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  questions = filtered.map((r, idx) => {
    const qNumber = Number(r["QNumber"]) || idx + 1;
    const title = String(r["Title"] ?? "").trim();
    const instruction = String(r["Instruction"] ?? "").trim();

    const questionRaw = String(r["Question"] ?? "").trim();
    const answerRaw = String(r["Answer"] ?? "").trim();

    const { englishPart, koreanPart, braceTokens } = splitAnswerParts(answerRaw);

    // 정답 토큰(브레이스) 목록 + 정답 삽입 위치 계산
    const base = tokenizeWords(questionRaw);
    const full = tokenizeWords(englishPart);
    const { correctAfterList } = computeAfterPositionsFromFull(base, full, braceTokens);

    return {
      qNumber,
      title,
      instruction,
      questionRaw,
      englishAnswer: englishPart,
      koreanAnswer: koreanPart,
      baseWords: base,
      missingTokens: braceTokens,
      correctAfterList,
    };
  });
}

/** Answer: "reports {that} {were} submitted yesterday – 어제 제출된 보고서들" */
function splitAnswerParts(answerRaw) {
  let s = String(answerRaw || "").trim();

  // 1) brace tokens (영문 파트에서만 추출)
  const braceTokens = [];
  const braceRegex = /\{([^}]+)\}/g;
  let m;
  while ((m = braceRegex.exec(s)) !== null) {
    const tok = String(m[1] || "").trim();
    if (tok) braceTokens.push(tok);
  }

  // 2) split english / korean by dash-like separator
  // 우선순위: " – " (en dash) > " — " (em dash) > " - "
  let englishPart = s;
  let koreanPart = "";

  const seps = [" – ", " — ", " - "];
  for (const sep of seps) {
    const idx = s.indexOf(sep);
    if (idx !== -1) {
      englishPart = s.slice(0, idx).trim();
      koreanPart = s.slice(idx + sep.length).trim();
      break;
    }
  }

  // 3) remove braces in englishPart (keep token text)
  englishPart = englishPart.replace(/\{\s*/g, "").replace(/\s*\}/g, "").trim();

  // trailing punctuation cleanup
  englishPart = stripTrailingPeriod(englishPart);

  return { englishPart, koreanPart, braceTokens };
}

/** ================== Intro ================== */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L3-E5";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L3-E5</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>

      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">🚀 시작</button>
    </div>
  `;
}

function startQuiz() {
  if (!questions.length) {
    alert("해당 Lesson/Exercise에 문제가 없습니다.");
    return;
  }
  currentIndex = 0;
  results = [];
  renderQuestion();
}

/** ================== Main Render ================== */
function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  isAnswered = false;

  baseWords = q.baseWords.slice();
  missingTokens = (q.missingTokens || []).slice();
  correctAfterList = (q.correctAfterList || []).slice();

  insertedByAfter = {};
  tokenCursor = 0;
  chosenAfterList = [];

  const activeToken = missingTokens[tokenCursor] || "";

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box guide-box">
      <div class="guide-line">
        같은 뜻이 되려면, <span style="color:#1f4fb8;">파란 토큰</span>을
        <span style="color:#1f4fb8;">+</span> 중 어디에 넣으면 좋을까요?
      </div>
    </div>

    <div class="box">
      <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">주어진 표현</div>
      <div class="sentence" id="sentence-area"></div>

      <div style="margin-top:10px; font-weight:900; color:#7e3106;">넣어야 할 토큰</div>
      <div class="chip-row" id="chip-row"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  renderSentence();
  renderChips();
}

function renderSentence() {
  const area = document.getElementById("sentence-area");
  if (!area) return;

  // baseWords 기준으로 + 슬롯을 단어 사이사이에 뿌리고,
  // insertedByAfter[afterPos]에 있는 토큰은 그 자리에 표시한다.
  let out = "";
  for (let i = 0; i < baseWords.length; i++) {
    const word = baseWords[i];
    out += `<span>${escapeHtml(word)}</span>`;

    const afterPos = i + 1; // 1-based, "이 단어 뒤"
    const inserted = insertedByAfter[String(afterPos)] || [];
    if (inserted.length) {
      for (const tok of inserted) {
        out += ` <span class="inserted">${escapeHtml(tok)}</span> `;
      }
    }

    // 마지막 단어 뒤에도 슬롯 하나 두는 편이 "끝에 삽입" 대응에 안전
    const isLast = (i === baseWords.length - 1);
    out += `<span class="slot ${isAnswered ? "disabled" : ""}" data-after="${afterPos}" title="여기 뒤에 넣기">+</span>`;
    if (!isLast) out += " ";
  }

  area.innerHTML = out;

  // 슬롯 클릭 핸들러
  const slots = area.querySelectorAll(".slot");
  slots.forEach((s) => {
    s.addEventListener("click", (ev) => onClickSlot(ev));
  });
}

function renderChips() {
  const row = document.getElementById("chip-row");
  if (!row) return;

  if (!missingTokens.length) {
    row.innerHTML = `<span style="opacity:.65; font-weight:900;">(이번 문제는 숨은 토큰이 없습니다)</span>`;
    return;
  }

  row.innerHTML = "";
  missingTokens.forEach((t, idx) => {
    const div = document.createElement("div");
    div.className = "chip";
    div.textContent = t;

    if (idx === tokenCursor) div.classList.add("active");
    if (idx < tokenCursor) div.classList.add("done");

    row.appendChild(div);
  });
}

async function onClickSlot(ev) {
  if (isAnswered) return;
  if (!missingTokens.length) return;

  const slot = ev.target.closest(".slot");
  if (!slot) return;

  const after = Number(slot.getAttribute("data-after") || 0);
  if (!after) return;

  const wantToken = missingTokens[tokenCursor];
  const wantAfter = Number(correctAfterList[tokenCursor] || 0);
  if (after === wantAfter) {
    slot.classList.add("ok");

    // fly animation (칩 -> 슬롯)
    await flyChipToSlot(wantToken, slot);

    // 기록 + 렌더
    const k = String(after);
    if (!insertedByAfter[k]) insertedByAfter[k] = [];
    insertedByAfter[k].push(wantToken);

    // 실제 선택 위치 기록(토큰 순서대로)
    chosenAfterList.push(after);

    tokenCursor += 1;

    // 다음 토큰이 남아 있으면 계속
    renderSentence();
    renderChips();

  } else {
    slot.classList.add("bad");
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    setTimeout(() => slot.classList.remove("bad"), 220);
  }
}

/** ================== Submit / Next ================== */
function submitAnswer() {
  if (isAnswered) return;

  const q = questions[currentIndex];

  // 정답 판정: 토큰을 "전부" 넣었는지(위치/순서 자체는 클릭에서 강제)
  const picks = missingTokens.map((tok, i) => `${tok}@${Number(chosenAfterList[i] || 0)}`);
  const correct = (missingTokens.length === 0) ? true : (chosenAfterList.length === missingTokens.length);

  if (!correct) {
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    return;
  }

  isAnswered = true;

  results.push({
    no: currentIndex + 1,
    word: `Herma L3-E5 / Q${q.qNumber}`,
    selected: `picks: ${picks.join(", ")}`,
    correct,
    question: q.questionRaw,
    englishAnswer: q.englishAnswer,
    koreanAnswer: q.koreanAnswer,
    missingTokens: q.missingTokens.join(" "),
    correctAfterList: (q.correctAfterList || []).join(","),
  });

  // UI Lock
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  // 슬롯 비활성화
  const sa = document.getElementById("sentence-area");
  if (sa) {
    sa.querySelectorAll(".slot").forEach((s) => s.classList.add("disabled"));
  }

  const fb = document.getElementById("feedback-area");
  if (!fb) return;

  fb.innerHTML = "";
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
}

function goNext() {
  if (!isAnswered) {
    // 미제출 상태면 오답 처리로 저장
    const q = questions[currentIndex];

    const picks = (q.missingTokens || []).map((t, i) => `${t}@${Number(chosenAfterList[i] || 0)}`);
    results.push({
      no: currentIndex + 1,
      word: `Herma L3-E5 / Q${q.qNumber}`,
      selected: `picks: ${picks.join(", ")}`,
      correct: false,
      question: q.questionRaw,
      englishAnswer: q.englishAnswer,
      koreanAnswer: q.koreanAnswer,
      missingTokens: q.missingTokens.join(" "),
      correctAfterList: (q.correctAfterList || []).join(","),
    });
  }

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

/** ================== Result Popup ================== */
function showResultPopup() {
  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const resultObject = {
    quiztitle: quizTitle,
    subcategory, level, day,
    teststatus: "done",
    course: "herma",
    lesson: TARGET_LESSON,
    exercise: TARGET_EXERCISE,
    userId: userId || "",
    testspecific: results,
  };

  localStorage.setItem("QuizResults", JSON.stringify(resultObject));

  const popup = document.getElementById("result-popup");
  const content = document.getElementById("result-content");
  if (!popup || !content) return alert(`완료! 점수: ${score}점 (${correctCount}/${total})`);

  const rows = results.map(r => `
    <tr>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.no}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.word)}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(trimForTable(r.selected))}</td>
      <td style="padding:6px; border-bottom:1px solid #eee;">${r.correct ? "⭕" : "❌"}</td>
    </tr>
  `).join("");

  content.innerHTML = `
    <div style="font-weight:900; font-size:16px; margin-bottom:8px;">📄 전체 결과</div>
    <div style="margin-bottom:10px; font-size:14px;">
      점수: <b>${score}점</b> (${correctCount} / ${total})
    </div>

    <div style="max-height:280px; overflow-y:auto; margin-bottom:14px;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f6f6f6;">
            <th style="padding:6px; border-bottom:1px solid #ccc;">번호</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">문항</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 답</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">정답</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" onclick="restartQuiz()">🔁 재시험</button>
      <button class="quiz-btn" onclick="closePopup()">닫기</button>
    </div>
  `;

  popup.style.display = "flex";
}

function restartQuiz(){ window.location.reload(); }
function closePopup(){
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

/** ================== Core Helpers ================== */
function tokenizeWords(s) {
  const t = String(s || "").trim();
  if (!t) return [];
  return t.split(/\s+/).filter(Boolean);
}

// baseWords가 fullWords의 부분수열로 등장한다고 가정하고,
// braceTokens(=숨은 토큰)이 fullWords 사이의 "틈"에 끼어든다.
// -> 각 braceToken이 "baseWords 몇 개 뒤(afterPos)"에 들어가는지 계산
function computeAfterPositionsFromFull(baseWords, fullWords, braceTokens) {
  const braceSet = new Set((braceTokens || []).map(x => normWord(x)));

  let bi = 0; // base index
  const afterList = [];

  for (let i = 0; i < fullWords.length; i++) {
    const w = fullWords[i];

    if (bi < baseWords.length && wordsEqual(w, baseWords[bi])) {
      bi += 1;
      continue;
    }

    // base와 매칭 안 되는 단어가 brace token이면 -> afterPos = bi
    if (braceSet.has(normWord(w))) {
      afterList.push(bi); // "baseWords bi개 뒤" (0~len)
    }
  }

  // afterPos를 "슬롯 data-after(1-based)" 기준으로 만들기:
  // afterList는 0이면 "첫 단어 앞"이 되지만, 우리는 "단어 뒤" 슬롯만 가지고 있으니
  // 0은 1로 보정(첫 단어 뒤에 넣게) — 실제 데이터에서 0은 거의 안 나옴.
  const corrected = afterList.map(n => Math.max(1, Number(n || 0)));

  // braceTokens 개수와 길이 맞추기 (혹시 누락되면 기본값 1로 채움)
  while (corrected.length < (braceTokens || []).length) corrected.push(1);

  return { correctAfterList: corrected };
}

function wordsEqual(a, b) {
  return normWord(a) === normWord(b);
}

function normWord(w) {
  return String(w || "")
    .trim()
    .toLowerCase()
    .replace(/^[\(\[\{\"\'“”‘’]+/g, "")
    .replace(/[\)\]\}\"\'“”‘’\.,!?;:]+$/g, "");
}

/** fly animation: token chip -> slot */
async function flyChipToSlot(tokenText, slotEl) {
  const fc = document.getElementById("fly-chip");
  if (!fc || !slotEl) return;

  // token chip 위치(활성 chip)
  const activeChip = document.querySelector(".chip.active");
  const fromRect = activeChip ? activeChip.getBoundingClientRect() : slotEl.getBoundingClientRect();
  const toRect = slotEl.getBoundingClientRect();

  fc.textContent = tokenText;
  fc.style.left = (fromRect.left + fromRect.width/2) + "px";
  fc.style.top  = (fromRect.top + fromRect.height/2) + "px";
  fc.classList.add("show");

  const dx = (toRect.left + toRect.width/2) - (fromRect.left + fromRect.width/2);
  const dy = (toRect.top + toRect.height/2) - (fromRect.top + fromRect.height/2);

  fc.animate([
    { transform: "translate(-50%, -50%) translate(0px, 0px) scale(1)", opacity: 1 },
    { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.98)`, opacity: 1 }
  ], { duration: 260, easing: "cubic-bezier(.2,.9,.2,1)" });

  await wait(265);

  fc.classList.remove("show");
  fc.textContent = "";
  fc.style.left = "-9999px";
  fc.style.top = "-9999px";
}

/** ================== Misc Utils ================== */
function stripTrailingPeriod(s){
  return String(s || "").trim().replace(/\.[\s]*$/,"").trim();
}
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function trimForTable(s){
  const t = String(s || "");
  return t.length>70 ? t.slice(0,70)+"..." : t;
}
function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

