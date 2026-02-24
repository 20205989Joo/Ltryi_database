// ver1.1_26.02.22
// herma-l1e4.js  (UPDATED: ✅ 3단계 완성문장에 a/b/c 밑줄 + and 금색 / 2단계 b/c는 클릭할 때만 배정색)
// ------------------------------------------------------------

const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 1;
const TARGET_EXERCISE = 4;

const STEP1_DEFAULT_INST = "\uAC15\uC870\uB41C \uB2E8\uC5B4\uC640 \uAC19\uC740 \uD45C\uD604\uC744 \uC57D\uBD84\uD574\uBCF4\uC138\uC694!";
const STEP2_INST = "\uAC19\uC740 \uB808\uBCA8\uC758 b\uC640 c\uB97C \uACE8\uB77C\uBCF4\uC138\uC694!";

let subcategory = "Grammar";
let level = "Basic";
let day = "104";
let quizTitle = "quiz_Grammar_Basic_104";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];

// stage
let stage = "intro"; // intro | reduce | pair | translate

// tokens (현재 문항)
let curTokens = [];

// 1단계
let requiredIdxSet = new Set(); // {} 토큰 idx들
let fadedIdxSet = new Set();    // 학생이 faded 만든 {} 토큰 idx들

// 2단계
let bcCorrectIdxSet = new Set();  // <b>/<c> 정답 토큰 idx
let pickedIdxSet = new Set();     // 학생이 pick한 토큰 idx

// 3단계 (✅ L1-E3 방식)
let wbBank = [];
let wbPicked = [];
let wbLocked = false;
let correctKo = "";

window.addEventListener("DOMContentLoaded", async () => {  var __r2_guard = (new URLSearchParams(window.location.search || "")).get("round2") === "1";
  if (__r2_guard) return;
  applyQueryParams();
  wireBackButton();
  injectStyles();

  // ✅ L1-E3 토스트 init
  if (window.HermaToastFX) window.HermaToastFX.init({ hostId: "cafe_int", top: 10 });

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

/** ================== Toast (L1-E3 방식) ================== */
function toastOk(msg){
  if (!window.HermaToastFX) return;
  try { window.HermaToastFX.show("ok", String(msg||"")); } catch(e){}
}
function toastNo(msg){
  if (!window.HermaToastFX) return;
  try { window.HermaToastFX.show("no", String(msg||"")); } catch(e){}
}
function toastOkConfetti(msg){
  if (!window.HermaToastFX) return;
  const m = String(msg||"");
  try { window.HermaToastFX.show("ok", m, { confetti:true }); return; } catch(e){}
  try { window.HermaToastFX.show("ok", m); } catch(e){}
}

/** ============ Params / Nav ============ */
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

/** ============ Load Excel ============ */
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

/** ============ Build Questions ============ */
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
    const transformsRaw =
      String(r["Transforms"] ?? r["Transform"] ?? r["TransformMap"] ?? "").trim();
    const laststageFinalRaw =
      String(r["Laststage-FinalSentence"] ?? r["LaststageFinalSentence"] ?? "").trim();
    const laststageKRTokensRaw =
      String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();

    const parsed = parseE3Answer(answerRaw); // english||korean

    return {
      qNumber,
      title,
      instruction,
      questionRaw,
      answerRaw,
      transformsRaw,
      laststageFinalSentence: laststageFinalRaw,
      laststageKRTokens: laststageKRTokensRaw,
      english: parsed.english,
      korean: parsed.korean,
      koreanTagged: parsed.koreanTagged
    };
  });
}

