import SwiftUI

@main struct SinglishDailyApp: App {
    @State private var store: LearningStore
    init() {
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            let defaults = UserDefaults(suiteName: "com.wsamme.SinglishDaily.UITests")!
            if ProcessInfo.processInfo.arguments.contains("--reset-state") { defaults.removePersistentDomain(forName: "com.wsamme.SinglishDaily.UITests") }
            _store = State(initialValue: LearningStore(defaults: defaults))
        } else { _store = State(initialValue: LearningStore()) }
    }
    var body: some Scene { WindowGroup { RootView().environment(store).tint(Theme.accent).preferredColorScheme(.light) } }
}
struct RootView: View {
    @State private var selectedTab: AppTab = .today
    var body: some View {
        TabView(selection: $selectedTab) {
            Tab(value: AppTab.today) { HomeView { selectedTab = .moments } } label: { Label { Text("Today") } icon: { Image("Today").renderingMode(.template) } }
            Tab(value: AppTab.ask) { AskView() } label: { Label { Text("Ask") } icon: { Image("Ask").renderingMode(.template) } }
            Tab(value: AppTab.community) { CommunityView() } label: { Label { Text("Community") } icon: { Image("Community").renderingMode(.template) } }
            Tab(value: AppTab.moments) { MomentsView() } label: { Label { Text("Moments") } icon: { Image("Moments").renderingMode(.template) } }
            Tab(value: AppTab.mySpace) { MySpaceView() } label: { Label { Text("My Space") } icon: { Image("MySpace").renderingMode(.template) } }
        }
    }
}
