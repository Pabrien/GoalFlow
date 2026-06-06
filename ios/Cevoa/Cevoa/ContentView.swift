import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject private var store: CevoaStore
    @State private var selectedTab: AppTab = .plan
    @State private var sheet: ActiveSheet?

    var body: some View {
        TabView(selection: $selectedTab) {
            TodayView(sheet: $sheet)
                .tabItem { Label("今日", systemImage: "checkmark.circle") }
                .tag(AppTab.today)

            GoalsView(sheet: $sheet)
                .tabItem { Label("目標", systemImage: "target") }
                .tag(AppTab.goals)

            PlannerView(sheet: $sheet)
                .tabItem { Label("予定", systemImage: "calendar") }
                .tag(AppTab.plan)

            ProgressScreen()
                .tabItem { Label("進捗", systemImage: "chart.bar") }
                .tag(AppTab.progress)
        }
        .tint(.goalAccent)
        .sheet(item: $sheet) { item in
            switch item {
            case .goal:
                GoalEditor()
                    .presentationDetents([.large])
            case .editGoal(let goal):
                GoalEditor(goal: goal)
                    .presentationDetents([.large])
            case .task(let goalID):
                TaskEditor(initialGoalID: goalID)
                    .presentationDetents([.large])
            case .schedule(let task):
                ScheduleEditor(task: task)
                    .presentationDetents([.medium])
            case .scheduled(let item):
                ScheduledEditor(item: item)
                    .presentationDetents([.medium])
            case .day(let date):
                DayProgressSheet(date: date)
                    .presentationDetents([.medium, .large])
            case .backcast(let goal):
                BackcastEditor(goal: goal)
                    .presentationDetents([.large])
            }
        }
    }
}

private enum AppTab {
    case today
    case goals
    case plan
    case progress
}

enum ActiveSheet: Identifiable {
    case goal
    case editGoal(Goal)
    case task(UUID?)
    case schedule(ActionTask)
    case scheduled(ScheduledTask)
    case day(Date)
    case backcast(Goal)

    var id: String {
        switch self {
        case .goal: "goal"
        case .editGoal(let goal): "edit-goal-\(goal.id)"
        case .task(let goalID): "task-\(goalID?.uuidString ?? "new")"
        case .schedule(let task): "schedule-\(task.id)"
        case .scheduled(let item): "scheduled-\(item.id)"
        case .day(let date): "day-\(date.startOfDay.timeIntervalSince1970)"
        case .backcast(let goal): "backcast-\(goal.id)"
        }
    }
}

struct TodayView: View {
    @EnvironmentObject private var store: CevoaStore
    @Binding var sheet: ActiveSheet?
    @Namespace private var completeNamespace

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        TodayHeader()
                        if store.goals.isEmpty || store.tasks.isEmpty || store.scheduled.isEmpty {
                            FirstRunPathCard(
                                hasGoal: !store.goals.isEmpty,
                                hasTask: !store.tasks.isEmpty,
                                hasSchedule: !store.scheduled.isEmpty,
                                onAddGoal: { sheet = .goal },
                                onAddTask: { sheet = .task(store.goals.first?.id) }
                            )
                        }
                        TodayPriorityCard(
                            items: store.todayTasks,
                            onEdit: { sheet = .scheduled($0) }
                        )
                        if store.todayTasks.isEmpty {
                            EmptyFocusCard()
                        } else {
                            LazyVStack(spacing: 10) {
                                ForEach(store.todayTasks) { item in
                                    ScheduledTaskRow(item: item, compact: false)
                                        .onTapGesture {
                                            sheet = .scheduled(item)
                                        }
                                        .transition(.scale(scale: 0.96).combined(with: .opacity))
                                }
                            }
                        }
                    }
                    .padding(18)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Cevoa")
        }
    }
}

struct GoalsView: View {
    @EnvironmentObject private var store: CevoaStore
    @Binding var sheet: ActiveSheet?
    @State private var expandedGoalID: UUID?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 14) {
                        GoalActionsCard(
                            onAddGoal: { sheet = .goal }
                        )

                        if store.goals.isEmpty {
                            EmptyGoalCard(onAddGoal: { sheet = .goal })
                        } else {
                            ForEach(store.goals) { goal in
                                GoalCard(
                                    goal: goal,
                                    isExpanded: expandedGoalID == goal.id,
                                    onToggle: {
                                        withAnimation(.spring(response: 0.38, dampingFraction: 0.84)) {
                                            expandedGoalID = expandedGoalID == goal.id ? nil : goal.id
                                        }
                                        UISelectionFeedbackGenerator().selectionChanged()
                                    },
                                    onEdit: { sheet = .editGoal(goal) },
                                    onBackcast: {
                                        sheet = .backcast(goal)
                                    }
                                )
                            }
                        }
                    }
                    .padding(18)
                    .padding(.bottom, 32)
                }
            }
        }
    }
}

struct GoalActionsCard: View {
    let onAddGoal: () -> Void

    var body: some View {
        Button(action: onAddGoal) {
            Label("目標を作る", systemImage: "plus")
                .frame(maxWidth: .infinity)
        }
        .buttonStyle(.filledPill)
        .cardStyle()
    }
}

struct EmptyGoalCard: View {
    let onAddGoal: () -> Void

    var body: some View {
        Button(action: onAddGoal) {
            VStack(spacing: 12) {
                Image(systemName: "target")
                    .font(.system(size: 34, weight: .semibold))
                Text("最初の目標")
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
        }
        .buttonStyle(.plain)
        .foregroundStyle(Color.goalAccent)
        .cardStyle()
    }
}

struct GoalCard: View {
    @EnvironmentObject private var store: CevoaStore
    let goal: Goal
    let isExpanded: Bool
    let onToggle: () -> Void
    let onEdit: () -> Void
    let onBackcast: () -> Void

    private var scheduledItems: [ScheduledTask] {
        store.scheduled(for: goal.id)
    }

    private var unscheduledCount: Int {
        store.unscheduledTasks(for: goal.id).count
    }

    private var progressMeaning: GoalProgressMeaning {
        GoalProgressMeaning(goal: goal, scheduled: scheduledItems)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top, spacing: 12) {
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(goalColor)
                    .frame(width: 7, height: 50)
                VStack(alignment: .leading, spacing: 5) {
                    Text(goal.title)
                        .font(.title3.weight(.bold))
                        .lineLimit(2)
                    Text(goal.category)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(goalColor)
                }
                Spacer()
                Text(goal.deadline, format: .dateTime.month().day())
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 10) {
                ProgressLine(
                    title: "進み具合",
                    done: store.doneCount(for: goal.id),
                    total: scheduledItems.count,
                    color: goalColor
                )
                Button(action: onBackcast) {
                    Label("逆算", systemImage: "arrow.triangle.branch")
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.plain)
                .background(goalColor.opacity(0.14))
                .foregroundStyle(goalColor)
                .clipShape(Capsule())
                Button(action: onEdit) {
                    Label("編集", systemImage: "pencil")
                        .font(.caption.weight(.bold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                }
                .buttonStyle(.plain)
                .background(Color.primary.opacity(0.08))
                .foregroundStyle(.primary)
                .clipShape(Capsule())
            }

            GoalMeaningRow(meaning: progressMeaning, color: goalColor)

            if unscheduledCount > 0 {
                GoalUnscheduledNotice(count: unscheduledCount, color: goalColor)
            }

            if isExpanded {
                GoalDetailPanel(goal: goal, items: scheduledItems, color: goalColor)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }

            let plan = store.backcastPlan(for: goal.id)
            if !plan.isEmpty {
                Button(action: onBackcast) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "point.topleft.down.curvedto.point.bottomright.up")
                            Text("逆算")
                            Spacer()
                            Text("\(plan.count)")
                                .font(.caption.weight(.bold).monospacedDigit())
                                .foregroundStyle(.secondary)
                        }
                        .font(.caption.weight(.bold))
                        .foregroundStyle(goalColor)

                        ForEach(plan.prefix(3)) { item in
                            HStack(spacing: 8) {
                                Text(item.date, format: .dateTime.month().day())
                                    .font(.caption2.weight(.bold).monospacedDigit())
                                    .foregroundStyle(.secondary)
                                Text(item.title)
                                    .font(.caption.weight(.semibold))
                                    .lineLimit(1)
                                Spacer(minLength: 0)
                            }
                        }
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(goalColor.opacity(0.09))
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
            }

        }
        .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .onTapGesture(perform: onToggle)
        .cardStyle()
    }

    private var goalColor: Color {
        Color(hex: goal.colorHex)
    }
}

