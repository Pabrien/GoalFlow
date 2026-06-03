import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: GoalFlowStore
    @State private var selectedTab: AppTab = .today
    @State private var sheet: ActiveSheet?

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView(sheet: $sheet)
                .tabItem { Label("今日", systemImage: "checkmark.circle") }
                .tag(AppTab.today)

            GoalsView(sheet: $sheet)
                .tabItem { Label("目標", systemImage: "target") }
                .tag(AppTab.goals)

            ActionsView(sheet: $sheet)
                .tabItem { Label("行動", systemImage: "tray.full") }
                .tag(AppTab.actions)

            ScheduleView(sheet: $sheet)
                .tabItem { Label("予定", systemImage: "calendar") }
                .tag(AppTab.schedule)

            ProgressScreen()
                .tabItem { Label("進捗", systemImage: "chart.bar") }
                .tag(AppTab.progress)
        }
        .tint(.goalAccent)
        .sheet(item: $sheet) { sheet in
            switch sheet {
            case .goal:
                GoalEditor()
            case .task:
                TaskEditor()
            case .schedule(let task):
                ScheduleEditor(task: task)
            case .scheduled(let item):
                ScheduledEditor(item: item)
            }
        }
    }
}

private enum AppTab {
    case today
    case goals
    case actions
    case schedule
    case progress
}

enum ActiveSheet: Identifiable {
    case goal
    case task
    case schedule(ActionTask)
    case scheduled(ScheduledTask)

    var id: String {
        switch self {
        case .goal: "goal"
        case .task: "task"
        case .schedule(let task): "schedule-\(task.id)"
        case .scheduled(let item): "scheduled-\(item.id)"
        }
    }
}

struct TodayView: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var sheet: ActiveSheet?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HeroProgressCard(
                        title: "今日やること",
                        subtitle: "目標から逆算した、今日の一歩だけを見る",
                        progress: store.todayCompletionRate
                    )

                    if store.todayTasks.isEmpty {
                        EmptyStateView(
                            title: "今日の予定はまだありません",
                            message: "行動リストから日付を選ぶと、今日の一歩に変わります。",
                            systemImage: "sparkle.magnifyingglass"
                        )
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(store.todayTasks) { item in
                                ScheduledTaskRow(item: item)
                                    .onTapGesture {
                                        sheet = .scheduled(item)
                                    }
                            }
                        }
                    }
                }
                .padding()
            }
            .background(Color.appBackground)
            .navigationTitle("GoalFlow")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        sheet = .task
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("行動を追加")
                }
            }
        }
    }
}

struct GoalsView: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var sheet: ActiveSheet?

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.goals) { goal in
                    GoalCard(goal: goal)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Color.appBackground)
            .navigationTitle("目標")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        sheet = .goal
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("目標を追加")
                }
            }
        }
    }
}

struct ActionsView: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var sheet: ActiveSheet?

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.tasks) { task in
                    ActionCard(task: task) {
                        sheet = .schedule(task)
                    }
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Color.appBackground)
            .navigationTitle("行動")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        sheet = .task
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("行動を追加")
                }
            }
        }
    }
}

struct ScheduleView: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var sheet: ActiveSheet?
    @State private var weekStart = Calendar.current.startOfDay(for: Date())

    private var week: [Date] {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: weekStart)
        let start = calendar.date(byAdding: .day, value: 1 - weekday, to: weekStart) ?? weekStart
        return (0..<7).map { start.addingDays($0) }
    }

    var body: some View {
        NavigationStack {
            ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: 12) {
                    ForEach(week, id: \.self) { date in
                        DayColumn(date: date, items: store.tasks(for: date), sheet: $sheet)
                    }
                }
                .padding()
            }
            .background(Color.appBackground)
            .navigationTitle("予定")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        weekStart = weekStart.addingDays(-7)
                    } label: {
                        Image(systemName: "chevron.left")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        weekStart = weekStart.addingDays(7)
                    } label: {
                        Image(systemName: "chevron.right")
                    }
                }
            }
        }
    }
}

