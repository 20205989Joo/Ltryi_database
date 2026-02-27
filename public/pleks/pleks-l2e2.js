// pleks-l2e2.js
// L2-E2: overlap + weld fragments

const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const DESC_FILE = "LTRYI-pleks-lesson-desc.xlsx";

const TARGET_LESSON = 2;
const TARGET_EXERCISE = 2;
const MAX_QUESTIONS = 0; // 0 = no limit
const NO_KOREAN_PROMPT = "(순서를 맞추고 '중첩!)";

const FRAG_COLORS = [
  "#ffe0e0",
  "#dff7ff",
  "#e8f7db",
  "#fff2cf",
  "#f2e5ff",
  "#ffe9d6",
  "#dff3ea",
  "#e7ebff",
];

const WEAK_PIVOT_WORDS = new Set([
  "a", "an", "the",
  "of", "to", "in", "on", "at", "for", "from", "by", "with", "as", "into", "onto",
  "and", "or", "but", "so", "if", "then", "than",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "have", "has", "had",
  "this", "that", "these", "those",
]);

const DUPLICATE_COLLAPSE_WORDS = new Set([
  "a", "an", "the",
  "this", "that", "these", "those",
  "my", "your", "his", "her", "its", "our", "their",
]);

const TOKEN_PAD_X = 10;
const TOKEN_GAP_WHEN_NO_OVERLAP = 12;
const WELDED_MAX_WIDTH = 220;
const WORK_WRAP_THRESHOLD = 36;
const WORK_WRAP_MAX_WIDTH = 190;
const WORK_Y_UPPER = 30;  // fragment lane
const WORK_Y_BASE = 66;   // completed lane
const WORK_PAD_X = 8;
const WORK_TOP_PAD = 8;
const WORK_TIP_HEIGHT = 22;
const WORK_LANE_GAP = 10;
const WORK_BOTTOM_PAD = 10;

let subcategory = "Grammar";
let level = "Basic";
let day = "304";
let quizTitle = "quiz_Grammar_Basic_304";
let userId = "";

let rawRows = [];
let descRows = [];
let questions = [];
let currentIndex = 0;
let results = [];

let lessonTitle = "";
let exerciseTitle = "";

let bankTokens = [];
let workTokens = [];
let isLocked = false;
let isAnimatingWeld = false;
let pendingBangTokenId = "";
let measureCtx = null;
let lastWorkLayout = null;
let armedWeld = null;

