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
        "Basic": [1, 50]
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
    }
  };

  // Alias map (legacy/alternate labels -> canonical subcategory)
  const SUBCATEGORY_ALIASES = {
    "기초문법": "문법"
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
      aliases: clone(SUBCATEGORY_ALIASES)
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
    return range ? range.end - range.start + 1 : null;
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

    return warnings;
  }

  const api = {
    version: "2.0.0",

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
