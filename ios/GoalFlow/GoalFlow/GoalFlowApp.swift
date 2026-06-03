import SwiftUI

@main
struct GoalFlowApp: App {
    @StateObject private var store = GoalFlowStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
