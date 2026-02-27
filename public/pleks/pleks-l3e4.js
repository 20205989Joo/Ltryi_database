// pleks-l3e4.js
// L3-E4 draft:
// Stage1) drag/click chunk -> sentence token highlight
// Final) Korean scramble (PleksScramble)

const EXCEL_FILE = "LTRYI-pleks-lesson-questions.xlsx";
const DESC_FILE = "LTRYI-pleks-lesson-desc.xlsx";

const TARGET_LESSON = 3;
const TARGET_EXERCISE = 4;
const MAX_QUESTIONS = 0; // 0 = all

let subcategory = "Grammar";
let level = "Basic";
let day = "309";
let quizTitle = "quiz_Grammar_Basic_309";
let userId = "";

let rawRows = [];
let descRows = [];
let questions = [];
let currentIndex = 0;
let results = [];

let lessonTitle = "";
let exerciseTitle = "";

let stageChunks = [];
let activeChunkId = null;
let draggingChunkId = null;
let bankTokens = [];
let selectedTokens = [];
let midUnits = [];
let megaUnits = [];
let midPopupUnitIdx = -1;
let midPopupBankTokens = [];
let midPopupSelectedTokens = [];
let megaPopupUnitIdx = -1;
let megaPopupBankTokens = [];
let megaPopupSelectedTokens = [];
let sourceCollapsed = false;
let sourceAutoArmed = true;
let isLocked = false;
let stageResizeBound = false;
let previewChunkId = null;
let previewTokenIdx = -1;
let zoomState = {
  open: false,
  chunkId: null,
  dragging: false,
  dragCurrentIdx: -1,
  pointerId: null,
  contextStart: -1,
  contextEnd: -1,
  lineByIdx: {},
  lastPointerX: -1,
  lastPointerY: -1,
};
const SIMPLE_DRAG_GUIDE = "\u0043hunk\ub97c \ub4dc\ub798\uadf8\ud574\ubcf4\uc138\uc694!";

const INDEX_KEYS = ["Index", "ChunkIndex", "ChunkIndices", "Indices"];
const LASSO_KEYS = ["LassoIndex", "LassoIndices", "ScopeIndex", "ScopeIndices", "ChunkScopeIndex"];
const BE_FORMS = new Set(["be", "am", "is", "are", "was", "were", "been", "being"]);
const HAVE_FORMS = new Set(["have", "has", "had", "having"]);
const DO_FORMS = new Set(["do", "does", "did", "doing", "done"]);
const CHUNK_THEMES = [
  {
    fill: "#ffe8b9",
    soft: "#fff3dd",
    border: "#e0a23f",
    overlay: "rgba(255, 244, 228, 0.92)",
    glow: "rgba(224, 162, 63, 0.45)",
  },
  {
    fill: "#dceeff",
    soft: "#eef7ff",
    border: "#71a8e0",
    overlay: "rgba(238, 247, 255, 0.92)",
    glow: "rgba(113, 168, 224, 0.45)",
  },
  {
    fill: "#e0f8dc",
    soft: "#effceb",
    border: "#84ca79",
    overlay: "rgba(239, 252, 236, 0.92)",
    glow: "rgba(132, 202, 121, 0.42)",
  },
  {
    fill: "#ffe0ef",
    soft: "#fff0f7",
    border: "#e191ba",
    overlay: "rgba(255, 240, 247, 0.92)",
    glow: "rgba(225, 145, 186, 0.45)",
  },
  {
    fill: "#ece1ff",
    soft: "#f5eeff",
    border: "#ac8edf",
    overlay: "rgba(245, 238, 255, 0.92)",
    glow: "rgba(172, 142, 223, 0.45)",
  },
];

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
    alert("Failed to load Excel file.\n" + EXCEL_FILE);
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

function getQuizMountEl() {
  return document.getElementById("quiz-content") || document.getElementById("quiz-area");
}

function clearPreviewState() {
  previewChunkId = null;
  previewTokenIdx = -1;
}

function resetZoomState() {
  zoomState = {
    open: false,
    chunkId: null,
    dragging: false,
    dragCurrentIdx: -1,
    pointerId: null,
    contextStart: -1,
    contextEnd: -1,
    lineByIdx: {},
    lastPointerX: -1,
    lastPointerY: -1,
  };
}

function applyPreviewFeedback() {
  renderSentenceArea();
  updatePreviewChipVisual();
}

function updatePreviewState(chunkId, tokenIdx) {
  let nextChunkId = null;
  let nextTokenIdx = -1;

  if (Number.isInteger(chunkId) && Number.isInteger(tokenIdx)) {
    const ch = stageChunks.find((x) => x.id === chunkId);
    const targets = Array.isArray(ch?.targetIndices) ? ch.targetIndices : [];
    if (ch && !ch.matched && targets.includes(tokenIdx)) {
      nextChunkId = chunkId;
      nextTokenIdx = tokenIdx;
    }
  }

  const changed = previewChunkId !== nextChunkId || previewTokenIdx !== nextTokenIdx;
  previewChunkId = nextChunkId;
  previewTokenIdx = nextTokenIdx;
  return changed;
}

function resolveChunkIdFromDragEvent(ev) {
  if (Number.isInteger(draggingChunkId)) return draggingChunkId;

  let chunkId = Number.NaN;
  if (ev?.dataTransfer) {
    chunkId = Number(ev.dataTransfer.getData("text/plain"));
  }
  if (!Number.isInteger(chunkId)) {
    chunkId = Number(activeChunkId);
  }
  return Number.isInteger(chunkId) ? chunkId : null;
}

function getChunkById(chunkId) {
  return stageChunks.find((x) => Number(x.id) === Number(chunkId)) || null;
}

function getChunkTheme(chunkId) {
  const n = CHUNK_THEMES.length;
  if (!n) return null;
  const i = ((Number(chunkId) % n) + n) % n;
  return CHUNK_THEMES[i];
}

function applyZoomThemeVars(theme) {
  const overlay = document.getElementById("zoom-overlay");
  const card = document.getElementById("zoom-card");
  if (!overlay || !card || !theme) return;

  [overlay, card].forEach((el) => {
    el.style.setProperty("--chunk-fill", theme.fill);
    el.style.setProperty("--chunk-soft", theme.soft);
    el.style.setProperty("--chunk-border", theme.border);
    el.style.setProperty("--chunk-overlay", theme.overlay);
    el.style.setProperty("--chunk-glow", theme.glow);
  });
}

function captureSentenceLineMap() {
  const sentenceArea = document.getElementById("sentence-area");
  const out = {};
  if (!sentenceArea) return out;

  const tokens = Array.from(sentenceArea.querySelectorAll("[data-token-idx]"));
  let prevTop = null;
  let lineNo = 0;

  tokens.forEach((node) => {
    const idx = Number(node.getAttribute("data-token-idx"));
    if (!Number.isInteger(idx)) return;

    const rect = node.getBoundingClientRect();
    const top = Math.round(rect.top);
    if (prevTop == null) {
      prevTop = top;
    } else if (Math.abs(top - prevTop) > 4) {
      lineNo += 1;
      prevTop = top;
    }
    out[idx] = lineNo;
  });

  return out;
}

function computeZoomWindow(chunk, sentenceTokens) {
  const total = Array.isArray(sentenceTokens) ? sentenceTokens.length : 0;
  if (!chunk || !total) return { start: 0, end: -1 };

  const targets = Array.isArray(chunk.targetIndices) ? chunk.targetIndices : [];
  const expectedScope = Array.isArray(chunk.expectedScopeIndices) ? chunk.expectedScopeIndices : [];
  const seed = [...targets, ...expectedScope]
    .map((x) => Number(x))
    .filter((x) => Number.isInteger(x) && x >= 0 && x < total);
  if (!seed.length) return { start: 0, end: total - 1 };

  const minIdx = Math.min(...seed);
  const maxIdx = Math.max(...seed);
  const pad = 5;
  return {
    start: Math.max(0, minIdx - pad),
    end: Math.min(total - 1, maxIdx + pad),
  };
}

