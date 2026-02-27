const EXCEL_FILE = "LTRYI-pleks-l4e1-questions-indexed.xlsx";
const TARGET_LESSON = 4;
const TARGET_EXERCISE = 1;
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

const KO_PARTICLE_SUFFIXES = [
  "\uc73c\ub85c\ubd80\ud130", "\uc5d0\uac8c\uc11c", "\uc5d0\uc11c\ub294", "\uc5d0\uc11c\uc758", "\uc73c\ub85c\ub294",
  "\uc73c\ub85c\uc11c", "\uc5d0\uac8c\ub294", "\uc73c\ub85c\ub3c4", "\uae4c\uc9c0\ub294", "\uae4c\uc9c0\ub3c4",
  "\uc73c\ub85c", "\uc5d0\uc11c", "\uc5d0\uac8c", "\uaed8\uc11c", "\uaed8", "\uae4c\uc9c0", "\ubd80\ud130",
  "\ucc98\ub7fc", "\ubcf4\ub2e4", "\uc774\ub77c\uba74", "\ub77c\uba74", "\uc774\uba74", "\ub77c\uc11c",
  "\uc740", "\ub294", "\uc774", "\uac00", "\uc744", "\ub97c", "\uc640", "\uacfc", "\ub3c4", "\ub9cc", "\uc758",
  "\uc5d0", "\ub85c", "\ub77c", "\ub791", "\uc774\ub098", "\ub098", "\ub4e0", "\uc870\ucc28", "\ub9c8\uc800", "\ub77c\ub3c4",
].sort((a, b) => String(b).length - String(a).length);

let questions = [];
let currentIndex = 0;
let results = [];
let dragFragmentId = null;
let activeFragmentId = null;
let previewRange = [];
let isLocked = false;
let pendingMerge = null;
let koMergePlan = [];
let koState = {
  mergedText: "",
  stepIndex: 0,
  pending: null,
  coloredTokens: [],
};
let koCompletedFragIds = new Set();
let koRenderPrevTokens = [];
let stageMode = "build"; // build -> token
let finalState = null;
let pointerDrag = {
  active: false,
  pointerId: null,
  fragId: null,
  tokenIdx: null,
  ghostEl: null,
  startX: 0,
  startY: 0,
  moved: false,
};
let pointerWireBound = false;
let suppressBankClickUntil = 0;
let placementOrderSerial = 1;
let tokenPrepDragPillId = "";

let subcategory = "Grammar";
let level = "Basic";
let day = "311";
let quizTitle = "quiz_Grammar_Basic_311";
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
    renderEmpty("No L4-E1 rows found.");
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
  exerciseTitle = compactWhitespace(String(q0?.title || "")) || "Guided Fragments";
}

function renderIntro() {
  const mount = getMount();
  if (!mount) return;

  mount.innerHTML = `
    <div class="box">
      <div style="font-size:18px; font-weight:900; color:#7e3106; margin-bottom:10px;">Pleks L4-E1 (Draft)</div>
      <div style="margin-bottom:10px;">
        <span class="pill">Lesson ${TARGET_LESSON}</span>
        <span class="pill">Exercise ${TARGET_EXERCISE}</span>
        <span class="pill">Total ${questions.length}</span>
        <span class="pill">Day ${escapeHtml(day)}</span>
      </div>
      <div style="font-size:14px; font-weight:900; color:#444; margin-bottom:2px;">${escapeHtml(lessonTitle)}</div>
      <div style="font-size:13px; color:#555; margin-bottom:8px;">${escapeHtml(exerciseTitle)}</div>
      <div style="font-size:12px; color:#7e3106; line-height:1.35; letter-spacing:-0.2px;">
        Drag fragments, map overlap zones, then submit each question.
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
  currentIndex = 0;
  stageMode = "build";
  finalState = null;
  results = [];
  placementOrderSerial = 1;
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

function sanitizeEnFragmentText(text) {
  return compactWhitespace(String(text || "").replace(/[~～∼˜]/g, ""));
}

function parseIndexSpecToIndices(raw, tokenLen) {
  const spec = compactWhitespace(raw);
  const n = Number(tokenLen) || 0;
  if (!spec || n <= 0) return [];

  const out = [];
  spec.split(",").forEach((part) => {
    const p = compactWhitespace(part);
    if (!p) return;

    const r = p.match(/^(\d+)\s*-\s*(\d+)$/);
    if (r) {
      const a = Number(r[1]) - 1;
      const b = Number(r[2]) - 1;
      if (!Number.isInteger(a) || !Number.isInteger(b)) return;
      const start = Math.max(0, Math.min(a, b));
      const end = Math.min(n - 1, Math.max(a, b));
      for (let i = start; i <= end; i += 1) out.push(i);
      return;
    }

    const s = p.match(/^(\d+)$/);
    if (s) {
      const idx = Number(s[1]) - 1;
      if (Number.isInteger(idx) && idx >= 0 && idx < n) out.push(idx);
    }
  });

  return Array.from(new Set(out)).sort((a, b) => a - b);
}

function buildIndexedCandidates(indexSpec, tokenLen) {
  const ids = parseIndexSpecToIndices(indexSpec, tokenLen);
  if (!ids.length) return [];
  return [
    {
      start: ids[0],
      end: ids[ids.length - 1],
      indices: ids.slice(),
      mode: "indexed",
    },
  ];
}

function parseKrMergeMapCell(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return [];

  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, idx) => {
            const fragNo = Number(item?.fragNo ?? item?.frag ?? item?.f ?? idx + 1);
            if (!Number.isInteger(fragNo) || fragNo <= 0) return null;
            const overlapRaw = item?.overlap ?? item?.overlapTokens ?? item?.anchors ?? [];
            const overlapTokens = Array.isArray(overlapRaw)
              ? overlapRaw.map((x) => compactWhitespace(x)).filter(Boolean)
              : String(overlapRaw ?? "")
                  .split(",")
                  .map((x) => compactWhitespace(x))
                  .filter(Boolean);
            const anchorMapRaw = item?.anchorMap ?? item?.anchor_map ?? item?.anchorsMap ?? {};
            const anchorMap = {};
            if (anchorMapRaw && typeof anchorMapRaw === "object" && !Array.isArray(anchorMapRaw)) {
              Object.keys(anchorMapRaw).forEach((k) => {
                const key = normalizeWord(k);
                if (!key) return;
                const val = anchorMapRaw[k];
                const values = Array.isArray(val)
                  ? val.map((x) => compactWhitespace(x)).filter(Boolean)
                  : String(val ?? "")
                      .split(/[;,/]/)
                      .map((x) => compactWhitespace(x))
                      .filter(Boolean);
                if (values.length) anchorMap[key] = values;
              });
            }
            return {
              fragNo,
              overlapTokens,
              resultText: compactWhitespace(item?.result ?? item?.merged ?? item?.out ?? ""),
              anchorMap,
            };
          })
          .filter(Boolean);
      }
    } catch (_) {
      // Ignore malformed JSON map.
    }
  }

  return text
    .split("||")
    .map((x) => compactWhitespace(x))
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(\d+)(?:@([^=]+))?\s*=>\s*(.+)$/);
      if (!m) return null;
      return {
        fragNo: Number(m[1]),
        overlapTokens: String(m[2] || "")
          .split(/[;,/]/)
          .map((x) => compactWhitespace(x))
          .filter(Boolean),
        resultText: compactWhitespace(m[3] || ""),
        anchorMap: {},
      };
    })
    .filter((x) => x && Number.isInteger(x.fragNo) && x.fragNo > 0);
}

function koTokenize(text) {
  return compactWhitespace(text)
    .split(/\s+/)
    .map((x) => compactWhitespace(x))
    .filter(Boolean);
}

function stripKoParticleSuffix(token) {
  const t = String(token || "");
  for (let i = 0; i < KO_PARTICLE_SUFFIXES.length; i += 1) {
    const p = KO_PARTICLE_SUFFIXES[i];
    if (t.length > p.length && t.endsWith(p)) {
      return t.slice(0, t.length - p.length);
    }
  }
  return t;
}

function normalizeKoToken(token) {
  const raw = String(token ?? "")
    .replace(/[.,!?;:()[\]{}"']/g, "")
    .replace(/\s+/g, "")
    .trim();
  return stripKoParticleSuffix(raw);
}

function parseKrCommonMapCell(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((step) => {
        const fragNo = Number(step?.fragNo);
        if (!Number.isInteger(fragNo) || fragNo <= 0) return null;
        const common = Array.isArray(step?.common)
          ? step.common
              .map((item) => ({
                clickToken: compactWhitespace(item?.clickToken || ""),
                paintStem: compactWhitespace(item?.paintStem || ""),
                incomingToken: compactWhitespace(item?.incomingToken || ""),
              }))
              .filter((x) => x.clickToken || x.paintStem || x.incomingToken)
          : [];
        return { fragNo, common };
      })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function inferKoOverlapTokens(baseText, incomingText) {
  const base = koTokenize(baseText);
  const incoming = koTokenize(incomingText);
  if (!base.length || !incoming.length) return [];

  const maxLen = Math.min(3, base.length, incoming.length);
  for (let len = maxLen; len >= 1; len -= 1) {
    const seen = new Set();
    for (let i = 0; i <= base.length - len; i += 1) {
      const phrase = base.slice(i, i + len).join(" ");
      const key = normalizeKoToken(phrase);
      if (!key || seen.has(key)) continue;
      seen.add(key);

      for (let j = 0; j <= incoming.length - len; j += 1) {
        const cand = incoming.slice(j, j + len).join(" ");
        if (normalizeKoToken(cand) === key) return [phrase];
      }
    }
  }
  return [];
}

function mergeKoreanTexts(baseText, incomingText, overlapTokens) {
  const base = compactWhitespace(baseText);
  const incoming = compactWhitespace(incomingText);
  if (!base) return incoming;
  if (!incoming) return base;

  const pivots = (Array.isArray(overlapTokens) ? overlapTokens : [])
    .map((x) => compactWhitespace(x))
    .filter(Boolean);

  let pivot = "";
  for (let i = 0; i < pivots.length; i += 1) {
    const p = pivots[i];
    if (base.includes(p) && incoming.includes(p)) {
      pivot = p;
      break;
    }
  }
  if (!pivot) return compactWhitespace(`${base} ${incoming}`);

  const bi = base.indexOf(pivot);
  const ii = incoming.indexOf(pivot);
  if (bi < 0 || ii < 0) return compactWhitespace(`${base} ${incoming}`);

  const bPre = compactWhitespace(base.slice(0, bi));
  const bPost = compactWhitespace(base.slice(bi + pivot.length));
  const iPre = compactWhitespace(incoming.slice(0, ii));
  const iPost = compactWhitespace(incoming.slice(ii + pivot.length));
  return compactWhitespace([bPre, iPre, pivot, iPost, bPost].filter(Boolean).join(" "));
}

function buildFallbackKoMergePlan(fragments) {
  const out = [];
  let merged = "";
  (fragments || []).forEach((f) => {
    const fragKo = compactWhitespace(f?.ko || "");
    if (!fragKo) return;

    const overlapTokens = merged ? inferKoOverlapTokens(merged, fragKo) : [];
    const resultText = merged ? mergeKoreanTexts(merged, fragKo, overlapTokens) : fragKo;
    out.push({
      fragId: Number(f.id),
      fragNo: Number(f.no),
      overlapTokens,
      resultText,
      fragText: fragKo,
      anchorMap: {},
    });
    merged = resultText;
  });
  return out;
}

function normalizeKoMergePlan(rawPlan, fragments) {
  if (!Array.isArray(rawPlan) || !rawPlan.length) {
    return buildFallbackKoMergePlan(fragments);
  }

  const byNo = new Map((fragments || []).map((f) => [Number(f.no), f]));
  const out = [];
  let merged = "";

  rawPlan.forEach((step) => {
    const fragNo = Number(step?.fragNo);
    const frag = byNo.get(fragNo);
    if (!frag) return;

    const overlapTokens = Array.isArray(step?.overlapTokens)
      ? step.overlapTokens.map((x) => compactWhitespace(x)).filter(Boolean)
      : [];
    const resultFromData = compactWhitespace(step?.resultText || "");
    const resultText = resultFromData || mergeKoreanTexts(merged, frag.ko, overlapTokens);

    out.push({
      fragId: Number(frag.id),
      fragNo: Number(frag.no),
      overlapTokens,
      resultText,
      fragText: compactWhitespace(frag.ko || ""),
      anchorMap: step?.anchorMap && typeof step.anchorMap === "object" ? step.anchorMap : {},
    });
    merged = resultText;
  });

  return out.length ? out : buildFallbackKoMergePlan(fragments);
}

function buildQuestions(rows) {
  const filtered = (rows || [])
    .filter((r) => Number(r?.Lesson) === TARGET_LESSON && Number(r?.Exercise) === TARGET_EXERCISE)
    .sort((a, b) => Number(a?.QNumber) - Number(b?.QNumber));

  const selected = MAX_QUESTIONS > 0 ? filtered.slice(0, MAX_QUESTIONS) : filtered;

  return selected
    .map((row, i) => {
      const parsed = parseGuidedQuestionField(row?.Question);
      const sentence = compactWhitespace(getRowValue(row, ["SentenceEN", "Sentence", "sentence_en"])) || parsed.sentence;
      const enFromCols = parsePipeListCell(getRowValue(row, ["FragmentENList", "FragmentsEN", "FragmentEN"]));
      const koFromCols = parsePipeListCell(getRowValue(row, ["FragmentKOList", "FragmentsKO", "FragmentKO"]));
      const idxFromCols = parsePipeListCell(getRowValue(row, ["Index", "Indices", "FragmentIndexList"]));
      const mergeMapRaw = getRowValue(row, ["fragments_kr_mergemap", "FragmentsKrMergeMap", "FragmentsKRMergemap"]);
      const commonMapRaw = getRowValue(row, ["fragments_kr_commonmap", "FragmentsKrCommonMap", "FragmentsKRCommonMap"]);

      const fallbackFragments = Array.isArray(parsed.fragments) ? parsed.fragments : [];
      const fragCount = Math.max(
        enFromCols.length,
        koFromCols.length,
        idxFromCols.length,
        fallbackFragments.length
      );
      if (!sentence || !fragCount) return null;

      const sentenceTokens = splitSentenceTokens(sentence);
      const fragments = Array.from({ length: fragCount }, (_, idx) => {
        const fb = fallbackFragments[idx] || {};
        const en = sanitizeEnFragmentText(enFromCols[idx] || fb.en || "");
        const ko = compactWhitespace(koFromCols[idx] || fb.ko || "");
        if (!en) return null;

        const words = normalizePhraseWords(en);
        const indexedCandidates = buildIndexedCandidates(idxFromCols[idx], sentenceTokens.length);
        const candidates = indexedCandidates.length
          ? indexedCandidates
          : findFragmentCandidates(sentenceTokens, words);

        return {
          id: idx,
          no: idx + 1,
          en,
          ko,
          words,
          candidates,
          placedRange: [],
          placedOrder: 0,
          anchorIdx: null,
          requiresAnchor: false,
        };
      }).filter(Boolean);

      if (!fragments.length) return null;

      const parsedKoMerge = parseKrMergeMapCell(mergeMapRaw);
      const koPlan = normalizeKoMergePlan(parsedKoMerge, fragments);
      const krCommonMap = parseKrCommonMapCell(commonMapRaw);

      return {
        id: i,
        qNumber: Number(row?.QNumber) || i + 1,
        title: compactWhitespace(String(row?.Title || "").trim()) || "Guided Fragments",
        instruction: String(row?.Instruction || "").trim(),
        sentence,
        sentenceTokens,
        fragments,
        answer: String(row?.Answer || "").trim(),
        koMergePlan: koPlan,
        krCommonMap,
        fragmentTokenIndex: null,
        tokenPrepState: null,
      };
    })
    .filter(Boolean);
}

function parseGuidedQuestionField(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const sentMatch = text.match(/Sentence:\s*([\s\S]*?)(?=\s*Fragments:|$)/i);
  const sentence = compactWhitespace(sentMatch ? sentMatch[1] : "");

  const fragMatch = text.match(/Fragments:\s*([\s\S]*)$/i);
  const fragRaw = compactWhitespace(fragMatch ? fragMatch[1] : "");
  const parts = fragRaw ? fragRaw.split(/(?=\d+\)\s*)/g) : [];

  const fragments = [];
  parts.forEach((part) => {
    const p = compactWhitespace(part);
    if (!/^\d+\)/.test(p)) return;

    const body = compactWhitespace(p.replace(/^\d+\)\s*/, ""));
    const m = body.match(/^(.*?)(?:\s+\u2013\s+|\s+-\s+)(.+)$/);
    const en = compactWhitespace(m ? m[1] : body);
    const ko = compactWhitespace(m ? m[2] : "");
    if (!en) return;
    fragments.push({ en, ko });
  });

  return { sentence, fragments };
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

function sortedUniqueIndices(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((x) => Number(x))
        .filter((x) => Number.isInteger(x) && x >= 0)
    )
  ).sort((a, b) => a - b);
}

function buildEnTokenIndexBundle(q) {
  const sentenceTokens = Array.isArray(q?.sentenceTokens) ? q.sentenceTokens.slice() : [];
  const byFragment = {};
  const items = [];
  const fragmentTokens = [];

  (q?.fragments || []).forEach((f) => {
    const fid = Number(f?.id);
    const fno = Number(f?.no);
    const source = splitSpaceTokens(String(f?.en || ""));
    source.forEach((tok, localIndex) => {
      fragmentTokens.push({
        fragmentId: fid,
        fragmentNo: fno,
        localIndex,
        token: tok,
      });
    });

    const placed = sortedUniqueIndices(f?.placedRange);
    const mapped = placed.map((sentenceIndex, localIndex) => ({
      fragmentId: fid,
      fragmentNo: fno,
      localIndex,
      sentenceIndex,
      token: String(sentenceTokens[sentenceIndex] || ""),
    }));
    byFragment[fid] = mapped;
    mapped.forEach((x) => items.push(x));
  });

  items.sort((a, b) => {
    if (a.sentenceIndex !== b.sentenceIndex) return a.sentenceIndex - b.sentenceIndex;
    if (a.fragmentId !== b.fragmentId) return a.fragmentId - b.fragmentId;
    return a.localIndex - b.localIndex;
  });

  return {
    sentenceTokens,
    items,
    byFragment,
    fragmentTokens,
  };
}

function buildKoTokenIndexBundle(q) {
  const byFragment = {};
  const items = [];
  const fragmentTokens = [];
  const fragNoById = new Map((q?.fragments || []).map((f) => [Number(f.id), Number(f.no)]));

  (q?.fragments || []).forEach((f) => {
    const source = splitSpaceTokens(String(f?.ko || ""));
    source.forEach((tok, localIndex) => {
      fragmentTokens.push({
        fragmentId: Number(f.id),
        fragmentNo: Number(f.no),
        localIndex,
        token: tok,
      });
    });
  });

  let sentenceTokens = [];
  const colored = Array.isArray(koState?.coloredTokens) ? koState.coloredTokens : [];
  if (colored.length) {
    sentenceTokens = colored.map((entry) => compactWhitespace(entry?.text || ""));
    const localCounter = new Map();

    colored.forEach((entry, sentenceIndex) => {
      const token = compactWhitespace(entry?.text || "");
      if (!token) return;
      const fid = Number(entry?.fragId);
      const hasFid = Number.isInteger(fid);
      const localIndex = hasFid ? Number(localCounter.get(fid) || 0) : -1;
      if (hasFid) localCounter.set(fid, localIndex + 1);

      const item = {
        fragmentId: hasFid ? fid : null,
        fragmentNo: hasFid ? Number(fragNoById.get(fid) || -1) : -1,
        localIndex,
        sentenceIndex,
        token,
      };
      items.push(item);
      if (hasFid) {
        if (!Array.isArray(byFragment[fid])) byFragment[fid] = [];
        byFragment[fid].push(item);
      }
    });
  } else {
    sentenceTokens = koTokenize(String(koState?.mergedText || q?.answer || ""));
  }

  return {
    sentenceTokens,
    items,
    byFragment,
    fragmentTokens,
  };
}

function buildFragmentTokenIndexBundle(q) {
  return {
    en: buildEnTokenIndexBundle(q),
    ko: buildKoTokenIndexBundle(q),
  };
}

function normalizeWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function normalizePhraseWords(text) {
  return compactWhitespace(text)
    .split(/\s+/)
    .map((w) => normalizeWord(w))
    .filter(Boolean);
}

function tokenWordMatches(sentenceWord, fragmentWord) {
  if (!sentenceWord || !fragmentWord) return false;
  if (sentenceWord === fragmentWord) return true;

  if (sentenceWord.includes("-")) {
    const parts = sentenceWord.split("-").filter(Boolean);
    if (parts.includes(fragmentWord)) return true;
    if (fragmentWord.length >= 3 && parts.some((p) => p.startsWith(fragmentWord))) return true;
  }

  if (
    fragmentWord.endsWith("e") &&
    sentenceWord.endsWith("ing") &&
    sentenceWord.startsWith(fragmentWord.slice(0, -1))
  ) {
    return true;
  }

  if (fragmentWord.length >= 4 && sentenceWord.startsWith(fragmentWord)) return true;
  return false;
}

function range(start, end) {
  const s = Number(start);
  const e = Number(end);
  if (!Number.isInteger(s) || !Number.isInteger(e) || e < s) return [];
  const out = [];
  for (let i = s; i <= e; i += 1) out.push(i);
  return out;
}

function findFragmentCandidates(sentenceTokens, fragmentWords) {
  const sent = (sentenceTokens || []).map((t) => normalizeWord(t));
  const words = (fragmentWords || []).filter(Boolean);
  if (!sent.length || !words.length) return [];

  const exact = findContiguousCandidates(sent, words);
  if (exact.length) return exact;

  const subseq = findSubsequenceCandidates(sent, words);
  if (subseq.length) return subseq;

  return [];
}

function findContiguousCandidates(sentenceNorm, fragmentNorm) {
  const out = [];
  const n = sentenceNorm.length;
  const m = fragmentNorm.length;
  if (m > n) return out;

  for (let s = 0; s <= n - m; s += 1) {
    let ok = true;
    for (let j = 0; j < m; j += 1) {
      if (!tokenWordMatches(sentenceNorm[s + j], fragmentNorm[j])) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    out.push({ start: s, end: s + m - 1, indices: range(s, s + m - 1), mode: "exact" });
  }

  return uniqRanges(out);
}

function findSubsequenceCandidates(sentenceNorm, fragmentNorm) {
  const out = [];
  const n = sentenceNorm.length;
  if (!n || !fragmentNorm.length) return out;

  const first = fragmentNorm[0];
  for (let s = 0; s < n; s += 1) {
    if (!tokenWordMatches(sentenceNorm[s], first)) continue;

    const matched = [s];
    let cursor = s + 1;
    let ok = true;
    for (let j = 1; j < fragmentNorm.length; j += 1) {
      const fw = fragmentNorm[j];
      let found = -1;
      for (let k = cursor; k < n; k += 1) {
        if (tokenWordMatches(sentenceNorm[k], fw)) {
          found = k;
          break;
        }
      }
      if (found < 0) {
        ok = false;
        break;
      }
      matched.push(found);
      cursor = found + 1;
    }
    if (!ok) continue;

    const start = matched[0];
    const end = matched[matched.length - 1];
    const spanLen = end - start + 1;
    if (spanLen > fragmentNorm.length + 4) continue;

    out.push({ start, end, indices: matched.slice(), mode: "subseq" });
  }

  return uniqRanges(out);
}

function uniqRanges(candidates) {
  const seen = new Set();
  const out = [];
  (candidates || []).forEach((c) => {
    const key = Array.isArray(c?.indices) && c.indices.length
      ? c.indices.join(",")
      : `${c.start}:${c.end}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  });
  return out;
}

