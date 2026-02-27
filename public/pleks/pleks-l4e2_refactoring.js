const EXCEL_FILE = "LTRYI-pleks-l4e2-questions.xlsx";
const TARGET_LESSON = 4;
const TARGET_EXERCISE = 2;
const MAX_QUESTIONS = 0;

const FRAG_COLORS = [
  { solid: "#e0a23f", soft: "#ffe8be" },
  { solid: "#71a8e0", soft: "#dcedff" },
  { solid: "#84ca79", soft: "#def5da" },
  { solid: "#e191ba", soft: "#ffe1ef" },
  { solid: "#ac8edf", soft: "#ece3ff" },
  { solid: "#d58a62", soft: "#ffe7d8" },
  { solid: "#79b6ae", soft: "#dcf5f1" },
];

let questions = [];
let currentIndex = 0;
let results = [];
let stageMode = "merge"; // merge -> final
let isLocked = false;
let clusterDragState = null;
let finalDragFragId = null;

let subcategory = "Grammar";
let level = "Basic";
let day = "312";
let quizTitle = "quiz_Grammar_Basic_312";
let userId = "";
let lessonTitle = "";
let exerciseTitle = "";

window.addEventListener("DOMContentLoaded", async () => {
  if (window.PleksToastFX?.init) {
    window.PleksToastFX.init({ hostId: "cafe_int", top: 10 });
  }

  applyQueryParams();
  wireBackButton();

  try {
    const rows = await loadExcelRows(EXCEL_FILE);
    questions = buildQuestions(rows);
  } catch (err) {
    console.error(err);
    alert(`Failed to load: ${EXCEL_FILE}`);
    return;
  }

  if (!questions.length) {
    renderEmpty("No L4-E2 rows found.");
    return;
  }

  buildLessonMeta();
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

function buildLessonMeta() {
  const q0 = questions[0];
  lessonTitle = `Lesson ${TARGET_LESSON}`;
  exerciseTitle = compactWhitespace(String(q0?.title || "")) || "Fragments to Sentence";
}

function renderIntro() {
  const mount = getMount();
  if (!mount) return;
  mount.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L4-E2 (Draft)</div>
      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Total ${questions.length}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>
      <div style="font-size:14px; font-weight:900; color:#444; margin-bottom:2px;">${escapeHtml(lessonTitle)}</div>
      <div style="font-size:13px; color:#555; margin-bottom:8px;">${escapeHtml(exerciseTitle)}</div>
      <div style="font-size:12px; color:#7e3106; line-height:1.35; letter-spacing:-0.2px;">
        Stage 1: merge fragments by overlap. Stage 2: final check.
      </div>
      <button class="quiz-btn" style="width:100%; margin-top:12px;" onclick="startQuiz()">Start</button>
    </div>
  `;
}

function startQuiz() {
  if (!questions.length) {
    alert("No questions found for this lesson/exercise.");
    return;
  }
  questions.forEach((q) => {
    if (q) q.state = null;
  });
  currentIndex = 0;
  results = [];
  stageMode = "merge";
  isLocked = false;
  renderQuestion();
}

function wireBackButton() {
  const backBtn = document.getElementById("back-btn");
  if (!backBtn) return;
  backBtn.addEventListener("click", () => history.back());
}

function getMount() {
  return document.getElementById("quiz-content");
}

function renderEmpty(text) {
  const mount = getMount();
  if (!mount) return;
  mount.innerHTML = `<div class="status">${escapeHtml(text)}</div>`;
}

function showToast(type, text) {
  if (window.PleksToastFX?.show) {
    window.PleksToastFX.show(type, text);
    return;
  }
  console.log(type, text);
}

async function loadExcelRows(filename) {
  const bust = `v=${Date.now()}`;
  const url = filename.includes("?") ? `${filename}&${bust}` : `${filename}?${bust}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status} (${filename})`);

  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function getRowValue(row, keys) {
  if (!row || typeof row !== "object") return "";
  const list = Array.isArray(keys) ? keys : [keys];

  for (let i = 0; i < list.length; i += 1) {
    const key = String(list[i] || "");
    if (!key) continue;
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }

  const lowered = new Map(
    Object.keys(row).map((k) => [String(k).toLowerCase().replace(/\s+/g, ""), k])
  );
  for (let i = 0; i < list.length; i += 1) {
    const probe = String(list[i] || "").toLowerCase().replace(/\s+/g, "");
    if (!probe) continue;
    const hit = lowered.get(probe);
    if (hit && Object.prototype.hasOwnProperty.call(row, hit)) return row[hit];
  }
  return "";
}

function parsePipeListCell(raw) {
  return String(raw ?? "")
    .split("||")
    .map((x) => compactWhitespace(x))
    .filter(Boolean);
}

function parseJsonCell(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_err) {
    return null;
  }
}

function canonicalFragKeyFromNos(list) {
  const nos = Array.from(
    new Set((Array.isArray(list) ? list : []).map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0))
  ).sort((a, b) => a - b);
  return nos.join("+");
}

function parseFragKeyToCanonical(keyRaw) {
  const text = compactWhitespace(keyRaw);
  if (!text) return "";
  const nums = text
    .split("+")
    .map((x) => Number(compactWhitespace(x)))
    .filter((x) => Number.isInteger(x) && x > 0);
  return canonicalFragKeyFromNos(nums);
}

function normalizeClusterKoMap(raw) {
  const out = {};
  if (!raw) return out;

  if (Array.isArray(raw)) {
    raw.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const result = compactWhitespace(item.result || item.kr || item.text || item.value || "");
      if (!result) return;

      let key = "";
      if (Array.isArray(item.fragNos)) {
        key = canonicalFragKeyFromNos(item.fragNos);
      } else if (Array.isArray(item.fragNoSet)) {
        key = canonicalFragKeyFromNos(item.fragNoSet);
      } else if (typeof item.key === "string") {
        key = parseFragKeyToCanonical(item.key);
      } else if (Number.isInteger(Number(item.fragNo)) && Number(item.fragNo) > 0) {
        // Legacy sequential format: fragNo=n means cumulative 1..n
        key = canonicalFragKeyFromNos(Array.from({ length: Number(item.fragNo) }, (_, i) => i + 1));
      }
      if (!key) return;
      out[key] = result;
    });
    return out;
  }

  if (typeof raw === "object") {
    Object.entries(raw).forEach(([k, v]) => {
      const key = parseFragKeyToCanonical(k);
      const result = compactWhitespace(v);
      if (!key || !result) return;
      out[key] = result;
    });
  }
  return out;
}

function parseFragmentIndexCell(raw) {
  const text = compactWhitespace(raw);
  if (!text) return [];
  const parts = text
    .split(",")
    .map((x) => compactWhitespace(x))
    .filter(Boolean);
  const out = [];
  parts.forEach((part) => {
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) return;
    const a = Number(m[1]);
    const b = Number(m[2] || m[1]);
    if (!Number.isInteger(a) || !Number.isInteger(b)) return;
    const s = Math.min(a, b);
    const e = Math.max(a, b);
    for (let n = s; n <= e; n += 1) {
      out.push(n - 1); // 1-based -> 0-based
    }
  });
  return Array.from(new Set(out)).sort((x, y) => x - y);
}

function sanitizeEnFragmentText(text) {
  return compactWhitespace(String(text || "").replace(/[~～∼˜]/g, ""));
}

function parseGuidedQuestionField(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const fragMatch = text.match(/Fragments:\s*([\s\S]*)$/i);
  const fragRaw = compactWhitespace(fragMatch ? fragMatch[1] : text);
  const parts = fragRaw ? fragRaw.split(/(?=\d+\)\s*)/g) : [];

  const fragments = [];
  parts.forEach((part) => {
    const p = compactWhitespace(part);
    if (!/^\d+\)/.test(p)) return;
    const body = compactWhitespace(p.replace(/^\d+\)\s*/, ""));
    const m = body.match(/^(.*?)(?:\s+\u2013\s+|\s+-\s+)(.+)$/);
    const en = sanitizeEnFragmentText(m ? m[1] : body);
    const ko = compactWhitespace(m ? m[2] : "");
    if (!en) return;
    fragments.push({ en, ko });
  });
  return { fragments };
}

function splitSentenceTokens(sentence) {
  return compactWhitespace(sentence)
    .split(/\s+/)
    .filter(Boolean);
}

function splitSpaceTokens(text) {
  return compactWhitespace(text)
    .split(/\s+/)
    .map((x) => compactWhitespace(x))
    .filter(Boolean);
}

function compactWhitespace(text) {
  return String(text || "")
    .replace(/\r\n/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shuffleArray(arr) {
  const out = Array.isArray(arr) ? arr.slice() : [];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function normalizeSentence(text) {
  return splitSpaceTokens(text)
    .map((x) => normalizeWord(x))
    .filter(Boolean)
    .join(" ");
}

function pickFragColor(fragId) {
  if (!Number.isInteger(Number(fragId))) return FRAG_COLORS[0];
  const idx = ((Number(fragId) % FRAG_COLORS.length) + FRAG_COLORS.length) % FRAG_COLORS.length;
  return FRAG_COLORS[idx] || FRAG_COLORS[0];
}

function hexToRgb(hex) {
  const h = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return { r: 238, g: 238, b: 238 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function mixHex(a, b, t) {
  const p = Number.isFinite(t) ? Math.max(0, Math.min(1, Number(t))) : 0;
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * p,
    c1.g + (c2.g - c1.g) * p,
    c1.b + (c2.b - c1.b) * p
  );
}

function rgbaFromHex(hex, alpha) {
  const c = hexToRgb(hex);
  const a = Number.isFinite(Number(alpha)) ? Math.max(0, Math.min(1, Number(alpha))) : 1;
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

function buildOverlapBackground(ids) {
  const list = (ids || []).slice(0, 4);
  if (!list.length) return "";
  if (list.length === 1) {
    const c = FRAG_COLORS[list[0] % FRAG_COLORS.length];
    const soft = rgbaFromHex(mixHex(c.solid, "#ffffff", 0.24), 0.56);
    const bd = mixHex(c.solid, "#ffffff", 0.06);
    return `background:${soft}; border-color:${bd};`;
  }

  const step = 100 / list.length;
  const stops = list
    .map((id, i) => {
      const c = FRAG_COLORS[id % FRAG_COLORS.length];
      const soft = rgbaFromHex(mixHex(c.solid, "#ffffff", 0.20), 0.52);
      const s = (i * step).toFixed(3);
      const e = ((i + 1) * step).toFixed(3);
      return `${soft} ${s}%, ${soft} ${e}%`;
    })
    .join(", ");
  return `background:linear-gradient(90deg, ${stops}); border-color:${mixHex("#7d6048", "#ffffff", 0.06)};`;
}

function buildQuestions(rows) {
  const filtered = (rows || [])
    .filter((r) => Number(r?.Lesson) === TARGET_LESSON && Number(r?.Exercise) === TARGET_EXERCISE)
    .sort((a, b) => Number(a?.QNumber) - Number(b?.QNumber));

  const selected = MAX_QUESTIONS > 0 ? filtered.slice(0, MAX_QUESTIONS) : filtered;

  return selected
    .map((row, i) => {
      const parsed = parseGuidedQuestionField(getRowValue(row, ["Question"]));
      const enFromCols = parsePipeListCell(getRowValue(row, ["FragmentENList", "FragmentsEN", "FragmentEN"]));
      const koFromCols = parsePipeListCell(getRowValue(row, ["FragmentKOList", "FragmentsKO", "FragmentKO"]));
      const indexFromCols = parsePipeListCell(getRowValue(row, ["Index", "FragmentIndexList", "FragmentIndex"]));
      const clusterKoMapRaw = parseJsonCell(getRowValue(row, ["ClusterKRMap", "fragments_cluster_krmap", "fragments_kr_mergemap"]));
      const clusterKoMap = normalizeClusterKoMap(clusterKoMapRaw);
      const fallbackFragments = Array.isArray(parsed.fragments) ? parsed.fragments : [];
      const fragCount = Math.max(enFromCols.length, koFromCols.length, indexFromCols.length, fallbackFragments.length);
      if (!fragCount) return null;

      const answer = compactWhitespace(getRowValue(row, ["Answer"]));
      if (!answer) return null;
      const answerTokens = splitSentenceTokens(answer);
      if (!answerTokens.length) return null;

      const fragments = Array.from({ length: fragCount }, (_, idx) => {
        const fb = fallbackFragments[idx] || {};
        const en = sanitizeEnFragmentText(enFromCols[idx] || fb.en || "");
        const ko = compactWhitespace(koFromCols[idx] || fb.ko || "");
        const sentenceIndices = parseFragmentIndexCell(indexFromCols[idx] || "");
        if (!en) return null;
        return {
          id: idx,
          no: idx + 1,
          en,
          ko,
          sentenceIndices,
        };
      }).filter(Boolean);
      if (!fragments.length) return null;

      return {
        id: i,
        qNumber: Number(getRowValue(row, ["QNumber"])) || i + 1,
        title: compactWhitespace(String(getRowValue(row, ["Title"]) || "").trim()) || "Fragments to Sentence Reconstruction",
        instruction: String(getRowValue(row, ["Instruction"]) || "").trim(),
        answer,
        answerTokens,
        fragments,
        clusterKoMap,
        state: null,
      };
    })
    .filter(Boolean);
}

function createQuestionState() {
  return {
    clusters: [], // { id:number, tokenItems:Array<{text, owners:number[], sentenceIdx:number|null}>, fragIds:number[], x:number, y:number, z:number }
    usedFragIds: [],
    pendingClusterId: null,
    nextClusterId: 1,
    zTick: 1,
    initialScatterApplied: false,
    initialScatterRendered: false,
    finalArrange: null, // { chipOrder:number[], placedByFragId:Record<number,boolean> }
  };
}

function getCurrentQuestion() {
  return questions[currentIndex] || null;
}

function getQuestionState(q) {
  if (!q) return null;
  if (!q.state) q.state = createQuestionState();
  return q.state || null;
}

function resetQuestionState(q) {
  if (!q) return;
  q.state = createQuestionState();
}

function getFragmentById(q, fragId) {
  return (q?.fragments || []).find((f) => Number(f.id) === Number(fragId)) || null;
}

function tokenizeFragmentText(frag) {
  return splitSpaceTokens(String(frag?.en || ""));
}

function tokenizeFragmentWithMeta(frag) {
  const texts = tokenizeFragmentText(frag);
  const indices = Array.isArray(frag?.sentenceIndices) ? frag.sentenceIndices : [];
  return texts.map((text, i) => ({
    text,
    owners: [Number(frag?.id)],
    sentenceIdx: Number.isInteger(indices[i]) ? Number(indices[i]) : null,
  }));
}

function cloneTokenItem(tok) {
  return {
    text: String(tok?.text || ""),
    owners: Array.from(new Set((Array.isArray(tok?.owners) ? tok.owners : []).map((x) => Number(x)).filter((x) => Number.isInteger(x)))),
    sentenceIdx: Number.isInteger(Number(tok?.sentenceIdx)) ? Number(tok.sentenceIdx) : null,
  };
}

function initialClusterPos(q, orderIdx, totalCount) {
  const total = Math.max(1, Number(totalCount) || Number(q?.fragments?.length) || 1);
  const cols = total <= 4 ? 2 : total <= 9 ? 3 : 4;
  const row = Math.floor(orderIdx / cols);
  const col = orderIdx % cols;
  const cellW = 86 / cols;
  const cellH = total <= 4 ? 34 : total <= 9 ? 24 : 20;
  const baseX = 3 + col * cellW;
  const baseY = 4 + row * cellH;
  const jx = (Math.random() - 0.5) * Math.min(16, cellW * 0.72);
  const jy = (Math.random() - 0.5) * Math.min(12, cellH * 0.72);
  return {
    x: Math.max(1, Math.min(92, baseX + jx)),
    y: Math.max(1, Math.min(82, baseY + jy)),
  };
}

function getClusterById(state, clusterId) {
  const cid = Number(clusterId);
  if (!Number.isInteger(cid)) return null;
  return (state?.clusters || []).find((c) => Number(c?.id) === cid) || null;
}

function getClusterStartIndex(cluster) {
  const idxs = (cluster?.tokenItems || [])
    .map((t) => Number(t?.sentenceIdx))
    .filter((n) => Number.isInteger(n));
  if (!idxs.length) return Number.POSITIVE_INFINITY;
  return Math.min(...idxs);
}

function sortClusters(state) {
  if (!state || !Array.isArray(state.clusters)) return;
  state.clusters.sort((a, b) => {
    const sa = getClusterStartIndex(a);
    const sb = getClusterStartIndex(b);
    if (sa !== sb) return sa - sb;
    return Number(a?.id) - Number(b?.id);
  });
}

function makeCluster(state, tokenItems, fragIds) {
  if (!state) return null;
  const cid = Number(state.nextClusterId);
  state.nextClusterId = Number.isInteger(cid) ? cid + 1 : 2;
  return {
    id: Number.isInteger(cid) ? cid : 1,
    tokenItems: (tokenItems || []).map((tok) => cloneTokenItem(tok)),
    fragIds: Array.from(new Set((fragIds || []).map((x) => Number(x)).filter((x) => Number.isInteger(x)))),
    x: 4,
    y: 4,
    xPx: null,
    yPx: null,
    z: Number.isInteger(state?.zTick) ? state.zTick : 1,
  };
}

function hasPendingCluster(state) {
  if (!Number.isInteger(state?.pendingClusterId)) return false;
  return Boolean(getClusterById(state, state.pendingClusterId));
}

function clearPendingCluster(state) {
  if (!state) return;
  state.pendingClusterId = null;
}

function blurPendingSelection(opts = {}) {
  const state = getQuestionState(getCurrentQuestion());
  if (!state || !hasPendingCluster(state)) return false;
  clearPendingCluster(state);
  if (!opts.silent) renderStage();
  return true;
}

function bringClusterToFront(state, clusterId) {
  if (!state) return;
  const cluster = getClusterById(state, clusterId);
  if (!cluster) return;
  state.zTick = Number.isInteger(state.zTick) ? state.zTick + 1 : 2;
  cluster.z = state.zTick;
}

function buildPendingCandidates(baseTokens, incomingTokens) {
  const incomingIdxSet = new Set(
    (incomingTokens || [])
      .map((x) => Number(x?.sentenceIdx))
      .filter((x) => Number.isInteger(x))
  );
  if (incomingIdxSet.size > 0) {
    const indices = [];
    const normByIdx = {};
    (baseTokens || []).forEach((tok, idx) => {
      const s = Number(tok?.sentenceIdx);
      if (!Number.isInteger(s) || !incomingIdxSet.has(s)) return;
      indices.push(idx);
      normByIdx[idx] = normalizeWord(tok?.text || "");
    });
    if (indices.length) return { indices, normByIdx };
  }

  const incomingNormSet = new Set((incomingTokens || []).map((x) => normalizeWord(x?.text || "")).filter(Boolean));
  const indices = [];
  const normByIdx = {};

  (baseTokens || []).forEach((tok, idx) => {
    const n = normalizeWord(tok?.text || "");
    if (!n || !incomingNormSet.has(n)) return;
    indices.push(idx);
    normByIdx[idx] = n;
  });
  return { indices, normByIdx };
}

function createClusterFromFragment(state, frag, pos = null) {
  const tokens = tokenizeFragmentWithMeta(frag);
  const cluster = makeCluster(state, tokens, [Number(frag?.id)]);
  if (!cluster) return null;
  if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
    cluster.x = Number(pos.x);
    cluster.y = Number(pos.y);
  }
  return cluster;
}

function seedInitialStateIfNeeded(q) {
  const state = getQuestionState(q);
  if (!q || !state) return;
  if (!Array.isArray(q.fragments) || !q.fragments.length) return;
  if ((state.usedFragIds && state.usedFragIds.length) || (state.clusters && state.clusters.length)) return;

  const sorted = (q.fragments || []).slice().sort((a, b) => Number(a.no) - Number(b.no));
  const shuffledSlots = shuffleArray(Array.from({ length: sorted.length }, (_, i) => i));
  const clusters = [];
  sorted.forEach((frag, idx) => {
    const pos = initialClusterPos(q, shuffledSlots[idx], sorted.length);
    const c = createClusterFromFragment(state, frag, pos);
    if (!c) return;
    c.z = (state.zTick += 1);
    clusters.push(c);
  });
  state.clusters = clusters;
  state.usedFragIds = sorted.map((f) => Number(f.id)).filter((n) => Number.isInteger(n));
  state.pendingClusterId = null;
  state.initialScatterApplied = true;
  sortClusters(state);
}

function isInitialClusterLayout(q, state) {
  if (!q || !state) return false;
  const total = Array.isArray(q.fragments) ? q.fragments.length : 0;
  const clusters = Array.isArray(state.clusters) ? state.clusters : [];
  if (!total || clusters.length !== total) return false;
  const usedCount = Array.isArray(state.usedFragIds) ? state.usedFragIds.length : 0;
  if (usedCount !== total) return false;
  return clusters.every((c) => Array.isArray(c?.fragIds) && c.fragIds.length === 1);
}

function applyRandomScatterLayout(q, state) {
  if (!q || !state) return;
  const clusters = Array.isArray(state.clusters) ? state.clusters.slice() : [];
  if (!clusters.length) return;

  const slots = shuffleArray(Array.from({ length: clusters.length }, (_, i) => i));
  clusters.forEach((cluster, idx) => {
    const pos = initialClusterPos(q, slots[idx], clusters.length);
    cluster.x = Number(pos.x);
    cluster.y = Number(pos.y);
    cluster.xPx = null;
    cluster.yPx = null;
    cluster.z = Number.isInteger(state.zTick) ? state.zTick + 1 + idx : idx + 2;
  });
  state.zTick = clusters.reduce((acc, c) => Math.max(acc, Number(c?.z || 0)), Number(state.zTick) || 1);
  state.initialScatterApplied = true;
  state.initialScatterRendered = false;
}

function ensureInitialScatterLayout(q, state) {
  if (!q || !state) return;
  if (!isInitialClusterLayout(q, state)) return;
  if (state.initialScatterApplied === true) return;
  applyRandomScatterLayout(q, state);
}

function scatterInitialClustersToZone(q, state, zoneW, zoneH) {
  if (!q || !state) return;
  if (!isInitialClusterLayout(q, state)) return;
  if (state.initialScatterRendered === true) return;

  const clusters = Array.isArray(state.clusters) ? state.clusters : [];
  if (!clusters.length) return;

  const w = Math.max(320, Number(zoneW) || 0);
  const h = Math.max(170, Number(zoneH) || 0);
  const cols = clusters.length <= 4 ? 2 : clusters.length <= 9 ? 3 : 4;
  const rows = Math.max(1, Math.ceil(clusters.length / cols));
  const slotW = w / cols;
  const slotH = h / rows;
  const slotOrder = shuffleArray(Array.from({ length: clusters.length }, (_, i) => i));

  clusters.forEach((cluster, i) => {
    const s = slotOrder[i];
    const row = Math.floor(s / cols);
    const col = s % cols;
    const cx = col * slotW + slotW * 0.5;
    const cy = row * slotH + slotH * 0.5;
    const jitterX = (Math.random() - 0.5) * Math.min(60, slotW * 0.6);
    const jitterY = (Math.random() - 0.5) * Math.min(34, slotH * 0.58);
    const left = clampNumber(cx + jitterX - 90, 0, Math.max(0, w - 120));
    const top = clampNumber(cy + jitterY - 22, -8, Math.max(0, h - 44));

    cluster.xPx = left;
    cluster.yPx = top;
    cluster.x = w > 0 ? (left / w) * 100 : 4;
    cluster.y = h > 0 ? (top / h) * 100 : 4;
    cluster.z = Number.isInteger(state.zTick) ? state.zTick + i + 1 : i + 2;
  });

  state.zTick = clusters.reduce((acc, c) => Math.max(acc, Number(c?.z || 0)), Number(state.zTick) || 1);
  state.initialScatterRendered = true;
}

function selectPendingCluster(clusterId, opts = {}) {
  const silent = Boolean(opts?.silent);
  if (isLocked || stageMode !== "merge") return;
  const state = getQuestionState(getCurrentQuestion());
  if (!state) return;
  const cluster = getClusterById(state, clusterId);
  if (!cluster) return;
  if (Number(state.pendingClusterId) === Number(cluster.id)) {
    clearPendingCluster(state);
    renderStage();
    if (!silent) showToast("ok", "Selection cleared.");
    return;
  }
  state.pendingClusterId = cluster.id;
  bringClusterToFront(state, cluster.id);
  renderStage();
  if (!silent) showToast("ok", "Cluster selected.");
}

function mergeTokenItems(baseTokens, incomingTokens, basePivotIdx, pivotNorm) {
  const base = (baseTokens || []).map((tok) => cloneTokenItem(tok));
  const incoming = (incomingTokens || []).map((tok) => cloneTokenItem(tok));
  if (!base.length) return incoming;
  if (!incoming.length) return base;

  const hasBaseSentenceIdx = base.some((t) => Number.isInteger(Number(t?.sentenceIdx)));
  const hasIncomingSentenceIdx = incoming.some((t) => Number.isInteger(Number(t?.sentenceIdx)));
  if (hasBaseSentenceIdx && hasIncomingSentenceIdx) {
    const byIdx = new Map();
    const loose = [];
    let orderTick = 0;

    const ingest = (tok) => {
      const item = cloneTokenItem(tok);
      const sidx = Number(item?.sentenceIdx);
      const ord = orderTick;
      orderTick += 1;

      if (Number.isInteger(sidx)) {
        const prev = byIdx.get(sidx);
        if (!prev) {
          byIdx.set(sidx, { ...item, __ord: ord });
          return;
        }
        prev.owners = Array.from(new Set([...(prev.owners || []), ...(item.owners || [])]));
        if (!compactWhitespace(prev.text) && compactWhitespace(item.text)) prev.text = item.text;
        return;
      }

      loose.push({ ...item, __ord: ord });
    };

    base.forEach(ingest);
    incoming.forEach(ingest);

    const indexed = Array.from(byIdx.values())
      .sort((a, b) => {
        const ai = Number(a?.sentenceIdx);
        const bi = Number(b?.sentenceIdx);
        if (ai !== bi) return ai - bi;
        return Number(a?.__ord || 0) - Number(b?.__ord || 0);
      })
      .map((x) => {
        const out = cloneTokenItem(x);
        return out;
      });

    const looseOrdered = loose
      .sort((a, b) => Number(a?.__ord || 0) - Number(b?.__ord || 0))
      .map((x) => {
        const out = cloneTokenItem(x);
        return out;
      });

    return [...indexed, ...looseOrdered];
  }

  const basePivot = base[basePivotIdx];
  if (!basePivot) return [...base, ...incoming];

  const basePivotSentenceIdx = Number(basePivot?.sentenceIdx);
  const incomingPivotIdx = Number.isInteger(basePivotSentenceIdx)
    ? incoming.findIndex((t) => Number(t?.sentenceIdx) === basePivotSentenceIdx)
    : incoming.findIndex((t) => normalizeWord(t?.text || "") === pivotNorm);

  if (incomingPivotIdx < 0) {
    return [...base, ...incoming];
  }

  const pivotIncoming = cloneTokenItem(incoming[incomingPivotIdx]);
  const mergedPivot = cloneTokenItem(basePivot);
  mergedPivot.owners = Array.from(new Set([...(mergedPivot.owners || []), ...(pivotIncoming.owners || [])]));
  if (!Number.isInteger(mergedPivot.sentenceIdx) && Number.isInteger(pivotIncoming.sentenceIdx)) {
    mergedPivot.sentenceIdx = pivotIncoming.sentenceIdx;
  }

  const baseBefore = base.slice(0, basePivotIdx);
  const baseAfter = base.slice(basePivotIdx + 1);
  const incomingBefore = incoming.slice(0, incomingPivotIdx);
  const incomingAfter = incoming.slice(incomingPivotIdx + 1);
  return [...baseBefore, ...incomingBefore, mergedPivot, ...incomingAfter, ...baseAfter];
}

function mergePendingClusterIntoTarget(targetClusterId, targetTokenIdx) {
  if (isLocked || stageMode !== "merge") return;
  const q = getCurrentQuestion();
  const state = getQuestionState(q);
  if (!q || !state) return;
  if (!hasPendingCluster(state)) {
    showToast("no", "Select a cluster first.");
    return;
  }

  const source = getClusterById(state, state.pendingClusterId);
  const target = getClusterById(state, targetClusterId);
  if (!source || !target) return;
  if (source.id === target.id) {
    showToast("no", "Select another cluster.");
    return;
  }

  const candidates = buildPendingCandidates(target.tokenItems, source.tokenItems);
  if (!Array.isArray(candidates.indices) || !candidates.indices.includes(Number(targetTokenIdx))) {
    showToast("no", "Try another word.");
    return;
  }

  const targetIdx = Number(targetTokenIdx);
  const pivotNorm = candidates.normByIdx?.[targetIdx] || normalizeWord(target.tokenItems[targetIdx]?.text || "");
  const mergedTokens = mergeTokenItems(target.tokenItems, source.tokenItems, targetIdx, pivotNorm);
  const mergedFragIds = Array.from(new Set([...(target.fragIds || []), ...(source.fragIds || [])]));
  const mergedCluster = makeCluster(state, mergedTokens, mergedFragIds);
  if (!mergedCluster) return;
  const sx = Number.isFinite(Number(source?.xPx)) ? Number(source.xPx) : null;
  const sy = Number.isFinite(Number(source?.yPx)) ? Number(source.yPx) : null;
  const tx = Number.isFinite(Number(target?.xPx)) ? Number(target.xPx) : null;
  const ty = Number.isFinite(Number(target?.yPx)) ? Number(target.yPx) : null;
  if (sx != null && tx != null) mergedCluster.xPx = (sx + tx) / 2;
  if (sy != null && ty != null) mergedCluster.yPx = (sy + ty) / 2;
  mergedCluster.x = ((Number(source.x) || 0) + (Number(target.x) || 0)) / 2 || Number(target.x) || 4;
  mergedCluster.y = ((Number(source.y) || 0) + (Number(target.y) || 0)) / 2 || Number(target.y) || 4;
  mergedCluster.z = (Number.isInteger(state.zTick) ? state.zTick + 1 : 2);
  state.zTick = mergedCluster.z;

  state.clusters = (state.clusters || []).filter((c) => Number(c?.id) !== Number(source.id) && Number(c?.id) !== Number(target.id));
  state.clusters.push(mergedCluster);
  sortClusters(state);
  clearPendingCluster(state);

  renderStage();
  showToast("ok", "Merged.");
}

function buildMergedText(state) {
  const clusters = Array.isArray(state?.clusters) ? state.clusters : [];
  if (!clusters.length) return "";
  const sorted = clusters.slice().sort((a, b) => {
    const sa = getClusterStartIndex(a);
    const sb = getClusterStartIndex(b);
    if (sa !== sb) return sa - sb;
    return Number(a?.id) - Number(b?.id);
  });
  if (sorted.length === 1) {
    return compactWhitespace((sorted[0]?.tokenItems || []).map((x) => String(x?.text || "")).join(" "));
  }
  return sorted
    .map((cluster) => compactWhitespace((cluster?.tokenItems || []).map((x) => String(x?.text || "")).join(" ")))
    .filter(Boolean)
    .join(" || ");
}

function initFinalArrangeState(q, state) {
  if (!q || !state) return;
  if (state.finalArrange && Array.isArray(state.finalArrange.chipOrder)) return;
  const chipOrder = shuffleArray((q.fragments || []).map((f) => Number(f.id)).filter((n) => Number.isInteger(n)));
  const placedByFragId = {};
  chipOrder.forEach((fid) => {
    placedByFragId[fid] = false;
  });
  state.finalArrange = {
    chipOrder,
    placedByFragId,
  };
}

function getFinalArrangeState(q, state) {
  if (!q || !state) return null;
  initFinalArrangeState(q, state);
  return state.finalArrange || null;
}

function getFinalTokenOwners(q, finalState, tokenIdx) {
  if (!q || !finalState) return [];
  const placed = finalState.placedByFragId || {};
  const owners = [];
  (q.fragments || []).forEach((frag) => {
    const fid = Number(frag.id);
    if (!placed[fid]) return;
    const indices = Array.isArray(frag.sentenceIndices) ? frag.sentenceIndices : [];
    if (indices.includes(Number(tokenIdx))) owners.push(fid);
  });
  return owners;
}

function buildFinalTokenStyle(owners) {
  const ids = Array.isArray(owners) ? owners.slice() : [];
  if (!ids.length) return "";
  if (ids.length >= 2) return buildOverlapBackground(ids);
  const color = pickFragColor(Number(ids[0] ?? 0)).solid;
  return `--pill-bg:${rgbaFromHex(color, 0.15)}; --pill-bd:${mixHex(color, "#ffffff", 0.08)}; --pill-fg:${mixHex(color, "#2b1b12", 0.36)};`;
}

function clampNumber(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function resolveClusterPixelPos(cluster, zoneW, zoneH) {
  const w = Number.isFinite(Number(zoneW)) && Number(zoneW) > 0 ? Number(zoneW) : 1;
  const h = Number.isFinite(Number(zoneH)) && Number(zoneH) > 0 ? Number(zoneH) : 1;

  if (Number.isFinite(Number(cluster?.xPx)) && Number.isFinite(Number(cluster?.yPx))) {
    return { xPx: Number(cluster.xPx), yPx: Number(cluster.yPx) };
  }

  const xPct = Number.isFinite(Number(cluster?.x)) ? Number(cluster.x) : 4;
  const yPct = Number.isFinite(Number(cluster?.y)) ? Number(cluster.y) : 4;
  const xPx = (w * xPct) / 100;
  const yPx = (h * yPct) / 100;
  if (cluster) {
    cluster.xPx = xPx;
    cluster.yPx = yPx;
  }
  return { xPx, yPx };
}

function renderQuestion() {
  const q = getCurrentQuestion();
  const mount = getMount();
  if (!mount) return;
  if (!q) {
    showResultPopup();
    return;
  }
  if (!q.state) q.state = createQuestionState();
  seedInitialStateIfNeeded(q);
  ensureInitialScatterLayout(q, q.state);
  wireGlobalBlurEvents();
  isLocked = false;

  if (stageMode === "merge") {
    mount.innerHTML = `
      <div class="frame">
        <div class="head-row">
          <div class="q-chip">${currentIndex + 1}/${questions.length} | Q${q.qNumber}</div>
          <div class="title-text">${escapeHtml(q.title)} | Stage 1</div>
          <div class="status" id="question-status"></div>
        </div>
        <div class="inst">Tap overlap words to merge clusters. Tap again to cancel selection.</div>
        <div class="land-grid single">
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">Merged Sentence</div>
              <div class="status" id="right-status"></div>
            </div>
            <div class="slot-zone">
              <div id="merge-hint" class="status" style="margin-bottom:6px;"></div>
              <div id="merge-zone" class="slot-grid"></div>
            </div>
          </div>
        </div>
        <div class="btn-row">
          <button class="quiz-btn" id="btn-submit">Submit</button>
          <button class="quiz-btn" id="btn-next">Next</button>
          <button class="quiz-btn" id="btn-clear">Clear</button>
        </div>
      </div>
    `;
  } else {
    mount.innerHTML = `
      <div class="frame">
        <div class="head-row">
          <div class="q-chip">${currentIndex + 1}/${questions.length} | Q${q.qNumber}</div>
          <div class="title-text">${escapeHtml(q.title)} | Stage 2</div>
          <div class="status" id="question-status"></div>
        </div>
        <div class="inst">Drag shuffled fragments to the sentence. Any order is allowed.</div>
        <div class="land-grid">
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">Fragments</div>
              <div class="status" id="left-status"></div>
            </div>
            <div id="final-bank" class="bank-scroll"></div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">Sentence</div>
              <div class="status" id="right-status"></div>
            </div>
            <div class="slot-zone">
              <div id="final-hint" class="status" style="margin-bottom:6px;"></div>
              <div id="final-sentence" class="slot-grid"></div>
            </div>
          </div>
        </div>
        <div class="btn-row">
          <button class="quiz-btn" id="btn-submit">Submit</button>
          <button class="quiz-btn" id="btn-next">Next</button>
          <button class="quiz-btn" id="btn-clear">Clear</button>
        </div>
      </div>
    `;
  }

  wireButtons();
  renderStage();
}

function getClusterFragments(q, cluster) {
  const list = Array.from(
    new Set(
      (cluster?.fragIds || [])
        .map((fid) => Number(fid))
        .filter((n) => Number.isInteger(n))
    )
  )
    .map((fid) => getFragmentById(q, fid))
    .filter(Boolean)
    .sort((a, b) => Number(a.no) - Number(b.no));
  return list;
}

function getClusterFragNos(q, cluster) {
  return getClusterFragments(q, cluster)
    .map((frag) => Number(frag?.no))
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
}

function getClusterKoText(q, cluster) {
  const nos = getClusterFragNos(q, cluster);
  const key = canonicalFragKeyFromNos(nos);
  const map = q?.clusterKoMap && typeof q.clusterKoMap === "object" ? q.clusterKoMap : {};
  if (key && typeof map[key] === "string" && compactWhitespace(map[key])) {
    return compactWhitespace(map[key]);
  }

  const parts = getClusterFragments(q, cluster)
    .map((frag) => compactWhitespace(frag?.ko || ""))
    .filter(Boolean);
  return parts.join(" / ");
}

function renderStage() {
  const q = getCurrentQuestion();
  const state = getQuestionState(q);
  if (!q || !state) return;
  const topStatus = document.getElementById("question-status");
  const submitBtn = document.getElementById("btn-submit");
  const nextBtn = document.getElementById("btn-next");

  if (stageMode === "merge") {
    const mergeZone = document.getElementById("merge-zone");
    const rightStatus = document.getElementById("right-status");
    const hint = document.getElementById("merge-hint");
    const clusters = Array.isArray(state.clusters) ? state.clusters : [];
    const pendingCluster = hasPendingCluster(state) ? getClusterById(state, state.pendingClusterId) : null;

  if (mergeZone) {
    const zoneW = mergeZone.clientWidth || 600;
    const zoneH = mergeZone.clientHeight || 220;
    scatterInitialClustersToZone(q, state, zoneW, zoneH);
    const sorted = clusters.slice().sort((a, b) => Number(a?.z || 0) - Number(b?.z || 0));
      mergeZone.innerHTML = clusters.length
        ? sorted
            .map((cluster) => {
              const isPending = pendingCluster && Number(pendingCluster.id) === Number(cluster.id);
              const koText = getClusterKoText(q, cluster);
              const pos = resolveClusterPixelPos(cluster, zoneW, zoneH);

              const tokensHtml = (cluster.tokenItems || [])
                .map((tok, idx) => {
                  const owners = Array.isArray(tok?.owners) ? tok.owners.slice() : [];
                  const cls = ["token-pill", "in-slot", "merged-slot-pill"];
                  let style = "";
                  if (owners.length >= 2) {
                    style = buildOverlapBackground(owners);
                  } else {
                    const color = pickFragColor(Number(owners[0] ?? 0)).solid;
                    style = `--pill-bg:${rgbaFromHex(color, 0.15)}; --pill-bd:${mixHex(color, "#ffffff", 0.08)}; --pill-fg:${mixHex(color, "#2b1b12", 0.36)};`;
                  }
                  return `<span class="${cls.join(" ")}" data-cluster-id="${cluster.id}" data-merge-idx="${idx}" style="${style}">${escapeHtml(tok?.text || "")}</span>`;
                })
                .join(" ");

              return `
                <div class="cluster-box${isPending ? " pending" : ""}" data-cluster-id="${cluster.id}" style="left:${Number(pos?.xPx || 0)}px; top:${Number(pos?.yPx || 0)}px; z-index:${Number(cluster?.z || 1)};">
                  <div class="cluster-line">${tokensHtml}</div>
                  ${koText ? `<div class="cluster-ko">${escapeHtml(koText)}</div>` : ""}
                </div>
              `;
            })
            .join("")
        : `<span class="status">Drag a fragment to start clustering.</span>`;
    }

    if (hint) hint.textContent = hasPendingCluster(state) ? "Tap an overlap word in another cluster." : "Tap a word token to select.";

    const usedCount = Array.isArray(state.usedFragIds) ? state.usedFragIds.length : 0;
    const totalFrags = Array.isArray(q.fragments) ? q.fragments.length : 0;
    const clusterCount = clusters.length;
    if (rightStatus) rightStatus.textContent = `Fragments ${usedCount}/${totalFrags} | Clusters ${clusterCount}`;
    if (topStatus) topStatus.textContent = `Stage1 ${usedCount}/${totalFrags}`;
    if (submitBtn) submitBtn.disabled = isLocked;
    if (nextBtn) nextBtn.disabled = !isLocked;
    wireStageEvents();
    return;
  }

  const finalState = getFinalArrangeState(q, state);
  const leftStatus = document.getElementById("left-status");
  const rightStatus = document.getElementById("right-status");
  const hint = document.getElementById("final-hint");
  const bank = document.getElementById("final-bank");
  const sentence = document.getElementById("final-sentence");

  if (bank && finalState) {
    bank.innerHTML = (finalState.chipOrder || [])
      .map((fid) => {
        const frag = getFragmentById(q, fid);
        if (!frag) return "";
        const placed = Boolean(finalState.placedByFragId?.[fid]);
        const c = pickFragColor(Number(fid));
        return `
          <div class="frag-chip final-chip${placed ? " used" : ""}" data-final-frag-id="${fid}" draggable="${isLocked || placed ? "false" : "true"}" style="--frag-color:${c.solid}; --frag-soft:${c.soft}; --frag-border:${c.solid};" title="${escapeHtml(frag.en)}">
            <div class="frag-en">${escapeHtml(frag.en)}</div>
            <div class="frag-ko">${escapeHtml(frag.ko || "")}</div>
          </div>
        `;
      })
      .join("");
  }

  if (sentence && finalState) {
    const sentenceTokens = Array.isArray(q.answerTokens) ? q.answerTokens : splitSentenceTokens(q.answer);
    sentence.innerHTML = sentenceTokens
      .map((tok, idx) => {
        const owners = getFinalTokenOwners(q, finalState, idx);
        const style = buildFinalTokenStyle(owners);
        const cls = ["token-pill", "in-slot", "merged-slot-pill", "final-slot"];
        if (owners.length) cls.push("filled");
        return `<span class="${cls.join(" ")}" data-final-slot-idx="${idx}" style="${style}">${escapeHtml(tok)}</span>`;
      })
      .join(" ");
  }

  const totalFrags = Array.isArray(q.fragments) ? q.fragments.length : 0;
  const placedCount = Object.values(finalState?.placedByFragId || {}).filter(Boolean).length;
  if (leftStatus) leftStatus.textContent = `${placedCount}/${totalFrags}`;
  if (rightStatus) rightStatus.textContent = `Placed ${placedCount}/${totalFrags}`;
  if (hint) hint.textContent = "Drop a fragment onto one of its sentence words. Click a placed fragment to remove.";
  if (topStatus) topStatus.textContent = `Stage2 ${placedCount}/${totalFrags}`;
  if (submitBtn) submitBtn.disabled = isLocked;
  if (nextBtn) nextBtn.disabled = !isLocked;
  wireStageEvents();
}

function wireStageEvents() {
  const q = getCurrentQuestion();
  const state = getQuestionState(q);
  if (!state) return;
  const mergeZone = document.getElementById("merge-zone");

  if (mergeZone && mergeZone.dataset.bound !== "1") {
    mergeZone.dataset.bound = "1";
    mergeZone.addEventListener("click", (ev) => {
      if (stageMode !== "merge" || isLocked) return;
      const tok = ev.target?.closest?.("[data-cluster-id][data-merge-idx]");
      if (tok) {
        const targetClusterId = Number(tok.getAttribute("data-cluster-id"));
        const idx = Number(tok.getAttribute("data-merge-idx"));
        if (!Number.isInteger(targetClusterId) || !Number.isInteger(idx)) return;
        if (!hasPendingCluster(state)) {
          selectPendingCluster(targetClusterId, { silent: true });
          return;
        }
        if (Number(state.pendingClusterId) === targetClusterId) {
          clearPendingCluster(state);
          renderStage();
          return;
        }
        mergePendingClusterIntoTarget(targetClusterId, idx);
        return;
      }
    });
  }

  if (mergeZone && mergeZone.dataset.dragBound !== "1") {
    mergeZone.dataset.dragBound = "1";

    mergeZone.addEventListener("pointerdown", (ev) => {
      if (stageMode !== "merge" || isLocked) return;
      const tokenTarget = ev.target?.closest?.("[data-merge-idx]");
      if (tokenTarget) return;

      const box = ev.target?.closest?.(".cluster-box[data-cluster-id]");
      if (!box) return;
      const clusterId = Number(box.getAttribute("data-cluster-id"));
      if (!Number.isInteger(clusterId)) return;
      const cluster = getClusterById(state, clusterId);
      if (!cluster) return;

      const zoneRect = mergeZone.getBoundingClientRect();
      const boxRect = box.getBoundingClientRect();
      clusterDragState = {
        pointerId: ev.pointerId,
        clusterId,
        startClientX: ev.clientX,
        startClientY: ev.clientY,
        startLeftPx: boxRect.left - zoneRect.left,
        startTopPx: boxRect.top - zoneRect.top,
        zoneW: zoneRect.width,
        zoneH: zoneRect.height,
        boxW: boxRect.width,
        boxH: boxRect.height,
        node: box,
      };

      bringClusterToFront(state, clusterId);
      box.style.zIndex = String(getClusterById(state, clusterId)?.z || 1);
      try {
        box.setPointerCapture(ev.pointerId);
      } catch (_e) {
        // no-op
      }
      ev.preventDefault();
    });

    mergeZone.addEventListener("pointermove", (ev) => {
      if (!clusterDragState) return;
      if (ev.pointerId !== clusterDragState.pointerId) return;
      const cluster = getClusterById(state, clusterDragState.clusterId);
      if (!cluster) return;

      const dx = ev.clientX - clusterDragState.startClientX;
      const dy = ev.clientY - clusterDragState.startClientY;
      const leftOverscan = 0;
      const rightOverscan = 16;
      const topOverscan = 8;
      const bottomOverscan = 0;
      const maxLeft = Math.max(0, clusterDragState.zoneW - clusterDragState.boxW) + rightOverscan;
      const maxTop = Math.max(0, clusterDragState.zoneH - clusterDragState.boxH) + bottomOverscan;
      const nextLeft = clampNumber(clusterDragState.startLeftPx + dx, -leftOverscan, maxLeft);
      const nextTop = clampNumber(clusterDragState.startTopPx + dy, -topOverscan, maxTop);

      cluster.xPx = nextLeft;
      cluster.yPx = nextTop;
      const xPct = clusterDragState.zoneW > 0 ? (nextLeft / clusterDragState.zoneW) * 100 : 0;
      const yPct = clusterDragState.zoneH > 0 ? (nextTop / clusterDragState.zoneH) * 100 : 0;
      cluster.x = xPct;
      cluster.y = yPct;

      if (clusterDragState.node) {
        clusterDragState.node.style.left = `${nextLeft}px`;
        clusterDragState.node.style.top = `${nextTop}px`;
      }
    });

    const endDrag = (ev) => {
      if (!clusterDragState) return;
      if (ev?.pointerId != null && ev.pointerId !== clusterDragState.pointerId) return;
      clusterDragState = null;
    };

    mergeZone.addEventListener("pointerup", endDrag);
    mergeZone.addEventListener("pointercancel", endDrag);
  }

  const finalBank = document.getElementById("final-bank");
  const finalSentence = document.getElementById("final-sentence");

  if (finalBank && finalBank.dataset.bound !== "1") {
    finalBank.dataset.bound = "1";

    finalBank.addEventListener("dragstart", (ev) => {
      if (stageMode !== "final" || isLocked) return;
      const chip = ev.target?.closest?.("[data-final-frag-id]");
      if (!chip) return;
      const fid = Number(chip.getAttribute("data-final-frag-id"));
      if (!Number.isInteger(fid)) return;
      finalDragFragId = fid;
      chip.classList.add("dragging");
      if (ev.dataTransfer) {
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", String(fid));
      }
    });

    finalBank.addEventListener("dragend", (ev) => {
      const chip = ev.target?.closest?.("[data-final-frag-id]");
      if (chip) chip.classList.remove("dragging");
      finalDragFragId = null;
      const zone = finalSentence?.closest?.(".slot-zone");
      if (zone) zone.classList.remove("drop-ready");
    });

    finalBank.addEventListener("click", (ev) => {
      if (stageMode !== "final" || isLocked) return;
      const chip = ev.target?.closest?.("[data-final-frag-id]");
      if (!chip) return;
      const fid = Number(chip.getAttribute("data-final-frag-id"));
      if (!Number.isInteger(fid)) return;
      const cq = getCurrentQuestion();
      const cs = getQuestionState(cq);
      const fs = getFinalArrangeState(cq, cs);
      if (!fs || !fs.placedByFragId?.[fid]) return;
      fs.placedByFragId[fid] = false;
      renderStage();
      showToast("ok", "Removed.");
    });
  }

  if (finalSentence && finalSentence.dataset.bound !== "1") {
    finalSentence.dataset.bound = "1";

    finalSentence.addEventListener("dragover", (ev) => {
      if (stageMode !== "final" || isLocked) return;
      const slot = ev.target?.closest?.("[data-final-slot-idx]");
      if (!slot) return;
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
      const zone = finalSentence.closest(".slot-zone");
      if (zone) zone.classList.add("drop-ready");
    });

    finalSentence.addEventListener("dragleave", (ev) => {
      if (!finalSentence.contains(ev.relatedTarget)) {
        const zone = finalSentence.closest(".slot-zone");
        if (zone) zone.classList.remove("drop-ready");
      }
    });

    finalSentence.addEventListener("drop", (ev) => {
      if (stageMode !== "final" || isLocked) return;
      const slot = ev.target?.closest?.("[data-final-slot-idx]");
      const zone = finalSentence.closest(".slot-zone");
      if (zone) zone.classList.remove("drop-ready");
      if (!slot) return;
      ev.preventDefault();

      const dropIdx = Number(slot.getAttribute("data-final-slot-idx"));
      const fromTransfer = ev.dataTransfer?.getData("text/plain");
      const fid = Number.isInteger(Number(fromTransfer)) ? Number(fromTransfer) : Number(finalDragFragId);
      if (!Number.isInteger(dropIdx) || !Number.isInteger(fid)) return;

      const cq = getCurrentQuestion();
      const cs = getQuestionState(cq);
      const fs = getFinalArrangeState(cq, cs);
      const frag = getFragmentById(cq, fid);
      if (!fs || !frag) return;
      const indices = Array.isArray(frag.sentenceIndices) ? frag.sentenceIndices : [];
      if (!indices.includes(dropIdx)) {
        showToast("no", "Try another word.");
        return;
      }

      fs.placedByFragId[fid] = true;
      finalDragFragId = null;
      renderStage();
      showToast("ok", "Placed.");
    });

    finalSentence.addEventListener("click", (ev) => {
      if (stageMode !== "final" || isLocked) return;
      const slot = ev.target?.closest?.("[data-final-slot-idx]");
      if (!slot) return;
      const idx = Number(slot.getAttribute("data-final-slot-idx"));
      if (!Number.isInteger(idx)) return;
      const cq = getCurrentQuestion();
      const cs = getQuestionState(cq);
      const fs = getFinalArrangeState(cq, cs);
      if (!cq || !cs || !fs) return;
      const owners = getFinalTokenOwners(cq, fs, idx);
      if (!owners.length) return;
      const fid = Number(owners[owners.length - 1]);
      if (!Number.isInteger(fid) || !fs.placedByFragId?.[fid]) return;
      fs.placedByFragId[fid] = false;
      renderStage();
      showToast("ok", "Removed.");
    });
  }
}

function wireGlobalBlurEvents() {
  if (document.body?.dataset?.l4e2BlurBound === "1") return;
  if (!document.body) return;
  document.body.dataset.l4e2BlurBound = "1";
  document.body.addEventListener("pointerdown", (ev) => {
    if (stageMode !== "merge" || isLocked) return;
    const tok = ev.target?.closest?.("[data-merge-idx]");
    if (tok) return;
    const clusterArea = ev.target?.closest?.("[data-cluster-id]");
    if (clusterArea) return;
    blurPendingSelection();
  });
}

function wireButtons() {
  const submitBtn = document.getElementById("btn-submit");
  const nextBtn = document.getElementById("btn-next");
  const clearBtn = document.getElementById("btn-clear");

  if (submitBtn) submitBtn.addEventListener("click", () => {
    blurPendingSelection({ silent: true });
    submitCurrent();
  });
  if (nextBtn) nextBtn.addEventListener("click", () => {
    blurPendingSelection({ silent: true });
    goNext();
  });
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (isLocked) return;
      blurPendingSelection({ silent: true });
      const q = getCurrentQuestion();
      if (!q) return;
      resetQuestionState(q);
      stageMode = "merge";
      renderQuestion();
    });
  }
}

function submitCurrent() {
  const q = getCurrentQuestion();
  const state = getQuestionState(q);
  if (!q || !state) return;
  if (isLocked) return;

  const usedCount = Array.isArray(state.usedFragIds) ? state.usedFragIds.length : 0;
  const totalFrags = Array.isArray(q.fragments) ? q.fragments.length : 0;
  const clusterCount = Array.isArray(state.clusters) ? state.clusters.length : 0;

  if (stageMode === "merge") {
    if (usedCount < totalFrags || clusterCount !== 1) {
      showToast("no", "Use all fragments and merge into one cluster.");
      return;
    }
    stageMode = "final";
    renderQuestion();
    showToast("ok", "Stage 2");
    return;
  }

  const finalState = getFinalArrangeState(q, state);
  const placedCount = Object.values(finalState?.placedByFragId || {}).filter(Boolean).length;
  if (placedCount < totalFrags) {
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L4-E2 / Q${q.qNumber}`,
      question: buildQuestionLog(q),
      selected: buildSelectedLog(q),
      correct: false,
      modelAnswer: q.answer,
    });
    showToast("no", "Place all fragments.");
    return;
  }

  isLocked = true;
  upsertResult({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Pleks L4-E2 / Q${q.qNumber}`,
    question: buildQuestionLog(q),
    selected: buildSelectedLog(q),
    correct: true,
    modelAnswer: q.answer,
  });

  const submitBtn = document.getElementById("btn-submit");
  const nextBtn = document.getElementById("btn-next");
  if (submitBtn) submitBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;
  showToast("ok", "Correct.");
}

function goNext() {
  const q = getCurrentQuestion();
  if (q && !isLocked) {
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L4-E2 / Q${q.qNumber}`,
      question: buildQuestionLog(q),
      selected: buildSelectedLog(q),
      correct: false,
      modelAnswer: q.answer,
    });
  }

  currentIndex += 1;
  if (currentIndex >= questions.length) {
    showResultPopup();
    return;
  }

  stageMode = "merge";
  isLocked = false;
  renderQuestion();
}

function buildQuestionLog(q) {
  const fragText = (q.fragments || [])
    .map((f) => `${f.en}`)
    .join(" | ");
  return `fragments: ${fragText}`;
}

function buildSelectedLog(q) {
  const state = getQuestionState(q);
  const clusters = Array.isArray(state?.clusters) ? state.clusters : [];
  const clusterLog = clusters
    .map((cluster) => {
      const en = getClusterFragments(q, cluster).map((frag) => compactWhitespace(frag?.en || "")).filter(Boolean).join(" + ");
      return `[${en || "-"}]`;
    })
    .join(" + ");
  const merged = buildMergedText(state);
  const placedFinal = Object.entries(state?.finalArrange?.placedByFragId || {})
    .filter(([, v]) => Boolean(v))
    .map(([k]) => Number(k))
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b)
    .join(",");
  return `clusters:${clusterLog || "-"} || merged:${merged || "-"} || final:${placedFinal || "-"}`;
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
        word: `Pleks L4-E2 / Q${q.qNumber}`,
        question: buildQuestionLog(q),
        selected: "No answer",
        correct: false,
        modelAnswer: q.answer,
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
