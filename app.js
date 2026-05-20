const storageKey = "goalflow-state-v1";
const today = new Date();
let state = loadState();
let selectedGoalId = state.goals[0]?.id ?? "";
let weekStart = getWeekStart(today);
let monthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let viewMode = "week";
let activeScreen = "home";
let highlightedCompletionId = "";
let highlightedScheduleDate = "";
let highlightedScheduleTimer = null;
let activeScheduleControlId = "";
let editingTaskId = "";
let editingGoalId = "";
let editingScheduledId = "";
let goalSelectTimer = null;
let scheduleControlTimer = null;
let chartMetric = "count";
let pieMetric = "count";
let chartAnimationFrame = null;
let pieAnimationFrame = null;
let taskBankReturnDropBound = false;
let calendarSize = state.meta?.calendarSize ?? "normal";
const screenOrder = ["home", "goals", "schedule", "today"];

const els = {
  goalList: document.querySelector("#goalList"),
  taskBank: document.querySelector("#taskBank"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarScroll: document.querySelector("#calendarScroll"),
  todayList: document.querySelector("#todayList"),
  goalDialog: document.querySelector("#goalDialog"),
  taskDialog: document.querySelector("#taskDialog"),
  dayDialog: document.querySelector("#dayDialog"),
  dayDialogTitle: document.querySelector("#dayDialogTitle"),
  dayDialogList: document.querySelector("#dayDialogList"),
  goalForm: document.querySelector("#goalForm"),
  deleteGoalFromDialog: document.querySelector("#deleteGoalFromDialog"),
  taskForm: document.querySelector("#taskForm"),
  openGoalDialog: document.querySelector("#openGoalDialog"),
  openTaskDialog: document.querySelector("#openTaskDialog"),
  taskGoalSelect: document.querySelector("#taskGoalSelect"),
  categoryOptions: document.querySelector("#categoryOptions"),
  categoryPicker: document.querySelector("#categoryPicker"),
  goalFilter: document.querySelector("#goalFilter"),
  chartMetric: document.querySelector("#chartMetric"),
  pieMetric: document.querySelector("#pieMetric"),
  chartMetricNote: document.querySelector("#chartMetricNote"),
  pieMetricNote: document.querySelector("#pieMetricNote"),
  chart: document.querySelector("#progressChart"),
  completionPie: document.querySelector("#completionPie"),
  goalReport: document.querySelector("#goalReport"),
  weekTitle: document.querySelector("#weekTitle"),
  todayDate: document.querySelector("#todayDate"),
  summaryTodayRate: document.querySelector("#summaryTodayRate"),
  summaryWeekRate: document.querySelector("#summaryWeekRate"),
  summaryOverallRate: document.querySelector("#summaryOverallRate"),
  summaryStreak: document.querySelector("#summaryStreak"),
  todayRateMeter: document.querySelector("#todayRateMeter"),
  weekRateMeter: document.querySelector("#weekRateMeter"),
  overallRateMeter: document.querySelector("#overallRateMeter"),
  goalCount: document.querySelector("#goalCount"),
  weekView: document.querySelector("#weekView"),
  monthView: document.querySelector("#monthView"),
  todayPeriod: document.querySelector("#todayPeriod"),
  calendarZoomOut: document.querySelector("#calendarZoomOut"),
  calendarZoomIn: document.querySelector("#calendarZoomIn"),
  screenTabs: document.querySelectorAll("[data-screen-target]"),
  onboarding: document.querySelector("#onboarding"),
  startFirstGoal: document.querySelector("#startFirstGoal"),
  dismissOnboarding: document.querySelector("#dismissOnboarding"),
  emptyStart: document.querySelector("#emptyStart"),
  emptyCreateGoal: document.querySelector("#emptyCreateGoal"),
  saveStatus: document.querySelector("#saveStatus"),
  themeToggle: document.querySelector("#themeToggle"),
  themeToggleLabel: document.querySelector("#themeToggleLabel"),
  launchScreen: document.querySelector("#launchScreen"),
  nextActionTitle: document.querySelector("#nextActionTitle"),
  nextActionBody: document.querySelector("#nextActionBody"),
  nextActionButton: document.querySelector("#nextActionButton"),
  progressSection: document.querySelector("#progressSection"),
  buddyTitle: document.querySelector("#buddyTitle"),
  buddyMessage: document.querySelector("#buddyMessage"),
  toast: document.querySelector("#toast"),
  fileWarning: document.querySelector("#fileWarning"),
};

function createEmptyState() {
  return {
    goals: [],
    tasks: [],
    scheduled: [],
    meta: {
      onboardingDismissed: false,
      lastVisitDate: "",
      visitStreak: 0,
      theme: "light",
      calendarSize: "normal",
    },
  };
}

function seedState() {
  const start = getWeekStart(today);
  const dates = Array.from({ length: 7 }, (_, index) => addDays(start, index).toISOString().slice(0, 10));
  const goals = [
    {
      id: crypto.randomUUID(),
      name: "3か月でベンチプレス +10kg",
      category: "筋トレ",
      createdAt: toISO(today),
      deadline: addDays(today, 88).toISOString().slice(0, 10),
      note: "週3回の重量管理。無理なく継続する。",
    },
    {
      id: crypto.randomUUID(),
      name: "英語ニュースを毎日読む",
      category: "勉強",
      createdAt: toISO(today),
      deadline: addDays(today, 45).toISOString().slice(0, 10),
      note: "朝に15分。読んだ記事を一言で要約する。",
    },
  ];
  const tasks = [
    { id: crypto.randomUUID(), goalId: goals[0].id, title: "胸・肩トレ", minutes: 70, durationValue: 70, durationUnit: "minutes" },
    { id: crypto.randomUUID(), goalId: goals[0].id, title: "フォーム動画チェック", minutes: 15, durationValue: 15, durationUnit: "minutes" },
    { id: crypto.randomUUID(), goalId: goals[1].id, title: "英語ニュース 1本", minutes: 20, durationValue: 20, durationUnit: "minutes" },
    { id: crypto.randomUUID(), goalId: goals[1].id, title: "単語レビュー 30個", minutes: 15, durationValue: 15, durationUnit: "minutes" },
  ];
  return {
    goals,
    tasks,
    scheduled: [
      makeSchedule(tasks[0], dates[1], true),
      makeSchedule(tasks[2], dates[2], false),
      makeSchedule(tasks[3], dates[3], false),
      makeSchedule(tasks[0], dates[5], false),
    ],
  };
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return createEmptyState();
  try {
    const parsed = JSON.parse(saved);
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals.map(normalizeGoal) : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      scheduled: Array.isArray(parsed.scheduled) ? parsed.scheduled : [],
      meta: {
        onboardingDismissed: Boolean(parsed.meta?.onboardingDismissed),
        lastVisitDate: parsed.meta?.lastVisitDate ?? "",
        visitStreak: Number(parsed.meta?.visitStreak ?? 0),
        theme: parsed.meta?.theme === "dark" ? "dark" : "light",
        calendarSize: ["compact", "normal", "large"].includes(parsed.meta?.calendarSize) ? parsed.meta.calendarSize : "normal",
      },
    };
  } catch {
    return createEmptyState();
  }
}

