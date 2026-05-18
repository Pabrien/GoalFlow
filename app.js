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
let activeTimeEditId = "";
let activeScheduleControlId = "";

const els = {
  goalList: document.querySelector("#goalList"),
  taskBank: document.querySelector("#taskBank"),
  calendarGrid: document.querySelector("#calendarGrid"),
  todayList: document.querySelector("#todayList"),
  goalDialog: document.querySelector("#goalDialog"),
  taskDialog: document.querySelector("#taskDialog"),
  goalForm: document.querySelector("#goalForm"),
  taskForm: document.querySelector("#taskForm"),
  openGoalDialog: document.querySelector("#openGoalDialog"),
  openTaskDialog: document.querySelector("#openTaskDialog"),
  taskGoalSelect: document.querySelector("#taskGoalSelect"),
  goalFilter: document.querySelector("#goalFilter"),
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
  screenTabs: document.querySelectorAll("[data-screen-target]"),
  onboarding: document.querySelector("#onboarding"),
  startFirstGoal: document.querySelector("#startFirstGoal"),
  dismissOnboarding: document.querySelector("#dismissOnboarding"),
  emptyStart: document.querySelector("#emptyStart"),
  emptyCreateGoal: document.querySelector("#emptyCreateGoal"),
  saveStatus: document.querySelector("#saveStatus"),
  notifyButton: document.querySelector("#notifyButton"),
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
      deadline: addDays(today, 88).toISOString().slice(0, 10),
      note: "週3回の重量管理。無理なく継続する。",
    },
    {
      id: crypto.randomUUID(),
      name: "英語ニュースを毎日読む",
      category: "勉強",
      deadline: addDays(today, 45).toISOString().slice(0, 10),
      note: "朝に15分。読んだ記事を一言で要約する。",
    },
  ];
  const tasks = [
    { id: crypto.randomUUID(), goalId: goals[0].id, title: "胸・肩トレ", minutes: 70, durationValue: 70, durationUnit: "minutes", reminder: "30分前" },
    { id: crypto.randomUUID(), goalId: goals[0].id, title: "フォーム動画チェック", minutes: 15, durationValue: 15, durationUnit: "minutes", reminder: "10分前" },
    { id: crypto.randomUUID(), goalId: goals[1].id, title: "英語ニュース 1本", minutes: 20, durationValue: 20, durationUnit: "minutes", reminder: "朝・昼・夜" },
    { id: crypto.randomUUID(), goalId: goals[1].id, title: "単語レビュー 30個", minutes: 15, durationValue: 15, durationUnit: "minutes", reminder: "毎時間" },
  ];
  return {
    goals,
    tasks,
    scheduled: [
      makeSchedule(tasks[0], dates[1], "19:00", true),
      makeSchedule(tasks[2], dates[2], "08:00", false),
      makeSchedule(tasks[3], dates[3], "21:30", false),
      makeSchedule(tasks[0], dates[5], "10:00", false),
    ],
  };
}

function loadState() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return createEmptyState();
  try {
    const parsed = JSON.parse(saved);
    return {
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      scheduled: Array.isArray(parsed.scheduled) ? parsed.scheduled : [],
      meta: {
        onboardingDismissed: Boolean(parsed.meta?.onboardingDismissed),
        lastVisitDate: parsed.meta?.lastVisitDate ?? "",
        visitStreak: Number(parsed.meta?.visitStreak ?? 0),
      },
    };
  } catch {
    return createEmptyState();
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (els.saveStatus) {
    els.saveStatus.textContent = `保存済み ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`;
  }
}

function render() {
  renderFileWarning();
  renderNotificationState();
  document.body.dataset.viewMode = viewMode;
  document.body.dataset.activeScreen = activeScreen;
  document.body.dataset.hasGoals = String(state.goals.length > 0);
  if (!state.goals.some((goal) => goal.id === selectedGoalId)) {
    selectedGoalId = state.goals[0]?.id ?? "";
  }
  renderGoals();
  renderTaskBank();
  renderCalendar();
  renderToday();
  renderSelectors();
  renderScreenTabs();
  renderOnboarding();
  renderNextAction();
  renderSummary();
  renderChart();
  renderCompletionPie();
  renderGoalReport();
  saveState();
}