function findNearestZoomTokenIdxFromPoint(clientX, clientY) {
  const sentence = document.getElementById("zoom-sentence");
  if (!sentence) return null;

  const direct = document.elementFromPoint(clientX, clientY)?.closest?.("[data-zoom-idx]");
  if (direct && sentence.contains(direct)) {
    const idx = Number(direct.getAttribute("data-zoom-idx"));
    if (Number.isInteger(idx)) return idx;
  }

  const tokens = Array.from(sentence.querySelectorAll("[data-zoom-idx]"));
  let bestIdx = null;
  let bestScore = Infinity;
  tokens.forEach((node) => {
    const idx = Number(node.getAttribute("data-zoom-idx"));
    if (!Number.isInteger(idx)) return;
    const r = node.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = cx - clientX;
    const dy = (cy - clientY) * 1.2;
    const score = dx * dx + dy * dy;
    if (score < bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  return Number.isInteger(bestIdx) ? bestIdx : null;
}

function getZoomTokenRect(idx) {
  const sentence = document.getElementById("zoom-sentence");
  if (!sentence || !Number.isInteger(idx)) return null;
  const node = sentence.querySelector(`[data-zoom-idx="${idx}"]`);
  if (!node) return null;
  return node.getBoundingClientRect();
}

function getChunkLassoStartPoint(chunk) {
  if (!chunk || !Array.isArray(chunk.targetIndices) || !chunk.targetIndices.length) return null;

  const minIdx = Math.min(...chunk.targetIndices);
  const maxIdx = Math.max(...chunk.targetIndices);
  const minRect = getZoomTokenRect(minIdx);
  const maxRect = getZoomTokenRect(maxIdx);
  if (!minRect || !maxRect) return null;

  if (Number.isInteger(zoomState.dragCurrentIdx)) {
    if (zoomState.dragCurrentIdx > maxIdx) {
      return { x: maxRect.right, y: maxRect.top + maxRect.height / 2 };
    }
    if (zoomState.dragCurrentIdx < minIdx) {
      return { x: minRect.left, y: minRect.top + minRect.height / 2 };
    }
  }

  const left = Math.min(minRect.left, maxRect.left);
  const right = Math.max(minRect.right, maxRect.right);
  const top = Math.min(minRect.top, maxRect.top);
  const bottom = Math.max(minRect.bottom, maxRect.bottom);
  return { x: (left + right) / 2, y: (top + bottom) / 2 };
}

function updateZoomLassoVisual() {
  const lasso = document.getElementById("zoom-lasso");
  const card = document.getElementById("zoom-card");
  const chunk = getChunkById(zoomState.chunkId);
  if (!lasso || !card || !zoomState.open || !zoomState.dragging || !chunk) {
    if (lasso) lasso.classList.remove("show");
    return;
  }

  const cardRect = card.getBoundingClientRect();
  const start = getChunkLassoStartPoint(chunk);
  if (!start) {
    lasso.classList.remove("show");
    return;
  }

  let endX = zoomState.lastPointerX;
  let endY = zoomState.lastPointerY;
  const focusRect = getZoomTokenRect(zoomState.dragCurrentIdx);
  if (focusRect) {
    endX = focusRect.left + focusRect.width / 2;
    endY = focusRect.top + focusRect.height / 2;
  }
  if (!Number.isFinite(endX) || !Number.isFinite(endY)) {
    lasso.classList.remove("show");
    return;
  }

  const sx = start.x - cardRect.left;
  const sy = start.y - cardRect.top;
  const ex = endX - cardRect.left;
  const ey = endY - cardRect.top;
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.max(8, Math.sqrt(dx * dx + dy * dy));
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;

  lasso.style.left = `${sx}px`;
  lasso.style.top = `${sy}px`;
  lasso.style.width = `${len}px`;
  lasso.style.transform = `translateY(-50%) rotate(${ang}deg)`;
  lasso.classList.add("show");
}

function getStage2Progress() {
  const total = stageChunks.filter((x) => x.matched).length;
  const done = stageChunks.filter((x) => x.matched && x.stage2Done).length;
  const doneAll = total === 0 ? true : done === total;
  return { total, done, doneAll };
}

function findChunkForZoomByTokenIdx(tokenIdx) {
  if (!Number.isInteger(tokenIdx)) return null;
  const matched = stageChunks.filter((ch) => ch.matched && ch.targetIndices?.includes(tokenIdx));
  if (!matched.length) return null;
  const pending = matched.find((ch) => !ch.stage2Done);
  return pending ? pending.id : matched[0].id;
}

function computeScopeSelectionIndices(chunk, dragCurrentIdx) {
  if (!chunk || !Array.isArray(chunk.targetIndices) || !chunk.targetIndices.length) return [];
  if (!Number.isInteger(dragCurrentIdx)) return [];

  const q = questions[currentIndex];
  const maxToken = (q?.sentenceTokens?.length || 0) - 1;
  if (maxToken < 0) return [];

  const start = Math.min(...chunk.targetIndices);
  const end = Math.max(...chunk.targetIndices);

  let s = -1;
  let e = -1;
  if (dragCurrentIdx > end) {
    s = end + 1;
    e = Math.min(dragCurrentIdx, maxToken);
  } else if (dragCurrentIdx < start) {
    s = Math.max(dragCurrentIdx, 0);
    e = start - 1;
  } else {
    return [];
  }

  if (s > e) return [];
  const out = [];
  for (let i = s; i <= e; i += 1) out.push(i);
  return out;
}

function openZoomForChunk(chunkId) {
  const ch = getChunkById(chunkId);
  const q = questions[currentIndex];
  if (!ch || !ch.matched || !q) return;
  const windowRange = computeZoomWindow(ch, q.sentenceTokens);

  zoomState.open = true;
  zoomState.chunkId = ch.id;
  zoomState.dragging = false;
  zoomState.dragCurrentIdx = -1;
  zoomState.pointerId = null;
  zoomState.contextStart = windowRange.start;
  zoomState.contextEnd = windowRange.end;
  zoomState.lineByIdx = captureSentenceLineMap();
  zoomState.lastPointerX = -1;
  zoomState.lastPointerY = -1;
  renderZoomOverlay();
}

function closeZoomOverlay() {
  resetZoomState();
  renderZoomOverlay();
}

function renderZoomOverlay() {
  const overlay = document.getElementById("zoom-overlay");
  const sentence = document.getElementById("zoom-sentence");
  if (!overlay || !sentence) return;

  if (!zoomState.open || !Number.isInteger(zoomState.chunkId)) {
    overlay.classList.remove("open");
    sentence.innerHTML = "";
    updateZoomLassoVisual();
    return;
  }

  const q = questions[currentIndex];
  const ch = getChunkById(zoomState.chunkId);
  if (!q || !ch) {
    overlay.classList.remove("open");
    sentence.innerHTML = "";
    updateZoomLassoVisual();
    return;
  }
  applyZoomThemeVars(getChunkTheme(ch.id));

  let scopeIndices = Array.isArray(ch.scopeIndices) ? ch.scopeIndices.slice() : [];
  if (zoomState.dragging) {
    scopeIndices = computeScopeSelectionIndices(ch, zoomState.dragCurrentIdx);
  }
  const scopeSet = new Set(scopeIndices);
  const anchorSet = new Set(ch.targetIndices || []);
  const start = Math.max(0, Number(zoomState.contextStart));
  const end = Math.min(q.sentenceTokens.length - 1, Number(zoomState.contextEnd));
  const lineByIdx = zoomState.lineByIdx || {};

  if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
    overlay.classList.remove("open");
    sentence.innerHTML = "";
    updateZoomLassoVisual();
    return;
  }

  const lines = [];
  let prevLine = null;

  for (let idx = start; idx <= end; idx += 1) {
    const tokenLine = Number.isInteger(lineByIdx[idx]) ? Number(lineByIdx[idx]) : null;
    if (lines.length === 0) {
      lines.push([]);
      prevLine = tokenLine;
    } else if (tokenLine != null && prevLine != null && tokenLine !== prevLine) {
      lines.push([]);
      prevLine = tokenLine;
    }

    const classes = ["z-tok"];
    if (anchorSet.has(idx)) classes.push("anchor");
    if (scopeSet.has(idx)) {
      const prevInScopeSameLine =
        scopeSet.has(idx - 1) &&
        Number.isInteger(lineByIdx[idx - 1]) &&
        Number(lineByIdx[idx - 1]) === tokenLine;
      const nextInScopeSameLine =
        scopeSet.has(idx + 1) &&
        Number.isInteger(lineByIdx[idx + 1]) &&
        Number(lineByIdx[idx + 1]) === tokenLine;

      classes.push("scope-fence");
      classes.push(zoomState.dragging ? "scope-preview" : "scope-final");
      if (!prevInScopeSameLine) classes.push("scope-start");
      if (!nextInScopeSameLine) classes.push("scope-end");
    }
    if (zoomState.dragging && zoomState.dragCurrentIdx === idx) classes.push("drag-focus");

    lines[lines.length - 1].push(
      `<span class="${classes.join(" ")}" data-zoom-idx="${idx}">${escapeHtml(q.sentenceTokens[idx])}</span>`
    );
  }

  sentence.innerHTML = lines.map((tokens) => `<div class="z-line">${tokens.join("")}</div>`).join("");

  overlay.classList.add("open");
  updateZoomLassoVisual();
}

function wireZoomInteractions() {
  const overlay = document.getElementById("zoom-overlay");
  const sentence = document.getElementById("zoom-sentence");
  if (!overlay || !sentence) return;

  overlay.addEventListener("click", (ev) => {
    if (ev.target === overlay) {
      closeZoomOverlay();
    }
  });

  sentence.addEventListener("pointerdown", (ev) => {
    if (!zoomState.open || !Number.isInteger(zoomState.chunkId)) return;
    const tok = ev.target.closest("[data-zoom-idx]");
    if (!tok) return;

    const idx = Number(tok.getAttribute("data-zoom-idx"));
    const ch = getChunkById(zoomState.chunkId);
    if (!Number.isInteger(idx) || !ch) return;
    if (!Array.isArray(ch.targetIndices) || !ch.targetIndices.includes(idx)) return;

    ev.preventDefault();
    zoomState.dragging = true;
    zoomState.dragCurrentIdx = idx;
    zoomState.pointerId = ev.pointerId;
    zoomState.lastPointerX = ev.clientX;
    zoomState.lastPointerY = ev.clientY;
    sentence.setPointerCapture(ev.pointerId);
    renderZoomOverlay();
  });

  sentence.addEventListener("pointermove", (ev) => {
    if (!zoomState.open || !zoomState.dragging) return;
    if (zoomState.pointerId !== ev.pointerId) return;

    zoomState.lastPointerX = ev.clientX;
    zoomState.lastPointerY = ev.clientY;

    const idx = findNearestZoomTokenIdxFromPoint(ev.clientX, ev.clientY);
    if (!Number.isInteger(idx)) {
      updateZoomLassoVisual();
      return;
    }
    if (zoomState.dragCurrentIdx === idx) {
      updateZoomLassoVisual();
      return;
    }

    zoomState.dragCurrentIdx = idx;
    renderZoomOverlay();
  });

  function finalizePointer(ev) {
    if (!zoomState.open || !zoomState.dragging) return;
    if (zoomState.pointerId !== ev.pointerId) return;

    const ch = getChunkById(zoomState.chunkId);
    let scope = [];
    if (ch) {
      scope = computeScopeSelectionIndices(ch, zoomState.dragCurrentIdx);
    }

    zoomState.dragging = false;
    zoomState.pointerId = null;
    zoomState.lastPointerX = -1;
    zoomState.lastPointerY = -1;
    try {
      sentence.releasePointerCapture(ev.pointerId);
    } catch (_) {}

    if (!ch || !scope.length) {
      showToast("no", "chunk 바깥 방향으로 드래그해보세요.");
      renderZoomOverlay();
      return;
    }

    const expected = Array.isArray(ch.expectedScopeIndices) ? ch.expectedScopeIndices : [];
    if (expected.length && !isSameIndexSet(scope, expected)) {
      showToast("no", "Scope mismatch. Match the exact '~' span.");
      renderZoomOverlay();
      return;
    }

    ch.scopeIndices = scope;
    ch.stage2Done = true;
    showToast("ok", "범위 확인!");
    closeZoomOverlay();
    renderStage();
  }

  sentence.addEventListener("pointerup", finalizePointer);
  sentence.addEventListener("pointercancel", finalizePointer);
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
    const parsed = parseQuestionField(String(r["Question"] ?? "").trim());
    const sentenceTokens = splitSentenceTokens(parsed.sentence);
    const transformsRaw = String(r["Transforms"] ?? r["Transform"] ?? r["TransformMap"] ?? "").trim();
    const laststageFinalRaw = String(r["Laststage-FinalSentence"] ?? r["LaststageFinalSentence"] ?? "").trim();
    const laststageKRTokensRaw = String(r["Laststage-KRTokens"] ?? r["LaststageKRTokens"] ?? "").trim();
    const midstageUnitDataRaw = String(r["Midstage-UnitData"] ?? r["MidstageUnitData"] ?? "").trim();
    const megastageUnitDataRaw = String(r["Megastage-UnitData"] ?? r["MegastageUnitData"] ?? "").trim();
    const transformMeta = parseTransformsMetaForL3E4(transformsRaw);
    const configuredKRTokens = parseLaststageKRTokensForL3E4(laststageKRTokensRaw);
    const configuredMidKoUnits = parseMidUnitsForL3E4(transformMeta.midkrunits || transformMeta.midkr || "");
    const configuredMidEnUnits = parseMidUnitsForL3E4(transformMeta.midcuts || transformMeta.midcut || "");
    const configuredMidUnitData = parseMidstageUnitDataForL3E4(midstageUnitDataRaw || transformMeta.midstageunitdata || "");
    const configuredMegaUnitData = parseMegastageUnitDataForL3E4(
      megastageUnitDataRaw || transformMeta.megastageunitdata || transformMeta.megaunitdata || ""
    );

    const indexGroups = parseChunkIndexGroups(getIndexCell(r));
    const lassoGroups = parseLassoGroups(getLassoCell(r), parsed.chunks.length);
    const midLassoGroups = collectLassoIndicesFromMidUnitData(configuredMidUnitData, parsed.chunks.length);

    const chunks = (parsed.chunks || []).map((ch, ci) => {
      const fromIndexColumn = Array.isArray(indexGroups[ci]) ? indexGroups[ci].slice() : [];
      const inferred = inferChunkTokenIndices(sentenceTokens, ch.base);
      const targetIndices = fromIndexColumn.length ? fromIndexColumn : inferred;
      const fromLassoColumn = Array.isArray(lassoGroups[ci]) ? lassoGroups[ci].slice() : [];
      const fromMidUnitData = Array.isArray(midLassoGroups[ci]) ? midLassoGroups[ci].slice() : [];
      const expectedScopeIndices = fromLassoColumn.length ? fromLassoColumn : fromMidUnitData;

      return {
        id: ci,
        base: ch.base,
        meaning: ch.meaning,
        targetIndices,
        expectedScopeIndices,
        mapSource: fromIndexColumn.length ? "index" : "auto",
        scopeSource: fromLassoColumn.length ? "lasso" : (fromMidUnitData.length ? "middata" : "none"),
      };
    });

    const answerKorean = String(r["Answer"] ?? "").trim();

    return {
      no: idx + 1,
      qNumber: Number(r["QNumber"]) || idx + 1,
      title: String(r["Title"] ?? "").trim(),
      instruction: String(r["Instruction"] ?? "").trim(),
      sentence: parsed.sentence,
      sentenceTokens,
      chunks,
      transformsRaw,
      transformMeta,
      laststageFinalSentence: laststageFinalRaw,
      laststageKRTokens: laststageKRTokensRaw,
      configuredKRTokens,
      configuredMidKoUnits,
      configuredMidEnUnits,
      configuredMidUnitData,
      configuredMegaUnitData,
      answerKorean,
      answerNorm: normalizeKoreanForCompare(answerKorean),
    };
  });
}

function getIndexCell(row) {
  for (const key of INDEX_KEYS) {
    const v = row?.[key];
    if (String(v ?? "").trim()) return String(v).trim();
  }
  return "";
}

function getLassoCell(row) {
  for (const key of LASSO_KEYS) {
    const v = row?.[key];
    if (String(v ?? "").trim()) return String(v).trim();
  }
  return "";
}

function parseLassoGroups(raw, chunkCount) {
  const size = Math.max(0, Number(chunkCount) || 0);
  const out = Array.from({ length: size }, () => []);
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text || !size) return out;

  const parts = text
    .split(/\s*(?:\||\/|;|\n)\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

  let seq = 0;
  parts.forEach((part) => {
    const labelMatch = part.match(/^([a-zA-Z]+)?\s*(\d+)\s*:/);
    let idx = -1;
    if (labelMatch) {
      idx = Number(labelMatch[2]);
    } else {
      idx = seq;
      seq += 1;
    }
    if (!Number.isInteger(idx) || idx < 0 || idx >= size) return;

    const arr = parseIndexGroup(part);
    if (!arr.length) return;
    out[idx] = arr.slice();
  });

  return out;
}

function collectLassoIndicesFromMidUnitData(units, chunkCount) {
  const size = Math.max(0, Number(chunkCount) || 0);
  const out = Array.from({ length: size }, () => []);
  if (!Array.isArray(units) || !size) return out;

  units.forEach((unit) => {
    const tokens = Array.isArray(unit?.tokens) ? unit.tokens : [];
    tokens.forEach((tok) => {
      const kind = String(tok?.kind || "").toLowerCase();
      const chunkId = Number(tok?.chunkId);
      if (kind !== "lasso" || !Number.isInteger(chunkId) || chunkId < 0 || chunkId >= size) return;
      const indices = Array.isArray(tok?.enIndices)
        ? tok.enIndices.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0)
        : [];
      if (!indices.length) return;
      out[chunkId].push(...indices);
    });
  });

  return out.map((arr) => Array.from(new Set(arr)).sort((a, b) => a - b));
}

