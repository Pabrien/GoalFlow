import Foundation
import SwiftUI

struct Goal: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var title: String
    var category: String
    var reason: String
    var startDate: Date
    var deadline: Date
    var colorHex: String
}

struct ActionTask: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var goalID: UUID
    var title: String
    var detail: String
    var estimatedMinutes: Int
}

struct ScheduledTask: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var taskID: UUID
    var goalID: UUID
    var title: String
    var date: Date
    var isDone: Bool = false
}

extension Color {
    init(hex: String) {
        let clean = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: clean).scanHexInt64(&value)
        let red = Double((value >> 16) & 0xff) / 255
        let green = Double((value >> 8) & 0xff) / 255
        let blue = Double(value & 0xff) / 255
        self.init(red: red, green: green, blue: blue)
    }
}

extension Date {
    var startOfDay: Date {
        Calendar.current.startOfDay(for: self)
    }

    func addingDays(_ days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: self) ?? self
    }
}