function renderFileWarning() {
  if (!els.fileWarning) return;
  els.fileWarning.hidden = window.location.protocol !== "file:";
}

function renderNotificationState() {
  if (!els.notifyButton) return;
  if (!("Notification" in window)) {
    els.notifyButton.textContent = "通知非対応";
    els.notifyButton.disabled = true;
    return;
  }
  if (Notification.permission === "granted") {
    els.notifyButton.textContent = "通知ON";
    els.notifyButton.classList.add("enabled");
    els.notifyButton.disabled = false;
    return;
  }
  els.notifyButton.textContent = Notification.permission === "denied" ? "通知ブロック中" : "通知を有効化";
  els.notifyButton.classList.remove("enabled");
  els.notifyButton.disabled = Notification.permission === "denied";
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
    const card = document.createElement("article");
    card.className = `goal-card ${goal.id === selectedGoalId ? "active" : ""}`;
    card.innerHTML = `
      <div class="goal-card-head">
        <button type="button" class="goal-select">
          <span class="goal-title"><span>${escapeHtml(goal.name)}</span><span class="tag">${escapeHtml(goal.category)}</span></span>
          <p class="goal-meta">期限 ${formatDate(goal.deadline)}・${done}/${total} 完了</p>
        </button>
        ${trashButton("目標を削除")}
      </div>
      <div class="progress-track"><div class="progress-fill" style="width: ${percent}%"></div></div>
    `;
    card.querySelector(".goal-select").addEventListener("click", () => {
      selectedGoalId = goal.id;
      render();
    });
    card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteGoal(goal));
    els.goalList.append(card);
  });
}

function renderTaskBank() {
  els.taskBank.innerHTML = "";
  const tasks = state.tasks.filter((task) => !selectedGoalId || task.goalId === selectedGoalId);
  if (!tasks.length) {
    els.taskBank.append(empty("保存タスクを作ると、カレンダーへドラッグできます。"));
    return;
  }
  tasks.forEach((task) => {
    const goal = findGoal(task.goalId);
    const item = document.createElement("article");
    item.className = "bank-task";
    item.draggable = true;
    item.dataset.taskId = task.id;
    item.innerHTML = `
      ${taskMarkup(task, goal)}
      <div class="bank-task-actions">
        <button class="mini-button" type="button" data-action="today">今日へ</button>
        ${trashButton("保存タスクを削除")}
      </div>
    `;
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", task.id);
      event.dataTransfer.effectAllowed = "copy";
      document.body.classList.add("is-scheduling");
      item.classList.add("dragging");
      vibrate(6);
      const preview = createDragPreview(task, goal);
      document.body.append(preview);
      event.dataTransfer.setDragImage(preview, 18, 18);
      requestAnimationFrame(() => preview.remove());
    });
    item.addEventListener("dragend", () => {
      document.body.classList.remove("is-scheduling");
      document.querySelectorAll(".day-column.drop-target").forEach((column) => clearDropTargets(column));
      item.classList.remove("dragging");
    });
    item.addEventListener("pointerdown", (event) => startTouchScheduleDrag(event, task, goal, item));
    item.querySelector('[data-action="today"]').addEventListener("click", () => {
      scheduleTask(task.id, toISO(today));
      activeScreen = "today";
      render();
    });
    item.querySelector('[data-action="delete"]').addEventListener("click", () => deleteSavedTask(task));
    els.taskBank.append(item);
  });
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
  if (event.pointerType === "mouse" || event.target.closest("button")) return;
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
    if (!didStart && Math.hypot(deltaX, deltaY) > 4) {
      window.clearTimeout(pressTimer);
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
    window.clearTimeout(pressTimer);
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
    const snappedTime = landingTarget ? getTimeFromPoint(upEvent.clientY, landingTarget) : "";
    cleanup();
    if (date) scheduleTask(task.id, date, snappedTime);
  };
  const onCancel = () => cleanup();

  const pressTimer = window.setTimeout(() => startDrag(startX, startY), 90);
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onCancel);
}

