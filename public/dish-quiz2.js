const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const QUIZ_SIZE = 20;
const TIME_LIMIT_MS = 10000;
const PREFS_KEY = 'DishSpellingQuizPrefs';

const workbookCache = new Map();

let quizArea = null;
let resultPopup = null;
let currentRows = [];
let currentQuestions = [];
let currentResults = [];
let currentIndex = 0;
let currentTimer = null;
let currentPuzzle = null;
let isAnswered = false;
let setupToken = 0;
let currentConfig = {
  level: 'A1',
  day: '',
};

function readPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

function storePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(currentConfig));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseDayNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeAnswer(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ');
}

function clearTimer() {
  if (currentTimer) {
    window.clearTimeout(currentTimer);
    currentTimer = null;
  }
}

function freezeTimerBar() {
  const bar = document.getElementById('timer-bar');
  if (!bar) return;
  const currentWidth = getComputedStyle(bar).width;
  bar.style.transition = 'none';
  bar.style.width = currentWidth;
  bar.style.opacity = '0.85';
}

async function loadWorkbookRows(level) {
  if (workbookCache.has(level)) {
    return workbookCache.get(level);
  }

  const response = await fetch(`${level}.xlsx`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load ${level}.xlsx (${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  workbookCache.set(level, rows);
  return rows;
}

function getAvailableDays(rows) {
  const uniqueDays = new Set();

  rows.forEach(row => {
    const dayNumber = parseDayNumber(row.Day);
    if (dayNumber != null) {
      uniqueDays.add(dayNumber);
    }
  });

  return [...uniqueDays].sort((a, b) => a - b);
}

function closeResultPopup() {
  if (!resultPopup) return;
  resultPopup.style.display = 'none';
  resultPopup.innerHTML = '';
}

function createPuzzle(word) {
  const trimmed = String(word ?? '').trim();
  const layout = [];
  const slotAnswers = [];
  let firstLetterGiven = false;

  Array.from(trimmed).forEach(char => {
    const isLetter = /[A-Za-z]/.test(char);

    if (isLetter && !firstLetterGiven) {
      layout.push({ type: 'fixed', char });
      firstLetterGiven = true;
      return;
    }

    if (isLetter) {
      const slotIndex = slotAnswers.length;
      slotAnswers.push(char);
      layout.push({ type: 'slot', slotIndex });
      return;
    }

    layout.push({ type: 'separator', char });
  });

  const bankItems = shuffle(
    slotAnswers.map((char, index) => ({
      id: index,
      char,
    }))
  );

  return {
    answer: trimmed,
    layout,
    slotAnswers,
    bankItems,
    slotValues: Array(slotAnswers.length).fill(null),
    activeSlotIndex: slotAnswers.length > 0 ? 0 : -1,
  };
}

function getBankItemById(puzzle, itemId) {
  return puzzle.bankItems.find(item => item.id === itemId) || null;
}

function findNextEmptySlotIndex(puzzle, startIndex = 0) {
  for (let i = startIndex; i < puzzle.slotValues.length; i += 1) {
    if (puzzle.slotValues[i] == null) return i;
  }

  for (let i = 0; i < startIndex; i += 1) {
    if (puzzle.slotValues[i] == null) return i;
  }

  return -1;
}

function syncActiveSlot(puzzle) {
  if (!puzzle) return;
  if (!puzzle.slotValues.length) {
    puzzle.activeSlotIndex = -1;
    return;
  }

  if (
    Number.isInteger(puzzle.activeSlotIndex) &&
    puzzle.activeSlotIndex >= 0 &&
    puzzle.slotValues[puzzle.activeSlotIndex] == null
  ) {
    return;
  }

  puzzle.activeSlotIndex = findNextEmptySlotIndex(puzzle, 0);
}

function buildAttemptString(puzzle, emptyPlaceholder = '') {
  return puzzle.layout
    .map(part => {
      if (part.type === 'fixed' || part.type === 'separator') {
        return part.char;
      }

      const itemId = puzzle.slotValues[part.slotIndex];
      const item = itemId == null ? null : getBankItemById(puzzle, itemId);
      return item ? item.char : emptyPlaceholder;
    })
    .join('');
}

function hasAllSlotsFilled(puzzle) {
  return puzzle.slotValues.every(value => value != null);
}

function renderSetupShell() {
  quizArea.innerHTML = `
    <div style="
      background: #fff3e0;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      font-size: 14px;
    ">
      <div style="font-size:18px; font-weight:bold; color:#7e3106; margin-bottom:12px;">Spelling Scramble Quiz</div>
      <ul style="margin-bottom: 14px; padding-left: 20px; line-height: 1.6;">
        <li>Choose a level and day directly.</li>
        <li>The first letter is given for every word.</li>
        <li>Tap the scrambled letters and fill the slots.</li>
      </ul>
      <div class="setup-grid">
        <label class="setup-field">
          Level
          <select id="level-select"></select>
        </label>
        <label class="setup-field">
          Day
          <select id="day-select"></select>
        </label>
      </div>
      <div class="setup-status" id="setup-status">Loading workbook...</div>
      <button class="quiz-btn" style="width: 100%;" id="start-btn" type="button">Start Quiz</button>
    </div>
  `;

  const levelSelect = document.getElementById('level-select');
  levelSelect.innerHTML = LEVELS
    .map(level => `<option value="${level}">${level}</option>`)
    .join('');
  levelSelect.value = currentConfig.level;
}

async function hydrateSetupOptions() {
  renderSetupShell();

  const levelSelect = document.getElementById('level-select');
  const daySelect = document.getElementById('day-select');
  const statusEl = document.getElementById('setup-status');
  const startBtn = document.getElementById('start-btn');

  const applyDays = async preferredDay => {
    const token = ++setupToken;
    startBtn.disabled = true;
    daySelect.disabled = true;
    statusEl.textContent = `Loading ${currentConfig.level}.xlsx...`;

    try {
      const rows = await loadWorkbookRows(currentConfig.level);
      if (token !== setupToken) return;

      currentRows = rows;
      const availableDays = getAvailableDays(rows);

      if (!availableDays.length) {
        currentConfig.day = '';
        daySelect.innerHTML = '<option value="">Unavailable</option>';
        daySelect.disabled = true;
        statusEl.textContent = `${currentConfig.level}.xlsx has no Day data.`;
        return;
      }

      daySelect.innerHTML = availableDays
        .map(dayNumber => `<option value="${dayNumber}">Day ${dayNumber}</option>`)
        .join('');

      const preferred = preferredDay && availableDays.includes(Number(preferredDay))
        ? Number(preferredDay)
        : availableDays[0];

      currentConfig.day = String(preferred);
      daySelect.value = String(preferred);
      daySelect.disabled = false;
      startBtn.disabled = false;
      statusEl.textContent = `${currentConfig.level}.xlsx ready / ${availableDays.length} days`;
      storePrefs();
    } catch (error) {
      console.error(error);
      currentRows = [];
      currentConfig.day = '';
      daySelect.innerHTML = '<option value="">Unavailable</option>';
      daySelect.disabled = true;
      startBtn.disabled = true;
      statusEl.textContent = `Could not load ${currentConfig.level}.xlsx`;
    }
  };

  levelSelect.addEventListener('change', async event => {
    currentConfig.level = event.target.value;
    currentConfig.day = '';
    storePrefs();
    await applyDays('');
  });

  daySelect.addEventListener('change', event => {
    currentConfig.day = event.target.value;
    storePrefs();
  });

  startBtn.addEventListener('click', () => {
    startQuiz().catch(error => {
      console.error(error);
      alert('Failed to start the quiz.');
    });
  });

  await applyDays(currentConfig.day);
}

function buildQuestions(rows, dayNumber) {
  const selectedRows = rows
    .filter(row => parseDayNumber(row.Day) === dayNumber)
    .filter(row => String(row.Word ?? '').trim() && String(row['Korean Meaning'] ?? '').trim());

  return shuffle(selectedRows)
    .slice(0, Math.min(QUIZ_SIZE, selectedRows.length))
    .map(row => ({
      word: String(row.Word).trim(),
      meaning: String(row['Korean Meaning']).trim(),
      partOfSpeech: String(row['Part of Speech'] ?? '').trim(),
    }));
}

async function startQuiz() {
  closeResultPopup();
  clearTimer();

  const dayNumber = Number(currentConfig.day);
  if (!Number.isFinite(dayNumber)) {
    alert('Pick a day first.');
    return;
  }

  const rows = currentRows.length > 0 ? currentRows : await loadWorkbookRows(currentConfig.level);
  const questions = buildQuestions(rows, dayNumber);

  if (!questions.length) {
    alert('No quiz data was found for that day.');
    return;
  }

  currentQuestions = questions;
  currentResults = [];
  currentIndex = 0;
  isAnswered = false;
  renderQuestion();
}

function startTimer() {
  const bar = document.getElementById('timer-bar');
  if (bar) {
    bar.style.transition = 'none';
    bar.style.width = '100%';
    void bar.offsetWidth;
    bar.style.transition = `width ${TIME_LIMIT_MS}ms linear`;
    bar.style.width = '0%';
  }

  currentTimer = window.setTimeout(() => {
    submitCurrentPuzzle(true, false);
  }, TIME_LIMIT_MS);
}

function renderQuestion() {
  clearTimer();

  if (currentIndex >= currentQuestions.length) {
    showResults();
    return;
  }

  isAnswered = false;
  const question = currentQuestions[currentIndex];
  currentPuzzle = createPuzzle(question.word);

  quizArea.innerHTML = `
    <div class="question-top">
      <div>${currentIndex + 1}. ${escapeHtml(currentConfig.level)} / Day ${escapeHtml(currentConfig.day)}</div>
      <div>${currentIndex + 1} / ${currentQuestions.length}</div>
    </div>
    <div class="question-wording">${escapeHtml(question.meaning)}</div>
    <div class="question-note">
      ${question.partOfSpeech ? `${escapeHtml(question.partOfSpeech)} / ` : ''}First letter is fixed.
    </div>
    <div class="timer-track">
      <div id="timer-bar" class="timer-bar"></div>
    </div>
    <div class="scramble-help">Tap a letter below. Tap a filled slot to pull that letter back out.</div>
    <div id="scramble-answer" class="scramble-wrap"></div>
    <div class="bank-label">Scrambled letters</div>
    <div id="scramble-bank" class="bank-grid"></div>
    <button class="quiz-btn" id="check-btn" type="button" style="width: 100%;">Check</button>
    <div class="action-row">
      <button class="quiz-btn secondary" id="reset-btn" type="button">Reset</button>
      <button class="quiz-btn secondary" id="skip-btn" type="button">Skip</button>
    </div>
    <div id="feedback"></div>
  `;

  document.getElementById('scramble-answer')?.addEventListener('click', event => {
    if (isAnswered || !currentPuzzle) return;
    const target = event.target.closest('[data-slot-index]');
    if (!target) return;

    const slotIndex = Number(target.getAttribute('data-slot-index'));
    if (!Number.isInteger(slotIndex)) return;

    if (currentPuzzle.slotValues[slotIndex] != null) {
      currentPuzzle.slotValues[slotIndex] = null;
    }

    currentPuzzle.activeSlotIndex = slotIndex;
    renderPuzzleState();
  });

  document.getElementById('scramble-bank')?.addEventListener('click', event => {
    if (isAnswered || !currentPuzzle) return;
    const target = event.target.closest('[data-bank-id]');
    if (!target) return;

    const itemId = Number(target.getAttribute('data-bank-id'));
    if (!Number.isInteger(itemId)) return;
    if (currentPuzzle.slotValues.includes(itemId)) return;

    syncActiveSlot(currentPuzzle);
    const slotIndex =
      currentPuzzle.activeSlotIndex >= 0
        ? currentPuzzle.activeSlotIndex
        : findNextEmptySlotIndex(currentPuzzle, 0);

    if (slotIndex < 0) return;

    currentPuzzle.slotValues[slotIndex] = itemId;
    currentPuzzle.activeSlotIndex = findNextEmptySlotIndex(currentPuzzle, slotIndex + 1);
    renderPuzzleState();
  });

  document.getElementById('check-btn')?.addEventListener('click', () => {
    submitCurrentPuzzle(false, false);
  });

  document.getElementById('reset-btn')?.addEventListener('click', () => {
    if (isAnswered || !currentPuzzle) return;
    currentPuzzle.slotValues = Array(currentPuzzle.slotAnswers.length).fill(null);
    currentPuzzle.activeSlotIndex = currentPuzzle.slotAnswers.length > 0 ? 0 : -1;
    renderPuzzleState();
  });

  document.getElementById('skip-btn')?.addEventListener('click', () => {
    submitCurrentPuzzle(false, true);
  });

  renderPuzzleState();
  startTimer();
}

function renderPuzzleState() {
  if (!currentPuzzle) return;
  syncActiveSlot(currentPuzzle);

  const answerEl = document.getElementById('scramble-answer');
  const bankEl = document.getElementById('scramble-bank');
  if (!answerEl || !bankEl) return;

  answerEl.innerHTML = currentPuzzle.layout
    .map(part => {
      if (part.type === 'fixed') {
        return `<span class="slot-chip fixed">${escapeHtml(String(part.char).toUpperCase())}</span>`;
      }

      if (part.type === 'separator') {
        return `<span class="slot-chip separator">${escapeHtml(part.char)}</span>`;
      }

      const itemId = currentPuzzle.slotValues[part.slotIndex];
      const item = itemId == null ? null : getBankItemById(currentPuzzle, itemId);
      const isFilled = Boolean(item);
      const classes = ['slot-chip'];
      if (!isFilled) classes.push('empty');
      if (!isFilled && currentPuzzle.activeSlotIndex === part.slotIndex) classes.push('active');

      return `
        <button class="${classes.join(' ')}" type="button" data-slot-index="${part.slotIndex}">
          ${isFilled ? escapeHtml(String(item.char).toUpperCase()) : '&nbsp;'}
        </button>
      `;
    })
    .join('');

  bankEl.innerHTML = currentPuzzle.bankItems
    .map(item => {
      const used = currentPuzzle.slotValues.includes(item.id);
      return `
        <button
          class="bank-letter${used ? ' used' : ''}"
          type="button"
          data-bank-id="${item.id}"
          ${used ? 'disabled' : ''}
        >
          ${escapeHtml(String(item.char).toUpperCase())}
        </button>
      `;
    })
    .join('');
}

function submitCurrentPuzzle(timedOut, skipped) {
  if (isAnswered) return;
  isAnswered = true;
  clearTimer();
  freezeTimerBar();

  const question = currentQuestions[currentIndex];
  if (!question || !currentPuzzle) return;

  const attemptDisplay = buildAttemptString(currentPuzzle, '_');
  const attemptValue = buildAttemptString(currentPuzzle, '');
  const fullyFilled = hasAllSlotsFilled(currentPuzzle);
  const correct = !skipped && fullyFilled && normalizeAnswer(attemptValue) === normalizeAnswer(question.word);

  let selectedLabel = attemptDisplay || 'EMPTY';
  if (skipped) {
    selectedLabel = 'SKIPPED';
  } else if (timedOut) {
    selectedLabel = `${selectedLabel} / TIME OUT`;
  }

  currentResults.push({
    no: currentIndex + 1,
    meaning: question.meaning,
    selected: selectedLabel,
    answer: question.word,
    correct,
  });

  const feedback = document.getElementById('feedback');
  if (feedback) {
    feedback.textContent = correct
      ? `Correct: ${question.word}`
      : `${timedOut ? 'Time out' : skipped ? 'Skipped' : 'Incorrect'}: ${question.word}`;
    feedback.style.color = correct ? '#2e7d32' : '#c62828';
  }

  document.querySelectorAll('#quiz-area button').forEach(button => {
    button.disabled = true;
  });

  window.setTimeout(() => {
    currentIndex += 1;
    renderQuestion();
  }, 900);
}

function buildResultsTable() {
  return `
    <table style="width:100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background:#f6f6f6;">
          <th style="padding: 6px; border-bottom: 1px solid #ccc;">No</th>
          <th style="padding: 6px; border-bottom: 1px solid #ccc;">Meaning</th>
          <th style="padding: 6px; border-bottom: 1px solid #ccc;">Your Answer</th>
          <th style="padding: 6px; border-bottom: 1px solid #ccc;">Word</th>
          <th style="padding: 6px; border-bottom: 1px solid #ccc;">OK</th>
        </tr>
      </thead>
      <tbody>
        ${currentResults
          .map(result => `
            <tr>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${result.no}</td>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${escapeHtml(result.meaning)}</td>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${escapeHtml(result.selected)}</td>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${escapeHtml(result.answer)}</td>
              <td style="padding:6px; border-bottom: 1px solid #eee;">${result.correct ? 'O' : 'X'}</td>
            </tr>
          `)
          .join('')}
      </tbody>
    </table>
  `;
}

function showResults() {
  clearTimer();
  isAnswered = true;

  const total = currentResults.length;
  const correctCount = currentResults.filter(result => result.correct).length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  resultPopup.innerHTML = `
    <div class="popup-content">
      <div style="font-weight: bold; font-size:16px; margin-bottom: 8px;">Spelling Scramble Result</div>
      <div style="margin-bottom: 8px; font-size: 14px;">
        Score: <b>${score}</b> (${correctCount} / ${total})
      </div>
      <div style="max-height: 260px; overflow-y: auto; margin-bottom: 14px;">
        ${buildResultsTable()}
      </div>
      <div style="display:flex; justify-content: space-between; gap: 10px; margin-top:8px;">
        <button class="quiz-btn secondary" id="setup-btn" type="button" style="flex: 1; margin-top: 0;">Change Set</button>
        <button class="quiz-btn" id="retry-btn" type="button" style="flex: 1; margin-top: 0;">Retry</button>
      </div>
    </div>
  `;

  resultPopup.style.display = 'flex';

  document.getElementById('retry-btn')?.addEventListener('click', () => {
    closeResultPopup();
    startQuiz().catch(error => {
      console.error(error);
      alert('Failed to restart the quiz.');
    });
  });

  document.getElementById('setup-btn')?.addEventListener('click', () => {
    closeResultPopup();
    hydrateSetupOptions().catch(error => {
      console.error(error);
      alert('Failed to load the setup screen.');
    });
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  quizArea = document.getElementById('quiz-area');
  resultPopup = document.getElementById('result-popup');

  const params = new URLSearchParams(window.location.search);
  const prefs = readPrefs();
  const requestedLevel = String(params.get('level') || prefs.level || currentConfig.level).toUpperCase();
  const requestedDay = params.get('day') || prefs.day || '';

  currentConfig.level = LEVELS.includes(requestedLevel) ? requestedLevel : 'A1';
  currentConfig.day = requestedDay ? String(requestedDay) : '';
  storePrefs();

  document.getElementById('back-btn')?.addEventListener('click', () => {
    history.back();
  });

  resultPopup?.addEventListener('click', event => {
    if (event.target === resultPopup) {
      closeResultPopup();
    }
  });

  try {
    await hydrateSetupOptions();
  } catch (error) {
    console.error(error);
    quizArea.innerHTML = `
      <div style="
        background: #fff3e0;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        font-size: 14px;
      ">
        <div style="font-size:18px; font-weight:bold; color:#7e3106; margin-bottom:12px;">Setup failed</div>
        <div>Reload the page and try again.</div>
      </div>
    `;
  }
});
