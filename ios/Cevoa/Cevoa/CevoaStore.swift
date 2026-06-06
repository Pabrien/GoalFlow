import Foundation
import SwiftUI
import UIKit

@MainActor
final class CevoaStore: ObservableObject {
    @Published var goals: [Goal] = [] { didSet { save() } }
    @Published var tasks: [ActionTask] = [] { didSet { save() } }
    @Published var scheduled: [ScheduledTask] = [] { didSet { save() } }
    @Published var backcastItems: [BackcastItem] = [] { didSet { save() } }
    @Published var categories: [String] = defaultCategories { didSet { save() } }
    @Published var colorPalette: [String] = defaultPalette { didSet { save() } }

    private let storageURL: URL
    private let legacyStorageURL: URL?

    init(storageURL: URL? = nil) {
        let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        self.storageURL = storageURL ?? directory!.appendingPathComponent("cevoa-state.json")
        self.legacyStorageURL = storageURL == nil ? directory?.appendingPathComponent("cevoa-legacy-state.json") : nil
        load()
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

    var weekCompletedCount: Int {
        let calendar = Calendar.current
        let start = calendar.dateInterval(of: .weekOfYear, for: today)?.start ?? today
        let end = calendar.date(byAdding: .day, value: 7, to: start) ?? today.addingDays(7)
        return scheduled.filter { item in
            item.isDone && item.date >= start && item.date < end
        }.count
    }

    var currentStreak: Int {
        let calendar = Calendar.current
        let doneDates = Set(scheduled.filter(\.isDone).map { $0.date.startOfDay })
        guard !doneDates.isEmpty else { return 0 }
        let anchor = doneDates.contains(today) ? today : today.addingDays(-1)
        var streak = 0
        var cursor = anchor
        while doneDates.contains(cursor) {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = previous.startOfDay
        }
        return streak
    }

    var goalColors: [String] { colorPalette }

    func addCustomColor(_ hex: String) {
        guard !hex.isEmpty, !colorPalette.contains(hex) else { return }
        colorPalette.append(hex)
    }

    func deleteCustomColor(_ hex: String) {
        guard colorPalette.count > 1 else { return }
        colorPalette.removeAll { $0 == hex }
        let fallback = colorPalette.first ?? defaultPalette[0]
        for index in goals.indices where goals[index].colorHex == hex {
            goals[index].colorHex = fallback
        }
    }

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

    func updateGoal(_ goal: Goal, title: String, category: String, deadline: Date, colorHex: String) {
        guard let index = goals.firstIndex(where: { $0.id == goal.id }) else { return }
        let cleanTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanTitle.isEmpty else { return }
        goals[index].title = cleanTitle
        goals[index].category = category
        goals[index].deadline = deadline.startOfDay
        goals[index].colorHex = colorHex
    }

    func deleteGoal(_ goal: Goal) {
        goals.removeAll { $0.id == goal.id }
        tasks.removeAll { $0.goalID == goal.id }
        scheduled.removeAll { $0.goalID == goal.id }
        backcastItems.removeAll { $0.goalID == goal.id }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func addCategory(_ name: String) {
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty, !categories.contains(clean) else { return }
        categories.append(clean)
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

    func replaceBackcastPlan(goalID: UUID, steps: [BackcastStep]) {
        let cleanSteps = steps
            .map { BackcastStep(title: $0.title.trimmingCharacters(in: .whitespacesAndNewlines), date: $0.date.startOfDay) }
            .filter { !$0.title.isEmpty }

        backcastItems.removeAll { $0.goalID == goalID }
        backcastItems.append(
            contentsOf: cleanSteps.map { step in
                BackcastItem(
                    goalID: goalID,
                    title: step.title,
                    date: step.date
                )
            }
        )
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func addBackcastPlan(goalID: UUID, steps: [BackcastStep]) {
        replaceBackcastPlan(goalID: goalID, steps: steps)
    }

    func backcastPlan(for goalID: UUID) -> [BackcastItem] {
        backcastItems
            .filter { $0.goalID == goalID }
            .sorted { $0.date < $1.date }
    }

    func importLegacyBackcastTasksIfNeeded() {
        var legacyTaskIDs: Set<UUID> = []
        for task in tasks where task.detail.hasPrefix("逆算:") {
            legacyTaskIDs.insert(task.id)
            guard !backcastItems.contains(where: { $0.goalID == task.goalID && $0.title == task.title }) else { continue }
            backcastItems.append(
                BackcastItem(
                    goalID: task.goalID,
                    title: task.title,
                    date: scheduled.first(where: { $0.taskID == task.id })?.date ?? today
                )
            )
        }
        guard !legacyTaskIDs.isEmpty else { return }
        tasks.removeAll { legacyTaskIDs.contains($0.id) }
        scheduled.removeAll { legacyTaskIDs.contains($0.taskID) }
    }

    func addLegacyBackcastTasks(goalID: UUID, steps: [BackcastStep]) {
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

    func scheduled(for goalID: UUID) -> [ScheduledTask] {
        scheduled.filter { $0.goalID == goalID }
    }

    func isTaskUnscheduled(_ task: ActionTask) -> Bool {
        !scheduled.contains { $0.taskID == task.id }
    }

    func unscheduledTasks(for goalID: UUID) -> [ActionTask] {
        tasks.filter { $0.goalID == goalID && isTaskUnscheduled($0) }
    }

    func doneCount(for goalID: UUID) -> Int {
        scheduled(for: goalID).filter(\.isDone).count
    }

    private func save() {
        let snapshot = Snapshot(
            goals: goals,
            tasks: tasks,
            scheduled: scheduled,
            backcastItems: backcastItems,
            categories: categories,
            colorPalette: colorPalette
        )
        guard let data = try? JSONEncoder.cevoa.encode(snapshot) else { return }
        try? data.write(to: storageURL, options: .atomic)
    }

    private func load() {
        let readURL: URL
        if FileManager.default.fileExists(atPath: storageURL.path) {
            readURL = storageURL
        } else if let legacyStorageURL, FileManager.default.fileExists(atPath: legacyStorageURL.path) {
            readURL = legacyStorageURL
        } else {
            return
        }
        guard
            let data = try? Data(contentsOf: readURL),
            let snapshot = try? JSONDecoder.cevoa.decode(Snapshot.self, from: data)
        else { return }
        goals = snapshot.goals
        tasks = snapshot.tasks
        scheduled = snapshot.scheduled
        backcastItems = snapshot.backcastItems ?? []
        categories = snapshot.categories ?? defaultCategories
        colorPalette = snapshot.colorPalette ?? defaultPalette
        for hex in snapshot.customColors ?? [] where !colorPalette.contains(hex) {
            colorPalette.append(hex)
        }
        importLegacyBackcastTasksIfNeeded()
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
    var backcastItems: [BackcastItem]?
    var categories: [String]?
    var customColors: [String]?
    var colorPalette: [String]?
}

private let defaultCategories = ["勉強", "筋トレ", "制作", "資格", "生活", "その他"]

private let defaultPalette = [
    "#0F766E", "#2563EB", "#7C3AED", "#DB2777",
    "#EA580C", "#16A34A", "#0891B2", "#374151"
]

private extension JSONEncoder {
    static var cevoa: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

private extension JSONDecoder {
    static var cevoa: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
