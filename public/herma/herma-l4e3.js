// ver1.1_26.02.22
// herma-l4e3.js (L4-E3: 숨은 말 채우기 - A 클릭 순간 하이라이트 + 같은답(2괄호) 동시채움 + no popups)
// ------------------------------------------------------------
const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 4;
const TARGET_EXERCISE = 3;

let subcategory = "Grammar";
let level = "Basic";
let day = "117";
let quizTitle = "quiz_Grammar_Basic_117";
let userId = "";

let rawRows = [];
let questions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;

let activeBlank = 0;
let filled = [];
const UI_TOP_INSTRUCTION = "\uBE48\uCE78\uC758 \uB2E8\uC5B4\uB97C A\uC5D0\uC11C \uCC3E\uC544\uBCF4\uC138\uC694!";
const UI_LABEL_SENTENCE_A = "\uBB38\uC7A5 A";
const UI_LABEL_SENTENCE_B = "\uBB38\uC7A5 B";

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

// ---------- params/nav ----------
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

function injectStyles() {
  if (document.getElementById("herma-l4e3-style")) return;
  const style = document.createElement("style");
  style.id = "herma-l4e3-style";
  style.textContent = `
    .a-tap{
      position:relative;
      display:inline-block;
      cursor:pointer;
      border-radius:6px;
      padding:0 1px;
      transition: background-color .16s ease, box-shadow .16s ease, transform .1s ease;
    }
    .a-tap:hover{
      background: rgba(255, 197, 102, 0.20);
    }
    .a-tap:active{
      transform: translateY(0.5px);
    }
    .a-tap.tap-hit,
    .a-tap.hl-word{
      background: rgba(255, 197, 102, 0.42);
      box-shadow: inset 0 -1px 0 rgba(160, 110, 0, 0.24);
    }

    .blank-slot{
      position:relative;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-width: 44px;
      padding: 0 6px;
      border-radius: 8px;
      border: 1px dashed rgba(70,140,255,0.52);
      background: rgba(70,140,255,0.08);
      color:#1f4fb8;
      font-weight:900;
      line-height:1.35;
      transition: background-color .16s ease, box-shadow .16s ease, border-color .16s ease;
    }
    .blank-slot.active{
      border-color: rgba(70,140,255,0.82);
      box-shadow: 0 0 0 2px rgba(70,140,255,0.16);
      background: rgba(70,140,255,0.12);
    }
    .blank-slot.empty{
      opacity: .84;
    }
    .blank-slot.fill-flash{
      border-color: rgba(255, 171, 64, 0.88);
      background: rgba(255, 197, 102, 0.26);
      box-shadow: 0 0 0 2px rgba(255, 197, 102, 0.20);
      color:#7e3106;
    }

    .shine-hint{
      overflow:hidden;
    }
    .shine-hint::after{
      content:"";
      position:absolute;
      top:-60%;
      left:-180%;
      width:96%;
      height:230%;
      transform: skewX(-22deg);
      background: linear-gradient(
        90deg,
        rgba(255,255,255,0) 0%,
        rgba(255,255,255,0.22) 24%,
        rgba(255,255,255,0.95) 50%,
        rgba(255,255,255,0.22) 76%,
        rgba(255,255,255,0) 100%
      );
      pointer-events:none;
      opacity:0;
      animation: hermaGlassSweep 2.35s ease-in-out infinite;
      animation-delay: var(--shine-delay, 0s);
    }
    @keyframes hermaGlassSweep{
      0%, 10%{ left:-180%; opacity:0; }
      18%{ opacity:1; }
      40%{ left:165%; opacity:1; }
      50%{ opacity:0; }
      100%{ left:165%; opacity:0; }
    }
  `;
  document.head.appendChild(style);
}

// ---------- load excel ----------
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

// ---------- build questions ----------
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

    const qParsed = parseABQuestion(questionRaw);
    const blankCount = countBlanks(qParsed.bEng);

    const hidden = parseHiddenAnswers(answerRaw, blankCount);
    const ko = parseKoreanFromAnswer(answerRaw);

    const clickTargets = computeClickTargets(qParsed.aEng, hidden);

    return {
      qNumber,
      title,
      instruction,
      aEng: qParsed.aEng,
      bEng: qParsed.bEng,
      blankCount,
      hidden,
      clickTargets,
      aKor: ko.aKor,
      bKor: ko.bKor,
      koExtra: ko.koExtra,
    };
  });
}