function normalizeGoal(goal) {
  return {
    ...goal,
    category: goal.category || "未分類",
    createdAt: goal.createdAt || toISO(today),
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (els.saveStatus) {
    els.saveStatus.textContent = `保存済み ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
  }
}

function render() {
  renderTheme();
  renderFileWarning();
  document.body.dataset.viewMode = viewMode;
  document.body.dataset.calendarSize = calendarSize;
  document.body.dataset.activeScreen = activeScreen;
  document.body.dataset.hasGoals = String(state.goals.length > 0);
  if (selectedGoalId && !state.goals.some((goal) => goal.id === selectedGoalId)) {
    selectedGoalId = state.goals[0]?.id ?? "";
  }
  renderGoals();
  renderTaskBank();
  renderCalendar();
  renderToday();
  renderSelectors();
  renderCategoryOptions();
  renderScreenTabs();
  renderOnboarding();
  renderNextAction();
  renderSummary();
  renderChart();
  renderCompletionPie();
  renderGoalReport();
  saveState();
}

function renderTheme() {
  const theme = state.meta.theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  els.themeToggle?.setAttribute("aria-pressed", String(theme === "dark"));
  if (els.themeToggleLabel) els.themeToggleLabel.textContent = theme === "dark" ? "ライト" : "ダーク";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0f172a" : "#146c63");
}

function renderFileWarning() {
  if (!els.fileWarning) return;
  els.fileWarning.hidden = window.location.protocol !== "file:";
}

function renderGoals() {
  els.goalCount.textContent = state.goals.length;
  els.goalList.innerHTML = "";
  if (!state.goals.length) {
    els.goalList.append(empty("まずは目標を1つ作ると、タスクを紐づけられます。"));
    return;
  }
  state.goals.forEach((goal) => {
    const done = state.scheduled.filter((item) => item.goalId === goal.id && item.done).length;
    const total = state.scheduled.filter((item) => item.goalId === goal.id).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    const daysLeft = daysBetween(today, goal.deadline);
    const startLabel = formatDate(goal.createdAt);
    const deadlineLabel = formatDate(goal.deadline);
    const paceLabel = total ? `${done}/${total} 完了` : "まず1件予定化";
    const deadlineTone = daysLeft >= 0 ? `あと${daysLeft}日` : `${Math.abs(daysLeft)}日経過`;
    const card = document.createElement("article");
    card.className = `goal-card ${goal.id === selectedGoalId ? "active" : ""}`;
    card.innerHTML = `
      <div class="goal-card-head">
        <button type="button" class="goal-select">
          <span class="goal-title"><span>${escapeHtml(goal.name)}</span><span class="tag">${escapeHtml(goal.category)}</span></span>
          <p class="goal-meta">開始 ${startLabel}・期限 ${deadlineLabel}・${escapeHtml(deadlineTone)}</p>
        </button>
      </div>
      <div class="goal-stats">
        <span>${escapeHtml(paceLabel)}</span>
        <span>進み具合 ${percent}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width: ${percent}%"></div></div>
    `;
    card.querySelector(".goal-select").addEventListener("click", () => {
      window.clearTimeout(goalSelectTimer);
      goalSelectTimer = window.setTimeout(() => {
        selectedGoalId = goal.id;
        render();
      }, 220);
    });
    bindDoubleActivate(card.querySelector(".goal-select"), () => {
      window.clearTimeout(goalSelectTimer);
      selectedGoalId = goal.id;
      if (els.goalDialog.open && editingGoalId === goal.id) {
        editingGoalId = "";
        els.goalDialog.close();
        return;
      }
      openGoalDialog(goal);
    });
    els.goalList.append(card);
  });
}

function renderTaskBank() {
  els.taskBank.innerHTML = "";
  bindTaskBankReturnDrop();
  const tasks = state.tasks.filter((task) => !selectedGoalId || task.goalId === selectedGoalId);
  if (!tasks.length) {
    els.taskBank.append(empty("保存タスクを作ると、カレンダーへドラッグできます。"));
    return;
  }
  tasks.forEach((task) => {
    const goal = findGoal(task.goalId);
    const item = document.createElement("article");
    item.className = `bank-task ${editingTaskId === task.id ? "editing" : ""}`;
    item.draggable = true;
    item.dataset.taskId = task.id;
    let nativeDragging = false;
    item.innerHTML = `
      <div class="bank-task-main">
        <span class="task-drag-handle" data-drag-handle draggable="true" role="button" tabindex="0" aria-label="カレンダーへドラッグ"></span>
        <div class="bank-task-copy">${taskMarkup(task, goal)}</div>
      </div>
      ${
        editingTaskId === task.id
          ? `
            <form class="task-edit-form" data-task-edit="${escapeHtml(task.id)}">
              <label>タスク名<input name="title" required maxlength="28" value="${escapeHtml(task.title)}" /></label>
              <label>目標<select name="goalId">${taskGoalOptions(task.goalId)}</select></label>
              <div class="field-row">
                <label>時間<input name="durationValue" type="number" min="1" max="240" step="1" value="${escapeHtml(task.durationValue ?? task.minutes ?? 30)}" /></label>
                <label>単位<select name="durationUnit">${durationUnitOptions(task.durationUnit ?? "minutes")}</select></label>
              </div>
              <div class="task-edit-actions">
                <button class="mini-button danger-button" type="button" data-action="delete-task">削除</button>
                <button class="mini-button" type="submit">保存</button>
                <button class="mini-button" type="button" data-action="close-edit">閉じる</button>
              </div>
            </form>
          `
          : ""
      }
      <div class="bank-task-actions">
        <button class="mini-button" type="button" data-action="today">今日に追加</button>
      </div>
    `;
    const dragHandle = item.querySelector("[data-drag-handle]");
    const beginBankDrag = (event) => {
      nativeDragging = true;
      event.dataTransfer.setData("text/plain", task.id);
      event.dataTransfer.effectAllowed = "copy";
      document.body.classList.add("is-scheduling");
      item.classList.add("dragging");
      vibrate(6);
      const preview = createDragPreview(task, goal);
      document.body.append(preview);
      event.dataTransfer.setDragImage(preview, 18, 18);
      requestAnimationFrame(() => preview.remove());
    };
    item.addEventListener("dragstart", (event) => {
      if (event.target.closest("button, input, textarea, select")) {
        event.preventDefault();
        return;
      }
      if (isCompactScheduleLayout() && !event.target.closest("[data-drag-handle]")) {
        event.preventDefault();
        return;
      }
      beginBankDrag(event);
    });
    item.addEventListener("dragend", () => {
      document.body.classList.remove("is-scheduling");
      document.querySelectorAll(".day-column.drop-target").forEach((column) => clearDropTargets(column));
      item.classList.remove("dragging");
      window.setTimeout(() => {
        nativeDragging = false;
      }, 0);
    });
    dragHandle.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      scheduleTask(task.id, toISO(today));
      activeScreen = "today";
      render();
    });
    item.addEventListener("pointerdown", (event) => startTouchScheduleDrag(event, task, goal, item));
    item.addEventListener("selectstart", (event) => event.preventDefault());
    item.addEventListener("contextmenu", (event) => {
      if (isCompactScheduleLayout()) event.preventDefault();
    });
    item.querySelector('[data-action="today"]').addEventListener("click", () => {
      scheduleTask(task.id, toISO(today));
      activeScreen = "today";
      render();
    });
    bindDoubleActivate(item.querySelector(".bank-task-copy"), () => {
      editingTaskId = editingTaskId === task.id ? "" : task.id;
      renderTaskBank();
    });
    item.querySelector("[data-task-edit]")?.addEventListener("submit", (event) => saveTaskEdit(event, task));
    item.querySelector('[data-action="close-edit"]')?.addEventListener("click", () => {
      editingTaskId = "";
      renderTaskBank();
    });
    item.querySelector('[data-action="delete-task"]')?.addEventListener("click", () => deleteSavedTask(task));
    els.taskBank.append(item);
  });
}

function bindTaskBankReturnDrop() {
  if (taskBankReturnDropBound) return;
  taskBankReturnDropBound = true;
  els.taskBank.addEventListener("dragover", handleTaskBankReturnDrag);
  els.taskBank.addEventListener("dragleave", handleTaskBankReturnLeave);
  els.taskBank.addEventListener("drop", handleTaskBankReturnDrop);
}

function isScheduledDrag(event) {
  return [...(event.dataTransfer?.types ?? [])].includes("application/x-goalflow-scheduled");
}

function handleTaskBankReturnDrag(event) {
  if (!isScheduledDrag(event)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  els.taskBank.classList.add("return-target");
}

function handleTaskBankReturnLeave(event) {
  if (!els.taskBank.contains(event.relatedTarget)) {
    els.taskBank.classList.remove("return-target");
  }
}

function handleTaskBankReturnDrop(event) {
  const scheduledId = event.dataTransfer.getData("application/x-goalflow-scheduled");
  if (!scheduledId) return;
  event.preventDefault();
  els.taskBank.classList.remove("return-target");
  document.body.classList.remove("is-scheduling", "is-returning-scheduled");
  const item = state.scheduled.find((candidate) => candidate.id === scheduledId);
  if (item) {
    deleteScheduledItem(item, "保存タスクに戻しました。");
  }
}

function taskGoalOptions(selectedId) {
  return state.goals
    .map((goal) => `<option value="${escapeHtml(goal.id)}" ${goal.id === selectedId ? "selected" : ""}>${escapeHtml(goal.name)}</option>`)
    .join("");
}

function durationUnitOptions(selectedUnit) {
  return `
    <option value="minutes" ${selectedUnit === "minutes" ? "selected" : ""}>分</option>
    <option value="hours" ${selectedUnit === "hours" ? "selected" : ""}>時間</option>
  `;
}

function bindDoubleActivate(node, callback) {
  if (!node) return;
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;
  const canActivate = (event) => {
    if (!(event.target instanceof Element)) return false;
    const interactive = event.target.closest("button, input, textarea, select, form");
    return !interactive || interactive === node;
  };
  node.addEventListener("dblclick", (event) => {
    if (!canActivate(event)) return;
    event.preventDefault();
    callback(event);
  });
  node.addEventListener("pointerup", (event) => {
    if (event.pointerType === "mouse" || !canActivate(event)) return;
    const now = Date.now();
    const distance = Math.hypot(event.clientX - lastTapX, event.clientY - lastTapY);
    if (now - lastTapTime < 340 && distance < 24) {
      event.preventDefault();
      lastTapTime = 0;
      callback(event);
      return;
    }
    lastTapTime = now;
    lastTapX = event.clientX;
    lastTapY = event.clientY;
  });
}

function scheduledEditForm(item) {
  return `
    <form class="task-edit-form scheduled-edit-form" data-scheduled-edit="${escapeHtml(item.id)}">
      <label>タスク名<input name="title" required maxlength="28" value="${escapeHtml(item.title)}" /></label>
      <label>目標<select name="goalId">${taskGoalOptions(item.goalId)}</select></label>
      <div class="field-row">
        <label>時間<input name="durationValue" type="number" min="1" max="240" step="1" value="${escapeHtml(item.durationValue ?? item.minutes ?? 30)}" /></label>
        <label>単位<select name="durationUnit">${durationUnitOptions(item.durationUnit ?? "minutes")}</select></label>
      </div>
      <div class="task-edit-actions">
        <button class="mini-button danger-button" type="button" data-action="delete-scheduled-edit">削除</button>
        <button class="mini-button" type="submit">保存</button>
        <button class="mini-button" type="button" data-action="close-scheduled-edit">閉じる</button>
      </div>
    </form>
  `;
}

function createDragPreview(task, goal) {
  const preview = document.createElement("div");
  preview.className = "drag-preview";
  preview.innerHTML = `
    <strong>${escapeHtml(task.title)}</strong>
    <span>${escapeHtml(goal?.category ?? "タスク")}・${escapeHtml(formatDuration(task))}</span>
  `;
  return preview;
}

function startTouchScheduleDrag(event, task, goal, item) {
  if (event.pointerType === "mouse" || !event.target.closest("[data-drag-handle]")) return;
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  let didStart = false;
  let currentTarget = null;
  let currentClientY = event.clientY;
  let preview = null;

  const startDrag = (clientX = startX, clientY = startY) => {
    if (didStart) return;
    didStart = true;
    try {
      item.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture can fail if the browser has already promoted the gesture.
    }
    document.body.classList.add("is-scheduling");
    item.classList.add("dragging");
    vibrate(6);
    preview = createDragPreview(task, goal);
    preview.classList.add("touch-drag-preview");
    document.body.append(preview);
    movePreview(clientX, clientY);
  };
  const movePreview = (clientX, clientY) => {
    if (!preview) return;
    preview.style.transform = `translate(${clientX + 14}px, ${clientY + 14}px)`;
  };
  const setTarget = (target) => {
    if (target === currentTarget) return;
    if (currentTarget) clearDropTargets(currentTarget);
    currentTarget = target;
    if (currentTarget) {
      setColumnDropTarget(currentTarget, currentClientY);
      vibrate(8);
    }
  };
  const onMove = (moveEvent) => {
    const deltaX = moveEvent.clientX - startX;
    const deltaY = moveEvent.clientY - startY;
    if (!didStart && Math.hypot(deltaX, deltaY) > 10) {
      startDrag(moveEvent.clientX, moveEvent.clientY);
    }
    if (!didStart) return;
    moveEvent.preventDefault();
    currentClientY = moveEvent.clientY;
    movePreview(moveEvent.clientX, moveEvent.clientY);
    preview.hidden = true;
    const target = getScheduleColumnFromPoint(moveEvent.clientX, moveEvent.clientY);
    preview.hidden = false;
    if (target === currentTarget && currentTarget) {
      setColumnDropTarget(currentTarget, currentClientY);
    } else {
      setTarget(target);
    }
  };
  const cleanup = (removeListeners = true) => {
    if (didStart) {
      document.body.classList.remove("is-scheduling");
      item.classList.remove("dragging");
    }
    if (currentTarget) clearDropTargets(currentTarget);
    preview?.remove();
    if (removeListeners) {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onCancel);
    }
  };
  const onUp = (upEvent) => {
    if (!didStart) {
      cleanup();
      return;
    }
    onMove(upEvent);
    const landingTarget = currentTarget ?? getScheduleColumnFromPoint(upEvent.clientX, upEvent.clientY);
    const date = landingTarget?.dataset.date;
    cleanup();
    if (date) {
      scheduleTask(task.id, date);
    }
  };
  const onCancel = () => cleanup();

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onCancel);
}

function renderCalendar() {
  const compactMonth = isCompactMonthView();
  const days =
    viewMode === "month"
      ? compactMonth
        ? getCompactMonthDays(monthCursor)
        : getMonthDays(monthCursor)
      : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  els.weekTitle.textContent = viewMode === "month" ? formatMonthTitle(monthCursor) : `${formatDate(days[0])} - ${formatDate(days[6])}`;
  els.calendarGrid.className = `calendar-grid ${viewMode === "month" ? "month-mode" : "week-mode"} ${compactMonth ? "compact-month-mode" : ""}`;
  els.calendarGrid.innerHTML = "";
  days.forEach((date) => {
    const iso = toISO(date);
    const column = document.createElement("section");
    const isOutsideMonth = viewMode === "month" && date.getMonth() !== monthCursor.getMonth();
    column.className = `day-column ${iso === toISO(today) ? "today" : ""} ${isOutsideMonth ? "outside-month" : ""} ${
      iso === highlightedScheduleDate ? "schedule-confirm" : ""
    }`;
    column.dataset.date = iso;
    column.innerHTML = `
      <div class="day-head">
        <span class="day-name">${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}</span>
        <span class="day-number">${date.getDate()}</span>
      </div>
      <div class="day-tasks"></div>
    `;
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      setColumnDropTarget(column, event.clientY);
    });
    column.addEventListener("dragleave", (event) => {
      if (!column.contains(event.relatedTarget)) clearDropTargets(column);
    });
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      document.body.classList.remove("is-scheduling");
      clearDropTargets(column);
      const scheduledId = event.dataTransfer.getData("application/x-goalflow-scheduled");
      if (scheduledId) {
        moveScheduledTask(scheduledId, iso);
        return;
      }
      scheduleTask(event.dataTransfer.getData("text/plain"), iso);
    });
    column.addEventListener("click", (event) => {
      if ((viewMode !== "month" && !isCompactScheduleLayout()) || document.body.classList.contains("is-scheduling") || event.target.closest(".scheduled-task")) return;
      openDayDialog(iso);
    });
    const list = column.querySelector(".day-tasks");
    const scheduled = state.scheduled.filter((item) => item.date === iso && (!selectedGoalId || item.goalId === selectedGoalId));
    if (scheduled.length) {
      scheduled.forEach((item) => list.append(scheduledElement(item, viewMode === "month")));
    }
    els.calendarGrid.append(column);
  });
}

function setColumnDropTarget(column, clientY) {
  column.classList.add("drop-target");
}

function clearDropTargets(column) {
  column.classList.remove("drop-target");
}

function getScheduleColumnFromPoint(clientX, clientY) {
  return document.elementFromPoint(clientX, clientY)?.closest(".day-column");
}

function isCompactScheduleLayout() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function isCompactMonthView() {
  return viewMode === "month" && isCompactScheduleLayout();
}

function getCompactMonthDays(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Array.from({ length: 35 }, (_, index) => addDays(firstDay, index));
}

function scheduledElement(item, isCompact = false) {
  const task = state.tasks.find((candidate) => candidate.id === item.taskId) ?? item;
  const goal = findGoal(item.goalId);
  const isEditing = editingScheduledId === item.id;
  const node = document.createElement("article");
  node.className = `scheduled-task ${item.done ? "done" : ""} ${item.id === highlightedCompletionId ? "just-completed" : ""} ${
    item.id === activeScheduleControlId || isEditing ? "active" : ""
  }`;
  node.draggable = true;
  node.tabIndex = 0;
  node.dataset.scheduledId = item.id;
  node.innerHTML = `
    ${taskMarkup({ ...task, title: item.title, minutes: item.minutes }, goal, isCompact)}
    <div class="task-actions">
      <button class="mini-button" type="button" data-action="done">${item.done ? "戻す" : "完了"}</button>
    </div>
    ${isEditing ? scheduledEditForm(item) : ""}
  `;
  node.addEventListener("click", (event) => {
    if (event.target.closest("button, input, textarea, select")) return;
    window.clearTimeout(scheduleControlTimer);
    scheduleControlTimer = window.setTimeout(() => {
      activeScheduleControlId = activeScheduleControlId === item.id ? "" : item.id;
      render();
    }, 180);
  });
  bindDoubleActivate(node, () => {
    window.clearTimeout(scheduleControlTimer);
    const willEdit = editingScheduledId !== item.id;
    editingScheduledId = willEdit ? item.id : "";
    activeScheduleControlId = willEdit ? item.id : "";
    render();
  });
  node.addEventListener("dragstart", (event) => {
    if (event.target.closest("button, input")) {
      event.preventDefault();
      return;
    }
    activeScheduleControlId = "";
    document.body.classList.add("is-scheduling", "is-returning-scheduled");
    node.classList.add("dragging");
    vibrate(6);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-goalflow-scheduled", item.id);
    event.dataTransfer.setData("text/plain", item.taskId);
    const preview = createDragPreview({ ...task, title: item.title, minutes: item.minutes }, goal);
    document.body.append(preview);
    event.dataTransfer.setDragImage(preview, 18, 18);
    requestAnimationFrame(() => preview.remove());
  });
  node.addEventListener("dragend", () => {
    document.body.classList.remove("is-scheduling", "is-returning-scheduled");
    els.taskBank.classList.remove("return-target");
    document.querySelectorAll(".day-column.drop-target").forEach((column) => clearDropTargets(column));
    node.classList.remove("dragging");
  });
  node.querySelector('[data-action="done"]').addEventListener("click", () => {
    toggleScheduledDone(item);
  });
  node.querySelector("[data-scheduled-edit]")?.addEventListener("submit", (event) => saveScheduledEdit(event, item));
  node.querySelector('[data-action="delete-scheduled-edit"]')?.addEventListener("click", () => deleteScheduledItem(item));
  node.querySelector('[data-action="close-scheduled-edit"]')?.addEventListener("click", () => {
    editingScheduledId = "";
    render();
  });
  return node;
}

function renderToday() {
  els.todayDate.textContent = formatDate(toISO(today));
  els.todayList.innerHTML = "";
  const items = state.scheduled.filter((item) => item.date === toISO(today));
  if (!items.length) {
    els.todayList.append(empty("今日の予定はまだありません。"));
    return;
  }
  items
    .sort((a, b) => a.title.localeCompare(b.title, "ja"))
    .forEach((item) => {
      const task = state.tasks.find((candidate) => candidate.id === item.taskId) ?? item;
      const goal = findGoal(item.goalId);
      const node = document.createElement("article");
      node.className = `today-task ${item.done ? "done" : ""} ${item.id === highlightedCompletionId ? "just-completed" : ""}`;
      node.innerHTML = `
        ${taskMarkup({ ...task, title: item.title, minutes: item.minutes }, goal)}
        <div class="task-actions">
          <button class="mini-button" type="button" data-action="done">${item.done ? "戻す" : "完了"}</button>
        </div>
        ${editingScheduledId === item.id ? scheduledEditForm(item) : ""}
      `;
      node.addEventListener("click", (event) => {
        if (event.target.closest("button, input, textarea, select")) return;
      });
      bindDoubleActivate(node, () => {
        editingScheduledId = editingScheduledId === item.id ? "" : item.id;
        render();
      });
      node.querySelector('[data-action="done"]').addEventListener("click", () => {
        toggleScheduledDone(item);
      });
      node.querySelector("[data-scheduled-edit]")?.addEventListener("submit", (event) => saveScheduledEdit(event, item));
      node.querySelector('[data-action="delete-scheduled-edit"]')?.addEventListener("click", () => deleteScheduledItem(item));
      node.querySelector('[data-action="close-scheduled-edit"]')?.addEventListener("click", () => {
        editingScheduledId = "";
        render();
      });
      els.todayList.append(node);
    });
}

function toggleScheduledDone(item) {
  item.done = !item.done;
  if (item.done) {
    highlightedCompletionId = item.id;
    showToast("完了を記録しました。今日の流れが少し前に進みました。");
    render();
    window.setTimeout(() => {
      if (highlightedCompletionId === item.id) {
        highlightedCompletionId = "";
        render();
      }
    }, 900);
    return;
  }
  render();
}

function renderSelectors() {
  const options = state.goals.map((goal) => `<option value="${goal.id}">${escapeHtml(goal.name)}</option>`).join("");
  els.taskGoalSelect.innerHTML = options;
  els.goalFilter.innerHTML = `<option value="">すべて</option>${options}`;
  els.taskGoalSelect.value = selectedGoalId || state.goals[0]?.id || "";
  els.goalFilter.value = selectedGoalId;
  els.chartMetric.value = chartMetric;
  els.pieMetric.value = pieMetric;
  els.chartMetricNote.textContent =
    chartMetric === "time" ? "完了したタスクの時間を日別に表示します。" : "完了したタスク数を日別に表示します。";
  els.pieMetricNote.textContent =
    pieMetric === "time" ? "完了した時間と未完了の時間の割合です。" : "完了と未完了の割合です。";
  els.weekView.classList.toggle("active", viewMode === "week");
  els.monthView.classList.toggle("active", viewMode === "month");
  els.weekView.setAttribute("aria-pressed", String(viewMode === "week"));
  els.monthView.setAttribute("aria-pressed", String(viewMode === "month"));
  els.todayPeriod.textContent = "今日に戻る";
  const todayIsVisible = isTodayVisibleInSchedule();
  els.todayPeriod.classList.toggle("needs-attention", !todayIsVisible);
  els.todayPeriod.setAttribute("aria-label", todayIsVisible ? "今日を表示中" : "今日に戻る");
  els.todayPeriod.title = todayIsVisible ? "今日を表示中" : "今日に戻る";
  els.calendarZoomOut.disabled = calendarSize === "compact";
  els.calendarZoomIn.disabled = calendarSize === "large";
}

function renderCategoryOptions() {
  if (!els.categoryOptions && !els.categoryPicker) return;
  const categories = new Set(["筋トレ", "勉強", "仕事", "健康", "習慣"]);
  state.goals.forEach((goal) => {
    if (goal.category) categories.add(goal.category);
  });
  const categoryList = [...categories];
  if (els.categoryOptions) {
    els.categoryOptions.innerHTML = categoryList.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("");
  }
  renderCategoryPicker(categoryList);
}

function renderCategoryPicker(categories) {
  if (!els.categoryPicker) return;
  const currentCategory = els.goalForm?.elements.namedItem("category")?.value ?? "";
  els.categoryPicker.innerHTML = categories
    .map(
      (category) => `
        <button class="category-chip ${category === currentCategory ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">
          ${escapeHtml(category)}
        </button>
      `,
    )
    .join("");
  els.categoryPicker.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      els.goalForm.elements.namedItem("category").value = button.dataset.category;
      renderCategoryPicker(categories);
    });
  });
}

function isTodayVisibleInSchedule() {
  const todayIso = toISO(today);
  if (viewMode === "month") {
    const days = isCompactMonthView() ? getCompactMonthDays(monthCursor) : getMonthDays(monthCursor);
    return days.some((date) => toISO(date) === todayIso);
  }
  return Array.from({ length: 7 }, (_, index) => toISO(addDays(weekStart, index))).includes(todayIso);
}

function renderOnboarding() {
  const shouldShow = activeScreen === "home" && !state.meta.onboardingDismissed && state.goals.length === 0;
  els.onboarding.hidden = !shouldShow;
  els.emptyStart.hidden = state.goals.length > 0;
}

function renderNextAction() {
  const todaysItems = state.scheduled.filter((item) => item.date === toISO(today));
  const todaysDone = todaysItems.filter((item) => item.done).length;
  const next = getNextAction(todaysItems, todaysDone);
  els.nextActionTitle.textContent = next.title;
  els.nextActionBody.textContent = next.body;
  els.nextActionButton.textContent = next.button;
  els.nextActionButton.dataset.action = next.action;
  els.buddyTitle.textContent = next.buddyTitle;
  els.buddyMessage.textContent = next.buddyMessage;
}

function getNextAction(todaysItems, todaysDone) {
  if (!state.goals.length) {
    return {
      title: "最初の目標を作成",
      body: "GoalFlowは目標から逆算するアプリです。まずは続けたい理由がある目標を1つだけ作りましょう。",
      button: "目標を作る",
      action: "createGoal",
      buddyTitle: "はじめの一歩",
      buddyMessage: "大きな計画より、続けたい理由が1つあるだけで十分です。",
    };
  }

  if (!state.tasks.length) {
    return {
      title: "今日やれるサイズに分ける",
      body: "目標を作れました。次は15分から30分で終わる小さなタスクを保存しましょう。",
      button: "タスクを追加",
      action: "createTask",
      buddyTitle: "逆算を始める",
      buddyMessage: "目標があるなら、次は今日できる形に小さくします。",
    };
  }

  if (!todaysItems.length) {
    return {
      title: "今日やることを追加",
      body: "保存タスクを今日に入れると、予定ではなく行動に変わります。タスク画面の「今日に追加」からすぐ追加できます。",
      button: "スケジュールで追加",
      action: "openTasks",
      buddyTitle: "今日に落とす",
      buddyMessage: "目標は遠くても、今日の1つなら動かせます。",
    };
  }

  if (todaysDone < todaysItems.length) {
    return {
      title: "今日の1つを完了する",
      body: `今日は${todaysItems.length}件中${todaysDone}件完了です。まず1件だけ終わらせて、流れを作りましょう。`,
      button: "今日のタスクを見る",
      action: "openToday",
      buddyTitle: "あと少し",
      buddyMessage: "完璧より記録です。1つ完了すると、明日の自分が楽になります。",
    };
  }

  return {
    title: "今日の流れは完了",
    body: "今日のタスクは完了しています。余力があれば明日の自分に渡すタスクを1つだけ用意しましょう。",
    button: "スケジュールを見る",
    action: "openSchedule",
    buddyTitle: "いい継続です",
    buddyMessage: "完了が記録に変わりました。この小さい積み上げがGoalFlowの中心です。",
  };
}

function renderScreenTabs() {
  els.screenTabs.forEach((tab) => {
    const isActive = tab.dataset.screenTarget === activeScreen;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });
  centerActiveScreenTab();
}

function centerActiveScreenTab() {
  const activeTab = [...els.screenTabs].find((tab) => tab.dataset.screenTarget === activeScreen);
  activeTab?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
}

function renderSummary() {
  const done = state.scheduled.filter((item) => item.done).length;
  const total = state.scheduled.length;
  const todayIso = toISO(today);
  const weekDates = getCurrentWeekDates();
  const todayTotal = state.scheduled.filter((item) => item.date === todayIso).length;
  const weekTotal = state.scheduled.filter((item) => weekDates.includes(item.date)).length;
  const todayRate = calcCompletionRate((item) => item.date === todayIso);
  const weekRate = calcCompletionRate((item) => weekDates.includes(item.date));
  const overallRate = total ? Math.round((done / total) * 100) : 0;
  els.summaryTodayRate.textContent = `${todayRate}%`;
  els.summaryWeekRate.textContent = `${weekRate}%`;
  els.summaryOverallRate.textContent = `${overallRate}%`;
  els.todayRateMeter.style.width = `${todayRate}%`;
  els.weekRateMeter.style.width = `${weekRate}%`;
  els.overallRateMeter.style.width = `${overallRate}%`;
  els.summaryStreak.textContent = `${calcStreak()}日`;
  document.body.classList.toggle("today-complete", todayTotal > 0 && todayRate === 100);
  document.body.classList.toggle("week-complete", weekTotal > 0 && weekRate === 100);
  document.body.classList.toggle("overall-complete", total > 0 && overallRate === 100);
}

function renderChart() {
  const ctx = els.chart.getContext("2d");
  const displayWidth = Math.round(els.chart.parentElement?.clientWidth || els.chart.clientWidth || 760);
  els.chart.width = Math.max(320, displayWidth - 2);
  els.chart.height = 260;
  const width = els.chart.width;
  const height = els.chart.height;
  if (!state.scheduled.length) {
    window.cancelAnimationFrame(chartAnimationFrame);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = canvasColor("--canvas-bg", "#fbfcfa");
    ctx.fillRect(0, 0, width, height);
    drawEmptyCanvas(ctx, width, height, "目標を作って、今日のタスクを完了するとグラフが育ちます。");
    return;
  }
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const values = days.map((date) => {
    const iso = toISO(date);
    const doneItems = state.scheduled.filter((item) => item.date === iso && item.done && (!selectedGoalId || item.goalId === selectedGoalId));
    return metricValue(doneItems, chartMetric);
  });
  const max = Math.max(1, ...values);
  const labels = chartMetricLabels(chartMetric);
  const paddingX = width < 420 ? 22 : 34;
  const paddingTop = 30;
  const paddingBottom = 38;
  const gap = width < 420 ? 6 : 10;
  const barWidth = Math.max(14, (width - paddingX * 2 - gap * (values.length - 1)) / values.length);
  const draw = (progress) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = canvasColor("--canvas-bg", "#fbfcfa");
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = canvasColor("--canvas-line", "#dfe3da");
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingX, height - paddingBottom);
    ctx.lineTo(width - paddingX, height - paddingBottom);
    ctx.stroke();
    ctx.fillStyle = canvasColor("--canvas-muted", "#6b7066");
    ctx.font = `${width < 420 ? 10 : 12}px system-ui`;
    ctx.textAlign = "left";
    ctx.fillText(labels.caption, paddingX, 18);
    values.forEach((value, index) => {
      const x = paddingX + index * (barWidth + gap);
      const animatedValue = value * progress;
      const barHeight = ((height - paddingTop - paddingBottom) * animatedValue) / max;
      const y = height - paddingBottom - barHeight;
      const radius = Math.min(8, barWidth / 2);
      ctx.fillStyle = index === values.length - 1 ? canvasColor("--accent", "#146c63") : canvasColor("--blue", "#2f69c8");
      roundedRect(ctx, x, y, barWidth, barHeight || 3, radius);
      ctx.fill();
      ctx.fillStyle = canvasColor("--canvas-muted", "#6b7066");
      ctx.font = `${width < 420 ? 10 : 12}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(`${days[index].getMonth() + 1}/${days[index].getDate()}`, x + barWidth / 2, height - 14);
      if (value > 0) {
        ctx.fillStyle = canvasColor("--ink", "#20231f");
        ctx.font = `800 ${width < 420 ? 10 : 12}px system-ui`;
        ctx.fillText(formatMetricValue(animatedValue, chartMetric), x + barWidth / 2, Math.max(18, y - 8));
      }
    });
  };
  animateCanvas("chart", draw, 620);
}