// Answer: "english||korean"
function parseE3Answer(answerRaw) {
  const s = String(answerRaw || "").trim();
  if (!s) return { english: "", korean: "", koreanTagged: "" };

  if (s.includes("||")) {
    const parts = s.split("||");
    const koreanTagged = (parts.slice(1).join("||") ?? "").trim();
    return {
      english: (parts[0] ?? "").trim(),
      korean: stripABCMarkers(koreanTagged),
      koreanTagged
    };
  }

  const m = s.match(/[가-힣]/);
  if (!m) return { english: s.trim(), korean: "", koreanTagged: "" };
  if (m.index === 0) {
    const koreanTagged = s.trim();
    return { english: "", korean: stripABCMarkers(koreanTagged), koreanTagged };
  }
  const koreanTagged = s.slice(m.index).trim();
  return {
    english: s.slice(0, m.index).trim(),
    korean: stripABCMarkers(koreanTagged),
    koreanTagged
  };
}

/** ============ UI ============ */
function renderIntro() {
  stage = "intro";
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L1-E4";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L1-E4</div>
      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>
      <div style="font-size:13px; line-height:1.6; color:#333;">
        • 1단계: 문장 안에서 <b>{...}</b>를 눌러 약분<br/>
        • 2단계: <b>a</b> + <b>and</b>만 먼저 표시 / <b>b/c는 클릭할 때만 배정색</b><br/>
        • 3단계: 해석 단어뱅크(L1-E3) + 완성문장에 a/b/c 밑줄, and 금색
      </div>

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

function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  // reset
  stage = "reduce";

  requiredIdxSet = new Set();
  fadedIdxSet = new Set();

  bcCorrectIdxSet = new Set();
  pickedIdxSet = new Set();

  wbBank = [];
  wbPicked = [];
  wbLocked = false;
  correctKo = "";

  curTokens = tokenizeAll(q.questionRaw);

  // 1단계 정답(= {} 안 토큰들)
  for (const t of curTokens) {
    if (!t.isSpace && t.isReq) requiredIdxSet.add(String(t.idx));
  }

  // 2단계 정답(= <b>/<c> 안 토큰들)
  for (const t of curTokens) {
    if (!t.isSpace && (t.isB || t.isC)) bcCorrectIdxSet.add(String(t.idx));
  }

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" id="step-inst-box" style="margin-bottom:10px;">
      <div id="inst" style="font-weight:900; color:#7e3106; margin-bottom:6px;">
        ${buildReduceInstructionHtmlL1E4()}
      </div>
    </div>

    <div class="box" id="step-box" style="margin-bottom:10px;">
      <div class="sentence" id="sentence-area"></div>
      <div id="hint-line" style="display:none;"></div>
    </div>

    <!-- ✅ 3단계 UI: L1-E3 그대로 -->
    <div id="translate-block" style="display:none;">
      <div class="box" style="margin-bottom:10px;">
        <div class="sentence readonly" id="reduced-sentence"></div>
      </div>

      <div class="sentence" id="answer-line" style="
        min-height:86px;
        display:flex;
        flex-wrap:wrap;
        align-items:flex-start;
        gap:6px;
      "></div>

      <div class="box" style="margin-top:10px;">
        <div id="bank-area"></div>
        <div id="remain-info" style="margin-top:8px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78);"></div>
      </div>
    </div>

    <div id="stage-action-row" class="btn-row" style="margin-top:12px; display:none;">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  const sentenceArea = document.getElementById("sentence-area");
  sentenceArea.innerHTML = buildSentenceHTML(curTokens);

  // 버튼: 3단계 전까지 제출 잠금, 다음 잠금
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = true;
  const actionRow = document.getElementById("stage-action-row");
  if (actionRow) actionRow.style.display = "none";

  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";

  sentenceArea.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-idx]");
    if (!el) return;

    const idx = el.getAttribute("data-idx");
    if (!idx) return;

    // ---------- 1단계 ----------
    if (stage === "reduce") {
      const isReq = el.getAttribute("data-req") === "1";
      if (!isReq) {
        el.classList.add("nope");
        setTimeout(() => el.classList.remove("nope"), 120);
        toastNo("\uAC19\uC740 \uD45C\uD604\uC744 \uACE8\uB77C\uC8FC\uC138\uC694!");
        return;
      }

      el.classList.toggle("faded");
      if (el.classList.contains("faded")) fadedIdxSet.add(idx);
      else fadedIdxSet.delete(idx);

      if (requiredIdxSet.size > 0 && isAllRequiredFaded()) {
        toastOk("1단계 완료!");
        enterStep2();
      }
      return;
    }

    // ---------- 2단계 ----------
    if (stage === "pair") {
      const isB = el.getAttribute("data-b") === "1";
      const isC = el.getAttribute("data-c") === "1";
      const isBC = isB || isC;

      if (!isBC) {
        el.classList.add("nope");
        setTimeout(() => el.classList.remove("nope"), 120);
        toastNo("\uAC19\uC740 \uB808\uBCA8\uC744 \uACE8\uB77C\uC8FC\uC138\uC694!");
        return;
      }

      // ✅ b/c는 "클릭할 때만" 배정색 하이라이트
      el.classList.toggle("pick");
      if (el.classList.contains("pick")) {
        pickedIdxSet.add(idx);
        if (isB) el.classList.add("bPick");
        if (isC) el.classList.add("cPick");
      } else {
        pickedIdxSet.delete(idx);
        el.classList.remove("bPick", "cPick");
      }

      if (isBCSelectionCorrect()) {
        toastOk("2단계 완료!");
        enterTranslateStage();
      }
      return;
    }
  });

  // ✅ 1단계 시작 토스트 없음(요구사항)
}

