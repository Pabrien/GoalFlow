const storageKey = "goalflow-state-v1";
const today = new Date();
const calendarSizes = ["size-1", "size-2", "size-3", "size-4", "size-5", "size-6", "size-7"];
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
let calendarSize = normalizeCalendarSize(state.meta?.calendarSize);
const screenOrder = ["home", "goals", "schedule", "today"];

const translations = {
  ja: {
    "app.kicker": "Goal planner",
    "app.tagline": "目標から逆算して、今日やることに落とし込む。",
    "status.autoSave": "自動保存",
    "status.saved": "保存済み {time}",
    "theme.dark": "ダーク",
    "theme.light": "ライト",
    "language.switch": "English",
    "language.aria": "言語を英語に切り替え",
    "onboarding.aria": "初回チュートリアル",
    "onboarding.kicker": "Start small",
    "onboarding.title": "最初は3ステップだけ",
    "onboarding.step1.title": "目標を1つ作る",
    "onboarding.step1.body": "筋トレ、勉強、習慣など、続けたい理由を残します。",
    "onboarding.step2.title": "小さなタスクに分ける",
    "onboarding.step2.body": "今日できるサイズにすると、続けやすくなります。",
    "onboarding.step3.title": "今日に入れて完了する",
    "onboarding.step3.body": "進捗がグラフに残り、次の一歩が見えます。",
    "onboarding.primary": "最初の目標を作る",
    "onboarding.secondary": "あとで見る",
    "tabs.aria": "画面切替",
    "tabs.home": "ホーム",
    "tabs.goals": "目標",
    "tabs.schedule": "スケジュール",
    "tabs.today": "今日",
    "summary.today": "今日の達成率",
    "summary.week": "今週の達成率",
    "summary.overall": "全体の達成率",
    "summary.streak": "連続記録",
    "summary.streakValue": "{count}日",
    "focus.kicker": "今日のフォーカス",
    "focus.pill": "今日やること",
    "focus.defaultTitle": "次の一手",
    "focus.defaultBody": "GoalFlowが、目標から今日やることまでの流れを案内します。",
    "focus.defaultButton": "始める",
    "buddy.kicker": "ひとこと",
    "buddy.defaultTitle": "今日の流れ",
    "buddy.defaultMessage": "小さく始めて、完了を1つ残しましょう。",
    "empty.kicker": "GoalFlow method",
    "empty.title": "まず最初の目標を作りましょう",
    "empty.body": "目標を作ると、タスクを保存して、今日の予定に落とし込めます。進捗はここにグラフで残ります。",
    "empty.button": "目標を作る",
    "chart.title": "7日間の積み上げ",
    "chart.note.count": "完了したタスク数を日別に表示します。",
    "chart.note.time": "完了したタスクの時間を日別に表示します。",
    "chart.aria": "過去7日間の積み上げ",
    "chart.empty": "目標を作って、今日のタスクを完了するとグラフが育ちます。",
    "pie.title": "全体の達成状況",
    "pie.note.count": "完了と未完了の割合です。",
    "pie.note.time": "完了した時間と未完了の時間の割合です。",
    "pie.empty": "完了したタスクがここに割合で表示されます。",
    "pie.rateLabel": "{metric}の達成率",
    "pie.done": "完了 {value}",
    "pie.pending": "未完了 {value}",
    "metric.count": "個数",
    "metric.time": "時間",
    "metric.countCaption": "完了した個数",
    "metric.timeCaption": "完了した時間",
    "report.title": "目標別レポート",
    "report.note": "どの目標が前に進んでいるかを確認できます。",
    "report.head.goal": "目標",
    "report.head.start": "開始",
    "report.head.record": "記録（個）",
    "report.head.progress": "進み具合",
    "report.empty": "目標を追加すると、ここに進捗表が出ます。",
    "report.unplanned": "未予定",
    "report.progress": "{done}/{total}個",
    "report.start": "{date}から{days}日目",
    "report.deadlineLeft": "期限まであと{days}日",
    "report.deadlinePassed": "期限から{days}日",
    "report.aria": "{goal}の達成率 {rate}%",
    "goals.title": "目標",
    "goals.add": "目標を追加",
    "goals.empty": "まずは目標を1つ作ると、タスクを紐づけられます。",
    "goals.unspecified": "未分類",
    "goals.startDeadline": "開始 {start}・期限 {deadline}・{tone}",
    "goals.deadlineLeft": "あと{days}日",
    "goals.deadlinePassed": "{days}日経過",
    "goals.scheduledFirst": "まず1件予定化",
    "goals.doneTotal": "{done}/{total} 完了",
    "goals.progress": "進み具合 {percent}%",
    "tasks.title": "保存タスク",
    "tasks.add": "追加",
    "tasks.empty": "保存タスクを作ると、カレンダーへドラッグできます。",
    "tasks.dragAria": "カレンダーへドラッグ",
    "tasks.addToday": "今日に追加",
    "tasks.noGoal": "未設定",
    "schedule.kicker": "ドラッグで予定化",
    "schedule.week": "週",
    "schedule.month": "月",
    "schedule.prev": "前へ",
    "schedule.next": "次へ",
    "schedule.todayButton": "今日に戻る",
    "schedule.todayVisible": "今日を表示中",
    "schedule.zoomOut": "小さく",
    "schedule.zoomIn": "大きく",
    "schedule.returned": "保存タスクに戻しました。",
    "schedule.deleted": "予定から削除しました。",
    "schedule.updated": "予定を更新しました。",
    "schedule.addedToday": "今日に追加しました。あとは1つ完了するだけです。",
    "schedule.added": "予定を追加しました。",
    "schedule.moved": "予定を移動しました。",
    "today.title": "今日やること",
    "today.empty": "今日やることはまだありません。",
    "today.completedToast": "完了を記録しました。今日の流れが少し前に進みました。",
    "actions.save": "保存",
    "actions.delete": "削除",
    "actions.close": "閉じる",
    "actions.done": "完了",
    "actions.undo": "戻す",
    "dialog.close": "閉じる",
    "goalDialog.createTitle": "目標を作る",
    "goalDialog.editTitle": "目標を編集",
    "goalDialog.name": "目標名",
    "goalDialog.namePlaceholder": "例：3か月でベンチプレス +10kg",
    "goalDialog.category": "カテゴリ",
    "goalDialog.categoryPlaceholder": "例：筋トレ、勉強、副業",
    "goalDialog.deadline": "期限",
    "goalDialog.startDate": "開始日",
    "goalDialog.note": "目標メモ",
    "goalDialog.notePlaceholder": "達成条件や理由",
    "goalDialog.confirmDelete": "「{name}」を削除しますか？\n紐づく保存タスクと予定も削除されます。",
    "goalDialog.deleted": "目標を削除しました。",
    "taskDialog.title": "タスクを保存",
    "taskDialog.name": "タスク名",
    "taskDialog.namePlaceholder": "例：英単語 30個",
    "taskDialog.goal": "紐づける目標",
    "taskDialog.duration": "所要時間",
    "taskDialog.unit": "単位",
    "taskEdit.name": "タスク名",
    "taskEdit.goal": "目標",
    "taskEdit.duration": "時間",
    "taskEdit.unit": "単位",
    "taskEdit.updated": "保存タスクを更新しました。",
    "taskEdit.confirmDelete": "「{title}」を削除しますか？",
    "taskEdit.confirmDeleteWithRelated": "「{title}」を削除しますか？\nカレンダー上の同じ予定 {count}件も削除されます。",
    "taskEdit.deleted": "保存タスクを削除しました。",
    "unit.minutes": "分",
    "unit.hours": "時間",
    "duration.minutes": "{value}分",
    "duration.hours": "{value}時間",
    "categories.training": "筋トレ",
    "categories.study": "勉強",
    "categories.work": "仕事",
    "categories.health": "健康",
    "categories.habit": "習慣",
    "dayDialog.kicker": "Day plan",
    "dayDialog.title": "{date}の予定",
    "dayDialog.empty": "この日の予定はまだありません。",
    "dayDialog.noGoal": "目標なし",
    "next.noGoal.title": "最初の目標を作成",
    "next.noGoal.body": "まずは続けたい理由がある目標を1つだけ作りましょう。",
    "next.noGoal.button": "目標を作る",
    "next.noGoal.buddyTitle": "はじめの一歩",
    "next.noGoal.buddyMessage": "大きな計画より、続けたい理由が1つあるだけで十分です。",
    "next.noTask.title": "今日できるサイズに分ける",
    "next.noTask.body": "目標を作れました。次は15分から30分で終わる小さなタスクを保存しましょう。",
    "next.noTask.button": "タスクを追加",
    "next.noTask.buddyTitle": "逆算を始める",
    "next.noTask.buddyMessage": "目標があるなら、次は今日できる形に小さくします。",
    "next.noToday.title": "今日やることを追加",
    "next.noToday.body": "保存タスクを今日に入れると、予定ではなく行動に変わります。",
    "next.noToday.button": "スケジュールで追加",
    "next.noToday.buddyTitle": "今日に落とす",
    "next.noToday.buddyMessage": "目標は遠くても、今日の1つなら動かせます。",
    "next.inProgress.title": "今日の1つを完了する",
    "next.inProgress.body": "今日は{total}件中{done}件完了です。まず1件だけ終わらせて、流れを作りましょう。",
    "next.inProgress.button": "今日のタスクを見る",
    "next.inProgress.buddyTitle": "あと少し",
    "next.inProgress.buddyMessage": "完璧より記録です。1つ完了すると、明日の自分が楽になります。",
    "next.done.title": "今日の流れは完了",
    "next.done.body": "今日のタスクは完了しています。余力があれば明日の自分に渡すタスクを1つだけ用意しましょう。",
    "next.done.button": "スケジュールを見る",
    "next.done.buddyTitle": "いい継続です",
    "next.done.buddyMessage": "完了が記録に変わりました。この小さい積み上げがGoalFlowの中心です。",
    "file.title": "ローカルサーバーで開いてください",
    "file.body": "この画面は直接ファイルとして開かれています。動かない場合は http://127.0.0.1:4174/index.html を開いてください。",
    "offline.failed": "オフライン準備に失敗しました。",
  },
  en: {
    "app.kicker": "Goal planner",
    "app.tagline": "Plan backward from goals into what you can do today.",
    "status.autoSave": "Auto-save",
    "status.saved": "Saved {time}",
    "theme.dark": "Dark",
    "theme.light": "Light",
    "language.switch": "日本語",
    "language.aria": "Switch language to Japanese",
    "onboarding.aria": "Getting started",
    "onboarding.kicker": "Start small",
    "onboarding.title": "Start with 3 steps",
    "onboarding.step1.title": "Create one goal",
    "onboarding.step1.body": "Keep the reason you want to continue, whether it is training, study, or a habit.",
    "onboarding.step2.title": "Break it into small tasks",
    "onboarding.step2.body": "Tasks that fit into today are much easier to keep going.",
    "onboarding.step3.title": "Put it on today and finish it",
    "onboarding.step3.body": "Your progress stays visible, so the next step is clear.",
    "onboarding.primary": "Create first goal",
    "onboarding.secondary": "Later",
    "tabs.aria": "Screens",
    "tabs.home": "Home",
    "tabs.goals": "Goals",
    "tabs.schedule": "Schedule",
    "tabs.today": "Today",
    "summary.today": "Today",
    "summary.week": "This week",
    "summary.overall": "Overall",
    "summary.streak": "Streak",
    "summary.streakValue": "{count} days",
    "focus.kicker": "Today’s focus",
    "focus.pill": "Today’s tasks",
    "focus.defaultTitle": "Next step",
    "focus.defaultBody": "GoalFlow guides the path from your goals to today’s actions.",
    "focus.defaultButton": "Start",
    "buddy.kicker": "Note",
    "buddy.defaultTitle": "Today’s flow",
    "buddy.defaultMessage": "Start small and leave one completed task behind.",
    "empty.kicker": "GoalFlow method",
    "empty.title": "Create your first goal",
    "empty.body": "Once you create a goal, you can save tasks, place them on today, and see progress here.",
    "empty.button": "Create goal",
    "chart.title": "Last 7 days",
    "chart.note.count": "Shows completed task count by day.",
    "chart.note.time": "Shows completed task time by day.",
    "chart.aria": "Last 7 days progress",
    "chart.empty": "Create a goal and complete today’s tasks to grow this chart.",
    "pie.title": "Overall progress",
    "pie.note.count": "Ratio of completed and unfinished tasks.",
    "pie.note.time": "Ratio of completed and unfinished time.",
    "pie.empty": "Completed tasks will appear here as a ratio.",
    "pie.rateLabel": "{metric} completion",
    "pie.done": "Done {value}",
    "pie.pending": "Left {value}",
    "metric.count": "Count",
    "metric.time": "Time",
    "metric.countCaption": "Completed count",
    "metric.timeCaption": "Completed time",
    "report.title": "Goal report",
    "report.note": "See which goals are moving forward.",
    "report.head.goal": "Goal",
    "report.head.start": "Start",
    "report.head.record": "Record",
    "report.head.progress": "Progress",
    "report.empty": "Add a goal and its progress table will appear here.",
    "report.unplanned": "Not scheduled",
    "report.progress": "{done}/{total}",
    "report.start": "Day {days} from {date}",
    "report.deadlineLeft": "{days} days left",
    "report.deadlinePassed": "{days} days past deadline",
    "report.aria": "{goal} completion {rate}%",
    "goals.title": "Goals",
    "goals.add": "Add goal",
    "goals.empty": "Create one goal first, then connect tasks to it.",
    "goals.unspecified": "Uncategorized",
    "goals.startDeadline": "Start {start} · Due {deadline} · {tone}",
    "goals.deadlineLeft": "{days} days left",
    "goals.deadlinePassed": "{days} days passed",
    "goals.scheduledFirst": "Schedule one task",
    "goals.doneTotal": "{done}/{total} done",
    "goals.progress": "Progress {percent}%",
    "tasks.title": "Saved tasks",
    "tasks.add": "Add",
    "tasks.empty": "Save a task, then drag it onto the calendar.",
    "tasks.dragAria": "Drag to calendar",
    "tasks.addToday": "Add to today",
    "tasks.noGoal": "No goal",
    "schedule.kicker": "Drag to schedule",
    "schedule.week": "Week",
    "schedule.month": "Month",
    "schedule.prev": "Previous",
    "schedule.next": "Next",
    "schedule.todayButton": "Back to today",
    "schedule.todayVisible": "Today is visible",
    "schedule.zoomOut": "Smaller",
    "schedule.zoomIn": "Larger",
    "schedule.returned": "Moved back to saved tasks.",
    "schedule.deleted": "Removed from schedule.",
    "schedule.updated": "Schedule updated.",
    "schedule.addedToday": "Added to today. Now finish one task.",
    "schedule.added": "Added to schedule.",
    "schedule.moved": "Moved schedule item.",
    "today.title": "Today’s tasks",
    "today.empty": "No tasks for today yet.",
    "today.completedToast": "Completed. Today’s flow moved forward a little.",
    "actions.save": "Save",
    "actions.delete": "Delete",
    "actions.close": "Close",
    "actions.done": "Done",
    "actions.undo": "Undo",
    "dialog.close": "Close",
    "goalDialog.createTitle": "Create goal",
    "goalDialog.editTitle": "Edit goal",
    "goalDialog.name": "Goal name",
    "goalDialog.namePlaceholder": "Example: Bench press +10kg in 3 months",
    "goalDialog.category": "Category",
    "goalDialog.categoryPlaceholder": "Example: Training, Study, Side project",
    "goalDialog.deadline": "Deadline",
    "goalDialog.startDate": "Start date",
    "goalDialog.note": "Goal note",
    "goalDialog.notePlaceholder": "Success condition or reason",
    "goalDialog.confirmDelete": "Delete “{name}”?\nSaved tasks and scheduled items linked to it will also be deleted.",
    "goalDialog.deleted": "Goal deleted.",
    "taskDialog.title": "Save task",
    "taskDialog.name": "Task name",
    "taskDialog.namePlaceholder": "Example: Review 30 words",
    "taskDialog.goal": "Linked goal",
    "taskDialog.duration": "Duration",
    "taskDialog.unit": "Unit",
    "taskEdit.name": "Task name",
    "taskEdit.goal": "Goal",
    "taskEdit.duration": "Time",
    "taskEdit.unit": "Unit",
    "taskEdit.updated": "Saved task updated.",
    "taskEdit.confirmDelete": "Delete “{title}”?",
    "taskEdit.confirmDeleteWithRelated": "Delete “{title}”?\n{count} matching calendar items will also be deleted.",
    "taskEdit.deleted": "Saved task deleted.",
    "unit.minutes": "min",
    "unit.hours": "hours",
    "duration.minutes": "{value} min",
    "duration.hours": "{value} h",
    "categories.training": "Training",
    "categories.study": "Study",
    "categories.work": "Work",
    "categories.health": "Health",
    "categories.habit": "Habit",
    "dayDialog.kicker": "Day plan",
    "dayDialog.title": "{date} plan",
    "dayDialog.empty": "No tasks scheduled for this day.",
    "dayDialog.noGoal": "No goal",
    "next.noGoal.title": "Create your first goal",
    "next.noGoal.body": "Start with one goal that has a reason you want to keep going.",
    "next.noGoal.button": "Create goal",
    "next.noGoal.buddyTitle": "First step",
    "next.noGoal.buddyMessage": "One clear reason is enough to begin.",
    "next.noTask.title": "Make it small enough for today",
    "next.noTask.body": "Goal created. Now save a small task that takes 15 to 30 minutes.",
    "next.noTask.button": "Add task",
    "next.noTask.buddyTitle": "Start planning backward",
    "next.noTask.buddyMessage": "A goal becomes easier when it turns into today’s shape.",
    "next.noToday.title": "Add a task to today",
    "next.noToday.body": "Put a saved task on today and it becomes an action, not just a plan.",
    "next.noToday.button": "Open schedule",
    "next.noToday.buddyTitle": "Bring it to today",
    "next.noToday.buddyMessage": "Even a distant goal can move through one task today.",
    "next.inProgress.title": "Finish one task today",
    "next.inProgress.body": "{done} of {total} tasks are done today. Finish just one to build momentum.",
    "next.inProgress.button": "View today’s tasks",
    "next.inProgress.buddyTitle": "Almost there",
    "next.inProgress.buddyMessage": "Record beats perfection. One completion helps tomorrow’s you.",
    "next.done.title": "Today’s flow is complete",
    "next.done.body": "Today’s tasks are done. If you have energy, prepare one task for tomorrow.",
    "next.done.button": "View schedule",
    "next.done.buddyTitle": "Good streak",
    "next.done.buddyMessage": "Completion turned into a record. That small accumulation is the heart of GoalFlow.",
    "file.title": "Open with a local server",
    "file.body": "This screen was opened as a file. If it does not work, open http://127.0.0.1:4174/index.html.",
    "offline.failed": "Offline setup failed.",
  },
};

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
  languageToggle: document.querySelector("#languageToggle"),
  languageToggleLabel: document.querySelector("#languageToggleLabel"),
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
      language: "ja",
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
        language: parsed.meta?.language === "en" ? "en" : "ja",
        calendarSize: normalizeCalendarSize(parsed.meta?.calendarSize),
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

