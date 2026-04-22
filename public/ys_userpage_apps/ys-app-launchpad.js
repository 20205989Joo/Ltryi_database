(function () {
  var registry = window.YSUserApps = window.YSUserApps || {};

  registry.launchpad = {
    render: function (ctx) {
      var targets = [
        {
          path: "mock-exam-tool.html",
          title: "Mock Exam Tool",
          note: "Open the wide exam workspace with the same route params."
        },
        {
          path: "pleks/pleks-l1e1.html",
          title: "Pleks Start",
          note: "Continue the main lesson route from this user page."
        },
        {
          path: "alpha_test.html",
          title: "Back To Alpha",
          note: "Return to the redirect entry point without dropping query values."
        }
      ];

      var cards = targets.map(function (target) {
        var url = ctx.buildUrl(target.path).toString();
        return [
          '<article class="app-card">',
          "<h3>" + ctx.escapeHtml(target.title) + "</h3>",
          "<p>" + ctx.escapeHtml(target.note) + "</p>",
          '<div class="app-kv">',
          '<div class="app-kv-row"><span>Target</span><strong>' + ctx.escapeHtml(target.path) + "</strong></div>",
          '<div class="app-kv-row"><span>Preview</span><strong>' + ctx.escapeHtml(url) + "</strong></div>",
          "</div>",
          '<div class="app-actions">',
          '<button class="app-btn" type="button" data-open-path="' + ctx.escapeHtml(target.path) + '">Open page</button>',
          "</div>",
          "</article>"
        ].join("");
      }).join("");

      ctx.setSubtitle("Popup shortcuts that preserve current params");

      ctx.root.innerHTML = [
        '<div class="app-pane">',
        '<section class="app-hero">',
        '<div class="app-hero-badge">GO</div>',
        "<h2>Launchpad</h2>",
        "<p>Each button below leaves the popup and navigates to another page while keeping the current query string and hash attached.</p>",
        "</section>",
        '<section class="app-grid-2">' + cards + "</section>",
        '<section class="app-card">',
        "<h3>Current payload</h3>",
        '<div class="app-kv">',
        '<div class="app-kv-row"><span>User ID</span><strong>' + ctx.escapeHtml(ctx.userId) + "</strong></div>",
        '<div class="app-kv-row"><span>Query</span><strong>' + ctx.escapeHtml(ctx.routeUrl.search || "(none)") + "</strong></div>",
        "</div>",
        "</section>",
        "</div>"
      ].join("");

      function onClick(event) {
        var trigger = event.target.closest("[data-open-path]");
        if (!trigger) {
          return;
        }

        var path = trigger.getAttribute("data-open-path");
        if (path) {
          ctx.openPath(path, false);
        }
      }

      ctx.root.addEventListener("click", onClick);

      return function cleanup() {
        ctx.root.removeEventListener("click", onClick);
      };
    }
  };
})();