struct GoalUnscheduledNotice: View {
    let count: Int
    let color: Color

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "tray.full")
                .font(.caption.weight(.bold))
            Text("予定に入れていない行動")
                .font(.caption.weight(.bold))
            Spacer()
            Text("\(count)")
                .font(.caption.weight(.bold).monospacedDigit())
        }
        .padding(10)
        .foregroundStyle(color)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct GoalProgressMeaning {
    let title: String
    let detail: String
    let systemImage: String

    init(goal: Goal, scheduled: [ScheduledTask]) {
        let total = scheduled.count
        let done = scheduled.filter(\.isDone).count
        let today = Date().startOfDay
        let totalDays = max(1, Calendar.current.dateComponents([.day], from: goal.startDate.startOfDay, to: goal.deadline.startOfDay).day ?? 1)
        let elapsedDays = min(max(0, Calendar.current.dateComponents([.day], from: goal.startDate.startOfDay, to: today).day ?? 0), totalDays)
        let expected = Double(elapsedDays) / Double(totalDays)
        let actual = total == 0 ? 0 : Double(done) / Double(total)
        let remainingDays = max(0, Calendar.current.dateComponents([.day], from: today, to: goal.deadline.startOfDay).day ?? 0)

        if total == 0 {
            title = "まだ道筋だけ"
            detail = "行動を予定に置くと進み具合が見えます"
            systemImage = "calendar.badge.plus"
        } else if done == total {
            title = "積み上がっています"
            detail = "置いた行動はすべて完了済み"
            systemImage = "checkmark.seal.fill"
        } else if today > goal.deadline.startOfDay {
            title = "期限を見直す"
            detail = "期限を過ぎています。予定を組み直しましょう"
            systemImage = "exclamationmark.circle.fill"
        } else if actual + 0.12 < expected {
            title = "少し遅れ気味"
            detail = "今日ひとつ終えると流れを戻せます"
            systemImage = "arrow.up.forward.circle"
        } else {
            title = "予定通り"
            detail = remainingDays == 0 ? "今日が期限です" : "期限まであと\(remainingDays)日"
            systemImage = "sparkle"
        }
    }
}

struct GoalDetailPanel: View {
    @EnvironmentObject private var store: CevoaStore
    let goal: Goal
    let items: [ScheduledTask]
    let color: Color

    private var doneItems: [ScheduledTask] {
        items.filter(\.isDone).sorted { $0.date > $1.date }
    }

    private var remainingDays: Int {
        max(0, Calendar.current.dateComponents([.day], from: Date().startOfDay, to: goal.deadline.startOfDay).day ?? 0)
    }

    private var milestones: [BackcastItem] {
        store.backcastPlan(for: goal.id)
    }

    private var unscheduledTasks: [ActionTask] {
        store.unscheduledTasks(for: goal.id)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                GoalDetailMetric(title: "開始", value: goal.startDate.formatted(.dateTime.month().day()))
                GoalDetailMetric(title: "期限", value: goal.deadline.formatted(.dateTime.month().day()))
                GoalDetailMetric(title: "残り", value: "\(remainingDays)日")
            }

            HStack(spacing: 10) {
                GoalDetailMetric(title: "予定", value: "\(items.count)件")
                GoalDetailMetric(title: "完了", value: "\(doneItems.count)件")
                GoalDetailMetric(title: "未配置", value: "\(unscheduledTasks.count)件")
            }

            if !unscheduledTasks.isEmpty {
                VStack(alignment: .leading, spacing: 7) {
                    ForEach(unscheduledTasks.prefix(3)) { task in
                        HStack(spacing: 8) {
                            Circle()
                                .fill(color)
                                .frame(width: 6, height: 6)
                            Text(task.title)
                                .font(.caption.weight(.semibold))
                                .lineLimit(1)
                            Spacer()
                        }
                    }
                }
                .padding(10)
                .background(color.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }

            if let latest = doneItems.first {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(color)
                    Text("最近: \(latest.title)")
                        .font(.caption.weight(.semibold))
                        .lineLimit(1)
                    Spacer()
                    Text(latest.date, format: .dateTime.month().day())
                        .font(.caption2.weight(.bold).monospacedDigit())
                        .foregroundStyle(.secondary)
                }
                .padding(10)
                .background(color.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
        .padding(12)
        .background(Color.primary.opacity(0.045))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

struct GoalDetailMetric: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.caption2.weight(.bold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption.weight(.bold).monospacedDigit())
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color.cardBackground.opacity(0.72))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct GoalMeaningRow: View {
    let meaning: GoalProgressMeaning
    let color: Color

    var body: some View {
        HStack(spacing: 9) {
            Image(systemName: meaning.systemImage)
                .font(.caption.weight(.bold))
                .foregroundStyle(color)
                .frame(width: 24, height: 24)
                .background(color.opacity(0.12))
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(meaning.title)
                    .font(.caption.weight(.bold))
                Text(meaning.detail)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(10)
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct PlannerView: View {
    @EnvironmentObject private var store: CevoaStore
    @Binding var sheet: ActiveSheet?
    @State private var anchorDate = Date().startOfDay
    @State private var selectedTaskID: UUID?
    @State private var selectedGoalID: UUID?
    @State private var pulseDate: Date?
    @State private var calendarPageDirection = 1
    @State private var showsTaskShelf = false
    @State private var showsDeadlines = false
    @State private var showsMonthPicker = false

    private var month: [Date] {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month], from: anchorDate)
        let first = calendar.date(from: components) ?? anchorDate
        let weekday = calendar.component(.weekday, from: first)
        let mondayOffset = weekday == 1 ? -6 : 2 - weekday
        let start = calendar.date(byAdding: .day, value: mondayOffset, to: first) ?? first
        return (0..<42).map { start.addingDays($0) }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                VStack(spacing: 12) {
                    calendarStage
                        .padding(.horizontal, 16)
                        .padding(.top, 8)

                    if showsTaskShelf {
                        TaskShelf(
                            selectedGoalID: $selectedGoalID,
                            selectedTaskID: $selectedTaskID,
                            onAddTask: {
                                clearSelectedTask()
                                sheet = .task(selectedGoalID)
                            },
                            onAddGoal: {
                                clearSelectedTask()
                                sheet = .goal
                            },
                            onCollapse: {
                                withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                                    selectedTaskID = nil
                                    showsTaskShelf = false
                                }
                            }
                        )
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    } else {
                        CollapsedTaskShelfButton(
                            selectedTaskID: selectedTaskID,
                            onTap: {
                                withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                                    showsTaskShelf = true
                                }
                            }
                        )
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)
                    }
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .onAppear {
                if selectedGoalID == nil {
                    selectedGoalID = store.goals.first?.id
                }
            }
            .onChange(of: store.goals) { _, goals in
                guard !goals.contains(where: { $0.id == selectedGoalID }) else { return }
                selectedGoalID = goals.first?.id
                selectedTaskID = nil
            }
            .onChange(of: showsDeadlines) { _, _ in
                clearSelectedTask()
            }
            .onDisappear {
                selectedTaskID = nil
            }
        }
    }

    @ViewBuilder
    private var calendarBody: some View {
        MonthGrid(
            dates: month,
            anchorDate: anchorDate,
            selectedTaskID: selectedTaskID,
            pulseDate: pulseDate,
            showsDeadlines: showsDeadlines,
            onTapDate: handleDateTap,
            onDropPayload: handleDrop
        )
        .padding(.vertical, 8)
        .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .gesture(calendarSwipeGesture)
    }

    private var calendarStage: some View {
        VStack(spacing: 12) {
            if !showsTaskShelf {
                PlannerYearHeader(date: anchorDate)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }

            CalendarControls(
                showsDeadlines: $showsDeadlines,
                hasRoadmapMarkers: hasRoadmapMarkers,
                anchorDate: anchorDate,
                currentDate: Date(),
                monthPicker: { showsMonthPicker = true },
                today: { moveToToday() }
            )

            ZStack {
                calendarBody
                    .id(calendarPageID)
                    .transition(pageTransition)
            }
        }
        .frame(maxHeight: .infinity)
        .clipped()
        .contentShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .cardStyle()
        .sheet(isPresented: $showsMonthPicker) {
            MonthPickerSheet(anchorDate: $anchorDate)
                .presentationDetents([.medium])
        }
    }

    private var calendarPageID: String {
        let components = Calendar.current.dateComponents([.year, .month], from: anchorDate)
        return "month-\(components.year ?? 0)-\(components.month ?? 0)"
    }

    private var visibleDates: [Date] {
        month
    }

    private var hasRoadmapMarkers: Bool {
        visibleDates.contains { date in
            !goalsDue(on: date).isEmpty || !milestones(on: date).isEmpty
        }
    }

    private var pageTransition: AnyTransition {
        .asymmetric(
            insertion: .move(edge: calendarPageDirection > 0 ? .bottom : .top).combined(with: .opacity),
            removal: .move(edge: calendarPageDirection > 0 ? .top : .bottom).combined(with: .opacity)
        )
    }

    private var calendarSwipeGesture: some Gesture {
        DragGesture(minimumDistance: 24)
            .onEnded { value in
                guard abs(value.translation.height) > abs(value.translation.width) * 1.25,
                      abs(value.translation.height) > 115
                else { return }
                movePeriod(value.translation.height < 0 ? 1 : -1)
            }
    }

