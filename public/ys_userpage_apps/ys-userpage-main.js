(function () {
  var routeUrl = new URL(window.location.href);
  var userId = String(routeUrl.searchParams.get("id") || "").trim() || "Guest";
  var appRegistry = window.YSUserApps = window.YSUserApps || {};
  var currentCleanup = null;
  var currentAppId = "";
  var scriptPromises = Object.create(null);

  var apps = {
    "randtrsl-1-1": {
      name: "랜덤번역",
      subtitle: "1-1내신수특랜덤번역",
      script: "ys_userpage_apps/ys-EBSeng-randtrsl-1-1.js"
    },
    "wordtest-1-1": {
      name: "단어 테스트",
      subtitle: "1-1 words scramble / speed quiz",
      script: "ys_userpage_apps/ys-1-1-wordtest.js"
    },
    fragments: {
      name: "fragments",
      subtitle: "Fragments workspace",
      script: "ys_userpage_apps/ys-s-1-fragments.js"
    }
  };

  var elements = {
    modal: document.getElementById("app-modal"),
    modalBody: document.getElementById("app-modal-body"),
    modalTitle: document.getElementById("app-modal-title"),
    modalSubtitle: document.getElementById("app-modal-subtitle"),
    modalClose: document.getElementById("app-modal-close")
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildUrl(path) {
    var targetUrl = new URL(String(path || ""), window.location.href);
    routeUrl.searchParams.forEach(function (value, key) {
      if (!targetUrl.searchParams.has(key)) {
        targetUrl.searchParams.append(key, value);
      }
    });
    if (!targetUrl.hash && routeUrl.hash) {
      targetUrl.hash = routeUrl.hash;
    }
    return targetUrl;
  }

  function openPath(path, useReplace) {
    var targetUrl = buildUrl(path).toString();
    if (useReplace) {
      window.location.replace(targetUrl);
      return;
    }
    window.location.assign(targetUrl);
  }

  function storageKey(suffix) {
    return "ys-userpage:" + userId + ":" + String(suffix || "state");
  }

  function copyText(text) {
    var value = String(text == null ? "" : text);
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value);
    }

    return new Promise(function (resolve, reject) {
      try {
        var area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "readonly");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.focus();
        area.select();
        document.execCommand("copy");
        document.body.removeChild(area);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  function setModalCopy(app) {
    if (!app) {
      elements.modalTitle.textContent = "App";
      elements.modalSubtitle.textContent = "Popup window";
      return;
    }
    elements.modalTitle.textContent = app.name;
    elements.modalSubtitle.textContent = app.subtitle;
  }

  function closeModal() {
    currentAppId = "";

    if (typeof currentCleanup === "function") {
      try {
        currentCleanup();
      } catch (error) {
        console.error("[YS launcher] cleanup error", error);
      }
    }

    currentCleanup = null;
    setModalCopy(null);
    if (elements.modalBody) {
      elements.modalBody.innerHTML = "";
    }
    if (elements.modal) {
      elements.modal.hidden = true;
    }
    document.body.classList.remove("modal-open");
  }

  function ensureScript(src) {
    if (scriptPromises[src]) {
      return scriptPromises[src];
    }

    scriptPromises[src] = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error("Failed to load " + src));
      };
      document.head.appendChild(script);
    });

    return scriptPromises[src];
  }

  function renderLoadState(text) {
    if (!elements.modalBody) {
      return;
    }
    elements.modalBody.innerHTML = '<div class="loading-card">' + escapeHtml(text) + "</div>";
  }

  async function openApp(appId) {
    var app = apps[appId];
    if (!app) {
      return;
    }

    if (currentAppId === appId && elements.modal && !elements.modal.hidden) {
      return;
    }

    if (elements.modal) {
      elements.modal.hidden = false;
    }
    document.body.classList.add("modal-open");
    setModalCopy(app);
    renderLoadState("Loading " + app.name);

    try {
      await ensureScript(app.script);
      if (!appRegistry[appId] || typeof appRegistry[appId].render !== "function") {
        throw new Error("App renderer missing for " + appId);
      }

      if (typeof currentCleanup === "function") {
        try {
          currentCleanup();
        } catch (cleanupError) {
          console.error("[YS launcher] cleanup error", cleanupError);
        }
      }

      currentCleanup = null;
      currentAppId = appId;
      elements.modalBody.innerHTML = "";

      var renderResult = appRegistry[appId].render({
        app: app,
        root: elements.modalBody,
        close: closeModal,
        setSubtitle: function (value) {
          elements.modalSubtitle.textContent = String(value || "");
        },
        buildUrl: buildUrl,
        openPath: openPath,
        routeUrl: routeUrl,
        userId: userId,
        copyText: copyText,
        storageKey: storageKey,
        escapeHtml: escapeHtml
      });

      if (typeof renderResult === "function") {
        currentCleanup = renderResult;
      } else if (renderResult && typeof renderResult.cleanup === "function") {
        currentCleanup = renderResult.cleanup;
      }
    } catch (error) {
      console.error("[YS launcher] failed to open app", error);
      setModalCopy(app);
      renderLoadState("App failed to load");
    }
  }

  function handleLauncherClick(event) {
    var trigger = event.target.closest("[data-app-id]");
    if (!trigger) {
      return;
    }

    var appId = trigger.getAttribute("data-app-id");
    if (appId) {
      openApp(appId);
    }
  }

  function handleModalClick(event) {
    if (!elements.modal || elements.modal.hidden) {
      return;
    }

    if (event.target === elements.modal) {
      closeModal();
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape" && elements.modal && !elements.modal.hidden) {
      closeModal();
    }
  }

  document.addEventListener("click", handleLauncherClick);
  document.addEventListener("keydown", handleKeydown);

  if (elements.modal) {
    elements.modal.addEventListener("click", handleModalClick);
  }
  if (elements.modalClose) {
    elements.modalClose.addEventListener("click", closeModal);
  }
})();