function parseABQuestion(s) {
  const txt = String(s || "").trim().replace(/\s+/g, " ");
  let aEng = "", bEng = "";
  const m = txt.match(/A\.\s*([\s\S]*?)\s*B\.\s*([\s\S]*)/i);
  if (!m) return { aEng: stripTrailingPeriod(txt), bEng: "" };
  aEng = stripTrailingPeriod(String(m[1] || "").trim());
  bEng = stripTrailingPeriod(String(m[2] || "").trim());
  return { aEng, bEng };
}

function countBlanks(bEng) {
  const m = String(bEng || "").match(/\(\s*\)/g);
  return m ? m.length : 0;
}

function parseHiddenAnswers(answerRaw, needCount) {
  const s = String(answerRaw || "").replace(/\s+/g, " ").trim();
  if (!needCount) return [];

  const seg = extractHiddenSegment(s);
  let out = [];

  // ( ) 안 우선
  const paren = [];
  const reParen = /\(([^)]+)\)/g;
  let m;
  while ((m = reParen.exec(seg)) !== null) {
    const v = String(m[1] || "").trim();
    if (v) paren.push(v);
  }
  if (paren.length) out = paren.slice(0, needCount);

  // (= ...) 보조
  if (out.length < needCount) {
    const eq = [];
    const eqMatch = seg.match(/=\s*([^,]+?)(?=(,|$))/g);
    if (eqMatch) {
      eqMatch.forEach((chunk) => {
        const v = String(chunk || "").replace(/^=\s*/, "").trim();
        if (v) eq.push(v);
      });
    } else {
      const m2 = seg.match(/=\s*([\s\S]+)$/);
      if (m2 && m2[1]) eq.push(String(m2[1]).trim());
    }
    if (eq.length) out = out.concat(eq).slice(0, needCount);
  }

  // 부족하면 마지막 값으로 채움(“어차피 같은 단어” 케이스)
  if (out.length && out.length < needCount) {
    while (out.length < needCount) out.push(out[out.length - 1]);
  }

  if (!out.length) out = new Array(needCount).fill("");
  return out;
}

function extractHiddenSegment(s) {
  const idx = s.indexOf("숨은 말:");
  if (idx === -1) return "";
  const rest = s.slice(idx + "숨은 말:".length).trim();

  const cutArrow = rest.indexOf("→");
  const cutB = rest.search(/\bB\.\s*/i);

  let cut = rest.length;
  if (cutArrow !== -1) cut = Math.min(cut, cutArrow);
  if (cutB !== -1) cut = Math.min(cut, cutB);

  return rest.slice(0, cut).trim();
}

function parseKoreanFromAnswer(answerRaw) {
  const s = String(answerRaw || "").trim();

  let aKor = "", bKor = "";
  const mAB = s.match(/A\.\s*([^B]+?)\s*B\.\s*([\s\S]*)/i);
  if (mAB) {
    aKor = pickHangulLine(String(mAB[1] || "").trim());
    bKor = pickHangulLine(String(mAB[2] || "").trim());
  }

  let koExtra = "";
  const arrowIdx = s.indexOf("→");
  if (arrowIdx !== -1) {
    const tail = s.slice(arrowIdx + 1).trim();
    koExtra = tail
      .split(/(?<=[.?!。])\s+|\n+/)
      .map((x) => x.trim())
      .filter((x) => /[가-힣]/.test(x))
      .join(" ");
  }

  return { aKor, bKor, koExtra };
}

function pickHangulLine(txt) {
  if (!txt) return "";
  const parts = txt
    .split(/\s+/)
    .join(" ")
    .split(/(?<=[.?!。])\s+/);
  const h = parts.find((p) => /[가-힣]/.test(p));
  return h ? stripTrailingPeriod(h.trim()) : "";
}