    private func movePeriod(_ direction: Int) {
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) {
            selectedTaskID = nil
            calendarPageDirection = direction
            anchorDate = Calendar.current.date(byAdding: .month, value: direction, to: anchorDate) ?? anchorDate
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func moveToToday() {
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) {
            selectedTaskID = nil
            calendarPageDirection = Date().startOfDay >= anchorDate ? 1 : -1
            anchorDate = Date().startOfDay
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func placeSelectedTask(on date: Date) {
        guard let selectedTaskID else { return }
        withAnimation(.spring(response: 0.42, dampingFraction: 0.82)) {
            store.schedule(taskID: selectedTaskID, on: date)
            pulseDate = date
        }
        clearPulse()
    }

    private func handleDateTap(_ date: Date) {
        if selectedTaskID != nil {
            placeSelectedTask(on: date)
        } else {
            sheet = .day(date.startOfDay)
        }
    }

    private func handleDrop(_ payload: String, on date: Date) -> Bool {
        guard let target = DragPayload(rawValue: payload) else { return false }
        withAnimation(.spring(response: 0.42, dampingFraction: 0.82)) {
            switch target {
            case .task(let id):
                store.schedule(taskID: id, on: date)
            case .scheduled(let id):
                if let item = store.scheduled.first(where: { $0.id == id }) {
                    store.moveScheduled(item, to: date)
                }
            }
            pulseDate = date
        }
        clearPulse()
        return true
    }

    private func clearPulse() {
        Task {
            try? await Task.sleep(for: .milliseconds(520))
            await MainActor.run {
                withAnimation(.easeOut(duration: 0.24)) {
                    pulseDate = nil
                }
            }
        }
    }

    private func clearSelectedTask() {
        guard selectedTaskID != nil else { return }
        withAnimation(.spring(response: 0.28, dampingFraction: 0.84)) {
            selectedTaskID = nil
        }
    }

    private func goalsDue(on date: Date) -> [Goal] {
        store.goals.filter { Calendar.current.isDate($0.deadline, inSameDayAs: date) }
    }

    private func milestones(on date: Date) -> [BackcastItem] {
        store.backcastItems.filter { Calendar.current.isDate($0.date, inSameDayAs: date) }
    }

}

struct CalendarControls: View {
    @Binding var showsDeadlines: Bool
    let hasRoadmapMarkers: Bool
    let anchorDate: Date
    let currentDate: Date
    let monthPicker: () -> Void
    let today: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 10) {
                Button(action: monthPicker) {
                    HStack(spacing: 8) {
                        Text(monthDayLabel)
                            .font(.subheadline.weight(.bold).monospacedDigit())
                        Text(currentDate, format: .dateTime.weekday(.wide))
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)
                Button {
                    showsDeadlines.toggle()
                    UISelectionFeedbackGenerator().selectionChanged()
                } label: {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: showsDeadlines ? "flag.fill" : "flag")
                            .font(.headline.weight(.semibold))
                            .frame(width: 34, height: 34)
                        if hasRoadmapMarkers && !showsDeadlines {
                            Circle()
                                .fill(Color.goalAccent)
                                .frame(width: 6, height: 6)
                                .offset(x: -4, y: 5)
                        }
                    }
                }
                .foregroundStyle(showsDeadlines ? Color.goalAccent : Color.primary)
                .accessibilityLabel(showsDeadlines ? "期限と途中目標を隠す" : "期限と途中目標を表示")
                Button(action: today) {
                    Image(systemName: "location.fill")
                        .frame(width: 34, height: 34)
                }
            }
            .buttonStyle(.softPill)
            .padding(6)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
        }
    }

    private var monthDayLabel: String {
        currentDate.formatted(.dateTime.month().day())
    }
}

struct PlannerYearHeader: View {
    let date: Date

    var body: some View {
        Text(date, format: .dateTime.year())
            .font(.caption.weight(.bold).monospacedDigit())
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 8)
    }
}

struct MonthPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var anchorDate: Date

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 3)
    private let months = Array(1...12)
    private let monthSymbols = DateFormatter().shortMonthSymbols ?? []

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(months, id: \.self) { month in
                        Button {
                            select(month)
                        } label: {
                            Text(monthSymbols.indices.contains(month - 1) ? monthSymbols[month - 1] : "\(month)")
                                .font(.headline.weight(.bold))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 18)
                                .background(isSelected(month) ? Color.goalAccent.opacity(0.16) : Color.primary.opacity(0.06))
                                .foregroundStyle(isSelected(month) ? Color.goalAccent : Color.primary)
                                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(18)
            }
            .navigationTitle(anchorDate.formatted(.dateTime.year()))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
            }
        }
    }

    private func isSelected(_ month: Int) -> Bool {
        Calendar.current.component(.month, from: anchorDate) == month
    }

    private func select(_ month: Int) {
        let calendar = Calendar.current
        let year = calendar.component(.year, from: anchorDate)
        anchorDate = calendar.date(from: DateComponents(year: year, month: month, day: 1)) ?? anchorDate
        UISelectionFeedbackGenerator().selectionChanged()
        dismiss()
    }
}

struct CalendarDayCard: View {
    let date: Date
    let items: [ScheduledTask]
    let goalsDue: [Goal]
    let milestones: [BackcastItem]
    let selectedTaskID: UUID?
    let isPulsing: Bool
    let onTapDate: () -> Void
    let onEdit: (ScheduledTask) -> Void
    let onDropPayload: (String) -> Bool

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Button(action: onTapDate) {
                VStack(spacing: 2) {
                    Text(date, format: .dateTime.weekday(.abbreviated))
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                    Text(date, format: .dateTime.day())
                        .font(.system(size: 30, weight: .bold, design: .rounded))
                    if !items.isEmpty {
                        Text("\(items.count)")
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Color.primary.opacity(0.08))
                            .clipShape(Capsule())
                    }
                }
                .frame(width: 52)
            }
            .buttonStyle(.plain)

            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(goalsDue) { goal in
                        GoalDeadlinePill(goal: goal, compact: false)
                    }
                    ForEach(milestones) { milestone in
                        BackcastMilestonePill(item: milestone, compact: false)
                    }
                    ForEach(items) { item in
                        CalendarTaskPill(item: item)
                            .onTapGesture {
                                if selectedTaskID == nil {
                                    onEdit(item)
                                } else {
                                    onTapDate()
                                }
                            }
                            .draggable(DragPayload.scheduled(item.id).rawValue) {
                                DragPreview(title: item.title)
                            }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .topLeading)
            }
            .scrollIndicators(.hidden)
        }
        .frame(maxWidth: .infinity, minHeight: 92, maxHeight: 142, alignment: .topLeading)
        .contentShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .onTapGesture {
            guard selectedTaskID != nil else { return }
            onTapDate()
        }
        .padding(12)
        .background(dayBackground)
        .overlay {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(borderColor, lineWidth: selectedTaskID == nil ? 1 : 2)
        }
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .scaleEffect(isPulsing ? 1.025 : 1)
        .animation(.spring(response: 0.32, dampingFraction: 0.7), value: isPulsing)
        .dropDestination(for: String.self) { payloads, _ in
            payloads.contains { onDropPayload($0) }
        } isTargeted: { active in
            if active {
                UISelectionFeedbackGenerator().selectionChanged()
            }
        }
    }

    private var dayBackground: some ShapeStyle {
        if isToday {
            return AnyShapeStyle(Color.goalAccent.opacity(0.12))
        }
        return AnyShapeStyle(.thinMaterial)
    }

    private var borderColor: Color {
        if selectedTaskID != nil { return .goalAccent.opacity(0.65) }
        if isToday { return .goalAccent.opacity(0.35) }
        return .white.opacity(0.12)
    }
}

struct MonthGrid: View {
    @EnvironmentObject private var store: CevoaStore
    let dates: [Date]
    let anchorDate: Date
    let selectedTaskID: UUID?
    let pulseDate: Date?
    let showsDeadlines: Bool
    let onTapDate: (Date) -> Void
    let onDropPayload: (String, Date) -> Bool

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 7), count: 7)

    var body: some View {
        VStack(spacing: 7) {
            LazyVGrid(columns: columns, spacing: 7) {
                ForEach(dates, id: \.self) { date in
                    MonthDayCell(
                        date: date,
                        isInMonth: Calendar.current.isDate(date, equalTo: anchorDate, toGranularity: .month),
                        items: store.tasks(for: date),
                        goalsDue: showsDeadlines ? goalsDue(on: date) : [],
                        milestones: showsDeadlines ? milestones(on: date) : [],
                        selectedTaskID: selectedTaskID,
                        isPulsing: Calendar.current.isDate(pulseDate ?? .distantPast, inSameDayAs: date),
                        onTapDate: { onTapDate(date) },
                        onDropPayload: { onDropPayload($0, date) }
                    )
                }
            }
        }
    }

    private func goalsDue(on date: Date) -> [Goal] {
        store.goals.filter { Calendar.current.isDate($0.deadline, inSameDayAs: date) }
    }

    private func milestones(on date: Date) -> [BackcastItem] {
        store.backcastItems.filter { Calendar.current.isDate($0.date, inSameDayAs: date) }
    }
}

