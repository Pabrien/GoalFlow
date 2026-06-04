import SwiftUI

@main
struct CevoaApp: App {
    @StateObject private var store = GoalFlowStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