function renderCompletionPie() {
  const ctx = els.completionPie.getContext("2d");
  const displayWidth = Math.round(els.completionPie.parentElement?.clientWidth || els.completionPie.clientWidth || 360);
  els.completionPie.width = Math.max(280, displayWidth - 2);
  els.completionPie.height = 260;
  const width = els.completionPie.width;
  const height = els.completionPie.height;
  const filteredItems = state.scheduled.filter((item) => !selectedGoalId || item.goalId === selectedGoalId);
  const doneItems = filteredItems.filter((item) => item.done);
  const total = metricValue(filteredItems, pieMetric);
  const done = metricValue(doneItems, pieMetric);
  const pending = Math.max(0, total - done);
  const rate = total ? Math.round((done / total) * 100) : 0;
  const centerX = width / 2;
  const centerY = height / 2 - 4;
  const radius = Math.min(width, height) * 0.3;
  const start = -Math.PI / 2;
  const doneAngle = total ? (Math.PI * 2 * done) / total : 0;
  const labels = chartMetricLabels(pieMetric);

  if (!total) {
    window.cancelAnimationFrame(pieAnimationFrame);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = canvasColor("--canvas-bg", "#fbfcfa");
    ctx.fillRect(0, 0, width, height);
    drawEmptyCanvas(ctx, width, height, "完了したタスクがここに割合で表示されます。");
    return;
  }

  const draw = (progress) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = canvasColor("--canvas-bg", "#fbfcfa");
    ctx.fillRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = canvasColor("--canvas-line", "#e4e9df");
    ctx.fill();

    if (done > 0) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, start, start + doneAngle * progress);
      ctx.closePath();
      ctx.fillStyle = canvasColor("--accent", "#146c63");
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.58, 0, Math.PI * 2);
    ctx.fillStyle = canvasColor("--canvas-bg", "#fbfcfa");
    ctx.fill();

    ctx.fillStyle = canvasColor("--ink", "#20231f");
    ctx.font = "800 34px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(rate * progress)}%`, centerX, centerY + 8);
    ctx.fillStyle = canvasColor("--canvas-muted", "#6b7066");
    ctx.font = "13px system-ui";
    ctx.fillText(`${labels.name}の達成率`, centerX, centerY + 32);

    drawLegend(ctx, 26, height - 36, canvasColor("--accent", "#146c63"), `完了 ${formatMetricValue(done * progress, pieMetric)}`);
    drawLegend(ctx, Math.max(26, width - 156), height - 36, canvasColor("--canvas-line", "#e4e9df"), `未完了 ${formatMetricValue(pending, pieMetric)}`);
  };
  animateCanvas("pie", draw, 680);
}