function computeClickTargets(aEng, hidden) {
  const A = String(aEng || "");
  const lowA = A.toLowerCase();

  // hidden이 A에 그대로 있으면 우선
  const exact = [];
  hidden.forEach((h) => {
    const hh = String(h || "").trim();
    if (!hh) return;
    if (lowA.includes(hh.toLowerCase())) exact.push(hh);
  });
  if (exact.length) return uniqKeep(exact);

  // 단어 단위 겹침
  const tok = [];
  hidden.forEach((h) => {
    const words = String(h || "").split(/\s+/).filter(Boolean);
    words.sort((a, b) => b.length - a.length);
    for (const w of words) {
      if (w.length < 3) continue;
      if (lowA.includes(w.toLowerCase())) tok.push(w);
    }
  });

  if (!tok.length && /new one/i.test(A)) tok.push("new one");
  return tok.length ? uniqKeep(tok) : ["__ALL__"];
}

function uniqKeep(arr) {
  const set = new Set();
  const out = [];
  for (const x of arr) {
    const k = x.toLowerCase();
    if (set.has(k)) continue;
    set.add(k);
    out.push(x);
  }
  return out;
}

// ---------- intro (L4E2 스타일) ----------
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const title = questions[0]?.title || "Herma L4-E3";
  const instruction =
    questions[0]?.instruction ||
    "대명사나 수량사가 가리키는 숨은 말을 괄호 안에 넣고, 문장을 자연스럽게 해석해보세요.";

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L4-E3</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">${escapeHtml(title)}</div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106; line-height:1.6;">
        📝 ${escapeHtml(instruction)}
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

// ---------- main ----------
function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) return renderFinalResult();

  isAnswered = false;
  activeBlank = 0;
  filled = new Array(q.blankCount).fill("");

  const aEngTap = renderATappable(q.aEng, q.clickTargets);
  const bEngHTML = renderBWithSlots(q.bEng, q.blankCount);

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box">
      <div style="font-weight:900; color:#7e3106; line-height:1.55;">
        ${UI_TOP_INSTRUCTION}
      </div>
    </div>

    <div class="box">
      <div style="font-weight:900; color:#7e3106; margin-bottom:6px;">${UI_LABEL_SENTENCE_A}</div>
      <div class="sentence" id="a-sent">
        <div>${aEngTap}${q.aEng ? "." : ""}</div>
      </div>

      <div style="font-weight:900; color:#7e3106; margin-top:10px; margin-bottom:6px;">${UI_LABEL_SENTENCE_B}</div>
      <div class="sentence" id="b-sent">
        <div>${bEngHTML}${q.bEng ? "." : ""}</div>
      </div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  wireSlots(q);
  wireAClickFill(q);

  setActiveBlank(0);
  refreshSlots(q);
  seedShimmerDelays();
}

function renderBWithSlots(bEng, blankCount) {
  let html = escapeHtml(String(bEng || ""));
  for (let i = 0; i < blankCount; i++) {
    html = html.replace(/\(\s*\)/, `(<span class="blank-slot empty shine-hint" data-i="${i}">____</span>)`);
  }
  return html;
}

/**
 * A문장은 처음엔 하이라이트 없음.
 * 클릭 가능한 부분만 span.a-tap으로 감싸고, 클릭 순간에만 hl-word를 잠깐 입힘.
 */
function renderATappable(aEng, targets) {
  const A = String(aEng || "");
  if (!A.trim()) return "";
  const parts = A.split(/(\s+)/);
  return parts
    .map((part) => {
      if (!part) return "";
      if (/^\s+$/.test(part)) return part;
      return `<span class="a-tap shine-hint" data-fill="1">${escapeHtml(part)}</span>`;
    })
    .join("");
}