struct MonthDayCell: View {
    @EnvironmentObject private var store: CevoaStore
    let date: Date
    let isInMonth: Bool
    let items: [ScheduledTask]
    let goalsDue: [Goal]
    let milestones: [BackcastItem]
    let selectedTaskID: UUID?
    let isPulsing: Bool
    let onTapDate: () -> Void
    let onDropPayload: (String) -> Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(date, format: .dateTime.day())
                    .font(.caption.weight(.bold).monospacedDigit())
                    .foregroundStyle(isInMonth ? Color.primary : Color.secondary.opacity(0.45))
                Spacer()
                if !items.isEmpty {
                    Text("\(items.count)")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture(perform: onTapDate)

            VStack(alignment: .leading, spacing: 3) {
                ForEach(goalsDue.prefix(2)) { goal in
                    GoalDeadlinePill(goal: goal, compact: true)
                }
                ForEach(milestones.prefix(max(0, 2 - goalsDue.prefix(2).count))) { milestone in
                    BackcastMilestonePill(item: milestone, compact: true)
                }
                ForEach(items.prefix(3)) { item in
                    MonthTaskDot(item: item)
                        .contentShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        .onTapGesture(perform: onTapDate)
                        .draggable(DragPayload.scheduled(item.id).rawValue) {
                            DragPreview(title: item.title)
                        }
                }
            }
            Spacer(minLength: 0)
        }
        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .onTapGesture(perform: onTapDate)
        .padding(7)
        .frame(height: UIScreen.main.bounds.height < 750 ? 46 : 58, alignment: .topLeading)
        .frame(maxWidth: .infinity)
        .background(background)
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(borderColor, lineWidth: selectedTaskID == nil ? 1 : 1.5)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .scaleEffect(isPulsing ? 1.05 : 1)
        .animation(.spring(response: 0.3, dampingFraction: 0.76), value: isPulsing)
        .dropDestination(for: String.self) { payloads, _ in
            payloads.contains { onDropPayload($0) }
        } isTargeted: { active in
            if active {
                UISelectionFeedbackGenerator().selectionChanged()
            }
        }
    }

    private var background: some ShapeStyle {
        if Calendar.current.isDateInToday(date) {
            return AnyShapeStyle(Color.goalAccent.opacity(0.15))
        }
        return AnyShapeStyle(Color.cardBackground.opacity(isInMonth ? 0.96 : 0.48))
    }

    private var borderColor: Color {
        if selectedTaskID != nil { return .goalAccent.opacity(0.55) }
        if Calendar.current.isDateInToday(date) { return .goalAccent.opacity(0.45) }
        return .primary.opacity(0.06)
    }
}

struct MonthTaskDot: View {
    @EnvironmentObject private var store: CevoaStore
    let item: ScheduledTask

    var body: some View {
        HStack(spacing: 3) {
            Capsule()
                .fill(goalColor)
                .frame(width: 12, height: 4)
            Text(item.title)
                .font(.system(size: 8.5, weight: .semibold))
                .lineLimit(1)
                .foregroundStyle(.secondary)
        }
    }

    private var goalColor: Color {
        Color(hex: store.goal(for: item.goalID)?.colorHex ?? "#2563EB")
    }
}

struct GoalDeadlinePill: View {
    let goal: Goal
    let compact: Bool

    var body: some View {
        HStack(spacing: compact ? 3 : 6) {
            Image(systemName: "target")
                .font(compact ? .system(size: 7, weight: .bold) : .caption2.weight(.bold))
            Text(compact ? goal.title : "\(goal.title) 期限")
                .font(compact ? .system(size: 8.5, weight: .bold) : .caption.weight(.bold))
                .lineLimit(1)
        }
        .padding(.horizontal, compact ? 0 : 9)
        .padding(.vertical, compact ? 0 : 7)
        .foregroundStyle(goalColor)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(compact ? Color.clear : goalColor.opacity(0.13))
        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    }

    private var goalColor: Color {
        Color(hex: goal.colorHex)
    }
}

struct BackcastMilestonePill: View {
    @EnvironmentObject private var store: CevoaStore
    let item: BackcastItem
    let compact: Bool

    var body: some View {
        HStack(spacing: compact ? 3 : 6) {
            Circle()
                .fill(goalColor)
                .frame(width: compact ? 5 : 7, height: compact ? 5 : 7)
            Text(item.title)
                .font(compact ? .system(size: 8.5, weight: .bold) : .caption.weight(.bold))
                .lineLimit(1)
        }
        .padding(.horizontal, compact ? 0 : 9)
        .padding(.vertical, compact ? 0 : 7)
        .foregroundStyle(goalColor)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(compact ? Color.clear : goalColor.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
    }

    private var goalColor: Color {
        Color(hex: store.goal(for: item.goalID)?.colorHex ?? "#2563EB")
    }
}

struct TaskShelf: View {
    @EnvironmentObject private var store: CevoaStore
    @Binding var selectedGoalID: UUID?
    @Binding var selectedTaskID: UUID?
    @State private var searchText = ""
    let onAddTask: () -> Void
    let onAddGoal: () -> Void
    let onCollapse: () -> Void

    private var selectedGoal: Goal? {
        guard let selectedGoalID else { return store.goals.first }
        return store.goal(for: selectedGoalID)
    }

    private var baseTasks: [ActionTask] {
        guard let goalID = selectedGoal?.id else { return [] }
        return store.tasks.filter { $0.goalID == goalID }
    }

