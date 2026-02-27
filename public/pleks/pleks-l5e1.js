const EXCEL_FILE = "LTRYI-pleks-l5e1-herma14.xlsx";
const TARGET_LESSON = 5;
const TARGET_EXERCISE = 1;
const MAX_QUESTIONS = 0;

let subcategory = "Grammar";
let level = "Basic";
let day = "314";
let quizTitle = "quiz_Grammar_Basic_314";
let userId = "";

let questions = [];
let currentIndex = 0;
let results = [];

let stage = "intro"; // intro | detect | translate
let stage1Solved = false;
let selectedIdxSet = new Set();

let wbBank = [];
let wbPicked = [];
let wbLocked = false;
let correctKo = "";

window.addEventListener("DOMContentLoaded", async () => {
  applyQueryParams();
  wireBackButton();
  injectStyles();

  if (window.PleksToastFX?.init) {
    window.PleksToastFX.init({ hostId: "cafe_int", top: 10 });
  }

  try {
    const rows = await loadExcelRows(EXCEL_FILE);
    buildQuestionsFromRows(rows);
  } catch (e) {
    console.error(e);
    alert(`파일을 불러오지 못했습니다.\n${EXCEL_FILE}`);
    return;
  }

  if (!questions.length) {
    renderEmpty("No L5-E1 rows found.");
    return;
  }

  renderIntro();
});

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

function toastOk(msg) {
  if (window.PleksToastFX?.show) {
    window.PleksToastFX.show("ok", String(msg || ""));
  }
}

function toastNo(msg) {
  if (window.PleksToastFX?.show) {
    window.PleksToastFX.show("no", String(msg || ""));
  }
}

async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

function compactWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function splitTokens(text) {
  return compactWhitespace(text).split(/\s+/).filter(Boolean);
}

function parsePipe(raw, delim = "||") {
  return String(raw ?? "")
    .split(delim)
    .map((x) => compactWhitespace(x))
    .filter(Boolean);
}

function parseAnswerFallback(answerRaw) {
  const answer = compactWhitespace(answerRaw);
  const pm = answer.match(/Parallel\s*:\s*(.*?)(?:\.\s*Common\s*theme\s*:|Common\s*theme\s*:|$)/i);
  const tm = answer.match(/Common\s*theme\s*:\s*(.*)$/i);

  const pRaw = compactWhitespace(pm ? pm[1] : "").replace(/\([^)]*\)/g, "").replace(/\s+and\s+/gi, ", ");
  const phrases = pRaw
    .split(",")
    .map((x) => compactWhitespace(x.replace(/[.]+$/g, "")))
    .filter(Boolean);
  const themeKo = compactWhitespace(tm ? tm[1] : "");
  return { phrases, themeKo };
}

function parseRangePart(part) {
  const p = compactWhitespace(part);
  if (!p) return [];
  const m = p.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
  if (!m) return [];
  const a = Number(m[1]);
  const b = Number(m[2] || m[1]);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return [];
  const s = Math.min(a, b);
  const e = Math.max(a, b);
  const out = [];
  for (let n = s; n <= e; n += 1) out.push(n - 1);
  return out;
}

function parseParallelGroups(raw) {
  const groups = parsePipe(raw, "||");
  return groups
    .map((g) => {
      const out = [];
      g.split(",")
        .map((x) => compactWhitespace(x))
        .filter(Boolean)
        .forEach((chunk) => {
          parseRangePart(chunk).forEach((idx) => out.push(idx));
        });
      return Array.from(new Set(out)).sort((a, b) => a - b);
    })
    .filter((g) => g.length);
}

