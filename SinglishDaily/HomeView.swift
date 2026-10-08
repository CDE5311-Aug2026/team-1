import SwiftUI

struct HomeView: View {
    @Environment(LearningStore.self) private var store
    @State private var lesson: Int?
    @State private var detail: Phrase?
    @State private var showNearby = false
    @State private var showNotifications = false
    @State private var showStreak = false
    @State private var completed = false
    var captureMoment: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    greeting.padding(.bottom, 10)
                    if let index = lesson { lessonView(index: index) }
                    else { overview }
                }.padding(.horizontal, 20).padding(.top, 4).padding(.bottom, 24)
                    .frame(maxWidth: 560).frame(maxWidth: .infinity)
            }.scrollIndicators(.hidden)
                .background(lesson == nil ? Theme.canvas : Color(.systemBackground))
                .toolbar(.hidden, for: .navigationBar)
                .sheet(item: $detail) { PhraseDetailView(phrase: $0) }
                .sheet(isPresented: $showNearby) { NearbyView() }
                .alert("Your daily reminder", isPresented: $showNotifications) {
                    Button("Start learning") { lesson = 0 }
                    Button("Close", role: .cancel) { }
                } message: { Text("Today's three expressions are ready. Take a minute to learn something local.") }
                .alert("5-day streak", isPresented: $showStreak) { Button("Keep going", role: .cancel) { } }
                message: { Text("A little every day goes a long way. The five-day streak is sample data from the design.") }
                .sheet(isPresented: $completed) {
                    NavigationStack {
                        VStack(spacing: 20) {
                            DesignIcon(name: "Sunrise", size: 60)
                            Text("Can! You did it.").font(Theme.font(28, weight: .bold, relativeTo: .title))
                            Text("You've learned today's three expressions. Try one in your next conversation.").multilineTextAlignment(.center).foregroundStyle(Theme.muted)
                            Button("Capture a moment") { completed = false; captureMoment() }.buttonStyle(PrimaryButtonStyle())
                        }.padding(28).toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close", systemImage: "xmark") { completed = false } } }
                    }.presentationDetents([.medium])
                }
        }
    }
    private var greeting: some View {
        HStack(spacing: 0) {
            Image("Logo").resizable().scaledToFit().frame(width: 44, height: 44).accessibilityLabel("Singlish Daily")
            Text("Good Morning, SY").font(Theme.font(17, weight: .bold, relativeTo: .headline)).lineLimit(1).minimumScaleFactor(0.8)
            DesignIcon(name: "Wave", size: 17).padding(.leading, 2)
            Spacer(minLength: 8)
            Button { showStreak = true } label: {
                HStack(spacing: 4) { DesignIcon(name: "Fire", size: 18); Text("5").font(Theme.font(14, weight: .bold, relativeTo: .footnote)) }
                    .padding(.horizontal, 8).padding(.vertical, 7).foregroundStyle(Theme.accent).background(Theme.tile, in: Capsule()).overlay(Capsule().strokeBorder(Theme.track))
            }.buttonStyle(.plain).accessibilityLabel("View 5 day streak")
            Button { showNotifications = true } label: { DesignIcon(name: "Bell", size: 32) }.padding(.leading, 8).buttonStyle(.plain).accessibilityLabel("Notifications")
        }.frame(minHeight: 50)
    }
    private var title: some View {
        Text("Today's three expressions,\nCan or cannot learn?")
            .font(Theme.font(26, weight: .bold, relativeTo: .title2)).tracking(-0.39)
            .fixedSize(horizontal: false, vertical: true).frame(maxWidth: .infinity, alignment: .leading)
    }
    private var overview: some View {
        VStack(spacing: 10) {
            VStack(spacing: 10) { title.padding(.horizontal, 10).padding(.top, 12); ProgressCard(showStart: true) { lesson = 0 } }
                .background(Theme.peach, in: RoundedRectangle(cornerRadius: 16))
            Button { showNearby = true } label: {
                HStack(spacing: 12) {
                    Text("📍").font(.footnote).frame(width: 32, height: 32).background(Theme.tile, in: RoundedRectangle(cornerRadius: 10))
                        .overlay(alignment: .topTrailing) { DesignIcon(name: "LiveDot", size: 9) }
                    VStack(alignment: .leading, spacing: 3) {
                        (Text("Near you ").foregroundColor(Theme.accent) + Text("· Old Airport Rd Food Centre"))
                            .font(Theme.font(13, weight: .semibold, relativeTo: .footnote)).lineLimit(1).minimumScaleFactor(0.8)
                        Text("3 phrases you might hear here").font(Theme.font(11.5, relativeTo: .caption2)).foregroundStyle(Theme.muted)
                    }
                    Spacer(minLength: 0)
                    DesignIcon(name: "Chevron", size: 16)
                }.padding(.horizontal, 12).padding(.vertical, 9).background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Theme.line))
            }.buttonStyle(.plain).accessibilityIdentifier("nearby")
            ForEach(Array(Phrase.today.enumerated()), id: \.element.id) { index, phrase in
                PhraseCard(phrase: phrase, index: index) { detail = phrase }
            }
        }
    }
    private func lessonView(index: Int) -> some View {
        let phrase = Phrase.today[index]
        return VStack(spacing: 15) {
            title
            ProgressCard()
            VStack(spacing: 18) {
                if index == 0 {
                    GeometryReader { geometry in
                        Image("ChopePhoto").resizable().scaledToFill()
                            .frame(width: geometry.size.width, height: 267).clipped()
                    }.frame(height: 267).clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color("CardBorder")))
                        .accessibilityLabel("Singapore Chope Culture: a tissue packet reserving a hawker table")
                } else {
                    VStack(spacing: 20) { DesignIcon(name: phrase.icon, size: 36); Text(phrase.word).font(Theme.font(28, weight: .bold, relativeTo: .title)); Text(phrase.context).foregroundStyle(Theme.muted) }
                        .frame(maxWidth: .infinity).frame(minHeight: 267).background(Theme.tile, in: RoundedRectangle(cornerRadius: 16))
                }
                VStack(alignment: .leading, spacing: 6) {
                    HStack { ContextChip(phrase: phrase); Spacer(); AudioButton(phrase: phrase) }
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(String(format: "%02d", index + 1)).font(Theme.font(11, relativeTo: .caption2)).foregroundStyle(Theme.accent)
                        Text(phrase.word).font(Theme.font(20, weight: .bold, relativeTo: .title3))
                        Text(phrase.pronunciation).font(Theme.font(12, relativeTo: .caption)).foregroundStyle(Theme.muted)
                    }
                    HStack(alignment: .center, spacing: 18) {
                        Text(phrase.meaning).font(Theme.font(13, relativeTo: .footnote)).foregroundStyle(Theme.muted).frame(maxWidth: .infinity, alignment: .leading)
                        Button(index == 2 ? "Finish" : "Next") {
                            store.markLearned(phrase)
                            if index < 2 { lesson = index + 1 } else { lesson = nil; completed = true }
                        }.buttonStyle(PrimaryButtonStyle()).frame(minWidth: 100).accessibilityIdentifier("nextLesson")
                    }
                }.padding(.horizontal, 12)
            }.padding(16).padding(.bottom, 16).cardSurface()
            HStack(spacing: 4) {
                ForEach(Phrase.today.indices, id: \.self) { i in
                    Button { lesson = i } label: { Capsule().fill(i == index ? Theme.accent : Theme.track).frame(width: 48, height: 3).padding(.vertical, 12) }
                        .buttonStyle(.plain).accessibilityLabel("Go to expression \(i + 1)")
                }
            }.padding(.top, 4)
            Button("Back to today's expressions") { lesson = nil }.font(.footnote)
        }
    }
}