function parseQuestionField(raw) {
  const text = compactWhitespace(raw);
  if (!text) return { sentence: "", chunks: [] };

  const m = text.match(/Sentence:\s*([\s\S]+?)\s*Chunks:\s*([\s\S]+)$/i);
  if (!m) {
    return {
      sentence: text.replace(/^Sentence:\s*/i, "").trim(),
      chunks: [],
    };
  }

  const sentence = compactWhitespace(m[1]);
  const chunkBlock = compactWhitespace(m[2]);
  const chunkLines = chunkBlock
    .split(/\s*-\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

  const chunks = chunkLines.map((line, i) => parseChunkLine(line, i));
  return { sentence, chunks };
}

function parseChunkLine(line, id) {
  const mm = String(line || "").match(/^(.*?)\(\s*=\s*([^)]+)\)\s*$/);
  const base = compactWhitespace((mm ? mm[1] : line).replace(/~/g, "~"));
  const meaning = compactWhitespace(mm ? mm[2] : "");
  return { id, base, meaning };
}

function parseTransformsMetaForL3E4(raw) {
  const meta = {};
  const s = String(raw || "").trim();
  if (!s) return meta;

  const parts = s
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);

  parts.forEach((part) => {
    const idxEq = part.indexOf("=");
    const idxColon = part.indexOf(":");
    let idx = idxEq;
    if (idx < 0 || (idxColon >= 0 && idxColon < idxEq)) idx = idxColon;
    if (idx < 0) return;

    const key = String(part.slice(0, idx) || "").trim().toLowerCase();
    const val = String(part.slice(idx + 1) || "").trim();
    if (!key) return;
    meta[key] = val;
  });

  return meta;
}

function parseTaggedPartsForL3E4(raw) {
  const s = String(raw || "").trim();
  if (!s) return [];

  const parts = s.split("|").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return [];

  let tagged = false;
  const out = [];
  parts.forEach((part) => {
    const m = part.match(
      /^(p\d+|m\d+|plain|none|x|mod|head|a|b|c|ab|pair|link|linkbox|hint)\s*::\s*(.+)$/i
    );
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

function mapKRTokensSegToChunkId(seg) {
  const s = String(seg || "").toLowerCase();
  const m = s.match(/^p(\d+)$/);
  if (m) return Number(m[1]);
  const mm = s.match(/^m(\d+)$/);
  if (mm) return Number(mm[1]);
  if (s === "ab") return 0;
  return null;
}

function parseLaststageKRTokensForL3E4(raw) {
  return parseTaggedPartsForL3E4(raw).map((x) => ({
    text: x.text,
    chunkId: mapKRTokensSegToChunkId(x.seg),
  }));
}

function parseMidUnitsForL3E4(raw) {
  return parseTaggedPartsForL3E4(raw).map((x) => ({
    text: compactWhitespace(x.text),
    chunkId: mapKRTokensSegToChunkId(x.seg),
  }));
}

function parseMidstageUnitDataForL3E4(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  let arr = [];
  try {
    const parsed = JSON.parse(text);
    arr = Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }

  return arr
    .map((unit, idx) => normalizeMidstageUnitForL3E4(unit, idx))
    .filter(Boolean);
}

function normalizeMidstageUnitForL3E4(unit, idx) {
  const u = unit && typeof unit === "object" ? unit : null;
  if (!u) return null;

  const id = Number.isInteger(u.id) ? Number(u.id) : idx;
  const label = compactWhitespace(u.en || u.label || "");
  const ko = compactWhitespace(u.ko || u.text || "");

  const range = Array.isArray(u.enRange) ? u.enRange : [];
  const startIdx = Number.isInteger(range[0]) ? Number(range[0]) : (Number.isInteger(u.startIdx) ? Number(u.startIdx) : null);
  const endIdx = Number.isInteger(range[1]) ? Number(range[1]) : (Number.isInteger(u.endIdx) ? Number(u.endIdx) : null);

  const tokensRaw = Array.isArray(u.tokens) ? u.tokens : [];
  const tokens = tokensRaw
    .map((tok, i) => normalizeMidstageUnitTokenForL3E4(tok, i))
    .filter(Boolean);

  return {
    id,
    label,
    text: ko,
    chunkId: Number.isInteger(u.chunkId) ? Number(u.chunkId) : null,
    startIdx,
    endIdx,
    tokens,
    done: false,
  };
}

function normalizeMidstageUnitTokenForL3E4(tok, idx) {
  const t = tok && typeof tok === "object" ? tok : null;
  if (!t) return null;
  const text = compactWhitespace(t.text || "");
  if (!text) return null;

  const kind = String(t.kind || "plain").toLowerCase();
  const chunkId = Number.isInteger(t.chunkId) ? Number(t.chunkId) : null;
  const enIndices = Array.isArray(t.enIndices)
    ? t.enIndices.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0)
    : [];

  return {
    id: Number.isInteger(t.id) ? Number(t.id) : idx,
    kind,
    text,
    chunkId,
    enIndices,
  };
}

function parseMegastageUnitDataForL3E4(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];

  let arr = [];
  try {
    const parsed = JSON.parse(text);
    arr = Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }

  return arr
    .map((unit, idx) => normalizeMegastageUnitForL3E4(unit, idx))
    .filter(Boolean);
}

function normalizeMegastageUnitForL3E4(unit, idx) {
  const u = unit && typeof unit === "object" ? unit : null;
  if (!u) return null;

  const id = Number.isInteger(u.id) ? Number(u.id) : idx;
  const label = compactWhitespace(u.en || u.label || "");
  const text = compactWhitespace(u.ko || u.text || "");
  const range = Array.isArray(u.enRange) ? u.enRange : [];
  const startIdx = Number.isInteger(range[0]) ? Number(range[0]) : (Number.isInteger(u.startIdx) ? Number(u.startIdx) : null);
  const endIdx = Number.isInteger(range[1]) ? Number(range[1]) : (Number.isInteger(u.endIdx) ? Number(u.endIdx) : null);
  const unitIds = Array.isArray(u.unitIds)
    ? Array.from(new Set(u.unitIds.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0)))
    : [];
  const tokens = (Array.isArray(u.tokens) ? u.tokens : [])
    .map((tok, tIdx) => normalizeMegastageUnitTokenForL3E4(tok, tIdx))
    .filter(Boolean);

  return {
    id,
    label,
    text,
    startIdx,
    endIdx,
    unitIds,
    tokens,
    autoDone: false,
    done: false,
  };
}

function normalizeMegastageUnitTokenForL3E4(tok, idx) {
  const t = tok && typeof tok === "object" ? tok : null;
  if (!t) return null;
  const text = compactWhitespace(t.text || "");
  if (!text) return null;

  const unitId = Number.isInteger(t.unitId) ? Number(t.unitId) : null;
  const chunkId = Number.isInteger(t.chunkId) ? Number(t.chunkId) : null;
  const kind = compactWhitespace(String(t.kind || "plain").toLowerCase()) || "plain";
  return {
    id: Number.isInteger(t.id) ? Number(t.id) : idx,
    text,
    unitId,
    chunkId,
    kind,
  };
}

function buildMidUnitsForQuestion(q) {
  const unitData = Array.isArray(q?.configuredMidUnitData) ? q.configuredMidUnitData : [];
  if (unitData.length) {
    return unitData.map((unit, idx) => ({
      id: Number.isInteger(unit?.id) ? Number(unit.id) : idx,
      text: compactWhitespace(unit?.text || ""),
      chunkId: Number.isInteger(unit?.chunkId) ? Number(unit.chunkId) : null,
      label: compactWhitespace(unit?.label || ""),
      startIdx: Number.isInteger(unit?.startIdx) ? Number(unit.startIdx) : null,
      endIdx: Number.isInteger(unit?.endIdx) ? Number(unit.endIdx) : null,
      tokens: Array.isArray(unit?.tokens) ? unit.tokens.map((x) => ({ ...x })) : [],
      done: false,
    })).filter((u) => u.text);
  }

  const koUnits = Array.isArray(q?.configuredMidKoUnits) ? q.configuredMidKoUnits : [];
  const enUnits = Array.isArray(q?.configuredMidEnUnits) ? q.configuredMidEnUnits : [];

  let baseUnits = koUnits;
  if (!baseUnits.length) {
    baseUnits = buildMidUnitsFromConfiguredTokens(q?.configuredKRTokens || [], 6);
  }

  if (!baseUnits.length) {
    const words = tokenizeKorean(q?.answerKorean || "");
    const grouped = groupWordsIntoUnits(words.map((w) => ({ text: w, chunkId: null })), 6);
    baseUnits = grouped.map((g) => ({ text: g.text, chunkId: g.chunkId }));
  }

  return baseUnits.map((unit, idx) => ({
    id: idx,
    text: compactWhitespace(unit?.text || ""),
    chunkId: Number.isInteger(unit?.chunkId) ? Number(unit.chunkId) : null,
    label: compactWhitespace(enUnits[idx]?.text || ""),
    done: false,
  })).filter((u) => u.text);
}

function buildMegaUnitsForQuestion(q, sourceMidUnits) {
  const mids = Array.isArray(sourceMidUnits) ? sourceMidUnits : [];
  if (!mids.length) return [];

  const configured = Array.isArray(q?.configuredMegaUnitData) ? q.configuredMegaUnitData : [];
  const configuredReady = configured
    .map((mega, idx) => {
      const unitIds = Array.isArray(mega?.unitIds)
        ? mega.unitIds.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0)
        : [];
      const tokenUnits = (Array.isArray(mega?.tokens) ? mega.tokens : [])
        .map((x) => Number(x?.unitId))
        .filter((x) => Number.isInteger(x) && x >= 0);
      const mergedIds = Array.from(new Set([...unitIds, ...tokenUnits])).sort((a, b) => a - b);
      const memberUnits = mergedIds
        .map((id) => mids.find((u) => Number(u?.id) === id))
        .filter(Boolean);

      const startFromMembers = memberUnits
        .map((u) => Number(u?.startIdx))
        .filter((x) => Number.isInteger(x));
      const endFromMembers = memberUnits
        .map((u) => Number(u?.endIdx))
        .filter((x) => Number.isInteger(x));
      const startIdx = Number.isInteger(mega?.startIdx)
        ? Number(mega.startIdx)
        : (startFromMembers.length ? Math.min(...startFromMembers) : null);
      const endIdx = Number.isInteger(mega?.endIdx)
        ? Number(mega.endIdx)
        : (endFromMembers.length ? Math.max(...endFromMembers) : null);

      const memberText = memberUnits.map((u) => compactWhitespace(u?.text || "")).filter(Boolean).join(" ");
      const memberLabel = memberUnits.map((u) => compactWhitespace(u?.label || "")).filter(Boolean).join(" ");
      const rawText = compactWhitespace(mega?.text || "");
      const normalizedText = isLikelyGarbledText(rawText) ? "" : rawText;
      const text = compactWhitespace(normalizedText || memberText);
      const label = compactWhitespace(mega?.label || memberLabel);
      if (!text) return null;

      const configuredTokens = Array.isArray(mega?.tokens) && mega.tokens.length
        ? mega.tokens
            .map((tok, tIdx) => {
              const tText = compactWhitespace(tok?.text || "");
              if (!tText) return null;
              const uid = Number(tok?.unitId);
              const linked = Number.isInteger(uid) ? mids.find((u) => Number(u?.id) === uid) : null;
              return {
                id: Number.isInteger(tok?.id) ? Number(tok.id) : tIdx,
                text: tText,
                unitId: Number.isInteger(uid) ? uid : null,
                chunkId: Number.isInteger(tok?.chunkId)
                  ? Number(tok.chunkId)
                  : (Number.isInteger(linked?.chunkId) ? Number(linked.chunkId) : null),
                kind: compactWhitespace(String(tok?.kind || "plain").toLowerCase()) || "plain",
              };
            })
            .filter(Boolean)
        : [];

      const useConfiguredTokens =
        configuredTokens.length > 0 &&
        !configuredTokens.some((tok) => isLikelyGarbledText(tok?.text || ""));

      const tokens = useConfiguredTokens
        ? configuredTokens
        : memberUnits.map((u, tIdx) => ({
            id: tIdx,
            text: compactWhitespace(u?.text || ""),
            unitId: Number.isInteger(u?.id) ? Number(u.id) : null,
            chunkId: Number.isInteger(u?.chunkId) ? Number(u.chunkId) : null,
            kind: "plain",
          })).filter((t) => t.text);

      return {
        id: Number.isInteger(mega?.id) ? Number(mega.id) : idx,
        text,
        label,
        startIdx,
        endIdx,
        unitIds: mergedIds,
        tokens,
        autoDone: false,
        done: false,
      };
    })
    .filter(Boolean);

  if (configuredReady.length) {
    return configuredReady;
  }

  const sorted = mids
    .slice()
    .sort((a, b) => Number(a?.startIdx ?? 9999) - Number(b?.startIdx ?? 9999));
  if (!sorted.length) return [];

  const groups = [];
  const n = sorted.length;
  let i = 0;
  let takePair = false;

  while (i < n) {
    let size = 1;
    if (i === 0) {
      size = 1;
      takePair = true;
    } else if (takePair && i + 1 < n) {
      size = 2;
      takePair = false;
    } else {
      size = 1;
      takePair = true;
    }
    groups.push(sorted.slice(i, i + size));
    i += size;
  }

  return groups.map((members, idx) => {
    const unitIds = members
      .map((u) => Number(u?.id))
      .filter((x) => Number.isInteger(x));
    const starts = members
      .map((u) => Number(u?.startIdx))
      .filter((x) => Number.isInteger(x));
    const ends = members
      .map((u) => Number(u?.endIdx))
      .filter((x) => Number.isInteger(x));
    const text = members.map((u) => compactWhitespace(u?.text || "")).filter(Boolean).join(" ");
    const label = members.map((u) => compactWhitespace(u?.label || "")).filter(Boolean).join(" ");
    const tokens = members.map((u, tIdx) => ({
      id: tIdx,
      text: compactWhitespace(u?.text || ""),
      unitId: Number.isInteger(u?.id) ? Number(u.id) : null,
      chunkId: Number.isInteger(u?.chunkId) ? Number(u.chunkId) : null,
      kind: "plain",
    })).filter((t) => t.text);

    return {
      id: idx,
      text,
      label,
      startIdx: starts.length ? Math.min(...starts) : null,
      endIdx: ends.length ? Math.max(...ends) : null,
      unitIds,
      tokens,
      autoDone: false,
      done: false,
    };
  }).filter((u) => u.text);
}

