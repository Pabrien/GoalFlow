import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject private var store: GoalFlowStore
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
    case backcast(Goal)

    var id: String {
        switch self {
        case .goal: "goal"
        case .editGoal(let goal): "edit-goal-\(goal.id)"
        case .task(let goalID): "task-\(goalID?.uuidString ?? "new")"
        case .schedule(let task): "schedule-\(task.id)"
        case .scheduled(let item): "scheduled-\(item.id)"
        case .backcast(let goal): "backcast-\(goal.id)"
        }
    }
}

struct TodayView: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var sheet: ActiveSheet?
    @Namespace private var completeNamespace

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        TodayHeader()
                        TodayRing(progress: store.todayCompletionRate)

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
            .navigationTitle("GoalFlow")
        }
    }
}

struct GoalsView: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var sheet: ActiveSheet?

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
            .navigationTitle("目標")
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
    @EnvironmentObject private var store: GoalFlowStore
    let goal: Goal
    let onEdit: () -> Void
    let onBackcast: () -> Void

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
                    done: store.scheduled.filter { $0.goalID == goal.id && $0.isDone }.count,
                    total: store.scheduled.filter { $0.goalID == goal.id }.count,
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

            let plan = store.backcastPlan(for: goal.id)
            if !plan.isEmpty {
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
                .background(goalColor.opacity(0.09))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }

        }
        .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .onTapGesture(perform: onEdit)
        .cardStyle()
    }

    private var goalColor: Color {
        Color(hex: goal.colorHex)
    }
}

struct PlannerView: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var sheet: ActiveSheet?
    @State private var anchorDate = Date().startOfDay
    @State private var mode: PlannerMode = .week
    @State private var selectedTaskID: UUID?
    @State private var selectedGoalID: UUID?
    @State private var pulseDate: Date?
    @State private var showsGoalDeadlines = false

    private var week: [Date] {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: anchorDate)
        let mondayOffset = weekday == 1 ? -6 : 2 - weekday
        let start = calendar.date(byAdding: .day, value: mondayOffset, to: anchorDate) ?? anchorDate
        return (0..<7).map { start.addingDays($0) }
    }

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
                    CalendarControls(
                        mode: $mode,
                        showsGoalDeadlines: $showsGoalDeadlines,
                        anchorDate: anchorDate,
                        previous: { movePeriod(-1) },
                        today: { moveToToday() },
                        next: { movePeriod(1) }
                    )
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                    calendarBody

                    TaskShelf(
                        selectedGoalID: $selectedGoalID,
                        selectedTaskID: $selectedTaskID,
                        onAddTask: { sheet = .task(selectedGoalID) },
                        onAddGoal: { sheet = .goal }
                    )
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                }
            }
            .navigationTitle("予定")
            .navigationBarTitleDisplayMode(.inline)
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
        }
    }

    @ViewBuilder
    private var calendarBody: some View {
        switch mode {
        case .week:
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 10) {
                    ForEach(week, id: \.self) { date in
                        CalendarDayCard(
                            date: date,
                            items: store.tasks(for: date),
                            goalsDue: showsGoalDeadlines ? goalsDue(on: date) : [],
                            selectedTaskID: selectedTaskID,
                            isPulsing: Calendar.current.isDate(pulseDate ?? .distantPast, inSameDayAs: date),
                            onTapDate: { placeSelectedTask(on: date) },
                            onEdit: { sheet = .scheduled($0) },
                            onDropPayload: { payload in handleDrop(payload, on: date) }
                        )
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 2)
                .padding(.bottom, 4)
            }
        case .month:
            MonthGrid(
                dates: month,
                anchorDate: anchorDate,
                selectedTaskID: selectedTaskID,
                pulseDate: pulseDate,
                showsGoalDeadlines: showsGoalDeadlines,
                onTapDate: placeSelectedTask,
                onEdit: { sheet = .scheduled($0) },
                onDropPayload: handleDrop
            )
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }

    private func movePeriod(_ direction: Int) {
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) {
            switch mode {
            case .week:
                anchorDate = anchorDate.addingDays(direction * 7)
            case .month:
                anchorDate = Calendar.current.date(byAdding: .month, value: direction, to: anchorDate) ?? anchorDate
            }
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func moveToToday() {
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) {
            anchorDate = Date().startOfDay
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func placeSelectedTask(on date: Date) {
        guard let selectedTaskID else { return }
        withAnimation(.spring(response: 0.42, dampingFraction: 0.82)) {
            store.schedule(taskID: selectedTaskID, on: date)
            pulseDate = date
            self.selectedTaskID = nil
        }
        clearPulse()
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
            selectedTaskID = nil
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

    private func goalsDue(on date: Date) -> [Goal] {
        store.goals.filter { Calendar.current.isDate($0.deadline, inSameDayAs: date) }
    }
}

enum PlannerMode: String, CaseIterable, Identifiable {
    case week = "週"
    case month = "月"

    var id: String { rawValue }
}

struct CalendarControls: View {
    @Binding var mode: PlannerMode
    @Binding var showsGoalDeadlines: Bool
    let anchorDate: Date
    let previous: () -> Void
    let today: () -> Void
    let next: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button(action: previous) {
                Text("前")
            }
            Picker("", selection: $mode) {
                ForEach(PlannerMode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 104)
            Text(label)
                .font(.subheadline.weight(.bold).monospacedDigit())
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .frame(maxWidth: .infinity)
            Button {
                showsGoalDeadlines.toggle()
                UISelectionFeedbackGenerator().selectionChanged()
            } label: {
                Text("期限")
            }
            .foregroundStyle(showsGoalDeadlines ? Color.goalAccent : Color.primary)
            Button(action: today) {
                Text("今日")
            }
            Button(action: next) {
                Text("次")
            }
        }
        .buttonStyle(.softPill)
        .padding(6)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
    }

    private var label: String {
        switch mode {
        case .week:
            let weekStart = weekStart(for: anchorDate)
            let end = weekStart.addingDays(6)
            return "\(weekStart.formatted(.dateTime.month().day()))-\(end.formatted(.dateTime.day()))"
        case .month:
            return anchorDate.formatted(.dateTime.year().month())
        }
    }

    private func weekStart(for date: Date) -> Date {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: date)
        let mondayOffset = weekday == 1 ? -6 : 2 - weekday
        return calendar.date(byAdding: .day, value: mondayOffset, to: date) ?? date
    }
}