    private var visibleTasks: [ActionTask] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return baseTasks }
        return baseTasks.filter { task in
            task.title.localizedCaseInsensitiveContains(query)
                || (store.goal(for: task.goalID)?.title.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    private var selectedTaskTitle: String? {
        guard let selectedTaskID else { return nil }
        return store.task(id: selectedTaskID)?.title
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                if store.goals.isEmpty {
                    Image(systemName: "target")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(Color.goalAccent)
                } else {
                    Image(systemName: "tray.full")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Button(action: store.goals.isEmpty ? onAddGoal : onAddTask) {
                    Image(systemName: "plus")
                }
                Button(action: onCollapse) {
                    Image(systemName: "chevron.down")
                }
                if selectedTaskID != nil {
                    Text(selectedTaskTitle.map { "「\($0)」を置く" } ?? "置く日を選ぶ")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.goalAccent)
                        .lineLimit(1)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .buttonStyle(.softPill)

            if store.goals.isEmpty {
                Button(action: onAddGoal) {
                    VStack(spacing: 10) {
                        Image(systemName: "target")
                            .font(.system(size: 32, weight: .semibold))
                        Text("最初の目標")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                }
                .buttonStyle(.plain)
                .foregroundStyle(Color.goalAccent)
            } else {
                GoalTaskFilter(selectedGoalID: $selectedGoalID)
                    .onChange(of: selectedGoalID) { _, _ in
                        selectedTaskID = nil
                        searchText = ""
                    }

                TaskShelfSearchField(text: $searchText)

                if visibleTasks.isEmpty {
                    Button(action: searchText.isEmpty ? onAddTask : {
                        searchText = ""
                    }) {
                        VStack(spacing: 10) {
                            Image(systemName: searchText.isEmpty ? "plus.circle.fill" : "arrow.uturn.backward.circle.fill")
                                .font(.system(size: 34, weight: .semibold))
                            Text(searchText.isEmpty ? "この目標の行動を作る" : "検索を戻す")
                                .font(.headline)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Color.goalAccent)
                } else {
                    ScrollView(.vertical, showsIndicators: false) {
                        LazyVStack(spacing: 10) {
                            ForEach(visibleTasks) { task in
                                SavedTaskChip(
                                    task: task,
                                    isSelected: selectedTaskID == task.id,
                                    onPickDate: {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.78)) {
                                            selectedTaskID = selectedTaskID == task.id ? nil : task.id
                                        }
                                        UISelectionFeedbackGenerator().selectionChanged()
                                    }
                                )
                                .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                                .draggable(DragPayload.task(task.id).rawValue) {
                                    DragPreview(title: task.title)
                                }
                            }
                        }
                        .padding(.vertical, 2)
                    }
                    .frame(maxHeight: UIScreen.main.bounds.height < 750 ? 160 : 230)
                }
            }
        }
        .padding(14)
        .background(Color.cardBackground)
        .overlay {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(Color.primary.opacity(0.06), lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 24, y: 10)
    }
}

struct TaskShelfSearchField: View {
    @Binding var text: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
            TextField("探す", text: $text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color.primary.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct CollapsedTaskShelfButton: View {
    @EnvironmentObject private var store: CevoaStore
    let selectedTaskID: UUID?
    let onTap: () -> Void

    private var selectedTaskTitle: String? {
        guard let selectedTaskID else { return nil }
        return store.task(id: selectedTaskID)?.title
    }

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 10) {
                Image(systemName: selectedTaskID == nil ? "tray.full" : "hand.draw")
                    .font(.headline.weight(.bold))
                Text(selectedTaskID == nil ? "行動リスト" : selectedTaskTitle.map { "「\($0)」を置く" } ?? "置く日を選ぶ")
                    .font(.headline.weight(.bold))
                    .lineLimit(1)
                Spacer()
                Image(systemName: "chevron.up")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.cardBackground)
            .overlay {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(selectedTaskID == nil ? Color.primary.opacity(0.06) : Color.goalAccent.opacity(0.5), lineWidth: selectedTaskID == nil ? 1 : 2)
            }
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: .black.opacity(0.07), radius: 18, y: 8)
        }
        .buttonStyle(.plain)
        .foregroundStyle(selectedTaskID == nil ? Color.primary : Color.goalAccent)
    }
}

struct GoalTaskFilter: View {
    @EnvironmentObject private var store: CevoaStore
    @Binding var selectedGoalID: UUID?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(store.goals) { goal in
                    Button {
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                            selectedGoalID = goal.id
                        }
                        UISelectionFeedbackGenerator().selectionChanged()
                    } label: {
                        HStack(spacing: 7) {
                            Circle()
                                .fill(Color(hex: goal.colorHex))
                                .frame(width: 8, height: 8)
                            Text(goal.title)
                                .font(.caption.weight(.bold))
                                .lineLimit(1)
                        }
                        .padding(.horizontal, 11)
                        .padding(.vertical, 8)
                        .background(selectedGoalID == goal.id ? Color(hex: goal.colorHex).opacity(0.16) : Color.primary.opacity(0.07))
                        .foregroundStyle(selectedGoalID == goal.id ? Color(hex: goal.colorHex) : Color.primary)
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct SavedTaskChip: View {
    @EnvironmentObject private var store: CevoaStore
    let task: ActionTask
    let isSelected: Bool
    let onPickDate: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(goalColor)
                .frame(width: 6, height: 42)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(task.title)
                        .font(.subheadline.weight(.bold))
                        .lineLimit(1)
                    if isUnscheduled {
                        Text("未配置")
                            .font(.system(size: 10, weight: .bold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(goalColor.opacity(0.13))
                            .foregroundStyle(goalColor)
                            .clipShape(Capsule())
                    }
                }
                Text(store.goal(for: task.goalID)?.title ?? "")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            Button(action: onPickDate) {
                Image(systemName: "line.3.horizontal")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(isSelected ? .white : goalColor.opacity(0.82))
                    .frame(width: 38, height: 38)
                    .background(isSelected ? goalColor : goalColor.opacity(0.12))
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, minHeight: 62, alignment: .leading)
        .background(isSelected ? goalColor.opacity(0.16) : Color.cardBackground)
        .overlay {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(isSelected ? goalColor.opacity(0.9) : .clear, lineWidth: 2)
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .scaleEffect(isSelected ? 1.02 : 1)
        .animation(.spring(response: 0.28, dampingFraction: 0.78), value: isSelected)
    }

    private var goalColor: Color {
        Color(hex: store.goal(for: task.goalID)?.colorHex ?? "#2563EB")
    }

    private var isUnscheduled: Bool {
        store.isTaskUnscheduled(task)
    }
}

struct CalendarTaskPill: View {
    @EnvironmentObject private var store: CevoaStore
    let item: ScheduledTask

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(goalColor)
                .frame(width: 7, height: 7)
            Text(item.title)
                .font(.caption.weight(.semibold))
                .lineLimit(2)
                .strikethrough(item.isDone)
            Spacer(minLength: 0)
            if item.isDone {
                Image(systemName: "checkmark")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(goalColor)
            }
        }
        .padding(10)
        .background(item.isDone ? goalColor.opacity(0.13) : Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
    }

    private var goalColor: Color {
        Color(hex: store.goal(for: item.goalID)?.colorHex ?? "#2563EB")
    }
}

struct ScheduledTaskRow: View {
    @EnvironmentObject private var store: CevoaStore
    let item: ScheduledTask
    var compact = false

    var body: some View {
        HStack(spacing: 12) {
            Button {
                withAnimation(.spring(response: 0.34, dampingFraction: 0.74)) {
                    store.toggleDone(item)
                }
            } label: {
                Image(systemName: item.isDone ? "checkmark.circle.fill" : "circle")
                    .font(compact ? .headline : .title3)
            }
            .buttonStyle(.plain)
            .foregroundStyle(item.isDone ? goalColor : Color.secondary)

            VStack(alignment: .leading, spacing: 3) {
                Text(item.title)
                    .font(compact ? .subheadline.weight(.bold) : .headline)
                    .strikethrough(item.isDone)
                    .lineLimit(2)
                if !compact, let goal = store.goal(for: item.goalID) {
                    Text(goal.title)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer()
            Text(item.date, format: .dateTime.month().day())
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
        }
        .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .cardStyle()
    }

    private var goalColor: Color {
        Color(hex: store.goal(for: item.goalID)?.colorHex ?? "#2563EB")
    }
}

struct TodayHeader: View {
    var body: some View {
        HStack(alignment: .lastTextBaseline) {
            Text(Date(), format: .dateTime.month().day())
                .font(.system(size: 42, weight: .bold, design: .rounded))
            Spacer()
            Text(Date(), format: .dateTime.weekday(.wide))
                .font(.headline)
                .foregroundStyle(.secondary)
        }
    }
}

struct TodayPriorityCard: View {
    @EnvironmentObject private var store: CevoaStore
    let items: [ScheduledTask]
    let onEdit: (ScheduledTask) -> Void

    private var orderedItems: [ScheduledTask] {
        items.sorted {
            if $0.isDone != $1.isDone { return !$0.isDone && $1.isDone }
            return $0.title < $1.title
        }
    }

    private var topItem: ScheduledTask? {
        orderedItems.first { !$0.isDone } ?? orderedItems.first
    }

    private var done: Int {
        items.filter(\.isDone).count
    }

    private var progress: Double {
        items.isEmpty ? 0 : Double(done) / Double(items.count)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("今日の一手")
                    .font(.headline.weight(.bold))
                Spacer()
                Text(items.isEmpty ? "0件" : "\(done)/\(items.count)")
                    .font(.caption.weight(.bold).monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            if let topItem {
                Button {
                    onEdit(topItem)
                } label: {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(Color(hex: store.goal(for: topItem.goalID)?.colorHex ?? "#2563EB"))
                            .frame(width: 10, height: 10)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(topItem.title)
                                .font(.title3.weight(.bold))
                                .lineLimit(2)
                            if let goal = store.goal(for: topItem.goalID) {
                                Text(goal.title)
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                        }
                        Spacer()
                        Image(systemName: topItem.isDone ? "checkmark.circle.fill" : "arrow.right.circle")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(topItem.isDone ? Color.goalAccent : Color.secondary)
                    }
                }
                .buttonStyle(.plain)
            } else {
                Text("予定タブで行動を置くと、ここに最優先が出ます")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            ProgressView(value: progress)
                .tint(progress >= 1 ? .goalAccent : .primary)
                .animation(.spring(response: 0.45, dampingFraction: 0.86), value: progress)
        }
        .cardStyle()
    }
}

struct TodayRing: View {
    let progress: Double

    var body: some View {
        HStack(spacing: 18) {
            ZStack {
                Circle()
                    .stroke(Color.primary.opacity(0.08), lineWidth: 12)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.goalAccent, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(Int((progress * 100).rounded()))")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
            }
            .frame(width: 92, height: 92)

            VStack(alignment: .leading, spacing: 8) {
                Text("今日")
                    .font(.title3.weight(.bold))
                Text("今見えるものだけ終わらせる")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .cardStyle()
    }
}

struct FirstRunPathCard: View {
    let hasGoal: Bool
    let hasTask: Bool
    let hasSchedule: Bool
    let onAddGoal: () -> Void
    let onAddTask: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("最初の一周")
                    .font(.headline.weight(.bold))
                Spacer()
                Text("\([hasGoal, hasTask, hasSchedule].filter { $0 }.count)/3")
                    .font(.caption.weight(.bold).monospacedDigit())
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 9) {
                FirstRunStepRow(title: "ゴール", isDone: hasGoal)
                FirstRunStepRow(title: "行動", isDone: hasTask)
                FirstRunStepRow(title: "予定", isDone: hasSchedule)
            }

            if !hasGoal {
                Button("ゴールを作る", action: onAddGoal)
                    .buttonStyle(.filledPill)
            } else if !hasTask {
                Button("行動を作る", action: onAddTask)
                    .buttonStyle(.filledPill)
            } else if !hasSchedule {
                Text("予定タブで行動をカレンダーへ置く")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.goalAccent)
            }
        }
        .cardStyle()
    }
}

struct FirstRunStepRow: View {
    let title: String
    let isDone: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(isDone ? Color.goalAccent : Color.secondary)
            Text(title)
                .font(.subheadline.weight(.semibold))
            Spacer()
        }
    }
}

struct EmptyFocusCard: View {
    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 34, weight: .semibold))
                .foregroundStyle(Color.goalAccent)
            Text("予定へ置く")
                .font(.headline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .cardStyle()
    }
}

struct ProgressScreen: View {
    @EnvironmentObject private var store: CevoaStore
    @State private var selectedDate = Date().startOfDay

    private var selectedItems: [ScheduledTask] {
        store.tasks(for: selectedDate)
    }

    private var selectedDone: Int {
        selectedItems.filter(\.isDone).count
    }

    private var selectedGoalProgress: [(goal: Goal, done: Int, total: Int)] {
        store.goals.compactMap { goal in
            let dayItems = selectedItems.filter { $0.goalID == goal.id }
            guard !dayItems.isEmpty else { return nil }
            return (goal, dayItems.filter(\.isDone).count, dayItems.count)
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                VStack(spacing: 12) {
                    ProgressDatePicker(selectedDate: $selectedDate)
                        .padding(.horizontal, 18)
                        .padding(.top, 12)

                    ScrollView {
                        VStack(spacing: 16) {
                            ProgressCard(
                                title: selectedDateTitle,
                                done: selectedDone,
                                total: selectedItems.count,
                                color: .goalAccent
                            )
                            ProgressCard(
                                title: "全体",
                                done: store.scheduled.filter(\.isDone).count,
                                total: store.scheduled.count,
                                color: .blue
                            )
                            if !selectedGoalProgress.isEmpty {
                                VStack(spacing: 10) {
                                    ForEach(selectedGoalProgress, id: \.goal.id) { entry in
                                        ProgressLine(
                                            title: entry.goal.title,
                                            done: entry.done,
                                            total: entry.total,
                                            color: Color(hex: entry.goal.colorHex)
                                        )
                                    }
                                }
                                .cardStyle()
                            }

                            if selectedItems.isEmpty {
                                EmptyDayProgressCard()
                            } else {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("やったこと")
                                        .font(.headline.weight(.bold))
                                    ForEach(selectedItems) { item in
                                        ScheduledTaskRow(item: item, compact: true)
                                    }
                                }
                                .cardStyle()
                            }
                        }
                        .padding(.horizontal, 18)
                        .padding(.bottom, 24)
                    }
                }
            }
        }
    }

    private var selectedDateTitle: String {
        Calendar.current.isDateInToday(selectedDate)
            ? "今日"
            : selectedDate.formatted(.dateTime.month().day())
    }
}