function renderGoalReport() {
  els.goalReport.innerHTML = "";
  const head = document.createElement("div");
  head.className = "report-head";
  head.innerHTML = "<span>目標</span><span>開始</span><span>記録（個）</span><span>進み具合</span>";
  els.goalReport.append(head);

  if (!state.goals.length) {
    els.goalReport.append(empty("目標を追加すると、ここに進捗表が出ます。"));
    return;
  }

  state.goals.forEach((goal) => {
    const items = state.scheduled.filter((item) => item.goalId === goal.id);
    const done = items.filter((item) => item.done).length;
    const rate = items.length ? Math.round((done / items.length) * 100) : 0;
    const daysActive = Math.max(1, daysBetween(goal.createdAt, today) + 1);
    const daysLeft = daysBetween(today, goal.deadline);
    const progressText = items.length ? `${done}/${items.length}個` : "未予定";
    const startText = `${formatDate(goal.createdAt)}から${daysActive}日目`;
    const supportText = daysLeft >= 0 ? `期限まであと${daysLeft}日` : `期限から${Math.abs(daysLeft)}日`;
    const row = document.createElement("div");
    row.className = "report-row";
    row.innerHTML = `
      <div class="report-title"><span>${escapeHtml(goal.name)}</span></div>
      <span class="report-start">${escapeHtml(startText)}</span>
      <span class="report-rate">${escapeHtml(progressText)}</span>
      <div class="report-progress-cell">
        <div class="report-progress" aria-label="${escapeHtml(goal.name)}の達成率 ${rate}%"><span style="width: ${rate}%"></span></div>
        <span class="report-support">${escapeHtml(supportText)}</span>
      </div>
    `;
    els.goalReport.append(row);
  });
}