function renderQuestion() {
  const q = questions[currentIndex];
  const mount = getMount();
  if (!mount) return;
  if (!q) {
    showResultPopup();
    return;
  }

  const isBuild = stageMode === "build";
  const isTokenPrep = stageMode === "token" || stageMode === "final";

  if (isBuild) {
    dragFragmentId = null;
    activeFragmentId = null;
    previewRange = [];
    isLocked = false;
    pendingMerge = null;
    koMergePlan = Array.isArray(q?.koMergePlan) ? q.koMergePlan.slice() : [];
    koState = { mergedText: "", stepIndex: 0, pending: null, coloredTokens: [] };
    koCompletedFragIds = new Set();
    koRenderPrevTokens = [];
    finalState = null;
    placementOrderSerial = 1;
    q.fragmentTokenIndex = null;
    q.tokenPrepState = null;
    q.fragments.forEach((f) => {
      f.placedRange = [];
      f.placedOrder = 0;
      f.anchorIdx = null;
      f.requiresAnchor = false;
    });
    resetPointerDragState();
  } else {
    dragFragmentId = null;
    activeFragmentId = null;
    previewRange = [];
    pendingMerge = null;
    resetPointerDragState();
  }

  if (isBuild) {
    mount.innerHTML = `
      <div class="frame">
        <div class="head-row">
          <div class="q-chip">${currentIndex + 1}/${questions.length} | Q${q.qNumber}</div>
          <div class="title-text">${escapeHtml(q.title)}</div>
          <div class="status" id="question-status"></div>
        </div>
        <div class="inst">왼쪽에서 드래그해보세요!</div>
        <div class="land-grid">
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">Fragment Bank</div>
              <div class="status" id="left-status"></div>
            </div>
            <div class="bank-scroll" id="fragment-bank"></div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">Sentence</div>
              <div class="status" id="right-status"></div>
            </div>
            <div class="sentence-stack">
              <div class="sentence-zone">
                <div class="merge-hint hidden" id="merge-hint"></div>
                <div class="sentence-wrap" id="sentence-wrap"></div>
              </div>
              <div class="ko-zone" id="ko-zone"></div>
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

    wireQuestionShell();
    wireBottomButtons();
    renderFragments();
    renderSentenceAndOverlap();
    renderKoMergeZone();
    updateQuestionStatus();
    wirePointerDragGlobal();
    return;
  }

  if (isTokenPrep) {
    mount.innerHTML = `
      <div class="frame">
        <div class="head-row">
          <div class="q-chip">${currentIndex + 1}/${questions.length} | Q${q.qNumber}</div>
          <div class="title-text">${escapeHtml(q.title)} | Token Prep</div>
          <div class="status" id="question-status"></div>
        </div>
        <div class="inst">Drag fragments to token slots.</div>
        <div class="land-grid">
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">Fragment Bank</div>
              <div class="status" id="left-status"></div>
            </div>
            <div id="tokenprep-fragment-bank" class="bank-scroll"></div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">Blank Slots</div>
              <div class="status" id="right-status"></div>
            </div>
            <div class="tokenprep-stack">
              <div class="tokenprep-zone">
                <div class="tokenprep-label">EN Sentence</div>
                <div class="slot-grid" id="tokenprep-en-slots"></div>
              </div>
              <div class="tokenprep-zone">
                <div class="tokenprep-label">KR Merge</div>
                <div class="slot-grid" id="tokenprep-ko-slots"></div>
              </div>
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

    wireBottomButtons();
    renderTokenPrepStage();
    updateQuestionStatus();
    return;
  }

  stageMode = "token";
  renderQuestion();
}

