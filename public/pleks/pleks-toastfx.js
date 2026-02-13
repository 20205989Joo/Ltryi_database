/* pleks-toastfx.js
 * Global API: window.PleksToastFX
 * Methods: init, setCooldown, show, burstConfetti
 */

(function () {
  "use strict";

  const state = {
    hostId: "cafe_int",
    top: 10,
    wrap: null,
    timer: null,
    lastKind: null,
    lastAt: 0,
    cooldown: 320,
  };

  function init(opts) {
    if (opts && typeof opts === "object") {
      if (opts.hostId) state.hostId = String(opts.hostId);
      if (Number.isFinite(opts.top)) state.top = Number(opts.top);
    }
    ensureUI();
  }

  function setCooldown(ms) {
    const n = Number(ms);
    if (Number.isFinite(n) && n >= 0) state.cooldown = n;
  }

  function getHost() {
    return document.getElementById(state.hostId)
      || document.querySelector(".main-page")
      || document.body;
  }

  function ensureUI() {
    if (state.wrap) return;

    const host = getHost();

    const st = document.createElement("style");
    st.textContent = `
      .pleks-toast-wrap{
        position:absolute;
        left:50%;
        top:${state.top}px;
        transform:translateX(-50%);
        z-index:9999;
        pointer-events:none;
      }
      .pleks-toast{
        min-width:220px;
        max-width:320px;
        padding:12px 14px;
        border-radius:14px;
        box-shadow:0 10px 30px rgba(0,0,0,0.18);
        color:#fff;
        font-weight:900;
        letter-spacing:-0.2px;
        display:flex;
        align-items:center;
        gap:10px;
        opacity:0;
        transform:translateY(-8px) scale(0.98);
        transition:opacity 140ms ease, transform 180ms ease;
      }
      .pleks-toast.show{ opacity:1; transform:translateY(0) scale(1); }
      .pleks-toast.ok{ background:linear-gradient(180deg, #2e7d32, #1b5e20); }
      .pleks-toast.no{ background:linear-gradient(180deg, #c62828, #8e1b1b); }

      .pleks-toast .badge{
        width:28px;height:28px;border-radius:999px;
        display:inline-flex;align-items:center;justify-content:center;
        background:rgba(255,255,255,0.22);
        flex:0 0 auto;
      }
      .pleks-toast .msg{
        font-size:14px;
        line-height:1.2;
        word-break:keep-all;
      }

      @keyframes pleksShake{
        0%{ transform:translateY(0) translateX(0); }
        25%{ transform:translateY(0) translateX(-6px); }
        50%{ transform:translateY(0) translateX(6px); }
        75%{ transform:translateY(0) translateX(-4px); }
        100%{ transform:translateY(0) translateX(0); }
      }
      .pleks-toast.shake{ animation:pleksShake 260ms ease; }

      .pleks-confetti-layer{
        position:absolute;
        left:0;
        top:0;
        width:100%;
        height:100%;
        pointer-events:none;
        z-index:9998;
        overflow:hidden;
      }
      .pleks-confetti{
        position:absolute;
        width:8px;
        height:10px;
        border-radius:2px;
        opacity:0.95;
        transform:translateY(-10px) rotate(0deg);
        animation:pleksConfettiFall var(--dur) ease-out forwards;
      }
      @keyframes pleksConfettiFall{
        0%{ transform:translate(var(--x), -20px) rotate(0deg); opacity:0; }
        10%{ opacity:1; }
        100%{ transform:translate(calc(var(--x) + var(--dx)), 160px) rotate(var(--rot)); opacity:0; }
      }
    `;
    document.head.appendChild(st);

    state.wrap = document.createElement("div");
    state.wrap.className = "pleks-toast-wrap";
    state.wrap.innerHTML = `
      <div class="pleks-toast" id="pleks-toast">
        <div class="badge" id="pleks-toast-badge">O</div>
        <div class="msg" id="pleks-toast-msg">정답!</div>
      </div>
    `;
    host.appendChild(state.wrap);

    const layer = document.createElement("div");
    layer.className = "pleks-confetti-layer";
    layer.id = "pleks-confetti-layer";
    host.appendChild(layer);
  }

  function show(kind, text, opt) {
    ensureUI();

    const now = Date.now();
    const cooldown = Number.isFinite(opt?.cooldown) ? opt.cooldown : state.cooldown;
    if (now - state.lastAt < cooldown && state.lastKind === kind) return;

    state.lastAt = now;
    state.lastKind = kind;

    const toast = document.getElementById("pleks-toast");
    const badge = document.getElementById("pleks-toast-badge");
    const msg = document.getElementById("pleks-toast-msg");
    if (!toast || !badge || !msg) return;

    toast.classList.remove("ok", "no", "shake", "show");
    toast.classList.add(kind === "ok" ? "ok" : "no");

    badge.textContent = kind === "ok" ? "O" : "X";
    msg.textContent = text || (kind === "ok" ? "정답!" : "오답...");

    requestAnimationFrame(() => {
      toast.classList.add("show");
      if (kind !== "ok") toast.classList.add("shake");
    });

    clearTimeout(state.timer);
    const dur = Number.isFinite(opt?.duration) ? opt.duration : 900;
    state.timer = setTimeout(() => toast.classList.remove("show"), dur);

    const confetti = (opt && typeof opt.confetti === "boolean") ? opt.confetti : (kind === "ok");
    if (confetti) burstConfetti(opt?.confettiCount);
  }

  function burstConfetti(countOverride) {
    const layer = document.getElementById("pleks-confetti-layer");
    if (!layer) return;

    const host = layer.parentElement;
    const rect = host?.getBoundingClientRect?.() || { width: 340, height: 626 };
    const colors = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#f9a8d4", "#a78bfa"];
    const count = Number.isFinite(countOverride) ? countOverride : 22;

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "pleks-confetti";

      const x = (rect.width * 0.5) + (Math.random() * 120 - 60);
      const dx = (Math.random() * 180 - 90) + "px";
      const rot = (Math.random() * 520 - 260) + "deg";
      const dur = (Math.random() * 280 + 700) + "ms";

      p.style.left = "0px";
      p.style.top = "0px";
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.setProperty("--x", x + "px");
      p.style.setProperty("--dx", dx);
      p.style.setProperty("--rot", rot);
      p.style.setProperty("--dur", dur);
      p.style.width = (Math.floor(Math.random() * 6) + 6) + "px";
      p.style.height = (Math.floor(Math.random() * 6) + 8) + "px";

      layer.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }

  window.PleksToastFX = {
    init,
    setCooldown,
    show,
    burstConfetti,
  };
})();