// ---------- wiring ----------
function wireSlots(q) {
  const bSent = document.getElementById("b-sent");
  if (!bSent) return;

  bSent.querySelectorAll(".blank-slot").forEach((el) => {
    el.addEventListener("click", () => {
      if (isAnswered) return;
      const i = Number(el.dataset.i);

      // 같은 슬롯 다시 누르면 비우기
      if (activeBlank === i && filled[i]) {
        const ans = filled[i];
        // 같은답 그룹은 같이 비움 (한 번에 같이 채웠으니 같이 지움)
        for (let k = 0; k < q.blankCount; k++) {
          if (normalize(ans) && normalize(q.hidden[k]) === normalize(ans)) filled[k] = "";
        }
        refreshSlots(q);
        setActiveBlank(firstEmptyIndex());
        return;
      }

      setActiveBlank(i);
      refreshSlots(q);
    });
  });

  setActiveBlank(0);
}

function wireAClickFill(q) {
  const aSent = document.getElementById("a-sent");
  if (!aSent) return;

  aSent.querySelectorAll('[data-fill="1"]').forEach((el) => {
    el.addEventListener("click", () => {
      if (isAnswered) return;
      if (!q.blankCount) return;

      // 클릭 순간만 하이라이트
      el.classList.add("hl-word");
      window.setTimeout(() => el.classList.remove("hl-word"), 240);

      // 채울 대상 빈칸 결정
      const picked = extractPickedWord(el.textContent);
      if (!picked) return;
      const changed = [];
      for (let k = 0; k < q.blankCount; k++) {
        filled[k] = picked;
        changed.push(k);
      }

      refreshSlots(q);
      flashABHighlights(el, changed);

      const next = firstEmptyIndex();
      setActiveBlank(next >= 0 ? next : q.blankCount - 1);
      refreshSlots(q);
    });
  });
}

function seedShimmerDelays() {
  const taps = Array.from(document.querySelectorAll(".a-tap.shine-hint"));
  taps.forEach((el, i) => {
    const d = ((i % 10) * 0.12).toFixed(2);
    el.style.setProperty("--shine-delay", `${d}s`);
  });

  const blanks = Array.from(document.querySelectorAll(".blank-slot.shine-hint"));
  blanks.forEach((el, i) => {
    const d = (0.22 + ((i % 6) * 0.16)).toFixed(2);
    el.style.setProperty("--shine-delay", `${d}s`);
  });
}

function flashABHighlights(clickedEl, changedIndices) {
  if (clickedEl) {
    clickedEl.classList.add("tap-hit");
    window.setTimeout(() => clickedEl.classList.remove("tap-hit"), 460);
  }

  const idxSet = new Set((changedIndices || []).map((x) => Number(x)).filter((x) => !Number.isNaN(x)));
  if (!idxSet.size) return;

  document.querySelectorAll(".blank-slot").forEach((slotEl) => {
    const idx = Number(slotEl.dataset.i);
    if (!idxSet.has(idx)) return;
    slotEl.classList.add("fill-flash");
    window.setTimeout(() => slotEl.classList.remove("fill-flash"), 520);
  });
}

function extractPickedWord(raw) {
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  let out = s.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
  if (/^[A-Za-z]+$/.test(out) && out.length > 2 && /s$/i.test(out) && !/ss$/i.test(out)) {
    out = out.slice(0, -1);
  }
  return out;
}

function wireClear(q) {
  const btn = document.getElementById("clear-btn");
  if (!btn) return;
  btn.onclick = () => {
    if (isAnswered) return;
    filled = new Array(q.blankCount).fill("");
    setActiveBlank(0);
    refreshSlots(q);
  };
}

function firstEmptyIndex() {
  for (let i = 0; i < filled.length; i++) {
    if (!filled[i]) return i;
  }
  return -1;
}

function setActiveBlank(i) {
  if (!filled.length) { activeBlank = 0; return; }
  activeBlank = Math.max(0, Math.min(i, filled.length - 1));
}

function refreshSlots(q) {
  document.querySelectorAll(".blank-slot").forEach((el) => {
    const i = Number(el.dataset.i);
    const val = filled[i] || "";
    el.textContent = val ? val : "____";
    el.classList.toggle("empty", !val);
    el.classList.toggle("active", i === activeBlank);
  });
}