function drawLegend(ctx, x, y, color, text) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 10, 12, 12);
  ctx.fillStyle = canvasColor("--canvas-muted", "#6b7066");
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(text, x + 18, y);
}

function canvasColor(name, fallback) {
  return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
}

function metricValue(items, metric) {
  if (metric === "time") return items.reduce((sum, item) => sum + Number(item.minutes ?? 0), 0);
  return items.length;
}

function chartMetricLabels(metric) {
  if (metric === "time") {
    return { name: "時間", caption: "完了した時間" };
  }
  return { name: "個数", caption: "完了した個数" };
}

function formatMetricValue(value, metric) {
  if (metric === "time") {
    const minutes = Math.round(value);
    if (minutes >= 60) {
      const hours = minutes / 60;
      return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
    }
    return `${minutes}分`;
  }
  return `${Math.round(value)}個`;
}

function animateCanvas(kind, draw, duration) {
  const frameKey = kind === "pie" ? "pieAnimationFrame" : "chartAnimationFrame";
  window.cancelAnimationFrame(kind === "pie" ? pieAnimationFrame : chartAnimationFrame);
  const start = performance.now();
  const step = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    draw(easeOutCubic(progress));
    if (progress < 1) {
      if (frameKey === "pieAnimationFrame") {
        pieAnimationFrame = window.requestAnimationFrame(step);
      } else {
        chartAnimationFrame = window.requestAnimationFrame(step);
      }
    }
  };
  if (frameKey === "pieAnimationFrame") {
    pieAnimationFrame = window.requestAnimationFrame(step);
  } else {
    chartAnimationFrame = window.requestAnimationFrame(step);
  }
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawEmptyCanvas(ctx, width, height, text) {
  ctx.fillStyle = canvasColor("--canvas-bg", "#fbfcfa");
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = canvasColor("--canvas-muted", "#6b7066");
  ctx.font = "14px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2);
}