window.addEventListener("DOMContentLoaded", async () => {
  if (window.PleksToastFX?.init) {
    window.PleksToastFX.init({ hostId: "cafe_int", top: 10 });
  }

  applyQueryParams();
  wireBackButton();

  try {
    const [qRows, dRows] = await Promise.all([
      loadExcelRows(EXCEL_FILE),
      loadExcelRows(DESC_FILE).catch(() => []),
    ]);
    rawRows = qRows;
    descRows = dRows;
  } catch (err) {
    console.error(err);
    alert("엑셀 파일을 불러오지 못했습니다.\n" + EXCEL_FILE);
    return;
  }

  buildLessonMeta();
  buildQuestionsFromRows();
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

async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status} (${filename})`);
  const buf = await res.arrayBuffer();

  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  return rows.filter((row) => !isRowAllEmpty(row));
}

function isRowAllEmpty(row) {
  const keys = Object.keys(row || {});
  if (!keys.length) return true;
  return keys.every((k) => String(row[k] ?? "").trim() === "");
}

function buildLessonMeta() {
  const row = descRows.find(
    (r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE
  );
  lessonTitle = String(row?.["LessonTitle"] ?? "").trim();
  exerciseTitle = String(row?.["Title"] ?? "").trim();
}

function buildQuestionsFromRows() {
  let filtered = rawRows
    .filter((r) => Number(r["Lesson"]) === TARGET_LESSON && Number(r["Exercise"]) === TARGET_EXERCISE)
    .sort((a, b) => Number(a["QNumber"]) - Number(b["QNumber"]));

  if (MAX_QUESTIONS > 0) filtered = filtered.slice(0, MAX_QUESTIONS);

  questions = filtered.map((r, idx) => {
    const rawQuestion = String(r["Question"] ?? "").trim();
    const parsed = parseBlocksQuestion(rawQuestion);
    return {
      no: idx + 1,
      qNumber: Number(r["QNumber"]) || idx + 1,
      title: String(r["Title"] ?? "").trim(),
      instruction: String(r["Instruction"] ?? "").trim(),
      rawQuestion,
      answerEnglish: String(r["Answer"] ?? "").trim(),
      blocks: parsed.blocks,
    };
  });
}

function parseBlocksQuestion(raw) {
  const text = String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  let body = text;
  if (/^Blocks:/i.test(body)) {
    body = body.replace(/^Blocks:/i, "").trim();
  }

  const rawBlocks = body
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  const blocks = rawBlocks
    .map((s) => s.replace(/^(?:[\u2460-\u2473]|\d+[.)])\s*/u, "").trim())
    .filter(Boolean);

  return { blocks };
}

function renderIntro() {
  const area = document.getElementById("quiz-area");
  if (!area) return;

  const total = questions.length;
  const qTitle = questions[0]?.title || "Overlap Weld";
  const inst = questions[0]?.instruction || "중첩되는 pivot을 찾아 click으로 용접하세요.";
  const bigTitle = lessonTitle || "Pleks L2";
  const smallTitle = exerciseTitle || qTitle;

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:8px;">Pleks L2-E2</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">총 ${total}문제</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-size:14px; font-weight:900; color:#444; margin-bottom:2px;">
        ${escapeHtml(bigTitle)}
      </div>
      <div style="font-size:13px; color:#555; margin-bottom:8px;">
        ${escapeHtml(smallTitle)}
      </div>

      <div style="font-size:13px; line-height:1.65; color:#333;">
        색깔 fragment에서 <b>겹치는 pivot</b>을 찾고,<br/>
        중간의 <b>click 용접</b> 버튼으로 하나로 합치세요.
      </div>

      <div style="margin-top:10px; font-size:13px; color:#7e3106;">
        ${escapeHtml(inst)}
      </div>

      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">시작</button>
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
  if (!q) {
    showResultPopup();
    return;
  }

  isLocked = false;
  isAnimatingWeld = false;
  workTokens = [];
  armedWeld = null;
  bankTokens = q.blocks.map((text, i) => ({
    id: `f_${currentIndex}_${i}_${Math.random().toString(16).slice(2, 7)}`,
    text,
    color: FRAG_COLORS[i % FRAG_COLORS.length],
    sources: [i],
    welded: false,
    lane: "upper",
  }));

  area.innerHTML = `
    <div class="q-label">${currentIndex + 1} / ${questions.length} (Q${q.qNumber})</div>

    <div class="box" style="margin-bottom:10px;">
      <div class="sentence">${escapeHtml(NO_KOREAN_PROMPT)}</div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div id="work-area"></div>
    </div>

    <div class="box" style="margin-bottom:10px;">
      <div id="bank-area" class="frag-line"></div>
      <div id="remain-info" style="margin-top:8px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78);"></div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn">제출</button>
      <button class="quiz-btn" id="next-btn">다음</button>
    </div>
  `;

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  if (submitBtn) submitBtn.addEventListener("click", submitCurrent);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
  if (nextBtn) nextBtn.disabled = true;

  renderOverlapUI();
}

function renderOverlapUI() {
  const workArea = document.getElementById("work-area");
  const bankArea = document.getElementById("bank-area");
  const remainInfo = document.getElementById("remain-info");
  if (!workArea || !bankArea || !remainInfo) return;
  syncInteractionState();

  workArea.innerHTML = "";
  if (!workTokens.length) {
    lastWorkLayout = null;
    armedWeld = null;
    const ph = document.createElement("span");
    ph.style.opacity = "0.5";
    ph.style.fontWeight = "900";
    ph.textContent = "Click a fragment to move it into the work area.";
    workArea.appendChild(ph);
  } else {
    const layout = computeWorkLayout(workTokens, Math.max(workArea.clientWidth - 4, 220));
    lastWorkLayout = layout;
    const pivotPickByIndex = buildPivotPickMap(workTokens);
    const armedPairIndex = getArmedPairIndex();

    const stage = document.createElement("div");
    stage.className = "work-stack";
    const canvas = document.createElement("div");
    canvas.className = "work-canvas";
    canvas.style.width = `${layout.canvasWidth}px`;
    canvas.style.height = `${layout.canvasHeight}px`;
    stage.appendChild(canvas);
    workArea.appendChild(stage);

    for (let i = 0; i < workTokens.length; i += 1) {
      const tok = workTokens[i];
      const lane = layout.lanes[i];
      const isUpper = lane === "upper";
      const pickCtx = pivotPickByIndex[i] || null;

      const node = document.createElement("div");
      node.className = "frag-node";
      node.dataset.idx = String(i);
      node.style.left = `${layout.x[i]}px`;
      node.style.top = `${layout.y[i]}px`;
      node.style.zIndex = String((isUpper ? 140 : 80) + i);

      const tokenBtn = document.createElement("button");
      tokenBtn.type = "button";
      tokenBtn.className = `frag-token${tok.welded ? " welded" : ""}`;
      if (pendingBangTokenId && tok.id === pendingBangTokenId) {
        tokenBtn.classList.add("bang-pop");
      }
      tokenBtn.style.background = tok.welded ? "#fff" : tok.color;
      applyAdaptiveTokenStyle(tokenBtn, tok.text, { welded: !!tok.welded, inBank: false });
      tokenBtn.disabled = isLocked || isAnimatingWeld;

      if (isUpper) {
        tokenBtn.textContent = tok.text;
        tokenBtn.title = "Click to send this fragment back";
        tokenBtn.addEventListener("click", () => {
          if (isLocked || isAnimatingWeld) return;
          const [moved] = workTokens.splice(i, 1);
          if (moved) bankTokens.push(moved);
          if (armedWeld?.fragId === tok.id) armedWeld = null;
          renderOverlapUI();
        });
      } else if (pickCtx) {
        tokenBtn.classList.add("pivot-pickable");
        const pickedRange = getArmedRangeForBaseToken(tok.id, pickCtx);
        tokenBtn.innerHTML = renderPivotPickMarkup(tok.text, pickedRange);
        tokenBtn.title = "Pick the pivot word";
        tokenBtn.addEventListener("click", (ev) => {
          if (isLocked || isAnimatingWeld) return;
          const clicked = Number(ev.target?.dataset?.pivotWordIndex);
          if (!Number.isInteger(clicked)) return;

          const options = pickCtx.options.filter((opt) => {
            const start = pickCtx.baseIsLeft ? opt.leftStart : opt.rightStart;
            return clicked >= start && clicked < (start + opt.len);
          });
          if (!options.length) {
            armedWeld = null;
            showToast("no", "Wrong pivot");
            renderOverlapUI();
            return;
          }

          let chosen = options[0];
          let bestKey = pivotOptionKey(chosen);
          for (let j = 1; j < options.length; j += 1) {
            const key = pivotOptionKey(options[j]);
            if (isLexicographicallyGreater(key, bestKey)) {
              chosen = options[j];
              bestKey = key;
            }
          }

          const start = pickCtx.baseIsLeft ? chosen.leftStart : chosen.rightStart;
          armedWeld = {
            fragId: pickCtx.fragId,
            baseId: tok.id,
            phrase: chosen.phrase,
            baseRangeStart: start,
            baseRangeEnd: start + chosen.len - 1,
          };
          showToast("ok", "Pivot set. Click weld");
          renderOverlapUI();
        });
      } else {
        tokenBtn.textContent = tok.text;
        tokenBtn.title = "Completed token";
        tokenBtn.style.cursor = "default";
      }

      node.appendChild(tokenBtn);
      canvas.appendChild(node);
    }

    for (let i = 0; i < layout.pairInfos.length; i += 1) {
      const info = layout.pairInfos[i];
      if (!info) continue;
      if (armedPairIndex !== i) continue;

      const tip = document.createElement("button");
      tip.type = "button";
      tip.className = "click-tip";
      tip.textContent = "click";
      tip.style.left = `${layout.tipX[i]}px`;
      tip.style.top = `${layout.tipY[i]}px`;
      tip.title = `pivot: ${armedWeld?.phrase || info.phrase}`;
      tip.disabled = isLocked || isAnimatingWeld;
      tip.addEventListener("click", () => {
        if (isLocked || isAnimatingWeld) return;
        weldAt(i);
      });
      canvas.appendChild(tip);
    }

    if (pendingBangTokenId) pendingBangTokenId = "";
  }

  bankArea.innerHTML = "";
  bankTokens.forEach((tok, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "frag-token";
    btn.style.background = tok.color;
    applyAdaptiveTokenStyle(btn, tok.text, { welded: false, inBank: true });
    btn.disabled = isLocked || isAnimatingWeld;
    btn.textContent = tok.text;
    btn.addEventListener("click", () => {
      if (isLocked || isAnimatingWeld) return;
      const [moved] = bankTokens.splice(idx, 1);
      if (moved) placeFragmentFromBank(moved);
      renderOverlapUI();
    });
    bankArea.appendChild(btn);
  });

  remainInfo.textContent = `Bank ${bankTokens.length} / Work ${workTokens.length}`;
}

function placeFragmentFromBank(moved) {
  if (!moved) return;

  const upperIndices = [];
  const baseIndices = [];
  for (let i = 0; i < workTokens.length; i += 1) {
    if (tokenLaneName(workTokens[i]) === "upper") upperIndices.push(i);
    else baseIndices.push(i);
  }

  if (baseIndices.length === 0 && upperIndices.length === 1) {
    const anchor = workTokens[upperIndices[0]];
    if (anchor) {
      anchor.lane = "base";
      anchor.welded = true;
      anchor.color = "#ffffff";
    }
  } else {
    for (let i = upperIndices.length - 1; i >= 0; i -= 1) {
      const idx = upperIndices[i];
      const [ret] = workTokens.splice(idx, 1);
      if (ret) bankTokens.push(ret);
    }
  }

  moved.lane = "upper";
  moved.welded = false;
  armedWeld = null;
  workTokens.push(moved);
}

function syncInteractionState() {
  const upperIndices = [];
  for (let i = 0; i < workTokens.length; i += 1) {
    if (tokenLaneName(workTokens[i]) === "upper") upperIndices.push(i);
  }

  if (upperIndices.length > 1) {
    const keep = upperIndices[upperIndices.length - 1];
    for (let i = upperIndices.length - 1; i >= 0; i -= 1) {
      const idx = upperIndices[i];
      if (idx === keep) continue;
      const [ret] = workTokens.splice(idx, 1);
      if (ret) bankTokens.push(ret);
    }
  }

  if (armedWeld) {
    const pairIdx = findAdjacentPairIndexByTokenIds(armedWeld.fragId, armedWeld.baseId);
    if (pairIdx < 0) {
      armedWeld = null;
      return;
    }
    const frag = workTokens.find((t) => t.id === armedWeld.fragId);
    if (!frag || tokenLaneName(frag) !== "upper") {
      armedWeld = null;
    }
  }
}

function getArmedPairIndex() {
  if (!armedWeld?.fragId || !armedWeld?.baseId) return -1;
  return findAdjacentPairIndexByTokenIds(armedWeld.fragId, armedWeld.baseId);
}

function findAdjacentPairIndexByTokenIds(aId, bId) {
  if (!aId || !bId) return -1;
  for (let i = 0; i < workTokens.length - 1; i += 1) {
    const leftId = workTokens[i]?.id;
    const rightId = workTokens[i + 1]?.id;
    if (!leftId || !rightId) continue;
    if ((leftId === aId && rightId === bId) || (leftId === bId && rightId === aId)) {
      return i;
    }
  }
  return -1;
}

function buildPivotPickMap(tokens) {
  const map = {};

  const fragIndex = tokens.findIndex((t) => tokenLaneName(t) === "upper");
  if (fragIndex < 0) return map;
  const fragId = tokens[fragIndex]?.id || "";

  const neighbors = [fragIndex - 1, fragIndex + 1].filter(
    (idx) => idx >= 0 && idx < tokens.length && tokenLaneName(tokens[idx]) === "base"
  );

  for (const baseIndex of neighbors) {
    const pairIndex = Math.min(fragIndex, baseIndex);
    const leftTok = tokens[pairIndex];
    const rightTok = tokens[pairIndex + 1];
    if (!leftTok || !rightTok) continue;

    const options = collectOverlapOptions(leftTok.text, rightTok.text);
    if (!options.length) continue;

    map[baseIndex] = {
      pairIndex,
      baseIsLeft: baseIndex === pairIndex,
      options,
      fragId,
    };
  }

  return map;
}

function renderPivotPickMarkup(text, pickedRange) {
  const words = splitWordsRaw(text);
  if (!words.length) return escapeHtml(String(text || ""));

  return words.map((word, idx) => {
    const classes = ["pivot-word"];
    if (pickedRange && idx >= pickedRange.start && idx <= pickedRange.end) {
      classes.push("pivot-picked");
    }
    return `<span class="${classes.join(" ")}" data-pivot-word-index="${idx}">${escapeHtml(word)}</span>`;
  }).join(" ");
}

function getArmedRangeForBaseToken(baseTokenId, pickCtx) {
  if (!armedWeld || armedWeld.baseId !== baseTokenId) return null;
  const pairIdx = getArmedPairIndex();
  if (pairIdx < 0 || pairIdx !== pickCtx.pairIndex) return null;
  if (!Number.isInteger(armedWeld.baseRangeStart) || !Number.isInteger(armedWeld.baseRangeEnd)) {
    return null;
  }
  return { start: armedWeld.baseRangeStart, end: armedWeld.baseRangeEnd };
}

function collectOverlapOptions(leftText, rightText) {
  const leftWords = splitWordsRaw(leftText);
  const rightWords = splitWordsRaw(rightText);
  const leftNorm = leftWords.map(normalizeWord);
  const rightNorm = rightWords.map(normalizeWord);
  const options = [];

  for (let i = 0; i < leftNorm.length; i += 1) {
    for (let j = 0; j < rightNorm.length; j += 1) {
      let k = 0;
      while (
        i + k < leftNorm.length &&
        j + k < rightNorm.length &&
        leftNorm[i + k] &&
        leftNorm[i + k] === rightNorm[j + k]
      ) {
        k += 1;
      }
      if (!k) continue;

      const overlapNorm = leftNorm.slice(i, i + k);
      const strongPivotWords = countStrongPivotWords(overlapNorm);
      if (strongPivotWords <= 0) continue;

      const leftRemain = leftNorm.length - (i + k);
      const rightPrefix = j;
      const touch = (leftRemain === 0 ? 1 : 0) + (rightPrefix === 0 ? 1 : 0);
      const bridgeGap = leftRemain + rightPrefix;

      options.push({
        leftStart: i,
        rightStart: j,
        len: k,
        phrase: leftWords.slice(i, i + k).join(" "),
        strongPivotWords,
        touch,
        bridgeGap,
      });
    }
  }

  return options;
}

function pivotOptionKey(option) {
  return [
    Number(option?.len) || 0,
    Number(option?.strongPivotWords) || 0,
    Number(option?.touch) || 0,
    -(Number(option?.bridgeGap) || 0),
    Number(option?.leftStart) || 0,
    -(Number(option?.rightStart) || 0),
  ];
}

function computeWorkLayout(tokens, minCanvasWidth) {
  const n = tokens.length;
  const x = Array(n).fill(0);
  const lanes = tokens.map((t) => tokenLaneName(t));
  const widths = tokens.map((t) => measureTokenWidthToken(t));
  const heights = tokens.map((t, i) => measureTokenHeightToken(t, widths[i]));
  const pairInfos = [];
  const canvasInnerWidth = Math.max(220, Number(minCanvasWidth) || 260);

  for (let i = 0; i < n - 1; i += 1) {
    const info = getBestOverlap(tokens[i].text, tokens[i + 1].text);
    pairInfos.push(info);

    if (!info) {
      x[i + 1] = x[i] + widths[i] + TOKEN_GAP_WHEN_NO_OVERLAP;
      continue;
    }

    const prevPivotX = wordIndexToPxToken(tokens[i], info.leftStart);
    const nextPivotX = wordIndexToPxToken(tokens[i + 1], info.rightStart);
    x[i + 1] = x[i] + prevPivotX - nextPivotX;
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxRight = 0;
  for (let i = 0; i < x.length; i += 1) {
    if (x[i] < minX) minX = x[i];
    const right = x[i] + widths[i];
    if (right > maxRight) maxRight = right;
  }

  if (!Number.isFinite(minX)) minX = 0;
  const leftBound = WORK_PAD_X;
  const rightBound = canvasInnerWidth - WORK_PAD_X;
  const availableWidth = Math.max(80, rightBound - leftBound);
  const span = Math.max(0, maxRight - minX);

  let shift = 0;
  if (span <= availableWidth) {
    const targetLeft = leftBound + Math.floor((availableWidth - span) / 2);
    shift = targetLeft - minX;
  } else {
    shift = leftBound - minX;
  }
  for (let i = 0; i < n; i += 1) {
    x[i] += shift;
  }

  // Ensure fragment lane tokens stay in-bounds without breaking relative overlap math.
  for (let i = 0; i < n; i += 1) {
    if (lanes[i] !== "upper") continue;
    const minLeft = WORK_PAD_X;
    const maxLeft = Math.max(minLeft, canvasInnerWidth - widths[i] - WORK_PAD_X);
    if (x[i] < minLeft) x[i] = minLeft;
    if (x[i] > maxLeft) x[i] = maxLeft;
  }

  let leftMost = Number.POSITIVE_INFINITY;
  let rightMost = 0;
  for (let i = 0; i < n; i += 1) {
    if (x[i] < leftMost) leftMost = x[i];
    const right = x[i] + widths[i];
    if (right > rightMost) rightMost = right;
  }

  let canvasWidth = canvasInnerWidth;
  if (rightMost + WORK_PAD_X > canvasWidth) {
    canvasWidth = Math.ceil(rightMost + WORK_PAD_X);
  }
  if (leftMost < WORK_PAD_X) {
    const push = WORK_PAD_X - leftMost;
    for (let i = 0; i < n; i += 1) x[i] += push;
    canvasWidth += push;
  }

  const upperIndices = lanes
    .map((lane, i) => (lane === "upper" ? i : -1))
    .filter((i) => i >= 0);
  let upperMaxHeight = 28;
  for (const i of upperIndices) {
    if (heights[i] > upperMaxHeight) upperMaxHeight = heights[i];
  }
  const upperY = WORK_TOP_PAD + WORK_TIP_HEIGHT;
  const baseY = upperY + upperMaxHeight + WORK_LANE_GAP;
  const y = lanes.map((lane) => (lane === "upper" ? upperY : baseY));

  const tipX = [];
  const tipY = [];
  for (let i = 0; i < pairInfos.length; i += 1) {
    const info = pairInfos[i];
    if (!info) {
      tipX.push(0);
      tipY.push(Math.max(2, upperY - WORK_TIP_HEIGHT + 2));
      continue;
    }
    const rawTipX = x[i + 1] + wordIndexToPxToken(tokens[i + 1], info.rightStart);
    const clampedTipX = Math.max(WORK_PAD_X + 22, Math.min(rawTipX, canvasWidth - WORK_PAD_X - 22));
    tipX.push(clampedTipX);
    tipY.push(Math.max(2, Math.min(y[i], y[i + 1]) - WORK_TIP_HEIGHT + 2));
  }

  let maxBottom = 0;
  for (let i = 0; i < n; i += 1) {
    const bottom = y[i] + heights[i];
    if (bottom > maxBottom) maxBottom = bottom;
  }
  const canvasHeight = Math.max(96, maxBottom + WORK_BOTTOM_PAD);
  return { x, y, lanes, widths, heights, pairInfos, tipX, tipY, canvasWidth, canvasHeight };
}

function tokenLaneName(token) {
  if (token?.lane === "base") return "base";
  if (token?.lane === "upper") return "upper";
  return token?.welded ? "base" : "upper";
}

function getWorkTokenStyle(token) {
  const text = String(token?.text || "");
  const len = text.length;

  if (token?.welded) {
    return {
      fontSize: 13,
      padX: 10,
      padY: 6,
      lineHeight: 1.25,
      wrap: true,
      maxWidth: WELDED_MAX_WIDTH,
    };
  }

  let fontSize = 13;
  let padX = 10;
  let padY = 6;
  if (len >= 42) {
    fontSize = 12;
    padX = 9;
    padY = 5;
  } else if (len >= 32) {
    fontSize = 12;
  }

  const wrap = len >= WORK_WRAP_THRESHOLD;
  return {
    fontSize,
    padX,
    padY,
    lineHeight: wrap ? 1.2 : 1.2,
    wrap,
    maxWidth: wrap ? WORK_WRAP_MAX_WIDTH : Number.POSITIVE_INFINITY,
  };
}

function tokenLaneY(token) {
  if (token?.lane === "base") return WORK_Y_BASE;
  if (token?.lane === "upper") return WORK_Y_UPPER;
  return token?.welded ? WORK_Y_BASE : WORK_Y_UPPER;
}

function measureTokenWidthToken(token) {
  const text = String(token?.text || "");
  const style = getWorkTokenStyle(token);
  const raw = Math.ceil(style.padX * 2 + measureTextPx(text, style.fontSize) + 2);
  if (Number.isFinite(style.maxWidth)) return Math.min(raw, style.maxWidth);
  return raw;
}

function measureTokenHeightToken(token, tokenWidth) {
  const text = String(token?.text || "");
  const style = getWorkTokenStyle(token);
  const width = Number.isFinite(tokenWidth) ? tokenWidth : measureTokenWidthToken(token);
  let lines = 1;
  if (style.wrap) {
    const words = splitWordsRaw(text);
    const innerMax = Math.max(24, width - style.padX * 2);
    lines = estimateWrappedLineCount(words, innerMax, style.fontSize);
  }
  const linePx = style.fontSize * style.lineHeight;
  return Math.ceil(lines * linePx + style.padY * 2 + 2);
}

function measureTokenWidth(text) {
  return Math.ceil(TOKEN_PAD_X * 2 + measureTextPx(String(text || "")) + 2);
}

function wordIndexToPxToken(token, wordIndex) {
  const text = String(token?.text || "");
  const words = splitWordsRaw(text);
  const idx = Math.max(0, Math.min(Number(wordIndex) || 0, words.length));
  const style = getWorkTokenStyle(token);
  const tokenWidth = measureTokenWidthToken(token);

  if (style.wrap) {
    const innerMax = Math.max(24, tokenWidth - style.padX * 2);
    const wrappedX = wrappedWordStartPx(words, idx, innerMax, style.fontSize);
    const raw = Math.ceil(style.padX + wrappedX);
    return Math.max(style.padX, Math.min(raw, tokenWidth - style.padX));
  }

  const prefix = words.slice(0, idx).join(" ");
  const prefixWithSpace = prefix ? `${prefix} ` : "";
  const raw = Math.ceil(style.padX + measureTextPx(prefixWithSpace, style.fontSize));
  return Math.max(style.padX, Math.min(raw, tokenWidth - style.padX));
}

function wrappedWordStartPx(words, index, maxInnerWidth, fontSize = 13) {
  const safeWords = Array.isArray(words) ? words : [];
  const idx = Math.max(0, Math.min(Number(index) || 0, safeWords.length));
  let lineWidth = 0;

  for (let i = 0; i < idx; i += 1) {
    const w = safeWords[i];
    if (!w) continue;
    const seg = lineWidth === 0 ? w : ` ${w}`;
    const segW = measureTextPx(seg, fontSize);
    if (lineWidth > 0 && lineWidth + segW > maxInnerWidth) {
      lineWidth = measureTextPx(w, fontSize);
    } else {
      lineWidth += segW;
    }
  }

  if (idx >= safeWords.length) {
    return Math.max(0, Math.min(lineWidth, maxInnerWidth));
  }

  const target = safeWords[idx];
  const leadSpaceW = lineWidth === 0 ? 0 : measureTextPx(" ", fontSize);
  const targetSegW = lineWidth === 0 ? measureTextPx(target, fontSize) : measureTextPx(` ${target}`, fontSize);
  if (lineWidth > 0 && lineWidth + targetSegW > maxInnerWidth) {
    return 0;
  }
  return lineWidth + leadSpaceW;
}

function estimateWrappedLineCount(words, maxInnerWidth, fontSize) {
  const safeWords = Array.isArray(words) ? words.filter(Boolean) : [];
  if (!safeWords.length) return 1;

  let lines = 1;
  let lineWidth = 0;
  for (let i = 0; i < safeWords.length; i += 1) {
    const w = safeWords[i];
    const seg = lineWidth === 0 ? w : ` ${w}`;
    const segW = measureTextPx(seg, fontSize);
    if (lineWidth > 0 && lineWidth + segW > maxInnerWidth) {
      lines += 1;
      lineWidth = measureTextPx(w, fontSize);
      continue;
    }
    lineWidth += segW;
  }
  return Math.max(1, lines);
}

function measureTextPx(text, fontSize = 13) {
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d");
  }
  if (!measureCtx) return String(text || "").length * 7;
  measureCtx.font = `900 ${fontSize}px Arial, sans-serif`;
  return measureCtx.measureText(String(text || "")).width;
}

function applyAdaptiveTokenStyle(el, text, opts) {
  const cfg = opts || {};
  const welded = !!cfg.welded;
  const inBank = !!cfg.inBank;
  const t = String(text || "");
  const len = t.length;

  if (welded) {
    el.style.fontSize = "13px";
    el.style.padding = "6px 10px";
    el.style.maxWidth = `${WELDED_MAX_WIDTH}px`;
    el.style.whiteSpace = "normal";
    el.style.lineHeight = "1.25";
    el.style.textAlign = "left";
    return;
  }

  if (inBank) {
    let size = 13;
    let py = 6;
    let px = 10;
    if (len >= 28) size = 12;
    if (len >= 40) size = 11;
    if (len >= 52) {
      size = 10;
      py = 5;
      px = 8;
    }
    el.style.fontSize = `${size}px`;
    el.style.padding = `${py}px ${px}px`;
    if (len >= 36) {
      el.style.maxWidth = "170px";
      el.style.whiteSpace = "normal";
      el.style.lineHeight = "1.2";
      el.style.textAlign = "left";
    }
    return;
  }

  if (len >= 42) {
    el.style.fontSize = "12px";
    el.style.padding = "5px 9px";
  } else if (len >= 32) {
    el.style.fontSize = "12px";
  }
  if (len >= WORK_WRAP_THRESHOLD) {
    el.style.maxWidth = `${WORK_WRAP_MAX_WIDTH}px`;
    el.style.whiteSpace = "normal";
    el.style.lineHeight = "1.2";
    el.style.textAlign = "left";
  }
}

function countWords(text) {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

function weldAt(index) {
  if (isAnimatingWeld) return;
  if (index < 0 || index >= workTokens.length - 1) return;
  const q = questions[currentIndex];
  const left = workTokens[index];
  const right = workTokens[index + 1];

  let plan = null;
  if (left?.welded && !right?.welded) {
    plan = pickBestPlan(buildMergePlans(left.text, right.text, "lr"), q.answerEnglish);
  } else if (!left?.welded && right?.welded) {
    plan = pickBestPlan(buildMergePlans(right.text, left.text, "rl"), q.answerEnglish);
  }
  if (!plan) {
    plan = chooseMergePlan(left.text, right.text, q.answerEnglish);
  }

  const merged = {
    id: `w_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
    text: plan?.mergedText || `${left.text} ${right.text}`.replace(/\s+/g, " ").trim(),
    color: "#ffffff",
    sources: uniqSorted([...(left.sources || []), ...(right.sources || [])]),
    welded: true,
    lane: "base",
  };

  const finalize = () => {
    pendingBangTokenId = merged.id;
    workTokens.splice(index, 2, merged);
    armedWeld = null;
    isAnimatingWeld = false;
    renderOverlapUI();
  };

  if (shouldAnimateSqueeze(plan)) {
    isAnimatingWeld = true;
    animateSqueezeInsertion(index, plan, finalize);
    return;
  }

  finalize();
}