function isAllRequiredFaded() {
  for (const idx of requiredIdxSet) {
    if (!fadedIdxSet.has(String(idx))) return false;
  }
  return true;
}

/** ============ 2단계 진입: instruction 교체 + a/and 하이라이트만 켬 (✅ b/c는 여기서 절대 칠하지 않음) ============ */
function enterStep2() {
  stage = "pair";

  const inst = document.getElementById("inst");
  if (inst) inst.textContent = STEP2_INST;

  const hint = document.getElementById("hint-line");
  if (hint) hint.style.display = "none";

  const sent = document.getElementById("sentence-area");
  if (sent) {
    sent.querySelectorAll('[data-a="1"]').forEach(el => el.classList.add("a2"));
    sent.querySelectorAll('[data-and="1"]').forEach(el => el.classList.add("and2"));
  }

  toastOk("2단계 시작!");
}

function isBCSelectionCorrect() {
  if (pickedIdxSet.size !== bcCorrectIdxSet.size) return false;
  for (const idx of bcCorrectIdxSet) {
    if (!pickedIdxSet.has(String(idx))) return false;
  }
  return true;
}

/** ================== ✅ 3단계 진입 시 2단계 잔재 제거 ================== */
function clearStep2ResidueForStage3(){
  const instBox = document.getElementById("step-inst-box");
  if (instBox) instBox.style.display = "none";

  const stepBox = document.getElementById("step-box");
  if (stepBox) stepBox.style.display = "none";

  const sent = document.getElementById("sentence-area");
  if (sent){
    sent.classList.add("readonly");
    sent.querySelectorAll(".tok").forEach(el=>{
      el.classList.remove("a2","and2","pick","bPick","cPick","nope");
    });
  }

  const hint = document.getElementById("hint-line");
  if (hint) hint.style.display = "none";
}