struct ProgressDatePicker: View {
    @EnvironmentObject private var store: CevoaStore
    @Binding var selectedDate: Date
    @State private var anchorDate = Date().startOfDay

    private var month: [Date] {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month], from: anchorDate)
        let first = calendar.date(from: components) ?? anchorDate
        let weekday = calendar.component(.weekday, from: first)
        let mondayOffset = weekday == 1 ? -6 : 2 - weekday
        let start = calendar.date(byAdding: .day, value: mondayOffset, to: first) ?? first
        return (0..<42).map { start.addingDays($0) }
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                Text(label)
                    .font(.subheadline.weight(.bold).monospacedDigit())
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)

                Button {
                    withAnimation(.spring(response: 0.34, dampingFraction: 0.84)) {
                        anchorDate = Date().startOfDay
                        selectedDate = Date().startOfDay
                    }
                } label: {
                    Image(systemName: "location.fill")
                        .frame(width: 34, height: 34)
                }
                .buttonStyle(.softPill)
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 6) {
                ForEach(month, id: \.self) { date in
                    ProgressDateCell(
                        date: date,
                        isSelected: Calendar.current.isDate(date, inSameDayAs: selectedDate),
                        isInMonth: Calendar.current.isDate(date, equalTo: anchorDate, toGranularity: .month),
                        items: store.tasks(for: date),
                        onTap: { select(date) }
                    )
                }
            }
        }
        .cardStyle()
        .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .highPriorityGesture(
            DragGesture(minimumDistance: 24)
                .onEnded { value in
                    guard abs(value.translation.height) > abs(value.translation.width) * 1.25,
                          abs(value.translation.height) > 90
                    else { return }
                    move(value.translation.height < 0 ? 1 : -1)
                }
        )
    }

    private var label: String {
        anchorDate.formatted(.dateTime.year().month(.wide))
    }

    private func select(_ date: Date) {
        withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
            selectedDate = date.startOfDay
            anchorDate = date.startOfDay
        }
        UISelectionFeedbackGenerator().selectionChanged()
    }

    private func move(_ direction: Int) {
        withAnimation(.spring(response: 0.34, dampingFraction: 0.84)) {
            anchorDate = Calendar.current.date(byAdding: .month, value: direction, to: anchorDate) ?? anchorDate
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
}

struct ProgressDateCell: View {
    let date: Date
    let isSelected: Bool
    let isInMonth: Bool
    let items: [ScheduledTask]
    let onTap: () -> Void

    private var done: Int {
        items.filter(\.isDone).count
    }

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 5) {
                Text(date, format: .dateTime.day())
                    .font(.caption.weight(.bold).monospacedDigit())
                    .foregroundStyle(isInMonth ? Color.primary : Color.secondary.opacity(0.42))
                Capsule()
                    .fill(done > 0 ? Color.goalAccent : Color.primary.opacity(items.isEmpty ? 0.08 : 0.2))
                    .frame(width: items.isEmpty ? 10 : 22, height: 4)
                if !items.isEmpty {
                    Text("\(done)/\(items.count)")
                        .font(.system(size: 8, weight: .bold, design: .rounded))
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(isSelected ? Color.goalAccent.opacity(0.16) : Color.primary.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 13, style: .continuous)
                    .stroke(isSelected ? Color.goalAccent.opacity(0.85) : .clear, lineWidth: 1.4)
            }
        }
        .buttonStyle(.plain)
    }
}

struct EmptyDayProgressCard: View {
    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "calendar")
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(Color.goalAccent)
            Text("この日はまだ記録がありません")
                .font(.headline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .cardStyle()
    }
}

struct ProgressCard: View {
    let title: String
    let done: Int
    let total: Int
    let color: Color

    private var progress: Double {
        total == 0 ? 0 : Double(done) / Double(total)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text(title)
                    .font(.title3.weight(.bold))
                Spacer()
                Text("\(done)/\(total)")
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.primary.opacity(0.08))
                    Capsule()
                        .fill(color.gradient)
                        .frame(width: proxy.size.width * progress)
                }
            }
            .frame(height: 16)
            .animation(.spring(response: 0.5, dampingFraction: 0.84), value: progress)
        }
        .cardStyle()
    }
}

struct ProgressLine: View {
    let title: String
    let done: Int
    let total: Int
    let color: Color

    private var progress: Double {
        total == 0 ? 0 : Double(done) / Double(total)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Spacer()
                Text("\(done)/\(total)")
                    .font(.caption.weight(.bold).monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: progress)
                .tint(color)
        }
    }
}

struct DayProgressSheet: View {
    @EnvironmentObject private var store: CevoaStore
    @Environment(\.dismiss) private var dismiss
    let date: Date
    @State private var editingItem: ScheduledTask?

    private var items: [ScheduledTask] {
        store.tasks(for: date)
    }

    private var done: Int {
        items.filter(\.isDone).count
    }

    private var groupedByGoal: [(goal: Goal, done: Int, total: Int)] {
        store.goals.compactMap { goal in
            let goalItems = items.filter { $0.goalID == goal.id }
            guard !goalItems.isEmpty else { return nil }
            return (goal, goalItems.filter(\.isDone).count, goalItems.count)
        }
    }

    private var goalsDue: [Goal] {
        store.goals.filter { Calendar.current.isDate($0.deadline, inSameDayAs: date) }
    }

    private var milestones: [BackcastItem] {
        store.backcastItems.filter { Calendar.current.isDate($0.date, inSameDayAs: date) }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(alignment: .lastTextBaseline) {
                            Text(date, format: .dateTime.month().day())
                                .font(.system(size: 34, weight: .bold, design: .rounded))
                            Spacer()
                            Text(date, format: .dateTime.weekday(.wide))
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(.secondary)
                        }

                        ProgressCard(
                            title: "この日の進み具合",
                            done: done,
                            total: items.count,
                            color: .goalAccent
                        )

                        if !goalsDue.isEmpty || !milestones.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("目印")
                                    .font(.headline.weight(.bold))
                                ForEach(goalsDue) { goal in
                                    GoalDeadlinePill(goal: goal, compact: false)
                                }
                                ForEach(milestones) { milestone in
                                    BackcastMilestonePill(item: milestone, compact: false)
                                }
                            }
                            .cardStyle()
                        }

                        if items.isEmpty {
                            VStack(spacing: 10) {
                                Image(systemName: "calendar")
                                    .font(.system(size: 32, weight: .semibold))
                                    .foregroundStyle(Color.goalAccent)
                                Text("この日はまだ空いています")
                                    .font(.headline)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 22)
                            .cardStyle()
                        } else {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("行動")
                                    .font(.headline.weight(.bold))
                                ForEach(items) { item in
                                    ScheduledTaskRow(item: item, compact: true)
                                        .onTapGesture {
                                            editingItem = item
                                        }
                                }
                            }
                            .cardStyle()
                        }

                        if !groupedByGoal.isEmpty {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("目標別")
                                    .font(.headline.weight(.bold))
                                ForEach(groupedByGoal, id: \.goal.id) { entry in
                                    ProgressLine(
                                        title: entry.goal.title,
                                        done: entry.done,
                                        total: entry.total,
                                        color: Color(hex: entry.goal.colorHex)
                                    )
                                }
                            }
                            .cardStyle()
                        }
                    }
                    .padding(18)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("日別レポート")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("閉じる") { dismiss() }
                }
            }
            .sheet(item: $editingItem) { item in
                ScheduledEditor(item: item)
                    .presentationDetents([.medium])
            }
        }
    }
}

struct GoalEditor: View {
    @EnvironmentObject private var store: CevoaStore
    @Environment(\.dismiss) private var dismiss
    let goal: Goal?
    @State private var title = ""
    @State private var category = ""
    @State private var deadline = Date().addingDays(30)
    @State private var colorHex = ""
    @State private var selectedColor = Color.goalAccent
    @State private var categoryDraft = ""
    @State private var showsDeleteConfirm = false
    @State private var categoryPendingDelete: String?
    @FocusState private var titleFocused: Bool

