function getDayManager() {
  return window.DayManager || null;
}

function resolveSubcategoryName(subcategory) {
  const dm = getDayManager();
  if (!subcategory || !dm || typeof dm.resolveSubcategoryName !== "function") return subcategory;
  return dm.resolveSubcategoryName(subcategory) || subcategory;
}

function getDayMeta(subcategory, level, lessonNo) {
  const dm = getDayManager();
  const canonicalSub = resolveSubcategoryName(subcategory);
  const lesson = lessonNo != null ? Number(lessonNo) : null;
  if (!dm || !level || lesson == null || Number.isNaN(lesson) || typeof dm.getDay !== "function") {
    return { subcategory: canonicalSub, day: null };
  }
  const day = dm.getDay(canonicalSub, level, lesson);
  return { subcategory: canonicalSub, day };
}

function showReceiptFromQordered(latestLabel = null) {
  if (!document.getElementById("receipt-animation-style")) {
    const style = document.createElement("style");
    style.id = "receipt-animation-style";
    style.innerHTML = `
      @keyframes receiptShadowPop {
        0% { box-shadow: 0 0 0px rgba(80, 200, 120, 0); }
        100% { box-shadow: 0 0 30px 25px rgba(80, 200, 120, 0.4); }
      }
    `;
    document.head.appendChild(style);
  }

  const hwItems = JSON.parse(localStorage.getItem("HWPlus") || "[]");
  const pending = JSON.parse(localStorage.getItem("PendingUploads") || "[]");

  const container = document.createElement("div");
  container.id = "temp-receipt";
  container.className = "receipt-box";
  container.style = `
    position: absolute;
    top: 120px;
    left: 50%;
    transform: translateX(-50%);
    background: white;
    border: 2px dashed #444;
    border-radius: 8px;
    width: 240px;
    padding: 16px;
    font-family: monospace;
    font-size: 13px;
    color: #222;
    box-shadow: 2px 2px 8px rgba(0,0,0,0.2);
    z-index: 20;
    opacity: 1;
    transition: opacity 1s ease;
    animation: receiptShadowPop 0.3s ease-out forwards;
  `;

  let content = '<div class="receipt-title">📄 주문 영수증</div><div class="receipt-content">';
  const latestCanonical = resolveSubcategoryName(latestLabel) || latestLabel;

  hwItems.forEach(entry => {
    const entrySub = resolveSubcategoryName(entry.Subcategory) || entry.Subcategory;
    const entryLevel = entry.Level ?? null;
    const entryLessonNo = entry.LessonNo ?? null;

    const isChecked = pending.some(p => {
      const pendingSub = resolveSubcategoryName(p.Subcategory) || p.Subcategory;
      const sameSub = pendingSub === entrySub || p.label === entrySub;
      const sameLevel = (p.Level ?? null) === entryLevel || p.Level == null;
      const sameLesson = (p.LessonNo ?? null) === entryLessonNo || p.LessonNo == null;
      return sameSub && sameLevel && sameLesson && p.Status === "readyToBeSent";
    });

    let line = "";
    if (entryLevel && entryLessonNo !== undefined && entryLessonNo !== null) {
      const meta = getDayMeta(entrySub, entryLevel, entryLessonNo);
      const dayStr = meta.day != null ? `Day ${meta.day}` : `Lesson ${entryLessonNo}`;
      line = `${entrySub} > ${entryLevel} > ${dayStr}`;
    } else if (entryLevel) {
      line = `${entrySub} > ${entryLevel}`;
    } else {
      line = `${entrySub}`;
    }

    const highlight =
      entrySub === latestCanonical ||
      (entrySub === "Customorder" && latestLabel === "Customorder");
    const style = `
      ${isChecked ? "color: green;" : ""}
      ${highlight ? "font-weight: bold; animation: flashText 0.5s linear 1;" : ""}
    `;

    content += `<div style="${style}">${line}${isChecked ? " ✔️" : ""}</div>`;
  });

  content += "</div>";
  container.innerHTML = content;

  document.querySelector(".main-page").appendChild(container);

  setTimeout(() => {
    container.style.opacity = 0;
    setTimeout(() => container.remove(), 1000);
  }, 3000);
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("receipt_icon")?.addEventListener("click", () => {
    showReceiptFromQordered();
  });
});
