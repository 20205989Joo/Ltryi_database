// ver1.1_26.02.22
// herma-l6e5.js (L5-E3: 4개씩 스위치로 문장/조각 구분)
// - A/B/C/D 라벨을 '버튼 같은 박스'로 만들지 않음: 아주 얇은 텍스트 마커만 사용
const EXCEL_FILE = "LTRYI-herma-lesson-questions.xlsx";
const TARGET_LESSON = 6;
const TARGET_EXERCISE = 5;

const QUESTIONS_PER_TEST = 20;
const ITEMS_PER_QUESTION = 4;

let subcategory = "Grammar";
let level = "Basic";
let day = "105";
let quizTitle = "quiz_Grammar_Basic_105";
let userId = "";

let rawRows = [];
let bankItems = [];
let quizQuestions = [];

let currentIndex = 0;
let results = [];
let isAnswered = false;
const UI_FRAG_SWITCH_LABEL = "(\uB4A4\uC9D1\uD78C)\uC870\uAC01";

window.addEventListener("DOMContentLoaded", async () => {
  applyQueryParams();
  wireBackButton();
  injectStyles();

  try {
    rawRows = await loadExcelRows(EXCEL_FILE);
    bankItems = buildBankFromRows(rawRows);
    if (!bankItems.length) throw new Error("bank empty from excel");
  } catch (e) {
    console.warn("excel load failed → fallback to seed:", e);
    bankItems = buildBankFromSeed();
  }

  quizQuestions = buildQuizQuestions(bankItems, QUESTIONS_PER_TEST, ITEMS_PER_QUESTION);
  renderIntro();
});

/* ---------------- Params / Nav ---------------- */
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