function renderCalendar() {
  const days = viewMode === "month" ? getMonthDays(monthCursor) : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  els.weekTitle.textContent = viewMode === "month" ? formatMonthTitle(monthCursor) : `${formatDate(days[0])} - ${formatDate(days[6])}`;
  els.calendarGrid.className = `calendar-grid ${viewMode === "month" ? "month-mode" : "week-mode"}`;
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
      const snappedTime = getTimeFromPoint(event.clientY, column);
      clearDropTargets(column);
      const scheduledId = event.dataTransfer.getData("application/x-goalflow-scheduled");
      if (scheduledId) {
        moveScheduledTask(scheduledId, iso, snappedTime);
        return;
      }
      scheduleTask(event.dataTransfer.getData("text/plain"), iso, snappedTime);
    });
    const list = column.querySelector(".day-tasks");
    const scheduled = state.scheduled.filter((item) => item.date === iso && (!selectedGoalId || item.goalId === selectedGoalId));
    if (viewMode === "week" && !isCompactScheduleLayout()) {
      renderTimeSlots(list, scheduled);
    } else if (scheduled.length) {
      scheduled.forEach((item) => list.append(scheduledElement(item, viewMode === "month")));
    }
    els.calendarGrid.append(column);
  });
}

function renderTimeSlots(list, scheduled) {
  list.classList.add("time-grid");
  const grouped = scheduled.reduce((map, item) => {
    const hour = parseHour(item.time);
    if (!map.has(hour)) map.set(hour, []);
    map.get(hour).push(item);
    return map;
  }, new Map());

  for (let hour = 0; hour < 24; hour += 1) {
    const slot = document.createElement("div");
    slot.className = "time-slot";
    slot.dataset.hour = String(hour);
    slot.innerHTML = `
      <span class="time-slot-label">${formatHourLabel(hour)}</span>
      <div class="slot-items"></div>
    `;
    const items = grouped.get(hour) ?? [];
    items
      .sort((a, b) => a.time.localeCompare(b.time))
      .forEach((item) => slot.querySelector(".slot-items").append(scheduledElement(item, true)));
    list.append(slot);
  }
}

function setColumnDropTarget(column, clientY) {
  column.classList.add("drop-target");
  column.querySelectorAll(".time-slot.slot-target").forEach((slot) => slot.classList.remove("slot-target"));
  getSlotFromPoint(clientY, column)?.classList.add("slot-target");
}

function clearDropTargets(column) {
  column.classList.remove("drop-target");
  column.querySelectorAll(".time-slot.slot-target").forEach((slot) => slot.classList.remove("slot-target"));
}

function getScheduleColumnFromPoint(clientX, clientY) {
  return document.elementFromPoint(clientX, clientY)?.closest(".day-column");
}

function getSlotFromPoint(clientY, column) {
  if (viewMode !== "week" || isCompactScheduleLayout()) return null;
  const slots = [...column.querySelectorAll(".time-slot")];
  if (!slots.length) return null;
  return slots.find((slot) => {
    const rect = slot.getBoundingClientRect();
    return clientY >= rect.top && clientY <= rect.bottom;
  }) ?? slots[clientY < slots[0].getBoundingClientRect().top ? 0 : slots.length - 1];
}

function getTimeFromPoint(clientY, column) {
  const slot = getSlotFromPoint(clientY, column);
  if (!slot) return "";
  return `${String(Number(slot.dataset.hour)).padStart(2, "0")}:00`;
}

