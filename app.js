const storageKey = "goalflow-state-v1";
const today = new Date();
let state = loadState();
let selectedGoalId = state.goals[0]?.id ?? "";
let weekStart = getWeekStart(today);
let monthCursor = new Date(today.getFullYear(), today.getMonth(), 1);
let viewMode = "week";
let activeScreen = "home";

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
  nextActionTitle: document.querySelector("#nextActionTitle"),
  nextActionBody: document.querySelector("#nextActionBody"),
  nextActionButton: document.querySelector("#nextActionButton"),
  buddyTitle: document.querySelector("#buddyTitle"),
  buddyMessage: document.querySelector("#buddyMessage"),
  catSprite: document.querySelector("#catSprite"),
  catMood: document.querySelector("#catMood"),
  catSound: document.querySelector("#catSound"),
  catMessage: document.querySelector("#catMessage"),
  toast: document.querySelector("#toast"),
};

const idleSleepMs = 1000 * 60 * 12;
const quietFocusMs = 1000 * 60 * 4;
let lastInteractionAt = Date.now();
let idleTimer = null;

function createEmptyState() {
  return {
    goals: [],
    tasks: [],
    scheduled: [],
    meta: {
      onboardingDismissed: false,
      lastVisitDate: "",
      visitStreak: 0,
      catMood: "active",
      catSound: "にゃっ！",
      catMessage: "今日も来てくれてありがとう。",
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
        catMood: parsed.meta?.catMood ?? "active",
        catSound: parsed.meta?.catSound ?? "にゃっ！",
        catMessage: parsed.meta?.catMessage ?? "今日も来てくれてありがとう。",
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
  renderCat();
  renderSummary();
  renderChart();
  renderCompletionPie();
  renderGoalReport();
  saveState();
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
      <button type="button">
        <span class="goal-title"><span>${escapeHtml(goal.name)}</span><span class="tag">${escapeHtml(goal.category)}</span></span>
        <p class="goal-meta">期限 ${formatDate(goal.deadline)}・${done}/${total} 完了</p>
        <div class="progress-track"><div class="progress-fill" style="width: ${percent}%"></div></div>
      </button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      selectedGoalId = goal.id;
      render();
    });
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
      </div>
    `;
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", task.id);
      event.dataTransfer.effectAllowed = "copy";
      item.classList.add("dragging");
      const preview = createDragPreview(task, goal);
      document.body.append(preview);
      event.dataTransfer.setDragImage(preview, 18, 18);
      requestAnimationFrame(() => preview.remove());
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });
    item.querySelector('[data-action="today"]').addEventListener("click", () => {
      scheduleTask(task.id, toISO(today));
      activeScreen = "today";
      render();
    });
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

function renderCalendar() {
  const days = viewMode === "month" ? getMonthDays(monthCursor) : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  els.weekTitle.textContent = viewMode === "month" ? formatMonthTitle(monthCursor) : `${formatDate(days[0])} - ${formatDate(days[6])}`;
  els.calendarGrid.className = `calendar-grid ${viewMode === "month" ? "month-mode" : "week-mode"}`;
  els.calendarGrid.innerHTML = "";
  days.forEach((date) => {
    const iso = toISO(date);
    const column = document.createElement("section");
    const isOutsideMonth = viewMode === "month" && date.getMonth() !== monthCursor.getMonth();
    column.className = `day-column ${iso === toISO(today) ? "today" : ""} ${isOutsideMonth ? "outside-month" : ""}`;
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
      column.classList.add("drop-target");
    });
    column.addEventListener("dragleave", () => column.classList.remove("drop-target"));
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      column.classList.remove("drop-target");
      scheduleTask(event.dataTransfer.getData("text/plain"), iso);
    });
    const list = column.querySelector(".day-tasks");
    const scheduled = state.scheduled.filter((item) => item.date === iso && (!selectedGoalId || item.goalId === selectedGoalId));
    if (!scheduled.length) {
      list.append(empty("ここへタスクを置く"));
    } else {
      scheduled.forEach((item) => list.append(scheduledElement(item, viewMode === "month")));
    }
    els.calendarGrid.append(column);
  });
}

function scheduledElement(item, isCompact = false) {
  const task = state.tasks.find((candidate) => candidate.id === item.taskId) ?? item;
  const goal = findGoal(item.goalId);
  const node = document.createElement("article");
  node.className = `scheduled-task ${item.done ? "done" : ""}`;
  node.innerHTML = `
    ${taskMarkup({ ...task, reminder: item.reminder, minutes: item.minutes }, goal, item.time, isCompact)}
    <div class="task-actions">
      <button class="mini-button" type="button" data-action="done">${item.done ? "戻す" : "完了"}</button>
      <button class="mini-button" type="button" data-action="time">時間</button>
      <button class="mini-button" type="button" data-action="remove">削除</button>
    </div>
  `;
  node.querySelector('[data-action="done"]').addEventListener("click", () => {
    toggleScheduledDone(item);
  });
  node.querySelector('[data-action="time"]').addEventListener("click", () => {
    const next = prompt("開始時間を入力してください", item.time);
    if (next && /^\d{1,2}:\d{2}$/.test(next)) {
      item.time = next.padStart(5, "0");
      render();
    }
  });
  node.querySelector('[data-action="remove"]').addEventListener("click", () => {
    state.scheduled = state.scheduled.filter((candidate) => candidate.id !== item.id);
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
    .sort((a, b) => a.time.localeCompare(b.time))
    .forEach((item) => {
      const task = state.tasks.find((candidate) => candidate.id === item.taskId) ?? item;
      const goal = findGoal(item.goalId);
      const node = document.createElement("article");
      node.className = `today-task ${item.done ? "done" : ""}`;
      node.innerHTML = `
        ${taskMarkup({ ...task, reminder: item.reminder, minutes: item.minutes }, goal, item.time)}
        <div class="task-actions">
          <button class="mini-button" type="button" data-action="done">${item.done ? "戻す" : "完了"}</button>
        </div>
      `;
      node.querySelector('[data-action="done"]').addEventListener("click", () => {
        toggleScheduledDone(item);
      });
      els.todayList.append(node);
    });
}

function toggleScheduledDone(item) {
  item.done = !item.done;
  if (item.done) {
    updateCatReaction("complete");
    bounceCat();
    showToast("にゃ！ 完了を記録しました。今日の流れが少し前に進みました。");
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

function renderCat() {
  const moodLabels = {
    active: "見守り中",
    pleased: "ごきげん",
    sleepy: "うとうと",
    focus: "静かに応援中",
  };
  els.catSprite.classList.toggle("pleased", state.meta.catMood === "pleased");
  els.catSprite.classList.toggle("sleepy", state.meta.catMood === "sleepy");
  els.catSprite.classList.toggle("focus", state.meta.catMood === "focus");
  els.catMood.textContent = moodLabels[state.meta.catMood] ?? "見守り中";
  els.catSound.textContent = state.meta.catSound;
  els.catMessage.textContent = state.meta.catMessage;
}

function registerVisit() {
  const todayIso = toISO(today);
  if (state.meta.lastVisitDate === todayIso) return;

  const yesterdayIso = toISO(addDays(today, -1));
  state.meta.visitStreak = state.meta.lastVisitDate === yesterdayIso ? state.meta.visitStreak + 1 : 1;
  state.meta.lastVisitDate = todayIso;
  updateCatReaction("visit");
}

function updateCatReaction(type) {
  const todaysItems = state.scheduled.filter((item) => item.date === toISO(today));
  const todaysDone = todaysItems.filter((item) => item.done).length;
  const todayRate = todaysItems.length ? Math.round((todaysDone / todaysItems.length) * 100) : 0;

  if (type === "complete") {
    state.meta.catMood = "pleased";
    state.meta.catSound = "にゃ！";
    state.meta.catMessage = "タスク完了！今の一歩、ちゃんと積み上がったよ。";
    return;
  }

  if (isLateNight()) {
    state.meta.catMood = "sleepy";
    state.meta.catSound = "にゃ...";
    state.meta.catMessage = "夜遅いね。少しだけ整えたら、ちゃんと休もう。";
    return;
  }

  if (todayRate >= 100 && todaysItems.length) {
    state.meta.catMood = "pleased";
    state.meta.catSound = "にゃあ";
    state.meta.catMessage = "今日も頑張ってるね。完了がきれいに積み上がってるよ。";
    return;
  }

  if (state.meta.visitStreak >= 3) {
    state.meta.catMood = "active";
    state.meta.catSound = "にゃっ！";
    state.meta.catMessage = `${state.meta.visitStreak}日連続で来てくれてありがとう。継続、育ってるね。`;
    return;
  }

  if (todaysItems.length) {
    state.meta.catMood = "focus";
    state.meta.catSound = "にゃ";
    state.meta.catMessage = "今日やること、もう置けてるね。まず1つだけ一緒に片づけよう。";
    return;
  }

  state.meta.catMood = "active";
  state.meta.catSound = "にゃっ！";
  state.meta.catMessage = "今日も来てくれてありがとう。小さな予定を1つ置いてみよう。";
}

function bounceCat() {
  els.catSprite.classList.remove("bounce");
  void els.catSprite.offsetWidth;
  els.catSprite.classList.add("bounce");
}

function isLateNight() {
  const hour = today.getHours();
  return hour >= 23 || hour < 5;
}

function markInteraction() {
  lastInteractionAt = Date.now();
  if (state.meta.catMood === "sleepy" && !isLateNight()) {
    updateCatReaction("visit");
    render();
  }
  scheduleIdleCheck();
}

function scheduleIdleCheck() {
  window.clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    const idleFor = Date.now() - lastInteractionAt;
    if (idleFor >= idleSleepMs) {
      state.meta.catMood = "sleepy";
      state.meta.catSound = "にゃ...";
      state.meta.catMessage = "少し休憩中。戻ってきたら、また一緒に進めよう。";
      render();
      return;
    }
    if (idleFor >= quietFocusMs) {
      state.meta.catMood = "focus";
      state.meta.catSound = "にゃ";
      state.meta.catMessage = "集中してるみたい。静かに見守ってるね。";
      render();
    }
    scheduleIdleCheck();
  }, quietFocusMs);
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

function scheduleTask(taskId, date) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;
  state.scheduled.push(makeSchedule(task, date, suggestTime(date), false));
  if (date === toISO(today)) showToast("今日の予定に追加しました。あとは1つ完了するだけです。");
  render();
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

["pointerdown", "keydown", "scroll"].forEach((eventName) => {
  window.addEventListener(eventName, markInteraction, { passive: true });
});

registerVisit();
scheduleIdleCheck();
render();
