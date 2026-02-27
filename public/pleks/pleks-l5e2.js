const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const TARGET_LESSON = 5;
const EXERCISE_ORDER = [2, 22, 23];

let subcategory = "Grammar";
let level = "Basic";
let day = "315";
let quizTitle = "quiz_Grammar_Basic_315";
let userId = "";

let sequence = [];
let currentIndex = 0;
let results = [];
let currentState = null;

window.addEventListener("DOMContentLoaded", async () => {
  applyQueryParams();
  wireBackButton();

  if (window.PleksToastFX?.init) {
    window.PleksToastFX.init({ hostId: "cafe_int", top: 10 });
  }

  try {
    const rows = await loadExcelRows(EXCEL_FILE);
    sequence = buildSequence(rows);
  } catch (e) {
    console.error(e);
    renderEmpty(`파일을 불러오지 못했습니다.\n${EXCEL_FILE}`);
    return;
  }

  if (!sequence.length) {
    renderEmpty("L5-E2/22/23 문항을 찾지 못했습니다.");
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
  }
}

function wireBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;
  backBtn.addEventListener("click", () => history.back());
}

function renderEmpty(text) {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  area.innerHTML = `<div class="box">${escapeHtml(String(text || ""))}</div>`;
}

function toastOk(msg) {
  if (window.PleksToastFX?.show) window.PleksToastFX.show("ok", String(msg || ""));
}