function parseHour(time) {
  const hour = Number(String(time || "00:00").split(":")[0]);
  if (Number.isNaN(hour)) return 0;
  return Math.max(0, Math.min(23, hour));
}

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function isCompactScheduleLayout() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function scheduledElement(item, isCompact = false) {
  const task = state.tasks.find((candidate) => candidate.id === item.taskId) ?? item;
  const goal = findGoal(item.goalId);
  const isEditingTime = activeTimeEditId === item.id;
  const node = document.createElement("article");
  node.className = `scheduled-task ${item.done ? "done" : ""} ${item.id === highlightedCompletionId ? "just-completed" : ""} ${
    item.id === activeScheduleControlId || isEditingTime ? "active" : ""
  }`;
  node.draggable = true;
  node.tabIndex = 0;
  node.dataset.scheduledId = item.id;
  node.innerHTML = `
    ${taskMarkup({ ...task, reminder: item.reminder, minutes: item.minutes }, goal, item.time, isCompact)}
    <div class="task-actions">
      <button class="mini-button" type="button" data-action="done">${item.done ? "戻す" : "完了"}</button>
      <button class="mini-button time-button" type="button" data-action="time" data-editing="${isEditingTime}" aria-label="開始時刻を変更">${
        isEditingTime ? "閉じる" : "時刻変更"
      }</button>
      ${trashButton("予定から削除")}
    </div>
    ${
      isEditingTime
        ? `<label class="time-editor">開始時刻<input type="time" value="${escapeHtml(item.time)}" data-time-editor="${escapeHtml(item.id)}" /></label>`
        : ""
    }
  `;
  node.addEventListener("click", (event) => {
    if (event.target.closest("button, input")) return;
    activeScheduleControlId = activeScheduleControlId === item.id ? "" : item.id;
    render();
  });
  node.addEventListener("dragstart", (event) => {
    if (event.target.closest("button, input")) {
      event.preventDefault();
      return;
    }
    activeScheduleControlId = "";
    activeTimeEditId = "";
    document.body.classList.add("is-scheduling");
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
    document.body.classList.remove("is-scheduling");
    document.querySelectorAll(".day-column.drop-target").forEach((column) => clearDropTargets(column));
    node.classList.remove("dragging");
  });
  node.querySelector('[data-action="done"]').addEventListener("click", () => {
    toggleScheduledDone(item);
  });
  node.querySelector('[data-action="time"]').addEventListener("click", () => {
    activeTimeEditId = isEditingTime ? "" : item.id;
    render();
    focusActiveTimeEditor();
  });
  const timeInput = node.querySelector("[data-time-editor]");
  timeInput?.addEventListener("change", () => updateScheduledTime(item, timeInput.value));
  timeInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") updateScheduledTime(item, timeInput.value);
    if (event.key === "Escape") {
      activeTimeEditId = "";
      render();
    }
  });
  node.querySelector('[data-action="delete"]').addEventListener("click", () => deleteScheduledItem(item));
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
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((item) => {
      const task = state.tasks.find((candidate) => candidate.id === item.taskId) ?? item;
      const goal = findGoal(item.goalId);
      const node = document.createElement("article");
      node.className = `today-task ${item.done ? "done" : ""} ${item.id === highlightedCompletionId ? "just-completed" : ""}`;
      node.innerHTML = `
        ${taskMarkup({ ...task, reminder: item.reminder, minutes: item.minutes }, goal, item.time)}
        <div class="task-actions">
          <button class="mini-button" type="button" data-action="done">${item.done ? "戻す" : "完了"}</button>
          ${trashButton("今日の予定から削除")}
        </div>
      `;
      node.querySelector('[data-action="done"]').addEventListener("click", () => {
        toggleScheduledDone(item);
      });
      node.querySelector('[data-action="delete"]').addEventListener("click", () => deleteScheduledItem(item));
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
  els.weekView.classList.toggle("active", viewMode === "week");
  els.monthView.classList.toggle("active", viewMode === "month");
  els.weekView.setAttribute("aria-pressed", String(viewMode === "week"));
  els.monthView.setAttribute("aria-pressed", String(viewMode === "month"));
  els.todayPeriod.textContent = viewMode === "month" ? "今月" : "今週";
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
      body: "保存タスクを今日に入れると、予定ではなく行動に変わります。タスク画面の「今日へ」からすぐ追加できます。",
      button: "タスクを見る",
      action: "openTasks",
      buddyTitle: "今日に落とす",
      buddyMessage: "目標は遠くても、今日の1つなら動かせます。",
    };
  }

  if (todaysDone < todaysItems.length) {
    return {
      title: "今日の1つを完了する",
      body: `今日は${todaysItems.length}件中${todaysDone}件完了です。まず1件だけ終わらせて、流れを作りましょう。`,
      button: "今日を見る",
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
}

function renderSummary() {
  const done = state.scheduled.filter((item) => item.done).length;
  const total = state.scheduled.length;
  const todayRate = calcCompletionRate((item) => item.date === toISO(today));
  const weekRate = calcCompletionRate((item) => getCurrentWeekDates().includes(item.date));
  const overallRate = total ? Math.round((done / total) * 100) : 0;
  els.summaryTodayRate.textContent = `${todayRate}%`;
  els.summaryWeekRate.textContent = `${weekRate}%`;
  els.summaryOverallRate.textContent = `${overallRate}%`;
  els.todayRateMeter.style.width = `${todayRate}%`;
  els.weekRateMeter.style.width = `${weekRate}%`;
  els.overallRateMeter.style.width = `${overallRate}%`;
  els.summaryStreak.textContent = calcStreak();
}

function renderChart() {
  const ctx = els.chart.getContext("2d");
  const width = els.chart.width;
  const height = els.chart.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);
  if (!state.scheduled.length) {
    drawEmptyCanvas(ctx, width, height, "目標を作って、今日のタスクを完了するとグラフが育ちます。");
    return;
  }
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index - 6));
  const values = days.map((date) => {
    const iso = toISO(date);
    return state.scheduled.filter((item) => item.date === iso && item.done && (!selectedGoalId || item.goalId === selectedGoalId)).length;
  });
  const max = Math.max(1, ...values);
  const padding = 34;
  const barWidth = (width - padding * 2) / values.length - 10;
  ctx.strokeStyle = "#dfe3da";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding + 10, height - padding);
  ctx.stroke();
  values.forEach((value, index) => {
    const x = padding + index * (barWidth + 10) + 8;
    const barHeight = ((height - padding * 2) * value) / max;
    const y = height - padding - barHeight;
    ctx.fillStyle = index === values.length - 1 ? "#146c63" : "#2f69c8";
    ctx.fillRect(x, y, barWidth, barHeight || 3);
    ctx.fillStyle = "#6b7066";
    ctx.font = "12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`${days[index].getMonth() + 1}/${days[index].getDate()}`, x + barWidth / 2, height - 12);
    ctx.fillText(value, x + barWidth / 2, Math.max(18, y - 8));
  });
}

