// dish_popup-handler.js

function getDayManager() {
  return window.DayManager || null;
}

function resolveSubcategory(subcategory) {
  const dm = getDayManager();
  if (!subcategory) return subcategory;
  if (!dm || typeof dm.resolveSubcategoryName !== "function") return subcategory;
  return dm.resolveSubcategoryName(subcategory) || subcategory;
}

function resolveCategoryLabel(item, subcategory) {
  const dm = getDayManager();
  const label = item?.label || null;

  if (!dm) return label || subcategory;

  if (label && typeof dm.resolveCategoryName === "function") {
    const fromLabel = dm.resolveCategoryName(label);
    if (fromLabel) return fromLabel;
  }

  if (subcategory && typeof dm.getCategoryBySubcategory === "function") {
    const fromSub = dm.getCategoryBySubcategory(subcategory);
    if (fromSub) return fromSub;
  }

  return label || subcategory;
}

function hasCurriculumLevels(subcategory) {
  const dm = getDayManager();
  if (!dm || typeof dm.listLevels !== "function") return false;
  const levels = dm.listLevels(subcategory);
  return Array.isArray(levels) && levels.length > 0;
}

function inferLevelIfNeeded(subcategory, level, lessonNo) {
  const dm = getDayManager();
  if (level) return level;
  if (!dm || typeof dm.inferLevel !== "function") return null;

  const lesson = Number(lessonNo);
  if (!Number.isFinite(lesson)) return null;

  const inferred = dm.inferLevel(subcategory, lesson);
  return inferred?.level || null;
}

function getLessonRouteInfo(item) {
  const dm = getDayManager();
  if (!dm || typeof dm.getLessonPageRoute !== "function") return null;

  const canonicalSubcategory = resolveSubcategory(item.Subcategory);
  const lessonNo = Number(item.LessonNo);
  const level = inferLevelIfNeeded(canonicalSubcategory, item.Level, lessonNo);
  if (!canonicalSubcategory || !level || !Number.isFinite(lessonNo)) return null;

  return dm.getLessonPageRoute(canonicalSubcategory, level, lessonNo);
}

function getLessonPageDefinitionForItem(item) {
  const dm = getDayManager();
  if (!dm || typeof dm.getLessonPageDefinition !== "function") return null;

  const canonicalSubcategory = resolveSubcategory(item.Subcategory);
  const lessonNo = Number(item.LessonNo);
  const level = inferLevelIfNeeded(canonicalSubcategory, item.Level, lessonNo);
  if (!canonicalSubcategory || !level) return null;

  return dm.getLessonPageDefinition(canonicalSubcategory, level);
}

function getSelfCheckToolConfig(subcategory) {
  const key = String(subcategory || "").trim();
  const map = {
    "베이스 체커": {
      path: "base_checker.html",
      icon: "🧪",
      desc: "제출 없이 바로 연습할 수 있어요."
    },
    "셀프 단어시험": {
      path: "self_wordtest_module.html",
      icon: "📝",
      desc: "제출 없이 바로 단어시험을 볼 수 있어요."
    },
    "모의고사 전용도구": {
      path: "mock-exam-tool.html",
      icon: "🧰",
      desc: "제출 없이 바로 전용 도구를 사용할 수 있어요."
    },
    "EBS 전용도구": {
      path: "ebs-tool.html",
      icon: "📚",
      desc: "제출 없이 바로 EBS 전용 도구를 사용할 수 있어요."
    }
  };
  return map[key] || null;
}

function buildTargetUrl(path, extraParams = {}) {
  const current = new URL(window.location.href);
  const target = new URL(path, current.href);

  for (const [key, value] of current.searchParams.entries()) {
    if (!target.searchParams.has(key)) {
      target.searchParams.append(key, value);
    }
  }

  for (const [key, value] of Object.entries(extraParams)) {
    if (value === null || value === undefined || value === "") {
      target.searchParams.delete(key);
    } else {
      target.searchParams.set(key, String(value));
    }
  }

  if (!target.hash && current.hash) {
    target.hash = current.hash;
  }

  return target.toString();
}