    init(goal: Goal? = nil) {
        self.goal = goal
        _title = State(initialValue: goal?.title ?? "")
        _category = State(initialValue: goal?.category ?? "")
        _deadline = State(initialValue: goal?.deadline ?? Date().addingDays(30))
        _colorHex = State(initialValue: goal?.colorHex ?? "")
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        EditorFieldCard(title: "目標") {
                            TextField("料理作る", text: $title)
                                .font(.title3.weight(.bold))
                                .submitLabel(.done)
                                .focused($titleFocused)
                        }

                        EditorFieldCard(title: "カテゴリ") {
                            HStack(spacing: 8) {
                                Circle()
                                    .fill(Color(hex: colorHex.isEmpty ? "#0F766E" : colorHex))
                                    .frame(width: 10, height: 10)
                                Text(category.isEmpty ? "未選択" : category)
                                    .font(.subheadline.weight(.bold))
                                Spacer()
                                Text("選択中")
                                    .font(.caption.weight(.bold))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.primary.opacity(0.06))
                            .clipShape(Capsule())

                            CategoryChipGrid(
                                selectedCategory: $category,
                                categories: store.categories,
                                colorHex: colorHex,
                                onDelete: { item in
                                    categoryPendingDelete = item
                                }
                            )

                            HStack(spacing: 8) {
                                TextField("新しいカテゴリ", text: $categoryDraft)
                                    .textInputAutocapitalization(.never)
                                Button {
                                    addDraftCategory()
                                } label: {
                                    Image(systemName: "plus.circle.fill")
                                        .font(.title3)
                                }
                                .disabled(categoryDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                            }
                            .padding(12)
                            .background(Color.primary.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                        }

                        EditorFieldCard(title: "色") {
                            GoalColorEditor(
                                selectedHex: $colorHex,
                                selectedColor: $selectedColor
                            )
                        }

                        EditorFieldCard(title: "期限") {
                            DatePicker("", selection: $deadline, displayedComponents: .date)
                                .labelsHidden()
                                .datePickerStyle(.compact)
                        }

                        if goal != nil {
                            Button(role: .destructive) {
                                showsDeleteConfirm = true
                            } label: {
                                Label("目標を削除", systemImage: "trash")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.softPill)
                        }
                    }
                    .padding(18)
                    .padding(.bottom, 96)
                }
            }
            .onAppear {
                category = category.isEmpty ? (store.categories.first ?? "その他") : category
                colorHex = colorHex.isEmpty ? (store.goalColors.first ?? "#2563EB") : colorHex
                selectedColor = Color(hex: colorHex)
                titleFocused = goal == nil
            }
            .onChange(of: selectedColor) { _, newValue in
                colorHex = newValue.hexString
            }
            .navigationTitle(goal == nil ? "目標を作る" : "目標を編集")
            .confirmationDialog("この目標を削除しますか？", isPresented: $showsDeleteConfirm, titleVisibility: .visible) {
                Button("削除", role: .destructive) {
                    if let goal {
                        store.deleteGoal(goal)
                    }
                    dismiss()
                }
                Button("キャンセル", role: .cancel) {}
            }
            .confirmationDialog("カテゴリを削除しますか？", isPresented: Binding(
                get: { categoryPendingDelete != nil },
                set: { if !$0 { categoryPendingDelete = nil } }
            ), titleVisibility: .visible) {
                if let categoryPendingDelete {
                    Button("削除", role: .destructive) {
                        store.deleteCategory(categoryPendingDelete)
                        if category == categoryPendingDelete {
                            category = store.categories.first ?? ""
                        }
                        self.categoryPendingDelete = nil
                    }
                }
                Button("キャンセル", role: .cancel) {
                    categoryPendingDelete = nil
                }
            } message: {
                if let categoryPendingDelete {
                    Text("「\(categoryPendingDelete)」を削除します。紐づく目標は別のカテゴリへ移ります。")
                }
            }
            .safeAreaInset(edge: .bottom) {
                Button {
                    saveGoal()
                } label: {
                    Text("保存")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.filledPill)
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
                .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || category.isEmpty)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { saveGoal() }
                        .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || category.isEmpty)
                }
            }
        }
    }

    private func addDraftCategory() {
        let clean = categoryDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        store.addCategory(clean)
        category = clean
        categoryDraft = ""
        UISelectionFeedbackGenerator().selectionChanged()
    }

    private func saveGoal() {
        if let goal {
            store.updateGoal(goal, title: title, category: category, deadline: deadline, colorHex: colorHex)
        } else {
            store.addGoal(title: title, category: category, deadline: deadline, colorHex: colorHex)
        }
        dismiss()
    }

}

struct EditorFieldCard<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }
}

struct CategoryChipGrid: View {
    @Binding var selectedCategory: String
    let categories: [String]
    let colorHex: String
    let onDelete: (String) -> Void

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 84), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(categories, id: \.self) { item in
                Button {
                    selectedCategory = item
                    UISelectionFeedbackGenerator().selectionChanged()
                } label: {
                    Text(item)
                        .font(.subheadline.weight(.bold))
                        .lineLimit(1)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(selectedCategory == item ? Color(hex: colorHex).opacity(0.16) : Color.primary.opacity(0.07))
                        .foregroundStyle(selectedCategory == item ? Color(hex: colorHex) : Color.primary)
                        .clipShape(Capsule())
                        .overlay {
                            Capsule()
                                .stroke(selectedCategory == item ? Color(hex: colorHex).opacity(0.8) : .clear, lineWidth: 1.5)
                        }
                }
                .buttonStyle(.plain)
                .onLongPressGesture(minimumDuration: 0.55) {
                    guard categories.count > 1 else { return }
                    onDelete(item)
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                }
                .contextMenu {
                    if categories.count > 1 {
                        Button(role: .destructive) {
                            onDelete(item)
                        } label: {
                            Label("削除", systemImage: "trash")
                        }
                    }
                }
            }
        }
    }
}

struct ColorSwatchGrid: View {
    @Binding var selectedHex: String
    let colors: [String]
    var removableColors: [String] = []
    var onDelete: (String) -> Void = { _ in }

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
            ForEach(colors, id: \.self) { hex in
                Button {
                    selectedHex = hex
                    UISelectionFeedbackGenerator().selectionChanged()
                } label: {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(Color(hex: hex).gradient)
                        .frame(height: 48)
                        .shadow(color: Color(hex: hex).opacity(0.28), radius: selectedHex == hex ? 10 : 0, y: 4)
                    .overlay {
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(selectedHex == hex ? Color.primary.opacity(0.82) : Color.white.opacity(0.22), lineWidth: selectedHex == hex ? 3 : 1)
                    }
                    .scaleEffect(selectedHex == hex ? 1.04 : 1)
                }
                .buttonStyle(.plain)
                .contextMenu {
                    if removableColors.contains(hex) {
                        Button(role: .destructive) {
                            onDelete(hex)
                        } label: {
                            Label("削除", systemImage: "trash")
                        }
                    }
                }
                .onLongPressGesture(minimumDuration: 0.55) {
                    guard removableColors.contains(hex) else { return }
                    onDelete(hex)
                }
            }
        }
    }
}

struct GoalColorEditor: View {
    @EnvironmentObject private var store: CevoaStore
    @Binding var selectedHex: String
    @Binding var selectedColor: Color

    private var selectedDisplayHex: String {
        selectedHex.isEmpty ? selectedColor.hexString : selectedHex
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(selectedColor.gradient)
                    .frame(width: 64, height: 54)
                    .overlay {
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(Color.primary.opacity(0.12), lineWidth: 1)
                    }
                VStack(alignment: .leading, spacing: 4) {
                    Text("選択中")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                    Text(selectedDisplayHex)
                        .font(.headline.monospaced())
                }
                Spacer()
                ColorPicker("", selection: $selectedColor, supportsOpacity: false)
                    .labelsHidden()
            }

            Button {
                selectedHex = selectedColor.hexString
                store.addCustomColor(selectedHex)
                UISelectionFeedbackGenerator().selectionChanged()
            } label: {
                Label("この色を保存", systemImage: "plus")
                    .font(.subheadline.weight(.bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.plain)
            .foregroundStyle(selectedColor)
            .background(selectedColor.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))

            ColorSwatchGrid(
                selectedHex: $selectedHex,
                colors: store.goalColors,
                removableColors: store.goalColors,
                onDelete: deleteColor
            )
                .onChange(of: selectedHex) { _, newValue in
                    selectedColor = Color(hex: newValue)
                }
        }
    }

    private func deleteColor(_ hex: String) {
        store.deleteCustomColor(hex)
        if selectedHex == hex {
            selectedHex = store.goalColors.first ?? "#0F766E"
            selectedColor = Color(hex: selectedHex)
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }
}

struct GoalSelectChip: View {
    let goal: Goal
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Circle()
                    .fill(Color(hex: goal.colorHex))
                    .frame(width: 9, height: 9)
                Text(goal.title)
                    .font(.subheadline.weight(.bold))
                    .lineLimit(1)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
            .background(isSelected ? Color(hex: goal.colorHex).opacity(0.16) : Color.primary.opacity(0.07))
            .foregroundStyle(isSelected ? Color(hex: goal.colorHex) : Color.primary)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(isSelected ? Color(hex: goal.colorHex).opacity(0.85) : .clear, lineWidth: 1.5)
            }
        }
        .buttonStyle(.plain)
    }
}

struct TaskEditor: View {
    @EnvironmentObject private var store: CevoaStore
    @Environment(\.dismiss) private var dismiss
    let initialGoalID: UUID?
    @State private var goalID: UUID?
    @State private var title = ""
    @FocusState private var titleFocused: Bool