/** ================== 3단계: Translate (✅ L1-E3 그대로 + ✅ 완성문장 데코) ================== */
function enterTranslateStage() {
  stage = "translate";
  wbLocked = false;

  clearStep2ResidueForStage3();

  const q = questions[currentIndex];
  if (!q) return showResultPopup();

  const tb = document.getElementById("translate-block");
  if (tb) tb.style.display = "block";

  // 상단 약분 문장 표시(= {} 제거) + ✅ a/b/c 밑줄 + and 금색
  const reducedTokens = removeReqTokens(curTokens);
  const reducedEl = document.getElementById("reduced-sentence");
  if (reducedEl) {
    const configuredFinalParts = parseLaststageFinalSentenceForL1E4(q.laststageFinalSentence);
    if (configuredFinalParts.length) {
      reducedEl.innerHTML = renderConfiguredFinalSentenceForL1E4(configuredFinalParts);
    } else {
      reducedEl.innerHTML = buildSentenceHTML(reducedTokens, {
        decorate: (tok) => {
          const cls = [];
          if (!tok.isSpace) {
            if (tok.isA) cls.push("uA");
            if (tok.isB) cls.push("uB");
            if (tok.isC) cls.push("uC");
            if (tok.isAnd) cls.push("linkGold");
          }
          return cls;
        }
      });
    }
  }

  // 버튼 상태 (L1-E3처럼: 제출 활성, 다음 잠금)
  const actionRow = document.getElementById("stage-action-row");
  if (actionRow) actionRow.style.display = "flex";
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = false;
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = true;

  let koTokens = [];
  const configuredKorTokens = parseLaststageKRTokensForL1E4(q.laststageKRTokens);
  if (configuredKorTokens.length) {
    koTokens = configuredKorTokens.map((t) => ({
      text: t.text,
      role: mapKRTokensRoleForL1E4(t.seg)
    }));
    correctKo = configuredKorTokens.map((t) => t.text).join(" ").trim();
  } else {
    const koTagged = String(q.koreanTagged || q.korean || "").trim();
    koTokens = tokenizeKoreanTaggedForBox(koTagged); // [{text, role}]
    if (!koTokens.length) {
      koTokens = tokenizeKoreanForBox(String(q.korean || "").trim()).map((t) => ({
        text: t,
        role: null
      }));
    }
    correctKo = String(q.korean || koTokens.map((t) => t.text).join(" ")).trim();
  }

  wbPicked = [];

  wbBank = shuffleArray(koTokens).map((t, i) => ({
    id: `k${i}_${Math.random().toString(16).slice(2, 6)}`,
    text: t.text,
    role: t.role || null
  }));

  renderTranslateUI();
  toastOk("3단계 시작!");
}

function renderTranslateUI() {
  const answerLine = document.getElementById("answer-line");
  const bankArea = document.getElementById("bank-area");
  const remainInfo = document.getElementById("remain-info");

  if (answerLine) {
    answerLine.innerHTML = "";

    if (!wbPicked.length) {
      const hint = document.createElement("span");
      hint.textContent = "(조각을 눌러 순서대로 채우세요 / 마지막 조각을 누르면 되돌아갑니다)";
      hint.style.opacity = ".45";
      hint.style.fontWeight = "900";
      hint.style.color = "#7e3106";
      answerLine.appendChild(hint);
    } else {
      wbPicked.forEach((tok, idx) => {
        const isLast = (idx === wbPicked.length - 1);

        const sp = document.createElement("button");
        sp.type = "button";
        sp.textContent = tok.text;

        sp.style.display = "inline-flex";
        sp.style.alignItems = "center";
        sp.style.justifyContent = "center";
        sp.style.padding = "8px 10px";
        sp.style.borderRadius = "999px";
        sp.style.border = isLast ? "2px solid rgba(241,123,42,0.9)" : "1px solid rgba(0,0,0,0.14)";
        sp.style.background = "#fff";
        sp.style.fontWeight = "900";
        sp.style.fontSize = "13px";
        sp.style.userSelect = "none";
        sp.style.cursor = (wbLocked ? "not-allowed" : (isLast ? "pointer" : "default"));
        sp.style.opacity = wbLocked ? "0.6" : "1";

        applyKoRoleClass(sp, tok?.role);

        sp.onclick = () => {
          if (wbLocked) return;
          if (!isLast) return;
          const popped = wbPicked.pop();
          if (popped) wbBank.push(popped);
          renderTranslateUI();
        };

        answerLine.appendChild(sp);
      });
    }
  }

  if (bankArea) {
    bankArea.innerHTML = "";
    wbBank.forEach(tok => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = tok.text;
      btn.disabled = wbLocked;

      btn.style.display = "inline-flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.padding = "9px 10px";
      btn.style.borderRadius = "999px";
      btn.style.border = "1px solid rgba(0,0,0,0.12)";
      btn.style.background = "#fff";
      btn.style.fontWeight = "900";
      btn.style.fontSize = "14px";
      btn.style.cursor = wbLocked ? "not-allowed" : "pointer";
      btn.style.userSelect = "none";
      btn.style.margin = "6px 6px 0 0";
      btn.style.opacity = wbLocked ? "0.35" : "1";

      applyKoRoleClass(btn, tok?.role);

      btn.onclick = () => {
        if (wbLocked) return;
        const idx = wbBank.findIndex(x => x.id === tok.id);
        if (idx >= 0) {
          const [moved] = wbBank.splice(idx, 1);
          wbPicked.push(moved);
          renderTranslateUI();
        }
      };

      bankArea.appendChild(btn);
    });
  }

  if (remainInfo) remainInfo.textContent = `남은 조각: ${wbBank.length}개`;
}