struct PhraseCard: View {
    let phrase: Phrase
    let index: Int
    let showDetail: () -> Void
    @Environment(LearningStore.self) private var store
    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(spacing: 26) {
                DesignIcon(name: phrase.icon, size: 36).frame(width: 60, height: 60)
                    .background(index == 0 ? Theme.tile : Color(.systemBackground), in: RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(index == 0 ? Color("CardBorder") : Theme.line))
                Text(String(format: "%02d", index + 1)).font(Theme.font(11, weight: .semibold, relativeTo: .caption2)).foregroundStyle(index == 0 ? Theme.accent : Color(.tertiaryLabel))
            }
            VStack(alignment: .leading, spacing: 6) {
                ContextChip(phrase: phrase)
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(phrase.word).font(Theme.font(20, weight: .bold, relativeTo: .title3)).tracking(-0.2)
                    if !phrase.pronunciation.isEmpty { Text(phrase.pronunciation).font(Theme.font(12, relativeTo: .caption)).foregroundStyle(Color(.tertiaryLabel)) }
                }
                HStack(alignment: .bottom, spacing: 8) {
                    Text(phrase.meaning).font(Theme.font(13, relativeTo: .footnote)).foregroundStyle(Theme.muted).lineSpacing(2).frame(maxWidth: .infinity, alignment: .leading)
                    Button("Detail", action: showDetail).font(Theme.font(13, weight: .semibold, relativeTo: .footnote))
                        .padding(.horizontal, 15).padding(.vertical, 7)
                        .foregroundStyle(index == 0 ? .white : Theme.ink)
                        .background(index == 0 ? Theme.accent : Color(.systemBackground), in: Capsule())
                        .overlay(Capsule().strokeBorder(index == 0 ? Color.clear : Theme.line))
                        .accessibilityIdentifier("detail-\(phrase.id)")
                }
                if store.state.learned.contains(phrase.id) { Text("Learned ✓").font(.caption2).foregroundStyle(.green) }
            }.frame(maxWidth: .infinity, alignment: .leading)
        }.padding(16).frame(minHeight: 143, alignment: .topLeading)
            .overlay(alignment: .topTrailing) { AudioButton(phrase: phrase).padding(.top, 12).padding(.trailing, 16) }
            .cardSurface(highlighted: index == 0)
    }
}

