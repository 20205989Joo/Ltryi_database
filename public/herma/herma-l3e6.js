// ver1.1_26.02.22
// herma-l3e6.js (L5-E4: 노미널형 → 동사 1단어 타이핑)
// ------------------------------------------------------------
// 목표: Question 문장(노미널 표현 강조) 보여주고,
//      학생이 동사 1단어만 textarea에 입력.
//      제출: 정답/오답만 표시(정답 공개 없음)
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 3;
const TARGET_EXERCISE = 6;

let subcategory = "Grammar";
let level = "Basic";
let day = "114";
let quizTitle = "quiz_Grammar_Basic_114";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;
let reduceAlive = [];
let reduceInputOpen = false;
let reduceKeyConverted = false;
let reduceDroppedCollapsed = false;
let reduceKeyConvertedText = "";

const SHORT_INSTRUCTION = "굵게 표시된 표현을 같은 뜻의 동사 1단어로 바꿔 적으세요.";
const UI_STAGE1_REDUCE = "\uAC15\uC870\uB41C \uBD80\uBD84 \uC911 \uC57D\uBD84\uD574\uBCF4\uC138\uC694!";
const UI_STAGE1_TAP_KEY = "\uC911\uC694\uD55C \uD55C \uB2E8\uC5B4\uAC00 \uB0A8\uC558\uC5B4\uC694. \uB20C\uB7EC\uBCF4\uC138\uC694!";
const UI_STAGE2_INPUT = "\uC774\uC81C \uAC19\uC740 \uB73B\uC758 \uB3D9\uC0AC 1\uB2E8\uC5B4\uB97C \uC785\uB825\uD574\uBCF4\uC138\uC694!";
const UI_VERB_PH = "\uB3D9\uC0AC 1\uB2E8\uC5B4\uB9CC \uC785\uB825 (\uC608: decided)";

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
});

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .hint{
      margin-top:8px;
      padding:10px 12px;
      border-radius:12px;
      border:1px solid rgba(0,0,0,0.10);
      background:#fff;
      font-weight:900;
      color:rgba(0,0,0,0.76);
      line-height:1.5;
      font-size:13px;
    }
    .guide-line{
      font-weight:900;
      color:#7e3106;
      line-height:1.55;
    }
    .answer{
      margin-top:10px;
      width:100%;
      border:1px solid rgba(0,0,0,0.15);
      border-radius:10px;
      padding:10px;
      font-size:14px;
      box-sizing:border-box;
      outline:none;
      resize:none;
      transition:border-color .12s ease, box-shadow .12s ease;
      background:#fff;
    }
    .answer:focus{
      border-color:rgba(241,123,42,0.65);
      box-shadow:0 0 0 2px rgba(241,123,42,0.14);
    }
    .hl{
      display:inline-block;
      padding:0 4px;
      border-radius:7px;
      background:rgba(255,208,90,0.40);
      box-shadow: inset 0 0 0 1px rgba(160,110,0,0.16);
      font-weight:900;
      color:#7e3106;
    }
    .reduce-sentence{
      line-height:1.75;
      word-break: keep-all;
    }
    .reduce-chip{
      display:inline-block;
      margin-right:3px;
      vertical-align:baseline;
      appearance:none;
      -webkit-appearance:none;
      border:none;
      border-radius:8px;
      padding:0 4px;
      font: inherit;
      line-height: 1.6;
      color:#222;
      font-weight:900;
      background: rgba(255, 208, 90, 0.42);
      box-shadow: inset 0 0 0 1px rgba(160,110,0,0.18);
      cursor:pointer;
      user-select:none;
      transition: opacity .12s ease, transform .12s ease, box-shadow .12s ease;
    }
    .reduce-chip:hover{
      transform: translateY(-0.5px);
    }
    .reduce-chip.locked{
      cursor:default;
    }
    .reduce-chip.dropped{
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
      color: rgba(0,0,0,0.44);
      text-decoration: line-through;
      text-decoration-thickness: 1.5px;
      text-decoration-color: rgba(0,0,0,0.42);
      opacity:.95;
      cursor:default;
      transform:none;
    }
    .reduce-chip.dropped.collecting{
      pointer-events:none;
      will-change: transform, opacity, filter;
    }
    .reduce-chip.key-ready{
      border:1px solid rgba(70,140,255,0.58);
      border-radius:8px;
      padding:1px 7px;
      background: rgba(70,140,255,0.10);
      box-shadow: 0 0 0 2px rgba(70,140,255,0.10);
      color:#1f4fb8;
      animation: keyPulse .9s ease-in-out infinite;
    }
    @keyframes keyPulse{
      0%,100%{ transform: translateY(0); box-shadow: 0 0 0 2px rgba(70,140,255,0.10); }
      50%{ transform: translateY(-0.8px); box-shadow: 0 0 0 4px rgba(70,140,255,0.14); }
    }
    .reduce-chip.converted{
      border:none;
      border-radius:4px;
      padding:0 2px;
      background: linear-gradient(180deg, rgba(255,255,255,0) 58%, rgba(255, 208, 90, 0.34) 58%);
      box-shadow: inset 0 0 0 1px rgba(160,110,0,0.12);
      color:#7e3106;
      animation:none;
    }
    .verb-stage-box{
      display:none;
      margin-top:10px;
      transform-origin: center top;
    }
    .verb-stage-box.show{
      display:block;
      animation: verbStageDrop .28s cubic-bezier(.2,.95,.2,1) both;
    }
    @keyframes verbStageDrop{
      0%{ opacity:0; transform: translateY(-12px) scaleY(.92); }
      55%{ opacity:1; transform: translateY(2px) scaleY(1.02); }
      100%{ opacity:1; transform: translateY(0) scaleY(1); }
    }
    .verb-stage-box.hide-up{
      display:block;
      animation: verbStageLiftOut .22s cubic-bezier(.25,.85,.25,1) forwards;
      pointer-events:none;
    }
    @keyframes verbStageLiftOut{
      0%{ opacity:1; transform: translateY(0) scaleY(1); }
      100%{ opacity:0; transform: translateY(-12px) scaleY(.94); }
    }
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
    const questionRaw = String(r["Question"] ?? "").trim();
    const answerRaw = String(r["Answer"] ?? "").trim();

    const nominalPhrase = extractNominalPhrase(answerRaw);               // e.g. "made a decision"
    const simplifiedSentence = extractSimplifiedSentence(answerRaw);     // e.g. "We decided to ..."
    const targetVerb = extractTargetVerb(simplifiedSentence);            // e.g. "decided"
    const qSeg = splitQuestionHighlightSegments(questionRaw, nominalPhrase);
    const reduceTokens = tokenizeReducePhrase(qSeg.mid || nominalPhrase);
    const reduceKeyIndex = pickReduceKeyIndex(reduceTokens);

    return {
      qNumber,
      title,
      questionRaw,
      nominalPhrase,
      renderedQuestion: renderHighlightedQuestion(questionRaw, nominalPhrase),
      targetVerb,
      qSeg,
      reduceTokens,
      reduceKeyIndex
    };
  });
}