function findContiguous(sentenceTokens, phraseTokens, startAt = 0) {
  const s = sentenceTokens.map((t) => normalizeWord(t));
  const p = phraseTokens.map((t) => normalizeWord(t)).filter(Boolean);
  if (!s.length || !p.length || p.length > s.length) return [];
  for (let i = Math.max(0, startAt); i <= s.length - p.length; i += 1) {
    let ok = true;
    for (let j = 0; j < p.length; j += 1) {
      if (s[i + j] !== p[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return Array.from({ length: p.length }, (_, k) => i + k);
  }
  return [];
}

function findSubsequence(sentenceTokens, phraseTokens, startAt = 0) {
  const s = sentenceTokens.map((t) => normalizeWord(t));
  const p = phraseTokens.map((t) => normalizeWord(t)).filter(Boolean);
  if (!s.length || !p.length || p.length > s.length) return [];
  const out = [];
  let cursor = Math.max(0, startAt);
  for (let i = 0; i < p.length; i += 1) {
    const target = p[i];
    let hit = -1;
    for (let j = cursor; j < s.length; j += 1) {
      if (s[j] === target) {
        hit = j;
        break;
      }
    }
    if (hit < 0) return [];
    out.push(hit);
    cursor = hit + 1;
  }
  return out;
}

function deriveParallelGroups(sentenceTokens, phrases) {
  const groups = [];
  let cursor = 0;
  (phrases || []).forEach((phrase) => {
    const p = splitTokens(phrase);
    if (!p.length) return;
    let m = findContiguous(sentenceTokens, p, cursor);
    if (!m.length) m = findContiguous(sentenceTokens, p, 0);
    if (!m.length) m = findSubsequence(sentenceTokens, p, cursor);
    if (!m.length) m = findSubsequence(sentenceTokens, p, 0);
    if (!m.length) return;
    groups.push(m);
    cursor = m[m.length - 1] + 1;
  });
  return groups;
}

function parseLaststageFinalSentence(raw) {
  const s = compactWhitespace(raw);
  if (!s) return [];
  const parts = s.split("|").map((x) => compactWhitespace(x)).filter(Boolean);
  if (!parts.length) return [];
  let tagged = false;
  const out = [];
  parts.forEach((part) => {
    const m = part.match(/^(plain|link|a|b|c|ab|pair)\s*::\s*(.+)$/i);
    if (m) {
      tagged = true;
      out.push({ seg: String(m[1] || "").toLowerCase(), text: compactWhitespace(m[2] || "") });
    } else {
      out.push({ seg: "plain", text: part });
    }
  });
  return tagged ? out.filter((x) => x.text) : [];
}

function parseLaststageKRTokens(raw) {
  const s = compactWhitespace(raw);
  if (!s) return [];
  const parts = s.split("|").map((x) => compactWhitespace(x)).filter(Boolean);
  if (!parts.length) return [];
  let tagged = false;
  const out = [];
  parts.forEach((part) => {
    const m = part.match(/^(plain|a|b|c|ab|pair)\s*::\s*(.+)$/i);
    if (m) {
      tagged = true;
      out.push({ seg: String(m[1] || "").toLowerCase(), text: compactWhitespace(m[2] || "") });
    } else {
      out.push({ seg: "plain", text: part });
    }
  });
  return tagged ? out.filter((x) => x.text) : [];
}

function mapSegClass(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "tok uA";
  if (s === "b") return "tok uB";
  if (s === "c") return "tok uC";
  if (s === "link") return "tok linkGold";
  return "";
}

function renderConfiguredFinalSentence(parts) {
  return parts
    .map((part) => {
      const text = compactWhitespace(part?.text || "");
      if (!text) return "";
      const cls = mapSegClass(part?.seg || "");
      if (cls) return `<span class="${cls}">${escapeHtml(text)}</span>`;
      return escapeHtml(text);
    })
    .join(" ");
}

function mapKorRole(seg) {
  const s = String(seg || "").toLowerCase();
  if (s === "a" || s === "ab" || s === "pair") return "a";
  if (s === "b") return "b";
  if (s === "c") return "c";
  return null;
}

function applyKoRoleClass(el, role) {
  if (!el) return;
  el.classList.remove("koU_A", "koU_B", "koU_C");
  if (role === "a") el.classList.add("koU_A");
  if (role === "b") el.classList.add("koU_B");
  if (role === "c") el.classList.add("koU_C");
}

function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function normalizeKoreanForCompare(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+([.,!?])/g, "$1");
}

function buildQuestionsFromRows(rows) {
  const filtered = (rows || [])
    .filter((r) => Number(r?.Lesson) === TARGET_LESSON && Number(r?.Exercise) === TARGET_EXERCISE)
    .sort((a, b) => Number(a?.QNumber) - Number(b?.QNumber));
  const selected = MAX_QUESTIONS > 0 ? filtered.slice(0, MAX_QUESTIONS) : filtered;

  questions = selected
    .map((row, i) => {
      const qNumber = Number(row["QNumber"]) || i + 1;
      const title = compactWhitespace(row["Title"] || "");
      const instruction = compactWhitespace(row["Instruction"] || "");
      const questionRaw = compactWhitespace(row["Question"] || "");
      const answerRaw = compactWhitespace(row["Answer"] || "");

      if (!questionRaw) return null;
      const sentenceTokens = splitTokens(questionRaw);
      if (!sentenceTokens.length) return null;

      const parallelPhrases = parsePipe(row["Step1-ParallelPhrases"] || "", "||");
      if (!parallelPhrases.length) return null;

      const parallelGroups = parseParallelGroups(row["Step1-ParallelIndices"] || "");
      if (!parallelGroups.length) return null;

      const expectedIdxSet = new Set();
      parallelGroups.forEach((g) => g.forEach((idx) => expectedIdxSet.add(String(idx))));
      if (!expectedIdxSet.size) return null;

      const laststageFinalSentence = compactWhitespace(row["Laststage-FinalSentence"] || "");
      const laststageKRTokens = compactWhitespace(row["Laststage-KRTokens"] || "");
      const configured = parseLaststageKRTokens(laststageKRTokens);
      if (!configured.length) return null;

      const finalTokens = configured.map((x) => ({ text: x.text, role: mapKorRole(x.seg) }));
      if (!finalTokens.length) return null;
      const themeKo = finalTokens.map((x) => x.text).join(" ").trim();

      return {
        qNumber,
        title: title || "Parallel Listing - Common Theme",
        instruction,
        questionRaw,
        answerRaw,
        sentenceTokens,
        parallelPhrases,
        parallelGroups,
        expectedIdxSet,
        laststageFinalSentence,
        laststageKRTokens,
        themeKo,
        finalTokens,
      };
    })
    .filter(Boolean);
}

function renderEmpty(text) {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  area.innerHTML = `<div class="box">${escapeHtml(text)}</div>`;
}

function renderIntro() {
  stage = "intro";
  const area = document.getElementById("quiz-area");
  if (!area) return;
  const instruction = compactWhitespace(questions[0]?.instruction || "") || "병렬 표현을 터치해보세요!";
  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L5-E1</div>
      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>
      <div style="font-size:13px; line-height:1.55; color:#333;">
        ${escapeHtml(instruction)}
      </div>
      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">시작</button>
    </div>
  `;
}

function startQuiz() {
  if (!questions.length) {
    alert("해당 Lesson/Exercise 문제가 없습니다.");
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

  stage = "detect";
  stage1Solved = false;
  selectedIdxSet = new Set();
  wbBank = [];
  wbPicked = [];
  wbLocked = false;
  correctKo = "";

  area.innerHTML = `
    <div class="q-label">Q. ${currentIndex + 1} / ${questions.length}</div>

    <div class="box" id="step-inst-box" style="margin-bottom:10px;">
      <div id="inst" style="font-weight:900; color:#7e3106; margin-bottom:6px;">
        병렬 표현을 터치해보세요!
      </div>
    </div>

    <div class="box" id="step-box" style="margin-bottom:10px;">
      <div class="sentence" id="sentence-area"></div>
      <div id="hint-line" style="display:none;"></div>
    </div>

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
      <button class="quiz-btn" id="submit-btn" onclick="submitAnswer()">\uC81C\uCD9C</button>
      <button class="quiz-btn" id="next-btn" onclick="goNext()">\uB2E4\uC74C</button>
    </div>

    <div id="feedback-area" style="margin-top:12px;"></div>
  `;

  renderSentenceForStage1();
  wireSentenceTap();
}

function renderSentenceForStage1() {
  const q = questions[currentIndex];
  const area = document.getElementById("sentence-area");
  if (!q || !area) return;

  area.innerHTML = q.sentenceTokens
    .map((tok, idx) => {
      const key = String(idx);
      const cls = ["tok"];
      if (selectedIdxSet.has(key)) cls.push("pick");
      if (stage !== "detect" && q.expectedIdxSet.has(key)) cls.push("hit");
      return `<span class="${cls.join(" ")}" data-idx="${idx}">${escapeHtml(tok)}</span>`;
    })
    .join(" ");
}

function wireSentenceTap() {
  const sentence = document.getElementById("sentence-area");
  if (!sentence) return;
  sentence.addEventListener("click", (ev) => {
    if (stage !== "detect") return;
    const tok = ev.target?.closest?.(".tok[data-idx]");
    if (!tok) return;
    const idx = tok.getAttribute("data-idx");
    if (!idx) return;
    if (selectedIdxSet.has(idx)) selectedIdxSet.delete(idx);
    else selectedIdxSet.add(idx);
    renderSentenceForStage1();
    tryStage1Complete();
  });
}

function isSameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

function tryStage1Complete() {
  const q = questions[currentIndex];
  if (!q || stage !== "detect") return;
  if (!isSameSet(selectedIdxSet, q.expectedIdxSet)) return;
  stage1Solved = true;
  stage = "translate";
  renderSentenceForStage1();
  toastOk("Step 1 clear");
  setTimeout(() => {
    enterTranslateStage();
  }, 260);
}

function buildFallbackFinalSentence(q) {
  const groupMap = new Map();
  (q.parallelGroups || []).forEach((g, gi) => {
    const seg = gi === 0 ? "a" : gi === 1 ? "b" : "c";
    g.forEach((idx) => groupMap.set(Number(idx), seg));
  });

  const out = [];
  let curSeg = null;
  let curText = [];

  const flush = () => {
    if (!curText.length) return;
    out.push({ seg: curSeg || "plain", text: curText.join(" ") });
    curText = [];
  };

  q.sentenceTokens.forEach((tok, idx) => {
    const n = normalizeWord(tok);
    let seg = groupMap.get(idx) || "plain";
    if (n === "and") seg = "link";
    if (seg !== curSeg) {
      flush();
      curSeg = seg;
    }
    curText.push(tok);
  });
  flush();

  return renderConfiguredFinalSentence(out);
}

function clearStage1ResidueForFinal() {
  const instBox = document.getElementById("step-inst-box");
  if (instBox) instBox.style.display = "none";

  const stepBox = document.getElementById("step-box");
  if (stepBox) stepBox.style.display = "none";

  const sentence = document.getElementById("sentence-area");
  if (sentence) {
    sentence.classList.add("readonly");
    sentence.querySelectorAll(".tok").forEach((el) => {
      el.classList.remove("pick", "hit");
    });
  }

  const hint = document.getElementById("hint-line");
  if (hint) hint.style.display = "none";
}

function enterTranslateStage() {
  const q = questions[currentIndex];
  if (!q) return;

  clearStage1ResidueForFinal();

  const tb = document.getElementById("translate-block");
  if (tb) tb.style.display = "block";

  const reducedEl = document.getElementById("reduced-sentence");
  if (reducedEl) {
    const configured = parseLaststageFinalSentence(q.laststageFinalSentence);
    if (configured.length) reducedEl.innerHTML = renderConfiguredFinalSentence(configured);
    else reducedEl.innerHTML = buildFallbackFinalSentence(q);
  }

  const configuredKorTokens = parseLaststageKRTokens(q.laststageKRTokens);
  if (configuredKorTokens.length) {
    wbBank = configuredKorTokens.map((t, i) => ({
      id: `k${i}_${Math.random().toString(16).slice(2, 6)}`,
      text: t.text,
      role: mapKorRole(t.seg),
    }));
    correctKo = configuredKorTokens.map((t) => t.text).join(" ").trim();
  } else {
    wbBank = (q.finalTokens || []).map((t, i) => ({
      id: `k${i}_${Math.random().toString(16).slice(2, 6)}`,
      text: t.text,
      role: t.role || null,
    }));
    correctKo = q.themeKo;
  }
  wbBank = shuffleArray(wbBank);
  wbPicked = [];
  wbLocked = false;

  const actionRow = document.getElementById("stage-action-row");
  if (actionRow) actionRow.style.display = "flex";
  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = false;
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = true;

  renderTranslateUI();
}

function renderTranslateUI() {
  const answerLine = document.getElementById("answer-line");
  const bankArea = document.getElementById("bank-area");
  const remainInfo = document.getElementById("remain-info");
  if (!answerLine || !bankArea || !remainInfo) return;

  answerLine.innerHTML = "";
  if (!wbPicked.length) {
    const hint = document.createElement("span");
    hint.textContent = "(조각을 순서대로 눌러서 채우세요)";
    hint.style.opacity = ".45";
    hint.style.fontWeight = "900";
    hint.style.color = "#7e3106";
    answerLine.appendChild(hint);
  } else {
    wbPicked.forEach((tok, idx) => {
      const isLast = idx === wbPicked.length - 1;
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
      sp.style.cursor = wbLocked ? "not-allowed" : (isLast ? "pointer" : "default");
      sp.style.opacity = wbLocked ? "0.6" : "1";
      applyKoRoleClass(sp, tok.role);
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

  bankArea.innerHTML = "";
  wbBank.forEach((tok) => {
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
    applyKoRoleClass(btn, tok.role);
    btn.onclick = () => {
      if (wbLocked) return;
      const idx = wbBank.findIndex((x) => x.id === tok.id);
      if (idx < 0) return;
      const moved = wbBank.splice(idx, 1)[0];
      wbPicked.push(moved);
      renderTranslateUI();
      maybeCompleteTranslate();
    };
    bankArea.appendChild(btn);
  });

  remainInfo.textContent = `남은 조각: ${wbBank.length}개`;
}

function maybeCompleteTranslate() {
  if (stage !== "translate" || wbLocked) return;
}

function upsertResult(row) {
  const idx = results.findIndex((x) => Number(x.qNumber) === Number(row.qNumber));
  if (idx >= 0) results[idx] = row;
  else results.push(row);
}

function submitAnswer() {
  if (stage !== "translate") return;
  if (wbLocked) return;

  const userKo = wbPicked.map((x) => x.text).join(" ").trim();
  const koOk = normalizeKoreanForCompare(userKo) === normalizeKoreanForCompare(correctKo);
  if (!koOk) {
    toastNo("Incorrect");
    return;
  }

  wbLocked = true;
  renderTranslateUI();

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.disabled = true;
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;

  const q = questions[currentIndex];
  upsertResult({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Pleks L5-E1 / Q${q.qNumber}`,
    selected: userKo || "무응답",
    correct: true,
    question: q.questionRaw,
    answer: q.themeKo,
  });

  toastOk("Correct");
}

