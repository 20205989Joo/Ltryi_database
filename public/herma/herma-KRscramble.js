// herma-KRscramble.js
// Reusable Korean scramble UI renderer.

(function () {
  function render(options) {
    const opts = options || {};
    const answerLineEl = opts.answerLineEl;
    const bankAreaEl = opts.bankAreaEl;
    const remainInfoEl = opts.remainInfoEl;
    const state = opts.state || {};
    const selectedTokens = Array.isArray(state.selectedTokens) ? state.selectedTokens : [];
    const bankTokens = Array.isArray(state.bankTokens) ? state.bankTokens : [];
    const isKoLocked = !!state.isKoLocked;
    const onSelectToken = typeof opts.onSelectToken === "function" ? opts.onSelectToken : null;
    const onUnselectLast = typeof opts.onUnselectLast === "function" ? opts.onUnselectLast : null;
    const decorateToken = typeof opts.decorateToken === "function" ? opts.decorateToken : null;
    const rerender = typeof opts.rerender === "function" ? opts.rerender : null;

    if (answerLineEl) {
      answerLineEl.innerHTML = "";

      if (!selectedTokens.length) {
        const hint = document.createElement("span");
        hint.textContent = "(조각을 눌러 순서대로 채우세요 / 마지막 조각을 누르면 되돌아갑니다)";
        hint.style.opacity = ".45";
        hint.style.fontWeight = "900";
        hint.style.color = "#7e3106";
        answerLineEl.appendChild(hint);
      } else {
        selectedTokens.forEach((tok, idx) => {
          const isLast = idx === selectedTokens.length - 1;
          const sp = document.createElement("button");
          sp.type = "button";
          if (tok.html != null) {
            sp.innerHTML = tok.html;
          } else {
            sp.textContent = tok.text;
          }

          sp.style.display = "inline-flex";
          sp.style.alignItems = "center";
          sp.style.justifyContent = "center";
          sp.style.padding = "8px 10px";
          sp.style.borderRadius = "999px";
          sp.style.border = isLast ? "2px solid rgba(241,123,42,0.9)" : "1px solid rgba(0,0,0,0.14)";
          sp.style.background = "#fff";
          sp.style.fontWeight = "900";
          sp.style.fontSize = "13px";
          sp.style.userSelect = "none";
          sp.style.cursor = isKoLocked ? "not-allowed" : (isLast ? "pointer" : "default");
          sp.style.opacity = isKoLocked ? "0.6" : "1";

          if (decorateToken) decorateToken(sp, tok);

          sp.onclick = () => {
            if (isKoLocked || !isLast || !onUnselectLast) return;
            onUnselectLast();
            if (rerender) rerender();
          };

          answerLineEl.appendChild(sp);
        });
      }
    }

    if (bankAreaEl) {
      bankAreaEl.innerHTML = "";
      bankTokens.forEach((tok) => {
        const btn = document.createElement("button");
        btn.type = "button";
        if (tok.html != null) {
          btn.innerHTML = tok.html;
        } else {
          btn.textContent = tok.text;
        }
        btn.disabled = isKoLocked;

        btn.style.display = "inline-flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.padding = "9px 10px";
        btn.style.borderRadius = "999px";
        btn.style.border = "1px solid rgba(0,0,0,0.12)";
        btn.style.background = "#fff";
        btn.style.fontWeight = "900";
        btn.style.fontSize = "14px";
        btn.style.cursor = isKoLocked ? "not-allowed" : "pointer";
        btn.style.userSelect = "none";
        btn.style.margin = "6px 6px 0 0";
        btn.style.opacity = isKoLocked ? "0.35" : "1";

        if (decorateToken) decorateToken(btn, tok);

        btn.onclick = () => {
          if (isKoLocked || !onSelectToken) return;
          onSelectToken(tok);
          if (rerender) rerender();
        };

        bankAreaEl.appendChild(btn);
      });
    }

    if (remainInfoEl) {
      remainInfoEl.textContent = `남은 조각: ${bankTokens.length}개`;
    }
  }

  window.HermaKRScramble = { render };
})();