function taskMarkup(task, goal, isCompact = false) {
  const duration = formatDuration(task);
  const meta = isCompact ? `${goal?.name ?? "未設定"}` : `${goal?.name ?? "未設定"}・${duration}`;
  return `
    <div class="task-title"><span>${escapeHtml(task.title)}</span></div>
    <p class="task-meta">${escapeHtml(meta)}</p>
  `;
}

function deleteGoal(goal) {
  const ok = window.confirm(`「${goal.name}」を削除しますか？\n紐づく保存タスクと予定も削除されます。`);
  if (!ok) return false;
  state.goals = state.goals.filter((candidate) => candidate.id !== goal.id);
  state.tasks = state.tasks.filter((task) => task.goalId !== goal.id);
  state.scheduled = state.scheduled.filter((item) => item.goalId !== goal.id);
  selectedGoalId = state.goals[0]?.id ?? "";
  showToast("目標を削除しました。");
  render();
  return true;
}

function deleteSavedTask(task) {
  const relatedCount = state.scheduled.filter((item) => item.taskId === task.id).length;
  const message = relatedCount
    ? `「${task.title}」を削除しますか？\nカレンダー上の同じ予定 ${relatedCount}件も削除されます。`
    : `「${task.title}」を削除しますか？`;
  if (!window.confirm(message)) return;
  state.tasks = state.tasks.filter((candidate) => candidate.id !== task.id);
  state.scheduled = state.scheduled.filter((item) => item.taskId !== task.id);
  showToast("保存タスクを削除しました。");
  render();
}

function deleteScheduledItem(item, message = "予定から削除しました。") {
  state.scheduled = state.scheduled.filter((candidate) => candidate.id !== item.id);
  if (activeScheduleControlId === item.id) activeScheduleControlId = "";
  if (editingScheduledId === item.id) editingScheduledId = "";
  showToast(message);
  render();
}