function chooseMergePlan(leftText, rightText, answerText) {
  const candidates = [
    ...buildMergePlans(leftText, rightText, "lr"),
    ...buildMergePlans(rightText, leftText, "rl"),
  ];

  if (!candidates.length) {
    const fallbackWords = collapseAdjacentDuplicateDeterminers([
      ...splitWordsRaw(leftText),
      ...splitWordsRaw(rightText),
    ]);
    return {
      direction: "lr",
      mergedText: fallbackWords.join(" ").replace(/\s+/g, " ").trim(),
      info: null,
      insertWords: [],
      baseLeadWords: splitWordsRaw(leftText),
      baseTrailWords: [],
    };
  }

  return pickBestPlan(candidates, answerText);
}

function pickBestPlan(candidates, answerText) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  let best = candidates[0];
  let bestScore = distanceToAnswer(best.mergedText, answerText);
  for (let i = 1; i < candidates.length; i += 1) {
    const d = distanceToAnswer(candidates[i].mergedText, answerText);
    if (d < bestScore) {
      bestScore = d;
      best = candidates[i];
      continue;
    }
    if (d === bestScore) {
      const curOverlap = Number(candidates[i]?.info?.len || 0);
      const bestOverlap = Number(best?.info?.len || 0);
      if (curOverlap > bestOverlap) {
        best = candidates[i];
      }
    }
  }
  return best;
}

