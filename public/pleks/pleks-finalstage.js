// ver1.1_26.02.22
(function () {
  "use strict";

  function safeArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function applyGuideText(answerLineEl, selectedTokens, guideHtml) {
    if (!answerLineEl || !guideHtml) return;
    if (safeArray(selectedTokens).length) return;
    var hint = answerLineEl.querySelector("span");
    if (!hint) return;
    hint.style.display = "inline-block";
    hint.style.lineHeight = "1.45";
    hint.innerHTML = String(guideHtml);
  }

  function renderKoreanScramble(opts) {
    var o = opts || {};
    var answerLineEl = o.answerLineEl;
    var bankAreaEl = o.bankAreaEl;
    var remainInfoEl = o.remainInfoEl;
    var selectedTokens = safeArray(o.selectedTokens);
    var bankTokens = safeArray(o.bankTokens);
    var isKoLocked = !!o.isKoLocked;
    var onSelectToken = typeof o.onSelectToken === "function" ? o.onSelectToken : null;
    var onUnselectLast = typeof o.onUnselectLast === "function" ? o.onUnselectLast : null;
    var decorateToken = typeof o.decorateToken === "function" ? o.decorateToken : null;
    var rerender = typeof o.rerender === "function" ? o.rerender : null;
    var guideHtml = o.guideHtml || "";

    if (window.PleksScramble && typeof window.PleksScramble.render === "function") {
      window.PleksScramble.render({
        answerLineEl: answerLineEl,
        bankAreaEl: bankAreaEl,
        remainInfoEl: remainInfoEl,
        state: {
          selectedTokens: selectedTokens,
          bankTokens: bankTokens,
          isKoLocked: isKoLocked
        },
        onSelectToken: onSelectToken,
        onUnselectLast: onUnselectLast,
        decorateToken: decorateToken,
        rerender: rerender
      });
      applyGuideText(answerLineEl, selectedTokens, guideHtml);
      return true;
    }

    return false;
  }

  window.PleksFinalStage = {
    renderKoreanScramble: renderKoreanScramble,
    applyGuideText: applyGuideText
  };
  window.pleksFinalStage = window.PleksFinalStage;
})();