function renderCompletionPie() {
  const ctx = els.completionPie.getContext("2d");
  const width = els.completionPie.width;
  const height = els.completionPie.height;
  const total = state.scheduled.length;
  const done = state.scheduled.filter((item) => item.done).length;
  const pending = Math.max(0, total - done);
  const rate = total ? Math.round((done / total) * 100) : 0;
  const centerX = width / 2;
  const centerY = height / 2 - 4;
  const radius = Math.min(width, height) * 0.3;
  const start = -Math.PI / 2;
  const doneAngle = total ? (Math.PI * 2 * done) / total : 0;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);
  if (!total) {
    drawEmptyCanvas(ctx, width, height, "完了したタスクがここに割合で表示されます。");
    return;
  }

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = "#e4e9df";
  ctx.fill();

  if (done > 0) {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, start + doneAngle);
    ctx.closePath();
    ctx.fillStyle = "#146c63";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = "#fbfcfa";
  ctx.fill();

  ctx.fillStyle = "#20231f";
  ctx.font = "800 34px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`${rate}%`, centerX, centerY + 8);
  ctx.fillStyle = "#6b7066";
  ctx.font = "13px system-ui";
  ctx.fillText("全体の達成率", centerX, centerY + 32);

  drawLegend(ctx, 36, height - 36, "#146c63", `完了 ${done}`);
  drawLegend(ctx, width - 132, height - 36, "#e4e9df", `未完了 ${pending}`);
}

