// nav-buttons.js
// Shared navigation helpers for buttons that should preserve `id` query param.
(function (global) {
  "use strict";

  function getCurrentUserId() {
    return new URLSearchParams(global.location.search).get("id");
  }

  function buildUrlWithUserId(path, userId) {
    const basePath = String(path || "student-room.html").trim();
    if (!userId) return basePath;
    return `${basePath}?id=${encodeURIComponent(userId)}`;
  }

  function goTo(path, options) {
    const opts = options || {};
    const replace = opts.replace !== false;
    const userId = opts.userId ?? getCurrentUserId();
    const targetUrl = buildUrlWithUserId(path, userId);
    if (replace) {
      global.location.replace(targetUrl);
      return;
    }
    global.location.href = targetUrl;
  }

  function bindBackToMainHall(buttonOrId, options) {
    const opts = options || {};
    const targetPath = opts.path || "student-room.html";
    const replace = opts.replace !== false;

    const button =
      typeof buttonOrId === "string"
        ? global.document.getElementById(buttonOrId)
        : buttonOrId;
    if (!button) return false;

    button.addEventListener("click", function () {
      goTo(targetPath, { replace });
    });
    return true;
  }

  function autoBindMainHallButtons() {
    const buttons = global.document.querySelectorAll("[data-nav-mainhall]");
    buttons.forEach(function (button) {
      const path = button.getAttribute("data-nav-mainhall") || "student-room.html";
      const replaceRaw = (button.getAttribute("data-nav-replace") || "true").toLowerCase();
      const replace = replaceRaw !== "false";
      bindBackToMainHall(button, { path, replace });
    });
  }

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", autoBindMainHallButtons);
  } else {
    autoBindMainHallButtons();
  }

  global.NavButtons = {
    getCurrentUserId,
    buildUrlWithUserId,
    goTo,
    bindBackToMainHall
  };
})(window);
