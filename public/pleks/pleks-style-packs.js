// ver1.1_26.02.22
// Shared CSS packs for Pleks lesson runtimes.
// Injects stable, repeated UI styles once and lets each lesson keep its custom overrides.
(function initPleksStylePacks(global) {
  if (!global || global.PleksStylePacks || global.pleksStylePacks) return;

  const injected = new Set();

  const PACKS = {
    core: `
      .hidden{ display:none !important; }

      .controls{ display:flex; gap:8px; margin-top:10px; }
      .mini-btn{
        flex:1;
        padding:10px;
        border-radius:12px;
        border:1px solid rgba(0,0,0,0.12);
        background:#fff;
        font-weight:900;
        cursor:pointer;
      }

      .bank-wrap{
        margin-top:10px;
        padding:10px;
        border-radius:12px;
        border:1px solid rgba(0,0,0,0.08);
        background: rgba(255,255,255,0.75);
      }

      .pill-btn{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        padding:8px 10px;
        border-radius:999px;
        border:1px solid rgba(0,0,0,0.12);
        background:#fff;
        font-weight:800;
        font-size:14px;
        cursor:pointer;
        user-select:none;
        margin:6px 6px 0 0;
      }
      .pill-btn:disabled{ opacity:0.35; cursor:not-allowed; }

      .tok{ cursor:pointer; user-select:none; }
      .tok.faded{
        opacity: 0.22 !important;
        text-decoration: line-through !important;
        filter: blur(0.2px) !important;
      }
      .tok.nope{
        box-shadow: inset 0 0 0 1px rgba(200, 40, 40, 0.22);
        background: rgba(200, 40, 40, 0.05);
      }

      .ab-shell{
        background: var(--boxWarm);
        border: 1px solid #e9c7a7;
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 12px;
        position: relative;
        overflow: visible;
      }
    `,

    insertFlow: `
      .ins-slot{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:22px;
        height:22px;
        border-radius:8px;
        border:1px solid var(--plusBorder);
        background: var(--plusSoft);
        color: var(--plus);
        font-weight:900;
        cursor:pointer;
        margin: 0 4px;
        vertical-align:middle;
        box-shadow: 0 0 0 2px rgba(70,140,255,0.06);
        transition: transform .12s ease, background .12s ease;
      }
      .ins-slot:hover{
        background: var(--plusSoft2);
        transform: translateY(-0.5px);
      }
      .ins-slot.ok{
        background:#e9f7ee;
        border-color:#2e7d32;
        color:#2e7d32;
        box-shadow: 0 0 0 2px rgba(46,125,50,0.10);
      }
      .ins-slot.bad{
        background:rgba(200,40,40,0.10);
        border-color:rgba(200,40,40,0.6);
        color:#c62828;
        box-shadow: 0 0 0 2px rgba(200,40,40,0.08);
      }
      .ins-slot.reveal{
        animation: popIn .25s ease-out both;
      }
      @keyframes popIn{
        from{ transform: scale(0.7); opacity:0; }
        to{ transform: scale(1); opacity:1; }
      }

      .b-collapse{
        transform-origin: center center;
        animation: bCollapse .28s ease-in forwards;
      }
      @keyframes bCollapse{
        0%{ transform: scaleX(1); opacity:1; max-height:200px; margin-top:8px; }
        70%{ transform: scaleX(0.15); opacity:0.2; }
        100%{ transform: scaleX(0.05); opacity:0; max-height:0px; margin-top:0px; }
      }

      #fly-plus{
        position: fixed;
        z-index: 99999;
        width: 26px; height: 26px;
        border-radius: 10px;
        border: 1px solid var(--plusBorder);
        background: var(--plusSoft2);
        color: var(--plus);
        display:flex; align-items:center; justify-content:center;
        font-weight: 900;
        box-shadow: 0 8px 24px rgba(70,140,255,0.25);
        pointer-events: none;
        opacity: 0;
      }
      #fly-plus.show{ opacity: 1; }
    `,
  };

  function ensureOne(name) {
    if (!name || injected.has(name)) return;
    const css = PACKS[name];
    if (!css) return;

    const style = document.createElement("style");
    style.setAttribute("data-pleks-style-pack", name);
    style.textContent = css;
    document.head.appendChild(style);
    injected.add(name);
  }

  function ensure(names) {
    if (!Array.isArray(names)) {
      ensureOne(names);
      return;
    }
    for (const name of names) ensureOne(name);
  }

  global.PleksStylePacks = { ensure };
  global.pleksStylePacks = global.PleksStylePacks;
})(window);


