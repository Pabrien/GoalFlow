import Foundation
import SwiftUI
import UIKit

struct Goal: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var title: String
    var category: String
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

struct BackcastItem: Identifiable, Codable, Equatable {
    var id: UUID = UUID()
    var goalID: UUID
    var title: String
    var date: Date
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

    var hexString: String {
        let uiColor = UIColor(self)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        return String(
            format: "#%02X%02X%02X",
            Int(red * 255),
            Int(green * 255),
            Int(blue * 255)
        )
    }
}

extension Date {
    var startOfDay: Date {
        Calendar.current.startOfDay(for: self)
    }

    func addingDays(_ days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: self) ?? self
    }

    var dayNumberText: String {
        "\(Calendar.current.component(.day, from: self))"
    }

    var dayText: String {
        "\(dayNumberText)日"
    }

    var shortMonthDayText: String {
        let calendar = Calendar.current
        return "\(calendar.component(.month, from: self))月\(calendar.component(.day, from: self))日"
    }

    var yearMonthText: String {
        let calendar = Calendar.current
        return "\(calendar.component(.year, from: self))年\(calendar.component(.month, from: self))月"
    }

    var japaneseWeekdayText: String {
        let symbols = ["日", "月", "火", "水", "木", "金", "土"]
        return symbols[Calendar.current.component(.weekday, from: self) - 1]
    }
}
