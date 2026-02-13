// pleks-scramble.js
// Generic token scramble renderer.

(function () {
  function render(options) {
    const opts = options || {};
    const answerLineEl = opts.answerLineEl;
    const bankAreaEl = opts.bankAreaEl;
    const remainInfoEl = opts.remainInfoEl;
    const state = opts.state || {};
    const selectedTokens = Array.isArray(state.selectedTokens) ? state.selectedTokens : [];
    const bankTokens = Array.isArray(state.bankTokens) ? state.bankTokens : [];
    const isLocked = !!state.isLocked || !!state.isKoLocked;

    const onSelectToken = typeof opts.onSelectToken === "function" ? opts.onSelectToken : null;
    const onUnselectLast = typeof opts.onUnselectLast === "function" ? opts.onUnselectLast : null;
    const decorateToken = typeof opts.decorateToken === "function" ? opts.decorateToken : null;
    const rerender = typeof opts.rerender === "function" ? opts.rerender : null;

    if (answerLineEl) {
      answerLineEl.innerHTML = "";

      if (!selectedTokens.length) {
        const hint = document.createElement("span");
        hint.textContent = "(블록을 눌러 순서대로 채우세요. 마지막 블록은 다시 누르면 되돌아갑니다.)";
        hint.style.opacity = ".45";
        hint.style.fontWeight = "900";
        hint.style.color = "#7e3106";
        answerLineEl.appendChild(hint);
      } else {
        selectedTokens.forEach((tok, idx) => {
          const isLast = idx === selectedTokens.length - 1;
          const btn = document.createElement("button");
          btn.type = "button";

          if (tok.html != null) {
            btn.innerHTML = tok.html;
          } else {
            btn.textContent = tok.text;
          }

          btn.style.display = "inline-flex";
          btn.style.alignItems = "center";
          btn.style.justifyContent = "center";
          btn.style.padding = "6px 10px";
          btn.style.borderRadius = "999px";
          btn.style.border = isLast ? "2px solid rgba(241,123,42,0.9)" : "1px solid rgba(0,0,0,0.14)";
          btn.style.background = "#fff";
          btn.style.fontWeight = "900";
          btn.style.fontSize = "13px";
          btn.style.userSelect = "none";
          btn.style.cursor = isLocked ? "not-allowed" : (isLast ? "pointer" : "default");
          btn.style.opacity = isLocked ? "0.6" : "1";

          if (decorateToken) decorateToken(btn, tok);

          btn.onclick = () => {
            if (isLocked || !isLast || !onUnselectLast) return;
            onUnselectLast();
            if (rerender) rerender();
          };

          answerLineEl.appendChild(btn);
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

        btn.disabled = isLocked;
        btn.style.display = "inline-flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.padding = "6px 10px";
        btn.style.borderRadius = "999px";
        btn.style.border = "1px solid rgba(0,0,0,0.12)";
        btn.style.background = "#fff";
        btn.style.fontWeight = "900";
        btn.style.fontSize = "14px";
        btn.style.cursor = isLocked ? "not-allowed" : "pointer";
        btn.style.userSelect = "none";
        btn.style.margin = "3px 6px 0 0";
        btn.style.opacity = isLocked ? "0.35" : "1";

        if (decorateToken) decorateToken(btn, tok);

        btn.onclick = () => {
          if (isLocked || !onSelectToken) return;
          onSelectToken(tok);
          if (rerender) rerender();
        };

        bankAreaEl.appendChild(btn);
      });
    }

    if (remainInfoEl) {
      remainInfoEl.textContent = `남은 블록: ${bankTokens.length}개`;
    }
  }

  window.PleksScramble = { render };
})();
