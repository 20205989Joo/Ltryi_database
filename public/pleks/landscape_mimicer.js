// landscape_mimicer.js
// Dev-only helper:
// - Toggle landscape mimic ON/OFF
// - When ON, rotate #cafe_int by 90deg and expand frame to landscape bounds
// - Persist toggle state in localStorage

(function () {
  const STORAGE_KEY = "pleks_landscape_mimicer_on";
  const BTN_ID = "landscape-mimicer-toggle-btn";
  const STYLE_ID = "landscape-mimicer-style";

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .main-page.landscape-mimicer-active {
        width: 375px !important;
        height: 667px !important;
        overflow: hidden !important;
      }

      #cafe_int.landscape-mimicer-active {
        width: 626px !important;
        height: 340px !important;
        transform: translate(-50%, -50%) rotate(90deg) !important;
        transform-origin: center center !important;
      }

      #${BTN_ID} {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 99999;
        border: 1px solid rgba(0, 0, 0, 0.35);
        background: #fff;
        color: #222;
        border-radius: 999px;
        padding: 6px 10px;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        letter-spacing: -0.1px;
      }
    `;
    document.head.appendChild(style);
  }

  function parseQueryFlag() {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("lm");
    if (v === "1" || v === "on" || v === "true") return true;
    if (v === "0" || v === "off" || v === "false") return false;
    return null;
  }

  function readPersisted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch (_) {}
    return null;
  }

  function persist(on) {
    try {
      localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch (_) {}
  }

  function setState(on) {
    const host = document.getElementById("cafe_int");
    if (!host) return;
    const frame = document.querySelector(".main-page");

    host.classList.toggle("landscape-mimicer-active", !!on);
    if (frame) frame.classList.toggle("landscape-mimicer-active", !!on);
    persist(!!on);
    updateButtonText(!!on);
  }

  function currentState() {
    const host = document.getElementById("cafe_int");
    return !!host?.classList.contains("landscape-mimicer-active");
  }

  function toggle() {
    setState(!currentState());
  }

  function updateButtonText(on) {
    const btn = document.getElementById(BTN_ID);
    if (!btn) return;
    btn.textContent = on ? "LM ON" : "LM OFF";
  }

  function ensureToggleButton(initialOn) {
    if (document.getElementById(BTN_ID)) return;

    const btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.title = "Landscape Mimicer Toggle (Shift+L)";
    btn.addEventListener("click", toggle);
    document.body.appendChild(btn);
    updateButtonText(initialOn);
  }

  function bindHotkey() {
    window.addEventListener("keydown", (ev) => {
      if (!ev.shiftKey) return;
      if ((ev.key || "").toLowerCase() !== "l") return;
      ev.preventDefault();
      toggle();
    });
  }

  function boot() {
    injectStyle();

    const q = parseQueryFlag();
    const saved = readPersisted();
    const initialOn = q == null ? (saved == null ? false : saved) : q;

    ensureToggleButton(initialOn);
    setState(initialOn);
    bindHotkey();

    window.LandscapeMimicer = {
      set: (on) => setState(!!on),
      toggle,
      isOn: () => currentState(),
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