function buildMergePlans(baseText, addonText, direction) {
  const info = getBestOverlap(baseText, addonText);
  if (!info) return [];

  const baseWords = splitWordsRaw(baseText);
  const addonWords = splitWordsRaw(addonText);

  const basePrefixWords = baseWords.slice(0, info.leftStart);
  const overlapWords = baseWords.slice(info.leftStart, info.leftStart + info.len);
  const baseSuffixWords = baseWords.slice(info.leftStart + info.len);
  const insertWords = addonWords.slice(0, info.rightStart);
  const addonSuffixWords = addonWords.slice(info.rightStart + info.len);

  const plans = [];

  // Variant A: addon prefix is inserted before overlap.
  const mergedA = [
    ...basePrefixWords,
    ...insertWords,
    ...overlapWords,
    ...baseSuffixWords,
    ...addonSuffixWords,
  ];
  const mergedAClean = collapseAdjacentDuplicateDeterminers(mergedA);
  plans.push({
    direction,
    info,
    variant: "before_overlap",
    mergedText: mergedAClean.join(" ").replace(/\s+/g, " ").trim(),
    insertWords: insertWords.slice(),
    baseLeadWords: basePrefixWords.slice(),
    baseTrailWords: [...overlapWords, ...baseSuffixWords],
  });

  // Variant B: addon suffix is inserted between overlap and base suffix.
  const mergedB = [
    ...basePrefixWords,
    ...insertWords,
    ...overlapWords,
    ...addonSuffixWords,
    ...baseSuffixWords,
  ];
  const mergedBClean = collapseAdjacentDuplicateDeterminers(mergedB);
  plans.push({
    direction,
    info,
    variant: "after_overlap",
    mergedText: mergedBClean.join(" ").replace(/\s+/g, " ").trim(),
    insertWords: addonSuffixWords.length ? addonSuffixWords.slice() : insertWords.slice(),
    baseLeadWords: addonSuffixWords.length
      ? [...basePrefixWords, ...overlapWords]
      : basePrefixWords.slice(),
    baseTrailWords: addonSuffixWords.length
      ? baseSuffixWords.slice()
      : [...overlapWords, ...baseSuffixWords],
  });

  return plans;
}