/** ============ Submit / Next ============ */
function submitAnswer() {
  if (stage !== "translate") {
    toastNo("3단계부터");
    return;
  }
  if (wbLocked) return;

  const q = questions[currentIndex];

  const userKo = wbPicked.map(x => x.text).join(" ").trim();
  const koOk = normalizeKoreanForCompare(userKo) === normalizeKoreanForCompare(correctKo);

  if (!koOk) {
    toastNo("오답… 다시!");
    return;
  }

  wbLocked = true;
  renderTranslateUI();

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;

  toastOkConfetti("정답!");

  results.push({
    no: currentIndex + 1,
    word: `Herma L1-E4 / Q${q.qNumber}`,
    selected: userKo || "무응답",
    correct: true,
    question: q.questionRaw,
    answer: q.korean
  });
}

function goNext() {
  if (stage !== "translate") return;

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn && nextBtn.disabled) return;

  currentIndex++;
  if (currentIndex >= questions.length) return showResultPopup();
  renderQuestion();
}

/** ============ Result Popup ============ */
function showResultPopup() {
  const total = results.length;
  const correctCount = results.filter(r => r.correct).length;

  const resultObject = {
    quiztitle: quizTitle,
    subcategory,
    level,
    day,
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

  if (!popup || !content) {
    alert(`완료! (${correctCount}/${total})`);
    return;
  }

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
      점수: <b>${correctCount}/${total}</b>
    </div>

    <div style="max-height:280px; overflow-y:auto; margin-bottom:14px;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f6f6f6;">
            <th style="padding:6px; border-bottom:1px solid #ccc;">번호</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">문항</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">내 답</th>
            <th style="padding:6px; border-bottom:1px solid #ccc;">상태</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" onclick="location.reload()">🔁 재시험</button>
      <button class="quiz-btn" onclick="document.getElementById('result-popup').style.display='none'">닫기</button>
    </div>
  `;

  popup.style.display = "flex";
}

/** ============ Tokenize ============ */
/*
  - *...*         : isPre
  - {...}         : isReq
  - <a>...</a>    : isA
  - <and>...</and>: isAnd
  - <b>...</b>    : isB
  - <c>...</c>    : isC
*/
function tokenizeAll(src) {
  const s = String(src || "");

  const segs = [];
  let preMode = false;
  let reqMode = false;
  let aMode = false;
  let andMode = false;
  let bMode = false;
  let cMode = false;

  let buf = "";

  const flush = () => {
    if (!buf) return;
    segs.push({ text: buf, isPre: preMode, isReq: reqMode, isA: aMode, isAnd: andMode, isB: bMode, isC: cMode });
    buf = "";
  };

  for (let i = 0; i < s.length; i++) {
    if (s.startsWith("<a>", i))    { flush(); aMode = true; i += 2; continue; }
    if (s.startsWith("</a>", i))   { flush(); aMode = false; i += 3; continue; }

    if (s.startsWith("<and>", i))  { flush(); andMode = true; i += 4; continue; }
    if (s.startsWith("</and>", i)) { flush(); andMode = false; i += 5; continue; }

    if (s.startsWith("<b>", i))    { flush(); bMode = true; i += 2; continue; }
    if (s.startsWith("</b>", i))   { flush(); bMode = false; i += 3; continue; }

    if (s.startsWith("<c>", i))    { flush(); cMode = true; i += 2; continue; }
    if (s.startsWith("</c>", i))   { flush(); cMode = false; i += 3; continue; }

    const ch = s[i];
    if (ch === "*") { flush(); preMode = !preMode; continue; }
    if (ch === "{") { flush(); reqMode = true; continue; }
    if (ch === "}") { flush(); reqMode = false; continue; }

    buf += ch;
  }
  flush();

  const tokens = [];
  let idx = 0;

  for (const seg of segs) {
    const pieces = seg.text.match(/\s+|[^\s]+/g) || [];
    for (const p of pieces) {
      if (p === "") continue;
      if (/\s+/.test(p)) tokens.push({ isSpace: true, raw: p });
      else {
        idx += 1;
        tokens.push({
          isSpace: false,
          idx,
          text: p,
          isPre: !!seg.isPre,
          isReq: !!seg.isReq,
          isA: !!seg.isA,
          isAnd: !!seg.isAnd,
          isB: !!seg.isB,
          isC: !!seg.isC
        });
      }
    }
  }
  return tokens;
}

// ✅ opts.decorate 지원 (L1-E3처럼)
function buildSentenceHTML(tokens, opts = {}) {
  const decorate = typeof opts.decorate === "function" ? opts.decorate : null;

  return tokens.map(t => {
    if (t.isSpace) return escapeHtml(t.raw);

    const cls = ["tok"];
    if (t.isPre) cls.push("pre");
    if (decorate) {
      const more = decorate(t) || [];
      more.forEach(c => cls.push(c));
    }

    const reqAttr = t.isReq ? "1" : "0";
    const aAttr = t.isA ? "1" : "0";
    const andAttr = t.isAnd ? "1" : "0";
    const bAttr = t.isB ? "1" : "0";
    const cAttr = t.isC ? "1" : "0";

    return `<span class="${cls.join(" ")}" data-idx="${t.idx}" data-req="${reqAttr}" data-a="${aAttr}" data-and="${andAttr}" data-b="${bAttr}" data-c="${cAttr}">${escapeHtml(t.text)}</span>`;
  }).join("");
}

function removeReqTokens(tokens) {
  const out = [];
  for (const t of tokens) {
    if (!t.isSpace && t.isReq) continue;
    out.push({ ...t, isReq: false });
  }

  const cleaned = [];
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    if (t.isSpace) {
      if (!cleaned.length) continue;
      const prev = cleaned[cleaned.length - 1];
      if (prev.isSpace) continue;
      cleaned.push({ isSpace: true, raw: " " });
    } else cleaned.push(t);
  }
  if (cleaned.length && cleaned[cleaned.length - 1].isSpace) cleaned.pop();
  return cleaned;
}

/** ================== Korean bank (L1-E3 방식) ================== */
function tokenizeKoreanForBox(kor) {
  const s = String(kor || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1");
  if (!s) return [];
  return s.split(" ").filter(Boolean);
}

function applyKoRoleClass(el, role) {
  if (!el || !role) return;
  if (role === "a") el.classList.add("koU_A");
  else if (role === "b") el.classList.add("koU_B");
  else if (role === "c") el.classList.add("koU_C");
}

function tokenizeKoreanTaggedForBox(korTagged) {
  const s = String(korTagged || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1");
  if (!s) return [];

  const segs = [];
  let mode = null; // a | b | c | null
  let buf = "";

  const flush = () => {
    if (!buf) return;
    segs.push({ text: buf, role: mode });
    buf = "";
  };

  for (let i = 0; i < s.length; i++) {
    if (s.startsWith("<a>", i)) { flush(); mode = "a"; i += 2; continue; }
    if (s.startsWith("</a>", i)) { flush(); mode = null; i += 3; continue; }

    if (s.startsWith("<b>", i)) { flush(); mode = "b"; i += 2; continue; }
    if (s.startsWith("</b>", i)) { flush(); mode = null; i += 3; continue; }

    if (s.startsWith("<c>", i)) { flush(); mode = "c"; i += 2; continue; }
    if (s.startsWith("</c>", i)) { flush(); mode = null; i += 3; continue; }

    buf += s[i];
  }
  flush();

  const out = [];
  for (const seg of segs) {
    const txt = String(seg.text || "")
      .replace(/\s+([.,!?])/g, "$1")
      .trim();
    if (!txt) continue;

    const parts = txt.split(/\s+/).filter(Boolean);
    for (const p of parts) out.push({ text: p, role: seg.role || null });
  }
  return out;
}

function buildReduceInstructionHtmlL1E4() {
  const text = String(STEP1_DEFAULT_INST || "").trim();
  const key = "\uAC15\uC870\uB41C \uB2E8\uC5B4";
  const escText = escapeHtml(text);
  const escKey = escapeHtml(key);
  if (!escText.includes(escKey)) return escText;
  return escText.replace(escKey, `<span class="instPre">${escKey}</span>`);
}

function parseLaststageFinalSentenceForL1E4(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];

  let tagged = false;
  const out = [];
  parts.forEach((part) => {
    const m = part.match(/^(plain|link|a|b|c|ab|pair)\s*::\s*(.+)$/i);
    if (m) {
      tagged = true;
      out.push({ seg: String(m[1] || "").toLowerCase(), text: String(m[2] || "").trim() });
      return;
    }
    out.push({ seg: "plain", text: part });
  });

  if (!tagged) return [];
  return out.filter((x) => x.text);
}

function mapFinalSegClassForL1E4(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "link") return "tok linkGold";
  if (s === "a" || s === "ab" || s === "pair") return "tok uA";
  if (s === "b") return "tok uB";
  if (s === "c") return "tok uC";
  return "";
}

function renderConfiguredFinalSentenceForL1E4(parts) {
  return parts.map((part) => {
    const text = String(part?.text || "").trim();
    if (!text) return "";
    const cls = mapFinalSegClassForL1E4(part.seg);
    if (cls) return `<span class="${cls}">${escapeHtml(text)}</span>`;
    return escapeHtml(text);
  }).join(" ");
}

function parseLaststageKRTokensForL1E4(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const tokens = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!tokens.length) return [];

  let tagged = false;
  const out = [];
  tokens.forEach((token) => {
    const m = token.match(/^(plain|a|b|c|ab|pair)\s*::\s*(.+)$/i);
    if (m) {
      tagged = true;
      out.push({ text: String(m[2] || "").trim(), seg: String(m[1] || "").toLowerCase() });
      return;
    }
    out.push({ text: token, seg: "plain" });
  });

  if (!tagged) return [];
  return out.filter((x) => x.text);
}

function mapKRTokensRoleForL1E4(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "a";
  if (s === "b") return "b";
  if (s === "c") return "c";
  return null;
}

function normalizeKoreanForCompare(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1");
}

/** ============ Helpers ============ */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function trimForTable(s){
  const t = String(s || "").trim();
  return t.length > 28 ? (t.slice(0, 28) + "…") : t;
}
function stripABCMarkers(s){
  return String(s || "")
    .replace(/<\/?(a|b|c)>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** ============ Styles ============ */
function injectStyles(){
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --gold:#d5a22a;
      --uA: rgba(241,123,42,0.95);   /* a 밑줄(주황) */
      --uB: rgba(70,120,255,0.95);   /* b 밑줄(파랑) */
      --uC: rgba(186,146,255,0.95);  /* c 밑줄(연보라) */
    }

    /* *...* 하이라이트 */
    .tok.pre{
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight: 900;
    }
    .instPre{
      background: rgba(255, 208, 90, 0.45);
      border-radius: 6px;
      padding: 0 3px;
      box-shadow: inset 0 0 0 1px rgba(160, 110, 0, 0.18);
      font-weight: 900;
    }

    .tok.nope{
      box-shadow: inset 0 0 0 1px rgba(200, 40, 40, 0.22);
      background: rgba(200, 40, 40, 0.05);
    }
    .tok.faded{
      opacity: 0.22 !important;
      text-decoration: line-through !important;
      filter: blur(0.2px) !important;
    }
    .sentence.readonly .tok{ cursor: default !important; }
    .sentence.readonly .tok:hover{ transform:none !important; filter:none !important; }

    /* 2단계에서만 a/and 하이라이트 */
    .tok.a2{
      box-shadow: inset 0 0 0 2px rgba(241,123,42,0.28);
      background: rgba(241,123,42,0.10);
      font-weight: 900;
    }
    .tok.and2{
      box-shadow: inset 0 0 0 1px rgba(213,162,42,0.25);
      background: rgba(213,162,42,0.20);
      border-radius: 6px;
      padding: 0 3px;
      font-weight: 950;
      color: #111;
    }

    /* 2단계에서도 1단계(*...*) 하이라이트는 유지 */
    .tok.pre.a2{
      background: rgba(255, 208, 90, 0.45);
      box-shadow:
        inset 0 0 0 1px rgba(160, 110, 0, 0.18),
        0 0 0 2px rgba(241,123,42,0.18);
    }
    .tok.pre.and2{
      background: rgba(255, 208, 90, 0.45);
      box-shadow:
        inset 0 0 0 1px rgba(160, 110, 0, 0.18),
        0 0 0 2px rgba(213,162,42,0.20);
    }

    /* ✅ b/c는 "클릭(pick)될 때만" 배정색 하이라이트(2단계) */
    .tok.pick.bPick{
      box-shadow: inset 0 0 0 3px rgba(70,120,255,0.45);
      background: rgba(70,120,255,0.14);
      transform: translateY(-0.5px);
      font-weight: 950;
    }
    .tok.pick.cPick{
      box-shadow: inset 0 0 0 3px rgba(186,146,255,0.50);
      background: rgba(186,146,255,0.18);
      transform: translateY(-0.5px);
      font-weight: 950;
    }

    /* ✅ 3단계 완성문장: a/b/c 밑줄 (L1-E3 느낌) */
    .tok.uA, .tok.uB, .tok.uC{
      font-weight: 950;
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 6px;
    }
    .tok.uA{ text-decoration-color: var(--uA); }
    .tok.uB{ text-decoration-color: var(--uB); }
    .tok.uC{ text-decoration-color: var(--uC); }

    /* 3단계 한국어 토큰(뱅크/정답줄) a/b/c 밑줄 */
    .koU_A, .koU_B, .koU_C{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 4px;
    }
    .koU_A{ text-decoration-color: var(--uA); }
    .koU_B{ text-decoration-color: var(--uB); }
    .koU_C{ text-decoration-color: var(--uC); }

    .linkGold{
      background:rgba(213,162,42,0.20);
      box-shadow:inset 0 0 0 1px rgba(213,162,42,0.25);
      border-radius:6px;
      padding:0 3px;
      font-weight:900;
      color:#111;
    }

    .tok.pairLink{
      background:rgba(213,162,42,0.20);
      box-shadow:inset 0 0 0 1px rgba(213,162,42,0.25);
      border-radius:6px;
      padding:0 3px;
      font-weight:900;
      color:#111 !important;
    }
  `;
  document.head.appendChild(style);
}
