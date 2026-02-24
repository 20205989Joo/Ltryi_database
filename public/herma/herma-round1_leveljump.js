(function () {
  "use strict";

  var FULL_TOUR_STORAGE_KEY = "HermaFullTourState";
  var FLOW_STORAGE_KEY = "HermaRound2FlowMap";
  var FULL_TOUR_SEQUENCE = [
    "l1e1", "l1e2", "l1e3", "l1e4",
    "l2e1", "l2e2", "l2e3", "l2e4",
    "l3e1", "l3e2", "l3e3", "l3e4", "l3e5", "l3e6",
    "l4e1", "l4e2", "l4e3",
    "l5e1", "l5e1b", "l5e2",
    "l6e1", "l6e2", "l6e3", "l6e4", "l6e5"
  ];

  var LESSON_CHOICES = [
    { id: "l1e1", short: "1-1", label: "L1-E1", page: "herma-l1e1.html" },
    { id: "l1e2", short: "1-2", label: "L1-E2", page: "herma-l1e2.html" },
    { id: "l1e3", short: "1-3", label: "L1-E3", page: "herma-l1e3.html" },
    { id: "l1e4", short: "1-4", label: "L1-E4", page: "herma-l1e4.html" },
    { id: "l2e1", short: "2-1", label: "L2-E1", page: "herma-l2e1.html" },
    { id: "l2e2", short: "2-2", label: "L2-E2", page: "herma-l2e2.html" },
    { id: "l2e3", short: "2-3", label: "L2-E3", page: "herma-l2e3.html" },
    { id: "l2e4", short: "2-4", label: "L2-E4", page: "herma-l2e4.html" },
    { id: "l3e1", short: "3-1", label: "L3-E1", page: "herma-l3e1.html" },
    { id: "l3e2", short: "3-2", label: "L3-E2", page: "herma-l3e2.html" },
    { id: "l3e3", short: "3-3", label: "L3-E3", page: "herma-l3e3.html" },
    { id: "l3e4", short: "3-4", label: "L3-E4", page: "herma-l3e4.html" },
    { id: "l3e5", short: "3-5", label: "L3-E5", page: "herma-l3e5.html" },
    { id: "l3e6", short: "3-6", label: "L3-E6", page: "herma-l3e6.html" },
    { id: "l4e1", short: "4-1", label: "L4-E1", page: "herma-l4e1.html" },
    { id: "l4e2", short: "4-2", label: "L4-E2", page: "herma-l4e2.html" },
    { id: "l4e3", short: "4-3", label: "L4-E3", page: "herma-l4e3.html" },
    { id: "l5e1", short: "5-1", label: "L5-E1", page: "herma-l5e1.html" },
    { id: "l5e1b", short: "5-1b", label: "L5-E1B", page: "herma-l5e1b.html" },
    { id: "l5e2", short: "5-2", label: "L5-E2", page: "herma-l5e2.html" },
    { id: "l6e1", short: "6-1", label: "L6-E1", page: "herma-l6e1.html" },
    { id: "l6e2", short: "6-2", label: "L6-E2", page: "herma-l6e2.html" },
    { id: "l6e3", short: "6-3", label: "L6-E3", page: "herma-l6e3.html" },
    { id: "l6e4", short: "6-4", label: "L6-E4", page: "herma-l6e4.html" },
    { id: "l6e5", short: "6-5", label: "L6-E5", page: "herma-l6e5.html" }
  ];

  var state = {
    activeChoiceId: ""
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function readParams() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (_) {
      return new URLSearchParams();
    }
  }

  function groupByLesson(choices) {
    var map = {};
    choices.forEach(function (choice) {
      var m = String(choice.id || "").match(/^l(\d+)e/i);
      var lesson = m ? Number(m[1]) : 0;
      if (!map[lesson]) map[lesson] = [];
      map[lesson].push(choice);
    });

    function parseExerciseOrder(id) {
      var m = String(id || "").match(/^l\d+e(\d+)([a-z]*)$/i);
      if (!m) return { n: 0, suffix: "" };
      return {
        n: Number(m[1]) || 0,
        suffix: String(m[2] || "").toLowerCase()
      };
    }

    return Object.keys(map)
      .map(function (k) { return Number(k); })
      .sort(function (a, b) { return a - b; })
      .map(function (lessonNo) {
        var items = map[lessonNo].slice().sort(function (a, b) {
          var ao = parseExerciseOrder(a.id);
          var bo = parseExerciseOrder(b.id);
          if (ao.n !== bo.n) return ao.n - bo.n;
          return ao.suffix.localeCompare(bo.suffix);
        });
        return { lessonNo: lessonNo, items: items };
      });
  }

  function buildTargetUrl(choice) {
    var target = new URL(choice.page, window.location.href);
    var params = readParams();
    var userId = String(params.get("id") || "").trim();
    if (userId) target.searchParams.set("id", userId);
    target.searchParams.delete("round2");
    target.searchParams.delete("round2Script");
    target.searchParams.delete("fullTour");
    target.searchParams.delete("imsi_qcap");
    target.searchParams.delete("alphaRound2");
    target.searchParams.delete("alphaFrom");
    target.searchParams.delete("dishQuizKey");
    return target.toString();
  }

  function getTourStartIndexBySlug(slug) {
    var s = String(slug || "").trim().toLowerCase();
    if (!s) return -1;
    return FULL_TOUR_SEQUENCE.indexOf(s);
  }

  function safeJsonSetSession(key, value) {
    try {
      sessionStorage.setItem(String(key || ""), JSON.stringify(value || {}));
    } catch (_) {}
  }

  function safeLocalRemove(key) {
    try {
      localStorage.removeItem(String(key || ""));
    } catch (_) {}
  }

  function safeSessionRemove(key) {
    try {
      sessionStorage.removeItem(String(key || ""));
    } catch (_) {}
  }

  function parsePositiveIntOr(raw, fallback) {
    var n = Number(raw);
    if (!isFinite(n) || n <= 0) return Number(fallback || 1);
    return Math.max(1, Math.floor(n));
  }

  function readDefaultTourQCap() {
    try {
      var raw = localStorage.getItem("alphaTourQCap");
      return parsePositiveIntOr(raw, 1);
    } catch (_) {
      return 1;
    }
  }

  function buildTourStartUrl(startSlug) {
    var slug = String(startSlug || "").trim().toLowerCase();
    if (!slug) slug = FULL_TOUR_SEQUENCE[0];
    var target = new URL("herma-" + slug + ".html", window.location.href);
    var params = readParams();
    var userId = String(params.get("id") || "").trim();
    var qcap = readDefaultTourQCap();
    if (userId) target.searchParams.set("id", userId);
    target.searchParams.set("fullTour", "1");
    target.searchParams.set("imsi_qcap", String(qcap));
    target.searchParams.delete("key");
    target.searchParams.delete("round2");
    target.searchParams.delete("round2Script");
    target.searchParams.delete("alphaRound2");
    target.searchParams.delete("alphaFrom");
    target.searchParams.delete("dishQuizKey");
    return target.toString();
  }

  function startTourFromSlug(startSlug) {
    var slug = String(startSlug || "").trim().toLowerCase();
    var startIndex = getTourStartIndexBySlug(slug);
    if (startIndex < 0) {
      slug = FULL_TOUR_SEQUENCE[0];
      startIndex = 0;
    }

    var qcap = readDefaultTourQCap();
    var initialState = {
      active: true,
      mode: "full-tour",
      index: startIndex,
      phase: "learn",
      qcap: qcap,
      startSlug: slug,
      sequence: FULL_TOUR_SEQUENCE.slice(),
      updatedAt: new Date().toISOString()
    };

    safeSessionRemove(FULL_TOUR_STORAGE_KEY);
    safeLocalRemove(FLOW_STORAGE_KEY);
    safeJsonSetSession(FULL_TOUR_STORAGE_KEY, initialState);
    setStatus("Starting Tour " + String(slug).toUpperCase() + "...");
    window.location.assign(buildTourStartUrl(slug));
  }

  function startFullTour() {
    startTourFromSlug(FULL_TOUR_SEQUENCE[0]);
  }

  function setStatus(message) {
    var statusEl = byId("leveljump-status");
    if (!statusEl) return;
    statusEl.textContent = message || "";
  }

  function goToLesson(choice) {
    if (!choice) return;
    state.activeChoiceId = choice.id;
    render();
    startTourFromSlug(choice.id);
  }

  function render() {
    var area = byId("quiz-area");
    if (!area) return;

    var grouped = groupByLesson(LESSON_CHOICES);
    var rowsHtml = grouped.map(function (group) {
      var buttonsHtml = group.items.map(function (choice) {
        var activeClass = state.activeChoiceId === choice.id ? " is-active" : "";
        return [
          '<button type="button" class="hex-btn' + activeClass + '" data-choice-id="' + choice.id + '" title="' + choice.label + '">',
          '  <span class="hex-main">' + choice.short + "</span>",
          "</button>"
        ].join("\n");
      }).join("\n");

      return [
        '<div class="lesson-row">',
        '  <div class="lesson-tag">L' + group.lessonNo + "</div>",
        '  <div class="hex-row">' + buttonsHtml + "</div>",
        "</div>"
      ].join("\n");
    }).join("\n");

    area.innerHTML = [
      '<div class="sheet-box">',
      '  <div class="sheet-head">Round1 Level Jump</div>',
      '  <div class="guide">Select a lesson to start tour.</div>',
      '  <div class="tour-row">',
      '    <button type="button" class="tour-btn" id="full-tour-btn">Full Tour</button>',
      "  </div>",
      '  <div class="lesson-grid">',
      rowsHtml,
      "  </div>",
      '  <div class="status-line" id="leveljump-status">Ready.</div>',
      "</div>"
    ].join("\n");

    Array.from(area.querySelectorAll("[data-choice-id]")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = String(btn.getAttribute("data-choice-id") || "");
        var choice = LESSON_CHOICES.find(function (x) { return x.id === id; });
        goToLesson(choice);
      });
    });

    var fullTourBtn = byId("full-tour-btn");
    if (fullTourBtn) {
      fullTourBtn.addEventListener("click", function () {
        startFullTour();
      });
    }
  }

  function wireBackButton() {
    var backBtn = byId("back-btn");
    if (!backBtn) return;
    backBtn.addEventListener("click", function () {
      window.history.back();
    });
  }

  function start() {
    wireBackButton();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
