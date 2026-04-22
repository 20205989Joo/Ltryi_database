(function () {
  "use strict";

  const state = {
    hostId: "cafe_int",
    top: 10,
    wrap: null,
    timer: null,
    lastKind: null,
    lastAt: 0,
    cooldown: 320
  };

  function init(options) {
    if (options && typeof options === "object") {
      if (options.hostId) state.hostId = String(options.hostId);
      if (Number.isFinite(options.top)) state.top = Number(options.top);
    }
    ensureUi();
  }

  function setCooldown(ms) {
    const value = Number(ms);
    if (Number.isFinite(value) && value >= 0) {
      state.cooldown = value;
    }
  }

  function getHost() {
    return document.getElementById(state.hostId) || document.body;
  }

  function ensureUi() {
    if (state.wrap) return;

    const host = getHost();
    const style = document.createElement("style");
    style.textContent = `
      .imsi-toast-wrap{
        position:absolute;
        left:50%;
        top:${state.top}px;
        transform:translateX(-50%);
        z-index:9999;
        pointer-events:none;
      }
      .imsi-toast{
        min-width:240px;
        max-width:320px;
        padding:12px 14px;
        border-radius:14px;
        box-shadow:0 10px 30px rgba(0,0,0,0.18);
        color:#fff !important;
        font-weight:900;
        letter-spacing:-0.2px;
        display:flex;
        align-items:center;
        gap:10px;
        opacity:0;
        transform:translateY(-8px) scale(0.98);
        transition:opacity 140ms ease, transform 180ms ease;
        will-change:transform, opacity;
      }
      .imsi-toast.show{ opacity:1; transform:translateY(0) scale(1); }
      .imsi-toast.ok{ background:linear-gradient(180deg, #2e7d32, #1b5e20); }
      .imsi-toast.no{ background:linear-gradient(180deg, #c62828, #8e1b1b); }
      .imsi-toast .badge{
        width:28px;
        height:28px;
        border-radius:999px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        background:rgba(255,255,255,0.22);
        flex:0 0 auto;
        color:#fff !important;
      }
      .imsi-toast .msg{
        font-size:14px;
        line-height:1.2;
        word-break:keep-all;
        color:#fff !important;
      }
      @keyframes ImsiToastShake{
        0%{ transform:translateY(0) translateX(0); }
        25%{ transform:translateY(0) translateX(-6px); }
        50%{ transform:translateY(0) translateX(6px); }
        75%{ transform:translateY(0) translateX(-4px); }
        100%{ transform:translateY(0) translateX(0); }
      }
      .imsi-toast.shake{ animation:ImsiToastShake 260ms ease; }
      .imsi-confetti-layer{
        position:absolute;
        left:0;
        top:0;
        width:100%;
        height:100%;
        pointer-events:none;
        z-index:9998;
        overflow:hidden;
      }
      .imsi-confetti{
        position:absolute;
        width:8px;
        height:10px;
        border-radius:2px;
        opacity:0.95;
        transform:translateY(-10px) rotate(0deg);
        animation:ImsiConfettiFall var(--dur) ease-out forwards;
      }
      @keyframes ImsiConfettiFall{
        0%{ transform:translate(var(--x), -20px) rotate(0deg); opacity:0; }
        10%{ opacity:1; }
        100%{ transform:translate(calc(var(--x) + var(--dx)), 160px) rotate(var(--rot)); opacity:0; }
      }
    `;
    document.head.appendChild(style);

    state.wrap = document.createElement("div");
    state.wrap.className = "imsi-toast-wrap";
    state.wrap.innerHTML = `
      <div class="imsi-toast" id="imsi-toast">
        <div class="badge" id="imsi-toast-badge">🎉</div>
        <div class="msg" id="imsi-toast-msg">정답!</div>
      </div>
    `;
    host.appendChild(state.wrap);

    const layer = document.createElement("div");
    layer.className = "imsi-confetti-layer";
    layer.id = "imsi-confetti-layer";
    host.appendChild(layer);
  }

  function show(kind, message, options) {
    ensureUi();

    const now = Date.now();
    const cooldown = Number.isFinite(options && options.cooldown) ? options.cooldown : state.cooldown;
    if (now - state.lastAt < cooldown && state.lastKind === kind) return;

    state.lastAt = now;
    state.lastKind = kind;

    const toast = document.getElementById("imsi-toast");
    const badge = document.getElementById("imsi-toast-badge");
    const msg = document.getElementById("imsi-toast-msg");
    if (!toast || !badge || !msg) return;

    toast.classList.remove("ok", "no", "shake", "show");
    toast.classList.add(kind === "ok" ? "ok" : "no");

    badge.textContent = kind === "ok" ? "🎉" : "⚠️";
    msg.textContent = message || (kind === "ok" ? "정답!" : "오답…");

    requestAnimationFrame(function () {
      toast.classList.add("show");
      if (kind !== "ok") toast.classList.add("shake");
    });

    clearTimeout(state.timer);
    const duration = Number.isFinite(options && options.duration) ? options.duration : 900;
    state.timer = setTimeout(function () {
      toast.classList.remove("show");
    }, duration);

    const confetti = options && typeof options.confetti === "boolean" ? options.confetti : kind === "ok";
    if (confetti) burstConfetti(options && options.confettiCount);
  }

  function burstConfetti(countOverride) {
    const layer = document.getElementById("imsi-confetti-layer");
    if (!layer) return;

    const host = layer.parentElement;
    const rect = host && typeof host.getBoundingClientRect === "function"
      ? host.getBoundingClientRect()
      : { width: 340, height: 626 };
    const colors = ["#ff6b6b", "#ffd93d", "#6bcB77", "#4d96ff", "#f9a8d4", "#a78bfa"];
    const count = Number.isFinite(countOverride) ? countOverride : 22;

    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement("div");
      particle.className = "imsi-confetti";

      const x = (rect.width * 0.5) + (Math.random() * 120 - 60);
      const dx = (Math.random() * 180 - 90) + "px";
      const rot = (Math.random() * 520 - 260) + "deg";
      const dur = (Math.random() * 280 + 700) + "ms";

      particle.style.left = "0px";
      particle.style.top = "0px";
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.setProperty("--x", x + "px");
      particle.style.setProperty("--dx", dx);
      particle.style.setProperty("--rot", rot);
      particle.style.setProperty("--dur", dur);
      particle.style.width = (Math.floor(Math.random() * 6) + 6) + "px";
      particle.style.height = (Math.floor(Math.random() * 6) + 8) + "px";

      layer.appendChild(particle);
      setTimeout(function () {
        particle.remove();
      }, 1200);
    }
  }

  window.ImsiToastFX = {
    init: init,
    setCooldown: setCooldown,
    show: show,
    burstConfetti: burstConfetti
  };
})();