function wireQuestionShell() {
  const clearBtn = document.getElementById("btn-clear");
  const bank = document.getElementById("fragment-bank");
  const sentenceWrap = document.getElementById("sentence-wrap");
  const koZone = document.getElementById("ko-zone");

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (isLocked) return;
      const q = getCurrentQuestion();
      if (!q) return;
      q.fragments.forEach((f) => {
        f.placedRange = [];
        f.placedOrder = 0;
        f.anchorIdx = null;
        f.requiresAnchor = false;
      });
      activeFragmentId = null;
      previewRange = [];
      pendingMerge = null;
      koState = { mergedText: "", stepIndex: 0, pending: null, coloredTokens: [] };
      koCompletedFragIds = new Set();
      koRenderPrevTokens = [];
      placementOrderSerial = 1;
      resetPointerDragState();
      renderFragments();
      renderSentenceAndOverlap();
      renderKoMergeZone();
      updateQuestionStatus();
    });
  }

  if (bank) {
    bank.addEventListener("pointerdown", (ev) => {
      if (isLocked) return;
      if (koState?.pending) {
        showToast("no", "Finish KR overlap tap first.");
        return;
      }
      const chip = ev.target.closest("[data-frag-id]");
      if (!chip) return;
      const fragId = Number(chip.getAttribute("data-frag-id"));
      if (!Number.isInteger(fragId)) return;
      if (pendingMerge && Number(pendingMerge.fragId) !== fragId) {
        showToast("no", "Choose merge anchor first.");
        return;
      }
      if (koCompletedFragIds.has(fragId)) {
        showToast("no", "Completed fragment is locked.");
        return;
      }
      startPointerDrag(fragId, ev);
    });

    bank.addEventListener("click", (ev) => {
      if (isLocked) return;
      if (Date.now() < suppressBankClickUntil) return;
      if (koState?.pending) {
        showToast("no", "Finish KR overlap tap first.");
        return;
      }
      const chip = ev.target.closest("[data-frag-id]");
      if (!chip) return;

      const fragId = Number(chip.getAttribute("data-frag-id"));
      const frag = getCurrentQuestion()?.fragments?.find((f) => f.id === fragId);
      if (!frag) return;

      if (pendingMerge && Number(pendingMerge.fragId) !== fragId) {
        showToast("no", "Choose merge anchor first.");
        return;
      }
      if (koCompletedFragIds.has(fragId)) {
        showToast("no", "Completed fragment is locked.");
        return;
      }

      if (Array.isArray(frag.placedRange) && frag.placedRange.length) {
        frag.placedRange = [];
        frag.placedOrder = 0;
        frag.anchorIdx = null;
        frag.requiresAnchor = false;
        if (activeFragmentId === fragId) activeFragmentId = null;
      } else {
        activeFragmentId = activeFragmentId === fragId ? null : fragId;
      }
      previewRange = [];
      renderFragments();
      renderSentenceAndOverlap();
      renderKoMergeZone();
      updateQuestionStatus();
    });
  }

  if (sentenceWrap) {
    sentenceWrap.addEventListener("click", (ev) => {
      if (isLocked) return;
      if (koState?.pending) {
        showToast("no", "Tap KR overlap token first.");
        return;
      }
      const tokenIdx = resolveTokenIndexFromEvent(ev);

      if (pendingMerge) {
        if (!Number.isInteger(tokenIdx)) return;
        const done = resolvePendingMergeAnchor(tokenIdx);
        if (done) {
          activeFragmentId = null;
          previewRange = [];
          renderFragments();
          renderSentenceAndOverlap();
          renderKoMergeZone();
          updateQuestionStatus();
        }
        return;
      }

      if (!Number.isInteger(activeFragmentId)) return;
      const placed = placeFragment(activeFragmentId, tokenIdx, "tap");
      if (placed) {
        activeFragmentId = null;
        previewRange = [];
        renderFragments();
        renderSentenceAndOverlap();
        renderKoMergeZone();
        updateQuestionStatus();
      }
    });
  }

  if (koZone) {
    koZone.addEventListener("click", (ev) => {
      if (isLocked) return;
      if (!koState?.pending) return;
      const tok = ev.target?.closest?.("[data-ko-token-idx]");
      if (!tok) return;
      const idx = Number(tok.getAttribute("data-ko-token-idx"));
      if (!Number.isInteger(idx)) return;
      resolveKoPendingMerge(idx);
    });
  }
}

function getCurrentQuestion() {
  return questions[currentIndex] || null;
}