struct ProgressScreen: View {
    @EnvironmentObject private var store: GoalFlowStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    HeroProgressCard(
                        title: "今日の進み具合",
                        subtitle: "\(store.todayTasks.filter(\.isDone).count)/\(store.todayTasks.count) 完了",
                        progress: store.todayCompletionRate
                    )
                    HeroProgressCard(
                        title: "全体の積み上げ",
                        subtitle: "\(store.scheduled.filter(\.isDone).count)/\(store.scheduled.count) 完了",
                        progress: store.overallCompletionRate
                    )
                    VStack(alignment: .leading, spacing: 10) {
                        Text("目標別")
                            .font(.headline)
                        ForEach(store.goals) { goal in
                            let total = store.scheduled.filter { $0.goalID == goal.id }.count
                            let done = store.scheduled.filter { $0.goalID == goal.id && $0.isDone }.count
                            ProgressRow(title: goal.title, done: done, total: total, color: Color(hex: goal.colorHex))
                        }
                    }
                    .cardStyle()
                }
                .padding()
            }
            .background(Color.appBackground)
            .navigationTitle("進捗")
        }
    }
}

struct GoalCard: View {
    @EnvironmentObject private var store: GoalFlowStore
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(goal.title)
                        .font(.headline)
                    Text(goal.category.rawValue)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Color(hex: goal.colorHex))
                }
                Spacer()
                Text(goal.deadline, format: .dateTime.month().day())
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
            }
            Text(goal.reason.isEmpty ? "理由はあとから追加できます。" : goal.reason)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            ProgressRow(
                title: "進み具合",
                done: store.scheduled.filter { $0.goalID == goal.id && $0.isDone }.count,
                total: store.scheduled.filter { $0.goalID == goal.id }.count,
                color: Color(hex: goal.colorHex)
            )
        }
        .cardStyle()
    }
}

struct ActionCard: View {
    @EnvironmentObject private var store: GoalFlowStore
    let task: ActionTask
    let onSchedule: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 5)
                .fill(Color(hex: store.goal(for: task.goalID)?.colorHex ?? "#2563EB"))
                .frame(width: 6)
            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.headline)
                Text(store.goal(for: task.goalID)?.title ?? "未設定")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("日付") {
                onSchedule()
            }
            .buttonStyle(.borderedProminent)
            .tint(.goalAccent)
        }
        .cardStyle()
    }
}

struct ScheduledTaskRow: View {
    @EnvironmentObject private var store: GoalFlowStore
    let item: ScheduledTask

    var body: some View {
        HStack(spacing: 12) {
            Button {
                store.toggleDone(item)
            } label: {
                Image(systemName: item.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
            }
            .buttonStyle(.plain)
            .foregroundStyle(item.isDone ? Color.goalAccent : Color.secondary)

            VStack(alignment: .leading, spacing: 3) {
                Text(item.title)
                    .font(.headline)
                    .strikethrough(item.isDone)
                if let goal = store.goal(for: item.goalID) {
                    Text(goal.title)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Text(item.date, format: .dateTime.month().day())
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
        }
        .contentShape(RoundedRectangle(cornerRadius: 18))
        .cardStyle()
    }
}

struct DayColumn: View {
    @Binding var sheet: ActiveSheet?
    let date: Date
    let items: [ScheduledTask]

    init(date: Date, items: [ScheduledTask], sheet: Binding<ActiveSheet?>) {
        self.date = date
        self.items = items
        self._sheet = sheet
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(date, format: .dateTime.weekday(.abbreviated))
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
            Text(date, format: .dateTime.day())
                .font(.largeTitle.weight(.bold))
            Divider()
            if items.isEmpty {
                Text("予定なし")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                ForEach(items) { item in
                    Button {
                        sheet = .scheduled(item)
                    } label: {
                        Text(item.title)
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(10)
                            .background(item.isDone ? Color.goalAccent.opacity(0.12) : Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .frame(width: 164, alignment: .topLeading)
        .padding()
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 22))
    }
}

struct HeroProgressCard: View {
    let title: String
    let subtitle: String
    let progress: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.title2.weight(.bold))
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            ProgressView(value: progress)
                .tint(.goalAccent)
                .scaleEffect(y: 1.7)
            Text("\(Int((progress * 100).rounded()))%")
                .font(.system(size: 34, weight: .bold, design: .rounded))
        }
        .cardStyle()
    }
}

struct ProgressRow: View {
    let title: String
    let done: Int
    let total: Int
    let color: Color

    var body: some View {
        let progress = total == 0 ? 0 : Double(done) / Double(total)
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(done)/\(total)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: progress)
                .tint(color)
        }
    }
}