function isLikelyGarbledText(text) {
  const s = compactWhitespace(text);
  if (!s) return false;
  const qMarks = (s.match(/\?/g) || []).length;
  if (!qMarks) return false;
  const hasHangul = /[\u3131-\u318E\uAC00-\uD7A3]/.test(s);
  if (hasHangul) return false;
  return qMarks >= 2;
}

function buildMidUnitsFromConfiguredTokens(configuredTokens, desiredCount) {
  const words = flattenConfiguredTokensToWords(configuredTokens);
  if (!words.length) return [];
  return groupWordsIntoUnits(words, desiredCount || 6);
}

function flattenConfiguredTokensToWords(configuredTokens) {
  const out = [];
  (configuredTokens || []).forEach((tok) => {
    const chunkId = Number.isInteger(tok?.chunkId) ? Number(tok.chunkId) : null;
    const words = splitSentenceTokens(tok?.text || "");
    words.forEach((w) => out.push({ text: w, chunkId }));
  });
  return out;
}

function groupWordsIntoUnits(words, desiredCount) {
  const list = Array.isArray(words) ? words.filter((w) => compactWhitespace(w?.text || "")) : [];
  if (!list.length) return [];

  const total = list.length;
  const target = Math.max(4, Math.min(8, Number(desiredCount) || 6));

  const strongBreaks = [];
  const mediumBreaks = [];

  for (let i = 1; i < total; i += 1) {
    const prev = list[i - 1];
    const cur = list[i];
    const prevText = String(prev?.text || "");
    const prevChunk = Number.isInteger(prev?.chunkId) ? Number(prev.chunkId) : null;
    const curChunk = Number.isInteger(cur?.chunkId) ? Number(cur.chunkId) : null;

    if (/[,.!?]$/.test(prevText)) {
      strongBreaks.push(i);
      continue;
    }

    if (prevChunk !== curChunk && (prevChunk != null || curChunk != null)) {
      mediumBreaks.push(i);
      continue;
    }

    if (/^(and|but|because|so)$/i.test(String(cur?.text || ""))) {
      mediumBreaks.push(i);
    }
  }

  const breaks = [];
  strongBreaks.forEach((b) => {
    if (!breaks.includes(b)) breaks.push(b);
  });

  if (breaks.length + 1 < target) {
    mediumBreaks.forEach((b) => {
      if (breaks.length + 1 >= target) return;
      if (!breaks.includes(b)) breaks.push(b);
    });
  }

  if (breaks.length + 1 < target) {
    const step = total / target;
    for (let n = 1; n < target; n += 1) {
      const approx = Math.max(1, Math.min(total - 1, Math.round(step * n)));
      let pick = approx;
      while (pick < total - 1 && breaks.includes(pick)) pick += 1;
      while (pick > 1 && breaks.includes(pick)) pick -= 1;
      if (pick > 0 && pick < total && !breaks.includes(pick)) breaks.push(pick);
    }
  }

  breaks.sort((a, b) => a - b);

  const out = [];
  let start = 0;
  breaks.forEach((br) => {
    if (br <= start || br > total) return;
    out.push(makeUnitFromWordRange(list, start, br));
    start = br;
  });
  if (start < total) out.push(makeUnitFromWordRange(list, start, total));

  return out.filter((x) => x.text);
}

function makeUnitFromWordRange(words, start, end) {
  const slice = words.slice(start, end);
  const text = slice.map((x) => x.text).join(" ").trim();
  const counts = {};
  slice.forEach((x) => {
    if (!Number.isInteger(x?.chunkId)) return;
    const key = String(x.chunkId);
    counts[key] = (counts[key] || 0) + 1;
  });

  let chunkId = null;
  let best = 0;
  Object.keys(counts).forEach((k) => {
    if (counts[k] > best) {
      best = counts[k];
      chunkId = Number(k);
    }
  });

  return { text, chunkId };
}

function parseChunkIndexGroups(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  let groupTexts = text
    .split(/\s*(?:\||\/|;|\n)\s*/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (groupTexts.length <= 1) {
    const bracketGroups = text.match(/\[[^\]]+\]|\([^)]+\)|\{[^}]+\}/g);
    if (bracketGroups && bracketGroups.length > 1) {
      groupTexts = bracketGroups.map((x) => x.trim()).filter(Boolean);
    }
  }

  return groupTexts.map(parseIndexGroup).filter((arr) => arr.length > 0);
}

function parseIndexGroup(groupText) {
  const text = String(groupText || "")
    .replace(/^[^:]*:/, "")
    .replace(/[\[\]\(\)\{\}]/g, " ")
    .trim();
  if (!text) return [];

  const parts = text.split(/[\s,]+/).filter(Boolean);
  const nums = [];

  parts.forEach((part) => {
    const m = part.match(/^(\d+)\s*[-~]\s*(\d+)$/);
    if (m) {
      let s = Number(m[1]);
      let e = Number(m[2]);
      if (!Number.isFinite(s) || !Number.isFinite(e)) return;
      if (s > e) [s, e] = [e, s];
      for (let n = s; n <= e; n += 1) nums.push(n - 1);
      return;
    }

    if (/^\d+$/.test(part)) {
      nums.push(Number(part) - 1);
    }
  });

  return Array.from(new Set(nums.filter((x) => Number.isInteger(x) && x >= 0))).sort((a, b) => a - b);
}

function inferChunkTokenIndices(sentenceTokens, chunkBase) {
  const rawWords = splitSentenceTokens(String(chunkBase || "").replace(/~/g, " "));
  const normWords = rawWords.map((w) => normalizeEnglishToken(w)).filter(Boolean);
  if (!normWords.length) return [];

  const candidates = [normWords];
  if (["be", "have", "do"].includes(normWords[0]) && normWords.length > 1) {
    candidates.push(normWords.slice(1));
  }

  for (const candidate of candidates) {
    const matched = findContiguousPattern(sentenceTokens, candidate);
    if (matched.length) return matched;
  }

  for (const candidate of candidates) {
    const matched = findAnchorPattern(sentenceTokens, candidate);
    if (matched.length) return matched;
  }

  return [];
}

function findContiguousPattern(sentenceTokens, patternNorm) {
  const sent = (sentenceTokens || []).map((x) => normalizeEnglishToken(x));
  const pat = (patternNorm || []).map((x) => normalizeEnglishToken(x)).filter(Boolean);
  if (!pat.length || sent.length < pat.length) return [];

  for (let i = 0; i <= sent.length - pat.length; i += 1) {
    let ok = true;
    for (let j = 0; j < pat.length; j += 1) {
      if (!tokenMatchesPattern(sent[i + j], pat[j])) {
        ok = false;
        break;
      }
    }
    if (ok) return range(i, i + pat.length - 1);
  }
  return [];
}

function findAnchorPattern(sentenceTokens, patternNorm) {
  const sent = (sentenceTokens || []).map((x) => normalizeEnglishToken(x));
  const pat = (patternNorm || []).map((x) => normalizeEnglishToken(x)).filter(Boolean);
  if (!pat.length || !sent.length) return [];

  const first = pat[0];
  const last = pat[pat.length - 1];
  let best = [];

  for (let i = 0; i < sent.length; i += 1) {
    if (!tokenMatchesPattern(sent[i], first)) continue;
    if (pat.length === 1) return [i];

    for (let j = i + 1; j < sent.length; j += 1) {
      if (!tokenMatchesPattern(sent[j], last)) continue;
      const candidate = range(i, j);
      if (!best.length || candidate.length < best.length) {
        best = candidate;
      }
      break;
    }
  }

  return best;
}

function tokenMatchesPattern(sentenceWord, patternWord) {
  const a = normalizeEnglishToken(sentenceWord);
  const b = normalizeEnglishToken(patternWord);
  if (!a || !b) return false;

  if (b === "be") return BE_FORMS.has(a);
  if (b === "have") return HAVE_FORMS.has(a);
  if (b === "do") return DO_FORMS.has(a);

  if (a === b) return true;
  if (simpleStem(a) === simpleStem(b)) return true;
  return false;
}

function simpleStem(word) {
  let w = String(word || "");
  if (!w) return "";

  if (w.endsWith("'s")) w = w.slice(0, -2);
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("es") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  return w;
}

function range(s, e) {
  const out = [];
  for (let i = s; i <= e; i += 1) out.push(i);
  return out;
}

function isSameIndexSet(a, b) {
  const aa = Array.isArray(a)
    ? Array.from(new Set(a.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0))).sort((x, y) => x - y)
    : [];
  const bb = Array.isArray(b)
    ? Array.from(new Set(b.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0))).sort((x, y) => x - y)
    : [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}