function shouldAnimateSqueeze(plan) {
  if (!plan || !plan.info) return false;
  return Array.isArray(plan.insertWords) && plan.insertWords.length > 0;
}

function animateSqueezeInsertion(index, plan, done) {
  const canvas = document.querySelector("#work-area .work-canvas");
  if (!canvas || !lastWorkLayout) {
    done();
    return;
  }

  const baseIndex = plan.direction === "lr" ? index : (index + 1);
  const addonIndex = plan.direction === "lr" ? (index + 1) : index;
  const baseToken = workTokens[baseIndex];
  const addonToken = workTokens[addonIndex];
  if (!baseToken || !addonToken) {
    done();
    return;
  }

  const baseBtn = canvas.querySelector(`.frag-node[data-idx="${baseIndex}"] .frag-token`);
  const addonBtn = canvas.querySelector(`.frag-node[data-idx="${addonIndex}"] .frag-token`);
  if (!baseBtn || !addonBtn) {
    done();
    return;
  }

  const insertText = plan.insertWords.join(" ").trim();
  if (!insertText) {
    done();
    return;
  }

  const baseX = Number(lastWorkLayout.x?.[baseIndex] ?? 0);
  const addonX = Number(lastWorkLayout.x?.[addonIndex] ?? 0);
  const baseY = Number(lastWorkLayout.y?.[baseIndex] ?? WORK_Y_BASE);
  const addonY = Number(lastWorkLayout.y?.[addonIndex] ?? WORK_Y_UPPER);
  const baseBg = baseToken.welded ? "#ffffff" : (baseToken.color || "#ffffff");
  const addonBg = addonToken.welded ? "#ffffff" : (addonToken.color || "#ffffff");

  const preText = (plan.baseLeadWords || []).join(" ").trim();
  const tailText = (plan.baseTrailWords || []).join(" ").trim();

  const preW = preText ? measureTokenWidth(preText) : 0;
  const openPx = Math.max(22, Math.min(46, Math.floor(measureTokenWidth(insertText) * 0.42)));

  const preStartX = baseX;
  const tailStartX = baseX + (preText ? preW : 0);
  const preEndX = preStartX - Math.floor(openPx / 2);
  const tailEndX = tailStartX + Math.ceil(openPx / 2);
  const insertEndX = preEndX + (preText ? preW : 0) + 4;

  baseBtn.style.visibility = "hidden";
  addonBtn.style.visibility = "hidden";

  const created = [];
  const mk = (text, bg, x, y, z) => {
    const el = document.createElement("div");
    el.className = "frag-token squeeze-ghost";
    el.style.background = bg;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.zIndex = String(z);
    el.textContent = text;
    canvas.appendChild(el);
    created.push(el);
    return el;
  };

  const preEl = preText ? mk(preText, baseBg, preStartX, baseY, 80) : null;
  const tailEl = tailText ? mk(tailText, baseBg, tailStartX, baseY, 80) : null;
  const insEl = mk(insertText, addonBg, addonX, addonY, 90);
  insEl.style.opacity = "0.2";
  insEl.style.transform = "scale(0.92)";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (preEl) preEl.style.left = `${preEndX}px`;
      if (tailEl) tailEl.style.left = `${tailEndX}px`;
      insEl.style.left = `${insertEndX}px`;
      insEl.style.top = `${baseY}px`;
      insEl.style.opacity = "1";
      insEl.style.transform = "scale(1)";
    });
  });

  setTimeout(() => {
    created.forEach((el) => el.remove());
    done();
  }, 260);
}

