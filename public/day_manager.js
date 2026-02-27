// day_manager.js
// Single source of truth for:
// - Category/Subcategory metadata
// - English tokens for filename building
// - Storage folder mapping
// - Level range rules for Day <-> LessonNo conversion

(function (global) {
  "use strict";

  // =========================================================
  // 1) EDIT HERE: curriculum metadata
  // =========================================================

  // Category-level metadata
  // - subjectToken: used by filename builder (ex: Vocabulary, Grammar ...)
  // - subcategories: which subcategories belong to this category
  const CATEGORY_DEFINITIONS = {
    "단어": {
      subjectToken: "Vocabulary",
      subcategories: ["단어", "연어"]
    },
    "문법": {
      subjectToken: "Grammar",
      subcategories: ["문법"]
    },
    "구문": {
      subjectToken: "Syntax",
      subcategories: ["단계별 독해"]
    },
    "독해": {
      subjectToken: "Reading",
      subcategories: ["파편의 재구성"]
    },
    "misc": {
      subjectToken: "Misc",
      subcategories: ["공사중"]
    },
    "기타": {
      subjectToken: "Misc",
      subcategories: []
    }
  };

  // Subcategory-level metadata
  // - category: parent category
  // - subcategoryToken: used by filename builder (ex: Words, Pattern ...)
  // - storageFolder: dataset folder name
  // - levels: [startLessonNo, endLessonNo]
  const SUBCATEGORY_DEFINITIONS = {
    "단어": {
      category: "단어",
      subcategoryToken: "Words",
      storageFolder: "words",
      levels: {
        "A1": [1, 45],
        "A2": [46, 89],
        "B1": [90, 130],
        "B2": [131, 201],
        "C1": [202, 266]
      }
    },
    "연어": {
      category: "단어",
      subcategoryToken: "Collocations",
      storageFolder: "words",
      levels: {
        "900핵심연어": [1, 42]
      }
    },
    "문법": {
      category: "문법",
      subcategoryToken: "Grammar",
      storageFolder: "grammar",
      levels: {
        // "Basic": [1, 50],
        "herma": [101, 200],
        "pleks": [301, 317],
        "aisth": [1, 37]
      }
    },
    "단계별 독해": {
      category: "구문",
      subcategoryToken: "Pattern",
      storageFolder: "syntax",
      levels: {
        "RCStepper": [1, 50]
      }
    },
    "파편의 재구성": {
      category: "독해",
      subcategoryToken: "Fragments",
      storageFolder: "fragments",
      levels: {}
    },
    "공사중": {
      category: "misc",
      subcategoryToken: "Words",
      storageFolder: "words",
      levels: {
        "A1": [1, 1]
      }
    }
  };

  // Alias map (legacy/alternate labels -> canonical subcategory)
  const SUBCATEGORY_ALIASES = {
    "기초문법": "문법",
    "Herma": "문법",
    "Pleks": "문법",
    "herma": "문법",
    "pleks": "문법",
    "Aisth": "문법",
    "aisth": "문법"
  };

  // Custom lesson-page routing (for module-style web tests)
  // - subcategory: canonical subcategory
  // - level: level key in SUBCATEGORY_DEFINITIONS[subcategory].levels
  // - path (optional): fixed page path (ex: dish-learn.html)
  // - folder/filePrefix: route = {folder}/{filePrefix}-l{book}e{exercise}.html
  // - episodesPerBook: day 1..N -> 1-1, 1-2 ... (N+1 -> 2-1)
  // - dayPathMap (optional): explicit Day -> page path mapping for irregular modules
  const LESSON_PAGE_DEFINITIONS = {
    "단어": {
      "A1": {
        path: "dish-learn.html",
        startBook: 1,
        startExercise: 1,
        episodesPerBook: 100
      },
      "A2": {
        path: "dish-learn.html",
        startBook: 1,
        startExercise: 1,
        episodesPerBook: 100
      },
      "B1": {
        path: "dish-learn.html",
        startBook: 1,
        startExercise: 1,
        episodesPerBook: 100
      },
      "B2": {
        path: "dish-learn.html",
        startBook: 1,
        startExercise: 1,
        episodesPerBook: 100
      },
      "C1": {
        path: "dish-learn.html",
        startBook: 1,
        startExercise: 1,
        episodesPerBook: 100
      }
    },
    "문법": {
      "herma": {
        folder: "herma",
        filePrefix: "herma",
        startBook: 1,
        startExercise: 1,
        episodesPerBook: 50,
        dayPathMap: {
          1: "herma/herma-l1e1.html",
          2: "herma/herma-l1e2.html",
          3: "herma/herma-l1e3.html",
          4: "herma/herma-l1e4.html",
          5: "herma/herma-l2e1.html",
          6: "herma/herma-l2e2.html",
          7: "herma/herma-l2e3.html",
          8: "herma/herma-l2e4.html",
          9: "herma/herma-l3e1.html",
          10: "herma/herma-l3e2.html",
          11: "herma/herma-l3e3.html",
          12: "herma/herma-l3e4.html",
          13: "herma/herma-l3e5.html",
          14: "herma/herma-l3e6.html",
          15: "herma/herma-l4e1.html",
          16: "herma/herma-l4e2.html",
          17: "herma/herma-l4e3.html",
          18: "herma/herma-l5e1.html",
          19: "herma/herma-l5e2.html",
          20: "herma/herma-l6e1.html",
          21: "herma/herma-l6e2.html",
          22: "herma/herma-l6e3.html",
          23: "herma/herma-l6e4.html",
          24: "herma/herma-l6e5.html"
        }
      },
      "pleks": {
        folder: "pleks",
        filePrefix: "pleks",
        startBook: 1,
        startExercise: 1,
        episodesPerBook: 50,
        dayPathMap: {
          1: "pleks/pleks-l1e1.html",
          2: "pleks/pleks-l1e2.html",
          3: "pleks/pleks-l2e1.html",
          4: "pleks/pleks-l2e2.html",
          5: "pleks/pleks-l2e3.html",
          6: "pleks/pleks-l3e1.html",
          7: "pleks/pleks-l3e2.html",
          8: "pleks/pleks-l3e3.html",
          9: "pleks/pleks-l3e4.html",
          10: "pleks/pleks-l3e4_refactoring.html",
          11: "pleks/pleks-l4e1_refactoring.html",
          12: "pleks/pleks-l4e2_refactoring.html",
          13: "pleks/pleks-l4e3_refactoring.html",
          14: "pleks/pleks-l5e1.html",
          15: "pleks/pleks-l5e2.html",
          16: "pleks/pleks-l5e3.html",
          17: "pleks/pleks-l5e4.html"
        }
      },
      "aisth": {
        folder: "aisth",
        filePrefix: "aisth",
        startBook: 1,
        startExercise: 1,
        episodesPerBook: 50,
        dayPathMap: {
          1: "aisth/aisth-l1e1.html",
          2: "aisth/aisth-l1e2.html",
          3: "aisth/aisth-l1e3.html",
          4: "aisth/aisth-l1e4.html",
          5: "aisth/aisth-l2e1.html",
          6: "aisth/aisth-l2e2.html",
          7: "aisth/aisth-l2e3.html",
          8: "aisth/aisth-l3e1.html",
          9: "aisth/aisth-l3e2.html",
          10: "aisth/aisth-l3e3.html",
          11: "aisth/aisth-l3e4.html",
          12: "aisth/aisth-l3e5.html",
          13: "aisth/aisth-l4e1.html",
          14: "aisth/aisth-l4e2.html",
          15: "aisth/aisth-l4e3.html",
          16: "aisth/aisth-l5e1.html",
          17: "aisth/aisth-l5e2.html",
          18: "aisth/aisth-l5e3.html",
          19: "aisth/aisth-l5e4.html",
          20: "aisth/aisth-l6e1.html",
          21: "aisth/aisth-l6e2.html",
          22: "aisth/aisth-l6e3.html",
          23: "aisth/aisth-l6e4.html",
          24: "aisth/aisth-l6e5.html",
          25: "aisth/aisth-l7e1.html",
          26: "aisth/aisth-l7e2.html",
          27: "aisth/aisth-l7e3.html",
          28: "aisth/aisth-l7e4.html",
          29: "aisth/aisth-l7e5.html",
          30: "aisth/aisth-l8e1.html",
          31: "aisth/aisth-l8e2.html",
          32: "aisth/aisth-l8e3.html",
          33: "aisth/aisth-l8e4.html",
          34: "aisth/aisth-l8e5.html",
          35: "aisth/aisth-l8e6.html",
          36: "aisth/aisth-l8e7.html",
          37: "aisth/aisth-l9e1.html"
        }
      }
    },
    "공사중": {
      "A1": {
        path: "dish-learn.html",
        startBook: 1,
        startExercise: 1,
        episodesPerBook: 1,
        availableDays: [1]
      }
    }
  };

  // =========================================================
  // 2) Internal helpers
  // =========================================================

  function clone(value) {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function isPositiveInt(value) {
    return Number.isInteger(value) && value > 0;
  }

  function normalizeRange(range) {
    if (!Array.isArray(range) || range.length < 2) return null;
    const start = Number(range[0]);
    const end = Number(range[1]);
    if (!isPositiveInt(start) || !isPositiveInt(end) || start > end) return null;
    return { start, end };
  }

  function ensureCategoryExists(category) {
    if (!CATEGORY_DEFINITIONS[category]) {
      CATEGORY_DEFINITIONS[category] = {
        subjectToken: "Misc",
        subcategories: []
      };
    }
  }

  function linkSubcategoryToCategory(category, subcategory) {
    ensureCategoryExists(category);
    const list = CATEGORY_DEFINITIONS[category].subcategories;
    if (!Array.isArray(list)) CATEGORY_DEFINITIONS[category].subcategories = [];
    if (!CATEGORY_DEFINITIONS[category].subcategories.includes(subcategory)) {
      CATEGORY_DEFINITIONS[category].subcategories.push(subcategory);
    }
  }

  function resolveSubcategoryName(subcategory) {
    if (!subcategory) return null;
    if (SUBCATEGORY_DEFINITIONS[subcategory]) return subcategory;
    const aliased = SUBCATEGORY_ALIASES[subcategory];
    if (aliased && SUBCATEGORY_DEFINITIONS[aliased]) return aliased;
    return null;
  }

  function resolveCategoryName(categoryOrSubcategory) {
    if (!categoryOrSubcategory) return null;
    if (CATEGORY_DEFINITIONS[categoryOrSubcategory]) return categoryOrSubcategory;

    const sub = resolveSubcategoryName(categoryOrSubcategory);
    if (!sub) return null;
    return SUBCATEGORY_DEFINITIONS[sub].category || null;
  }

  function getSubcategoryDef(subcategory) {
    const canonical = resolveSubcategoryName(subcategory);
    if (!canonical) return null;
    return { canonical, def: SUBCATEGORY_DEFINITIONS[canonical] };
  }

  function getLevelsMap(subcategory) {
    const info = getSubcategoryDef(subcategory);
    if (!info) return null;
    return info.def.levels || {};
  }

  // =========================================================
  // 3) Mapping APIs (category/subcategory/progress metadata)
  // =========================================================

  function listCategories() {
    return Object.keys(CATEGORY_DEFINITIONS);
  }

  function listSubcategories(category) {
    if (!category) {
      return Object.keys(SUBCATEGORY_DEFINITIONS);
    }
    const canonicalCategory = resolveCategoryName(category);
    if (!canonicalCategory) return [];
    return clone(CATEGORY_DEFINITIONS[canonicalCategory].subcategories || []);
  }

  function listLevels(subcategory) {
    const levels = getLevelsMap(subcategory);
    return levels ? Object.keys(levels) : [];
  }

  function getCategoryBySubcategory(subcategory) {
    const info = getSubcategoryDef(subcategory);
    return info ? info.def.category || null : null;
  }

  function getSubjectToken(categoryOrSubcategory) {
    const category = resolveCategoryName(categoryOrSubcategory);
    return category ? CATEGORY_DEFINITIONS[category].subjectToken || null : null;
  }

  function getSubcategoryToken(subcategory) {
    const info = getSubcategoryDef(subcategory);
    return info ? info.def.subcategoryToken || null : null;
  }

  function getStorageFolder(subcategory) {
    const info = getSubcategoryDef(subcategory);
    return info ? info.def.storageFolder || null : null;
  }

  function getCategoryDefinition(category) {
    const canonical = resolveCategoryName(category);
    if (!canonical || !CATEGORY_DEFINITIONS[canonical]) return null;
    return clone({ name: canonical, ...CATEGORY_DEFINITIONS[canonical] });
  }

  function getSubcategoryDefinition(subcategory) {
    const info = getSubcategoryDef(subcategory);
    if (!info) return null;
    return clone({ name: info.canonical, ...info.def });
  }

  function getConfig() {
    return {
      categories: clone(CATEGORY_DEFINITIONS),
      subcategories: clone(SUBCATEGORY_DEFINITIONS),
      aliases: clone(SUBCATEGORY_ALIASES),
      lessonPages: clone(LESSON_PAGE_DEFINITIONS)
    };
  }

  function normalizeLevelName(level) {
    if (level === null || level === undefined) return null;
    return String(level).trim();
  }

  function getLessonPageDefinition(subcategory, level) {
    const canonicalSub = resolveSubcategoryName(subcategory);
    if (!canonicalSub) return null;

    const levelName = normalizeLevelName(level);
    if (!levelName) return null;

    const defsByLevel = LESSON_PAGE_DEFINITIONS[canonicalSub];
    if (!defsByLevel || typeof defsByLevel !== "object") return null;

    if (defsByLevel[levelName]) {
      return clone({
        subcategory: canonicalSub,
        level: levelName,
        ...defsByLevel[levelName]
      });
    }

    const lowered = levelName.toLowerCase();
    for (const [defLevel, def] of Object.entries(defsByLevel)) {
      if (String(defLevel).toLowerCase() === lowered) {
        return clone({
          subcategory: canonicalSub,
          level: defLevel,
          ...def
        });
      }
    }

    return null;
  }

  function getPositiveIntKeys(obj) {
    if (!obj || typeof obj !== "object") return [];
    const out = [];
    for (const key of Object.keys(obj)) {
      const n = Number(key);
      if (isPositiveInt(n)) out.push(n);
    }
    return out.sort((a, b) => a - b);
  }

  function getLessonPageDayCap(subcategory, level) {
    const def = getLessonPageDefinition(subcategory, level);
    if (!def) return null;

    let cap = null;

    if (Array.isArray(def.availableDays) && def.availableDays.length > 0) {
      const allowed = def.availableDays.map(Number).filter(isPositiveInt);
      if (allowed.length > 0) {
        cap = Math.max(...allowed);
      }
    }

    if (def.dayPathMap && typeof def.dayPathMap === "object") {
      const keys = getPositiveIntKeys(def.dayPathMap);
      if (keys.length > 0) {
        const mapCap = keys[keys.length - 1];
        cap = cap == null ? mapCap : Math.min(cap, mapCap);
      }
    }

    return isPositiveInt(cap) ? cap : null;
  }

  function getLessonPageRoute(subcategory, level, lessonNo) {
    const def = getLessonPageDefinition(subcategory, level);
    if (!def) return null;

    const lesson = Number(lessonNo);
    if (!isPositiveInt(lesson)) return null;

    const canonicalSub = def.subcategory;
    const levelName = def.level;
    const day = getDay(canonicalSub, levelName, lesson);
    if (!isPositiveInt(day)) return null;

    const episodesPerBook = isPositiveInt(def.episodesPerBook) ? def.episodesPerBook : 50;
    const startBook = isPositiveInt(def.startBook) ? def.startBook : 1;
    const startExercise = isPositiveInt(def.startExercise) ? def.startExercise : 1;

    if (Array.isArray(def.availableDays) && def.availableDays.length > 0) {
      const allowed = def.availableDays.map(Number).filter(isPositiveInt);
      if (!allowed.includes(day)) return null;
    }

    const fixedPath = String(def.path || "").trim();
    const explicitDayPathMap =
      def.dayPathMap && typeof def.dayPathMap === "object" ? def.dayPathMap : null;
    const explicitPathRaw = explicitDayPathMap
      ? (explicitDayPathMap[day] || explicitDayPathMap[String(day)] || "")
      : "";

    let book = null;
    let exercise = null;
    let lessonTag = "";
    let path = "";

    if (explicitDayPathMap && Object.keys(explicitDayPathMap).length > 0 && !String(explicitPathRaw || "").trim()) {
      return null;
    }

    if (typeof explicitPathRaw === "string" && explicitPathRaw.trim()) {
      path = explicitPathRaw.trim();

      const m = path.match(/-l(\d+)e(\d+[a-z]?)\.html$/i);
      if (m) {
        const parsedBook = Number(m[1]);
        const exerciseRaw = String(m[2]);
        const parsedExercise = Number(exerciseRaw.replace(/[^0-9]/g, ""));

        if (isPositiveInt(parsedBook)) book = parsedBook;
        if (isPositiveInt(parsedExercise)) exercise = parsedExercise;
        if (isPositiveInt(parsedBook)) lessonTag = `${parsedBook}-${exerciseRaw}`;
      }

      if (!lessonTag) lessonTag = `Day ${day}`;
    } else {
      const dayOffset = day - 1;
      book = startBook + Math.floor(dayOffset / episodesPerBook);
      exercise = startExercise + (dayOffset % episodesPerBook);

      path = fixedPath;
      if (!path) {
        const folder = String(def.folder || "").trim();
        const filePrefix = String(def.filePrefix || "").trim();
        if (!folder || !filePrefix) return null;
        path = `${folder}/${filePrefix}-l${book}e${exercise}.html`;
      }
      lessonTag = `${book}-${exercise}`;
    }

    const subToken = getSubcategoryToken(canonicalSub) || canonicalSub;
    const quizKey = `quiz_${subToken}_${levelName}_Day${day}`;

    return {
      subcategory: canonicalSub,
      level: levelName,
      lessonNo: lesson,
      day,
      book,
      exercise,
      lessonTag,
      path,
      quizKey
    };
  }

  // =========================================================
  // 4) Day/Range APIs (backward-compatible core)
  // =========================================================

  // Snapshot in old format:
  // {
  //   Subcategory: { Level: [start, end], ... },
  //   ...
  // }
  function getRanges() {
    const snapshot = {};
    for (const [subcategory, def] of Object.entries(SUBCATEGORY_DEFINITIONS)) {
      snapshot[subcategory] = clone(def.levels || {});
    }
    return snapshot;
  }

  function getRange(subcategory, level) {
    const levels = getLevelsMap(subcategory);
    if (!levels) return null;
    const normalized = normalizeRange(levels[level]);
    return normalized ? { ...normalized } : null;
  }

  function getTotalDays(subcategory, level) {
    const range = getRange(subcategory, level);
    if (!range) return null;
    const rangeTotal = range.end - range.start + 1;
    const cap = getLessonPageDayCap(subcategory, level);
    if (!isPositiveInt(cap)) return rangeTotal;
    return Math.min(rangeTotal, cap);
  }

  function getDay(subcategory, level, lessonNo) {
    const lesson = Number(lessonNo);
    if (!isPositiveInt(lesson)) return null;
    const range = getRange(subcategory, level);
    if (!range) return null;
    if (lesson < range.start || lesson > range.end) return null;
    return lesson - range.start + 1;
  }

  function getLessonNo(subcategory, level, day) {
    const dayNum = Number(day);
    if (!isPositiveInt(dayNum)) return null;
    const dayCap = getLessonPageDayCap(subcategory, level);
    if (isPositiveInt(dayCap) && dayNum > dayCap) return null;
    const range = getRange(subcategory, level);
    if (!range) return null;
    const lessonNo = range.start + dayNum - 1;
    if (lessonNo > range.end) return null;
    return lessonNo;
  }

  // Infer level when only Subcategory + LessonNo is known.
  // If multiple ranges overlap, first match in object order is returned.
  function inferLevel(subcategory, lessonNo) {
    const lesson = Number(lessonNo);
    if (!isPositiveInt(lesson)) return null;

    const info = getSubcategoryDef(subcategory);
    if (!info) return null;

    for (const [level, rangeRaw] of Object.entries(info.def.levels || {})) {
      const range = normalizeRange(rangeRaw);
      if (!range) continue;
      if (lesson >= range.start && lesson <= range.end) {
        return {
          category: info.def.category || null,
          subcategory: info.canonical,
          level,
          start: range.start,
          end: range.end,
          day: lesson - range.start + 1
        };
      }
    }

    return null;
  }

  // =========================================================
  // 5) Runtime update APIs (optional)
  // =========================================================

  function upsertCategoryDefinition(category, partialDef) {
    if (!category) throw new Error("category is required.");
    const next = partialDef || {};
    const prev = CATEGORY_DEFINITIONS[category] || {};
    CATEGORY_DEFINITIONS[category] = {
      subjectToken: next.subjectToken || prev.subjectToken || "Misc",
      subcategories: clone(next.subcategories || prev.subcategories || [])
    };
    return getCategoryDefinition(category);
  }

  function upsertSubcategoryDefinition(subcategory, partialDef) {
    if (!subcategory) throw new Error("subcategory is required.");

    const prev = SUBCATEGORY_DEFINITIONS[subcategory] || {};
    const next = partialDef || {};

    const category = next.category || prev.category || "기타";
    const subcategoryToken = next.subcategoryToken || prev.subcategoryToken || subcategory;
    const storageFolder = next.storageFolder || prev.storageFolder || "misc";
    const levels = next.levels || prev.levels || {};

    const normalizedLevels = {};
    for (const [level, rangeRaw] of Object.entries(levels)) {
      const normalized = normalizeRange(rangeRaw);
      if (!normalized) {
        throw new Error(`Invalid range for ${subcategory} > ${level}`);
      }
      normalizedLevels[level] = [normalized.start, normalized.end];
    }

    SUBCATEGORY_DEFINITIONS[subcategory] = {
      category,
      subcategoryToken,
      storageFolder,
      levels: normalizedLevels
    };

    linkSubcategoryToCategory(category, subcategory);
    return getSubcategoryDefinition(subcategory);
  }

  function setSubcategoryAlias(alias, canonicalSubcategory) {
    if (!alias) throw new Error("alias is required.");
    if (!canonicalSubcategory) throw new Error("canonicalSubcategory is required.");
    if (!SUBCATEGORY_DEFINITIONS[canonicalSubcategory]) {
      throw new Error(`Unknown canonical subcategory: ${canonicalSubcategory}`);
    }
    SUBCATEGORY_ALIASES[alias] = canonicalSubcategory;
    return true;
  }

  function upsertRange(subcategory, level, start, end) {
    const normalized = normalizeRange([start, end]);
    if (!normalized) {
      throw new Error("Invalid range. start/end must be positive integers and start <= end.");
    }

    if (!SUBCATEGORY_DEFINITIONS[subcategory]) {
      upsertSubcategoryDefinition(subcategory, {
        category: "기타",
        subcategoryToken: subcategory,
        storageFolder: "misc",
        levels: {}
      });
    }

    SUBCATEGORY_DEFINITIONS[subcategory].levels[level] = [normalized.start, normalized.end];
    return getRange(subcategory, level);
  }

  function removeRange(subcategory, level) {
    const info = getSubcategoryDef(subcategory);
    if (!info) return false;
    if (!(level in info.def.levels)) return false;
    delete info.def.levels[level];
    return true;
  }

  // nextRanges format:
  // {
  //   Subcategory: {
  //     Level: [start, end],
  //     ...
  //   },
  //   ...
  // }
  function replaceAllRanges(nextRanges) {
    if (!nextRanges || typeof nextRanges !== "object") {
      throw new Error("replaceAllRanges requires an object.");
    }

    for (const [subcategory, levels] of Object.entries(nextRanges)) {
      if (!SUBCATEGORY_DEFINITIONS[subcategory]) {
        upsertSubcategoryDefinition(subcategory, {
          category: "기타",
          subcategoryToken: subcategory,
          storageFolder: "misc",
          levels: {}
        });
      }

      const normalizedLevels = {};
      for (const [level, raw] of Object.entries(levels || {})) {
        const normalized = normalizeRange(raw);
        if (!normalized) {
          throw new Error(`Invalid range for ${subcategory} > ${level}`);
        }
        normalizedLevels[level] = [normalized.start, normalized.end];
      }

      SUBCATEGORY_DEFINITIONS[subcategory].levels = normalizedLevels;
    }
  }

  function validateConfig() {
    const warnings = [];

    for (const [category, def] of Object.entries(CATEGORY_DEFINITIONS)) {
      const list = def.subcategories || [];
      for (const sub of list) {
        if (!SUBCATEGORY_DEFINITIONS[sub]) {
          warnings.push(`Category "${category}" references unknown subcategory "${sub}"`);
        }
      }
    }

    for (const [subcategory, def] of Object.entries(SUBCATEGORY_DEFINITIONS)) {
      if (!CATEGORY_DEFINITIONS[def.category]) {
        warnings.push(`Subcategory "${subcategory}" uses unknown category "${def.category}"`);
      }
      for (const [level, raw] of Object.entries(def.levels || {})) {
        if (!normalizeRange(raw)) {
          warnings.push(`Invalid range at ${subcategory} > ${level}`);
        }
      }
    }

    for (const [subcategory, defsByLevel] of Object.entries(LESSON_PAGE_DEFINITIONS)) {
      if (!SUBCATEGORY_DEFINITIONS[subcategory]) {
        warnings.push(`Lesson page mapping uses unknown subcategory "${subcategory}"`);
        continue;
      }

      for (const [level, def] of Object.entries(defsByLevel || {})) {
        if (!SUBCATEGORY_DEFINITIONS[subcategory].levels?.[level]) {
          warnings.push(`Lesson page mapping ${subcategory} > ${level} has no level range`);
        }
        if (!def || typeof def !== "object") {
          warnings.push(`Lesson page mapping ${subcategory} > ${level} is invalid`);
          continue;
        }
        const fixedPath = String(def.path || "").trim();
        if (!fixedPath) {
          if (!String(def.folder || "").trim()) {
            warnings.push(`Lesson page mapping ${subcategory} > ${level} missing folder`);
          }
          if (!String(def.filePrefix || "").trim()) {
            warnings.push(`Lesson page mapping ${subcategory} > ${level} missing filePrefix`);
          }
        }
      }
    }

    return warnings;
  }

  const api = {
    version: "2.1.0",

    // Mapping/config getters
    getConfig,
    getCategoryDefinition,
    getSubcategoryDefinition,
    resolveCategoryName,
    resolveSubcategoryName,
    getCategoryBySubcategory,
    getSubjectToken,
    getSubcategoryToken,
    getStorageFolder,
    listCategories,
    listSubcategories,
    listLevels,
    getLessonPageDefinition,
    getLessonPageRoute,

    // Day/range getters
    getRanges,
    getRange,
    getTotalDays,
    getDay,
    getLessonNo,
    inferLevel,

    // Runtime updates
    upsertCategoryDefinition,
    upsertSubcategoryDefinition,
    setSubcategoryAlias,
    upsertRange,
    removeRange,
    replaceAllRanges,

    // Diagnostics
    validateConfig
  };

  global.DayManager = api;
})(window);