/* ---------------- Styles ---------------- */
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --accent:#7e3106;
      --ok:#2e7d32;
      --bad:#c62828;

      --switchTrack: rgba(70,140,255,0.28);
      --switchThumb: #ffffff;
      --switchOn: rgba(241,123,42,0.55);
      --switchOn2: rgba(255,166,77,0.70);

      --itemBg: #ffffff;
      --itemBorder: rgba(0,0,0,0.12);
      --itemShadow: 0 1px 0 rgba(0,0,0,0.03) inset;
    }

    .stage-pill{
      display:inline-block;
      font-size:12px;
      padding:6px 10px;
      border-radius:999px;
      font-weight:900;
      border:1px solid rgba(0,0,0,0.12);
      background:#fff;
      margin-bottom:10px;
      color: var(--accent);
    }

    .grid4{ display:grid; grid-template-columns: 1fr; gap:10px; }

    .item-card{
      background: var(--itemBg);
      border: 1px solid var(--itemBorder);
      border-radius: 14px;
      padding: 10px 12px;
      box-shadow: var(--itemShadow);
      transition: background .14s ease, border-color .14s ease, box-shadow .14s ease;
    }
    .item-card.frag-mode{
      background: linear-gradient(180deg, rgba(246,239,230,0.98) 0%, rgba(236,226,214,0.98) 100%);
      border-color: rgba(126,49,6,0.18);
      box-shadow: 0 1px 0 rgba(255,255,255,0.70) inset, 0 8px 18px rgba(126,49,6,0.06);
    }
    .item-card.ok{
      border-color: rgba(46,125,50,0.55);
      box-shadow: 0 0 0 2px rgba(46,125,50,0.08);
    }
    .item-card.bad{
      border-color: rgba(198,40,40,0.60);
      box-shadow: 0 0 0 2px rgba(198,40,40,0.06);
    }

    /* ✅ 라벨을 박스로 만들지 않고, 얇은 텍스트 마커로만 */
    .marker{
      display:inline-block;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: .08em;
      color: rgba(126,49,6,0.55);
      margin-right: 8px;
      transform: translateY(1px);
      user-select:none;
    }

    .item-text{
      font-weight: 900; line-height: 1.6; font-size: 14px;
      color: rgba(0,0,0,0.80); word-break: keep-all;
    }

    .switch-row{
      margin-top: 10px;
      display:flex; align-items:center; justify-content:flex-end;
      gap: 10px;
    }
    .sw-label{
      font-size: 12px; font-weight: 900;
      color: rgba(0,0,0,0.55); user-select:none;
      opacity: .55;
      transition: opacity .12s ease;
    }
    .sw-frag{ color:#2f6fdc; }
    .sw-sent{ color:#d57919; }
    .sw-label.on{ opacity: 1; }

    .toggle{ position: relative; width: 38px; height: 20px; flex: 0 0 auto; }
    .toggle input{ opacity: 0; width: 0; height: 0; }
    .track{
      position:absolute; inset:0; border-radius: 999px;
      background: var(--switchTrack); transition: background .14s ease;
    }
    .thumb{
      position:absolute; width: 14px; height: 14px;
      left: 3px; top: 3px; border-radius: 50%;
      background: var(--switchThumb);
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      transition: transform .14s ease;
    }
    .toggle input:checked + .track{
      background: linear-gradient(90deg, var(--switchOn) 0%, var(--switchOn2) 100%);
    }
    .toggle input:checked + .track .thumb{ transform: translateX(18px); }

    .okText{ font-weight:900; font-size:18px; color: var(--ok); text-align:center; }
    .noText{ font-weight:900; font-size:18px; color: var(--bad); text-align:center; }
    .hintLine{
      margin-top:8px; padding:10px 12px; border-radius:12px;
      border:1px solid rgba(0,0,0,0.10); background:#fff;
      font-weight:900; color: rgba(0,0,0,0.75);
      line-height:1.5; font-size: 13px;
    }
    .question-mode-pill{ display:none !important; }
    .question-guide{ display:none !important; }
  `;
  document.head.appendChild(style);
}

/* ---------------- Excel ---------------- */
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

function buildBankFromRows(rows) {
  const filtered = (rows || [])
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  const bank = [];
  filtered.forEach((r, idx) => {
    const qNumber = Number(r["QNumber"]) || idx + 1;
    const questionRaw = String(r["Question"] ?? "").trim();
    const answerRaw = String(r["Answer"] ?? "").trim();

    const { A, B } = splitABStem(questionRaw);
    const map = parseABLabelLoose(answerRaw);

    const aType = map.aType || "문장";
    const bType = map.bType || "조각";

    const aKind = aType === "문장" ? "sentence" : "fragment";
    const bKind = bType === "문장" ? "sentence" : "fragment";

    const aItem = {
      id: `q${qNumber}_A`,
      text: normalizeItemText(A, aKind),
      type: aKind,
    };
    const bItem = {
      id: `q${qNumber}_B`,
      text: normalizeItemText(B, bKind),
      type: bKind,
    };

    if (aItem.text) bank.push(aItem);
    if (bItem.text) bank.push(bItem);
  });
  return bank;
}

function splitABStem(stem) {
  const s = String(stem || "").trim();
  const m = s.match(/A\.[\s]*([\s\S]*?)\s*B\.[\s]*([\s\S]*)$/i);
  if (m) return { A: m[1].trim(), B: m[2].trim() };
  const mA = s.match(/^A\.[\s]*([\s\S]*)$/i);
  if (mA) return { A: mA[1].trim(), B: "" };
  return { A: "", B: s };
}

function parseABLabelLoose(answerRaw) {
  const s = String(answerRaw || "");
  const aType = detectTypeFromSegment(extractSegment(s, "A", "B"));
  const bType = detectTypeFromSegment(extractSegment(s, "B", null));
  return { aType, bType };
}
function extractSegment(full, startLabel, endLabelOrNull) {
  const startRe = new RegExp(startLabel + "\\s*:\\s*", "i");
  const startIdx = full.search(startRe);
  if (startIdx < 0) return "";
  let sub = full.slice(startIdx).replace(startRe, "");
  if (endLabelOrNull) {
    const endRe = new RegExp("\\b" + endLabelOrNull + "\\s*:\\s*", "i");
    const endIdx = sub.search(endRe);
    if (endIdx >= 0) sub = sub.slice(0, endIdx);
  }
  return sub.trim();
}
function detectTypeFromSegment(seg) {
  const t = String(seg || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (/완전한\s*문장/.test(t)) return "문장";
  if (/문장/.test(t)) return "문장";
  if (/명사를\s*꾸며주는\s*조각/.test(t)) return "조각";
  if (/조각/.test(t)) return "조각";
  return "";
}

function buildBankFromSeed() {
  const seed = __SEED_PAIRS__;
  const bank = [];
  seed.forEach((row) => {
    const qNumber = row[0];
    const A = row[1];
    const B = row[2];
    const ans = row[3];
    const map = parseABLabelLoose(ans);
    const aType = map.aType || "문장";
    const bType = map.bType || "조각";

    const aKind = aType === "문장" ? "sentence" : "fragment";
    const bKind = bType === "문장" ? "sentence" : "fragment";

    bank.push({
      id: `seed${qNumber}_A`,
      text: normalizeItemText(A, aKind),
      type: aKind,
    });
    bank.push({
      id: `seed${qNumber}_B`,
      text: normalizeItemText(B, bKind),
      type: bKind,
    });
  });
  return bank;
}

function normalizeItemText(text, kind) {
  let s = String(text || "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  if (kind === "fragment") s = normalizeInvertedFragment(s);
  return stripTerminalPunctKeepComma(s);
}

function normalizeInvertedFragment(s) {
  // Example: "On the desk, the book." -> "The book on the desk."
  const m = String(s || "").match(/^(.+?),\s*((?:the|a|an)\s+[A-Za-z][A-Za-z' -]*)([.?!])?$/i);
  if (!m) return s;
  const frontRaw = String(m[1] || "").trim();
  const np = String(m[2] || "").trim();
  const punct = String(m[3] || "").trim();
  if (!frontRaw || !np) return s;
  const front = frontRaw.charAt(0).toLowerCase() + frontRaw.slice(1);
  const npFixed = np.charAt(0).toUpperCase() + np.slice(1);
  return `${npFixed} ${front}${punct}`.replace(/\s+/g, " ").trim();
}

/* ---------------- Build Quiz ---------------- */
function buildQuizQuestions(items, qCount, perQ) {
  const pool = shuffleArray((items || []).filter(x => x && x.text));
  const questions = [];
  let cursor = 0;

  for (let i=0; i<qCount; i++) {
    const picked = [];
    const used = new Set();

    while (picked.length < perQ) {
      if (cursor >= pool.length) {
        cursor = 0;
        pool.splice(0, pool.length, ...shuffleArray(items.slice()));
      }
      const cand = pool[cursor++];
      if (!cand || !cand.text) continue;
      if (used.has(cand.id)) continue;
      used.add(cand.id);
      picked.push(cand);
    }

    questions.push({ no: i+1, items: picked });
  }

  return questions;
}

/* ---------------- Intro ---------------- */
function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">📘 Herma L6-E5</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-weight:900; margin-bottom:6px; color:#444;">문장 vs 조각 구분하기 (4개씩)</div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106; line-height:1.6;">
        📝 위에 4개를 보고, 아래 스위치로 <b>문장/조각</b>을 골라요.<br/>
        <b>ON=문장</b> / <b>OFF=조각</b>
      </div>

      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">🚀 시작</button>
    </div>
  `;
}

function startQuiz() {
  if (!quizQuestions.length) {
    alert("문제가 없습니다.");
    return;
  }
  currentIndex = 0;
  results = [];
  renderQuestion();
}

/* ---------------- Render Question ---------------- */
function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const q = quizQuestions[currentIndex];
  if (!q) return showResultPopup();

  isAnswered = false;

  area.innerHTML = `
    <div class="q-label">Q. ${q.no} / ${quizQuestions.length}</div>

    <div class="box">
      <div class="stage-pill question-mode-pill">스위치로 구분</div>
      <div class="grid4" id="items-area"></div>

      <div class="hintLine question-guide">
        • 스위치 <b>ON=문장</b> / <b>OFF=조각</b><br/>
        • 네 개 모두 맞으면 정답 처리
      </div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">제출</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">다음</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  const itemsArea = document.getElementById("items-area");
  const labels = ["A","B","C","D"];

  itemsArea.innerHTML = "";
  q.items.forEach((it, idx) => {
    const tag = labels[idx] || String(idx+1);
    const card = document.createElement("div");
    card.className = "item-card";

    card.innerHTML = `
      <div style="display:flex; align-items:flex-start;">
        <span class="marker">${tag}</span>
        <div class="item-text">${escapeHtml(it.text)}</div>
      </div>

      <div class="switch-row">
        <span class="sw-label sw-frag">조각</span>

        <label class="toggle" title="ON=문장 / OFF=조각">
          <input type="checkbox" class="sw" data-idx="${idx}" checked />
          <span class="track"><span class="thumb"></span></span>
        </label>

        <span class="sw-label sw-sent">문장</span>
      </div>
    `;
    itemsArea.appendChild(card);
  });

  itemsArea.querySelectorAll(".toggle input.sw").forEach((cb) => {
    const row = cb.closest(".switch-row");
    const card = cb.closest(".item-card");
    if (row) {
      const fragLabel = row.querySelector(".sw-frag");
      if (fragLabel) fragLabel.textContent = UI_FRAG_SWITCH_LABEL;
    }
    cb.addEventListener("change", () => {
      const row = cb.closest(".switch-row");
      if (!row) return;
      const frag = row.querySelector(".sw-frag");
      const sent = row.querySelector(".sw-sent");
      if (cb.checked) {
        if (sent) sent.classList.add("on");
        if (frag) frag.classList.remove("on");
        if (card) card.classList.remove("frag-mode");
      } else {
        if (frag) frag.classList.add("on");
        if (sent) sent.classList.remove("on");
        if (card) card.classList.add("frag-mode");
      }
    });
    cb.dispatchEvent(new Event("change"));
  });
}

function submitAnswer() {
  if (isAnswered) return;

  const q = quizQuestions[currentIndex];
  const itemsArea = document.getElementById("items-area");
  const submitBtn = document.getElementById("submit-btn");

  let allCorrect = true;
  const picks = [];

  const cards = Array.from(itemsArea.querySelectorAll(".item-card"));
  cards.forEach((card, idx) => {
    card.classList.remove("ok", "bad");
    const it = q.items[idx];
    const cb = card.querySelector("input.sw");
    const pickedIsSentence = !!(cb && cb.checked);
    const pickedType = pickedIsSentence ? "문장" : "조각";
    const correctType = (it.type === "sentence") ? "문장" : "조각";
    const ambiguous = isAmbiguousTypeText(it.text);
    const correct = ambiguous || (pickedType === correctType);
    if (!correct) allCorrect = false;

    picks.push({
      label: ["A","B","C","D"][idx] || String(idx+1),
      picked: pickedType,
      answer: correctType,
      correct,
    });
  });

  const selectedSummary = picks.map(p => `${p.label}:${p.picked}`).join(" | ");
  const answerSummary = picks.map(p => `${p.label}:${p.answer}`).join(" | ");

  const feedback = document.getElementById("feedback-area");
  if (allCorrect) {
    isAnswered = true;
    if (submitBtn) submitBtn.disabled = true;
    cards.forEach((card) => {
      const cb = card.querySelector("input.sw");
      if (cb) cb.disabled = true;
    });
    results.push({
      no: q.no,
      word: `Herma L6-E5 / Set ${q.no}`,
      selected: selectedSummary,
      correct: true,
      question: q.items.map((it, i)=>`${["A","B","C","D"][i]}. ${it.text}`).join(" || "),
      answer: answerSummary,
    });
    feedback.innerHTML = "";
    if (window.HermaToastFX) window.HermaToastFX.show("ok", "정답!");
  } else {
    isAnswered = false;
    if (submitBtn) submitBtn.disabled = false;
    cards.forEach((card) => {
      const cb = card.querySelector("input.sw");
      if (cb) cb.disabled = false;
    });
    feedback.innerHTML = "";
    if (window.HermaToastFX) window.HermaToastFX.show("no", "오답…");
  }
}

function goNext() {
  if (!isAnswered) {
    submitAnswer();
    if (!isAnswered) {
      const q = quizQuestions[currentIndex];
      const picks = collectCurrentPicks(q);
      const selectedSummary = picks.map(p => `${p.label}:${p.picked}`).join(" | ");
      const answerSummary = picks.map(p => `${p.label}:${p.answer}`).join(" | ");
      results.push({
        no: q.no,
        word: `Herma L6-E5 / Set ${q.no}`,
        selected: selectedSummary,
        correct: false,
        question: q.items.map((it, i)=>`${["A","B","C","D"][i]}. ${it.text}`).join(" || "),
        answer: answerSummary,
      });
    }
  }
  currentIndex++;
  if (currentIndex >= quizQuestions.length) return showResultPopup();
  renderQuestion();
}

function collectCurrentPicks(q) {
  const itemsArea = document.getElementById("items-area");
  const cards = itemsArea ? Array.from(itemsArea.querySelectorAll(".item-card")) : [];
  return cards.map((card, idx) => {
    const it = q.items[idx];
    const cb = card.querySelector("input.sw");
    const pickedType = (cb && cb.checked) ? "문장" : "조각";
    const correctType = (it && it.type === "sentence") ? "문장" : "조각";
    const ambiguous = isAmbiguousTypeText(it ? it.text : "");
    return {
      label: ["A","B","C","D"][idx] || String(idx + 1),
      picked: pickedType,
      answer: correctType,
      correct: ambiguous || (pickedType === correctType),
    };
  });
}

/* ---------------- Result Popup ---------------- */
function showResultPopup() {
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

  const popup = document.getElementById("result-popup");
  const content = document.getElementById("result-content");
  if (!popup || !content) return alert(`완료! 점수: ${score}점 (${correctCount}/${total})`);

  const rows = results.map((r) => `
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
            <th style="padding:6px; border-bottom:1px solid #ccc;">세트</th>
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
function restartQuiz() { window.location.reload(); }
function closePopup() {
  const popup = document.getElementById("result-popup");
  if (popup) popup.style.display = "none";
}

/* ---------------- Utils ---------------- */
function stripTrailingPunct(s) {
  return String(s || "").trim().replace(/[\s\.。!?]+$/g, "").trim();
}
function stripAllPunct(s) {
  return String(s || "")
    .replace(/[.,!?;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function stripTerminalPunctKeepComma(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/[.?!;:]+$/g, "")
    .trim();
}
function normalizeTypeText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[.?!,;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function isAmbiguousTypeText(text) {
  const t = normalizeTypeText(text);
  if (!t) return false;
  if (/^(when|if|because|after|before|while|since|as|whenever|that)\b/.test(t)) return true;
  if (/^(only then|not until)\b/.test(t)) return true;
  if (/^to be\b/.test(t)) return true;
  return false;
}
function shuffleArray(arr) {
  const a = (arr || []).slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

const __SEED_PAIRS__ = [[1, "The door, once closed, stayed shut.", "Once closed, the door.", "A: 문장 / B: 조각"], [2, "Delivered on time, the package.", "Delivered on time, the package arrived safely.", "A: 조각 / B: 문장"], [3, "The files you requested are attached.", "The files you requested.", "A: 문장 / B: 조각"], [4, "A dog barking loudly.", "A dog was barking loudly.", "A: 조각 / B: 문장"], [5, "Was the package delivered on time?", "Delivered on time?", "A: 문장 / B: 조각"], [6, "Because she was tired.", "Because she was tired, she left early.", "A: 조각 / B: 문장"], [7, "The student who studies the hardest will succeed.", "The student who studies the hardest.", "A: 문장 / B: 조각"], [8, "To be honest.", "To be honest, I forgot.", "A: 조각 / B: 문장"], [9, "Having finished the test, he relaxed.", "Having finished the test.", "A: 문장 / B: 조각"], [10, "Hidden behind the curtain, a note was found.", "Hidden behind the curtain, the note.", "A: 문장 / B: 조각"], [11, "The report written in April was revised.", "The report written in April.", "A: 문장 / B: 조각"], [12, "If necessary.", "If necessary, call me.", "A: 조각 / B: 문장"], [13, "What she said made sense.", "What she said in the meeting.", "A: 문장 / B: 조각"], [14, "Only then.", "Only then did I understand.", "A: 조각 / B: 문장"], [15, "The plan approved by the board begins tomorrow.", "The plan approved by the board.", "A: 문장 / B: 조각"], [16, "The movie shown last night was popular.", "The movie shown last night.", "A: 문장 / B: 조각"], [17, "Not knowing the answer.", "Not knowing the answer, he guessed.", "A: 조각 / B: 문장"], [18, "There is a reason to worry.", "A reason to worry.", "A: 문장 / B: 조각"], [19, "The more you practice, the easier it becomes.", "The more you practice, the easier.", "A: 문장 / B: 조각"], [20, "The keys left on the table.", "The keys left on the table were mine.", "A: 조각 / B: 문장"], [21, "The man seated by the window waved.", "The man seated by the window.", "A: 문장 / B: 조각"], [22, "When the lights went out.", "When the lights went out, everyone screamed.", "A: 조각 / B: 문장"], [23, "Running late, she skipped breakfast.", "Running late, she.", "A: 문장 / B: 조각"], [24, "She admitted that she was wrong.", "That she was wrong.", "A: 문장 / B: 조각"], [25, "The book on the desk is mine.", "On the desk, the book.", "A: 문장 / B: 조각"], [26, "Here comes the train.", "Here, the train.", "A: 문장 / B: 조각"], [27, "The road closed for repairs reopened today.", "The road closed for repairs.", "A: 문장 / B: 조각"], [28, "After the meeting.", "I will call you after the meeting.", "A: 조각 / B: 문장"], [29, "Please keep the receipt.", "The receipt, please.", "A: 문장 / B: 조각"], [30, "She was the first to arrive.", "The first to arrive.", "A: 문장 / B: 조각"], [31, "Surprised by the news, he laughed.", "Surprised by the news, he.", "A: 문장 / B: 조각"], [32, "Hanging above the sofa, the picture.", "The picture hanging above the sofa fell.", "A: 조각 / B: 문장"], [33, "You can leave whenever you want.", "Whenever you want.", "A: 문장 / B: 조각"], [34, "That we attended.", "The concert that we attended was amazing.", "A: 조각 / B: 문장"], [35, "It was too late to apologize.", "Too late to apologize.", "A: 문장 / B: 조각"], [36, "I heard someone knocking.", "Someone knocking at the door.", "A: 문장 / B: 조각"], [37, "Eaten by noon, the cake.", "The cake was eaten by noon.", "A: 조각 / B: 문장"], [38, "There are students waiting outside.", "Students waiting outside.", "A: 문장 / B: 조각"], [39, "Not until then did he admit it.", "Not until then.", "A: 문장 / B: 조각"], [40, "Exhausted, the team.", "Exhausted, the team returned home.", "A: 조각 / B: 문장"], [41, "The answer to the question was obvious.", "The answer to the question.", "A: 문장 / B: 조각"], [42, "If you have time.", "If you have time, join us.", "A: 조각 / B: 문장"], [43, "Because of the rain, the game was canceled.", "Because of the rain.", "A: 문장 / B: 조각"], [44, "Signed yesterday, the documents.", "The documents signed yesterday are valid.", "A: 조각 / B: 문장"], [45, "She watched the stars, bright and steady.", "Bright and steady.", "A: 문장 / B: 조각"], [46, "The noise that woke me was loud.", "That woke me.", "A: 문장 / B: 조각"], [47, "To be adopted, the child.", "The child to be adopted smiled.", "A: 조각 / B: 문장"], [48, "The window open.", "I left the window open.", "A: 조각 / B: 문장"], [49, "The results, unexpected, shocked everyone.", "Unexpected, the results.", "A: 문장 / B: 조각"], [50, "Ready to leave.", "I am ready to leave.", "A: 조각 / B: 문장"]];
