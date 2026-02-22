// ver1.1_26.02.22
// Shared stage templates for Herma relation-clause lessons.
// - Final stage layout (top complete line + bottom KR scramble)
// - Stage transition helper (translate stage open)
// - Shared line builders (preview / final)
(function initHermaStageTemplates(global) {
  if (!global || global.HermaStageTemplates) return;

  function translateBlockHTML() {
    return `
      <div id="translate-block" class="hidden">
        <div class="box" style="margin-bottom:10px;">
          <div class="sentence" id="plain-english-line"></div>
        </div>

        <div class="sentence" id="answer-line" style="
          min-height:86px;
          display:flex;
          flex-wrap:wrap;
          align-items:flex-start;
          gap:6px;
        "></div>

        <div class="box" style="margin-top:10px;">
          <div id="bank-area"></div>
          <div id="remain-info" style="margin-top:8px; font-size:12px; font-weight:900; color:rgba(126,49,6,0.78);"></div>
        </div>
      </div>
    `;
  }

  function openFinalStage(opts) {
    const o = opts || {};
    const abBlockEl = o.abBlockEl || null;
    const afterPassEl = o.afterPassEl || null;
    const instructionBoxEl = o.instructionBoxEl || null;
    const translateBlockEl = o.translateBlockEl || null;
    const collapseRemove = o.collapseRemove || null;

    if (abBlockEl) abBlockEl.classList.add("hidden");
    if (afterPassEl) afterPassEl.classList.add("hidden");

    if (instructionBoxEl) {
      if (typeof collapseRemove === "function") collapseRemove(instructionBoxEl);
      else instructionBoxEl.remove();
    }

    if (translateBlockEl) translateBlockEl.classList.remove("hidden");
  }

  function buildHintPillHTML(escapedHintText) {
    return `<span class="hint-pill">힌트:${String(escapedHintText || "")}</span>`;
  }

  function buildMixedPreviewHTML(opts) {
    const o = opts || {};
    const tokensA = Array.isArray(o.tokensA) ? o.tokensA : [];
    const afterPos = Number(o.afterPos) || 0;
    const struckText = String(o.struckText || "").trim();
    const clauseText = String(o.clauseText || "").trim();
    const escapeHtml = typeof o.escapeHtml === "function" ? o.escapeHtml : ((v) => String(v || ""));

    let out = "";
    let wordPos = 0;
    let inserted = false;

    for (const t of tokensA) {
      if (t && t.isSpace) {
        out += escapeHtml(t.text || "");
        continue;
      }

      wordPos += 1;
      const cls = ["tok", "uA"];
      if (t && t.isPre) cls.push("pre");
      out += `<span class="${cls.join(" ")}">${escapeHtml((t && t.text) || "")}</span>`;

      if (wordPos === afterPos) {
        const sChunk = struckText ? `<span class="mix-strike">${escapeHtml(struckText)}</span>` : "";
        const cChunk = clauseText ? `<span class="mix-rest"><span class="uB">${escapeHtml(clauseText)}</span></span>` : "";
        out += ` <span class="mix-insert">${sChunk}${cChunk}</span> `;
        inserted = true;
      }
    }

    if (!inserted) {
      const sChunk = struckText ? `<span class="mix-strike">${escapeHtml(struckText)}</span>` : "";
      const cChunk = clauseText ? `<span class="mix-rest"><span class="uB">${escapeHtml(clauseText)}</span></span>` : "";
      out += ` <span class="mix-insert">${sChunk}${cChunk}</span>`;
    }

    return out;
  }

  function buildFinalLineHTML(opts) {
    const o = opts || {};
    const tokensA = Array.isArray(o.tokensA) ? o.tokensA : [];
    const afterPos = Number(o.afterPos) || 0;
    const hintText = String(o.hintText || "").trim();
    const clauseText = String(o.clauseText || "").trim();
    const escapeHtml = typeof o.escapeHtml === "function" ? o.escapeHtml : ((v) => String(v || ""));

    let out = "";
    let wordPos = 0;
    let inserted = false;

    for (const t of tokensA) {
      if (t && t.isSpace) {
        out += escapeHtml(t.text || "");
        continue;
      }

      wordPos += 1;
      const cls = ["tok", "uA"];
      if (t && t.isPre) cls.push("pre");
      out += `<span class="${cls.join(" ")}">${escapeHtml((t && t.text) || "")}</span>`;

      if (wordPos === afterPos) {
        const h = hintText ? `<span class="who-gold">${escapeHtml(hintText)}</span>` : "";
        const c = clauseText ? `<span class="uB">${escapeHtml(clauseText)}</span>` : "";
        out += ` ${h} ${c} `;
        inserted = true;
      }
    }

    if (!inserted) {
      const h = hintText ? `<span class="who-gold">${escapeHtml(hintText)}</span>` : "";
      const c = clauseText ? `<span class="uB">${escapeHtml(clauseText)}</span>` : "";
      out += ` ${h} ${c}`;
    }

    return out;
  }

  global.HermaStageTemplates = {
    translateBlockHTML,
    openFinalStage,
    buildHintPillHTML,
    buildMixedPreviewHTML,
    buildFinalLineHTML,
  };
})(window);