struct CalendarDayCard: View {
    let date: Date
    let items: [ScheduledTask]
    let goalsDue: [Goal]
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
                    ForEach(items) { item in
                        CalendarTaskPill(item: item)
                            .onTapGesture {
                                onEdit(item)
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
    @EnvironmentObject private var store: GoalFlowStore
    let dates: [Date]
    let anchorDate: Date
    let selectedTaskID: UUID?
    let pulseDate: Date?
    let showsGoalDeadlines: Bool
    let onTapDate: (Date) -> Void
    let onEdit: (ScheduledTask) -> Void
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
                        goalsDue: showsGoalDeadlines ? goalsDue(on: date) : [],
                        selectedTaskID: selectedTaskID,
                        isPulsing: Calendar.current.isDate(pulseDate ?? .distantPast, inSameDayAs: date),
                        onTapDate: { onTapDate(date) },
                        onEdit: onEdit,
                        onDropPayload: { onDropPayload($0, date) }
                    )
                }
            }
        }
    }

    private func goalsDue(on date: Date) -> [Goal] {
        store.goals.filter { Calendar.current.isDate($0.deadline, inSameDayAs: date) }
    }
}

struct MonthDayCell: View {
    @EnvironmentObject private var store: GoalFlowStore
    let date: Date
    let isInMonth: Bool
    let items: [ScheduledTask]
    let goalsDue: [Goal]
    let selectedTaskID: UUID?
    let isPulsing: Bool
    let onTapDate: () -> Void
    let onEdit: (ScheduledTask) -> Void
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
                ForEach(items.prefix(3)) { item in
                    MonthTaskDot(item: item)
                        .contentShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        .onTapGesture {
                            onEdit(item)
                        }
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
    @EnvironmentObject private var store: GoalFlowStore
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

struct TaskShelf: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var selectedGoalID: UUID?
    @Binding var selectedTaskID: UUID?
    let onAddTask: () -> Void
    let onAddGoal: () -> Void

    private var selectedGoal: Goal? {
        guard let selectedGoalID else { return store.goals.first }
        return store.goal(for: selectedGoalID)
    }

    private var visibleTasks: [ActionTask] {
        guard let goalID = selectedGoal?.id else { return [] }
        return store.tasks.filter { $0.goalID == goalID }
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
                    Text(store.goals.isEmpty ? "目標" : "行動")
                }
                if selectedTaskID != nil {
                    Text("置く日を選ぶ")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.goalAccent)
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

                if visibleTasks.isEmpty {
                    Button(action: onAddTask) {
                        VStack(spacing: 10) {
                            Image(systemName: "plus.circle.fill")
                                .font(.system(size: 34, weight: .semibold))
                            Text("行動を作る")
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
                                    isSelected: selectedTaskID == task.id
                                )
                                .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                                .onTapGesture {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.78)) {
                                        selectedTaskID = selectedTaskID == task.id ? nil : task.id
                                    }
                                    UISelectionFeedbackGenerator().selectionChanged()
                                }
                                .draggable(DragPayload.task(task.id).rawValue) {
                                    DragPreview(title: task.title)
                                }
                            }
                            Button(action: onAddTask) {
                                Label("行動を追加", systemImage: "plus")
                                    .font(.subheadline.weight(.bold))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(Color.goalAccent)
                            .background(Color.goalAccent.opacity(0.09))
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
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

struct GoalTaskFilter: View {
    @EnvironmentObject private var store: GoalFlowStore
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
    @EnvironmentObject private var store: GoalFlowStore
    let task: ActionTask
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(goalColor)
                .frame(width: 6, height: 42)
            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.subheadline.weight(.bold))
                    .lineLimit(1)
                Text(store.goal(for: task.goalID)?.title ?? "")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            Image(systemName: "line.3.horizontal")
                .font(.headline.weight(.bold))
                .foregroundStyle(goalColor.opacity(0.82))
                .frame(width: 34, height: 34)
                .background(goalColor.opacity(0.12))
                .clipShape(Circle())
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
}

struct CalendarTaskPill: View {
    @EnvironmentObject private var store: GoalFlowStore
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
    @EnvironmentObject private var store: GoalFlowStore
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
    @EnvironmentObject private var store: GoalFlowStore

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 16) {
                        ProgressCard(
                            title: "今日",
                            done: store.todayTasks.filter(\.isDone).count,
                            total: store.todayTasks.count,
                            color: .goalAccent
                        )
                        ProgressCard(
                            title: "全体",
                            done: store.scheduled.filter(\.isDone).count,
                            total: store.scheduled.count,
                            color: .blue
                        )
                        VStack(spacing: 10) {
                            ForEach(store.goals) { goal in
                                let total = store.scheduled.filter { $0.goalID == goal.id }.count
                                let done = store.scheduled.filter { $0.goalID == goal.id && $0.isDone }.count
                                ProgressLine(title: goal.title, done: done, total: total, color: Color(hex: goal.colorHex))
                            }
                        }
                        .cardStyle()
                    }
                    .padding(18)
                }
            }
            .navigationTitle("進捗")
        }
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