function normalizeCalendarSize(size) {
  if (calendarSizes.includes(size)) return size;
  if (size === "compact") return "size-2";
  if (size === "large") return "size-6";
  return "size-4";
}

function currentLanguage() {
  return state.meta.language === "en" ? "en" : "ja";
}

function t(key, values = {}) {
  const template = translations[currentLanguage()]?.[key] ?? translations.ja[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function localizeStaticContent() {
  const lang = currentLanguage();
  document.documentElement.lang = lang;
  document.body.dataset.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.setAttribute("title", t(node.dataset.i18nTitle));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  if (els.languageToggle) {
    els.languageToggle.setAttribute("aria-label", t("language.aria"));
  }
  if (els.languageToggleLabel) {
    els.languageToggleLabel.textContent = t("language.switch");
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  if (els.saveStatus) {
    const locale = currentLanguage() === "en" ? "en-US" : "ja-JP";
    const time = new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    els.saveStatus.textContent = t("status.saved", { time });
  }
}

function render() {
  localizeStaticContent();
  renderTheme();
  renderFileWarning();
  document.body.dataset.viewMode = viewMode;
  document.body.dataset.calendarSize = calendarSize;
  state.meta.calendarSize = calendarSize;
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
  if (els.themeToggleLabel) els.themeToggleLabel.textContent = theme === "dark" ? t("theme.light") : t("theme.dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0f172a" : "#146c63");
}

function renderFileWarning() {
  if (!els.fileWarning) return;
  els.fileWarning.hidden = window.location.protocol !== "file:";
  els.fileWarning.querySelector("strong").textContent = t("file.title");
  els.fileWarning.querySelector("p").textContent = t("file.body");
}

function renderGoals() {
  els.goalCount.textContent = state.goals.length;
  els.goalList.innerHTML = "";
  if (!state.goals.length) {
    els.goalList.append(empty(t("goals.empty")));
    return;
  }
  state.goals.forEach((goal) => {
    const done = state.scheduled.filter((item) => item.goalId === goal.id && item.done).length;
    const total = state.scheduled.filter((item) => item.goalId === goal.id).length;
    const percent = total ? Math.round((done / total) * 100) : 0;
    const daysLeft = daysBetween(today, goal.deadline);
    const startLabel = formatDate(goal.createdAt);
    const deadlineLabel = formatDate(goal.deadline);
    const paceLabel = total ? t("goals.doneTotal", { done, total }) : t("goals.scheduledFirst");
    const deadlineTone =
      daysLeft >= 0 ? t("goals.deadlineLeft", { days: daysLeft }) : t("goals.deadlinePassed", { days: Math.abs(daysLeft) });
    const card = document.createElement("article");
    card.className = `goal-card ${goal.id === selectedGoalId ? "active" : ""}`;
    card.innerHTML = `
      <div class="goal-card-head">
        <button type="button" class="goal-select">
          <span class="goal-title"><span>${escapeHtml(goal.name)}</span><span class="tag">${escapeHtml(goal.category)}</span></span>
          <p class="goal-meta">${escapeHtml(t("goals.startDeadline", { start: startLabel, deadline: deadlineLabel, tone: deadlineTone }))}</p>
        </button>
      </div>
      <div class="goal-stats">
        <span>${escapeHtml(paceLabel)}</span>
        <span>${escapeHtml(t("goals.progress", { percent }))}</span>
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
    els.taskBank.append(empty(t("tasks.empty")));
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
        <span class="task-drag-handle" data-drag-handle draggable="true" role="button" tabindex="0" aria-label="${escapeHtml(t("tasks.dragAria"))}"></span>
        <div class="bank-task-copy">${taskMarkup(task, goal)}</div>
      </div>
      ${
        editingTaskId === task.id
          ? `
            <form class="task-edit-form" data-task-edit="${escapeHtml(task.id)}">
              <label>${escapeHtml(t("taskEdit.name"))}<input name="title" required maxlength="28" value="${escapeHtml(task.title)}" /></label>
              <label>${escapeHtml(t("taskEdit.goal"))}<select name="goalId">${taskGoalOptions(task.goalId)}</select></label>
              <div class="field-row">
                <label>${escapeHtml(t("taskEdit.duration"))}<input name="durationValue" type="number" min="1" max="240" step="1" value="${escapeHtml(task.durationValue ?? task.minutes ?? 30)}" /></label>
                <label>${escapeHtml(t("taskEdit.unit"))}<select name="durationUnit">${durationUnitOptions(task.durationUnit ?? "minutes")}</select></label>
              </div>
              <div class="task-edit-actions">
                <button class="mini-button danger-button" type="button" data-action="delete-task">${escapeHtml(t("actions.delete"))}</button>
                <button class="mini-button" type="submit">${escapeHtml(t("actions.save"))}</button>
                <button class="mini-button" type="button" data-action="close-edit">${escapeHtml(t("actions.close"))}</button>
              </div>
            </form>
          `
          : ""
      }
      <div class="bank-task-actions">
        <button class="mini-button" type="button" data-action="today">${escapeHtml(t("tasks.addToday"))}</button>
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
    deleteScheduledItem(item, t("schedule.returned"));
  }
}

function taskGoalOptions(selectedId) {
  return state.goals
    .map((goal) => `<option value="${escapeHtml(goal.id)}" ${goal.id === selectedId ? "selected" : ""}>${escapeHtml(goal.name)}</option>`)
    .join("");
}

function durationUnitOptions(selectedUnit) {
  return `
    <option value="minutes" ${selectedUnit === "minutes" ? "selected" : ""}>${escapeHtml(t("unit.minutes"))}</option>
    <option value="hours" ${selectedUnit === "hours" ? "selected" : ""}>${escapeHtml(t("unit.hours"))}</option>
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
      <label>${escapeHtml(t("taskEdit.name"))}<input name="title" required maxlength="28" value="${escapeHtml(item.title)}" /></label>
      <label>${escapeHtml(t("taskEdit.goal"))}<select name="goalId">${taskGoalOptions(item.goalId)}</select></label>
      <div class="field-row">
        <label>${escapeHtml(t("taskEdit.duration"))}<input name="durationValue" type="number" min="1" max="240" step="1" value="${escapeHtml(item.durationValue ?? item.minutes ?? 30)}" /></label>
        <label>${escapeHtml(t("taskEdit.unit"))}<select name="durationUnit">${durationUnitOptions(item.durationUnit ?? "minutes")}</select></label>
      </div>
      <div class="task-edit-actions">
        <button class="mini-button danger-button" type="button" data-action="delete-scheduled-edit">${escapeHtml(t("actions.delete"))}</button>
        <button class="mini-button" type="submit">${escapeHtml(t("actions.save"))}</button>
        <button class="mini-button" type="button" data-action="close-scheduled-edit">${escapeHtml(t("actions.close"))}</button>
      </div>
    </form>
  `;
}

function createDragPreview(task, goal) {
  const preview = document.createElement("div");
  preview.className = "drag-preview";
  preview.innerHTML = `
    <strong>${escapeHtml(task.title)}</strong>
    <span>${escapeHtml(goal?.category ?? t("tasks.title"))}・${escapeHtml(formatDuration(task))}</span>
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
        <span class="day-name">${escapeHtml(formatWeekday(date))}</span>
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
      <button class="mini-button" type="button" data-action="done">${escapeHtml(item.done ? t("actions.undo") : t("actions.done"))}</button>
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
    els.todayList.append(empty(t("today.empty")));
    return;
  }
  items
    .sort((a, b) => a.title.localeCompare(b.title, currentLanguage() === "en" ? "en" : "ja"))
    .forEach((item) => {
      const task = state.tasks.find((candidate) => candidate.id === item.taskId) ?? item;
      const goal = findGoal(item.goalId);
      const node = document.createElement("article");
      node.className = `today-task ${item.done ? "done" : ""} ${item.id === highlightedCompletionId ? "just-completed" : ""}`;
      node.innerHTML = `
        ${taskMarkup({ ...task, title: item.title, minutes: item.minutes }, goal)}
        <div class="task-actions">
          <button class="mini-button" type="button" data-action="done">${escapeHtml(item.done ? t("actions.undo") : t("actions.done"))}</button>
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
    showToast(t("today.completedToast"));
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
  els.goalFilter.innerHTML = `<option value="">${escapeHtml(currentLanguage() === "en" ? "All goals" : "すべて")}</option>${options}`;
  els.taskGoalSelect.value = selectedGoalId || state.goals[0]?.id || "";
  els.goalFilter.value = selectedGoalId;
  els.chartMetric.value = chartMetric;
  els.pieMetric.value = pieMetric;
  els.chartMetricNote.textContent =
    chartMetric === "time" ? t("chart.note.time") : t("chart.note.count");
  els.pieMetricNote.textContent =
    pieMetric === "time" ? t("pie.note.time") : t("pie.note.count");
  els.weekView.classList.toggle("active", viewMode === "week");
  els.monthView.classList.toggle("active", viewMode === "month");
  els.weekView.setAttribute("aria-pressed", String(viewMode === "week"));
  els.monthView.setAttribute("aria-pressed", String(viewMode === "month"));
  els.todayPeriod.textContent = t("schedule.todayButton");
  const todayIsVisible = isTodayVisibleInSchedule();
  els.todayPeriod.classList.toggle("needs-attention", !todayIsVisible);
  els.todayPeriod.setAttribute("aria-label", todayIsVisible ? t("schedule.todayVisible") : t("schedule.todayButton"));
  els.todayPeriod.title = todayIsVisible ? t("schedule.todayVisible") : t("schedule.todayButton");
  els.calendarZoomOut.disabled = calendarSize === calendarSizes[0];
  els.calendarZoomIn.disabled = calendarSize === calendarSizes.at(-1);
}

function renderCategoryOptions() {
  if (!els.categoryOptions && !els.categoryPicker) return;
  const categories = new Set([t("categories.training"), t("categories.study"), t("categories.work"), t("categories.health"), t("categories.habit")]);
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
      title: t("next.noGoal.title"),
      body: t("next.noGoal.body"),
      button: t("next.noGoal.button"),
      action: "createGoal",
      buddyTitle: t("next.noGoal.buddyTitle"),
      buddyMessage: t("next.noGoal.buddyMessage"),
    };
  }

  if (!state.tasks.length) {
    return {
      title: t("next.noTask.title"),
      body: t("next.noTask.body"),
      button: t("next.noTask.button"),
      action: "createTask",
      buddyTitle: t("next.noTask.buddyTitle"),
      buddyMessage: t("next.noTask.buddyMessage"),
    };
  }

  if (!todaysItems.length) {
    return {
      title: t("next.noToday.title"),
      body: t("next.noToday.body"),
      button: t("next.noToday.button"),
      action: "openTasks",
      buddyTitle: t("next.noToday.buddyTitle"),
      buddyMessage: t("next.noToday.buddyMessage"),
    };
  }

  if (todaysDone < todaysItems.length) {
    return {
      title: t("next.inProgress.title"),
      body: t("next.inProgress.body", { total: todaysItems.length, done: todaysDone }),
      button: t("next.inProgress.button"),
      action: "openToday",
      buddyTitle: t("next.inProgress.buddyTitle"),
      buddyMessage: t("next.inProgress.buddyMessage"),
    };
  }

  return {
    title: t("next.done.title"),
    body: t("next.done.body"),
    button: t("next.done.button"),
    action: "openSchedule",
    buddyTitle: t("next.done.buddyTitle"),
    buddyMessage: t("next.done.buddyMessage"),
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
  els.summaryStreak.textContent = t("summary.streakValue", { count: calcStreak() });
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
    drawEmptyCanvas(ctx, width, height, t("chart.empty"));
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
    drawEmptyCanvas(ctx, width, height, t("pie.empty"));
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
    ctx.fillText(t("pie.rateLabel", { metric: labels.name }), centerX, centerY + 32);

    drawLegend(ctx, 26, height - 36, canvasColor("--accent", "#146c63"), t("pie.done", { value: formatMetricValue(done * progress, pieMetric) }));
    drawLegend(ctx, Math.max(26, width - 156), height - 36, canvasColor("--canvas-line", "#e4e9df"), t("pie.pending", { value: formatMetricValue(pending, pieMetric) }));
  };
  animateCanvas("pie", draw, 680);
}

function renderGoalReport() {
  els.goalReport.innerHTML = "";
  const head = document.createElement("div");
  head.className = "report-head";
  head.innerHTML = `<span>${escapeHtml(t("report.head.goal"))}</span><span>${escapeHtml(t("report.head.start"))}</span><span>${escapeHtml(t("report.head.record"))}</span><span>${escapeHtml(t("report.head.progress"))}</span>`;
  els.goalReport.append(head);

  if (!state.goals.length) {
    els.goalReport.append(empty(t("report.empty")));
    return;
  }

  state.goals.forEach((goal) => {
    const items = state.scheduled.filter((item) => item.goalId === goal.id);
    const done = items.filter((item) => item.done).length;
    const rate = items.length ? Math.round((done / items.length) * 100) : 0;
    const daysActive = Math.max(1, daysBetween(goal.createdAt, today) + 1);
    const daysLeft = daysBetween(today, goal.deadline);
    const progressText = items.length ? t("report.progress", { done, total: items.length }) : t("report.unplanned");
    const startText = t("report.start", { date: formatDate(goal.createdAt), days: daysActive });
    const supportText = daysLeft >= 0 ? t("report.deadlineLeft", { days: daysLeft }) : t("report.deadlinePassed", { days: Math.abs(daysLeft) });
    const row = document.createElement("div");
    row.className = "report-row";
    row.innerHTML = `
      <div class="report-title"><span>${escapeHtml(goal.name)}</span></div>
      <span class="report-start">${escapeHtml(startText)}</span>
      <span class="report-rate">${escapeHtml(progressText)}</span>
      <div class="report-progress-cell">
        <div class="report-progress" aria-label="${escapeHtml(t("report.aria", { goal: goal.name, rate }))}"><span style="width: ${rate}%"></span></div>
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
    return { name: t("metric.time"), caption: t("metric.timeCaption") };
  }
  return { name: t("metric.count"), caption: t("metric.countCaption") };
}

function formatMetricValue(value, metric) {
  if (metric === "time") {
    const minutes = Math.round(value);
    if (minutes >= 60) {
      const hours = minutes / 60;
      return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
    }
    return t("duration.minutes", { value: minutes });
  }
  return currentLanguage() === "en" ? String(Math.round(value)) : `${Math.round(value)}個`;
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
  const goalName = goal?.name ?? t("tasks.noGoal");
  const meta = isCompact ? `${goalName}` : `${goalName}・${duration}`;
  return `
    <div class="task-title"><span>${escapeHtml(task.title)}</span></div>
    <p class="task-meta">${escapeHtml(meta)}</p>
  `;
}

function deleteGoal(goal) {
  const ok = window.confirm(t("goalDialog.confirmDelete", { name: goal.name }));
  if (!ok) return false;
  state.goals = state.goals.filter((candidate) => candidate.id !== goal.id);
  state.tasks = state.tasks.filter((task) => task.goalId !== goal.id);
  state.scheduled = state.scheduled.filter((item) => item.goalId !== goal.id);
  selectedGoalId = state.goals[0]?.id ?? "";
  showToast(t("goalDialog.deleted"));
  render();
  return true;
}

function deleteSavedTask(task) {
  const relatedCount = state.scheduled.filter((item) => item.taskId === task.id).length;
  const message = relatedCount
    ? t("taskEdit.confirmDeleteWithRelated", { title: task.title, count: relatedCount })
    : t("taskEdit.confirmDelete", { title: task.title });
  if (!window.confirm(message)) return;
  state.tasks = state.tasks.filter((candidate) => candidate.id !== task.id);
  state.scheduled = state.scheduled.filter((item) => item.taskId !== task.id);
  showToast(t("taskEdit.deleted"));
  render();
}

function deleteScheduledItem(item, message = t("schedule.deleted")) {
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
  showToast(t("taskEdit.updated"));
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
  showToast(t("schedule.updated"));
  render();
}

function openDayDialog(date) {
  const items = state.scheduled
    .filter((item) => item.date === date && (!selectedGoalId || item.goalId === selectedGoalId))
    .sort((a, b) => a.title.localeCompare(b.title, currentLanguage() === "en" ? "en" : "ja"));
  els.dayDialogTitle.textContent = t("dayDialog.title", { date: formatDateWithWeekday(date) });
  els.dayDialogList.innerHTML = items.length
    ? items
        .map((item) => {
          const goal = findGoal(item.goalId);
          return `
            <article class="day-dialog-item ${item.done ? "done" : ""}">
              <div>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(goal?.name ?? t("dayDialog.noGoal"))}・${escapeHtml(formatDuration(item))}</span>
              </div>
              <button class="mini-button" type="button" data-day-done="${escapeHtml(item.id)}">${escapeHtml(item.done ? t("actions.undo") : t("actions.done"))}</button>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">${escapeHtml(t("dayDialog.empty"))}</div>`;
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
  if (currentLanguage() === "en") {
    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${formatWeekday(date)})`;
  }
  return `${date.getMonth() + 1}/${date.getDate()}（${formatWeekday(date)}）`;
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
  showToast(date === toISO(today) ? t("schedule.addedToday") : t("schedule.added"));
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
  showToast(t("schedule.moved"));
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
  if (unit === "hours") return t("duration.hours", { value });
  return t("duration.minutes", { value });
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
  if (currentLanguage() === "en") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatMonthTitle(date) {
  if (currentLanguage() === "en") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`;
}

function formatWeekday(date) {
  return currentLanguage() === "en"
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]
    : ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
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

els.openGoalDialog.addEventListener("click", () => openGoalDialog());

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
  els.goalForm.querySelector("h2").textContent = goal ? t("goalDialog.editTitle") : t("goalDialog.createTitle");
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
    category: data.get("category").trim() || t("goals.unspecified"),
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
  calendarSize = calendarSizes[Math.max(0, calendarSizes.indexOf(calendarSize) - 1)];
  state.meta.calendarSize = calendarSize;
  render();
});

els.calendarZoomIn.addEventListener("click", () => {
  calendarSize = calendarSizes[Math.min(calendarSizes.length - 1, calendarSizes.indexOf(calendarSize) + 1)];
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

els.languageToggle.addEventListener("click", () => {
  state.meta.language = currentLanguage() === "en" ? "ja" : "en";
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
      .register("./sw.js?v=20260520-i18ncopy")
      .then((registration) => registration.update())
      .catch(() => {
        showToast(t("offline.failed"));
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
