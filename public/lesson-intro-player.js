(function (global) {
  "use strict";

  const STYLE_ID = "lesson-intro-player-style";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .lip-intro {
        color: #3c2d22;
      }

      .lip-card {
        background:
          radial-gradient(circle at top right, rgba(255, 237, 214, 0.92), transparent 35%),
          linear-gradient(180deg, #fff8ee 0%, #fff2e2 100%);
        border: 1px solid #e8c7a4;
        border-radius: 18px;
        padding: 12px;
        box-shadow: 0 10px 24px rgba(126, 49, 6, 0.08);
      }

      .lip-page-label {
        font-size: 17px;
        font-weight: 900;
        color: #7e3106;
        margin-bottom: 2px;
      }

      .lip-title {
        font-size: 13px;
        font-weight: 900;
        color: rgba(126, 49, 6, 0.72);
        margin-bottom: 8px;
      }

      .lip-progress {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;
      }

      .lip-progress-dots {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .lip-progress-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: rgba(126, 49, 6, 0.16);
        transition:
          transform 180ms ease,
          background-color 180ms ease,
          box-shadow 180ms ease;
      }

      .lip-progress-dot.is-active {
        transform: scale(1.16);
        background: #f17b2a;
        box-shadow: 0 0 0 3px rgba(241, 123, 42, 0.18);
      }

      .lip-progress-label {
        font-size: 12px;
        font-weight: 800;
        color: rgba(126, 49, 6, 0.72);
      }

      .lip-step-shell {
        min-height: 208px;
        transition:
          opacity 220ms ease,
          filter 220ms ease;
        filter: brightness(1);
      }

      .lip-step-shell.is-hidden {
        opacity: 0;
        filter: brightness(1.08);
      }

      .lip-step-card {
        border: 1px solid #ecd4ba;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.82);
        padding: 11px;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
      }

      .lip-step-text {
        margin-bottom: 9px;
      }

      .lip-step-headline {
        font-size: 16px;
        line-height: 1.38;
        font-weight: 900;
        color: #3c2d22;
        word-break: keep-all;
      }

      .lip-inline-word {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 1.45em;
        padding: 0.02em 0.42em;
        border-radius: 999px;
        border: 1px solid transparent;
        vertical-align: -0.08em;
      }

      .lip-inline-word-subject {
        border-color: rgba(57, 140, 92, 0.22);
        background: rgba(226, 247, 232, 0.92);
        color: #225d39;
      }

      .lip-inline-word-verb {
        border-color: rgba(241, 123, 42, 0.22);
        background: rgba(255, 236, 219, 0.92);
        color: #7e3106;
      }

      .lip-inline-s {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 1.02em;
        min-height: 1.02em;
        padding: 0 0.12em;
        border-radius: 999px;
        background: rgba(138, 89, 218, 0.18);
        box-shadow: inset 0 0 0 1px rgba(138, 89, 218, 0.18);
        color: #7a46d6;
        vertical-align: -0.04em;
      }

      .lip-step-body {
        margin-top: 8px;
        font-size: 13px;
        line-height: 1.65;
        color: #5b4c42;
        word-break: keep-all;
      }

      .lip-example {
        border: 1px solid #f0dfcc;
        border-radius: 14px;
        padding: 10px;
        background: linear-gradient(180deg, #fffdfa 0%, #fff7ee 100%);
      }

      .lip-example-label {
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #7e3106;
        margin-bottom: 6px;
      }

      .lip-example-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .lip-example-row:last-child {
        margin-bottom: 0;
      }

      .lip-example-token {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 36px;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 15px;
        font-weight: 900;
        line-height: 1.2;
        border: 1px solid transparent;
        background: #fff;
      }

      .lip-example-token.is-subject {
        border-color: rgba(57, 140, 92, 0.28);
        background: rgba(226, 247, 232, 0.96);
        color: #225d39;
      }

      .lip-example-token.is-verb {
        border-color: rgba(241, 123, 42, 0.24);
        background: rgba(255, 236, 219, 0.96);
        color: #7e3106;
      }

      .lip-example-note {
        margin-top: 6px;
        font-size: 11px;
        line-height: 1.45;
        color: #5b4c42;
        font-weight: 800;
      }

      .lip-word-flow {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      .lip-example-stack {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .lip-marquee-demo {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .lip-marquee-prefix {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }

      .lip-marquee-window {
        position: relative;
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
      }

      .lip-marquee-track {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: max-content;
        animation: lip-marquee-loop 11s linear infinite;
        will-change: transform;
      }

      .lip-rotator-demo {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .lip-rotator-prefix {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }

      .lip-rotator-window {
        position: relative;
        flex: 0 0 168px;
        width: 168px;
        height: 30px;
        overflow: hidden;
      }

      .lip-rotator-item {
        position: absolute;
        inset: 0;
        display: inline-flex;
        align-items: center;
        opacity: 0;
        transform: translateY(4px);
        animation: lip-rotator-fade 5.6s infinite;
        animation-delay: var(--lip-delay, 0s);
        will-change: opacity, transform;
      }

      .lip-fill-demo {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }

      .lip-fill-slot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 86px;
        min-height: 30px;
        padding: 0 10px;
        border-bottom: 2px dashed #d5a22a;
        border-radius: 8px;
        background: #fff8e4;
        color: #7e3106;
        font-weight: 900;
        overflow: hidden;
      }

      .lip-fill-word {
        display: inline-block;
        opacity: 0;
        transform: translateX(-10px);
        clip-path: inset(0 100% 0 0);
        animation: lip-fill-word 2.8s ease-in-out infinite;
        will-change: opacity, transform, clip-path;
      }

      .lip-example-line {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      .lip-example-symbol {
        font-size: 15px;
        font-weight: 900;
        color: rgba(126, 49, 6, 0.56);
      }

      .lip-word-chip-demo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        border: 1px solid transparent;
      }

      .lip-word-chip-demo.is-en {
        border-color: #f1c18e;
        background: #fff;
        color: #7e3106;
      }

      .lip-word-chip-demo.is-ko {
        border-color: #f17b2a;
        background: #fff7ee;
        color: #7e3106;
        box-shadow: 0 0 0 1px rgba(241, 123, 42, 0.16);
      }

      .lip-morph-grid {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        flex-wrap: nowrap;
      }

      .lip-morph-chip {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 1 1 0;
        min-width: 0;
        min-height: 28px;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid #f1c18e;
        background: #fff;
        color: #7e3106;
        overflow: hidden;
      }

      .lip-morph-word {
        position: absolute;
        inset: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 900;
        line-height: 1;
        white-space: nowrap;
        will-change: opacity, transform;
      }

      .lip-morph-word.is-from {
        animation: lip-morph-from 3.6s ease-in-out infinite;
        animation-delay: var(--lip-delay, 0s);
      }

      .lip-morph-word.is-to {
        opacity: 0;
        animation: lip-morph-to 3.6s ease-in-out infinite;
        animation-delay: var(--lip-delay, 0s);
      }

      .lip-sentence-build {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px;
        line-height: 1.8;
      }

      .lip-sentence-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid #f17b2a;
        background: #fff7ee;
        color: #7e3106;
        font-size: 13px;
        font-weight: 900;
        line-height: 1;
      }

      .lip-sentence-link {
        white-space: pre-wrap;
        font-size: 14px;
        font-weight: 800;
        color: #5b4c42;
      }

      .lip-grammar-demo {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 8px;
        align-items: center;
      }

      .lip-grammar-arrow {
        font-size: 16px;
        font-weight: 900;
        color: rgba(126, 49, 6, 0.4);
      }

      .lip-grammar-side {
        min-height: 72px;
        border: 1px solid rgba(233, 199, 167, 0.9);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.92);
        padding: 8px;
      }

      .lip-grammar-side-label {
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(126, 49, 6, 0.72);
        margin-bottom: 7px;
      }

      .lip-grammar-token {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid rgba(57, 140, 92, 0.22);
        background: rgba(226, 247, 232, 0.9);
        color: #225d39;
        font-size: 16px;
        font-weight: 900;
        line-height: 1.1;
      }

      .lip-grammar-side.is-verb .lip-grammar-token {
        border-color: rgba(241, 123, 42, 0.22);
        background: rgba(255, 236, 219, 0.9);
        color: #7e3106;
      }

      .lip-grammar-mark {
        position: relative;
        display: inline-grid;
        align-items: center;
        justify-content: center;
        width: 0.98em;
        height: 0.98em;
        line-height: 1;
        color: #7a46d6;
        background: rgba(138, 89, 218, 0.18);
        box-shadow: inset 0 0 0 1px rgba(138, 89, 218, 0.18);
        border-radius: 999px;
        vertical-align: -0.02em;
      }

      .lip-grammar-mark.is-ring::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: 1.3em;
        height: 1.3em;
        transform: translate(-50%, -50%);
        border: 2px solid #8a59da;
        border-radius: 50%;
        animation: lip-mark-ring 1.8s ease-in-out infinite;
      }

      .lip-grammar-miss {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        margin-left: 4px;
        opacity: 0;
        animation: lip-mark-cross-box 1.8s ease-in-out infinite;
      }

      .lip-grammar-miss::before,
      .lip-grammar-miss::after {
        content: "";
        position: absolute;
        width: 10px;
        height: 0;
        border-top: 1.6px dashed rgba(0, 0, 0, 0.36);
      }

      .lip-grammar-miss::before {
        transform: rotate(45deg);
      }

      .lip-grammar-miss::after {
        transform: rotate(-45deg);
      }

      .lip-example-prompt {
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 12px;
        line-height: 1.65;
        font-size: 14px;
        color: #3c2d22;
        word-break: keep-all;
        white-space: pre-wrap;
      }

      .lip-example-choices {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }

      .lip-example-choice {
        flex: 1 1 0;
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        border: 1px solid #e1b991;
        background: #fff;
        font-size: 14px;
        font-weight: 900;
        color: #7e3106;
      }

      .lip-example-choice.is-correct {
        border-color: #f17b2a;
        background: #fff2df;
        box-shadow: 0 0 0 1px rgba(241, 123, 42, 0.18), 0 8px 16px rgba(241, 123, 42, 0.12);
      }

      .lip-actions {
        display: flex;
        margin-top: 10px;
      }

      .lip-btn {
        width: 100%;
        border: none;
        border-radius: 12px;
        min-height: 44px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 900;
        cursor: pointer;
      }

      .lip-btn-next {
        background: #fff;
        color: #7e3106;
        border: 1px solid #e9c7a7;
      }

      .lip-btn-primary {
        background: #f17b2a;
        color: #fff;
        box-shadow: 0 10px 20px rgba(241, 123, 42, 0.18);
      }

      .lip-btn[hidden] {
        display: none;
      }

      .lip-intro .focus-token {
        background: rgba(136, 84, 208, 0.16);
        border-radius: 6px;
        padding: 0 3px;
        box-shadow: inset 0 0 0 1px rgba(136, 84, 208, 0.24);
        color: #6c3ac7;
        font-weight: 900;
      }

      @keyframes lip-mark-ring {
        0%, 34% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        45%, 100% {
          opacity: 0.06;
          transform: translate(-50%, -50%) scale(0.78);
        }
      }

      @keyframes lip-mark-cross-box {
        0%, 42% {
          opacity: 0;
          transform: scale(0.82);
        }
        52%, 84% {
          opacity: 1;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          transform: scale(0.82);
        }
      }

      @keyframes lip-marquee-loop {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(-50%);
        }
      }

      @keyframes lip-rotator-fade {
        0%, 8% {
          opacity: 0;
          transform: translateY(4px);
        }
        12%, 32% {
          opacity: 1;
          transform: translateY(0);
        }
        38%, 100% {
          opacity: 0;
          transform: translateY(-3px);
        }
      }

      @keyframes lip-fill-word {
        0%, 18% {
          opacity: 0;
          transform: translateX(-10px);
          clip-path: inset(0 100% 0 0);
        }
        32%, 82% {
          opacity: 1;
          transform: translateX(0);
          clip-path: inset(0 0 0 0);
        }
        100% {
          opacity: 0;
          transform: translateX(10px);
          clip-path: inset(0 0 0 0);
        }
      }

      @keyframes lip-morph-from {
        0%, 18% {
          opacity: 1;
          transform: translateY(0);
        }
        28%, 100% {
          opacity: 0;
          transform: translateY(-3px);
        }
      }

      @keyframes lip-morph-to {
        0%, 20% {
          opacity: 0;
          transform: translateY(4px);
        }
        32%, 86% {
          opacity: 1;
          transform: translateY(0);
        }
        100% {
          opacity: 0;
          transform: translateY(-3px);
        }
      }
    `;

    document.head.appendChild(style);
  }

  function normalizeSteps(rawSteps) {
    const steps = Array.isArray(rawSteps) ? rawSteps : [];
    return steps
      .filter((step) => step && typeof step === "object")
      .map((step, index) => ({
        title: String(step.title || `Step ${index + 1}`),
        titleHtml: step.titleHtml ? String(step.titleHtml) : "",
        body: step.body ? String(step.body) : "",
        exampleHtml: step.exampleHtml ? String(step.exampleHtml) : "",
      }));
  }

  function buildProgressDots(count) {
    const total = Math.max(0, Number(count) || 0);
    return Array.from({ length: total }, (_, index) => (
      `<span class="lip-progress-dot" data-lip-progress="${index}"></span>`
    )).join("");
  }

  function buildStepHtml(step, index, total) {
    const titleHtml = step.titleHtml ? String(step.titleHtml) : escapeHtml(step.title);
    const exampleSection = step.exampleHtml
      ? `
        <div class="lip-example">
          <div class="lip-example-label">Example</div>
          ${step.exampleHtml}
        </div>
      `
      : "";

    return `
      <div class="lip-step-card">
        <div class="lip-step-text">
          <div class="lip-step-headline">${titleHtml}</div>
          ${step.body ? `<div class="lip-step-body">${escapeHtml(step.body)}</div>` : ""}
        </div>
        ${exampleSection}
      </div>
    `;
  }

  function render(container, config) {
    if (!container || !config) return false;

    ensureStyles();

    if (typeof container.__lessonIntroCleanup === "function") {
      container.__lessonIntroCleanup();
      container.__lessonIntroCleanup = null;
    }

    const steps = normalizeSteps(config.steps);
    if (!steps.length) return false;

    const pageLabel = String(config.pageLabel || config.title || "Lesson");
    const title = config.title ? String(config.title) : "";
    const nextLabel = String(config.nextLabel || "다음");
    const primaryLabel = String(config.primaryLabel || "시작");

    container.innerHTML = `
      <div class="lip-intro">
        <div class="lip-card">
          <div class="lip-page-label">${escapeHtml(pageLabel)}</div>
          ${title ? `<div class="lip-title">${escapeHtml(title)}</div>` : ""}

          <div class="lip-progress">
            <div class="lip-progress-dots">${buildProgressDots(steps.length)}</div>
            <div class="lip-progress-label" data-lip-progress-label></div>
          </div>

          <div class="lip-step-shell is-hidden" data-lip-step-shell></div>

          <div class="lip-actions">
            <button class="lip-btn lip-btn-next" type="button" data-lip-action="next">${escapeHtml(nextLabel)}</button>
            <button class="lip-btn lip-btn-primary" type="button" data-lip-action="start" hidden>${escapeHtml(primaryLabel)}</button>
          </div>
        </div>
      </div>
    `;

    const root = container.firstElementChild;
    const stepShell = root?.querySelector("[data-lip-step-shell]");
    const nextBtn = root?.querySelector("[data-lip-action='next']");
    const startBtn = root?.querySelector("[data-lip-action='start']");
    const progressLabel = root?.querySelector("[data-lip-progress-label]");
    const progressDots = Array.from(root?.querySelectorAll("[data-lip-progress]") || []);

    if (!stepShell || !nextBtn || !startBtn || !progressLabel) return false;

    let currentIndex = 0;
    let isTransitioning = false;
    let transitionTimerId = 0;

    function clearTransitionTimer() {
      if (!transitionTimerId) return;
      global.clearTimeout(transitionTimerId);
      transitionTimerId = 0;
    }

    function updateProgress() {
      progressLabel.textContent = `${currentIndex + 1} / ${steps.length}`;
      progressDots.forEach((dot, index) => {
        dot.classList.toggle("is-active", index === currentIndex);
      });
    }

    function updateActions() {
      const isLastStep = currentIndex >= steps.length - 1;
      nextBtn.hidden = isLastStep;
      startBtn.hidden = !isLastStep;
    }

    function renderStep(index) {
      currentIndex = index;
      stepShell.innerHTML = buildStepHtml(steps[index], index, steps.length);
      updateProgress();
      updateActions();
    }

    function finishTransition() {
      global.requestAnimationFrame(() => {
        stepShell.classList.remove("is-hidden");
        isTransitioning = false;
      });
    }

    function goToStep(nextIndex) {
      if (isTransitioning) return;
      if (!Number.isInteger(nextIndex)) return;
      if (nextIndex < 0 || nextIndex >= steps.length || nextIndex === currentIndex) return;

      isTransitioning = true;
      stepShell.classList.add("is-hidden");
      clearTransitionTimer();

      transitionTimerId = global.setTimeout(() => {
        renderStep(nextIndex);
        finishTransition();
      }, 180);
    }

    nextBtn.addEventListener("click", () => {
      goToStep(currentIndex + 1);
    });

    startBtn.addEventListener("click", () => {
      if (typeof config.onPrimary === "function") {
        config.onPrimary();
      }
    });

    renderStep(0);
    finishTransition();

    container.__lessonIntroCleanup = function cleanupLessonIntro() {
      clearTransitionTimer();
      container.__lessonIntroCleanup = null;
    };

    return true;
  }

  global.LessonIntroPlayer = {
    render,
  };
})(window);