    init(initialGoalID: UUID? = nil) {
        self.initialGoalID = initialGoalID
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        EditorFieldCard(title: "目標") {
                            if store.goals.isEmpty {
                                Text("先に目標を作ってください")
                                    .foregroundStyle(.secondary)
                            } else {
                                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                                    ForEach(store.goals) { goal in
                                        GoalSelectChip(
                                            goal: goal,
                                            isSelected: goalID == goal.id
                                        ) {
                                            goalID = goal.id
                                            UISelectionFeedbackGenerator().selectionChanged()
                                        }
                                    }
                                }
                            }
                        }

                        EditorFieldCard(title: "行動") {
                            TextField("卵買ってくる", text: $title)
                                .font(.title3.weight(.bold))
                                .submitLabel(.done)
                                .focused($titleFocused)
                        }
                    }
                    .padding(18)
                    .padding(.bottom, 96)
                }
            }
            .onAppear {
                goalID = goalID ?? initialGoalID ?? store.goals.last?.id
                titleFocused = true
            }
            .navigationTitle("行動")
            .safeAreaInset(edge: .bottom) {
                Button {
                    saveTask()
                } label: {
                    Text("保存")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.filledPill)
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
                .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || goalID == nil)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { saveTask() }
                        .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || goalID == nil)
                }
            }
        }
    }

    private func saveTask() {
        guard let goalID else { return }
        store.addTask(goalID: goalID, title: title, detail: "", estimatedMinutes: 15)
        dismiss()
    }
}

struct ScheduleEditor: View {
    @EnvironmentObject private var store: CevoaStore
    @Environment(\.dismiss) private var dismiss
    let task: ActionTask
    @State private var date = Date()

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        EditorFieldCard(title: "行動") {
                            Text(task.title)
                                .font(.title3.weight(.bold))
                        }
                        EditorFieldCard(title: "日付") {
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .labelsHidden()
                                .datePickerStyle(.compact)
                        }
                    }
                    .padding(18)
                }
            }
            .navigationTitle("予定")
            .navigationBarTitleDisplayMode(.inline)
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
    @EnvironmentObject private var store: CevoaStore
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
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        EditorFieldCard(title: "行動") {
                            TextField("タスク", text: $title)
                                .font(.title3.weight(.bold))
                        }
                        EditorFieldCard(title: "日付") {
                            DatePicker("", selection: $date, displayedComponents: .date)
                                .labelsHidden()
                                .datePickerStyle(.compact)
                        }
                        Button(role: .destructive) {
                            store.deleteScheduled(item)
                            dismiss()
                        } label: {
                            Label("削除", systemImage: "trash")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.softPill)
                    }
                    .padding(18)
                }
            }
            .navigationTitle("編集")
            .navigationBarTitleDisplayMode(.inline)
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

struct BackcastEditor: View {
    @EnvironmentObject private var store: CevoaStore
    @Environment(\.dismiss) private var dismiss
    let goal: Goal
    @State private var steps: [BackcastStep] = []

    init(goal: Goal) {
        self.goal = goal
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 14) {
                        GoalBackcastHeader(goal: goal)

                        BackcastHintCard(goal: goal)

                        ForEach($steps) { $step in
                            BackcastStepRow(
                                step: $step,
                                canDelete: steps.count > 1,
                                onDelete: {
                                    removeStep(step)
                                }
                            )
                        }

                        Button {
                            addStep()
                        } label: {
                            Label("途中目標を追加", systemImage: "plus")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.softPill)
                    }
                    .padding(18)
                    .padding(.bottom, 28)
                }
            }
            .onAppear {
                if steps.isEmpty {
                    let existing = store.backcastPlan(for: goal.id)
                    steps = existing.isEmpty
                        ? BackcastEditor.defaultSteps(for: goal)
                        : existing.map { BackcastStep(title: $0.title, date: $0.date) }
                }
            }
            .navigationTitle("逆算")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        store.replaceBackcastPlan(goalID: goal.id, steps: steps)
                        dismiss()
                    }
                    .disabled(steps.allSatisfy { $0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })
                }
            }
        }
    }

    private func addStep() {
        let nextDate = steps.last?.date.addingDays(7) ?? Date().startOfDay
        withAnimation(.spring(response: 0.32, dampingFraction: 0.82)) {
            steps.append(BackcastStep(title: "〇〇完成", date: Self.minDate(nextDate, goal.deadline)))
        }
        UISelectionFeedbackGenerator().selectionChanged()
    }

    private func removeStep(_ step: BackcastStep) {
        withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
            steps.removeAll { $0.id == step.id }
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private static func defaultSteps(for goal: Goal) -> [BackcastStep] {
        steps(from: ["土台完成", "主要部分完成", "目標達成"], goal: goal)
    }

    private static func steps(from titles: [String], goal: Goal) -> [BackcastStep] {
        let today = Date().startOfDay
        let deadline = maxDate(today, goal.deadline.startOfDay)
        let totalDays = max(1, Calendar.current.dateComponents([.day], from: today, to: deadline).day ?? 1)
        let count = max(1, titles.count)
        return titles.enumerated().map { index, title in
            let offset = count == 1 ? 0 : Int((Double(totalDays) * Double(index)) / Double(count - 1))
            return BackcastStep(title: title, date: minDate(today.addingDays(offset), deadline))
        }
    }

    private static func minDate(_ lhs: Date, _ rhs: Date) -> Date {
        lhs <= rhs ? lhs : rhs
    }

    private static func maxDate(_ lhs: Date, _ rhs: Date) -> Date {
        lhs >= rhs ? lhs : rhs
    }
}

struct BackcastHintCard: View {
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "arrow.triangle.branch")
                Text("ゴールまでの柱を置く")
            }
            .font(.headline)
            .foregroundStyle(Color(hex: goal.colorHex))

            Text("途中目標は日々のタスクではなく、達成までに完成させる大きな区切りです。例: 土台完成、主要部分完成、目標達成。")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .cardStyle()
    }
}

struct BackcastStepRow: View {
    @Binding var step: BackcastStep
    let canDelete: Bool
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            DatePicker("", selection: $step.date, displayedComponents: .date)
                .labelsHidden()
                .datePickerStyle(.compact)
                .frame(minWidth: 98, alignment: .leading)

            TextField("途中目標", text: $step.title)
                .font(.headline)

            Button(role: .destructive, action: onDelete) {
                Image(systemName: "minus.circle.fill")
            }
            .buttonStyle(.plain)
            .disabled(!canDelete)
            .opacity(canDelete ? 1 : 0.25)
        }
        .padding(14)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

struct GoalBackcastHeader: View {
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Circle()
                    .fill(Color(hex: goal.colorHex))
                    .frame(width: 12, height: 12)
                Text(goal.title)
                    .font(.title3.weight(.bold))
                    .lineLimit(1)
                Spacer()
                Text(goal.deadline, format: .dateTime.month().day())
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
        }
        .cardStyle()
    }
}

struct DragPreview: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.caption.weight(.bold))
            .lineLimit(1)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
    }
}

private enum DragPayload {
    case task(UUID)
    case scheduled(UUID)

    init?(rawValue: String) {
        let parts = rawValue.split(separator: ":")
        guard parts.count == 2, let id = UUID(uuidString: String(parts[1])) else { return nil }
        switch parts[0] {
        case "task":
            self = .task(id)
        case "scheduled":
            self = .scheduled(id)
        default:
            return nil
        }
    }

    var rawValue: String {
        switch self {
        case .task(let id):
            "task:\(id.uuidString)"
        case .scheduled(let id):
            "scheduled:\(id.uuidString)"
        }
    }
}

private struct QuietIconButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.weight(.bold))
            .frame(width: 38, height: 38)
            .background(Color.primary.opacity(configuration.isPressed ? 0.14 : 0.08))
            .clipShape(Circle())
            .scaleEffect(configuration.isPressed ? 0.92 : 1)
            .animation(.spring(response: 0.2, dampingFraction: 0.72), value: configuration.isPressed)
    }
}

private struct FilledPillButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.bold))
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.goalAccent.opacity(configuration.isPressed ? 0.78 : 1))
            .foregroundStyle(.white)
            .clipShape(Capsule())
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(response: 0.2, dampingFraction: 0.76), value: configuration.isPressed)
    }
}

private struct SoftPillButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.bold))
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.primary.opacity(configuration.isPressed ? 0.14 : 0.08))
            .foregroundStyle(Color.primary)
            .clipShape(Capsule())
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.spring(response: 0.2, dampingFraction: 0.76), value: configuration.isPressed)
    }
}

private extension ButtonStyle where Self == QuietIconButtonStyle {
    static var quietIcon: QuietIconButtonStyle { QuietIconButtonStyle() }
}

private extension ButtonStyle where Self == FilledPillButtonStyle {
    static var filledPill: FilledPillButtonStyle { FilledPillButtonStyle() }
}

private extension ButtonStyle where Self == SoftPillButtonStyle {
    static var softPill: SoftPillButtonStyle { SoftPillButtonStyle() }
}

private extension View {
    func cardStyle() -> some View {
        padding(16)
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: .black.opacity(0.07), radius: 22, y: 10)
    }
}

private extension Color {
    static let goalAccent = Color(red: 0.08, green: 0.42, blue: 0.39)
    static let appBackground = Color(red: 0.95, green: 0.96, blue: 0.94)
    static let cardBackground = Color(uiColor: .secondarySystemGroupedBackground)
}

#Preview {
    ContentView()
        .environmentObject(CevoaStore())
}