function lcsMatchedCurrIndices(prevTokens, currTokens) {
  const prev = (Array.isArray(prevTokens) ? prevTokens : []).map((x) => normalizeKoToken(x));
  const curr = (Array.isArray(currTokens) ? currTokens : []).map((x) => normalizeKoToken(x));
  const m = prev.length;
  const n = curr.length;
  if (!m || !n) return [];

  const dp = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (prev[i - 1] && prev[i - 1] === curr[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const matched = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (prev[i - 1] && prev[i - 1] === curr[j - 1]) {
      matched.push(j - 1);
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  return matched.reverse();
}

function mapKoFragmentTokensToStepSlots(fragText, stepTokens) {
  const source = koTokenize(String(fragText || ""));
  const target = (Array.isArray(stepTokens) ? stepTokens : []).map((x) => normalizeKoToken(x));
  const localToSlot = Array.from({ length: source.length }, () => -1);
  const requiredCounts = Array.from({ length: target.length }, () => 0);
  if (!source.length || !target.length) {
    return { localToSlot, requiredCounts };
  }

  let cursor = 0;
  source.forEach((tok, localIdx) => {
    const key = normalizeKoToken(tok);
    if (!key) return;
    let found = -1;
    for (let i = cursor; i < target.length; i += 1) {
      if (target[i] === key) {
        found = i;
        break;
      }
    }
    if (found < 0) {
      for (let i = 0; i < target.length; i += 1) {
        if (target[i] === key) {
          found = i;
          break;
        }
      }
    }
    if (found < 0) return;
    localToSlot[localIdx] = found;
    requiredCounts[found] += 1;
    cursor = found + 1;
  });

  return { localToSlot, requiredCounts };
}

function buildKoProgressStepsForQuestion(q) {
  const steps = [];
  const plan = Array.isArray(q?.koMergePlan) ? q.koMergePlan : [];

  if (!plan.length) {
    const only = koTokenize(String(q?.answer || ""));
    steps.push({
      stepIndex: 0,
      fragId: -1,
      tokens: only,
      fixedMask: Array.from({ length: only.length }, () => false),
      slots: Array.from({ length: only.length }, () => []),
      visible: true,
      solved: false,
    });
    return steps;
  }

  let prevTokens = [];
  plan.forEach((step, idx) => {
    const curr = koTokenize(String(step?.resultText || ""));
    const matchedCurr = idx === 0 ? [] : lcsMatchedCurrIndices(prevTokens, curr);
    const keep = new Set(matchedCurr);
    const fixedMask = curr.map((_, i) => keep.has(i));
    const mapped = mapKoFragmentTokensToStepSlots(step?.fragText || "", curr);
    const prevFragId = idx > 0 ? Number(plan[idx - 1]?.fragId) : null;

    steps.push({
      stepIndex: idx,
      fragId: Number(step?.fragId),
      tokens: curr.slice(),
      fixedMask,
      localToSlot: Array.isArray(mapped.localToSlot) ? mapped.localToSlot.slice() : [],
      requiredCounts: Array.isArray(mapped.requiredCounts) ? mapped.requiredCounts.slice() : [],
      baseFragHint: Number.isInteger(prevFragId) ? prevFragId : null,
      slots: Array.from({ length: curr.length }, () => []),
      visible: idx === 0,
      solved: false,
    });
    prevTokens = curr.slice();
  });

  return steps;
}

function initTokenPrepState(q) {
  if (!q) return null;
  if (!q.fragmentTokenIndex) {
    q.fragmentTokenIndex = buildFragmentTokenIndexBundle(q);
  }
  const bundle = q.fragmentTokenIndex || { en: {}, ko: {} };
  const enLen = Array.isArray(bundle?.en?.sentenceTokens) ? bundle.en.sentenceTokens.length : 0;
  const koLen = Array.isArray(bundle?.ko?.sentenceTokens) ? bundle.ko.sentenceTokens.length : 0;
  const enByFrag = bundle?.en?.byFragment || {};
  const koByFrag = bundle?.ko?.byFragment || {};

  const nextId = { v: 1 };
  const makePill = (lang, entry) => {
    const fragmentId = Number(entry?.fragmentId);
    const fragmentNo = Number(entry?.fragmentNo);
    const localIndex = Number(entry?.localIndex);
    const token = compactWhitespace(entry?.token || "");
    if (!token) return null;

    const mappedList = lang === "en"
      ? (Array.isArray(enByFrag[fragmentId]) ? enByFrag[fragmentId] : [])
      : (Array.isArray(koByFrag[fragmentId]) ? koByFrag[fragmentId] : []);
    const mapped = mappedList.find((x) => Number(x?.localIndex) === localIndex);
    const expectedSlotIdx = Number.isInteger(Number(mapped?.sentenceIndex)) ? Number(mapped.sentenceIndex) : null;

    const id = `tp-${lang}-${nextId.v}`;
    nextId.v += 1;
    return {
      id,
      lang,
      fragmentId,
      fragmentNo,
      localIndex: Number.isInteger(localIndex) ? localIndex : -1,
      token,
      expectedSlotIdx,
      placed: null,
    };
  };

  const pills = [];
  (Array.isArray(bundle?.en?.fragmentTokens) ? bundle.en.fragmentTokens : []).forEach((entry) => {
    const p = makePill("en", entry);
    if (p) pills.push(p);
  });
  (Array.isArray(bundle?.ko?.fragmentTokens) ? bundle.ko.fragmentTokens : []).forEach((entry) => {
    const p = makePill("ko", entry);
    if (p) pills.push(p);
  });

  return {
    pills,
    slots: {
      en: Array.from({ length: enLen }, () => []),
    },
    koProgress: {
      steps: buildKoProgressStepsForQuestion(q),
    },
  };
}

function getTokenPrepState(q) {
  if (!q) return null;
  if (!q.tokenPrepState) {
    q.tokenPrepState = initTokenPrepState(q);
  }
  return q.tokenPrepState || null;
}

function getPillById(state, pillId) {
  if (!state || !pillId) return null;
  return (state.pills || []).find((p) => String(p.id) === String(pillId)) || null;
}

function removePillFromCurrentSlot(state, pillId) {
  if (!state || !pillId) return;
  ["en"].forEach((lang) => {
    const rows = state?.slots?.[lang];
    if (!Array.isArray(rows)) return;
    rows.forEach((slot) => {
      if (!Array.isArray(slot)) return;
      const i = slot.findIndex((id) => String(id) === String(pillId));
      if (i >= 0) slot.splice(i, 1);
    });
  });

  const steps = Array.isArray(state?.koProgress?.steps) ? state.koProgress.steps : [];
  steps.forEach((step) => {
    const slots = Array.isArray(step?.slots) ? step.slots : [];
    slots.forEach((slot) => {
      if (!Array.isArray(slot)) return;
      const i = slot.findIndex((id) => String(id) === String(pillId));
      if (i >= 0) slot.splice(i, 1);
    });
  });
}

function getKoStepExpectedSlotForPill(step, pill) {
  if (!step || !pill) return null;
  const local = Number(pill.localIndex);
  if (!Number.isInteger(local) || local < 0) return null;
  const arr = Array.isArray(step?.localToSlot) ? step.localToSlot : [];
  const idx = Number(arr[local]);
  return Number.isInteger(idx) && idx >= 0 ? idx : null;
}

function getKoStepValidIdsForSlot(state, step, slotIdx) {
  if (!state || !step) return [];
  const idx = Number(slotIdx);
  if (!Number.isInteger(idx) || idx < 0) return [];
  const targetFragId = Number(step?.fragId);
  const ids = Array.isArray(step?.slots?.[idx]) ? step.slots[idx] : [];
  return ids.filter((id) => {
    const pill = getPillById(state, id);
    if (!pill || String(pill.lang) !== "ko") return false;
    if (!Number.isInteger(targetFragId) || Number(pill.fragmentId) !== targetFragId) return false;
    const expected = getKoStepExpectedSlotForPill(step, pill);
    return Number.isInteger(expected) && expected === idx;
  });
}

function koStepSlotSatisfied(state, step, slotIdx) {
  if (!state || !step) return false;
  const idx = Number(slotIdx);
  if (!Number.isInteger(idx) || idx < 0) return false;
  const required = Number(step?.requiredCounts?.[idx] || 0);
  if (required <= 0) return true;
  const valid = getKoStepValidIdsForSlot(state, step, idx);
  return valid.length >= required;
}

function evaluateKoProgressStepSolved(state, step) {
  if (!state || !step) return false;
  const n = Array.isArray(step?.tokens) ? step.tokens.length : 0;
  if (!n) return true;
  for (let i = 0; i < n; i += 1) {
    const required = Number(step?.requiredCounts?.[i] || 0);
    if (required <= 0) continue;
    if (!koStepSlotSatisfied(state, step, i)) return false;
  }
  return true;
}

function syncKoProgressVisibility(state) {
  if (!state) return;
  const steps = Array.isArray(state?.koProgress?.steps) ? state.koProgress.steps : [];
  if (!steps.length) return;
  let active = steps.findIndex((x) => !x?.solved);
  if (active < 0) active = steps.length - 1;
  steps.forEach((step, idx) => {
    step.visible = idx === active;
  });
}

function placeTokenPrepPill(q, pillId, lang, slotIdx, koStepIdx = null) {
  const state = getTokenPrepState(q);
  if (!state) return false;
  const pill = getPillById(state, pillId);
  if (!pill) return false;
  if (String(pill.lang) !== String(lang)) return false;

  const idx = Number(slotIdx);
  if (!Number.isInteger(idx) || idx < 0) return false;

  if (lang === "en") {
    const rows = state?.slots?.[lang];
    if (!Array.isArray(rows) || idx >= rows.length) return false;
    removePillFromCurrentSlot(state, pill.id);
    if (!Array.isArray(rows[idx])) rows[idx] = [];
    rows[idx].push(pill.id);
    pill.placed = { lang, slotIdx: idx };
    return true;
  }

  if (lang === "ko") {
    const stepNum = Number(koStepIdx);
    const steps = Array.isArray(state?.koProgress?.steps) ? state.koProgress.steps : [];
    if (!Number.isInteger(stepNum) || stepNum < 0 || stepNum >= steps.length) return false;
    const step = steps[stepNum];
    if (!step || !step.visible || step.solved) return false;
    const stepFragId = Number(step?.fragId);
    if (!Number.isInteger(stepFragId) || Number(pill.fragmentId) !== stepFragId) return false;

    if (idx >= Number(step.tokens?.length || 0)) return false;
    const required = Number(step?.requiredCounts?.[idx] || 0);
    if (Array.isArray(step.fixedMask) && step.fixedMask[idx] && required <= 0) return false;

    const expectedIdx = getKoStepExpectedSlotForPill(step, pill);
    if (!Number.isInteger(expectedIdx) || expectedIdx !== idx) return false;

    const existing = getKoStepValidIdsForSlot(state, step, idx);
    const alreadyInTarget = existing.some((id) => String(id) === String(pill.id));
    if (!alreadyInTarget && required > 0 && existing.length >= required) return false;

    removePillFromCurrentSlot(state, pill.id);
    if (!Array.isArray(step.slots[idx])) step.slots[idx] = [];
    step.slots[idx].push(pill.id);
    pill.placed = { lang, stepIdx: stepNum, slotIdx: idx };

    step.solved = evaluateKoProgressStepSolved(state, step);
    if (step.solved && steps[stepNum + 1]) {
      steps[stepNum + 1].visible = true;
    }
    syncKoProgressVisibility(state);
    return true;
  }

  return false;
}

function returnTokenPrepPillToBank(q, pillId) {
  const state = getTokenPrepState(q);
  if (!state) return false;
  const pill = getPillById(state, pillId);
  if (!pill) return false;
  removePillFromCurrentSlot(state, pill.id);
  pill.placed = null;
  const steps = Array.isArray(state?.koProgress?.steps) ? state.koProgress.steps : [];
  steps.forEach((step) => {
    step.solved = evaluateKoProgressStepSolved(state, step);
  });
  syncKoProgressVisibility(state);
  return true;
}

function resolveTokenPrepPillIdFromDragEvent(ev) {
  const direct = compactWhitespace(tokenPrepDragPillId || "");
  if (direct) return direct;
  const dt = ev?.dataTransfer;
  if (!dt) return "";
  const fromCustom = compactWhitespace(dt.getData("text/x-tokenprep-pill") || "");
  if (fromCustom) return fromCustom;
  return compactWhitespace(dt.getData("text/plain") || "");
}

function renderTokenPrepPillHtml(pill, opts = {}) {
  const fragColor = pickFragColor(Number(pill?.fragmentId)).solid;
  const isKo = String(pill?.lang) === "ko";
  const inSlot = !!opts.inSlot;
  const dragEnabled = opts.dragEnabled !== false;
  const cls = ["tokenprep-pill"];
  if (isKo) cls.push("ko");
  if (inSlot) cls.push("in-slot");
  return `
    <span
      class="${cls.join(" ")}"
      draggable="${dragEnabled ? "true" : "false"}"
      data-pill-id="${escapeHtml(pill?.id || "")}"
      data-pill-lang="${escapeHtml(pill?.lang || "")}"
      data-frag-id="${Number(pill?.fragmentId)}"
      data-local-idx="${Number(pill?.localIndex)}"
      style="--pill-bg:${rgbaFromHex(fragColor, isKo ? 0.13 : 0.15)}; --pill-bd:${mixHex(fragColor, "#ffffff", 0.08)}; --pill-fg:${mixHex(fragColor, "#2b1b12", 0.36)};"
      title="F${Number(pill?.fragmentNo)}${Number.isInteger(Number(pill?.expectedSlotIdx)) ? ` @${Number(pill.expectedSlotIdx) + 1}` : ""}"
    >${escapeHtml(pill?.token || "")}</span>
  `;
}

function renderTokenPrepMergedSlotPillHtml(pills, tokenText, opts = {}) {
  const list = Array.isArray(pills) ? pills.filter(Boolean) : [];
  if (!list.length) return "";
  const top = list[list.length - 1] || null;
  const dragEnabled = opts.dragEnabled !== false;
  const includeBaseColor = !!opts.includeBaseColor;
  const baseFragId = Number(opts.baseFragId);
  const lang = String(opts.lang || top?.lang || "ko");

  const fragIds = list
    .map((p) => Number(p?.fragmentId))
    .filter((id) => Number.isInteger(id));
  if (includeBaseColor && Number.isInteger(baseFragId)) {
    fragIds.unshift(baseFragId);
  }
  const uniqueFragIds = [];
  fragIds.forEach((id) => {
    if (!uniqueFragIds.includes(id)) uniqueFragIds.push(id);
  });

  let style = "";
  if (uniqueFragIds.length >= 2) {
    const bg = buildOverlapBackground(uniqueFragIds);
    const topColor = pickFragColor(uniqueFragIds[uniqueFragIds.length - 1]).solid;
    style = `${bg} color:${mixHex(topColor, "#2b1b12", 0.36)};`;
  } else {
    const colorId = uniqueFragIds.length ? uniqueFragIds[0] : Number(top?.fragmentId);
    const solid = pickFragColor(colorId).solid;
    style = `--pill-bg:${rgbaFromHex(solid, 0.15)}; --pill-bd:${mixHex(solid, "#ffffff", 0.08)}; --pill-fg:${mixHex(solid, "#2b1b12", 0.36)};`;
  }

  return `
    <span
      class="tokenprep-pill ${lang === "ko" ? "ko " : ""}in-slot merged-slot-pill"
      draggable="${dragEnabled ? "true" : "false"}"
      data-pill-id="${escapeHtml(top?.id || "")}"
      data-pill-lang="${escapeHtml(lang)}"
      data-frag-id="${Number(top?.fragmentId)}"
      data-local-idx="${Number(top?.localIndex)}"
      style="${style}"
      title="${escapeHtml(tokenText || top?.token || "")}"
    >${escapeHtml(tokenText || top?.token || "")}</span>
  `;
}

function renderTokenPrepStage() {
  const q = getCurrentQuestion();
  if (!q) return;
  if (!q.fragmentTokenIndex) {
    q.fragmentTokenIndex = buildFragmentTokenIndexBundle(q);
  }
  const bundle = q.fragmentTokenIndex || { en: {}, ko: {} };
  const state = getTokenPrepState(q);
  if (!state) return;
  const koSteps = Array.isArray(state?.koProgress?.steps) ? state.koProgress.steps : [];
  koSteps.forEach((step) => {
    step.solved = evaluateKoProgressStepSolved(state, step);
  });
  syncKoProgressVisibility(state);

  const bank = document.getElementById("tokenprep-fragment-bank");
  const enSlots = document.getElementById("tokenprep-en-slots");
  const koSlots = document.getElementById("tokenprep-ko-slots");
  const leftStatus = document.getElementById("left-status");
  const rightStatus = document.getElementById("right-status");

  if (bank) {
    bank.innerHTML = (q.fragments || [])
      .map((f) => {
        const c = pickFragColor(Number(f.id));
        const enPills = (state.pills || [])
          .filter((p) => Number(p.fragmentId) === Number(f.id) && p.lang === "en" && !p.placed)
          .sort((a, b) => a.localIndex - b.localIndex);
        const koPills = (state.pills || [])
          .filter((p) => Number(p.fragmentId) === Number(f.id) && p.lang === "ko" && !p.placed)
          .sort((a, b) => a.localIndex - b.localIndex);
        const allPlaced = enPills.length === 0 && koPills.length === 0;
        return `
          <div
            class="frag-chip tokenprep-frag"
            data-frag-id="${f.id}"
            ${allPlaced ? `style="opacity:0.32; --frag-color:${c.solid}; --frag-soft:${c.soft}; --frag-border:${c.solid};"` : `style="--frag-color:${c.solid}; --frag-soft:${c.soft}; --frag-border:${c.solid};"`}
            title="${escapeHtml(f.en)}"
          >
            <div class="tokenprep-fragline en">
              ${enPills.length ? enPills.map((pill) => renderTokenPrepPillHtml(pill)).join("") : `<span class="tokenprep-empty">-</span>`}
            </div>
            <div class="tokenprep-fragline ko">
              ${koPills.length ? koPills.map((pill) => renderTokenPrepPillHtml(pill)).join("") : `<span class="tokenprep-empty">-</span>`}
            </div>
          </div>
        `;
      })
      .join("");
  }

  const enSentence = Array.isArray(bundle?.en?.sentenceTokens) ? bundle.en.sentenceTokens : [];
  const slotEn = Array.isArray(state?.slots?.en) ? state.slots.en : [];

  const renderSlot = (lang, idx, ids, displayText = "") => {
    const pills = (Array.isArray(ids) ? ids : [])
      .map((id) => getPillById(state, id))
      .filter((pill) => !!pill && String(pill.lang) === String(lang));
    const filled = pills.length > 0;
    const merged = filled
      ? renderTokenPrepMergedSlotPillHtml(pills, displayText, {
          dragEnabled: true,
          lang,
        })
      : "";
    return `
      <div class="slot-chip${filled ? " filled" : ""}" data-slot-lang="${escapeHtml(lang)}" data-slot-idx="${idx}">
        <div class="slot-pill-wrap">
          ${merged}
        </div>
      </div>
    `;
  };

  if (enSlots) {
    enSlots.innerHTML = enSentence
      .map((tok, idx) => renderSlot("en", idx, slotEn[idx], String(tok || "")))
      .join("");
  }
  if (koSlots) {
    const rows = koSteps
      .map((step, stepIdx) => {
        if (!step?.visible) return "";
        const solved = !!step.solved;
        const slotHtml = (Array.isArray(step.tokens) ? step.tokens : [])
          .map((tok, idx) => {
            const isFixed = Array.isArray(step.fixedMask) && !!step.fixedMask[idx];
            const required = Number(step?.requiredCounts?.[idx] || 0);
            if (required <= 0) {
              return `
                <div class="slot-chip filled fixed" data-slot-lang="ko" data-ko-step="${stepIdx}" data-slot-idx="${idx}">
                  <div class="slot-pill-wrap">
                    <span class="tokenprep-pill ko in-slot fixed-pill" draggable="false">${escapeHtml(tok)}</span>
                  </div>
                </div>
              `;
            }
            const ids = getKoStepValidIdsForSlot(state, step, idx);
            const pills = ids.map((id) => getPillById(state, id)).filter(Boolean);
            const slotSolved = koStepSlotSatisfied(state, step, idx);
            const overlapFixed = isFixed && required > 0;
            const pillHtml = pills.length
              ? renderTokenPrepMergedSlotPillHtml(pills, tok, {
                  dragEnabled: !solved,
                  includeBaseColor: overlapFixed,
                  baseFragId: step?.baseFragHint,
                })
              : (overlapFixed ? `<span class="tokenprep-fixed-hint">${escapeHtml(tok)}</span>` : "");
            return `
              <div class="slot-chip${pills.length ? " filled" : ""}${slotSolved ? " solved" : ""}${overlapFixed ? " overlap-slot" : ""}" data-slot-lang="ko" data-ko-step="${stepIdx}" data-slot-idx="${idx}">
                <div class="slot-pill-wrap">
                  ${pillHtml}
                </div>
              </div>
            `;
          })
          .join("");

        return `
          <div class="ko-step-row${solved ? " solved" : ""}">
            <div class="ko-step-head">Step ${stepIdx + 1}</div>
            <div class="slot-grid">${slotHtml}</div>
          </div>
        `;
      })
      .filter(Boolean)
      .join("");

    koSlots.innerHTML = rows || `<div class="tokenprep-empty">-</div>`;
  }

  if (leftStatus) {
    const remain = (state.pills || []).filter((p) => !p.placed).length;
    leftStatus.textContent = `Bank ${remain}`;
  }
  if (rightStatus) {
    const placed = (state.pills || []).filter((p) => !!p.placed).length;
    const total = (state.pills || []).length;
    const done = koSteps.filter((x) => !!x.solved).length;
    const totalSteps = koSteps.length;
    rightStatus.textContent = `${placed}/${total} | KR ${done}/${totalSteps}`;
  }

  wireTokenPrepDnD();
}

function wireTokenPrepDnD() {
  const q = getCurrentQuestion();
  if (!q || stageMode !== "token") return;
  const bank = document.getElementById("tokenprep-fragment-bank");
  const enSlots = document.getElementById("tokenprep-en-slots");
  const koSlots = document.getElementById("tokenprep-ko-slots");

  const bindDragStart = (host) => {
    if (!host) return;
    if (host.dataset.tpDragBound === "1") return;
    host.dataset.tpDragBound = "1";
    host.addEventListener("dragstart", (ev) => {
      const pill = ev.target?.closest?.("[data-pill-id]");
      if (!pill) return;
      const pillId = compactWhitespace(pill.getAttribute("data-pill-id") || "");
      if (!pillId) return;
      tokenPrepDragPillId = pillId;
      if (ev.dataTransfer) {
        ev.dataTransfer.setData("text/x-tokenprep-pill", pillId);
        ev.dataTransfer.setData("text/plain", pillId);
        ev.dataTransfer.effectAllowed = "move";
      }
    });
    host.addEventListener("dragend", () => {
      tokenPrepDragPillId = "";
    });
  };

  const bindSlotDrop = (host) => {
    if (!host) return;
    if (host.dataset.tpSlotDropBound === "1") return;
    host.dataset.tpSlotDropBound = "1";
    host.addEventListener("dragover", (ev) => {
      const slot = ev.target?.closest?.("[data-slot-lang][data-slot-idx]");
      if (!slot) return;
      const pillId = resolveTokenPrepPillIdFromDragEvent(ev);
      if (!pillId) return;
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    });

    host.addEventListener("drop", (ev) => {
      const slot = ev.target?.closest?.("[data-slot-lang][data-slot-idx]");
      if (!slot) return;
      const pillId = resolveTokenPrepPillIdFromDragEvent(ev);
      if (!pillId) return;
      const lang = compactWhitespace(slot.getAttribute("data-slot-lang") || "");
      const idx = Number(slot.getAttribute("data-slot-idx"));
      const koStep = Number(slot.getAttribute("data-ko-step"));
      if (!lang || !Number.isInteger(idx)) return;
      ev.preventDefault();
      const ok = placeTokenPrepPill(
        q,
        pillId,
        lang,
        idx,
        Number.isInteger(koStep) ? koStep : null
      );
      tokenPrepDragPillId = "";
      if (!ok) return;
      renderTokenPrepStage();
      updateQuestionStatus();
    });
  };

  const bindSlotTapCancel = (host) => {
    if (!host) return;
    if (host.dataset.tpTapCancelBound === "1") return;
    host.dataset.tpTapCancelBound = "1";
    host.addEventListener("click", (ev) => {
      if (isLocked) return;
      const slot = ev.target?.closest?.("[data-slot-lang][data-slot-idx]");
      if (!slot) return;
      const lang = compactWhitespace(slot.getAttribute("data-slot-lang") || "");
      if (lang !== "en") return;
      const pillEl = ev.target?.closest?.("[data-pill-id]");
      if (!pillEl) return;
      const pillId = compactWhitespace(pillEl.getAttribute("data-pill-id") || "");
      if (!pillId) return;
      const ok = returnTokenPrepPillToBank(q, pillId);
      if (!ok) return;
      renderTokenPrepStage();
      updateQuestionStatus();
    });
  };

  const bindBankDrop = (host) => {
    if (!host) return;
    if (host.dataset.tpBankDropBound === "1") return;
    host.dataset.tpBankDropBound = "1";
    host.addEventListener("dragover", (ev) => {
      const pillId = resolveTokenPrepPillIdFromDragEvent(ev);
      if (!pillId) return;
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    });
    host.addEventListener("drop", (ev) => {
      const pillId = resolveTokenPrepPillIdFromDragEvent(ev);
      if (!pillId) return;
      ev.preventDefault();
      const ok = returnTokenPrepPillToBank(q, pillId);
      tokenPrepDragPillId = "";
      if (!ok) return;
      renderTokenPrepStage();
      updateQuestionStatus();
    });
  };

  bindDragStart(bank);
  bindDragStart(enSlots);
  bindDragStart(koSlots);
  bindSlotDrop(enSlots);
  bindSlotDrop(koSlots);
  bindSlotTapCancel(enSlots);
  bindBankDrop(bank);
}

function shuffleArray(arr) {
  const out = Array.isArray(arr) ? arr.slice() : [];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildFinalExpectedTokens(q) {
  const fromAnswer = koTokenize(String(q?.answer || ""));
  if (fromAnswer.length) return fromAnswer;
  const fromMerged = koTokenize(String(koState?.mergedText || ""));
  if (fromMerged.length) return fromMerged;
  return [];
}

function initFinalStateForQuestion(q) {
  const expected = buildFinalExpectedTokens(q);
  const tokens = expected.map((text, i) => ({
    id: `k${i + 1}`,
    text: String(text),
    order: i,
  }));
  finalState = {
    expectedTokens: expected.slice(),
    selectedTokens: [],
    bankTokens: shuffleArray(tokens),
    isLocked: false,
  };
}

function resetFinalState() {
  const q = getCurrentQuestion();
  if (!q) return;
  initFinalStateForQuestion(q);
}

function renderFinalScrambleStage() {
  const q = getCurrentQuestion();
  if (!q) return;
  if (!finalState) initFinalStateForQuestion(q);

  const answerLineEl = document.getElementById("final-answer-line");
  const bankAreaEl = document.getElementById("final-bank-area");
  const remainInfoEl = document.getElementById("final-remain");
  const leftStatus = document.getElementById("left-status");
  const rightStatus = document.getElementById("right-status");
  if (!answerLineEl || !bankAreaEl || !remainInfoEl) return;

  const renderFallback = () => {
    answerLineEl.innerHTML = finalState.selectedTokens
      .map((x) => `<span class="tok single">${escapeHtml(x.text)}</span>`)
      .join(" ");
    bankAreaEl.innerHTML = finalState.bankTokens
      .map((x) => `<button class="quiz-btn" data-final-id="${escapeHtml(x.id)}" style="margin:4px 4px 0 0; height:26px; font-size:12px;">${escapeHtml(x.text)}</button>`)
      .join("");
  };

  if (window.PleksKRScramble?.render) {
    window.PleksKRScramble.render({
      answerLineEl,
      bankAreaEl,
      remainInfoEl,
      state: {
        selectedTokens: finalState.selectedTokens,
        bankTokens: finalState.bankTokens,
        isLocked: isLocked || !!finalState.isLocked,
      },
      onSelectToken: (tok) => {
        if (isLocked || finalState.isLocked) return;
        const i = finalState.bankTokens.findIndex((x) => x.id === tok.id);
        if (i < 0) return;
        const [moved] = finalState.bankTokens.splice(i, 1);
        finalState.selectedTokens.push(moved);
      },
      onUnselectLast: () => {
        if (isLocked || finalState.isLocked) return;
        const moved = finalState.selectedTokens.pop();
        if (moved) finalState.bankTokens.push(moved);
      },
      rerender: () => {
        renderFinalScrambleStage();
        updateQuestionStatus();
      },
    });
  } else {
    renderFallback();
  }

  if (leftStatus) leftStatus.textContent = `${finalState.bankTokens.length}`;
  if (rightStatus) rightStatus.textContent = `${finalState.selectedTokens.length}/${finalState.expectedTokens.length}`;
}

function resetPointerDragState() {
  const sentenceWrap = document.getElementById("sentence-wrap");
  if (sentenceWrap) sentenceWrap.classList.remove("drag-armed");

  if (pointerDrag?.ghostEl && pointerDrag.ghostEl.parentNode) {
    pointerDrag.ghostEl.parentNode.removeChild(pointerDrag.ghostEl);
  }
  pointerDrag = {
    active: false,
    pointerId: null,
    fragId: null,
    tokenIdx: null,
    ghostEl: null,
    startX: 0,
    startY: 0,
    moved: false,
  };
  dragFragmentId = null;
}

function wirePointerDragGlobal() {
  if (pointerWireBound) return;
  pointerWireBound = true;

  window.addEventListener(
    "pointermove",
    (ev) => {
      if (!pointerDrag.active) return;
      if (Number(pointerDrag.pointerId) !== Number(ev.pointerId)) return;
      ev.preventDefault();
      updatePointerDrag(ev);
    },
    { passive: false }
  );

  const finish = (ev) => {
    if (!pointerDrag.active) return;
    if (Number(pointerDrag.pointerId) !== Number(ev.pointerId)) return;
    finishPointerDrag(ev);
  };

  window.addEventListener("pointerup", finish);
  window.addEventListener("pointercancel", finish);
}

function startPointerDrag(fragId, ev) {
  if (!Number.isInteger(fragId) || isLocked) return;
  if (pendingMerge && Number(pendingMerge.fragId) !== Number(fragId)) {
    showToast("no", "Choose merge anchor first.");
    return;
  }
  if (ev.button !== undefined && ev.button !== 0) return;

  resetPointerDragState();
  dragFragmentId = fragId;
  activeFragmentId = fragId;
  previewRange = [];

  const q = getCurrentQuestion();
  const frag = q?.fragments?.find((f) => Number(f.id) === Number(fragId));
  const ghost = document.createElement("div");
  ghost.className = "drag-ghost";
  ghost.innerHTML = `<div class="drag-ghost-en">${escapeHtml(frag?.en || "")}</div><div class="drag-ghost-ko">${escapeHtml(frag?.ko || "")}</div>`;
  document.body.appendChild(ghost);

  pointerDrag = {
    active: true,
    pointerId: Number(ev.pointerId),
    fragId,
    tokenIdx: null,
    ghostEl: ghost,
    startX: Number(ev.clientX) || 0,
    startY: Number(ev.clientY) || 0,
    moved: false,
  };

  if (ev.currentTarget && typeof ev.currentTarget.setPointerCapture === "function") {
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch (_) {}
  }

  ev.preventDefault();
  updatePointerDrag(ev);
  renderFragments();
  renderSentenceAndOverlap();
}

function findTokenIdxFromPoint(clientX, clientY) {
  const node = document.elementFromPoint(clientX, clientY);
  const tok = node?.closest?.("[data-token-idx]");
  if (!tok) return null;
  const idx = Number(tok.getAttribute("data-token-idx"));
  return Number.isInteger(idx) ? idx : null;
}

function updatePointerDrag(ev) {
  const ghost = pointerDrag.ghostEl;
  if (ghost) {
    ghost.style.left = `${ev.clientX + 12}px`;
    ghost.style.top = `${ev.clientY + 10}px`;
  }

  if (!pointerDrag.moved) {
    const dx = Math.abs((Number(ev.clientX) || 0) - (Number(pointerDrag.startX) || 0));
    const dy = Math.abs((Number(ev.clientY) || 0) - (Number(pointerDrag.startY) || 0));
    if (dx + dy >= 4) pointerDrag.moved = true;
  }

  const sentenceWrap = document.getElementById("sentence-wrap");
  if (!sentenceWrap) return;

  const tokenIdx = findTokenIdxFromPoint(ev.clientX, ev.clientY);
  const nextPreview = Number.isInteger(tokenIdx) ? resolvePlacementRange(pointerDrag.fragId, tokenIdx) : [];
  const changedToken = Number(pointerDrag.tokenIdx) !== Number(tokenIdx);
  const changedRange = !isSameIndexSet(previewRange, nextPreview);
  pointerDrag.tokenIdx = Number.isInteger(tokenIdx) ? tokenIdx : null;

  if (Number.isInteger(pointerDrag.tokenIdx) && nextPreview.length) {
    sentenceWrap.classList.add("drag-armed");
  } else {
    sentenceWrap.classList.remove("drag-armed");
  }

  if (changedToken || changedRange) {
    previewRange = nextPreview.slice();
    renderSentenceAndOverlap();
  }
}

function finishPointerDrag(ev) {
  const fragId = pointerDrag.fragId;
  const tokenIdx = pointerDrag.tokenIdx;
  const sentenceWrap = document.getElementById("sentence-wrap");
  const inside = sentenceWrap ? isPointInsideElement(sentenceWrap, ev.clientX, ev.clientY) : false;

  let placed = false;
  if (!isLocked && Number.isInteger(fragId) && inside && Number.isInteger(tokenIdx)) {
    placed = placeFragment(fragId, tokenIdx, "drag");
  }

  if (pointerDrag.moved || placed) {
    suppressBankClickUntil = Date.now() + 220;
  }
  resetPointerDragState();
  previewRange = [];
  if (placed) activeFragmentId = null;
  renderFragments();
  renderSentenceAndOverlap();
  renderKoMergeZone();
  updateQuestionStatus();
}

function isPointInsideElement(el, x, y) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function wireBottomButtons() {
  const submitBtn = document.getElementById("btn-submit");
  const nextBtn = document.getElementById("btn-next");
  const clearBtn = document.getElementById("btn-clear");
  if (submitBtn) submitBtn.addEventListener("click", submitCurrent);
  if (nextBtn) {
    nextBtn.addEventListener("click", goNext);
    nextBtn.disabled = !isLocked;
  }
  if (clearBtn && stageMode === "token") {
    clearBtn.addEventListener("click", () => {
      const q = getCurrentQuestion();
      if (!q) return;
      q.fragmentTokenIndex = buildFragmentTokenIndexBundle(q);
      q.tokenPrepState = null;
      renderTokenPrepStage();
      updateQuestionStatus();
    });
  }
}

function getQuestionProgress(q) {
  const question = q || getCurrentQuestion();
  if (!question) return { done: 0, total: 0, complete: false };
  const total = question.fragments.length;
  const done = question.fragments.filter((f) => Array.isArray(f.placedRange) && f.placedRange.length).length;
  return { done, total, complete: total > 0 && done === total };
}

function updateQuestionStatus() {
  const q = getCurrentQuestion();
  const el = document.getElementById("question-status");
  if (!q || !el) return;

  if (stageMode === "token") {
    const state = getTokenPrepState(q);
    const enPills = (state?.pills || []).filter((p) => p.lang === "en");
    const enPlaced = enPills.filter((p) => !!p.placed).length;
    const steps = Array.isArray(state?.koProgress?.steps) ? state.koProgress.steps : [];
    const koDone = steps.filter((x) => !!x.solved).length;
    el.textContent = `Token EN ${enPlaced}/${enPills.length} | KR ${koDone}/${steps.length}`;
    return;
  }

  const p = getQuestionProgress(q);
  if (pendingMerge) {
    el.textContent = "기준 단어 선택";
    return;
  }
  if (koState?.pending) {
    el.textContent = "Tap overlap token in KR sentence.";
    return;
  }
  const koTotal = Array.isArray(koMergePlan) ? koMergePlan.length : 0;
  const koDone = Number(koState?.stepIndex || 0);
  const koText = koTotal ? ` | KR ${koDone}/${koTotal}` : "";
  el.textContent = `${p.done}/${p.total} mapped${koText}`;
}

function isSameIndexSet(a, b) {
  const x = Array.isArray(a) ? Array.from(new Set(a.map((v) => Number(v)).filter((v) => Number.isInteger(v)))).sort((m, n) => m - n) : [];
  const y = Array.isArray(b) ? Array.from(new Set(b.map((v) => Number(v)).filter((v) => Number.isInteger(v)))).sort((m, n) => m - n) : [];
  if (x.length !== y.length) return false;
  for (let i = 0; i < x.length; i += 1) {
    if (x[i] !== y[i]) return false;
  }
  return true;
}

function evaluateCurrentPlacement() {
  const q = getCurrentQuestion();
  if (!q) return { ok: false, missing: [], wrong: [], anchorMissing: [], koIncomplete: false };

  const missing = [];
  const wrong = [];
  const anchorMissing = [];

  (q.fragments || []).forEach((f) => {
    const placed = Array.isArray(f.placedRange) ? f.placedRange : [];
    if (!placed.length) {
      missing.push(f.no);
      return;
    }
    if (!Array.isArray(f.candidates) || !f.candidates.length) {
      return;
    }
    const ok = f.candidates.some((c) => isSameIndexSet(placed, c.indices));
    if (!ok) wrong.push(f.no);
    if (f.requiresAnchor && !Number.isInteger(f.anchorIdx)) anchorMissing.push(f.no);
  });

  const koTotal = Array.isArray(koMergePlan) ? koMergePlan.length : 0;
  const koDone = Number(koState?.stepIndex || 0);
  const koIncomplete = koTotal > 0 && koDone < koTotal;

  return {
    ok: missing.length === 0 && wrong.length === 0 && anchorMissing.length === 0 && !koIncomplete,
    missing,
    wrong,
    anchorMissing,
    koIncomplete,
  };
}

function submitCurrent() {
  const q = getCurrentQuestion();
  if (!q) return;

  if (stageMode === "token") {
    if (isLocked) return;
    const state = getTokenPrepState(q);
    if (!state) return;
    const enPills = (state.pills || []).filter((p) => p.lang === "en");
    const enPlaced = enPills.filter((p) => !!p.placed).length;
    const steps = Array.isArray(state?.koProgress?.steps) ? state.koProgress.steps : [];
    const koAllDone = steps.length ? steps.every((x) => !!x.solved) : true;

    if (enPlaced < enPills.length || !koAllDone) {
      showToast("no", "Finish token merge first.");
      return;
    }
    isLocked = true;
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L4-E1 / Q${q.qNumber}`,
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
    return;
  }

  if (isLocked) return;

  if (pendingMerge) {
    showToast("no", "Choose merge anchor first.");
    return;
  }
  if (koState?.pending) {
    showToast("no", "Finish KR overlap tap first.");
    return;
  }

  const evalResult = evaluateCurrentPlacement();
  if (!evalResult.ok) {
    const missText = evalResult.missing.length ? `missing: F${evalResult.missing.join(",F")}` : "";
    const wrongText = evalResult.wrong.length ? `wrong span: F${evalResult.wrong.join(",F")}` : "";
    const anchorText = evalResult.anchorMissing.length ? `anchor: F${evalResult.anchorMissing.join(",F")}` : "";
    const koText = evalResult.koIncomplete ? "KR merge incomplete" : "";
    const detail = [missText, wrongText, anchorText, koText].filter(Boolean).join(" / ");
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L4-E1 / Q${q.qNumber}`,
      question: buildQuestionLog(q),
      selected: buildSelectedLog(q),
      correct: false,
      modelAnswer: q.answer,
    });
    showToast("no", detail ? `Incomplete or incorrect (${detail})` : "Incomplete or incorrect.");
    return;
  }

  q.fragmentTokenIndex = buildFragmentTokenIndexBundle(q);
  stageMode = "token";
  isLocked = false;
  upsertResult({
    no: currentIndex + 1,
    qNumber: q.qNumber,
    word: `Pleks L4-E1 / Q${q.qNumber}`,
    question: buildQuestionLog(q),
    selected: buildSelectedLog(q),
    correct: true,
    modelAnswer: q.answer,
  });
  renderQuestion();
  showToast("ok", "Token prep stage.");
}

function goNext() {
  const q = getCurrentQuestion();
  if (q && !isLocked) {
    upsertResult({
      no: currentIndex + 1,
      qNumber: q.qNumber,
      word: `Pleks L4-E1 / Q${q.qNumber}`,
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
  stageMode = "build";
  finalState = null;
  renderQuestion();
}

function buildQuestionLog(q) {
  const fragText = (q.fragments || [])
    .map((f) => `F${f.no}:${f.en}`)
    .join(" | ");
  return `${q.sentence} | fragments: ${fragText}`;
}

function formatRange1Based(indices) {
  const list = Array.isArray(indices)
    ? Array.from(new Set(indices.map((x) => Number(x)).filter((x) => Number.isInteger(x) && x >= 0))).sort((a, b) => a - b)
    : [];
  if (!list.length) return "-";
  let out = [];
  let s = list[0];
  let e = list[0];
  for (let i = 1; i < list.length; i += 1) {
    const v = list[i];
    if (v === e + 1) {
      e = v;
      continue;
    }
    out.push(s === e ? String(s + 1) : `${s + 1}-${e + 1}`);
    s = v;
    e = v;
  }
  out.push(s === e ? String(s + 1) : `${s + 1}-${e + 1}`);
  return out.join(",");
}

function buildSelectedLog(q) {
  const mapText = (q.fragments || [])
    .map((f) => {
      const anchor = Number.isInteger(f.anchorIdx) ? `@${Number(f.anchorIdx) + 1}` : "";
      return `F${f.no}[${formatRange1Based(f.placedRange)}]${anchor}`;
    })
    .join(" | ");
  if (mapText) return mapText;
  return "No mapping";
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
        word: `Pleks L4-E1 / Q${q.qNumber}`,
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

function showToast(type, message) {
  if (window.PleksToastFX?.show) {
    window.PleksToastFX.show(type, message);
  }
}

function resolveTokenIndexFromEvent(ev) {
  const tok = ev.target?.closest?.("[data-token-idx]");
  if (!tok) return null;
  const idx = Number(tok.getAttribute("data-token-idx"));
  return Number.isInteger(idx) ? idx : null;
}

function resolvePlacementRange(fragmentId, dropTokenIdx) {
  const q = getCurrentQuestion();
  if (!q) return [];

  const frag = q.fragments.find((f) => Number(f.id) === Number(fragmentId));
  if (!frag) return [];

  const cands = Array.isArray(frag.candidates) ? frag.candidates : [];
  if (cands.length) {
    if (!Number.isInteger(dropTokenIdx)) return cands[0].indices.slice();

    let best = cands[0];
    let bestScore = Number.POSITIVE_INFINITY;
    cands.forEach((c) => {
      const s = Number(c.start);
      const e = Number(c.end);
      let dist = 0;
      if (dropTokenIdx < s) dist = s - dropTokenIdx;
      else if (dropTokenIdx > e) dist = dropTokenIdx - e;
      if (dist < bestScore) {
        best = c;
        bestScore = dist;
      }
    });
    return Array.isArray(best.indices) ? best.indices.slice() : [];
  }

  const fallbackLen = Math.max(1, frag.words.length);
  const total = q.sentenceTokens.length;
  if (!total) return [];
  const start = Number.isInteger(dropTokenIdx)
    ? Math.max(0, Math.min(total - fallbackLen, dropTokenIdx))
    : 0;
  return range(start, Math.min(total - 1, start + fallbackLen - 1));
}

function placeFragment(fragmentId, dropTokenIdx, source) {
  const q = getCurrentQuestion();
  if (!q) return false;
  if (koState?.pending) return false;

  const frag = q.fragments.find((f) => Number(f.id) === Number(fragmentId));
  if (!frag) return false;
  if (koCompletedFragIds.has(Number(fragmentId))) return false;

  const resolved = resolvePlacementRange(fragmentId, dropTokenIdx);
  if (!resolved.length) return false;

  // Re-positioning starts from a clean state for this fragment.
  frag.placedRange = [];
  frag.placedOrder = 0;
  frag.anchorIdx = null;
  frag.requiresAnchor = false;

  const overlapIndices = getOverlapIndicesAgainstPlaced(q, fragmentId, resolved);
  if (overlapIndices.length) {
    pendingMerge = {
      fragId: fragmentId,
      proposedRange: resolved.slice(),
      overlapIndices: overlapIndices.slice(),
      sourceTokenIdx: Number.isInteger(dropTokenIdx) ? Number(dropTokenIdx) : null,
    };
    previewRange = resolved.slice();
    if (source === "tap") {
      showToast("ok", "Overlap detected. Click anchor word.");
    }
    return true;
  }

  pendingMerge = null;
  frag.placedRange = resolved.slice();
  placementOrderSerial += 1;
  frag.placedOrder = Number(placementOrderSerial);
  frag.anchorIdx = Number.isInteger(dropTokenIdx) && resolved.includes(Number(dropTokenIdx))
    ? Number(dropTokenIdx)
    : null;
  frag.requiresAnchor = false;
  queueKoMergeForFragment(Number(fragmentId));
  return true;
}

function getOverlapIndicesAgainstPlaced(q, incomingFragId, proposedRange) {
  const set = new Set();
  const proposed = Array.isArray(proposedRange) ? proposedRange : [];
  if (!proposed.length) return [];

  (q?.fragments || []).forEach((f) => {
    if (Number(f.id) === Number(incomingFragId)) return;
    const placed = Array.isArray(f.placedRange) ? f.placedRange : [];
    if (!placed.length) return;
    const pSet = new Set(placed);
    proposed.forEach((idx) => {
      if (pSet.has(idx)) set.add(idx);
    });
  });

  return Array.from(set).sort((a, b) => a - b);
}

function resolvePendingMergeAnchor(tokenIdx) {
  if (!pendingMerge) return false;
  if (!Number.isInteger(tokenIdx)) return false;

  const allowed = new Set(
    (Array.isArray(pendingMerge.overlapIndices) ? pendingMerge.overlapIndices : [])
      .map((x) => Number(x))
      .filter((x) => Number.isInteger(x))
  );
  if (!allowed.has(tokenIdx)) {
    showToast("no", "Pick an overlap word as anchor.");
    return false;
  }

  const q = getCurrentQuestion();
  if (!q) return false;
  const frag = q.fragments.find((f) => Number(f.id) === Number(pendingMerge.fragId));
  if (!frag) return false;
  const enAnchorWord = compactWhitespace(q.sentenceTokens?.[tokenIdx] || "");

  frag.placedRange = Array.isArray(pendingMerge.proposedRange) ? pendingMerge.proposedRange.slice() : [];
  placementOrderSerial += 1;
  frag.placedOrder = Number(placementOrderSerial);
  frag.anchorIdx = Number(tokenIdx);
  frag.requiresAnchor = true;
  pendingMerge = null;
  queueKoMergeForFragment(Number(frag.id), enAnchorWord);
  showToast("ok", "Anchor selected.");
  return true;
}

function findKoOverlapCandidateIndices(mergedText, overlapTokens) {
  const tokens = koTokenize(mergedText);
  if (!tokens.length) return [];

  const normalizedTokens = tokens.map((t) => normalizeKoToken(t));
  const set = new Set();
  const list = Array.isArray(overlapTokens) ? overlapTokens : [];

  list.forEach((item) => {
    const phraseTokens = koTokenize(item).map((x) => normalizeKoToken(x)).filter(Boolean);
    if (!phraseTokens.length) return;

    const m = phraseTokens.length;
    for (let i = 0; i <= normalizedTokens.length - m; i += 1) {
      let ok = true;
      for (let j = 0; j < m; j += 1) {
        if (normalizedTokens[i + j] !== phraseTokens[j]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (let k = 0; k < m; k += 1) set.add(i + k);
    }
  });

  return Array.from(set).sort((a, b) => a - b);
}

function pickKoOverlapTokensForStep(step, enAnchorWord) {
  const baseList = Array.isArray(step?.overlapTokens)
    ? step.overlapTokens.map((x) => compactWhitespace(x)).filter(Boolean)
    : [];
  const anchorKey = normalizeWord(enAnchorWord || "");
  const map = step?.anchorMap && typeof step.anchorMap === "object" ? step.anchorMap : {};

  if (anchorKey && Array.isArray(map[anchorKey]) && map[anchorKey].length) {
    return map[anchorKey].map((x) => compactWhitespace(x)).filter(Boolean);
  }
  if (baseList.length <= 1) return baseList;
  return baseList;
}

function getKrCommonRecordsForFrag(q, fragmentId) {
  if (!q) return [];
  const frag = (q.fragments || []).find((f) => Number(f.id) === Number(fragmentId));
  if (!frag) return [];
  const fragNo = Number(frag.no);
  if (!Number.isInteger(fragNo)) return [];
  const step = (Array.isArray(q.krCommonMap) ? q.krCommonMap : []).find((x) => Number(x?.fragNo) === fragNo);
  return Array.isArray(step?.common) ? step.common : [];
}

function buildKoStemSpecs(q, fragmentId, overlapTokens) {
  const common = getKrCommonRecordsForFrag(q, fragmentId);
  const fromCommon = common
    .map((x) => {
      const clickToken = compactWhitespace(x?.clickToken || "");
      const incomingToken = compactWhitespace(x?.incomingToken || "");
      const rawStem = compactWhitespace(x?.paintStem || incomingToken || clickToken || "");
      const stem = normalizeKoToken(rawStem);
      if (!stem) return null;
      return { stem, clickToken, incomingToken };
    })
    .filter(Boolean);
  if (fromCommon.length) return fromCommon;

  const out = [];
  (Array.isArray(overlapTokens) ? overlapTokens : []).forEach((phrase) => {
    koTokenize(phrase).forEach((tok) => {
      const stem = normalizeKoToken(tok);
      if (!stem) return;
      out.push({ stem, clickToken: "", incomingToken: tok });
    });
  });
  return out;
}

function findKoCandidateIndicesFromSpecs(baseText, specs) {
  const tokens = koTokenize(baseText);
  const normalized = tokens.map((t) => normalizeKoToken(t));
  const set = new Set();
  const list = Array.isArray(specs) ? specs : [];

  list.forEach((spec) => {
    const stem = normalizeKoToken(spec?.stem || "");
    const clickTokenRaw = compactWhitespace(spec?.clickToken || "");
    const clickNorm = normalizeKoToken(clickTokenRaw);

    if (clickTokenRaw) {
      tokens.forEach((tok, idx) => {
        if (compactWhitespace(tok) === clickTokenRaw) set.add(idx);
      });
    }

    if (clickNorm) {
      normalized.forEach((n, idx) => {
        if (n === clickNorm) set.add(idx);
      });
    }

    if (stem) {
      normalized.forEach((n, idx) => {
        if (n === stem) set.add(idx);
      });
    }
  });

  return Array.from(set).sort((a, b) => a - b);
}

function buildKoStemByIndex(baseText, candidateIndices, specs) {
  const tokens = koTokenize(baseText);
  const normalized = tokens.map((t) => normalizeKoToken(t));
  const map = {};
  const list = Array.isArray(specs) ? specs : [];

  (Array.isArray(candidateIndices) ? candidateIndices : []).forEach((idx) => {
    if (!Number.isInteger(idx) || idx < 0 || idx >= tokens.length) return;
    const tok = tokens[idx];
    const n = normalized[idx];
    let chosen = "";
    for (let i = 0; i < list.length; i += 1) {
      const stem = normalizeKoToken(list[i]?.stem || "");
      if (!stem) continue;
      if (n === stem || tok.includes(stem)) {
        chosen = stem;
        break;
      }
    }
    if (!chosen && n) chosen = n;
    map[idx] = chosen;
  });
  return map;
}

function shiftOwner(queueMap, normKey) {
  if (!normKey) return null;
  const q = queueMap.get(normKey);
  if (!Array.isArray(q) || !q.length) return null;
  return q.shift();
}

function applyKoMergeResult(fragmentId, resultText, overlapTokens, incomingText) {
  const next = koTokenize(resultText);
  if (!next.length) {
    koState.mergedText = "";
    koState.coloredTokens = [];
    return;
  }

  const prevColored = Array.isArray(koState?.coloredTokens) ? koState.coloredTokens : [];
  if (!prevColored.length) {
    koState.coloredTokens = next.map((t) => ({ text: t, fragId: Number(fragmentId) }));
    koState.mergedText = next.join(" ");
    return;
  }

  const prevQueues = new Map();
  prevColored.forEach((entry) => {
    const key = normalizeKoToken(entry?.text || "");
    if (!key) return;
    if (!prevQueues.has(key)) prevQueues.set(key, []);
    prevQueues.get(key).push(Number.isInteger(entry?.fragId) ? Number(entry.fragId) : Number(fragmentId));
  });

  const incomingCounts = new Map();
  koTokenize(incomingText).forEach((tok) => {
    const key = normalizeKoToken(tok);
    if (!key) return;
    incomingCounts.set(key, (incomingCounts.get(key) || 0) + 1);
  });

  const overlapSet = new Set();
  (Array.isArray(overlapTokens) ? overlapTokens : []).forEach((phrase) => {
    koTokenize(phrase).forEach((tok) => {
      const key = normalizeKoToken(tok);
      if (key) overlapSet.add(key);
    });
  });

  const colored = next.map((tok) => {
    const key = normalizeKoToken(tok);
    let owner = null;

    if (key && overlapSet.has(key)) {
      owner = shiftOwner(prevQueues, key);
    }

    if (owner == null && key && (incomingCounts.get(key) || 0) > 0) {
      owner = Number(fragmentId);
      incomingCounts.set(key, (incomingCounts.get(key) || 0) - 1);
    }

    if (owner == null && key) {
      owner = shiftOwner(prevQueues, key);
    }

    if (owner == null) owner = Number(fragmentId);
    return { text: tok, fragId: owner };
  });

  koState.coloredTokens = colored;
  koState.mergedText = colored.map((x) => x.text).join(" ");
}

function queueKoMergeForFragment(fragmentId, enAnchorWord = "") {
  if (!Array.isArray(koMergePlan) || !koMergePlan.length) return;
  if (koState?.pending) return;
  const q = getCurrentQuestion();

  const stepIdx = Number(koState?.stepIndex || 0);
  const step = koMergePlan[stepIdx];
  if (!step) return;
  if (Number(step.fragId) !== Number(fragmentId)) return;

  const base = compactWhitespace(koState.mergedText || "");
  const overlapTokens = pickKoOverlapTokensForStep(step, enAnchorWord);
  const stemSpecs = buildKoStemSpecs(q, fragmentId, overlapTokens);
  const resultText = compactWhitespace(step.resultText || "");
  const nextText = resultText || mergeKoreanTexts(base, step.fragText, overlapTokens);

  if (!base || !overlapTokens.length) {
    applyKoMergeResult(Number(fragmentId), nextText, overlapTokens, step.fragText || "");
    koState.stepIndex = stepIdx + 1;
    koState.pending = null;
    koCompletedFragIds.add(Number(fragmentId));
    return;
  }

  let candidateIndices = findKoCandidateIndicesFromSpecs(base, stemSpecs);
  if (!candidateIndices.length) {
    candidateIndices = findKoOverlapCandidateIndices(base, overlapTokens);
  }
  if (!candidateIndices.length) {
    const baseTokens = koTokenize(base);
    candidateIndices = baseTokens.length ? [baseTokens.length - 1] : [];
  }
  const stemByIndex = buildKoStemByIndex(base, candidateIndices, stemSpecs);

  koState.pending = {
    fragId: Number(fragmentId),
    candidateIndices,
    stemByIndex,
    overlapTokens: overlapTokens.slice(),
    resultText: nextText,
    incomingText: compactWhitespace(step.fragText || ""),
    enAnchorWord: compactWhitespace(enAnchorWord || ""),
  };
}

function resolveKoPendingMerge(tokenIdx) {
  if (!koState?.pending) return false;
  if (!Number.isInteger(tokenIdx)) return false;

  const allow = new Set(
    (Array.isArray(koState.pending.candidateIndices) ? koState.pending.candidateIndices : [])
      .map((x) => Number(x))
      .filter((x) => Number.isInteger(x))
  );
  if (!allow.has(tokenIdx)) {
    showToast("no", "Pick an overlap token.");
    return false;
  }

  applyKoMergeResult(
    Number(koState.pending.fragId),
    compactWhitespace(koState.pending.resultText || koState.mergedText),
    Array.isArray(koState.pending.overlapTokens) ? koState.pending.overlapTokens : [],
    compactWhitespace(koState.pending.incomingText || "")
  );
  koState.stepIndex = Number(koState.stepIndex || 0) + 1;
  koCompletedFragIds.add(Number(koState.pending.fragId));
  koState.pending = null;
  renderFragments();
  renderKoMergeZone();
  updateQuestionStatus();
  return true;
}

function buildOccupancy(q) {
  const n = q.sentenceTokens.length;
  const occ = Array.from({ length: n }, () => []);

  (q.fragments || []).forEach((f) => {
    const ids = Array.isArray(f.placedRange) ? f.placedRange : [];
    ids.forEach((idx) => {
      if (!Number.isInteger(idx) || idx < 0 || idx >= n) return;
      occ[idx].push(Number(f.id));
    });
  });

  return occ.map((arr) =>
    arr
      .map((x) => Number(x))
      .filter((x) => Number.isInteger(x))
      .sort((a, b) => a - b)
  );
}

function getOverlapSegments(tokens, occupancy) {
  const out = [];
  const n = Math.min(tokens.length, occupancy.length);

  let i = 0;
  while (i < n) {
    const members = occupancy[i];
    if (!members || members.length < 2) {
      i += 1;
      continue;
    }

    const key = members.join(",");
    const start = i;
    i += 1;
    while (i < n) {
      const m = occupancy[i];
      if (!m || m.length < 2 || m.join(",") !== key) break;
      i += 1;
    }
    const end = i - 1;

    out.push({
      start,
      end,
      ids: members.slice(),
      text: tokens.slice(start, end + 1).join(" "),
    });
  }

  return out;
}

function renderFragments() {
  const q = getCurrentQuestion();
  const bank = document.getElementById("fragment-bank");
  const leftStatus = document.getElementById("left-status");
  if (!q || !bank) return;

  const occupancy = buildOccupancy(q);
  const overlapCounts = new Map();
  occupancy.forEach((ids) => {
    if (!ids || ids.length < 2) return;
    ids.forEach((id) => {
      overlapCounts.set(id, (overlapCounts.get(id) || 0) + 1);
    });
  });

  bank.innerHTML = q.fragments
    .map((f) => {
      const c = FRAG_COLORS[f.id % FRAG_COLORS.length];
      const placed = Array.isArray(f.placedRange) && f.placedRange.length > 0;
      const pendingForThis = pendingMerge && Number(pendingMerge.fragId) === Number(f.id);
      const active = !placed && (Number(activeFragmentId) === Number(f.id) || !!pendingForThis);
      const noMatch = !f.candidates.length;
      const overlapHit = (overlapCounts.get(f.id) || 0) > 0;
      const koDone = koCompletedFragIds.has(Number(f.id));

      const classes = ["frag-chip"];
      if (placed) classes.push("placed");
      if (active) classes.push("active");
      if (noMatch) classes.push("nomatch");
      if (overlapHit) classes.push("overlap");
      if (koDone) classes.push("ko-done");

      return `
        <div
          class="${classes.join(" ")}"
          draggable="false"
          data-frag-id="${f.id}"
          style="--frag-color:${c.solid}; --frag-soft:${c.soft}; --frag-border:${c.solid};"
          title="${escapeHtml(f.en)}"
        >
          <div class="frag-en">${escapeHtml(f.en)}</div>
          <div class="frag-ko">${escapeHtml(f.ko || "")}</div>
        </div>
      `;
    })
    .join("");

  if (leftStatus) {
    const done = q.fragments.filter((f) => Array.isArray(f.placedRange) && f.placedRange.length).length;
    leftStatus.textContent = `${done}/${q.fragments.length}`;
  }
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

function pickGradientColorAt(ids, progress) {
  const colors = (ids || [])
    .slice(0, 4)
    .map((id) => mixHex(FRAG_COLORS[id % FRAG_COLORS.length].solid, "#ffffff", 0.16));
  if (!colors.length) return rgbaFromHex("#f6efe5", 0.50);
  if (colors.length === 1) return rgbaFromHex(colors[0], 0.56);

  const p = Math.max(0, Math.min(1, Number(progress)));
  const scaled = p * (colors.length - 1);
  const i = Math.floor(scaled);
  const j = Math.min(colors.length - 1, i + 1);
  const t = scaled - i;
  return rgbaFromHex(mixHex(colors[i], colors[j], t), 0.56);
}

function buildXAxisGradientTokenStyle(ids, pos, total) {
  const den = Math.max(1, (Number(total) || 1) - 1);
  const p0 = Math.max(0, Math.min(1, Number(pos) / den));
  const p1 = Math.max(0, Math.min(1, (Number(pos) + 1) / den));
  const c0 = pickGradientColorAt(ids, p0);
  const c1 = pickGradientColorAt(ids, p1);
  return `background:linear-gradient(90deg, ${c0} 0%, ${c1} 100%); border-color:${mixHex("#7d6048", "#ffffff", 0.06)};`;
}

function buildKoCandidateFontStyle(fragId, pos, total) {
  const idx = ((Number(fragId) % FRAG_COLORS.length) + FRAG_COLORS.length) % FRAG_COLORS.length;
  const solid = FRAG_COLORS[idx]?.solid || "#4b8d68";
  const c0 = mixHex(solid, "#ffffff", 0.06);
  const c1 = mixHex(solid, "#2b1b12", 0.2);
  const den = Math.max(1, (Number(total) || 1) - 1);
  const p0 = Math.max(0, Math.min(1, Number(pos) / den));
  const p1 = Math.max(0, Math.min(1, (Number(pos) + 1) / den));
  const g0 = mixHex(c0, c1, p0);
  const g1 = mixHex(c0, c1, p1);
  return `background-image:linear-gradient(90deg, ${g0} 0%, ${g1} 100%);`;
}

function buildKoOwnerColorStyle(fragId) {
  if (!Number.isInteger(fragId)) return "";
  const idx = ((Number(fragId) % FRAG_COLORS.length) + FRAG_COLORS.length) % FRAG_COLORS.length;
  const solid = FRAG_COLORS[idx]?.solid || "#6a5a4e";
  const fg = mixHex(solid, "#2b1b12", 0.42);
  return `color:${fg};`;
}

function renderKoTokenWithStem(token, stem, useStemHit, hitStyle) {
  const raw = String(token || "");
  if (!useStemHit || !stem) return escapeHtml(raw);

  const s = String(stem || "");
  const at = raw.indexOf(s);
  if (at < 0 || !s) {
    return `<span class="ko-stem-hit" style="${hitStyle}">${escapeHtml(raw)}</span>`;
  }

  const pre = raw.slice(0, at);
  const mid = raw.slice(at, at + s.length);
  const post = raw.slice(at + s.length);
  return `${escapeHtml(pre)}<span class="ko-stem-hit" style="${hitStyle}">${escapeHtml(mid)}</span>${escapeHtml(post)}`;
}

function buildKoAnimMeta(prevTokens, currTokens) {
  const prev = Array.isArray(prevTokens) ? prevTokens : [];
  const curr = Array.isArray(currTokens) ? currTokens : [];
  if (!prev.length || curr.length <= prev.length) {
    return { enterSet: new Set(), pushLeftSet: new Set(), pushRightSet: new Set() };
  }

  const counts = new Map();
  prev.forEach((entry) => {
    const key = `${String(entry?.text || "")}@@${Number(entry?.fragId ?? -1)}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const existing = new Set();
  const enter = [];
  curr.forEach((entry, idx) => {
    const key = `${String(entry?.text || "")}@@${Number(entry?.fragId ?? -1)}`;
    const c = counts.get(key) || 0;
    if (c > 0) {
      counts.set(key, c - 1);
      existing.add(idx);
    } else {
      enter.push(idx);
    }
  });

  if (!enter.length) {
    return { enterSet: new Set(), pushLeftSet: new Set(), pushRightSet: new Set() };
  }

  const pivot = Math.round(enter.reduce((a, b) => a + b, 0) / enter.length);
  const pushLeftSet = new Set();
  const pushRightSet = new Set();
  curr.forEach((_, idx) => {
    if (!existing.has(idx)) return;
    if (idx < pivot) pushLeftSet.add(idx);
    else if (idx > pivot) pushRightSet.add(idx);
  });
  return {
    enterSet: new Set(enter),
    pushLeftSet,
    pushRightSet,
  };
}

function buildOverlapSpanMetaByToken(tokens, occupancy) {
  const map = {};
  const segments = getOverlapSegments(tokens, occupancy);
  segments.forEach((seg, segIdx) => {
    const total = seg.end - seg.start + 1;
    for (let i = seg.start; i <= seg.end; i += 1) {
      map[i] = { segIdx, pos: i - seg.start, total, ids: seg.ids.slice() };
    }
  });
  return map;
}

function pickFragColor(fragId) {
  if (!Number.isInteger(Number(fragId))) return FRAG_COLORS[0];
  const idx = ((Number(fragId) % FRAG_COLORS.length) + FRAG_COLORS.length) % FRAG_COLORS.length;
  return FRAG_COLORS[idx] || FRAG_COLORS[0];
}

function computeTokenUnionBounds(tokenRootEl, attrName, indices, relativeToEl) {
  if (!tokenRootEl || !attrName) return null;
  const list = Array.from(
    new Set(
      (Array.isArray(indices) ? indices : [])
        .map((x) => Number(x))
        .filter((x) => Number.isInteger(x) && x >= 0)
    )
  ).sort((a, b) => a - b);
  if (!list.length) return null;

  const refEl = relativeToEl || tokenRootEl;
  const refRect = refEl.getBoundingClientRect();

  let minLeft = Number.POSITIVE_INFINITY;
  let maxRight = Number.NEGATIVE_INFINITY;
  let minTop = Number.POSITIVE_INFINITY;
  let found = false;

  list.forEach((idx) => {
    const el = tokenRootEl.querySelector(`[${attrName}="${idx}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return;
    found = true;
    minLeft = Math.min(minLeft, r.left - refRect.left);
    maxRight = Math.max(maxRight, r.right - refRect.left);
    minTop = Math.min(minTop, r.top - refRect.top);
  });

  if (!found) return null;
  return {
    centerX: (minLeft + maxRight) / 2,
    top: minTop,
  };
}

function positionHintChip(hintEl, chipSelector, anchor) {
  if (!hintEl || !chipSelector) return;
  const chip = hintEl.querySelector(chipSelector);
  if (!chip) return;

  const hostRect = hintEl.getBoundingClientRect();
  const hostWidth = Math.max(0, hostRect.width || 0);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const x = Number(anchor?.centerX);
  const y = Number(anchor?.top);

  const left = Number.isFinite(x)
    ? clamp(x, 16, Math.max(16, hostWidth - 16))
    : hostWidth * 0.5;
  const top = Number.isFinite(y) ? Math.max(4, y - 2) : 8;

  chip.style.left = `${left}px`;
  chip.style.top = `${top}px`;
}

function renderSentenceAndOverlap() {
  const q = getCurrentQuestion();
  const sentenceWrap = document.getElementById("sentence-wrap");
  const rightStatus = document.getElementById("right-status");
  const mergeHint = document.getElementById("merge-hint");
  if (!q || !sentenceWrap) return;

  const previewSet = new Set(previewRange || []);
  const pendingProposedSet = new Set(Array.isArray(pendingMerge?.proposedRange) ? pendingMerge.proposedRange : []);
  const pendingOverlapSet = new Set(Array.isArray(pendingMerge?.overlapIndices) ? pendingMerge.overlapIndices : []);
  const occupancy = buildOccupancy(q);
  const overlapMetaByToken = buildOverlapSpanMetaByToken(q.sentenceTokens, occupancy);
  const anchorSet = new Set(
    (q.fragments || [])
      .map((f) => Number(f?.anchorIdx))
      .filter((x) => Number.isInteger(x))
  );
  let previewFragId = null;
  if (pendingMerge && Number.isInteger(Number(pendingMerge.fragId))) {
    previewFragId = Number(pendingMerge.fragId);
  } else if (pointerDrag?.active && Number.isInteger(Number(pointerDrag.fragId))) {
    previewFragId = Number(pointerDrag.fragId);
  } else if (Number.isInteger(Number(activeFragmentId))) {
    previewFragId = Number(activeFragmentId);
  }
  const pvColor = pickFragColor(previewFragId).solid;
  const pvBg = mixHex(pvColor, "#ffffff", 0.84);
  const pvRing = mixHex(pvColor, "#ffffff", 0.58);
  const pvOverlay = rgbaFromHex(pvColor, 0.24);
  const pvHalo = rgbaFromHex(pvColor, 0.22);
  sentenceWrap.style.setProperty("--sentence-preview-color", pvColor);
  sentenceWrap.style.setProperty("--sentence-preview-ring", pvRing);

  sentenceWrap.innerHTML = q.sentenceTokens
    .map((tok, idx) => {
      const occ = occupancy[idx] || [];
      const classes = ["tok"];
      const styleParts = [];
      let tip = "";

      if (previewSet.has(idx) || pendingProposedSet.has(idx)) {
        classes.push("preview");
        styleParts.push(`--pv-bd:${pvColor}; --pv-ring:${pvRing}; --pv-bg:${pvBg}; --pv-ov:${pvOverlay}; --pv-halo:${pvHalo};`);
      }
      if (pendingOverlapSet.has(idx)) classes.push("merge-target");
      if (anchorSet.has(idx)) classes.push("anchor-picked");

      if (occ.length === 1) {
        const hasPendingOverlap = !!pendingMerge && pendingOverlapSet.has(idx);
        if (hasPendingOverlap) {
          classes.push("single");
          const incomingColor = pickFragColor(Number(pendingMerge?.fragId)).solid;
          styleParts.push(`--tok-bg:${mixHex(incomingColor, "#ffffff", 0.60)}; --tok-bd:${incomingColor};`);
        } else {
          classes.push("single");
          const c = FRAG_COLORS[occ[0] % FRAG_COLORS.length];
          styleParts.push(`--tok-bg:${mixHex(c.solid, "#ffffff", 0.60)}; --tok-bd:${c.solid};`);
        }
        tip = "";
      } else if (occ.length >= 2) {
        classes.push("overlap");
        const meta = overlapMetaByToken[idx];
        const topFragId = Number(occ[occ.length - 1]);
        const topColor = pickFragColor(topFragId).solid;
        styleParts.push(`--top-frag:${topColor}; z-index:${20 + Math.max(0, topFragId)};`);
        if (meta && Number(meta.total) <= 1) {
          const firstFragId = Number(occ[0]);
          const firstColor = pickFragColor(firstFragId).solid;
          const g0 = rgbaFromHex(mixHex(firstColor, "#ffffff", 0.20), 0.56);
          const g1 = rgbaFromHex(mixHex(topColor, "#ffffff", 0.16), 0.56);
          styleParts.push(
            `background:linear-gradient(90deg, ${g0} 0%, ${g1} 100%); border-color:${topColor};`
          );
        } else if (meta) {
          styleParts.push(buildXAxisGradientTokenStyle(meta.ids, meta.pos, meta.total));
        } else {
          styleParts.push(buildOverlapBackground(occ));
        }
        tip = "";
      }

      const pendingIncoming =
        !!pendingMerge && (pendingProposedSet.has(idx) || pendingOverlapSet.has(idx));
      const pendingOverlap = !!pendingMerge && pendingOverlapSet.has(idx);
      if (pendingIncoming && !pendingOverlap) {
        const backColor = pickFragColor(Number(pendingMerge?.fragId)).solid;
        styleParts.push(
          `--tok-bg:${mixHex(backColor, "#ffffff", 0.60)}; --tok-bd:${backColor}; --mt-stroke:${backColor}; --mt-ring:${mixHex(backColor, "#ffffff", 0.58)};`
        );
      } else if (pendingOverlap) {
        const backColor = pickFragColor(Number(pendingMerge?.fragId)).solid;
        styleParts.push(`--mt-stroke:${backColor}; --mt-ring:${mixHex(backColor, "#ffffff", 0.58)};`);
      }

      return `<span class="${classes.join(" ")}" data-token-idx="${idx}" style="${styleParts.join(" ")}" title="${escapeHtml(tip)}">${escapeHtml(tok)}</span>`;
    })
    .join(" ");

  if (rightStatus) {
    rightStatus.textContent = pendingMerge ? "겹친 단어를 선택하세요" : "";
  }
  if (rightStatus && !pendingMerge && koState?.pending) {
    rightStatus.textContent = "Pick KR overlap token.";
  }
  if (rightStatus && !pendingMerge && !koState?.pending) {
    rightStatus.textContent = "";
  }

  if (mergeHint) {
    if (pendingMerge) {
      const frag = q.fragments.find((f) => Number(f.id) === Number(pendingMerge.fragId));
      const c = FRAG_COLORS[Number(frag?.id || 0) % FRAG_COLORS.length] || FRAG_COLORS[0];
      mergeHint.classList.remove("hidden");
      mergeHint.innerHTML = `
        <span class="merge-chip" style="--merge-chip-bg:${mixHex(c.solid, "#ffffff", 0.72)}; --merge-chip-bd:${c.solid}; --merge-chip-fg:${mixHex(c.solid, "#2b1b12", 0.35)};">
          ${escapeHtml(frag?.en || "Fragment")}
        </span>
      `;
      const targetIndices =
        Array.isArray(pendingMerge?.overlapIndices) && pendingMerge.overlapIndices.length
          ? pendingMerge.overlapIndices
          : (Array.isArray(pendingMerge?.proposedRange) ? pendingMerge.proposedRange : []);
      const anchor = computeTokenUnionBounds(sentenceWrap, "data-token-idx", targetIndices, mergeHint);
      positionHintChip(mergeHint, ".merge-chip", anchor);
    } else {
      mergeHint.classList.add("hidden");
      mergeHint.innerHTML = "";
    }
  }
}

function renderKoMergeZone() {
  const q = getCurrentQuestion();
  const zone = document.getElementById("ko-zone");
  if (!q || !zone) return;

  const coloredTokens =
    Array.isArray(koState?.coloredTokens) && koState.coloredTokens.length
      ? koState.coloredTokens
      : koTokenize(koState?.mergedText || "").map((tok) => ({ text: tok, fragId: null }));
  const pending = koState?.pending || null;
  const candidateSet = new Set(
    (Array.isArray(pending?.candidateIndices) ? pending.candidateIndices : [])
      .map((x) => Number(x))
      .filter((x) => Number.isInteger(x))
  );
  const stemByIndex = pending?.stemByIndex && typeof pending.stemByIndex === "object"
    ? pending.stemByIndex
    : {};
  const candidateList = Array.from(candidateSet).sort((a, b) => a - b);
  const rankMap = new Map(candidateList.map((v, i) => [v, i]));
  const doneCount = Number(koState?.stepIndex || 0);
  const totalCount = Array.isArray(koMergePlan) ? koMergePlan.length : 0;
  const pendingFrag = pending
    ? q.fragments.find((f) => Number(f.id) === Number(pending.fragId))
    : null;
  const colorIdx = ((Number(pendingFrag?.id || 0) % FRAG_COLORS.length) + FRAG_COLORS.length) % FRAG_COLORS.length;
  const color = FRAG_COLORS[colorIdx] || FRAG_COLORS[0];
  const koChipStyle = `--ko-merge-chip-bg:${mixHex(color.solid, "#ffffff", 0.72)}; --ko-merge-chip-bd:${color.solid}; --ko-merge-chip-fg:${mixHex(color.solid, "#2b1b12", 0.35)};`;
  zone.classList.toggle("tap-needed", !!pending);
  if (pending) zone.style.setProperty("--ko-need-color", color.solid);
  else zone.style.removeProperty("--ko-need-color");
  const animMeta = buildKoAnimMeta(koRenderPrevTokens, coloredTokens);

  zone.innerHTML = `
    <div class="ko-merge-hint${pending ? "" : " hidden"}">
      <span class="ko-merge-chip" style="${koChipStyle}">
        ${escapeHtml(pendingFrag?.ko || pending?.incomingText || "")}
      </span>
    </div>
    <div class="ko-head">
      <div class="ko-title">KR Merge</div>
      <div class="ko-status">${doneCount}/${totalCount}</div>
    </div>
    <div class="ko-merged">
      ${
        coloredTokens.length
          ? coloredTokens
              .map((entry, idx) => {
                const classes = ["ko-token"];
                const styleParts = [];
                if (animMeta.enterSet.has(idx)) classes.push("enter");
                else if (animMeta.pushLeftSet.has(idx)) classes.push("push-left");
                else if (animMeta.pushRightSet.has(idx)) classes.push("push-right");
                styleParts.push(buildKoOwnerColorStyle(Number(entry?.fragId)));
                let inner = escapeHtml(entry?.text || "");
                if (candidateSet.has(idx)) classes.push("candidate");
                if (candidateSet.has(idx)) {
                  const rank = Number(rankMap.get(idx) ?? 0);
                  const hitStyle = buildKoCandidateFontStyle(Number(pending?.fragId ?? 0), rank, candidateList.length || 1);
                  inner = renderKoTokenWithStem(
                    String(entry?.text || ""),
                    String(stemByIndex[idx] || ""),
                    true,
                    hitStyle
                  );
                }
                return `<span class="${classes.join(" ")}" data-ko-token-idx="${idx}" style="${styleParts.join(" ")}">${inner}</span>`;
              })
              .join(" ")
          : `<span class="ko-placeholder">Place a fragment above.</span>`
      }
    </div>
  `;
  const koHint = zone.querySelector(".ko-merge-hint");
  if (pending && koHint) {
    const anchor = computeTokenUnionBounds(
      zone,
      "data-ko-token-idx",
      Array.isArray(pending?.candidateIndices) ? pending.candidateIndices : [],
      koHint
    );
    positionHintChip(koHint, ".ko-merge-chip", anchor);
  }
  koRenderPrevTokens = coloredTokens.map((entry) => ({
    text: String(entry?.text || ""),
    fragId: Number.isInteger(entry?.fragId) ? Number(entry.fragId) : null,
  }));
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
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
