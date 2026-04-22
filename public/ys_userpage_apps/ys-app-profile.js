(function () {
  var registry = window.YSUserApps = window.YSUserApps || {};

  registry.profile = {
    render: function (ctx) {
      var queryPairs = Array.from(ctx.routeUrl.searchParams.entries());
      var queryItems = queryPairs.length
        ? queryPairs.map(function (pair) {
            return '<li class="app-list-item"><strong>' +
              ctx.escapeHtml(pair[0]) +
              "</strong> = " +
              ctx.escapeHtml(pair[1]) +
              "</li>";
          }).join("")
        : '<li class="app-list-item">No query pairs were provided.</li>';

      ctx.setSubtitle("Route details and copy actions");

      ctx.root.innerHTML = [
        '<div class="app-pane">',
        '<section class="app-hero">',
        '<div class="app-hero-badge">ID</div>',
        "<h2>Route Profile</h2>",
        "<p>This popup reads the same address that opened YS_userpage1.html, so every app can reuse the same query string or hash when launching another page.</p>",
        "</section>",
        '<section class="metric-grid">',
        '<article class="metric-card"><span>User ID</span><strong>' + ctx.escapeHtml(ctx.userId) + "</strong></article>",
        '<article class="metric-card"><span>Path</span><strong>' + ctx.escapeHtml(ctx.routeUrl.pathname.split("/").pop() || "YS_userpage1.html") + "</strong></article>",
        '<article class="metric-card"><span>Hash</span><strong>' + ctx.escapeHtml(ctx.routeUrl.hash || "(none)") + "</strong></article>",
        "</section>",
        '<section class="app-grid-2">',
        '<article class="app-card">',
        "<h3>Query Pairs</h3>",
        '<ul class="app-list">' + queryItems + "</ul>",
        "</article>",
        '<article class="app-card">',
        "<h3>Actions</h3>",
        "<p>Copy the current route or close the popup. These controls stay inside this module only.</p>",
        '<div class="app-actions">',
        '<button class="app-btn" type="button" data-action="copy-url">Copy full URL</button>',
        '<button class="app-btn app-btn--ghost" type="button" data-action="copy-query">Copy query</button>',
        '<button class="app-btn app-btn--ghost" type="button" data-action="close">Close popup</button>',
        "</div>",
        '<p class="app-status" id="profile-status">Ready.</p>',
        "</article>",
        "</section>",
        "</div>"
      ].join("");

      var statusEl = ctx.root.querySelector("#profile-status");

      function setStatus(text) {
        if (statusEl) {
          statusEl.textContent = text;
        }
      }

      function onClick(event) {
        var trigger = event.target.closest("[data-action]");
        if (!trigger) {
          return;
        }

        var action = trigger.getAttribute("data-action");
        if (action === "copy-url") {
          ctx.copyText(ctx.routeUrl.toString())
            .then(function () {
              setStatus("Full URL copied.");
            })
            .catch(function () {
              setStatus("Copy failed.");
            });
          return;
        }

        if (action === "copy-query") {
          ctx.copyText(ctx.routeUrl.search || "")
            .then(function () {
              setStatus("Query string copied.");
            })
            .catch(function () {
              setStatus("Copy failed.");
            });
          return;
        }

        if (action === "close") {
          ctx.close();
        }
      }

      ctx.root.addEventListener("click", onClick);

      return function cleanup() {
        ctx.root.removeEventListener("click", onClick);
      };
    }
  };
})();