// ---------- submit/next ----------
function submitAnswer() {
  if (isAnswered) return;

  const q = questions[currentIndex];

  const userFill = filled.map((x) => x || "").join(" | ");
  const correctFill = q.hidden.map((x) => x || "").join(" | ");

  const correct =
    filled.length === q.hidden.length &&
    filled.every((v, i) => normalize(v) === normalize(q.hidden[i]));

  if (!correct) {
    const feedback = document.getElementById("feedback-area");
    if (feedback) feedback.innerHTML = "";
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
    return;
  }

  isAnswered = true;

  results.push({
    no: currentIndex + 1,
    word: `Herma L4-E3 / Q${q.qNumber}`,
    selected: userFill || "무응답",
    correct,
    question: `A:${q.aEng} / B:${q.bEng}`,
    engAnswer: correctFill,
    korAnswer: [q.aKor, q.bKor, q.koExtra].filter(Boolean).join(" / "),
  });

  // disable interactions
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;

  const clearBtn = document.getElementById("clear-btn");
  if (clearBtn) clearBtn.disabled = true;

  document.querySelectorAll(".blank-slot").forEach((el) => (el.style.pointerEvents = "none"));
  document.querySelectorAll('[data-fill="1"]').forEach((el) => (el.style.pointerEvents = "none"));

  // toast only
  const feedback = document.getElementById("feedback-area");
  if (feedback) feedback.innerHTML = "";
  if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
}

function goNext() {
  if (!isAnswered) {
    const q = questions[currentIndex];
    const userFill = filled.map((x) => x || "").join(" | ");
    const correctFill = q.hidden.map((x) => x || "").join(" | ");
    results.push({
      no: currentIndex + 1,
      word: `Herma L4-E3 / Q${q.qNumber}`,
      selected: userFill || "무응답",
      correct: false,
      question: `A:${q.aEng} / B:${q.bEng}`,
      engAnswer: correctFill,
      korAnswer: [q.aKor, q.bKor, q.koExtra].filter(Boolean).join(" / "),
    });
  }

  currentIndex++;
  if (currentIndex >= questions.length) return renderFinalResult();
  renderQuestion();
}

// ---------- final result (no popup) ----------
function renderFinalResult() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

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
    testspecific: results,
  };
  localStorage.setItem("QuizResults", JSON.stringify(resultObject));

  const rows = results
    .map(
      (r) => `
        <tr>
          <td style="padding:6px; border-bottom:1px solid #eee;">${r.no}</td>
          <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(r.word)}</td>
          <td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(trimForTable(r.selected))}</td>
          <td style="padding:6px; border-bottom:1px solid #eee;">${r.correct ? "⭕" : "❌"}</td>
        </tr>
      `
    )
    .join("");

  area.innerHTML = `
    <div class="box">
      <div style="font-weight:900; font-size:16px; margin-bottom:8px;">📄 전체 결과</div>
      <div style="margin-bottom:10px; font-size:14px;">
        점수: <b>${score}점</b> (${correctCount} / ${total})
      </div>

      <div style="max-height:300px; overflow-y:auto; margin-bottom:14px;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:#f6f6f6;">
              <th style="padding:6px; border-bottom:1px solid #ccc;">번호</th>
              <th style="padding:6px; border-bottom:1px solid #ccc;">문항</th>
              <th style="padding:6px; border-bottom:1px solid #ccc;">내 상태</th>
              <th style="padding:6px; border-bottom:1px solid #ccc;">정답</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="btn-row">
        <button class="quiz-btn" onclick="restartQuiz()">🔁 재시험</button>
        <button class="quiz-btn" onclick="history.back()">돌아가기</button>
      </div>
    </div>
  `;
}

function restartQuiz() {
  window.location.reload();
}

// ---------- helpers ----------
function applyAnswersToB(bEng, hidden) {
  let out = String(bEng || "");
  for (const h of hidden) {
    out = out.replace(/\(\s*\)/, `(${h})`);
  }
  return out;
}

function normalize(s) {
  return String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function stripTrailingPeriod(s) {
  return String(s || "")
    .trim()
    .replace(/\.+\s*$/g, "")
    .trim();
}

function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function trimForTable(s) {
  const t = String(s || "");
  return t.length > 70 ? t.slice(0, 70) + "..." : t;
}