function toastNo(msg) {
  if (window.PleksToastFX?.show) window.PleksToastFX.show("no", String(msg || ""));
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

function normalizeLoose(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWordToken(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function splitSentenceTokens(text) {
  return compactWhitespace(text).split(/\s+/).filter(Boolean);
}

function hasOverlap(span, occupied) {
  if (!span) return false;
  const [s, e] = span;
  for (const [os, oe] of occupied) {
    if (Math.max(s, os) <= Math.min(e, oe)) return true;
  }
  return false;
}

function findExactSpan(sentenceTokens, phraseText) {
  const s = sentenceTokens.map((t) => normalizeWordToken(t));
  const p = splitSentenceTokens(phraseText).map((t) => normalizeWordToken(t)).filter(Boolean);
  if (!s.length || !p.length || p.length > s.length) return null;

  for (let i = 0; i <= s.length - p.length; i += 1) {
    let ok = true;
    for (let j = 0; j < p.length; j += 1) {
      if (s[i + j] !== p[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return [i, i + p.length - 1];
  }
  return null;
}

function findBestSpan(sentenceTokens, phraseText, occupied = []) {
  const exact = findExactSpan(sentenceTokens, phraseText);
  if (exact && !hasOverlap(exact, occupied)) return exact;

  const s = sentenceTokens.map((t) => normalizeWordToken(t));
  const p = splitSentenceTokens(phraseText).map((t) => normalizeWordToken(t)).filter(Boolean);
  if (!s.length || !p.length) return null;

  const pSet = new Set(p.filter(Boolean));
  let best = null;
  let bestScore = -1;

  for (let i = 0; i < s.length; i += 1) {
    const maxJ = Math.min(s.length - 1, i + 9);
    for (let j = i; j <= maxJ; j += 1) {
      const span = [i, j];
      if (hasOverlap(span, occupied)) continue;

      const words = s.slice(i, j + 1).filter(Boolean);
      if (!words.length) continue;

      let overlap = 0;
      words.forEach((w) => {
        if (pSet.has(w)) overlap += 1;
      });
      if (!overlap) continue;

      const coverageSpan = overlap / words.length;
      const coverageAns = overlap / Math.max(1, pSet.size);
      const lenPenalty = words.length > 7 ? (words.length - 7) * 0.03 : 0;
      const score = coverageAns * 0.65 + coverageSpan * 0.35 - lenPenalty;

      if (score > bestScore) {
        bestScore = score;
        best = span;
      }
    }
  }

  if (!best) return null;
  return best;
}

function extractAnswerValue(raw, key, allKeys) {
  const src = String(raw || "");
  const startRe = new RegExp(`${key}\\s*=\\s*`, "i");
  const startMatch = startRe.exec(src);
  if (!startMatch) return "";

  const from = startMatch.index + startMatch[0].length;
  let to = src.length;

  allKeys.forEach((k) => {
    if (k === key) return;
    const re = new RegExp(`${k}\\s*=\\s*`, "ig");
    re.lastIndex = from;
    const m = re.exec(src);
    if (m && m.index < to) to = m.index;
  });

  return compactWhitespace(src.slice(from, to));
}

function parseTypeAQuestion(raw) {
  const src = String(raw || "");
  const sentenceMatch = src.match(/Sentence\s*:\s*(.*?)(?:Template\s*:|$)/is);
  const templateMatch = src.match(/Template\s*:\s*(.*)$/is);
  return {
    sentence: compactWhitespace(sentenceMatch ? sentenceMatch[1] : src),
    template: compactWhitespace(templateMatch ? templateMatch[1] : ""),
  };
}

function parseTypeAAnswer(raw) {
  const keys = ["A", "B", "X", "Y", "Pattern"];
  const answerMap = {};
  keys.forEach((k) => {
    const v = extractAnswerValue(raw, k, keys);
    if (v) answerMap[k] = v;
  });
  return answerMap;
}

function parseTypeBQuestion(raw) {
  const src = String(raw || "");
  const sentenceMatch = src.match(/Sentence\s*:\s*(.*?)(?:A\s*:\s*_+|$)/is);
  return {
    sentence: compactWhitespace(sentenceMatch ? sentenceMatch[1] : src),
  };
}

function parseTypeBAnswer(raw) {
  const keys = ["A", "B", "X", "Y"];
  const answerMap = {};
  keys.forEach((k) => {
    const v = extractAnswerValue(raw, k, keys);
    if (v) answerMap[k] = v;
  });
  return answerMap;
}

function sanitizeTypeBValue(text) {
  let s = compactWhitespace(text || "");
  s = s.replace(/^\([^)]*\)\s*/g, "").trim();
  return s;
}

function getTypeBManualABXY(qNumber) {
  const map = {
    21: { A: "City life", B: "rural life", X: "fast and noisy", Y: "slow and quiet" },
    22: { A: "Failure", B: "success", X: "often seen as a personal weakness", Y: "celebrated as a personal virtue" },
    23: { A: "Some students", B: "others", X: "prefer detailed feedback", Y: "just want a simple score" },
    24: { A: "He", B: "He", X: "not a critic", Y: "a supporter in this debate" },
    25: { A: "Online privacy", B: "constant connectivity", X: "treated as a luxury", Y: "treated as a necessity" },
    26: { A: "The first solution", B: "the second", X: "simple and rigid", Y: "complex but flexible" },
    27: { A: "Some people", B: "others", X: "fight loudly for change", Y: "adapt quietly to the situation" },
    28: { A: "This change", B: "This change", X: "not a temporary trend", Y: "a long-term shift in values" },
    29: { A: "The movie", B: "The movie", X: "not so much about history", Y: "about memory" },
    30: { A: "City policies", B: "City policies", X: "more symbolic", Y: "practical" },
    31: { A: "Some habits", B: "others", X: "protect your energy", Y: "quietly drain it" },
    32: { A: "The problem", B: "The problem", X: "not a lack of talent", Y: "a lack of consistent practice" },
    33: { A: "Some ideas", B: "others", X: "simple on the surface", Y: "complex but are easy to apply" },
    34: { A: "The task", B: "The task", X: "not difficult", Y: "time-consuming" },
    35: { A: "This habit", B: "This habit", X: "more automatic", Y: "intentional" },
    36: { A: "Risk", B: "Risk", X: "a danger", Y: "an opportunity" },
    37: { A: "Some people", B: "others", X: "see silence as a sign of respect", Y: "see it as a lack of interest" },
    38: { A: "The meeting", B: "The meeting", X: "not so much productive", Y: "clarifying" },
    39: { A: "Some rules", B: "others", X: "meant to protect people", Y: "meant to control them" },
    40: { A: "The plan", B: "The plan", X: "more hopeful", Y: "realistic" },
  };
  return map[Number(qNumber)] || null;
}

function parseTypeCQuestion(raw) {
  const src = String(raw || "");
  const idxA = src.search(/A\.\s*/i);
  const stem = compactWhitespace(idxA >= 0 ? src.slice(0, idxA) : src);
  const optSrc = idxA >= 0 ? src.slice(idxA) : "";
  const re = /([A-D])\.\s*(.*?)(?=(?:[A-D]\.\s)|$)/gis;
  const options = [];
  let m;
  while ((m = re.exec(optSrc)) !== null) {
    options.push({
      key: String(m[1] || "").toUpperCase(),
      text: compactWhitespace(m[2] || ""),
    });
  }
  return { stem, options };
}

function parseTypeCAnswer(raw) {
  const src = compactWhitespace(raw);
  const m = src.match(/\b([A-D])\s*[.)]/i) || src.match(/\b([A-D])\b/i);
  const key = m ? String(m[1] || "").toUpperCase() : "";
  return key;
}

function normalizeInstruction(inst, fallback) {
  const s = compactWhitespace(inst);
  if (!s || s === "위와 같음") return fallback || "";
  return s;
}

function buildSequence(rows) {
  const byEx = { 2: [], 22: [], 23: [] };

  (rows || []).forEach((r) => {
    const lesson = Number(r?.Lesson);
    const exercise = Number(r?.Exercise);
    if (lesson !== TARGET_LESSON || !EXERCISE_ORDER.includes(exercise)) return;

    const qNumber = Number(r?.QNumber);
    if (!Number.isFinite(qNumber)) return;

    byEx[exercise].push({
      exercise,
      qNumber,
      title: compactWhitespace(r?.Title || ""),
      instruction: compactWhitespace(r?.Instruction || ""),
      questionRaw: String(r?.Question || ""),
      answerRaw: String(r?.Answer || ""),
    });
  });

  EXERCISE_ORDER.forEach((ex) => {
    byEx[ex].sort((a, b) => a.qNumber - b.qNumber);
    let prevInst = "";
    byEx[ex] = byEx[ex].map((q) => {
      const inst = normalizeInstruction(q.instruction, prevInst);
      if (inst) prevInst = inst;
      return { ...q, instruction: inst };
    });
  });

  byEx[2] = byEx[2].map((q) => {
    const parsedQ = parseTypeAQuestion(q.questionRaw);
    const parsedA = parseTypeAAnswer(q.answerRaw);
    const keys = ["A", "B", "X", "Y"].filter((k) => parsedA[k]);
    const sentenceTokens = splitSentenceTokens(parsedQ.sentence || "");
    const keySpans = {};
    const occupied = [];

    keys.forEach((k) => {
      const span = findBestSpan(sentenceTokens, parsedA[k], occupied);
      keySpans[k] = span;
      if (span) occupied.push(span);
    });

    return {
      ...q,
      type: "A",
      parsedQuestion: parsedQ,
      parsedAnswer: parsedA,
      sentenceTokens,
      keyOrder: keys.length ? keys : ["A", "B", "X", "Y"],
      keySpans,
    };
  });

  byEx[22] = byEx[22].map((q) => {
    const parsedQ = parseTypeBQuestion(q.questionRaw);
    const parsedAraw = parseTypeBAnswer(q.answerRaw);
    const manual = getTypeBManualABXY(q.qNumber);
    const parsedA = {
      A: sanitizeTypeBValue(parsedAraw.A || manual?.A || ""),
      B: sanitizeTypeBValue(parsedAraw.B || manual?.B || ""),
      X: sanitizeTypeBValue(parsedAraw.X || manual?.X || ""),
      Y: sanitizeTypeBValue(parsedAraw.Y || manual?.Y || ""),
    };
    const sentenceTokens = splitSentenceTokens(parsedQ.sentence || "");
    const keySpans = {};
    ["A", "B", "X", "Y"].forEach((k) => {
      if (!compactWhitespace(parsedA[k])) return;
      const exact = findExactSpan(sentenceTokens, parsedA[k]);
      keySpans[k] = exact || findBestSpan(sentenceTokens, parsedA[k], []);
    });
    const sourceSegments = buildTypeBSourceSegments(sentenceTokens, keySpans);

    return {
      ...q,
      type: "B",
      parsedQuestion: parsedQ,
      parsedAnswer: parsedA,
      sentenceTokens,
      keyOrder: ["A", "B", "X", "Y"],
      keySpans,
      sourceSegments,
    };
  });

  byEx[23] = byEx[23].map((q) => {
    const parsedQ = parseTypeCQuestion(q.questionRaw);
    const answerKey = parseTypeCAnswer(q.answerRaw);
    return {
      ...q,
      type: "C",
      parsedQuestion: parsedQ,
      answerKey,
    };
  });

  const maxLen = Math.max(byEx[2].length, byEx[22].length, byEx[23].length);
  const seq = [];
  for (let i = 0; i < maxLen; i += 1) {
    EXERCISE_ORDER.forEach((ex) => {
      const q = byEx[ex][i];
      if (!q) return;
      seq.push({
        ...q,
        seqIndex: seq.length + 1,
        roundIndex: i + 1,
        id: `${ex}-${q.qNumber}`,
      });
    });
  }
  return seq;
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L5-E2</div>
      <button class="quiz-btn" style="width:100%; margin-top:4px;" onclick="startQuiz()">Start</button>
    </div>
  `;
}

function startQuiz() {
  currentIndex = 0;
  results = [];
  renderQuestion();
}

function getInstructionText(q) {
  if (!q) return "";
  if (q.type === "B") return "\uBE48\uCE78\uC5D0 \uC54C\uB9DE\uC740 \uB9D0\uC744 \uC368\uC8FC\uC138\uC694";
  if (q.type === "A") return "\uB300\uBE44\uB418\uB294 \uC694\uC18C\uB97C \uACE8\uB77C\uBCF4\uC138\uC694";
  return "\uC54C\uB9DE\uC740 \uBC88\uD638\uB97C \uACE0\uB974\uC138\uC694";
}

function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function buildTypeBState(q) {
  if (!q || q.type !== "B") return null;
  return {
    slots: { A: "", B: "", X: "", Y: "" },
    selectedKeys: "",
    dragKeys: "",
    wrongToastStamp: 0,
  };
}

function renderQuestion() {
  const area = document.getElementById("quiz-area");
  if (!area) return;
  const q = sequence[currentIndex];
  if (!q) {
    showResultPopup();
    return;
  }

  currentState = {
    correct: false,
    selectedChoice: "",
    chosenKeys: buildInitialChosenKeys(q),
    typeB: buildTypeBState(q),
  };
  const instruction = getInstructionText(q);

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${sequence.length}</div>

    <div class="box">
      <div style="font-weight:900; color:#7e3106; font-size:13px;">
        ${escapeHtml(instruction)}
      </div>
    </div>

    <div class="box">
      <div class="sentence">${renderQuestionBody(q)}</div>
      ${renderAnswerArea(q)}
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="next-btn" onclick="goNext()" disabled>다음</button>
    </div>
  `;

  wireQuestionEvents(q);
  if (q.type === "A") {
    paintTapState(q);
  } else if (q.type === "B") {
    paintTypeBState(q);
  }
}

function renderQuestionBody(q) {
  if (q.type === "A") {
    return `<div id="tap-sentence" class="tap-sentence">${buildTapSentenceHtml(q)}</div>`;
  }
  if (q.type === "B") {
    return `<div id="typeb-sentence" class="typeb-sentence">${buildTypeBSentenceHtml(q)}</div>`;
  }
  return `<div>${escapeHtml(q.parsedQuestion.stem || q.questionRaw)}</div>`;
}

function renderAnswerArea(q) {
  if (q.type === "A") {
    return `<div class="tap-prompt" id="tap-prompt"></div>`;
  }

  if (q.type === "B") {
    return `
      <div class="abxy-wrap" id="abxy-board">
        <div class="abxy-row">
          <span class="abxy-slot" data-slot="A">\uBE48\uCE78</span>
          <span class="abxy-eq">=</span>
          <span class="abxy-slot" data-slot="X">\uBE48\uCE78</span>
        </div>
        <div class="abxy-row">
          <span class="abxy-slot" data-slot="B">\uBE48\uCE78</span>
          <span class="abxy-eq">=</span>
          <span class="abxy-slot" data-slot="Y">\uBE48\uCE78</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="choice-list" id="choice-list">
      ${q.parsedQuestion.options
        .map(
          (opt) => `
          <button class="choice-btn" type="button" data-choice="${escapeHtml(opt.key)}">
            <b>${escapeHtml(opt.key)}.</b> ${escapeHtml(opt.text)}
          </button>
        `
        )
        .join("")}
    </div>
  `;
}

function wireQuestionEvents(q) {
  if (q.type === "A") {
    const sent = document.getElementById("tap-sentence");
    if (!sent) return;
    sent.addEventListener("click", (ev) => {
      if (currentState.correct) return;
      const tok = ev.target?.closest?.(".tap-tok[data-idx]");
      if (!tok) return;
      const idx = Number(tok.getAttribute("data-idx"));
      if (!Number.isFinite(idx)) return;

      const activeKey = getActiveTapKey(q);
      if (!activeKey) return;
      const span = q.keySpans?.[activeKey];
      if (!Array.isArray(span) || span.length !== 2) {
        toastNo("\uC624\uB2F5");
        return;
      }
      if (idx < span[0] || idx > span[1]) {
        toastNo("\uC624\uB2F5");
        return;
      }

      currentState.chosenKeys[activeKey] = true;
      paintTapState(q);

      if (isTapSolved(q)) {
        finalizeTapQuestion(q);
      }
    });
    return;
  }

  if (q.type === "B") {
    const board = document.getElementById("abxy-board");
    const sentence = document.getElementById("typeb-sentence");
    if (!board || !sentence || !currentState?.typeB) return;

    sentence.addEventListener("click", (ev) => {
      if (currentState.correct) return;
      const src = ev.target?.closest?.(".typeb-src[data-keys]");
      if (!src) return;
      const keys = String(src.getAttribute("data-keys") || "");
      toggleTypeBSelectedKeys(keys);
      paintTypeBState(q);
    });

    sentence.addEventListener("dragstart", (ev) => {
      const src = ev.target?.closest?.(".typeb-src[data-keys]");
      if (!src) return;
      const keys = String(src.getAttribute("data-keys") || "");
      if (!keys) return;
      currentState.typeB.dragKeys = keys;
      try {
        ev.dataTransfer?.setData("text/plain", keys);
      } catch (_) {}
    });

    sentence.addEventListener("dragend", () => {
      if (!currentState?.typeB) return;
      currentState.typeB.dragKeys = "";
    });

    board.addEventListener("click", (ev) => {
      if (currentState.correct) return;
      const slot = ev.target?.closest?.(".abxy-slot[data-slot]");
      if (!slot) return;
      const slotKey = String(slot.getAttribute("data-slot") || "");
      if (!slotKey) return;

      const selectedKeys = currentState.typeB.selectedKeys || "";
      if (selectedKeys) {
        placeTypeBKeyByKeys(q, slotKey, selectedKeys);
        return;
      }

      const placed = currentState.typeB.slots?.[slotKey] || "";
      if (placed) {
        currentState.typeB.slots[slotKey] = "";
        paintTypeBState(q);
      }
    });

    board.querySelectorAll(".abxy-slot[data-slot]").forEach((slotEl) => {
      slotEl.addEventListener("dragover", (ev) => {
        ev.preventDefault();
      });
      slotEl.addEventListener("drop", (ev) => {
        ev.preventDefault();
        if (currentState.correct) return;
        const slotKey = String(slotEl.getAttribute("data-slot") || "");
        const dragKeys = currentState.typeB.dragKeys || String(ev.dataTransfer?.getData("text/plain") || "");
        if (!slotKey || !dragKeys) return;
        placeTypeBKeyByKeys(q, slotKey, dragKeys);
      });
    });

    return;
  }

  if (q.type === "C") {
    const list = document.getElementById("choice-list");
    if (!list) return;
    list.addEventListener("click", (ev) => {
      if (currentState.correct) return;
      const btn = ev.target?.closest?.(".choice-btn[data-choice]");
      if (!btn) return;
      const key = btn.getAttribute("data-choice") || "";
      currentState.selectedChoice = key;
      list.querySelectorAll(".choice-btn").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");

      const picked = String(key || "").toUpperCase();
      const answerKey = String(q.answerKey || "").toUpperCase();
      if (!picked || picked !== answerKey) {
        toastNo("\uC624\uB2F5");
        return;
      }

      currentState.correct = true;
      upsertResult({
        id: q.id,
        no: currentIndex + 1,
        qNumber: q.qNumber,
        word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
        selected: picked,
        correct: true,
        question: q.questionRaw,
        answer: q.answerRaw,
      });

      const nextBtn = document.getElementById("next-btn");
      if (nextBtn) nextBtn.disabled = false;
      list.querySelectorAll(".choice-btn").forEach((el) => {
        el.disabled = true;
      });
      toastOk("\uC815\uB2F5!");
    });
    return;
  }
}
function buildTapSentenceHtml(q) {
  const toks = Array.isArray(q.sentenceTokens) ? q.sentenceTokens : splitSentenceTokens(q.parsedQuestion?.sentence || q.questionRaw);
  return toks
    .map((t, i) => `<span class="tap-tok" data-idx="${i}">${escapeHtml(t)}</span>`)
    .join(" ");
}

function buildTypeBSourceSegments(sentenceTokens, keySpans) {
  const segMap = new Map();
  ["A", "B", "X", "Y"].forEach((k) => {
    const span = keySpans?.[k];
    if (!Array.isArray(span) || span.length !== 2) return;
    const s = Number(span[0]);
    const e = Number(span[1]);
    if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e < s) return;
    const id = `${s}-${e}`;
    if (!segMap.has(id)) {
      segMap.set(id, {
        start: s,
        end: e,
        keys: [k],
        text: sentenceTokens.slice(s, e + 1).join(" "),
      });
      return;
    }
    segMap.get(id).keys.push(k);
  });

  return Array.from(segMap.values()).sort((a, b) => a.start - b.start || a.end - b.end);
}

function buildTypeBSentenceHtml(q) {
  const toks = Array.isArray(q?.sentenceTokens) ? q.sentenceTokens : splitSentenceTokens(q?.parsedQuestion?.sentence || q?.questionRaw || "");
  const segs = Array.isArray(q?.sourceSegments) ? q.sourceSegments : [];
  const segByStart = new Map();
  segs.forEach((seg) => {
    if (Number.isFinite(seg?.start)) segByStart.set(seg.start, seg);
  });

  const out = [];
  let i = 0;
  while (i < toks.length) {
    const seg = segByStart.get(i);
    if (!seg) {
      out.push(`<span class="typeb-tok">${escapeHtml(toks[i])}</span>`);
      i += 1;
      continue;
    }

    const keys = Array.isArray(seg.keys) ? seg.keys.filter(Boolean) : [];
    const klass = keys.length ? ` k-${keys[0]}` : "";
    out.push(
      `<span class="typeb-src${klass}" draggable="true" data-keys="${escapeHtml(keys.join("|"))}" data-start="${seg.start}" data-end="${seg.end}">${escapeHtml(seg.text || toks.slice(seg.start, seg.end + 1).join(" "))}</span>`
    );
    i = seg.end + 1;
  }

  return out.join(" ");
}

function getActiveTapKey(q) {
  const keys = Array.isArray(q.keyOrder) ? q.keyOrder : [];
  const chosen = currentState?.chosenKeys || {};
  for (const k of keys) {
    if (chosen[k]) continue;
    const span = q?.keySpans?.[k];
    if (!Array.isArray(span) || span.length !== 2) {
      chosen[k] = true;
      continue;
    }
    return k;
  }
  return "";
}

function isTapSolved(q) {
  return !getActiveTapKey(q);
}

function paintTapState(q) {
  const sent = document.getElementById("tap-sentence");
  if (sent) {
    const nodes = sent.querySelectorAll(".tap-tok[data-idx]");
    nodes.forEach((n) => {
      n.classList.remove("k-A", "k-B", "k-X", "k-Y");
    });

    const chosen = currentState?.chosenKeys || {};
    const keys = Array.isArray(q.keyOrder) ? q.keyOrder : [];
    keys.forEach((k) => {
      if (!chosen[k]) return;
      const span = q.keySpans?.[k];
      if (!Array.isArray(span) || span.length !== 2) return;
      nodes.forEach((n) => {
        const idx = Number(n.getAttribute("data-idx"));
        if (idx >= span[0] && idx <= span[1]) n.classList.add(`k-${k}`);
      });
    });
  }

  const prompt = document.getElementById("tap-prompt");
  if (prompt) {
    prompt.textContent = getTapPromptText(q);
  }
}

function toggleTypeBSelectedKeys(keysText) {
  if (!currentState?.typeB) return;
  const keys = String(keysText || "");
  currentState.typeB.selectedKeys = currentState.typeB.selectedKeys === keys ? "" : keys;
}

function getTypeBPlacedSlotByKey(key) {
  if (!currentState?.typeB?.slots) return "";
  const slots = currentState.typeB.slots;
  const keys = Object.keys(slots);
  for (const slot of keys) {
    if (slots[slot] === key) return slot;
  }
  return "";
}

function resolveTypeBKeyForSlot(slotKey, keysText) {
  const keys = String(keysText || "")
    .split("|")
    .map((k) => compactWhitespace(k))
    .filter(Boolean);
  if (!keys.length) return "";
  if (keys.includes(slotKey)) return slotKey;
  return keys[0];
}

function placeTypeBKeyByKeys(q, slotKey, keysText) {
  if (!currentState?.typeB) return;
  const validSlots = ["A", "B", "X", "Y"];
  if (!validSlots.includes(slotKey)) return;

  const key = resolveTypeBKeyForSlot(slotKey, keysText);
  if (!key || !validSlots.includes(key)) return;
  if (!compactWhitespace(q?.parsedAnswer?.[key])) return;

  const prevSlot = getTypeBPlacedSlotByKey(key);
  if (prevSlot) currentState.typeB.slots[prevSlot] = "";

  currentState.typeB.slots[slotKey] = key;
  currentState.typeB.selectedKeys = "";
  paintTypeBState(q);
  tryFinalizeTypeB(q);
}

function paintTypeBState(q) {
  const board = document.getElementById("abxy-board");
  if (!board || !currentState?.typeB) return;
  const slots = currentState.typeB.slots || {};
  const selectedKeys = currentState.typeB.selectedKeys || "";

  board.querySelectorAll(".abxy-slot[data-slot]").forEach((el) => {
    const slotKey = String(el.getAttribute("data-slot") || "");
    const placedKey = slots[slotKey] || "";
    el.classList.remove("filled", "k-A", "k-B", "k-X", "k-Y");
    if (!placedKey) {
      el.textContent = "\uBE48\uCE78";
      return;
    }

    el.textContent = q?.parsedAnswer?.[placedKey] || "";
    el.classList.add("filled", `k-${placedKey}`);
  });

  const sentence = document.getElementById("typeb-sentence");
  if (sentence) {
    sentence.querySelectorAll(".typeb-src[data-keys]").forEach((el) => {
      const k = String(el.getAttribute("data-keys") || "");
      el.classList.remove("selected");
      if (selectedKeys && k === selectedKeys) el.classList.add("selected");
    });
  }
}

function tryFinalizeTypeB(q) {
  if (!currentState?.typeB || currentState.correct) return;
  const slots = currentState.typeB.slots || {};
  const required = ["A", "B", "X", "Y"].filter((k) => compactWhitespace(q?.parsedAnswer?.[k]));
  const allFilled = required.every((k) => compactWhitespace(slots[k]));
  if (!allFilled) return;

  const allCorrect = required.every((k) => slots[k] === k);
  if (!allCorrect) {
    const now = Date.now();
    if (now - Number(currentState.typeB.wrongToastStamp || 0) > 350) {
      currentState.typeB.wrongToastStamp = now;
      toastNo("\uC624\uB2F5");
    }
    return;
  }

  currentState.correct = true;
  const summary = required.map((k) => `${k}=${q?.parsedAnswer?.[k] || ""}`).join(" | ");
  upsertResult({
    id: q.id,
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
    selected: summary || "\uBB34\uC751\uB2F5",
    correct: true,
    question: q.questionRaw,
    answer: q.answerRaw,
  });

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;
  toastOk("\uC815\uB2F5!");
}
function buildInitialChosenKeys(q) {
  const chosen = {};
  if (q?.type !== "A") return chosen;
  const keys = Array.isArray(q?.keyOrder) ? q.keyOrder : [];
  if (keys.includes("A")) chosen.A = true;
  return chosen;
}

function getTapPromptText(q) {
  if (q?.type !== "A") return "";

  const chosen = currentState?.chosenKeys || {};
  const labelA = compactWhitespace(q?.parsedAnswer?.A || "A");
  const labelB = compactWhitespace(q?.parsedAnswer?.B || "B");

  if (!chosen.B) return "\uB300\uBE44\uB418\uB294 \uC694\uC18C\uB97C \uACE8\uB77C\uBCF4\uC138\uC694";
  if (!chosen.X) return `${labelA}\uB294 \uC5B4\uB5A4\uAC00\uC694?`;
  if (!chosen.Y) return `\uADF8\uB7FC ${labelB}\uB294 \uC5B4\uB5A4\uAC00\uC694?`;
  return "";
}

function finalizeTapQuestion(q) {
  if (currentState.correct) return;
  currentState.correct = true;

  const keys = Array.isArray(q.keyOrder) ? q.keyOrder : [];
  const summary = keys.map((k) => `${k}=${q.parsedAnswer?.[k] || ""}`).join(" | ");
  upsertResult({
    id: q.id,
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
    selected: summary || "무응답",
    correct: true,
    question: q.questionRaw,
    answer: q.answerRaw,
  });

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;
  toastOk("정답!");
}

function upsertResult(item) {
  const idx = results.findIndex((x) => x.id === item.id);
  if (idx >= 0) results[idx] = item;
  else results.push(item);
}

function submitAnswer() {
  const q = sequence[currentIndex];
  if (!q || currentState?.correct) return;

  if (q.type === "A") {
    if (!isTapSolved(q)) {
      toastNo("오답");
      return;
    }
    finalizeTapQuestion(q);
    return;
  }

  if (q.type === "B") {
    tryFinalizeTypeB(q);
    if (!currentState?.correct) toastNo("오답");
    return;
  }

  const picked = String(currentState.selectedChoice || "").toUpperCase();
  const answerKey = String(q.answerKey || "").toUpperCase();
  if (!picked || picked !== answerKey) {
    toastNo("오답");
    return;
  }

  currentState.correct = true;
  upsertResult({
    id: q.id,
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
    selected: picked,
    correct: true,
    question: q.questionRaw,
    answer: q.answerRaw,
  });

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = false;
  toastOk("정답!");
}

function goNext() {
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn && nextBtn.disabled) return;

  currentIndex += 1;
  if (currentIndex >= sequence.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function showResultPopup() {
  const ordered = sequence.map((q, i) => {
    const found = results.find((r) => r.id === q.id);
    return (
      found || {
        id: q.id,
        no: i + 1,
        qNumber: q.qNumber,
        word: `L5 / EX${q.exercise} / Q${q.qNumber}`,
        selected: "무응답",
        correct: false,
        question: q.questionRaw,
        answer: q.answerRaw,
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

  const score = ordered.filter((x) => x.correct).length;
  alert(`완료! (${score}/${ordered.length})`);
}
