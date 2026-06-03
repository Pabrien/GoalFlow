import Foundation
import SwiftUI
import UIKit

@MainActor
final class GoalFlowStore: ObservableObject {
    @Published var goals: [Goal] = [] { didSet { save() } }
    @Published var tasks: [ActionTask] = [] { didSet { save() } }
    @Published var scheduled: [ScheduledTask] = [] { didSet { save() } }
    @Published var categories: [String] = defaultCategories { didSet { save() } }

    private let storageURL: URL

    init(storageURL: URL? = nil) {
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        self.storageURL = storageURL ?? directory!.appendingPathComponent("goalflow-state.json")
        load()
        if goals.isEmpty {
            seed()
        }
    }

    var today: Date { Date().startOfDay }

    var todayTasks: [ScheduledTask] {
        scheduled
            .filter { Calendar.current.isDate($0.date, inSameDayAs: today) }
            .sorted { $0.title < $1.title }
    }

    var todayCompletionRate: Double {
        guard !todayTasks.isEmpty else { return 0 }
        let done = todayTasks.filter(\.isDone).count
        return Double(done) / Double(todayTasks.count)
    }

    var overallCompletionRate: Double {
        guard !scheduled.isEmpty else { return 0 }
        let done = scheduled.filter(\.isDone).count
        return Double(done) / Double(scheduled.count)
    }

    var goalColors: [String] { palette }

    func addGoal(title: String, category: String, deadline: Date, colorHex: String) {
        goals.append(
            Goal(
                title: title,
                category: category,
                startDate: Date().startOfDay,
                deadline: deadline.startOfDay,
                colorHex: colorHex
            )
        )
    }

    func updateGoalColor(_ goal: Goal, colorHex: String) {
        guard let index = goals.firstIndex(where: { $0.id == goal.id }) else { return }
        goals[index].colorHex = colorHex
    }

    func addCategory(_ name: String) {
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty, !categories.contains(clean) else { return }
        categories.append(clean)
    }

    func renameCategory(_ oldName: String, to newName: String) {
        let clean = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty, let index = categories.firstIndex(of: oldName) else { return }
        categories[index] = clean
        for goalIndex in goals.indices where goals[goalIndex].category == oldName {
            goals[goalIndex].category = clean
        }
    }

    func deleteCategory(_ name: String) {
        guard categories.count > 1 else { return }
        categories.removeAll { $0 == name }
        let fallback = categories.first ?? defaultCategories[0]
        for goalIndex in goals.indices where goals[goalIndex].category == name {
            goals[goalIndex].category = fallback
        }
    }

    func addTask(goalID: UUID, title: String, detail: String, estimatedMinutes: Int) {
        tasks.append(
            ActionTask(
                goalID: goalID,
                title: title,
                detail: detail,
                estimatedMinutes: max(1, estimatedMinutes)
            )
        )
    }

    func addBackcastPlan(goalID: UUID, steps: [BackcastStep]) {
        guard let goal = goal(for: goalID) else { return }
        let cleanSteps = steps
            .map { BackcastStep(title: $0.title.trimmingCharacters(in: .whitespacesAndNewlines), date: $0.date.startOfDay) }
            .filter { !$0.title.isEmpty }

        for step in cleanSteps {
            let task = ActionTask(
                goalID: goalID,
                title: step.title,
                detail: "逆算: \(goal.title)",
                estimatedMinutes: 25
            )
            tasks.append(task)
            scheduled.append(
                ScheduledTask(
                    taskID: task.id,
                    goalID: goalID,
                    title: task.title,
                    date: step.date
                )
            )
        }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func schedule(task: ActionTask, on date: Date) {
        scheduled.append(
            ScheduledTask(
                taskID: task.id,
                goalID: task.goalID,
                title: task.title,
                date: date.startOfDay
            )
        )
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    func schedule(taskID: UUID, on date: Date) {
        guard let task = task(id: taskID) else { return }
        schedule(task: task, on: date)
    }

    func moveScheduled(_ item: ScheduledTask, to date: Date) {
        guard let index = scheduled.firstIndex(where: { $0.id == item.id }) else { return }
        scheduled[index].date = date.startOfDay
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    func toggleDone(_ item: ScheduledTask) {
        guard let index = scheduled.firstIndex(where: { $0.id == item.id }) else { return }
        scheduled[index].isDone.toggle()
        if scheduled[index].isDone {
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } else {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }

    func updateScheduled(_ item: ScheduledTask, title: String, date: Date) {
        guard let index = scheduled.firstIndex(where: { $0.id == item.id }) else { return }
        scheduled[index].title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        scheduled[index].date = date.startOfDay
    }

    func deleteScheduled(_ item: ScheduledTask) {
        scheduled.removeAll { $0.id == item.id }
    }

    func goal(for id: UUID) -> Goal? {
        goals.first { $0.id == id }
    }

    func task(id: UUID) -> ActionTask? {
        tasks.first { $0.id == id }
    }

    func tasks(for date: Date) -> [ScheduledTask] {
        scheduled
            .filter { Calendar.current.isDate($0.date, inSameDayAs: date) }
            .sorted { $0.title < $1.title }
    }

    private func save() {
        let snapshot = Snapshot(goals: goals, tasks: tasks, scheduled: scheduled, categories: categories)
        guard let data = try? JSONEncoder.goalFlow.encode(snapshot) else { return }
        try? data.write(to: storageURL, options: .atomic)
    }

    private func load() {
        guard
            let data = try? Data(contentsOf: storageURL),
            let snapshot = try? JSONDecoder.goalFlow.decode(Snapshot.self, from: data)
        else { return }
        goals = snapshot.goals
        tasks = snapshot.tasks
        scheduled = snapshot.scheduled
        categories = snapshot.categories ?? defaultCategories
    }

    private func seed() {
        let goal = Goal(
            title: "英語を毎日進める",
            category: defaultCategories[0],
            startDate: today,
            deadline: today.addingDays(45),
            colorHex: palette[0]
        )
        goals = [goal]
        let task = ActionTask(
            goalID: goal.id,
            title: "単語を30個復習",
            detail: "短くても毎日残す",
            estimatedMinutes: 15
        )
        tasks = [task]
        scheduled = [
            ScheduledTask(taskID: task.id, goalID: goal.id, title: task.title, date: today)
        ]
    }
}

struct BackcastStep: Identifiable, Equatable {
    var id = UUID()
    var title: String
    var date: Date
}

private struct Snapshot: Codable {
    var goals: [Goal]
    var tasks: [ActionTask]
    var scheduled: [ScheduledTask]
    var categories: [String]?
}

private let defaultCategories = ["勉強", "筋トレ", "制作", "資格", "生活", "その他"]

private let palette = [
    "#2563EB", "#0F766E", "#7C3AED", "#C2410C", "#BE123C", "#047857"
]

private extension JSONEncoder {
    static var goalFlow: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

private extension JSONDecoder {
    static var goalFlow: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