function distanceToAnswer(candidateText, answerText) {
  const a = normalizeEnglishForCompare(candidateText).split(" ").filter(Boolean);
  const b = normalizeEnglishForCompare(answerText).split(" ").filter(Boolean);
  return levenshteinWords(a, b);
}

function levenshteinWords(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i += 1) dp[i][0] = i;
  for (let j = 0; j <= m; j += 1) dp[0][j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[n][m];
}

function getBestOverlap(leftText, rightText) {
  const options = collectOverlapOptions(leftText, rightText);
  if (!options.length) return null;

  let best = options[0];
  let bestKey = pivotOptionKey(best);
  for (let i = 1; i < options.length; i += 1) {
    const key = pivotOptionKey(options[i]);
    if (isLexicographicallyGreater(key, bestKey)) {
      best = options[i];
      bestKey = key;
    }
  }
  return {
    leftStart: best.leftStart,
    rightStart: best.rightStart,
    len: best.len,
    phrase: best.phrase,
  };
}

function countStrongPivotWords(normWords) {
  const arr = Array.isArray(normWords) ? normWords : [];
  let strong = 0;
  for (let i = 0; i < arr.length; i += 1) {
    const w = String(arr[i] || "").trim();
    if (!w) continue;
    if (WEAK_PIVOT_WORDS.has(w)) continue;
    strong += 1;
  }
  return strong;
}