function renderIntro() {
  const area = getQuizMountEl();
  if (!area) return;

  const total = questions.length;
  const title = lessonTitle || "Pleks L3";
  const subTitle = exerciseTitle || (questions[0]?.title || "Chunk Drag + KR Scramble");
  const inst = SIMPLE_DRAG_GUIDE;

  area.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L3-E4 (Draft)</div>

      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Total ${total}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>

      <div style="font-size:14px; font-weight:900; color:#444; margin-bottom:2px;">${escapeHtml(title)}</div>
      <div style="font-size:13px; color:#555; margin-bottom:8px;">${escapeHtml(subTitle)}</div>
      <div style="font-size:12px; color:#7e3106; line-height:1.35; letter-spacing:-0.2px;">${escapeHtml(inst)}</div>

      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">Start</button>
    </div>
  `;
}

function startQuiz() {
  if (!questions.length) {
    alert("No questions found for this lesson/exercise.");
    return;
  }

  currentIndex = 0;
  results = [];
  renderQuestion();
}

function renderQuestion() {
  const area = getQuizMountEl();
  if (!area) return;

  const q = questions[currentIndex];
  if (!q) {
    showResultPopup();
    return;
  }

  stageChunks = (q.chunks || []).map((ch) => ({
    ...ch,
    matched: false,
    droppedAt: -1,
    stage2Done: false,
    scopeIndices: [],
  }));
  activeChunkId = null;
  draggingChunkId = null;
  bankTokens = [];
  selectedTokens = [];
  midUnits = buildMidUnitsForQuestion(q);
  megaUnits = buildMegaUnitsForQuestion(q, midUnits);
  midPopupUnitIdx = -1;
  midPopupBankTokens = [];
  midPopupSelectedTokens = [];
  megaPopupUnitIdx = -1;
  megaPopupBankTokens = [];
  megaPopupSelectedTokens = [];
  sourceCollapsed = false;
  sourceAutoArmed = true;
  isLocked = false;
  clearPreviewState();
  resetZoomState();

  area.innerHTML = `
    <div class="box stage1-layout" id="stage1-layout-box" style="margin-bottom:10px;">
      <div class="stage-main" id="left-pane">
        <div class="inst-row">
          <span class="q-chip">${currentIndex + 1}/${questions.length} | Q${q.qNumber}</span>
          <span class="inst-text">${escapeHtml(SIMPLE_DRAG_GUIDE)}</span>
        </div>
        <div class="sentence drop-sentence" id="sentence-area"></div>
      </div>

      <div class="stage-bank" id="bank-pane">
        <div class="chunk-tray" id="chunk-tray"></div>
      </div>

      <div class="zoom-overlay" id="zoom-overlay">
        <div class="zoom-card" id="zoom-card">
          <div class="zoom-lasso" id="zoom-lasso"></div>
          <div class="zoom-sentence" id="zoom-sentence"></div>
        </div>
      </div>
    </div>

    <div class="source-toggle-row hidden" id="scramble-top-row">
      <button type="button" class="source-toggle-btn" id="source-toggle-btn"></button>
    </div>
    <div class="source-popup-overlay hidden" id="source-popup-overlay">
      <div class="source-popup-card">
        <div class="sentence source-popup-sentence" id="source-popup-sentence"></div>
      </div>
    </div>

    <div class="box hidden" id="scramble-box" style="margin-bottom:10px;">
      <div id="answer-line" class="token-wrap final-wrap"></div>
      <div class="scramble-divider"></div>
      <div id="bank-area" class="token-wrap final-wrap" style="margin-top:8px;"></div>
      <div id="remain-info" class="remain-info"></div>
    </div>

    <div class="mid-popup-overlay" id="mid-popup-overlay">
      <div class="mid-popup-card">
        <div class="mid-popup-title" id="mid-popup-title"></div>
        <div class="mid-popup-subtitle" id="mid-popup-subtitle"></div>
        <div class="token-wrap" id="mid-popup-answer"></div>
        <div class="token-wrap" id="mid-popup-bank" style="margin-top:8px;"></div>
        <div class="remain-info" id="mid-popup-remain"></div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="quiz-btn" id="mid-popup-check-btn">Check</button>
          <button class="quiz-btn" id="mid-popup-close-btn">Close</button>
        </div>
      </div>
    </div>

    <div class="mid-popup-overlay" id="mega-popup-overlay">
      <div class="mid-popup-card">
        <div class="mid-popup-title" id="mega-popup-title"></div>
        <div class="mid-popup-subtitle" id="mega-popup-subtitle"></div>
        <div class="token-wrap" id="mega-popup-answer"></div>
        <div class="token-wrap" id="mega-popup-bank" style="margin-top:8px;"></div>
        <div class="remain-info" id="mega-popup-remain"></div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="quiz-btn" id="mega-popup-check-btn">Check</button>
          <button class="quiz-btn" id="mega-popup-close-btn">Close</button>
        </div>
      </div>
    </div>

    <div class="btn-row">
      <button class="quiz-btn" id="submit-btn">Submit</button>
      <button class="quiz-btn" id="next-btn">Next</button>
    </div>
  `;

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  const sourceToggleBtn = document.getElementById("source-toggle-btn");
  const sourcePopupOverlay = document.getElementById("source-popup-overlay");
  if (submitBtn) submitBtn.addEventListener("click", submitCurrent);
  if (nextBtn) nextBtn.addEventListener("click", goNext);
  if (nextBtn) nextBtn.disabled = true;
  if (sourceToggleBtn) {
    sourceToggleBtn.addEventListener("click", () => {
      sourceCollapsed = !sourceCollapsed;
      sourceAutoArmed = false;
      renderStage();
    });
  }
  if (sourcePopupOverlay) {
    sourcePopupOverlay.addEventListener("click", (ev) => {
      if (ev.target !== sourcePopupOverlay) return;
      if (sourceCollapsed) return;
      sourceCollapsed = true;
      sourceAutoArmed = false;
      updateSourceToggleUi(true);
    });
  }

  wireStageInteractions();
  wireZoomInteractions();
  wireMidInteractions();
  wireMegaInteractions();
  renderStage();

  if (!stageResizeBound) {
    window.addEventListener("resize", () => requestAnimationFrame(syncStageHeights));
    stageResizeBound = true;
  }
}

function wireStageInteractions() {
  const sentenceArea = document.getElementById("sentence-area");
  const chunkTray = document.getElementById("chunk-tray");
  if (!sentenceArea || !chunkTray) return;

  chunkTray.addEventListener("dragstart", (ev) => {
    if (isLocked) return;
    const chip = ev.target.closest("[data-chunk-id]");
    if (!chip) return;

    const chunkId = Number(chip.getAttribute("data-chunk-id"));
    const ch = stageChunks.find((x) => x.id === chunkId);
    if (!Number.isInteger(chunkId) || !ch || ch.matched) {
      ev.preventDefault();
      return;
    }

    activeChunkId = chunkId;
    draggingChunkId = chunkId;
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", String(chunkId));
    }
  });

  chunkTray.addEventListener("dragend", () => {
    draggingChunkId = null;
    if (previewChunkId != null || previewTokenIdx >= 0) {
      clearPreviewState();
      applyPreviewFeedback();
    }
  });

  chunkTray.addEventListener("click", (ev) => {
    if (isLocked) return;
    const chip = ev.target.closest("[data-chunk-id]");
    if (!chip) return;
    const chunkId = Number(chip.getAttribute("data-chunk-id"));
    const ch = stageChunks.find((x) => x.id === chunkId);
    if (!Number.isInteger(chunkId) || !ch || ch.matched) return;

    activeChunkId = activeChunkId === chunkId ? null : chunkId;
    renderStage();
  });

  sentenceArea.addEventListener("dragover", (ev) => {
    if (isLocked) return;
    const tok = ev.target.closest("[data-token-idx]");
    if (!tok) {
      if (updatePreviewState(null, null)) applyPreviewFeedback();
      return;
    }
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";

    const tokenIdx = Number(tok.getAttribute("data-token-idx"));
    const chunkId = resolveChunkIdFromDragEvent(ev);
    if (updatePreviewState(chunkId, tokenIdx)) {
      applyPreviewFeedback();
    }
  });

  sentenceArea.addEventListener("dragleave", (ev) => {
    if (isLocked) return;
    const toEl = ev.relatedTarget;
    if (toEl && sentenceArea.contains(toEl)) return;
    if (previewChunkId != null || previewTokenIdx >= 0) {
      clearPreviewState();
      applyPreviewFeedback();
    }
  });

  sentenceArea.addEventListener("drop", (ev) => {
    if (isLocked) return;
    const tok = ev.target.closest("[data-token-idx]");
    if (!tok) return;

    ev.preventDefault();
    const tokenIdx = Number(tok.getAttribute("data-token-idx"));
    if (!Number.isInteger(tokenIdx)) return;

    let chunkId = Number.NaN;
    if (ev.dataTransfer) {
      chunkId = Number(ev.dataTransfer.getData("text/plain"));
    }
    if (!Number.isInteger(chunkId)) {
      chunkId = Number(activeChunkId);
    }
    if (!Number.isInteger(chunkId)) return;

    draggingChunkId = null;
    clearPreviewState();
    attemptChunkDrop(chunkId, tokenIdx);
  });

  sentenceArea.addEventListener("click", (ev) => {
    if (isLocked) return;
    const tok = ev.target.closest("[data-token-idx]");
    if (!tok) return;
    const tokenIdx = Number(tok.getAttribute("data-token-idx"));
    if (!Number.isInteger(tokenIdx)) return;

    const stage1 = getStageProgress();
    const stage2 = getStage2Progress();
    if (stage1.done && !stage2.doneAll) {
      const chunkId = findChunkForZoomByTokenIdx(tokenIdx);
      if (Number.isInteger(chunkId)) {
        openZoomForChunk(chunkId);
        return;
      }
    }

    if (stage1.done && stage2.doneAll) {
      const midProgress = getMidProgress();
      if (isMidStageActive() && !midProgress.complete) {
        const unit = findMidUnitByTokenIdx(tokenIdx);
        if (unit && !unit.done) {
          openMidPopup(Number(unit.id));
          return;
        }
      }

      const megaProgress = getMegaProgress();
      if (isMegaStageActive() && !megaProgress.complete) {
        if (syncMegaAutoCompletion()) {
          renderStage();
          return;
        }
        const mega = findMegaUnitByTokenIdx(tokenIdx);
        if (mega && !mega.done) {
          if (isMegaUnitSkippable(mega)) {
            if (syncMegaAutoCompletion()) {
              renderStage();
            }
            return;
          }
          const nextMegaIdx = getNextPendingMegaUnitIdx();
          if (Number.isInteger(nextMegaIdx) && nextMegaIdx >= 0 && Number(mega.id) !== nextMegaIdx) {
            showToast("no", "Open mega units in order.");
            return;
          }
          openMegaPopup(Number(mega.id));
          return;
        }
      }
    }

    if (!Number.isInteger(activeChunkId)) return;
    clearPreviewState();
    attemptChunkDrop(activeChunkId, tokenIdx);
  });
}

function attemptChunkDrop(chunkId, tokenIdx) {
  draggingChunkId = null;
  clearPreviewState();
  const ch = stageChunks.find((x) => x.id === chunkId);
  if (!ch || ch.matched || !Number.isInteger(tokenIdx)) return;

  const targets = Array.isArray(ch.targetIndices) ? ch.targetIndices : [];
  let ok = targets.length ? targets.includes(tokenIdx) : true;

  if (!targets.length) {
    ch.targetIndices = [tokenIdx];
    ch.mapSource = "manual";
  }

  if (!ok) {
    showToast("no", "Wrong position. Try another token.");
    activeChunkId = chunkId;
    renderStage();
    return;
  }

  ch.matched = true;
  ch.droppedAt = tokenIdx;
  activeChunkId = null;

  renderStage();

  const progress = getStageProgress();
  if (progress.done) {
    showToast("ok", "Stage1 complete.");
  } else {
    showToast("ok", "Chunk matched.");
  }
}

function hasMidUnits() {
  return Array.isArray(midUnits) && midUnits.length > 0;
}

function hasMidUnitRanges() {
  if (!hasMidUnits()) return false;
  return midUnits.some((u) => Number.isInteger(u?.startIdx) && Number.isInteger(u?.endIdx));
}

function isMidStageActive() {
  return hasMidUnits() && hasMidUnitRanges();
}

function findMidUnitByTokenIdx(tokenIdx) {
  if (!Number.isInteger(tokenIdx) || !hasMidUnitRanges()) return null;
  return (
    midUnits.find(
      (u) =>
        Number.isInteger(u?.startIdx) &&
        Number.isInteger(u?.endIdx) &&
        tokenIdx >= Number(u.startIdx) &&
        tokenIdx <= Number(u.endIdx)
    ) || null
  );
}

function getNextPendingMidUnitIdx() {
  if (!isMidStageActive()) return -1;
  const next = midUnits.find((u) => !u.done);
  return next ? Number(next.id) : -1;
}

function getMidProgress() {
  const total = isMidStageActive() ? midUnits.length : 0;
  const done = total ? midUnits.filter((x) => !!x.done).length : 0;
  return { total, done, complete: total > 0 ? done === total : true };
}

function hasMegaUnits() {
  return Array.isArray(megaUnits) && megaUnits.length > 0;
}

function hasMegaUnitRanges() {
  if (!hasMegaUnits()) return false;
  return megaUnits.some((u) => Number.isInteger(u?.startIdx) && Number.isInteger(u?.endIdx));
}

function isMegaStageActive() {
  return hasMegaUnits() && hasMegaUnitRanges();
}

function findMegaUnitByTokenIdx(tokenIdx) {
  if (!Number.isInteger(tokenIdx) || !hasMegaUnitRanges()) return null;
  return (
    megaUnits.find(
      (u) =>
        Number.isInteger(u?.startIdx) &&
        Number.isInteger(u?.endIdx) &&
        tokenIdx >= Number(u.startIdx) &&
        tokenIdx <= Number(u.endIdx)
    ) || null
  );
}

function getNextPendingMegaUnitIdx() {
  if (!isMegaStageActive()) return -1;
  const next = megaUnits.find((u) => !u.done);
  return next ? Number(next.id) : -1;
}

function getMegaProgress() {
  const total = isMegaStageActive() ? megaUnits.length : 0;
  const done = total ? megaUnits.filter((x) => !!x.done).length : 0;
  return { total, done, complete: total > 0 ? done === total : true };
}

function getMegaUnitMemberIds(mega) {
  if (!mega || typeof mega !== "object") return [];
  const idsFromMega = Array.isArray(mega?.unitIds)
    ? mega.unitIds.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0)
    : [];
  const idsFromTokens = (Array.isArray(mega?.tokens) ? mega.tokens : [])
    .map((x) => Number(x?.unitId))
    .filter((x) => Number.isInteger(x) && x >= 0);
  return Array.from(new Set([...idsFromMega, ...idsFromTokens])).sort((a, b) => a - b);
}

function isMegaUnitSkippable(mega) {
  const memberIds = getMegaUnitMemberIds(mega);
  return memberIds.length <= 1;
}

function pushMegaTokenToFinalBank(mega) {
  if (!mega) return false;
  const tokenId = `m_${currentIndex}_${mega.id}`;
  const existsInBank = bankTokens.some((x) => x.id === tokenId);
  const existsInSelected = selectedTokens.some((x) => x.id === tokenId);
  if (existsInBank || existsInSelected) return false;

  bankTokens.push({
    id: tokenId,
    text: mega.text,
    chunkId: null,
    html: buildFinalMegaTokenHtml(mega),
  });
  return true;
}

function syncMegaAutoCompletion() {
  if (!isMegaStageActive()) return false;

  let changed = false;
  megaUnits.forEach((mega) => {
    if (!mega || mega.done) return;
    if (!isMegaUnitSkippable(mega)) return;

    const memberIds = getMegaUnitMemberIds(mega);
    if (memberIds.length) {
      const allMembersDone = memberIds.every((uid) =>
        midUnits.some((u) => Number(u?.id) === uid && !!u.done)
      );
      if (!allMembersDone) return;
    }

    mega.done = true;
    mega.autoDone = true;
    if (pushMegaTokenToFinalBank(mega)) changed = true;
  });

  if (changed) {
    const progress = getMegaProgress();
    if (progress.complete && bankTokens.length > 1) {
      bankTokens = shuffleArray(bankTokens);
    }
  }

  return changed;
}

function wireMidInteractions() {
  const popup = document.getElementById("mid-popup-overlay");
  const closeBtn = document.getElementById("mid-popup-close-btn");
  const checkBtn = document.getElementById("mid-popup-check-btn");
  if (!popup || !closeBtn || !checkBtn) return;

  closeBtn.addEventListener("click", () => {
    closeMidPopup();
  });

  checkBtn.addEventListener("click", () => {
    checkMidPopupAnswer();
  });

  popup.addEventListener("click", (ev) => {
    if (ev.target === popup) closeMidPopup();
  });
}

function openMidPopup(unitIdx) {
  if (!isMidStageActive()) return;
  if (unitIdx < 0 || unitIdx >= midUnits.length) return;

  const unit = midUnits[unitIdx];
  if (!unit || unit.done) return;

  midPopupUnitIdx = unitIdx;
  midPopupSelectedTokens = [];
  const unitTokens = Array.isArray(unit.tokens) ? unit.tokens.filter((x) => compactWhitespace(x?.text || "")) : [];
  if (unitTokens.length) {
    midPopupBankTokens = shuffleArray(
      unitTokens.map((tok, i) => ({
        id: `mid_${currentIndex}_${unitIdx}_${i}_${Math.random().toString(16).slice(2, 7)}`,
        text: compactWhitespace(tok.text),
        chunkId: Number.isInteger(tok.chunkId) ? Number(tok.chunkId) : (Number.isInteger(unit.chunkId) ? Number(unit.chunkId) : null),
        kind: String(tok.kind || "plain").toLowerCase(),
      }))
    );
  } else {
    const parts = splitSentenceTokens(unit.text);
    midPopupBankTokens = shuffleArray(
      parts.map((text, i) => ({
        id: `mid_${currentIndex}_${unitIdx}_${i}_${Math.random().toString(16).slice(2, 7)}`,
        text,
        chunkId: Number.isInteger(unit.chunkId) ? unit.chunkId : null,
        kind: "plain",
      }))
    );
  }

  renderMidPopup();

  const popup = document.getElementById("mid-popup-overlay");
  if (popup) popup.classList.add("open");
}

function closeMidPopup() {
  midPopupUnitIdx = -1;
  midPopupBankTokens = [];
  midPopupSelectedTokens = [];
  const popup = document.getElementById("mid-popup-overlay");
  if (popup) popup.classList.remove("open");
}

function renderMidPopup() {
  const titleEl = document.getElementById("mid-popup-title");
  const subtitleEl = document.getElementById("mid-popup-subtitle");
  const answerLineEl = document.getElementById("mid-popup-answer");
  const bankAreaEl = document.getElementById("mid-popup-bank");
  const remainInfoEl = document.getElementById("mid-popup-remain");
  if (!titleEl || !subtitleEl || !answerLineEl || !bankAreaEl || !remainInfoEl) return;
  if (!Number.isInteger(midPopupUnitIdx) || midPopupUnitIdx < 0 || midPopupUnitIdx >= midUnits.length) return;

  const unit = midUnits[midPopupUnitIdx];
  titleEl.textContent = `Unit ${midPopupUnitIdx + 1}`;
  subtitleEl.textContent = getMidUnitSourceEnglish(unit);

  if (window.PleksScramble?.render) {
    window.PleksScramble.render({
      answerLineEl,
      bankAreaEl,
      remainInfoEl,
      state: {
        selectedTokens: midPopupSelectedTokens,
        bankTokens: midPopupBankTokens,
        isLocked: false,
      },
      onSelectToken: (tok) => {
        const i = midPopupBankTokens.findIndex((x) => x.id === tok.id);
        if (i < 0) return;
        const [moved] = midPopupBankTokens.splice(i, 1);
        if (moved) midPopupSelectedTokens.push(moved);
      },
      onUnselectLast: () => {
        const moved = midPopupSelectedTokens.pop();
        if (moved) midPopupBankTokens.push(moved);
      },
      decorateToken: (el, tok) => {
        decorateScrambleTokenByChunk(el, tok, { stage: "mid" });
      },
      rerender: renderMidPopup,
    });
    return;
  }

  answerLineEl.innerHTML = midPopupSelectedTokens.map((x) => `<span>${escapeHtml(x.text)}</span>`).join(" ");
  bankAreaEl.innerHTML = midPopupBankTokens.map((x) => `<span>${escapeHtml(x.text)}</span>`).join(" ");
  remainInfoEl.textContent = `Remaining: ${midPopupBankTokens.length}`;
}

function checkMidPopupAnswer() {
  if (!Number.isInteger(midPopupUnitIdx) || midPopupUnitIdx < 0 || midPopupUnitIdx >= midUnits.length) return;
  const unit = midUnits[midPopupUnitIdx];
  if (!unit) return;

  const user = midPopupSelectedTokens.map((x) => x.text).join(" ").trim();
  const ok = normalizeKoreanForCompare(user) === normalizeKoreanForCompare(unit.text);
  if (!ok) {
    showToast("no", "Piece order mismatch.");
    return;
  }

  unit.done = true;
  if (!isMegaStageActive()) {
    const tokenId = `u_${currentIndex}_${unit.id}`;
    const existsInBank = bankTokens.some((x) => x.id === tokenId);
    const existsInSelected = selectedTokens.some((x) => x.id === tokenId);
    if (!existsInBank && !existsInSelected) {
      bankTokens.push({
        id: tokenId,
        text: unit.text,
        chunkId: Number.isInteger(unit.chunkId) ? unit.chunkId : null,
        html: buildFinalUnitTokenHtml(unit),
      });
    }
  }

  if (isMegaStageActive()) {
    syncMegaAutoCompletion();
  }

  const progress = getMidProgress();
  if (!isMegaStageActive() && progress.complete && bankTokens.length > 1) {
    bankTokens = shuffleArray(bankTokens);
  }

  closeMidPopup();
  renderStage();
  showToast("ok", "Piece completed.");
}

function wireMegaInteractions() {
  const popup = document.getElementById("mega-popup-overlay");
  const closeBtn = document.getElementById("mega-popup-close-btn");
  const checkBtn = document.getElementById("mega-popup-check-btn");
  if (!popup || !closeBtn || !checkBtn) return;

  closeBtn.addEventListener("click", () => {
    closeMegaPopup();
  });

  checkBtn.addEventListener("click", () => {
    checkMegaPopupAnswer();
  });

  popup.addEventListener("click", (ev) => {
    if (ev.target === popup) closeMegaPopup();
  });
}

function openMegaPopup(unitIdx) {
  if (!isMegaStageActive()) return;
  if (unitIdx < 0 || unitIdx >= megaUnits.length) return;

  const mega = megaUnits[unitIdx];
  if (!mega || mega.done) return;

  megaPopupUnitIdx = unitIdx;
  megaPopupSelectedTokens = [];
  const baseTokens = Array.isArray(mega.tokens) ? mega.tokens.filter((x) => compactWhitespace(x?.text || "")) : [];

  if (baseTokens.length) {
    megaPopupBankTokens = shuffleArray(
      baseTokens.map((tok, i) => ({
        id: `mega_${currentIndex}_${unitIdx}_${i}_${Math.random().toString(16).slice(2, 7)}`,
        text: compactWhitespace(tok.text),
        unitId: Number.isInteger(tok.unitId) ? Number(tok.unitId) : null,
        chunkId: Number.isInteger(tok.chunkId) ? Number(tok.chunkId) : null,
        kind: String(tok.kind || "plain").toLowerCase(),
      }))
    );
  } else {
    const parts = splitSentenceTokens(mega.text);
    megaPopupBankTokens = shuffleArray(
      parts.map((text, i) => ({
        id: `mega_${currentIndex}_${unitIdx}_${i}_${Math.random().toString(16).slice(2, 7)}`,
        text,
        unitId: null,
        chunkId: null,
        kind: "plain",
      }))
    );
  }

  renderMegaPopup();

  const popup = document.getElementById("mega-popup-overlay");
  if (popup) popup.classList.add("open");
}

function closeMegaPopup() {
  megaPopupUnitIdx = -1;
  megaPopupBankTokens = [];
  megaPopupSelectedTokens = [];
  const popup = document.getElementById("mega-popup-overlay");
  if (popup) popup.classList.remove("open");
}

function renderMegaPopup() {
  const titleEl = document.getElementById("mega-popup-title");
  const subtitleEl = document.getElementById("mega-popup-subtitle");
  const answerLineEl = document.getElementById("mega-popup-answer");
  const bankAreaEl = document.getElementById("mega-popup-bank");
  const remainInfoEl = document.getElementById("mega-popup-remain");
  if (!titleEl || !subtitleEl || !answerLineEl || !bankAreaEl || !remainInfoEl) return;
  if (!Number.isInteger(megaPopupUnitIdx) || megaPopupUnitIdx < 0 || megaPopupUnitIdx >= megaUnits.length) return;

  const mega = megaUnits[megaPopupUnitIdx];
  titleEl.textContent = `Mega Unit ${megaPopupUnitIdx + 1}`;
  subtitleEl.textContent = getMegaUnitSourceEnglish(mega);

  if (window.PleksScramble?.render) {
    window.PleksScramble.render({
      answerLineEl,
      bankAreaEl,
      remainInfoEl,
      state: {
        selectedTokens: megaPopupSelectedTokens,
        bankTokens: megaPopupBankTokens,
        isLocked: false,
      },
      onSelectToken: (tok) => {
        const i = megaPopupBankTokens.findIndex((x) => x.id === tok.id);
        if (i < 0) return;
        const [moved] = megaPopupBankTokens.splice(i, 1);
        if (moved) megaPopupSelectedTokens.push(moved);
      },
      onUnselectLast: () => {
        const moved = megaPopupSelectedTokens.pop();
        if (moved) megaPopupBankTokens.push(moved);
      },
      decorateToken: (el, tok) => {
        decorateScrambleTokenByChunk(el, tok, { stage: "mid" });
      },
      rerender: renderMegaPopup,
    });
    return;
  }

  answerLineEl.innerHTML = megaPopupSelectedTokens.map((x) => `<span>${escapeHtml(x.text)}</span>`).join(" ");
  bankAreaEl.innerHTML = megaPopupBankTokens.map((x) => `<span>${escapeHtml(x.text)}</span>`).join(" ");
  remainInfoEl.textContent = `Remaining: ${megaPopupBankTokens.length}`;
}

function checkMegaPopupAnswer() {
  if (!Number.isInteger(megaPopupUnitIdx) || megaPopupUnitIdx < 0 || megaPopupUnitIdx >= megaUnits.length) return;
  const mega = megaUnits[megaPopupUnitIdx];
  if (!mega) return;

  const expectedTokens = Array.isArray(mega?.tokens)
    ? mega.tokens.filter((x) => compactWhitespace(x?.text || ""))
    : [];
  let ok = true;

  if (expectedTokens.length) {
    if (megaPopupSelectedTokens.length !== expectedTokens.length) {
      ok = false;
    } else {
      for (let i = 0; i < expectedTokens.length; i += 1) {
        const exp = expectedTokens[i];
        const got = megaPopupSelectedTokens[i];
        const expNorm = normalizeKoreanForCompare(exp?.text || "");
        const gotNorm = normalizeKoreanForCompare(got?.text || "");
        if (expNorm !== gotNorm) {
          ok = false;
          break;
        }
        if (Number.isInteger(exp?.unitId)) {
          const gotUnitId = Number(got?.unitId);
          if (!Number.isInteger(gotUnitId) || gotUnitId !== Number(exp.unitId)) {
            ok = false;
            break;
          }
        }
      }
    }
  } else {
    const user = megaPopupSelectedTokens.map((x) => x.text).join(" ").trim();
    ok = normalizeKoreanForCompare(user) === normalizeKoreanForCompare(mega.text);
  }

  if (!ok) {
    showToast("no", "Piece order mismatch.");
    return;
  }

  mega.done = true;
  mega.autoDone = false;
  pushMegaTokenToFinalBank(mega);

  const progress = getMegaProgress();
  if (progress.complete && bankTokens.length > 1) {
    bankTokens = shuffleArray(bankTokens);
  }

  closeMegaPopup();
  renderStage();
  showToast("ok", "Piece completed.");
}

function buildFinalUnitTokenHtml(unit) {
  const tokens = Array.isArray(unit?.tokens) ? unit.tokens : [];
  if (!tokens.length) return "";

  const html = tokens
    .map((tok) => {
      const text = compactWhitespace(tok?.text || "");
      if (!text) return "";
      const kind = String(tok?.kind || "plain").toLowerCase();
      const classes = ["fseg", `k-${kind}`];
      const chunkId = Number(tok?.chunkId);
      if (Number.isInteger(chunkId)) {
        classes.push(`c${((chunkId % 5) + 5) % 5}`);
      }
      return `<span class="${classes.join(" ")}">${escapeHtml(text)}</span>`;
    })
    .filter(Boolean)
    .join(" ");

  return html;
}

function buildFinalMegaTokenHtml(mega) {
  const midsById = new Map(
    (Array.isArray(midUnits) ? midUnits : [])
      .filter((u) => Number.isInteger(u?.id))
      .map((u) => [Number(u.id), u])
  );

  const memberIds = [];
  const pushId = (x) => {
    const n = Number(x);
    if (!Number.isInteger(n)) return;
    if (!memberIds.includes(n)) memberIds.push(n);
  };

  (Array.isArray(mega?.tokens) ? mega.tokens : []).forEach((tok) => {
    pushId(tok?.unitId);
  });
  if (!memberIds.length) {
    (Array.isArray(mega?.unitIds) ? mega.unitIds : []).forEach((x) => pushId(x));
  }

  const segments = [];
  memberIds.forEach((uid) => {
    const unit = midsById.get(uid);
    if (!unit) return;
    const inner = buildFinalUnitTokenHtml(unit);
    if (inner) {
      segments.push(`<span class="fseg-unit">${inner}</span>`);
      return;
    }
    const text = compactWhitespace(unit?.text || "");
    if (text) {
      segments.push(`<span class="fseg-unit"><span class="fseg k-plain">${escapeHtml(text)}</span></span>`);
    }
  });

  if (segments.length) return segments.join(" ");

  const fallback = (Array.isArray(mega?.tokens) ? mega.tokens : [])
    .map((tok) => {
      const text = compactWhitespace(tok?.text || "");
      if (!text) return "";
      const kind = String(tok?.kind || "plain").toLowerCase();
      const classes = ["fseg", `k-${kind}`];
      const chunkId = Number(tok?.chunkId);
      if (Number.isInteger(chunkId)) {
        classes.push(`c${((chunkId % 5) + 5) % 5}`);
      }
      return `<span class="${classes.join(" ")}">${escapeHtml(text)}</span>`;
    })
    .filter(Boolean);

  if (fallback.length) return fallback.join(" ");
  return `<span class="fseg k-plain">${escapeHtml(compactWhitespace(mega?.text || ""))}</span>`;
}

function getMidUnitSourceEnglish(unit) {
  const labeled = compactWhitespace(unit?.label || "");
  if (labeled) return labeled;

  const q = questions[currentIndex];
  const tokens = Array.isArray(q?.sentenceTokens) ? q.sentenceTokens : [];
  const s = Number(unit?.startIdx);
  const e = Number(unit?.endIdx);
  if (Number.isInteger(s) && Number.isInteger(e) && s >= 0 && e >= s && e < tokens.length) {
    return compactWhitespace(tokens.slice(s, e + 1).join(" "));
  }

  return "";
}

function getMegaUnitSourceEnglish(unit) {
  const labeled = compactWhitespace(unit?.label || "");
  if (labeled) return labeled;

  const q = questions[currentIndex];
  const tokens = Array.isArray(q?.sentenceTokens) ? q.sentenceTokens : [];
  const s = Number(unit?.startIdx);
  const e = Number(unit?.endIdx);
  if (Number.isInteger(s) && Number.isInteger(e) && s >= 0 && e >= s && e < tokens.length) {
    return compactWhitespace(tokens.slice(s, e + 1).join(" "));
  }

  return "";
}

function getMegaUnitIndices(unit) {
  const out = new Set();

  const mids = Array.isArray(midUnits) ? midUnits : [];
  const byId = new Map(
    mids
      .filter((u) => Number.isInteger(u?.id))
      .map((u) => [Number(u.id), u])
  );

  const memberIds = Array.isArray(unit?.unitIds)
    ? unit.unitIds.map((x) => Number(x)).filter((x) => Number.isInteger(x))
    : [];
  memberIds.forEach((uid) => {
    const mu = byId.get(uid);
    const s = Number(mu?.startIdx);
    const e = Number(mu?.endIdx);
    if (!Number.isInteger(s) || !Number.isInteger(e) || e < s) return;
    for (let i = s; i <= e; i += 1) out.add(i);
  });

  if (out.size) return Array.from(out).sort((a, b) => a - b);

  const s = Number(unit?.startIdx);
  const e = Number(unit?.endIdx);
  if (Number.isInteger(s) && Number.isInteger(e) && e >= s) {
    for (let i = s; i <= e; i += 1) out.add(i);
  }

  return Array.from(out).sort((a, b) => a - b);
}

function updateSourceToggleUi(showToggle) {
  const row = document.getElementById("scramble-top-row");
  const btn = document.getElementById("source-toggle-btn");
  const popup = document.getElementById("source-popup-overlay");
  if (!row || !btn || !popup) return;

  if (!showToggle) {
    row.classList.add("hidden");
    popup.classList.add("hidden");
    return;
  }

  row.classList.remove("hidden");
  btn.textContent = sourceCollapsed ? "\uC6D0\uBB38 \uBCF4\uAE30" : "\uC6D0\uBB38 \uC228\uAE30\uAE30";
  if (sourceCollapsed) {
    popup.classList.add("hidden");
  } else {
    renderSourcePopupSentence();
    popup.classList.remove("hidden");
  }
}

function renderSourcePopupSentence() {
  const popupSentence = document.getElementById("source-popup-sentence");
  const q = questions[currentIndex];
  if (!popupSentence || !q) return;

  popupSentence.innerHTML = q.sentenceTokens
    .map((tok, i) => {
      const classes = ["tok"];
      const hi = getTokenHighlightClass(i);
      if (hi) classes.push(hi);

      const scopedChunk = stageChunks.find(
        (ch) => ch.stage2Done && Array.isArray(ch.scopeIndices) && ch.scopeIndices.includes(i)
      );
      if (scopedChunk) {
        classes.push("scope-under", `scope-under-${scopedChunk.id % 5}`);
      }

      return `<span class="${classes.join(" ")}">${escapeHtml(tok)}</span>`;
    })
    .join(" ");
}

function renderStage() {
  renderSentenceArea();
  renderChunkTray();
  syncStageHeights();
  renderZoomOverlay();

  const progress = getStageProgress();
  const stage2 = getStage2Progress();
  const sourceBox = document.getElementById("stage1-layout-box");
  const scrambleBox = document.getElementById("scramble-box");
  const sourcePopup = document.getElementById("source-popup-overlay");
  if (!scrambleBox || !sourceBox) return;

  if (!progress.done) {
    sourceCollapsed = false;
    sourceAutoArmed = true;
    sourceBox.classList.remove("source-collapsed");
    if (sourcePopup) sourcePopup.classList.add("hidden");
    updateSourceToggleUi(false);
    scrambleBox.classList.add("hidden");
    return;
  }

  if (!stage2.doneAll) {
    sourceCollapsed = false;
    sourceAutoArmed = true;
    sourceBox.classList.remove("source-collapsed");
    if (sourcePopup) sourcePopup.classList.add("hidden");
    updateSourceToggleUi(false);
    scrambleBox.classList.add("hidden");
    return;
  }

  const midProgress = getMidProgress();
  if (isMidStageActive() && !midProgress.complete) {
    sourceCollapsed = false;
    sourceAutoArmed = true;
    sourceBox.classList.remove("source-collapsed");
    if (sourcePopup) sourcePopup.classList.add("hidden");
    updateSourceToggleUi(false);
    scrambleBox.classList.add("hidden");
    return;
  }

  if (isMegaStageActive()) {
    syncMegaAutoCompletion();
  }

  const megaProgress = getMegaProgress();
  if (isMegaStageActive() && !megaProgress.complete) {
    sourceCollapsed = false;
    sourceAutoArmed = true;
    sourceBox.classList.remove("source-collapsed");
    if (sourcePopup) sourcePopup.classList.add("hidden");
    updateSourceToggleUi(false);
    scrambleBox.classList.add("hidden");
    return;
  }

  const collapseReady = (isMidStageActive() || isMegaStageActive());
  if (collapseReady) {
    if (sourceAutoArmed) {
      sourceCollapsed = true;
      sourceAutoArmed = false;
    }
    sourceBox.classList.add("source-collapsed");
    updateSourceToggleUi(true);
  } else {
    sourceCollapsed = false;
    sourceAutoArmed = true;
    sourceBox.classList.remove("source-collapsed");
    if (sourcePopup) sourcePopup.classList.add("hidden");
    updateSourceToggleUi(false);
  }

  scrambleBox.classList.remove("hidden");
  ensureScrambleReady();
  renderScramble();
}

function renderSentenceArea() {
  const q = questions[currentIndex];
  const sentenceArea = document.getElementById("sentence-area");
  if (!q || !sentenceArea) return;

  const stage1 = getStageProgress();
  const stage2 = getStage2Progress();
  const midProgress = getMidProgress();
  const megaProgress = getMegaProgress();
  const useMegaBoxes =
    stage1.done &&
    stage2.doneAll &&
    isMegaStageActive() &&
    midProgress.complete &&
    !megaProgress.complete;
  const useMidBoxes = stage1.done && stage2.doneAll && isMidStageActive() && !midProgress.complete && !useMegaBoxes;
  const focusMegaIdx = useMegaBoxes ? getNextPendingMegaUnitIdx() : -1;

  sentenceArea.innerHTML = q.sentenceTokens
    .map((tok, i) => {
      const classes = ["tok"];
      const megaForToken = stage1.done && stage2.doneAll && isMegaStageActive()
        ? findMegaUnitByTokenIdx(i)
        : null;
      const suppressWordGlow = (useMegaBoxes || (isMegaStageActive() && megaProgress.complete)) && !!megaForToken;
      if (!suppressWordGlow) {
        const hi = getTokenHighlightClass(i);
        if (hi) classes.push(hi);
      }

      if (Number.isInteger(activeChunkId)) {
        const active = stageChunks.find((x) => x.id === activeChunkId);
        if (active?.targetIndices?.includes(i)) classes.push("hint-target");
      }

      if (Number.isInteger(previewChunkId)) {
        const pch = stageChunks.find((x) => x.id === previewChunkId);
        if (pch?.targetIndices?.includes(i)) classes.push("preview-glow");
        if (previewTokenIdx === i) classes.push("preview-focus");
      }

      const anchorChunks = stageChunks.filter((ch) => ch.matched && ch.targetIndices?.includes(i));
      if (anchorChunks.length && stage1.done && !stage2.doneAll) {
        const pending = anchorChunks.some((ch) => !ch.stage2Done);
        classes.push(pending ? "zoom-ready" : "zoom-done");
      }

      const scopedChunk = stageChunks.find(
        (ch) => ch.stage2Done && Array.isArray(ch.scopeIndices) && ch.scopeIndices.includes(i)
      );
      if (scopedChunk && !suppressWordGlow) {
        classes.push("scope-under", `scope-under-${scopedChunk.id % 5}`);
      }

      if (useMegaBoxes) {
        const mega = megaForToken;
        const unit = findMidUnitByTokenIdx(i);
        if (mega && mega.done && !mega.autoDone) {
          const indices = getMegaUnitIndices(mega);
          const prevIn = indices.includes(i - 1);
          const nextIn = indices.includes(i + 1);
          classes.push("mega-unit-token", "mega-unit-done");
          if (!prevIn) classes.push("mega-unit-start");
          if (!nextIn) classes.push("mega-unit-end");
        } else {
          if (unit) {
            const uStart = Number(unit.startIdx);
            const uEnd = Number(unit.endIdx);
            classes.push("mid-unit-token", "mid-unit-done");
            if (i === uStart) classes.push("mid-unit-start");
            if (i === uEnd) classes.push("mid-unit-end");
          }

          if (mega && !mega.done && Number(mega.id) === focusMegaIdx) {
            const indices = getMegaUnitIndices(mega);
            const memberIds = getMegaUnitMemberIds(mega);
            const prevIn = indices.includes(i - 1);
            const nextIn = indices.includes(i + 1);
            classes.push("mega-unit-token", "mega-unit-next", "mega-focus-lift");
            if (!prevIn) classes.push("mega-unit-start");
            if (!nextIn) classes.push("mega-unit-end");

            if (unit) {
              const uid = Number(unit.id);
              const order = memberIds.indexOf(uid);
              if (order >= 0) {
                classes.push(order % 2 === 0 ? "mega-unit-pulse-a" : "mega-unit-pulse-b");
              }
            }
          }
        }
      } else if (useMidBoxes) {
        const unit = findMidUnitByTokenIdx(i);
        if (unit) {
          const uStart = Number(unit.startIdx);
          const uEnd = Number(unit.endIdx);
          classes.push("mid-unit-token");
          if (i === uStart) classes.push("mid-unit-start");
          if (i === uEnd) classes.push("mid-unit-end");
          if (unit.done) {
            classes.push("mid-unit-done");
          } else {
            classes.push("mid-unit-pending");
          }
        }
      }

      return `<span class="${classes.join(" ")}" data-token-idx="${i}">${escapeHtml(tok)}</span>`;
    })
    .join(" ");
}

function getTokenHighlightClass(tokenIdx) {
  const matched = stageChunks.filter((ch) => ch.matched && ch.targetIndices?.includes(tokenIdx));
  if (!matched.length) return "";
  if (matched.length > 1) return "hi-overlap";
  return `hi-${matched[0].id % 5}`;
}

function renderChunkTray() {
  const tray = document.getElementById("chunk-tray");
  if (!tray) return;

  tray.innerHTML = stageChunks
    .map((ch) => {
      const classes = ["chunk-chip", `c${ch.id % 5}`];
      if (ch.matched) classes.push("done");
      if (ch.stage2Done) classes.push("scope-done");
      if (!ch.matched && activeChunkId === ch.id) classes.push("armed");
      if (!ch.matched && previewChunkId === ch.id) classes.push("preview-react");

      return `
        <button
          type="button"
          class="${classes.join(" ")}"
          data-chunk-id="${ch.id}"
          ${!ch.matched && !isLocked ? "draggable=\"true\"" : ""}
          ${ch.matched ? "disabled" : ""}
        >
          <span class="chunk-en">${escapeHtml(ch.base)}</span>
          ${ch.meaning ? `<span class="chunk-ko">= ${escapeHtml(ch.meaning)}</span>` : ""}
        </button>
      `;
    })
    .join("");

  updatePreviewChipVisual();
}

function updatePreviewChipVisual() {
  const tray = document.getElementById("chunk-tray");
  if (!tray) return;

  const chips = tray.querySelectorAll("[data-chunk-id]");
  chips.forEach((el) => {
    const cid = Number(el.getAttribute("data-chunk-id"));
    const isPreview = Number.isInteger(cid) && cid === previewChunkId;
    el.classList.toggle("preview-react", !!isPreview);
  });
}

function syncStageHeights() {
  const leftPane = document.getElementById("left-pane");
  const stageBank = document.getElementById("bank-pane");
  const tray = document.getElementById("chunk-tray");
  if (!leftPane || !stageBank || !tray) return;

  const h = Math.ceil(leftPane.getBoundingClientRect().height);
  if (!Number.isFinite(h) || h <= 0) return;

  stageBank.style.height = `${h}px`;
  tray.style.height = `${h}px`;
}

function getStageProgress() {
  const total = stageChunks.length;
  const matched = stageChunks.filter((x) => x.matched).length;
  const done = total === 0 ? true : matched === total;
  return { total, matched, done };
}

function ensureScrambleReady() {
  const q = questions[currentIndex];
  if (!q) return;

  if (isMidStageActive() || isMegaStageActive()) return;
  if (selectedTokens.length || bankTokens.length) return;

  const configured = Array.isArray(q.configuredKRTokens) ? q.configuredKRTokens : [];
  const parts = configured.length
    ? configured.map((x) => ({
        text: compactWhitespace(x?.text || ""),
        chunkId: Number.isInteger(x?.chunkId) ? Number(x.chunkId) : null,
      }))
    : tokenizeKorean(q.answerKorean).map((text) => ({ text, chunkId: null }));

  bankTokens = shuffleArray(
    parts
      .filter((x) => x.text)
      .map((x, i) => ({
      id: `k${currentIndex}_${i}_${Math.random().toString(16).slice(2, 7)}`,
        text: x.text,
        chunkId: x.chunkId,
      }))
  );
}

function renderScramble() {
  const answerLineEl = document.getElementById("answer-line");
  const bankAreaEl = document.getElementById("bank-area");
  const remainInfoEl = document.getElementById("remain-info");
  if (!answerLineEl || !bankAreaEl || !remainInfoEl) return;

  const midProgress = getMidProgress();
  const megaProgress = getMegaProgress();
  const lockByMid = isMidStageActive() && !midProgress.complete;
  const lockByMega = isMegaStageActive() && !megaProgress.complete;
  const scrambleLocked = isLocked || lockByMid || lockByMega;

  if (window.PleksScramble?.render) {
    window.PleksScramble.render({
      answerLineEl,
      bankAreaEl,
      remainInfoEl,
      state: {
        selectedTokens,
        bankTokens,
        isLocked: scrambleLocked,
      },
      onSelectToken: (tok) => {
        if (scrambleLocked) return;
        const i = bankTokens.findIndex((x) => x.id === tok.id);
        if (i < 0) return;
        const [moved] = bankTokens.splice(i, 1);
        if (moved) selectedTokens.push(moved);
      },
      onUnselectLast: () => {
        if (scrambleLocked) return;
        const moved = selectedTokens.pop();
        if (moved) bankTokens.push(moved);
      },
      decorateToken: (el, tok) => {
        decorateScrambleTokenByChunk(el, tok, { stage: "final" });
      },
      rerender: renderScramble,
    });
    if (lockByMid) {
      remainInfoEl.textContent = `Unit progress: ${midProgress.done}/${midProgress.total}`;
    } else if (lockByMega) {
      remainInfoEl.textContent = `Mega progress: ${megaProgress.done}/${megaProgress.total}`;
    }
    return;
  }

  // fallback
  answerLineEl.innerHTML = selectedTokens.map((x) => `<span>${escapeHtml(x.text)}</span>`).join(" ");
  bankAreaEl.innerHTML = bankTokens.map((x) => `<span>${escapeHtml(x.text)}</span>`).join(" ");
  if (lockByMid) {
    remainInfoEl.textContent = `Unit progress: ${midProgress.done}/${midProgress.total}`;
  } else if (lockByMega) {
    remainInfoEl.textContent = `Mega progress: ${megaProgress.done}/${megaProgress.total}`;
  } else {
    remainInfoEl.textContent = `Remaining: ${bankTokens.length}`;
  }
}

function decorateScrambleTokenByChunk(el, tok, options) {
  if (!el || !tok) return;

  const stage = String(options?.stage || "final").toLowerCase();
  const isFinalStage = stage === "final";
  const parentId = el.parentElement?.id || "";
  const inFinalBank = parentId === "bank-area";
  const hasSegmentHtml = typeof tok.html === "string" && tok.html.includes("fseg");
  const chunkId = Number(tok.chunkId);
  const hasTheme = Number.isInteger(chunkId);
  const theme = hasTheme ? getChunkTheme(chunkId) : null;
  const kind = String(tok.kind || "plain").toLowerCase();

  if (isFinalStage) {
    el.style.padding = hasSegmentHtml ? "5px 7px" : "5px 8px";
    el.style.fontSize = "11px";
    el.style.lineHeight = "1.06";
    el.style.minHeight = "24px";
    el.style.borderRadius = "12px";
    el.style.margin = inFinalBank ? "4px 4px 0 0" : "0 4px 0 0";
  }

  if (hasSegmentHtml) {
    el.style.background = "#fff";
    if (inFinalBank) {
      el.style.border = "1px solid rgba(126,49,6,0.22)";
    } else {
      el.style.borderColor = "rgba(126,49,6,0.22)";
    }
    el.style.boxShadow = "none";
    el.style.color = "#2b1708";
    return;
  }

  if (kind === "plain") {
    if (theme) {
      el.style.background = `linear-gradient(180deg, ${theme.soft} 0%, #ffffff 100%)`;
      el.style.boxShadow = `inset 0 0 0 1px ${theme.border}`;
      el.style.color = "#2b1708";
    }
    return;
  }

  if (!theme) return;

  if (kind === "chunk") {
    el.style.background = `linear-gradient(180deg, ${theme.fill} 0%, ${theme.soft} 100%)`;
    el.style.boxShadow = `inset 0 0 0 1px ${theme.border}, 0 0 0 1px rgba(255,255,255,0.45)`;
    el.style.color = "#2b1708";
    return;
  }

  if (kind === "lasso") {
    el.style.background = "#ffffff";
    el.style.borderStyle = "dashed";
    el.style.borderWidth = "2px";
    el.style.borderColor = theme.border;
    el.style.boxShadow = `inset 0 0 0 1px ${theme.soft}`;
    el.style.color = "#2b1708";
    return;
  }
}