struct PhraseDetailView: View {
    let phrase: Phrase
    @Environment(LearningStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    DesignIcon(name: phrase.icon, size: 36).padding(16).background(Theme.tile, in: RoundedRectangle(cornerRadius: 16))
                    Text(phrase.word).font(Theme.font(30, weight: .bold, relativeTo: .largeTitle))
                    Text(phrase.pronunciation).foregroundStyle(Theme.muted)
                    ContextChip(phrase: phrase)
                    Text(phrase.meaning).font(Theme.font(17, relativeTo: .body))
                    Text(phrase.example).font(Theme.font(17, weight: .medium, relativeTo: .body)).padding(18).frame(maxWidth: .infinity, alignment: .leading).background(Theme.peach, in: RoundedRectangle(cornerRadius: 16))
                    Text(phrase.tip).foregroundStyle(Theme.muted)
                    HStack {
                        Button("Hear it") { store.speak(phrase) }.buttonStyle(.bordered)
                        Button(store.state.saved.contains(phrase.id) ? "Unsave" : "Save expression") { store.toggleSaved(phrase) }.buttonStyle(.bordered).accessibilityIdentifier("saveExpression")
                    }
                    Button(store.state.learned.contains(phrase.id) ? "Learned ✓" : "Mark as learned") { store.markLearned(phrase); dismiss() }.buttonStyle(PrimaryButtonStyle()).accessibilityIdentifier("markLearned")
                }.padding(24)
            }.navigationTitle("Expression detail").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close", systemImage: "xmark") { dismiss() } } }
        }.presentationDragIndicator(.visible)
    }
}
struct NearbyView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Old Airport Rd Food Centre").font(.title2.bold())
                    Text("Three phrases to try over lunch. This location is sample data from the Figma design.").foregroundStyle(.secondary)
                }
                Section("Try these expressions") {
                    ForEach(Phrase.today) { phrase in NavigationLink { PhraseDetailView(phrase: phrase) } label: { HStack { DesignIcon(name: phrase.icon, size: 36); Text(phrase.word) } } }
                }
            }.navigationTitle("Near you").navigationBarTitleDisplayMode(.inline)
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close", systemImage: "xmark") { dismiss() } } }
        }
    }
}
#Preview { HomeView(captureMoment: {}).environment(LearningStore(defaults: UserDefaults(suiteName: "Preview")!)) }