function saveTaskEdit(event, task) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const durationValue = Number(data.get("durationValue"));
  const durationUnit = data.get("durationUnit");
  const title = data.get("title").trim();
  if (!title || !durationValue) return;
  task.title = title;
  task.goalId = data.get("goalId");
  task.durationValue = durationValue;
  task.durationUnit = durationUnit;
  task.minutes = durationUnit === "hours" ? durationValue * 60 : durationValue;
  state.scheduled.forEach((item) => {
    if (item.taskId !== task.id) return;
    item.title = task.title;
    item.goalId = task.goalId;
    item.minutes = task.minutes;
    item.durationValue = task.durationValue;
    item.durationUnit = task.durationUnit;
  });
  selectedGoalId = task.goalId;
  editingTaskId = "";
  showToast("保存タスクを更新しました。");
  render();
}

function saveScheduledEdit(event, item) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const durationValue = Number(data.get("durationValue"));
  const durationUnit = data.get("durationUnit");
  const title = data.get("title").trim();
  if (!title || !durationValue) return;
  item.title = title;
  item.goalId = data.get("goalId");
  item.durationValue = durationValue;
  item.durationUnit = durationUnit;
  item.minutes = durationUnit === "hours" ? durationValue * 60 : durationValue;
  selectedGoalId = item.goalId;
  editingScheduledId = "";
  activeScheduleControlId = item.id;
  showToast("予定を更新しました。");
  render();
}

function openDayDialog(date) {
  const items = state.scheduled
    .filter((item) => item.date === date && (!selectedGoalId || item.goalId === selectedGoalId))
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));
  els.dayDialogTitle.textContent = `${formatDateWithWeekday(date)}の予定`;
  els.dayDialogList.innerHTML = items.length
    ? items
        .map((item) => {
          const goal = findGoal(item.goalId);
          return `
            <article class="day-dialog-item ${item.done ? "done" : ""}">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(goal?.name ?? "目標なし")}・${escapeHtml(formatDuration(item))}</span>
              </div>
              <button class="mini-button" type="button" data-day-done="${escapeHtml(item.id)}">${item.done ? "戻す" : "完了"}</button>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">この日の予定はまだありません。</div>`;
  els.dayDialogList.querySelectorAll("[data-day-done]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.scheduled.find((candidate) => candidate.id === button.dataset.dayDone);
      if (!item) return;
      toggleScheduledDone(item);
      openDayDialog(date);
    });
  });
  if (!els.dayDialog.open) els.dayDialog.showModal();
}