struct GoalEditor: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Environment(\.dismiss) private var dismiss
    let goal: Goal?
    @State private var title = ""
    @State private var category = ""
    @State private var deadline = Date().addingDays(30)
    @State private var colorHex = ""
    @State private var categoryDraft = ""
    @State private var editsCategories = false
    @State private var showsDeleteConfirm = false
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
                            CategoryChipGrid(selectedCategory: $category, categories: store.categories)

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

                            Button {
                                withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                                    editsCategories.toggle()
                                }
                            } label: {
                                HStack {
                                    Text("カテゴリを編集")
                                    Spacer()
                                    Image(systemName: editsCategories ? "chevron.up" : "chevron.down")
                                }
                                .font(.subheadline.weight(.bold))
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(.secondary)

                            if editsCategories {
                                VStack(spacing: 8) {
                                    ForEach(store.categories, id: \.self) { item in
                                        InlineCategoryRow(category: item, selectedCategory: $category)
                                    }
                                }
                                .transition(.move(edge: .top).combined(with: .opacity))
                            }
                        }

                        EditorFieldCard(title: "色") {
                            ColorSwatchGrid(selectedHex: $colorHex, colors: store.goalColors)
                            Button {
                                colorHex = Self.randomColorHex()
                                UISelectionFeedbackGenerator().selectionChanged()
                            } label: {
                                Label("別の色", systemImage: "sparkles")
                                    .font(.subheadline.weight(.bold))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(Color(hex: colorHex))
                            .background(Color(hex: colorHex).opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
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
                titleFocused = goal == nil
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

    private static func randomColorHex() -> String {
        let hue = Double.random(in: 0...1)
        let saturation = Double.random(in: 0.56...0.78)
        let brightness = Double.random(in: 0.58...0.82)
        let uiColor = UIColor(hue: hue, saturation: saturation, brightness: brightness, alpha: 1)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        uiColor.getRed(&red, green: &green, blue: &blue, alpha: nil)
        return String(
            format: "#%02X%02X%02X",
            Int(red * 255),
            Int(green * 255),
            Int(blue * 255)
        )
    }
}

struct InlineCategoryRow: View {
    @EnvironmentObject private var store: GoalFlowStore
    let category: String
    @Binding var selectedCategory: String
    @State private var draft = ""

    var body: some View {
        HStack(spacing: 10) {
            TextField(category, text: $draft)
                .onAppear {
                    draft = category
                }
                .onSubmit {
                    let old = category
                    store.renameCategory(category, to: draft)
                    if selectedCategory == old {
                        selectedCategory = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                    }
                }
            Button {
                let old = category
                store.renameCategory(category, to: draft)
                if selectedCategory == old {
                    selectedCategory = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                }
            } label: {
                Image(systemName: "checkmark.circle")
            }
            .buttonStyle(.plain)
            .foregroundStyle(Color.goalAccent)
            Button(role: .destructive) {
                store.deleteCategory(category)
                selectedCategory = store.categories.first ?? ""
            } label: {
                Image(systemName: "trash")
            }
            .buttonStyle(.plain)
            .disabled(store.categories.count <= 1)
        }
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
                        .background(selectedCategory == item ? Color.goalAccent.opacity(0.16) : Color.primary.opacity(0.07))
                        .foregroundStyle(selectedCategory == item ? Color.goalAccent : Color.primary)
                        .clipShape(Capsule())
                        .overlay {
                            Capsule()
                                .stroke(selectedCategory == item ? Color.goalAccent.opacity(0.8) : .clear, lineWidth: 1.5)
                        }
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct ColorSwatchGrid: View {
    @Binding var selectedHex: String
    let colors: [String]

    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
            ForEach(colors, id: \.self) { hex in
                Button {
                    selectedHex = hex
                    UISelectionFeedbackGenerator().selectionChanged()
                } label: {
                    ZStack {
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(Color(hex: hex).gradient)
                            .frame(height: 48)
                            .shadow(color: Color(hex: hex).opacity(0.28), radius: selectedHex == hex ? 10 : 0, y: 4)
                        if selectedHex == hex {
                            Image(systemName: "checkmark")
                                .font(.headline.weight(.bold))
                                .foregroundStyle(.white)
                        }
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(selectedHex == hex ? Color.primary.opacity(0.75) : Color.white.opacity(0.22), lineWidth: selectedHex == hex ? 2.5 : 1)
                    }
                }
                .buttonStyle(.plain)
            }
        }
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
    @EnvironmentObject private var store: GoalFlowStore
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
    @EnvironmentObject private var store: GoalFlowStore
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
    @EnvironmentObject private var store: GoalFlowStore
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
                            Label("追加", systemImage: "plus")
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
            steps.append(BackcastStep(title: "", date: Self.minDate(nextDate, goal.deadline)))
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
        let today = Date().startOfDay
        let deadline = maxDate(today, goal.deadline.startOfDay)
        let totalDays = max(1, Calendar.current.dateComponents([.day], from: today, to: deadline).day ?? 1)
        let dates = [
            today,
            today.addingDays(max(1, totalDays / 2)),
            deadline
        ]
        return [
            BackcastStep(title: "最初の一手", date: dates[0]),
            BackcastStep(title: "途中確認", date: minDate(dates[1], deadline)),
            BackcastStep(title: "達成ライン", date: deadline)
        ]
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
                Text("ゴールから節目を置く")
            }
            .font(.headline)
            .foregroundStyle(Color(hex: goal.colorHex))

            Text("ここで作る項目は予定ではなく、目標の道筋です。必要な節目だけ残して、日々の行動は予定に置きます。")
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

            TextField("節目", text: $step.title)
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
            HStack(spacing: 8) {
                Image(systemName: "target")
                Image(systemName: "arrow.backward")
                Image(systemName: "calendar")
            }
            .font(.title3.weight(.bold))
            .foregroundStyle(Color(hex: goal.colorHex))
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
        .environmentObject(GoalFlowStore())
}