function submitCurrent() {
  const q = questions[currentIndex];
  if (!q || isLocked) return;

  const progress = getStageProgress();
  if (!progress.done) {
    showToast("no", "Complete Stage1 first.");
    return;
  }

  const stage2 = getStage2Progress();
  if (!stage2.doneAll) {
    showToast("no", "문장에서 chunk를 눌러 범위를 먼저 확인하세요.");
    return;
  }

  const midProgress = getMidProgress();
  if (isMidStageActive() && !midProgress.complete) {
    showToast("no", "Complete all unit popups first.");
    return;
  }

  const megaProgress = getMegaProgress();
  if (isMegaStageActive() && !megaProgress.complete) {
    showToast("no", "Complete all mega unit popups first.");
    return;
  }

  const userKorean = selectedTokens.map((t) => t.text).join(" ").trim();
  const correct = normalizeKoreanForCompare(userKorean) === q.answerNorm;

  if (!correct) {
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L3-E4 / Q${q.qNumber}`,
      question: buildQuestionLog(q),
      selected: buildSelectedLog(userKorean),
      correct: false,
      modelAnswer: q.answerKorean,
    });
    showToast("no", "Incorrect.");
    return;
  }

  isLocked = true;
  upsertResult({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Pleks L3-E4 / Q${q.qNumber}`,
    question: buildQuestionLog(q),
    selected: buildSelectedLog(userKorean),
    correct: true,
    modelAnswer: q.answerKorean,
  });

  const submitBtn = document.getElementById("submit-btn");
  const nextBtn = document.getElementById("next-btn");
  if (submitBtn) submitBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;

  renderScramble();
  showToast("ok", "Correct.");
}