function collapseAdjacentDuplicateDeterminers(words) {
  const src = Array.isArray(words) ? words : [];
  const out = [];
  for (let i = 0; i < src.length; i += 1) {
    const w = String(src[i] ?? "").trim();
    if (!w) continue;

    const prev = out.length ? out[out.length - 1] : "";
    const prevNorm = normalizeWord(prev);
    const curNorm = normalizeWord(w);
    if (
      prevNorm &&
      curNorm &&
      prevNorm === curNorm &&
      DUPLICATE_COLLAPSE_WORDS.has(curNorm)
    ) {
      continue;
    }
    out.push(w);
  }
  return out;
}

function isLexicographicallyGreater(a, b) {
  if (!a) return false;
  if (!b) return true;
  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return false;
}

function splitWordsRaw(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean);
}

function normalizeWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function currentSentenceForGrading() {
  if (!workTokens.length) return "";
  if (workTokens.length === 1) return workTokens[0].text;
  return workTokens.map((t) => t.text).join(" ").replace(/\s+/g, " ").trim();
}

function submitCurrent() {
  const q = questions[currentIndex];
  if (!q || isLocked || isAnimatingWeld) return;

  const userSentence = currentSentenceForGrading();
  const ok =
    normalizeEnglishForCompare(userSentence) === normalizeEnglishForCompare(q.answerEnglish);

  upsertResult({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Pleks L2-E2 / Q${q.qNumber}`,
    question: NO_KOREAN_PROMPT,
    selected: userSentence || "무응답",
    correct: ok,
    modelAnswer: q.answerEnglish,
  });

  if (!ok) {
    showToast("no", "오답...");
    return;
  }

  isLocked = true;
  workTokens = workTokens.map((t) => ({ ...t, welded: true, color: "#ffffff", lane: "base" }));
  armedWeld = null;

  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");
  if (nextBtn) nextBtn.disabled = false;
  if (submitBtn) submitBtn.disabled = true;

  renderOverlapUI();
  showToast("ok", "정답!");
}

function goNext() {
  if (isAnimatingWeld) return;
  const q = questions[currentIndex];
  if (q && !isLocked) {
    const userSentence = currentSentenceForGrading();
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L2-E2 / Q${q.qNumber}`,
      question: NO_KOREAN_PROMPT,
      selected: userSentence || "무응답",
      correct: false,
      modelAnswer: q.answerEnglish,
    });
  }

  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function upsertResult(record) {
  const i = results.findIndex((r) => Number(r.qNumber) === Number(record.qNumber));
  if (i >= 0) results[i] = record;
  else results.push(record);
}

function showResultPopup() {
  const ordered = questions.map((q, i) => {
    const found = results.find((x) => Number(x.qNumber) === Number(q.qNumber));
    return (
      found || {
        no: i + 1,
        qNumber: q.qNumber,
        word: `Pleks L2-E2 / Q${q.qNumber}`,
        question: NO_KOREAN_PROMPT,
        selected: "무응답",
        correct: false,
        modelAnswer: q.answerEnglish,
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

  alert("결과표 모듈을 찾지 못했습니다.");
}

function showToast(type, message) {
  if (window.PleksToastFX?.show) {
    window.PleksToastFX.show(type, message);
    return;
  }
}

function normalizeEnglishForCompare(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/[.!?]\s*$/, "")
    .trim();
}

function uniqSorted(arr) {
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