function renderGoalReport() {
  els.goalReport.innerHTML = "";
  const head = document.createElement("div");
  head.className = "report-head";
  head.innerHTML = "<span>目標</span><span>完了</span><span>達成率</span><span>進み具合</span>";
  els.goalReport.append(head);

  if (!state.goals.length) {
    els.goalReport.append(empty("目標を追加すると、ここに進捗表が出ます。"));
    return;
  }

  state.goals.forEach((goal) => {
    const items = state.scheduled.filter((item) => item.goalId === goal.id);
    const done = items.filter((item) => item.done).length;
    const rate = items.length ? Math.round((done / items.length) * 100) : 0;
    const row = document.createElement("div");
    row.className = "report-row";
    row.innerHTML = `
      <div class="report-title"><span>${escapeHtml(goal.name)}</span></div>
      <span>${done}/${items.length}</span>
      <span class="report-rate">${rate}%</span>
      <div class="report-progress" aria-label="${escapeHtml(goal.name)}の達成率 ${rate}%"><span style="width: ${rate}%"></span></div>
    `;
    els.goalReport.append(row);
  });
}

function drawLegend(ctx, x, y, color, text) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 10, 12, 12);
  ctx.fillStyle = "#6b7066";
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(text, x + 18, y);
}

function drawEmptyCanvas(ctx, width, height, text) {
  ctx.fillStyle = "#fbfcfa";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#6b7066";
  ctx.font = "14px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2);
}

function taskMarkup(task, goal, time = "", isCompact = false) {
  const duration = formatDuration(task);
  const meta = isCompact ? `${goal?.name ?? "未設定"}・${duration}` : `${goal?.name ?? "未設定"}・${duration}・通知 ${task.reminder}`;
  return `
    <div class="task-title"><span>${escapeHtml(task.title)}</span>${time ? `<span>${escapeHtml(time)}</span>` : ""}</div>
    <p class="task-meta">${escapeHtml(meta)}</p>
  `;
}

function trashButton(label) {
  return `
    <button class="trash-button" type="button" data-action="delete" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
      <span aria-hidden="true"></span>
    </button>
  `;
}