function renderCustomModulePreviewCard(title, routeInfo, fallbackDay = null, fallbackLevel = null) {
  const lessonBadge = routeInfo?.lessonTag ? `${routeInfo.lessonTag}` : "준비중";
  const dayNum = routeInfo?.day ?? fallbackDay ?? null;
  const dayBadge = dayNum ? `Day ${dayNum}` : "";
  const levelBadge = fallbackLevel ? ` · ${fallbackLevel}` : "";
  const displayTitle = String(title || "학습").trim() || "학습";
  return `
    <div style="
      margin-bottom: 10px;
      height: 164px;
      border-radius: 12px;
      border: 1px solid #d4b393;
      background: linear-gradient(145deg, #fff4df 0%, #ffe9cc 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    ">
      <div style="
        position: absolute;
        top: -18px;
        right: -14px;
        width: 88px;
        height: 88px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.55);
      "></div>
      <div style="text-align:center; color:#7e3106;">
        <div style="font-size: 40px; line-height: 1;">📚</div>
        <div style="font-size: 15px; font-weight: 800; margin-top: 4px;">${displayTitle}</div>
        <div style="font-size: 12px; opacity: 0.84; margin-top: 3px;">${lessonBadge}${dayBadge ? ` · ${dayBadge}` : ""}${levelBadge}</div>
      </div>
    </div>
  `;
}

function buildFilename(item) {
  const dm = getDayManager();
  const canonicalSubcategory = resolveSubcategory(item.Subcategory);
  const category = resolveCategoryLabel(item, canonicalSubcategory);

  const lessonNo = Number(item.LessonNo);
  const level = inferLevelIfNeeded(canonicalSubcategory, item.Level, lessonNo);

  let day = null;
  if (dm && level && typeof dm.getDay === "function") {
    day = dm.getDay(canonicalSubcategory, level, lessonNo);
  }
  if (day == null && Number.isFinite(lessonNo)) {
    day = lessonNo;
  }

  const subjectToken =
    (dm && typeof dm.getSubjectToken === "function" && dm.getSubjectToken(category)) ||
    category;
  const subToken =
    (dm && typeof dm.getSubcategoryToken === "function" && dm.getSubcategoryToken(canonicalSubcategory)) ||
    canonicalSubcategory;

  if (!subjectToken || !subToken || !level || !Number.isFinite(lessonNo) || day == null) {
    return "";
  }

  return `${subjectToken}_${subToken}_${level}_Day${day}_Lesson${lessonNo}_v1.pdf`;
}

window.buildFilename = buildFilename;

function clearDishRedirectToastTimer() {
  const timerId = window.__dishRedirectToastTimerId;
  if (!timerId) return;
  clearTimeout(timerId);
  window.__dishRedirectToastTimerId = null;
}

function cleanupDishRedirectToastUI() {
  document.getElementById("redirect-toast")?.remove();
}

function cleanupDishRedirectToastAndTimer() {
  clearDishRedirectToastTimer();
  cleanupDishRedirectToastUI();
}

function bindDishRedirectToastLifecycleCleanup() {
  if (window.__dishRedirectToastLifecycleBound) return;
  window.__dishRedirectToastLifecycleBound = true;

  window.addEventListener("pagehide", cleanupDishRedirectToastAndTimer);
  window.addEventListener("popstate", cleanupDishRedirectToastAndTimer);
  window.addEventListener("pageshow", (evt) => {
    if (evt?.persisted) {
      cleanupDishRedirectToastAndTimer();
      return;
    }
    try {
      const nav = performance.getEntriesByType?.("navigation")?.[0];
      if (nav?.type === "back_forward") cleanupDishRedirectToastAndTimer();
    } catch (_) {}
  });
}

bindDishRedirectToastLifecycleCleanup();