function formatDateWithWeekday(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}（${["日", "月", "火", "水", "木", "金", "土"][date.getDay()]}）`;
}

function scheduleTask(taskId, date) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;
  state.scheduled.push(makeSchedule(task, date, false));
  highlightedScheduleDate = date;
  activeScheduleControlId = "";
  window.clearTimeout(highlightedScheduleTimer);
  highlightedScheduleTimer = window.setTimeout(() => {
    highlightedScheduleDate = "";
    render();
  }, 720);
  vibrate(date === toISO(today) ? 18 : 10);
  showToast(date === toISO(today) ? "今日に追加しました。あとは1つ完了するだけです。" : "予定を追加しました。");
  render();
}

function moveScheduledTask(scheduledId, date) {
  const item = state.scheduled.find((candidate) => candidate.id === scheduledId);
  if (!item) return;
  item.date = date;
  highlightedScheduleDate = date;
  activeScheduleControlId = "";
  window.clearTimeout(highlightedScheduleTimer);
  highlightedScheduleTimer = window.setTimeout(() => {
    highlightedScheduleDate = "";
    render();
  }, 720);
  vibrate(12);
  showToast("予定を移動しました。");
  render();
}

function vibrate(duration = 8) {
  if (window.navigator?.vibrate) window.navigator.vibrate(duration);
}

function makeSchedule(task, date, done) {
  return {
    id: crypto.randomUUID(),
    taskId: task.id,
    goalId: task.goalId,
    title: task.title,
    minutes: task.minutes,
    durationValue: task.durationValue ?? task.minutes,
    durationUnit: task.durationUnit ?? "minutes",
    date,
    done,
  };
}

function calcStreak() {
  let streak = 0;
  for (let i = 0; i < 60; i += 1) {
    const date = toISO(addDays(today, -i));
    const hasDone = state.scheduled.some((item) => item.date === date && item.done);
    if (!hasDone) break;
    streak += 1;
  }
  return streak;
}

function calcCompletionRate(filterFn) {
  const items = state.scheduled.filter(filterFn);
  if (!items.length) return 0;
  const done = items.filter((item) => item.done).length;
  return Math.round((done / items.length) * 100);
}

function getCurrentWeekDates() {
  const start = getWeekStart(today);
  return Array.from({ length: 7 }, (_, index) => toISO(addDays(start, index)));
}

function formatDuration(task) {
  const unit = task.durationUnit ?? "minutes";
  const value = task.durationValue ?? task.minutes;
  if (unit === "hours") return `${value}時間`;
  return `${value}分`;
}

function findGoal(goalId) {
  return state.goals.find((goal) => goal.id === goalId);
}

function empty(text) {
  const node = document.createElement("div");
  node.className = "empty-state";
  node.textContent = text;
  return node;
}

function getWeekStart(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function getMonthDays(date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = getWeekStart(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toISO(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatDate(value) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatMonthTitle(date) {
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
}

function daysBetween(start, end) {
  const startDate = typeof start === "string" ? new Date(`${start}T00:00:00`) : start;
  const endDate = typeof end === "string" ? new Date(`${end}T00:00:00`) : end;
  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endMidnight = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return Math.round((endMidnight - startMidnight) / 86400000);
}

function updateDurationInput() {
  const input = els.taskForm.elements.namedItem("minutes");
  const unit = els.taskForm.elements.namedItem("durationUnit").value;
  if (unit === "hours") {
    input.min = "0.5";
    input.max = "12";
    input.step = "0.5";
    if (Number(input.value) > 12) input.value = "1";
  } else {
    input.min = "5";
    input.max = "240";
    input.step = "5";
    if (Number(input.value) < 5) input.value = "30";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

els.openGoalDialog.addEventListener("click", openGoalDialog);

els.openTaskDialog.addEventListener("click", () => {
  if (!state.goals.length) {
    activeScreen = "goals";
    render();
    openGoalDialog();
    return;
  }
  els.taskForm.reset();
  updateDurationInput();
  renderSelectors();
  els.taskDialog.showModal();
});

function openGoalDialog(goal = null) {
  els.goalForm.reset();
  editingGoalId = goal?.id ?? "";
  els.goalForm.dataset.editingGoalId = editingGoalId;
  els.deleteGoalFromDialog.hidden = !goal;
  els.goalForm.querySelector("h2").textContent = goal ? "目標を編集" : "目標を作る";
  els.goalForm.elements.namedItem("name").value = goal?.name ?? "";
  els.goalForm.elements.namedItem("category").value = goal?.category ?? "";
  els.goalForm.elements.namedItem("createdAt").value = goal?.createdAt ?? toISO(today);
  els.goalForm.elements.namedItem("deadline").value = goal?.deadline ?? addDays(today, 30).toISOString().slice(0, 10);
  els.goalForm.elements.namedItem("note").value = goal?.note ?? "";
  renderCategoryOptions();
  els.goalDialog.showModal();
}

els.goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.goalForm);
  const editingGoal = state.goals.find((goal) => goal.id === els.goalForm.dataset.editingGoalId);
  const goal = editingGoal ?? {
    id: crypto.randomUUID(),
  };
  Object.assign(goal, {
    name: data.get("name").trim(),
    category: data.get("category").trim() || "未分類",
    createdAt: data.get("createdAt"),
    deadline: data.get("deadline"),
    note: data.get("note").trim(),
  });
  if (!editingGoal) state.goals.push(goal);
  state.meta.onboardingDismissed = true;
  selectedGoalId = goal.id;
  editingGoalId = "";
  delete els.goalForm.dataset.editingGoalId;
  els.goalDialog.close();
  render();
});

els.deleteGoalFromDialog.addEventListener("click", () => {
  const goal = state.goals.find((candidate) => candidate.id === els.goalForm.dataset.editingGoalId);
  if (!goal) return;
  if (deleteGoal(goal)) els.goalDialog.close();
});

els.goalDialog.addEventListener("pointerdown", (event) => {
  if (event.target !== els.goalDialog) return;
  editingGoalId = "";
  els.goalDialog.close();
});

els.goalDialog.addEventListener("close", () => {
  editingGoalId = "";
  delete els.goalForm.dataset.editingGoalId;
});

els.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.taskForm);
  const durationValue = Number(data.get("minutes"));
  const durationUnit = data.get("durationUnit");
  state.tasks.push({
    id: crypto.randomUUID(),
    title: data.get("title").trim(),
    goalId: data.get("goalId"),
    minutes: durationUnit === "hours" ? durationValue * 60 : durationValue,
    durationValue,
    durationUnit,
  });
  selectedGoalId = data.get("goalId");
  els.taskDialog.close();
  render();
});

els.taskForm.elements.namedItem("durationUnit").addEventListener("change", updateDurationInput);
els.goalForm.elements.namedItem("category").addEventListener("input", () => renderCategoryOptions());

document.querySelector("#prevPeriod").addEventListener("click", () => {
  if (isCompactMonthView()) {
    monthCursor = addMonths(monthCursor, -1);
    weekStart = getWeekStart(monthCursor);
  } else if (viewMode === "month") {
    monthCursor = addMonths(monthCursor, -1);
  } else {
    weekStart = addDays(weekStart, -7);
  }
  render();
});

document.querySelector("#nextPeriod").addEventListener("click", () => {
  if (isCompactMonthView()) {
    monthCursor = addMonths(monthCursor, 1);
    weekStart = getWeekStart(monthCursor);
  } else if (viewMode === "month") {
    monthCursor = addMonths(monthCursor, 1);
  } else {
    weekStart = addDays(weekStart, 7);
  }
  render();
});

document.querySelector("#todayPeriod").addEventListener("click", () => {
  weekStart = getWeekStart(today);
  monthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  render();
});

els.weekView.addEventListener("click", () => {
  viewMode = "week";
  render();
});

els.monthView.addEventListener("click", () => {
  viewMode = "month";
  render();
});

els.calendarZoomOut.addEventListener("click", () => {
  const sizes = ["compact", "normal", "large"];
  calendarSize = sizes[Math.max(0, sizes.indexOf(calendarSize) - 1)];
  state.meta.calendarSize = calendarSize;
  render();
});

els.calendarZoomIn.addEventListener("click", () => {
  const sizes = ["compact", "normal", "large"];
  calendarSize = sizes[Math.min(sizes.length - 1, sizes.indexOf(calendarSize) + 1)];
  state.meta.calendarSize = calendarSize;
  render();
});

let calendarDragScroll = null;

els.calendarScroll.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0) return;
  if (event.target.closest(".scheduled-task, button, input, textarea, select")) return;
  calendarDragScroll = {
    pointerId: event.pointerId,
    startX: event.clientX,
    scrollLeft: els.calendarScroll.scrollLeft,
    moved: false,
  };
  els.calendarScroll.setPointerCapture?.(event.pointerId);
});

els.calendarScroll.addEventListener("pointermove", (event) => {
  if (!calendarDragScroll || calendarDragScroll.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - calendarDragScroll.startX;
  if (Math.abs(deltaX) > 4) calendarDragScroll.moved = true;
  els.calendarScroll.scrollLeft = calendarDragScroll.scrollLeft - deltaX;
  if (calendarDragScroll.moved) event.preventDefault();
});

els.calendarScroll.addEventListener("pointerup", (event) => {
  if (!calendarDragScroll || calendarDragScroll.pointerId !== event.pointerId) return;
  calendarDragScroll = null;
});

els.calendarScroll.addEventListener("pointercancel", () => {
  calendarDragScroll = null;
});

els.screenTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveScreen(tab.dataset.screenTarget);
  });
});

function setActiveScreen(screen, direction = 0) {
  if (!screenOrder.includes(screen) || screen === activeScreen) return;
  activeScreen = screen;
  if (direction) {
    document.body.dataset.tabDirection = String(direction);
    window.setTimeout(() => delete document.body.dataset.tabDirection, 220);
  }
  render();
}

let tabSwipeStartX = 0;
let tabSwipeStartY = 0;
let tabSwipeDeltaX = 0;
let tabSwipeActive = false;

document.addEventListener(
  "touchstart",
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (event.touches.length !== 1 || target?.closest("dialog, input, textarea, select, button, .bank-task, .scheduled-task")) return;
    tabSwipeStartX = event.touches[0].clientX;
    tabSwipeStartY = event.touches[0].clientY;
    tabSwipeDeltaX = 0;
    tabSwipeActive = true;
  },
  { passive: true },
);

document.addEventListener(
  "touchmove",
  (event) => {
    if (!tabSwipeActive) return;
    const touch = event.touches[0];
    tabSwipeDeltaX = touch.clientX - tabSwipeStartX;
    const deltaY = touch.clientY - tabSwipeStartY;
    if (Math.abs(deltaY) > Math.abs(tabSwipeDeltaX) * 1.15) {
      tabSwipeActive = false;
      document.body.style.removeProperty("--tab-swipe-x");
      return;
    }
    document.body.style.setProperty("--tab-swipe-x", `${Math.max(-42, Math.min(42, tabSwipeDeltaX / 4))}px`);
  },
  { passive: true },
);

document.addEventListener("touchend", () => {
  if (!tabSwipeActive) return;
  document.body.style.removeProperty("--tab-swipe-x");
  const currentIndex = screenOrder.indexOf(activeScreen);
  const nextIndex = tabSwipeDeltaX < -60 ? currentIndex + 1 : tabSwipeDeltaX > 60 ? currentIndex - 1 : currentIndex;
  tabSwipeActive = false;
  if (nextIndex !== currentIndex && screenOrder[nextIndex]) {
    setActiveScreen(screenOrder[nextIndex], Math.sign(nextIndex - currentIndex));
  }
});

document.addEventListener("touchcancel", () => {
  tabSwipeActive = false;
  document.body.style.removeProperty("--tab-swipe-x");
});

els.goalFilter.addEventListener("change", (event) => {
  selectedGoalId = event.target.value;
  render();
});

els.chartMetric.addEventListener("change", (event) => {
  chartMetric = event.target.value;
  render();
});

els.pieMetric.addEventListener("change", (event) => {
  pieMetric = event.target.value;
  render();
});

els.themeToggle.addEventListener("click", () => {
  state.meta.theme = state.meta.theme === "dark" ? "light" : "dark";
  render();
});

els.startFirstGoal.addEventListener("click", () => {
  activeScreen = "goals";
  render();
  openGoalDialog();
});

els.emptyCreateGoal.addEventListener("click", () => {
  activeScreen = "goals";
  render();
  openGoalDialog();
});

els.nextActionButton.addEventListener("click", () => {
  const action = els.nextActionButton.dataset.action;
  if (action === "createGoal") {
    activeScreen = "goals";
    render();
    openGoalDialog();
  }
  if (action === "createTask") {
    activeScreen = "schedule";
    render();
    els.openTaskDialog.click();
  }
  if (action === "openTasks") {
    activeScreen = "schedule";
    render();
  }
  if (action === "openToday") {
    activeScreen = "today";
    render();
  }
  if (action === "openSchedule") {
    activeScreen = "schedule";
    render();
  }
});

els.dismissOnboarding.addEventListener("click", () => {
  state.meta.onboardingDismissed = true;
  render();
});

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js?v=20260520-calendarpan")
      .then((registration) => registration.update())
      .catch(() => {
        showToast("オフライン準備に失敗しました。");
      });
  });
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2600);
}

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => {
    button.closest("dialog")?.close();
  });
});

window.setTimeout(() => {
  els.launchScreen?.remove();
}, 1900);

render();