struct EmptyStateView: View {
    let title: String
    let message: String
    let systemImage: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 36, weight: .semibold))
                .foregroundStyle(Color.goalAccent)
            Text(title)
                .font(.headline)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .cardStyle()
    }
}

struct GoalEditor: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var category: GoalCategory = .study
    @State private var reason = ""
    @State private var deadline = Date().addingDays(30)

    var body: some View {
        NavigationStack {
            Form {
                TextField("目標名", text: $title)
                Picker("カテゴリ", selection: $category) {
                    ForEach(GoalCategory.allCases) { category in
                        Text(category.rawValue).tag(category)
                    }
                }
                TextField("続けたい理由", text: $reason, axis: .vertical)
                DatePicker("期限", selection: $deadline, displayedComponents: .date)
            }
            .navigationTitle("目標を作る")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        store.addGoal(title: title, category: category, reason: reason, deadline: deadline)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

struct TaskEditor: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Environment(\.dismiss) private var dismiss
    @State private var goalID: UUID?
    @State private var title = ""
    @State private var detail = ""
    @State private var minutes = 15

    var body: some View {
        NavigationStack {
            Form {
                Picker("目標", selection: $goalID) {
                    ForEach(store.goals) { goal in
                        Text(goal.title).tag(Optional(goal.id))
                    }
                }
                TextField("行動名", text: $title)
                TextField("メモ", text: $detail, axis: .vertical)
                Stepper("目安 \(minutes)分", value: $minutes, in: 5...180, step: 5)
            }
            .onAppear {
                goalID = goalID ?? store.goals.first?.id
            }
            .navigationTitle("行動を作る")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        guard let goalID else { return }
                        store.addTask(goalID: goalID, title: title, detail: detail, estimatedMinutes: minutes)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || goalID == nil)
                }
            }
        }
    }
}

struct ScheduleEditor: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Environment(\.dismiss) private var dismiss
    let task: ActionTask
    @State private var date = Date()

    var body: some View {
        NavigationStack {
            Form {
                Section("予定に入れる行動") {
                    Text(task.title)
                }
                DatePicker("日付", selection: $date, displayedComponents: .date)
            }
            .navigationTitle("予定に入れる")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("追加") {
                        store.schedule(task: task, on: date)
                        dismiss()
                    }
                }
            }
        }
    }
}

struct ScheduledEditor: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Environment(\.dismiss) private var dismiss
    let item: ScheduledTask
    @State private var title: String
    @State private var date: Date

    init(item: ScheduledTask) {
        self.item = item
        _title = State(initialValue: item.title)
        _date = State(initialValue: item.date)
    }

    var body: some View {
        NavigationStack {
            Form {
                TextField("タスク名", text: $title)
                DatePicker("日付", selection: $date, displayedComponents: .date)
                Button(role: .destructive) {
                    store.deleteScheduled(item)
                    dismiss()
                } label: {
                    Text("削除")
                }
            }
            .navigationTitle("予定を編集")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        store.updateScheduled(item, title: title, date: date)
                        dismiss()
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}

private extension View {
    func cardStyle() -> some View {
        padding(16)
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .shadow(color: .black.opacity(0.06), radius: 18, y: 8)
    }
}

private extension Color {
    static let goalAccent = Color(red: 0.08, green: 0.42, blue: 0.39)
    static let appBackground = Color(red: 0.96, green: 0.97, blue: 0.95)
    static let cardBackground = Color.white.opacity(0.92)
}

#Preview {
    ContentView()
        .environmentObject(GoalFlowStore())
}