function readQuizResultsMap() {
  try {
    const raw = localStorage.getItem("QuizResultsMap");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function readLegacyQuizResult() {
  try {
    const raw = localStorage.getItem("QuizResults");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_) {
    return null;
  }
}

function getStoredQuizResultByKey(quizKey) {
  const key = String(quizKey || "").trim();
  if (!key) return null;

  const map = readQuizResultsMap();
  const fromMap = map[key];
  if (fromMap && typeof fromMap === "object") return fromMap;

  const legacy = readLegacyQuizResult();
  if (!legacy) return null;

  const legacyKey = String(legacy.quiztitle || legacy.quizTitle || "").trim();
  return legacyKey === key ? legacy : null;
}

function normalizeQuizKeyAlias(quizKey) {
  const raw = String(quizKey || "").trim();
  if (!raw) return [];
  const aliases = new Set([raw]);
  if (/_round2$/i.test(raw)) {
    aliases.add(raw.replace(/_round2$/i, ""));
  } else {
    aliases.add(`${raw}_round2`);
  }
  return Array.from(aliases);
}

function isStoredQuizDoneForKey(quizKey) {
  const aliases = normalizeQuizKeyAlias(quizKey);
  for (const key of aliases) {
    const result = getStoredQuizResultByKey(key);
    if (result && result.teststatus === "done") return true;
  }
  return false;
}

window.showDishPopup = function (item) {
  const cafeInt = document.getElementById("cafe_int");
  if (!cafeInt) {
    console.warn("cafe_int가 없습니다.");
    return;
  }

  const dm = getDayManager();
  const userId = new URLSearchParams(window.location.search).get("id");

  if (!dm) {
    console.warn("DayManager가 로드되지 않았습니다.");
  }

  const canonicalSubcategory = resolveSubcategory(item.Subcategory);
  if (canonicalSubcategory) {
    item.Subcategory = canonicalSubcategory;
  }

  item.label = resolveCategoryLabel(item, item.Subcategory);

  const old = document.getElementById("popup-container");
  if (old) old.remove();

  const popupContainer = document.createElement("div");
  popupContainer.id = "popup-container";
  popupContainer.style = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 999;
    pointer-events: none;
  `;

  const popup = document.createElement("div");
  popup.style = `
    position: absolute;
    top: 160px;
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    min-height: 140px;
    background: #fffaf2;
    border: 2px solid #7e3106;
    border-radius: 14px;
    padding: 16px;
    font-size: 14px;
    color: #333;
    box-shadow: 0 4px 10px rgba(0,0,0,0.25);
    z-index: 1001;
    text-align: center;
    pointer-events: auto;
  `;

  const hw = item.Subcategory;
  const selfCheckTool = getSelfCheckToolConfig(hw);

  if (selfCheckTool) {
    let toolContent = `<div style="font-weight:bold; font-size: 15px; margin-bottom: 10px;">${selfCheckTool.icon} ${hw}</div>`;
    toolContent += `
      <div style="
        margin-bottom: 10px;
        height: 150px;
        border-radius: 12px;
        border: 1px solid #d7c6ad;
        background: linear-gradient(145deg, #fff7ea 0%, #fff0dc 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #7e3106;
        font-size: 14px;
        font-weight: 700;
      ">
        ${hw}
      </div>
      <div style="margin-bottom: 10px;">${selfCheckTool.desc}</div>
      <button class="room-btn" style="background: #2e7d32; width: 100%;" id="tool-open-btn">🚀 바로 사용하기</button>
      <button id="close-popup" class="room-btn" style="margin-top:14px; width:100%; background:#f17b2a;">닫기</button>
    `;

    popup.innerHTML = toolContent;
    popup.querySelector("#close-popup")?.addEventListener("click", () => popupContainer.remove());
    popup.querySelector("#tool-open-btn")?.addEventListener("click", () => {
      const targetUrl = buildTargetUrl(selfCheckTool.path, {
        id: userId || ""
      });
      window.location.href = targetUrl;
    });

    popupContainer.appendChild(popup);
    cafeInt.appendChild(popupContainer);
    return;
  }

  const key = `downloaded_HW_${hw}_${item.Level}_${item.LessonNo}`;
  const downloaded = localStorage.getItem(key) === "true";
  const lessonRouteInfo = getLessonRouteInfo(item);
  const lessonPageDef = getLessonPageDefinitionForItem(item);
  const isCustomLessonModule = !!lessonPageDef;
  const fallbackDay = dm && typeof dm.getDay === "function"
    ? dm.getDay(hw, item.Level, item.LessonNo)
    : null;

  let content = `<div style="font-weight:bold; font-size: 15px; margin-bottom: 10px;">📥 ${hw}</div>`;

  const filename = buildFilename(item);
  const baseFile = filename ? filename.replace(/\.pdf$/, "") : "";

  const folder =
    (dm && typeof dm.getStorageFolder === "function" && dm.getStorageFolder(hw)) || "misc";

  const fileURL = filename
    ? `https://yslwgaephsnbfoiqnpuw.supabase.co/storage/v1/object/public/hw-datasets/${folder}/${filename}`
    : "";
  const previewImageURL = baseFile
    ? `https://yslwgaephsnbfoiqnpuw.supabase.co/storage/v1/object/public/hw-datasets/${folder}/${baseFile}.png`
    : "";

  const isRegularHW = hasCurriculumLevels(hw);
  const isWordCategory = item.label === "단어";
  const shouldUseWordSupabasePreview =
    isCustomLessonModule && isWordCategory && !!previewImageURL;

  if (shouldUseWordSupabasePreview) {
    content += `
      <div style="margin-bottom: 8px; height: 180px; overflow-y: auto; border: 1px solid #aaa; border-radius: 6px;">
        <img src="${previewImageURL}" style="width: 100%;" />
      </div>
    `;
  } else if (isCustomLessonModule) {
    const previewTitle = item.Subcategory || item.label || "학습";
    content += renderCustomModulePreviewCard(previewTitle, lessonRouteInfo, fallbackDay, item.Level);
  } else if (isRegularHW && previewImageURL) {
    content += `
      <div style="margin-bottom: 8px; height: 180px; overflow-y: auto; border: 1px solid #aaa; border-radius: 6px;">
        <img src="${previewImageURL}" style="width: 100%;" />
      </div>
    `;
  }

  if (isCustomLessonModule) {
    const customQuizKey = filename ? filename.replace(/\.pdf$/, "") : "";
    const routeQuizKey = lessonRouteInfo?.quizKey || "";
    const isDone = !!(
      (routeQuizKey && isStoredQuizDoneForKey(routeQuizKey)) ||
      (customQuizKey && isStoredQuizDoneForKey(customQuizKey))
    );

    if (lessonRouteInfo?.path) {
      if (isDone) {
        content += `
          <div style="margin-bottom: 10px;">이미 시험을 완료했어요. 제출할 수 있어요.</div>
          <div style="display: flex; gap: 6px; justify-content: center;">
            <button class="room-btn" style="background: #2e7d32; flex: 1;" id="custom-quiz-btn">🔁 다시 학습/시험</button>
            <button class="room-btn" style="background: #1976d2; flex: 1;" id="upload-btn">✅ 완료했어요</button>
          </div>
        `;
      } else {
        content += `
          <div style="margin-bottom: 10px;">전용 학습 페이지로 이동합니다.</div>
          <button class="room-btn" style="background: #f2c94c; color: #5a4300; width: 100%;" id="custom-quiz-btn">📒 외우러 갑시다!</button>
        `;
      }
    } else {
      content += `
        <div style="margin-bottom: 10px;">해당 Day는 아직 준비 중입니다.</div>
        <button class="room-btn" style="background: #b6b6b6; width: 100%; cursor:not-allowed;" disabled>📝 시험 준비중</button>
      `;
    }
  } else if (isRegularHW) {
    const quizKey = baseFile;
    const isDone = !!(quizKey && isStoredQuizDoneForKey(quizKey));

    if (isDone) {
      content += `
        <div style="margin-bottom: 10px;">이미 시험을 완료했어요. 다운로드도 가능해요.</div>
        <div style="display: flex; gap: 6px; justify-content: center;">
          <a href="${fileURL}" download class="room-btn" id="download-a"
            style="flex: 1; text-decoration: none; height: 18px;
          display: inline-flex; align-items: center; justify-content: center;">📂 다시 다운로드</a>
          <button class="room-btn" style="background: #1976d2; flex: 1;" id="upload-btn">✅ 완료했어요</button>
        </div>
      `;
    } else if (downloaded) {
      const isWordCategory = item.label === "단어";
      if (isWordCategory) {
        content += `
          <div style="margin-bottom: 10px;">숙제를 다시 다운로드하거나, 시험을 보러 갈 수 있어요.</div>
          <div style="display: flex; gap: 6px; justify-content: center;">
            <a href="${fileURL}" download class="room-btn" id="download-a"
              style="flex: 1; text-decoration: none; height: 18px;
            display: inline-flex; align-items: center; justify-content: center;">📂 다시 다운로드</a>
            <button class="room-btn" style="background: #2e7d32; flex: 1;" id="quiz-btn">📝 시험볼게요</button>
          </div>
        `;
      } else {
        content += `
          <div style="margin-bottom: 10px;">숙제를 다운로드하셨네요. 바로 완료 처리할 수 있어요.</div>
          <div style="display: flex; gap: 6px; justify-content: center;">
            <a href="${fileURL}" download class="room-btn" id="download-a"
              style="flex: 1; text-decoration: none; height: 18px;
            display: inline-flex; align-items: center; justify-content: center;">📂 다시 다운로드</a>
            <button class="room-btn" style="background: #1976d2; flex: 1;" id="upload-btn">✅ 완료했어요</button>
          </div>
        `;
      }
    } else {
      content += `
        <div style="margin-bottom: 10px;">해당 숙제를 다운로드하세요.</div>
        <a href="${fileURL}" download class="room-btn" id="download-btn"
          style="flex: 1; text-decoration: none; height: 18px;
        display: inline-flex; align-items: center; justify-content: center;">📂 다운로드</a>
      `;
    }
  } else if (hw === "오늘 내 숙제") {
    const requestTypes = [
      "오늘 내 숙제",
      "시험지 만들어주세요",
      "채점만 해주세요",
      "이거 잘 모르겠어요"
    ];

    const optionsHtml = requestTypes
      .map(type => `<option value="${type}">${type}</option>`)
      .join("");

    content += `
      <label for="custom_hwcategory">어떤 종류의 요청인가요?</label>
      <select id="custom_hwcategory" style="width:100%; margin-bottom:6px;">
        ${optionsHtml}
      </select>

      <label for="custom_hwcomment">요청 사항이 있다면 적어주세요 (선택)</label>
      <textarea
        id="custom_hwcomment"
        rows="3"
        style="width:100%; resize:none;"
        placeholder="필요할 때만 적어주세요. 예: 사진으로 보낼 자료 설명, 채점 기준, 모르는 부분 메모 등"
      ></textarea>

      <button class="room-btn" style="background: #1976d2; margin-top: 6px;" id="custom-complete-btn">
        ✅ 완료했어요!
      </button>
    `;
  } else {
    content += `<div style="margin: 12px 0;">단어 퀴즈를 풀어보아요!</div>`;
  }

  content += `
    <button id="close-popup" class="room-btn" style="margin-top:14px; width:100%; background:#f17b2a;">닫기</button>
  `;

  popup.innerHTML = content;

  function showRedirectToast() {
    cleanupDishRedirectToastAndTimer();

    const toast = document.createElement("div");
    toast.id = "redirect-toast";
    toast.style = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 14px 18px;
      border-radius: 12px;
      background: rgba(40, 40, 40, 0.92);
      color: #fff;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      z-index: 3000;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      min-width: 220px;
      text-align: center;
    `;

    toast.innerHTML = `
      <span style="margin-bottom: 4px;">반납함으로 이동 중입니다...</span>
      <div style="width: 180px; height: 8px; border-radius: 6px; background: rgba(255,255,255,0.25); overflow: hidden;">
        <div class="redirect-toast-bar" style="
          width: 0%;
          height: 100%;
          background: #ffcc80;
          border-radius: 6px;
          transition: width 1.9s linear;
        "></div>
      </div>
    `;

    document.body.appendChild(toast);

    const bar = toast.querySelector(".redirect-toast-bar");
    requestAnimationFrame(() => {
      bar.style.width = "100%";
    });
  }

  popup.querySelector("#close-popup")?.addEventListener("click", () => popupContainer.remove());

  popup.querySelector("#download-btn")?.addEventListener("click", () => {
    localStorage.setItem(key, "true");
    showDishPopup(item);
  });

  popup.querySelector("#download-a")?.addEventListener("click", () => {
    localStorage.setItem(key, "true");
  });

  popup.querySelector("#quiz-btn")?.addEventListener("click", () => {
    const quizKey = buildFilename(item).replace(/\.pdf$/, "");
    window.location.href =
      `dish-quiz.html?id=${encodeURIComponent(userId || "")}&key=${encodeURIComponent(quizKey)}`;
  });

  popup.querySelector("#custom-quiz-btn")?.addEventListener("click", () => {
    if (!lessonRouteInfo?.path) {
      alert("연결된 학습 페이지를 찾지 못했습니다.");
      return;
    }

    const dishQuizKey = filename ? filename.replace(/\.pdf$/, "") : "";
    const targetUrl = buildTargetUrl(lessonRouteInfo.path, {
      id: userId || "",
      key: lessonRouteInfo.quizKey || "",
      dishQuizKey,
      round2: null,
      round2Script: null
    });
    window.location.href = targetUrl;
  });

  popup.querySelector("#upload-btn")?.addEventListener("click", () => {
    const isWord = item.label === "단어";
    const levelKey = String(item.Level || "").trim().toLowerCase();
    const isWebGrammarModule = ["herma", "pleks", "aisth"].includes(levelKey);
    const resolvedLevelForPending = inferLevelIfNeeded(item.Subcategory, item.Level, item.LessonNo);
    const pendingQuizKey = isCustomLessonModule
      ? (lessonRouteInfo?.quizKey || (filename ? filename.replace(/\.pdf$/, "") : ""))
      : (baseFile || "");
    const hwType = (isWord || isWebGrammarModule) ? "doneinweb" : "pdf사진";

    console.log("✅ [제출] 라벨:", item.label);
    console.log("✅ [제출] Subcategory:", item.Subcategory);
    console.log("✅ [제출] 저장될 HWType:", hwType);

    window.storePendingHomework({
      Subcategory: item.Subcategory,
      Level: resolvedLevelForPending || item.Level || null,
      QuizKey: pendingQuizKey || null,
      HWType: hwType,
      LessonNo: item.LessonNo,
      Status: "readyToBeSent",
      comment: "시험 완료 후 제출"
    });

    popupContainer.remove();
    window.showReceiptFromQordered(item.Subcategory);

    showRedirectToast();

    window.__dishRedirectToastTimerId = setTimeout(() => {
      window.__dishRedirectToastTimerId = null;
      cleanupDishRedirectToastUI();
      window.location.href =
        `homework-submit.html?id=${encodeURIComponent(userId || "")}`;
    }, 2000);
  });

  popup.querySelector("#custom-complete-btn")?.addEventListener("click", () => {
    const typeSelect = document.getElementById("custom_hwcategory");
    const selectedType =
      (typeSelect && typeSelect.value) ? typeSelect.value : "오늘 내 숙제";

    const explanation = document.getElementById("custom_hwcomment")?.value.trim() || "";

    const pieces = [`[${selectedType}]`];
    if (explanation) pieces.push(explanation);

    const combinedComment = pieces.join(" ");

    window.storePendingHomework({
      Subcategory: selectedType,
      HWType: "사진촬영",
      LessonNo: null,
      Status: "readyToBeSent",
      comment: combinedComment
    });

    popupContainer.remove();
    window.showReceiptFromQordered(item.Subcategory);

    showRedirectToast();

    window.__dishRedirectToastTimerId = setTimeout(() => {
      window.__dishRedirectToastTimerId = null;
      cleanupDishRedirectToastUI();
      window.location.href =
        `homework-submit.html?id=${encodeURIComponent(userId || "")}`;
    }, 2000);
  });

  popupContainer.appendChild(popup);
  cafeInt.appendChild(popupContainer);
};
