import SwiftUI

@main
struct CevoaApp: App {
    @StateObject private var store = CevoaStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
