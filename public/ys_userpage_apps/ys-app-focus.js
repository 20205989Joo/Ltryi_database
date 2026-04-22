(function () {
  var registry = window.YSUserApps = window.YSUserApps || {};

  registry.focus = {
    render: function (ctx) {
      var totalSeconds = 25 * 60;
      var remainingSeconds = totalSeconds;
      var timerId = null;
      var displayEl = null;
      var ringEl = null;
      var statusEl = null;

      ctx.setSubtitle("Lightweight timer popup");

      ctx.root.innerHTML = [
        '<div class="app-pane">',
        '<section class="app-hero">',
        '<div class="app-hero-badge">TM</div>',
        "<h2>Focus Timer</h2>",
        "<p>Use a quick preset and keep the timer running while the popup stays open. Closing the popup clears the interval.</p>",
        "</section>",
        '<section class="timer-face">',
        '<div class="timer-ring" id="focus-ring" style="--timer-progress:0;">',
        '<div class="timer-display">',
        '<strong id="focus-display">25:00</strong>',
        "<span>Focus Window</span>",
        "</div>",
        "</div>",
        '<div class="timer-presets">',
        '<button class="app-btn app-btn--ghost" type="button" data-preset="10">10 min</button>',
        '<button class="app-btn app-btn--ghost" type="button" data-preset="25">25 min</button>',
        '<button class="app-btn app-btn--ghost" type="button" data-preset="45">45 min</button>',
        "</div>",
        '<div class="app-actions">',
        '<button class="app-btn" type="button" data-action="start">Start</button>',
        '<button class="app-btn app-btn--ghost" type="button" data-action="pause">Pause</button>',
        '<button class="app-btn app-btn--danger" type="button" data-action="reset">Reset</button>',
        "</div>",
        '<p class="app-status" id="focus-status">Timer ready for ' + ctx.escapeHtml(ctx.userId) + '.</p>',
        "</section>",
        "</div>"
      ].join("");

      displayEl = ctx.root.querySelector("#focus-display");
      ringEl = ctx.root.querySelector("#focus-ring");
      statusEl = ctx.root.querySelector("#focus-status");

      function formatTime(value) {
        var safeValue = Math.max(0, value);
        var minutes = Math.floor(safeValue / 60);
        var seconds = safeValue % 60;
        return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
      }

      function setStatus(text) {
        if (statusEl) {
          statusEl.textContent = text;
        }
      }

      function updateView() {
        if (displayEl) {
          displayEl.textContent = formatTime(remainingSeconds);
        }

        if (ringEl) {
          var progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;
          ringEl.style.setProperty("--timer-progress", String(Math.max(0, Math.min(100, progress))));
        }
      }

      function stopTimer() {
        if (timerId) {
          window.clearInterval(timerId);
          timerId = null;
        }
      }

      function startTimer() {
        if (timerId) {
          return;
        }

        if (remainingSeconds <= 0) {
          remainingSeconds = totalSeconds;
          updateView();
        }

        setStatus("Timer running.");
        timerId = window.setInterval(function () {
          remainingSeconds -= 1;
          if (remainingSeconds <= 0) {
            remainingSeconds = 0;
            stopTimer();
            setStatus("Timer complete.");
          }
          updateView();
        }, 1000);
      }

      function applyPreset(minutes) {
        stopTimer();
        totalSeconds = minutes * 60;
        remainingSeconds = totalSeconds;
        updateView();
        setStatus("Preset set to " + minutes + " minutes.");
      }

      function onClick(event) {
        var presetTrigger = event.target.closest("[data-preset]");
        if (presetTrigger) {
          var minutes = Number(presetTrigger.getAttribute("data-preset"));
          if (minutes > 0) {
            applyPreset(minutes);
          }
          return;
        }

        var actionTrigger = event.target.closest("[data-action]");
        if (!actionTrigger) {
          return;
        }

        var action = actionTrigger.getAttribute("data-action");
        if (action === "start") {
          startTimer();
          return;
        }
        if (action === "pause") {
          stopTimer();
          setStatus("Timer paused.");
          return;
        }
        if (action === "reset") {
          stopTimer();
          remainingSeconds = totalSeconds;
          updateView();
          setStatus("Timer reset.");
        }
      }

      updateView();
      ctx.root.addEventListener("click", onClick);

      return function cleanup() {
        stopTimer();
        ctx.root.removeEventListener("click", onClick);
      };
    }
  };
})();