/** ================== Intro ================== */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L3-E6";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L3-E6</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>

      <div class="hint">${escapeHtml(SHORT_INSTRUCTION)}</div>

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
  reduceAlive = Array.isArray(q.reduceTokens) ? q.reduceTokens.map(() => true) : [];
  reduceInputOpen = false;
  reduceKeyConverted = false;
  reduceDroppedCollapsed = false;
  reduceKeyConvertedText = "";

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div id="stage-guide" class="guide-line">${UI_STAGE1_REDUCE}</div>
    </div>

    <div class="box">
      <div class="sentence reduce-sentence" id="question-sentence"></div>
    </div>

    <div class="box verb-stage-box" id="verb-stage-box">
      <textarea id="user-answer" class="answer" rows="2" placeholder="${UI_VERB_PH}"></textarea>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="next-btn" onclick="goNext()" disabled>다음</button>
    </div>

    <div id="feedback-area"></div>
  `;

  renderReduceQuestion();
  wireVerbInputAutoCheck();
  if (!Array.isArray(q.reduceTokens) || !q.reduceTokens.length) {
    revealVerbInput();
  }
}

/** ================== Submit / Next ================== */
function renderReduceQuestion() {
  const q = questions[currentIndex];
  const wrap = document.getElementById("question-sentence");
  const guide = document.getElementById("stage-guide");
  if (!q || !wrap) return;

  const seg = q.qSeg || { pre: q.questionRaw || "", mid: "", post: "" };
  const toks = Array.isArray(q.reduceTokens) ? q.reduceTokens : [];
  const aliveCount = reduceAlive.filter(Boolean).length;
  const onlyKeyLeft = aliveCount === 1 && !!reduceAlive[q.reduceKeyIndex];
  if (guide) {
    guide.textContent = reduceInputOpen ? UI_STAGE2_INPUT : (onlyKeyLeft ? UI_STAGE1_TAP_KEY : UI_STAGE1_REDUCE);
  }

  const pre = escapeHtml(seg.pre || "");
  const post = escapeHtml(seg.post || "");
  let midHtml = "";
  toks.forEach((tok, idx) => {
    const isKey = idx === q.reduceKeyIndex;
    const keyConverted = !!(reduceKeyConverted && isKey);
    const keyReady = !keyConverted && onlyKeyLeft && isKey && !isAnswered;
    const dropped = !reduceAlive[idx] && !isKey;
    if (dropped && reduceDroppedCollapsed) return;
    const cls = `reduce-chip${keyReady ? " key-ready" : ""}${keyConverted ? " converted" : ""}${reduceInputOpen ? " locked" : ""}${dropped ? " dropped" : ""}`;
    const disabledAttr = (reduceInputOpen || dropped || keyConverted) ? " disabled" : "";
    const shownText = keyConverted && reduceKeyConvertedText ? reduceKeyConvertedText : tok;
    midHtml += `<button type="button" class="${cls}" data-ridx="${idx}"${disabledAttr}>${escapeHtml(shownText)}</button>`;
  });
  if (!midHtml) {
    midHtml = `<span class="hl">${escapeHtml(seg.mid || q.nominalPhrase || "")}</span>`;
  }

  wrap.innerHTML = `${pre}${midHtml}${post}`;

  Array.from(wrap.querySelectorAll(".reduce-chip")).forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-ridx") || -1);
      handleReduceTap(idx);
    });
  });
}

function handleReduceTap(idx) {
  if (isAnswered) return;
  const q = questions[currentIndex];
  if (!q) return;
  if (!Array.isArray(q.reduceTokens) || idx < 0 || idx >= q.reduceTokens.length) return;
  if (!reduceAlive[idx]) return;
  if (reduceInputOpen) return;

  const aliveCount = reduceAlive.filter(Boolean).length;
  const onlyKeyLeft = aliveCount === 1 && !!reduceAlive[q.reduceKeyIndex];

  if (onlyKeyLeft && idx === q.reduceKeyIndex) {
    revealVerbInput();
    return;
  }

  if (idx === q.reduceKeyIndex) return;

  reduceAlive[idx] = false;
  renderReduceQuestion();
}

function revealVerbInput() {
  if (reduceInputOpen) return;
  reduceInputOpen = true;
  const box = document.getElementById("verb-stage-box");
  const ta = document.getElementById("user-answer");
  if (box) {
    box.classList.remove("hide-up");
    box.classList.add("show");
  }
  renderReduceQuestion();
  if (ta) {
    ta.disabled = false;
    ta.focus();
  }
}

function wireVerbInputAutoCheck() {
  const ta = document.getElementById("user-answer");
  if (!ta) return;
  ta.disabled = !reduceInputOpen;
  ta.addEventListener("input", () => {
    tryAutoCheckAnswer();
  });
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      tryAutoCheckAnswer();
    }
  });
}

function tryAutoCheckAnswer() {
  return tryAutoCheckAnswerAsync();
}

async function tryAutoCheckAnswerAsync() {
  if (isAnswered) return;
  const q = questions[currentIndex];
  if (!q) return;
  const ta = document.getElementById("user-answer");
  if (!ta || ta.disabled) return;

  const userRaw = (ta.value || "").trim();
  const user = normalizeWord(userRaw);
  const expected = normalizeWord(q.targetVerb || "");
  if (!expected || !user) return;
  if (user !== expected) return;

  isAnswered = true;
  reduceKeyConverted = true;
  results.push({
    no: currentIndex + 1,
    word: `Herma L3-E6 / Q${q.qNumber}`,
    selected: userRaw || "무응답",
    correct: true,
    question: q.questionRaw,
    expectedVerb: q.targetVerb
  });

  const nextBtn = document.getElementById("next-btn");
  ta.disabled = true;
  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";

  await collapseDroppedReduceWordsToLeft();
  reduceDroppedCollapsed = true;
  reduceKeyConvertedText = userRaw.trim() || q.targetVerb || "";
  renderReduceQuestion();

  const box = document.getElementById("verb-stage-box");
  if (box && box.classList.contains("show")) {
    box.classList.remove("show");
    box.classList.add("hide-up");
  }
  window.setTimeout(() => {
    reduceInputOpen = false;
    if (box) box.classList.remove("hide-up");
    if (nextBtn) nextBtn.disabled = false;
    if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
  }, 230);
}

async function collapseDroppedReduceWordsToLeft() {
  const wrap = document.getElementById("question-sentence");
  if (!wrap) return;

  const droppedEls = Array.from(wrap.querySelectorAll(".reduce-chip.dropped"));
  if (!droppedEls.length) return;

  const anchorEl =
    wrap.querySelector(".reduce-chip.key-ready") ||
    wrap.querySelector(".reduce-chip:not(.dropped)");
  const anchorRect = anchorEl ? anchorEl.getBoundingClientRect() : null;
  const fallbackX = droppedEls.reduce((m, el) => Math.min(m, el.getBoundingClientRect().left), Number.POSITIVE_INFINITY);
  const targetX = Number.isFinite(fallbackX)
    ? (anchorRect ? (anchorRect.left + Math.min(12, anchorRect.width * 0.25)) : fallbackX)
    : 0;

  const plays = droppedEls.map((el, i) => {
    el.classList.add("collecting");
    const r = el.getBoundingClientRect();
    const dx = targetX - r.left;
    try {
      if (typeof el.animate === "function") {
        const anim = el.animate(
          [
            { transform: "translateX(0px) scale(1)", opacity: 0.95, filter: "blur(0px)" },
            { transform: `translateX(${dx.toFixed(2)}px) scale(0.82)`, opacity: 0, filter: "blur(0.6px)" }
          ],
          {
            duration: 180 + (i * 28),
            easing: "cubic-bezier(.18,.92,.2,1)",
            fill: "forwards"
          }
        );
        return anim.finished.catch(() => {});
      }
    } catch (_) {}
    return new Promise((resolve) => setTimeout(resolve, 200 + (i * 20)));
  });

  await Promise.all(plays);
}

function submitAnswer() {
  tryAutoCheckAnswer();
}

function goNext() {
  if (!isAnswered) {
    const q = questions[currentIndex];
    const ta = document.getElementById("user-answer");
    const typed = (ta?.value || "").trim();
    results.push({
      no: currentIndex + 1,
      word: `Herma L3-E6 / Q${q.qNumber}`,
      selected: typed || "무응답",
      correct: false,
      question: q.questionRaw,
      expectedVerb: q.targetVerb
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
    testspecific: results
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

    <div style="max-height:260px; overflow-y:auto; margin-bottom:14px;">
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

/** ================== Parsing Helpers ================== */
function extractNominalPhrase(answerRaw){
  const s = String(answerRaw || "");
  const m = s.match(/^\s*(.*?)\s*–/);
  return (m ? m[1] : "").trim();
}

function extractSimplifiedSentence(answerRaw){
  const s = String(answerRaw || "");
  // 마지막 "영어문장. –"을 잡는다(앞쪽 'made a decision –' 같은 덩어리 제외)
  const matches = [...s.matchAll(/([A-Z][A-Za-z0-9 ,'"()\-\u2019]+?\.)\s*–/g)];
  if (matches.length) return String(matches[matches.length - 1][1]).trim();

  // fallback: 대문자로 시작해 . 까지
  const m = s.match(/([A-Z][^–]*?\.)/);
  return (m ? m[1] : "").trim();
}

function extractTargetVerb(simplifiedSentence){
  const sent = String(simplifiedSentence || "").trim().replace(/[.?!]+$/,"");
  if (!sent) return "";

  const toks = sent.split(/\s+/).filter(Boolean);
  if (!toks.length) return "";

  const first = toks[0].toLowerCase();

  if (first === "please" && toks.length >= 2) return toks[1].toLowerCase();

  const pronouns = new Set(["i","we","you","he","she","they","it"]);
  if (pronouns.has(first) && toks.length >= 2) return toks[1].toLowerCase();

  // 그 외(예: The manager suggested ...)는 안전하게 "동사 후보"를 스캔
  const irregular = new Set([
    "met","sat","slept","ate","came","went","chose","put",
    "rested","dreamed","looked","presented","explained","warned","called",
    "tried","walked","showered","reviewed","researched","experimented","exercised","surveyed",
    "advanced","adjusted","improved","discussed","planned","promised","decided","complained","suggested","changed","progressed"
  ]);

  const avoid = new Set(["the","a","an","manager","team","students","company","teacher","class","client","report","document","window","park"]);
  for (let i=1;i<toks.length;i++){
    const w = toks[i].replace(/[^A-Za-z\u2019']/g,"").toLowerCase();
    if (!w || avoid.has(w)) continue;
    if (irregular.has(w)) return w;
    if (/^[a-z]+ed$/.test(w)) return w;
    if (w === "sit") return w;
  }

  return toks.length >= 2 ? toks[1].toLowerCase() : toks[0].toLowerCase();
}

function splitQuestionHighlightSegments(questionRaw, fallbackPhrase){
  const q = String(questionRaw || "");
  const star = q.match(/^([\s\S]*?)\*([\s\S]+?)\*([\s\S]*)$/);
  if (star) {
    return { pre: star[1] || "", mid: star[2] || "", post: star[3] || "" };
  }

  const p = String(fallbackPhrase || "").trim();
  if (p) {
    const qi = q.toLowerCase();
    const pi = p.toLowerCase();
    const idx = qi.indexOf(pi);
    if (idx >= 0) {
      return {
        pre: q.slice(0, idx),
        mid: q.slice(idx, idx + p.length),
        post: q.slice(idx + p.length),
      };
    }
  }

  return { pre: q, mid: "", post: "" };
}

function tokenizeReducePhrase(phrase){
  return String(phrase || "")
    .split(/\s+/)
    .map((w) => String(w || "").replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ""))
    .filter(Boolean);
}

function pickReduceKeyIndex(tokens){
  if (!Array.isArray(tokens) || !tokens.length) return -1;
  return tokens.length - 1;
}

function renderHighlightedQuestion(questionRaw, phrase){
  const q = String(questionRaw || "");
  const p = String(phrase || "").trim();

  // 1) Question에 * * 표시가 이미 있으면 그걸 우선 사용
  if (q.includes("*")) {
    const safe = escapeHtml(q);
    return safe.replace(/\*(.+?)\*/g, `<span class="hl">$1</span>`);
  }

  // 2) Answer에서 뽑은 nominal phrase를 문장 안에서 찾아 하이라이트
  if (p) {
    const re = new RegExp(escapeRegExp(p), "i");
    if (re.test(q)) {
      const safeQ = escapeHtml(q);
      // 안전하게 원문에서 한 번만 치환
      const idx = q.toLowerCase().indexOf(p.toLowerCase());
      if (idx >= 0) {
        const before = escapeHtml(q.slice(0, idx));
        const mid = escapeHtml(q.slice(idx, idx + p.length));
        const after = escapeHtml(q.slice(idx + p.length));
        return `${before}<span class="hl">${mid}</span>${after}`;
      }
      // fallback replace
      return safeQ.replace(re, (m) => `<span class="hl">${escapeHtml(m)}</span>`);
    }
  }

  // 3) 못 찾으면 그냥 문장 출력
  return escapeHtml(q);
}

/** ================== Utils ================== */
function normalizeWord(s){
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g,"");
}

function trimForTable(s){
  const t = String(s || "");
  return t.length > 70 ? t.slice(0,70) + "..." : t;
}

function escapeRegExp(str){
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

