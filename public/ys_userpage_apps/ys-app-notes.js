(function () {
  var registry = window.YSUserApps = window.YSUserApps || {};

  registry.notes = {
    render: function (ctx) {
      var noteKey = ctx.storageKey("notes");
      var initialValue = "";

      try {
        initialValue = String(window.localStorage.getItem(noteKey) || "");
      } catch (error) {
        initialValue = "";
      }

      ctx.setSubtitle("Local note pad stored by user id");

      ctx.root.innerHTML = [
        '<div class="app-pane">',
        '<section class="app-hero">',
        '<div class="app-hero-badge">NT</div>',
        "<h2>Notes</h2>",
        "<p>This app stores text in localStorage using the current user id, so each route can keep separate notes inside the browser.</p>",
        "</section>",
        '<section class="app-card">',
        "<h3>Scratch Pad</h3>",
        '<textarea id="notes-area" class="app-textarea" placeholder="Write a note for this route...">' + ctx.escapeHtml(initialValue) + "</textarea>",
        '<div class="app-actions">',
        '<button class="app-btn" type="button" data-action="copy">Copy note</button>',
        '<button class="app-btn app-btn--ghost" type="button" data-action="clear">Clear</button>',
        "</div>",
        '<p class="app-status" id="notes-status">Saved locally for ' + ctx.escapeHtml(ctx.userId) + '.</p>',
        "</section>",
        "</div>"
      ].join("");

      var area = ctx.root.querySelector("#notes-area");
      var statusEl = ctx.root.querySelector("#notes-status");

      function setStatus(text) {
        if (statusEl) {
          statusEl.textContent = text;
        }
      }

      function saveNote() {
        var nextValue = area ? area.value : "";
        try {
          window.localStorage.setItem(noteKey, nextValue);
          setStatus("Saved " + nextValue.length + " chars locally.");
        } catch (error) {
          setStatus("Save failed.");
        }
      }

      function onInput() {
        saveNote();
      }

      function onClick(event) {
        var trigger = event.target.closest("[data-action]");
        if (!trigger) {
          return;
        }

        var action = trigger.getAttribute("data-action");
        if (action === "copy") {
          ctx.copyText(area ? area.value : "")
            .then(function () {
              setStatus("Note copied.");
            })
            .catch(function () {
              setStatus("Copy failed.");
            });
          return;
        }

        if (action === "clear" && area) {
          area.value = "";
          saveNote();
        }
      }

      if (area) {
        area.addEventListener("input", onInput);
      }
      ctx.root.addEventListener("click", onClick);

      return function cleanup() {
        if (area) {
          area.removeEventListener("input", onInput);
        }
        ctx.root.removeEventListener("click", onClick);
      };
    }
  };
})();
