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
                    .presentationDetents([.medium, .large])
            case .task:
                TaskEditor()
                    .presentationDetents([.medium, .large])
            case .schedule(let task):
                ScheduleEditor(task: task)
                    .presentationDetents([.medium])
            case .scheduled(let item):
                ScheduledEditor(item: item)
                    .presentationDetents([.medium])
            }
        }
    }
}

private enum AppTab {
    case today
    case plan
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
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        sheet = .goal
                    } label: {
                        Image(systemName: "target")
                    }
                    .accessibilityLabel("目標")

                    Button {
                        sheet = .task
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("行動を保存")
                }
            }
        }
    }
}

struct PlannerView: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var sheet: ActiveSheet?
    @State private var weekAnchor = Date().startOfDay
    @State private var selectedTaskID: UUID?
    @State private var pulseDate: Date?

    private var week: [Date] {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: weekAnchor)
        let mondayOffset = weekday == 1 ? -6 : 2 - weekday
        let start = calendar.date(byAdding: .day, value: mondayOffset, to: weekAnchor) ?? weekAnchor
        return (0..<7).map { start.addingDays($0) }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                VStack(spacing: 12) {
                    WeekControls(
                        weekStart: week.first ?? weekAnchor,
                        previous: { moveWeek(-7) },
                        today: { moveToToday() },
                        next: { moveWeek(7) }
                    )
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(alignment: .top, spacing: 12) {
                            ForEach(week, id: \.self) { date in
                                CalendarDayCard(
                                    date: date,
                                    items: store.tasks(for: date),
                                    selectedTaskID: selectedTaskID,
                                    isPulsing: Calendar.current.isDate(pulseDate ?? .distantPast, inSameDayAs: date),
                                    onTapDate: { placeSelectedTask(on: date) },
                                    onEdit: { sheet = .scheduled($0) },
                                    onDropPayload: { payload in handleDrop(payload, on: date) }
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                    }

                    TaskShelf(
                        selectedTaskID: $selectedTaskID,
                        onAdd: { sheet = .task },
                        onGoal: { sheet = .goal },
                        onSchedule: { sheet = .schedule($0) }
                    )
                    .padding(.horizontal, 16)
                    .padding(.bottom, 12)
                }
            }
            .navigationTitle("予定")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func moveWeek(_ days: Int) {
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) {
            weekAnchor = weekAnchor.addingDays(days)
        }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func moveToToday() {
        withAnimation(.spring(response: 0.42, dampingFraction: 0.86)) {
            weekAnchor = Date().startOfDay
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
}

struct WeekControls: View {
    let weekStart: Date
    let previous: () -> Void
    let today: () -> Void
    let next: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Button(action: previous) {
                Image(systemName: "chevron.left")
            }
            Spacer()
            Text(weekStart, format: .dateTime.month().day())
                .font(.headline.monospacedDigit())
            Image(systemName: "arrow.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
            Text(weekStart.addingDays(6), format: .dateTime.month().day())
                .font(.headline.monospacedDigit())
            Spacer()
            Button(action: today) {
                Image(systemName: "dot.scope")
            }
            Button(action: next) {
                Image(systemName: "chevron.right")
            }
        }
        .buttonStyle(.quietIcon)
        .padding(8)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
    }
}

struct CalendarDayCard: View {
    let date: Date
    let items: [ScheduledTask]
    let selectedTaskID: UUID?
    let isPulsing: Bool
    let onTapDate: () -> Void
    let onEdit: (ScheduledTask) -> Void
    let onDropPayload: (String) -> Bool

    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Button(action: onTapDate) {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(date, format: .dateTime.weekday(.abbreviated))
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.secondary)
                        Text(date, format: .dateTime.day())
                            .font(.system(size: 34, weight: .bold, design: .rounded))
                    }
                    Spacer()
                    if !items.isEmpty {
                        Text("\(items.count)")
                            .font(.caption.weight(.bold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 5)
                            .background(Color.primary.opacity(0.08))
                            .clipShape(Capsule())
                    }
                }
            }
            .buttonStyle(.plain)

            ScrollView {
                LazyVStack(spacing: 8) {
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
        .frame(width: 156, height: 430, alignment: .topLeading)
        .padding(14)
        .background(dayBackground)
        .overlay {
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(borderColor, lineWidth: selectedTaskID == nil ? 1 : 2)
        }
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
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

struct TaskShelf: View {
    @EnvironmentObject private var store: GoalFlowStore
    @Binding var selectedTaskID: UUID?
    let onAdd: () -> Void
    let onGoal: () -> Void
    let onSchedule: (ActionTask) -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Button(action: onGoal) {
                    Image(systemName: "target")
                }
                Button(action: onAdd) {
                    Image(systemName: "plus")
                }
                Spacer()
                if selectedTaskID != nil {
                    Image(systemName: "hand.draw.fill")
                        .font(.headline)
                        .foregroundStyle(Color.goalAccent)
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .buttonStyle(.quietIcon)

            if store.tasks.isEmpty {
                Button(action: onAdd) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 38, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 22)
                }
                .buttonStyle(.plain)
                .foregroundStyle(Color.goalAccent)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 10) {
                        ForEach(store.tasks) { task in
                            SavedTaskChip(
                                task: task,
                                isSelected: selectedTaskID == task.id,
                                onSchedule: { onSchedule(task) }
                            )
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
                    }
                    .padding(.vertical, 2)
                }
            }
        }
        .padding(14)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 24, y: 10)
    }
}

struct SavedTaskChip: View {
    @EnvironmentObject private var store: GoalFlowStore
    let task: ActionTask
    let isSelected: Bool
    let onSchedule: () -> Void

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
            Button(action: onSchedule) {
                Image(systemName: "calendar.badge.plus")
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(width: 210, alignment: .leading)
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
    @State private var title = ""
    @State private var category: GoalCategory = .study
    @State private var reason = ""
    @State private var deadline = Date().addingDays(30)

    var body: some View {
        NavigationStack {
            Form {
                TextField("目標", text: $title)
                Picker("カテゴリ", selection: $category) {
                    ForEach(GoalCategory.allCases) { category in
                        Text(category.rawValue).tag(category)
                    }
                }
                TextField("理由", text: $reason, axis: .vertical)
                DatePicker("期限", selection: $deadline, displayedComponents: .date)
            }
            .navigationTitle("目標")
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
                TextField("行動", text: $title)
                TextField("メモ", text: $detail, axis: .vertical)
                Stepper("\(minutes)分", value: $minutes, in: 5...180, step: 5)
            }
            .onAppear {
                goalID = goalID ?? store.goals.first?.id
            }
            .navigationTitle("保存")
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
                Text(task.title)
                    .font(.headline)
                DatePicker("日付", selection: $date, displayedComponents: .date)
            }
            .navigationTitle("予定")
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
                TextField("タスク", text: $title)
                DatePicker("日付", selection: $date, displayedComponents: .date)
                Button(role: .destructive) {
                    store.deleteScheduled(item)
                    dismiss()
                } label: {
                    Text("削除")
                }
            }
            .navigationTitle("編集")
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

private extension ButtonStyle where Self == QuietIconButtonStyle {
    static var quietIcon: QuietIconButtonStyle { QuietIconButtonStyle() }
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