function goNext() {
  closeMidPopup();
  closeMegaPopup();

  const q = questions[currentIndex];
  if (q && !isLocked) {
    const userKorean = selectedTokens.map((t) => t.text).join(" ").trim();
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L3-E4 / Q${q.qNumber}`,
      question: buildQuestionLog(q),
      selected: buildSelectedLog(userKorean),
      correct: false,
      modelAnswer: q.answerKorean,
    });
  }

  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }
  renderQuestion();
}

function buildQuestionLog(q) {
  const chunkText = (q.chunks || [])
    .map((ch) => `${ch.base}${ch.meaning ? ` (= ${ch.meaning})` : ""}`)
    .join(" | ");
  return `${q.sentence} | chunks: ${chunkText}`;
}

function buildSelectedLog(userKorean) {
  const chunkText = stageChunks
    .map((ch) => `${ch.base}[${formatIndices(ch.targetIndices)}]`)
    .join(" | ");
  return `${userKorean || "No answer"} | chunk: ${chunkText || "-"}`;
}

function formatIndices(indices) {
  if (!Array.isArray(indices) || !indices.length) return "-";
  return indices.map((i) => i + 1).join(",");
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
        word: `Pleks L3-E4 / Q${q.qNumber}`,
        question: buildQuestionLog(q),
        selected: "No answer",
        correct: false,
        modelAnswer: q.answerKorean,
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

  alert("Result module not found.");
}

function showToast(type, message) {
  if (window.PleksToastFX?.show) {
    window.PleksToastFX.show(type, message);
  }
}

function tokenizeKorean(text) {
  return compactWhitespace(text).split(" ").filter(Boolean);
}

function splitSentenceTokens(text) {
  return compactWhitespace(text).split(" ").filter(Boolean);
}

function compactWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEnglishToken(token) {
  return String(token || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function normalizeKoreanForCompare(text) {
  return String(text || "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .trim();
}

function shuffleArray(arr) {
  const a = Array.isArray(arr) ? arr.slice() : [];
  for (let i = a.length - 1; i > 0; i -= 1) {
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