function goNext() {
  if (stage !== "translate") return;
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn && nextBtn.disabled) return;

  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function showResultPopup() {
  const ordered = questions.map((q, i) => {
    const found = results.find((r) => Number(r.qNumber) === Number(q.qNumber));
    return (
      found || {
        no: i + 1,
        qNumber: q.qNumber,
        word: `Pleks L5-E1 / Q${q.qNumber}`,
        selected: "무응답",
        correct: false,
        question: q.questionRaw,
        answer: q.themeKo,
      }
    );
  });

  if (window.DishQuizResultsTable?.show) {
    window.DishQuizResultsTable.show({
      results: ordered,
      quizTitle,
      subcategory,
      level,
      day,
      passScore: 80,
    });
    return;
  }

  alert(`완료! (${ordered.filter((x) => x.correct).length}/${ordered.length})`);
}

function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    :root{
      --gold:#d5a22a;
      --uA: rgba(241,123,42,0.95);
      --uB: rgba(70,120,255,0.95);
      --uC: rgba(186,146,255,0.95);
    }

    .tok{
      display:inline;
      cursor:pointer;
      border-radius:6px;
      padding:0 2px;
      transition: background .12s ease, box-shadow .12s ease;
      user-select:none;
    }
    .tok.pick{
      box-shadow: inset 0 0 0 2px rgba(241,123,42,0.30);
      background: rgba(241,123,42,0.12);
      font-weight:900;
    }
    .tok.hit{
      box-shadow: inset 0 0 0 2px rgba(66,160,88,0.30);
      background: rgba(66,160,88,0.12);
      font-weight:900;
    }
    .sentence.readonly .tok{
      cursor:default !important;
    }

    .tok.uA, .tok.uB, .tok.uC{
      font-weight:950;
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 6px;
    }
    .tok.uA{ text-decoration-color: var(--uA); }
    .tok.uB{ text-decoration-color: var(--uB); }
    .tok.uC{ text-decoration-color: var(--uC); }

    .linkGold{
      background:rgba(213,162,42,0.20);
      box-shadow:inset 0 0 0 1px rgba(213,162,42,0.25);
      border-radius:6px;
      padding:0 3px;
      font-weight:900;
      color:#111;
    }

    .koU_A, .koU_B, .koU_C{
      text-decoration: underline;
      text-decoration-thickness: 3px;
      text-underline-offset: 4px;
    }
    .koU_A{ text-decoration-color: var(--uA); }
    .koU_B{ text-decoration-color: var(--uB); }
    .koU_C{ text-decoration-color: var(--uC); }
  `;
  document.head.appendChild(style);
}