function deleteGoal(goal) {
  const ok = window.confirm(`「${goal.name}」を削除しますか？\n紐づく保存タスクと予定も削除されます。`);
  if (!ok) return;
  state.goals = state.goals.filter((candidate) => candidate.id !== goal.id);
  state.tasks = state.tasks.filter((task) => task.goalId !== goal.id);
  state.scheduled = state.scheduled.filter((item) => item.goalId !== goal.id);
  selectedGoalId = state.goals[0]?.id ?? "";
  showToast("目標を削除しました。");
  render();
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

function deleteScheduledItem(item) {
  state.scheduled = state.scheduled.filter((candidate) => candidate.id !== item.id);
  if (activeTimeEditId === item.id) activeTimeEditId = "";
  if (activeScheduleControlId === item.id) activeScheduleControlId = "";
  showToast("予定から削除しました。");
  render();
}

function updateScheduledTime(item, value) {
  if (!/^\d{2}:\d{2}$/.test(value)) return;
  item.time = value;
  activeTimeEditId = "";
  showToast(`開始時刻を${item.time}に変更しました。`);
  render();
}

function focusActiveTimeEditor() {
  window.setTimeout(() => {
    const input = [...document.querySelectorAll("[data-time-editor]")].find((candidate) => candidate.dataset.timeEditor === activeTimeEditId);
    input?.focus();
    input?.showPicker?.();
  }, 0);
}

function scheduleTask(taskId, date, time = "") {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;
  const startTime = time || suggestTime(date);
  state.scheduled.push(makeSchedule(task, date, startTime, false));
  highlightedScheduleDate = date;
  activeScheduleControlId = "";
  activeTimeEditId = "";
  window.clearTimeout(highlightedScheduleTimer);
  highlightedScheduleTimer = window.setTimeout(() => {
    highlightedScheduleDate = "";
    render();
  }, 720);
  vibrate(date === toISO(today) ? 18 : 10);
  showToast(date === toISO(today) ? `${startTime}に追加しました。あとは1つ完了するだけです。` : `${startTime}に予定を追加しました。`);
  render();
}

function moveScheduledTask(scheduledId, date, time = "") {
  const item = state.scheduled.find((candidate) => candidate.id === scheduledId);
  if (!item) return;
  item.date = date;
  item.time = time || item.time || suggestTime(date);
  highlightedScheduleDate = date;
  activeScheduleControlId = "";
  activeTimeEditId = "";
  window.clearTimeout(highlightedScheduleTimer);
  highlightedScheduleTimer = window.setTimeout(() => {
    highlightedScheduleDate = "";
    render();
  }, 720);
  vibrate(12);
  showToast(`${item.time}に移動しました。`);
  render();
}

function vibrate(duration = 8) {
  if (window.navigator?.vibrate) window.navigator.vibrate(duration);
}

function makeSchedule(task, date, time, done) {
  return {
    id: crypto.randomUUID(),
    taskId: task.id,
    goalId: task.goalId,
    title: task.title,
    minutes: task.minutes,
    durationValue: task.durationValue ?? task.minutes,
    durationUnit: task.durationUnit ?? "minutes",
    reminder: task.reminder,
    date,
    time,
    done,
  };
}

function suggestTime(date) {
  const count = state.scheduled.filter((item) => item.date === date).length;
  return ["08:00", "12:30", "19:00", "21:00"][count % 4];
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

function openGoalDialog() {
  els.goalForm.reset();
  els.goalForm.elements.namedItem("deadline").value = addDays(today, 30).toISOString().slice(0, 10);
  els.goalDialog.showModal();
}

els.goalForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.goalForm);
  const goal = {
    id: crypto.randomUUID(),
    name: data.get("name").trim(),
    category: data.get("category"),
    deadline: data.get("deadline"),
    note: data.get("note").trim(),
  };
  state.goals.push(goal);
  state.meta.onboardingDismissed = true;
  selectedGoalId = goal.id;
  els.goalDialog.close();
  render();
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
    reminder: data.get("reminder"),
  });
  selectedGoalId = data.get("goalId");
  els.taskDialog.close();
  render();
});

els.taskForm.elements.namedItem("durationUnit").addEventListener("change", updateDurationInput);

document.querySelector("#prevPeriod").addEventListener("click", () => {
  if (viewMode === "month") {
    monthCursor = addMonths(monthCursor, -1);
  } else {
    weekStart = addDays(weekStart, -7);
  }
  render();
});

document.querySelector("#nextPeriod").addEventListener("click", () => {
  if (viewMode === "month") {
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

els.screenTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    activeScreen = tab.dataset.screenTarget;
    render();
  });
});

els.goalFilter.addEventListener("change", (event) => {
  selectedGoalId = event.target.value;
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
    activeScreen = "tasks";
    render();
    els.openTaskDialog.click();
  }
  if (action === "openTasks") {
    activeScreen = "tasks";
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

els.notifyButton?.addEventListener("click", enableNotifications);

async function enableNotifications() {
  if (!("Notification" in window)) {
    showToast("この環境では通知に対応していません。");
    return;
  }
  if (window.location.protocol === "file:") {
    showToast("通知はローカルサーバーかHTTPSで使えます。");
    return;
  }
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  renderNotificationState();
  if (permission !== "granted") {
    showToast("通知が許可されませんでした。");
    return;
  }
  showToast("通知を有効化しました。");
  showNotification("GoalFlow", "リマインダー通知の準備ができました。");
}

async function showNotification(title, body) {
  if (Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker?.ready.catch(() => null);
  if (registration) {
    registration.showNotification(title, {
      body,
      badge: "./icons/goalflow-icon-512.png",
      icon: "./icons/goalflow-icon-512.png",
      tag: "goalflow-ready",
    });
    return;
  }
  new Notification(title, { body, icon: "./icons/goalflow-icon-512.png" });
}

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
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
