import SwiftUI

struct AskView: View {
    @Environment(LearningStore.self) private var store
    @State private var question = ""
    @State private var answer = ""
    @FocusState private var focused: Bool
    var body: some View {
        NavigationStack {
            Form {
                Section { Text("Ask about a Singlish expression and try it with confidence.").foregroundStyle(.secondary) }
                Section("What did you hear?") {
                    TextField("What does paiseh mean?", text: $question, axis: .vertical).lineLimit(3...5).focused($focused).accessibilityIdentifier("questionInput")
                    Button("Ask") { answer = store.answer(to: question); focused = false }.disabled(question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityIdentifier("askSubmit")
                }
                if !answer.isEmpty { Section("A little help, lah") { Text(answer).accessibilityIdentifier("answerText") } }
                Section("Try a question") {
                    ForEach(Phrase.today) { phrase in Button(phrase.word) { question = "What does \(phrase.word) mean?" } }
                }
                Section { Text("Local demo responses for today's three expressions. No AI service is connected.").font(.caption).foregroundStyle(.secondary) }
            }.navigationTitle("Heard something new?")
        }
    }
}
struct CommunityView: View {
    @State private var liked: Set<Int> = []
    private let posts = [
        ("Amanda Lim", "AL", "Tissue packet on the table? That seat is choped!"),
        ("Jia Tan", "JT", "“Can or not?” is my favourite way to make plans."),
        ("SY", "SY", "A little “paiseh” makes a crowded commute friendlier.")
    ]
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    Text("Everyday stories from our demo community.").foregroundStyle(Theme.muted)
                    ForEach(posts.indices, id: \.self) { index in
                        let post = posts[index]
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Text(post.1).font(.caption.bold()).foregroundStyle(Theme.accent).frame(width: 36, height: 36).background(Theme.peach, in: Circle())
                                VStack(alignment: .leading) { Text(post.0).font(.subheadline.bold()); Text("Today · Singapore").font(.caption).foregroundStyle(.secondary) }
                            }
                            Text(post.2)
                            Button {
                                if liked.contains(index) { liked.remove(index) } else { liked.insert(index) }
                            } label: { Label("\(12 + index + (liked.contains(index) ? 1 : 0)) · \(liked.contains(index) ? "Liked" : "Like")", systemImage: liked.contains(index) ? "heart.fill" : "heart") }
                                .font(.footnote).accessibilityIdentifier("like-\(index)")
                        }.padding(18).frame(maxWidth: .infinity, alignment: .leading).cardSurface()
                    }
                }.padding(20).frame(maxWidth: 560).frame(maxWidth: .infinity)
            }.background(Theme.canvas).navigationTitle("Local wisdom")
        }
    }
}
struct MomentsView: View {
    @Environment(LearningStore.self) private var store
    @State private var composing = false
    var body: some View {
        NavigationStack {
            List {
                Section { Text("Used a new phrase today? Keep a little memory.").foregroundStyle(.secondary) }
                if store.state.moments.isEmpty {
                    ContentUnavailableView("Your first moment starts here", image: "Moments", description: Text("Try one of today's expressions, then tell your story."))
                    Button("Capture a moment") { composing = true }
                } else {
                    Section("Your moments") {
                        ForEach(store.state.moments) { moment in
                            VStack(alignment: .leading, spacing: 8) { Text(moment.text); Text(moment.date, style: .date).font(.caption).foregroundStyle(.secondary) }
                        }.onDelete { store.deleteMoments(at: $0) }
                    }
                }
                Section { Text("Moments are saved only on this device.").font(.caption).foregroundStyle(.secondary) }
            }.navigationTitle("Your moments")
                .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("New moment", systemImage: "plus") { composing = true }.accessibilityIdentifier("newMoment") } }
                .sheet(isPresented: $composing) { NewMomentView() }
        }
    }
}
struct NewMomentView: View {
    @Environment(LearningStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    var body: some View {
        NavigationStack {
            Form {
                Section("Today's moment") {
                    TextField("I choped a table at lunch today…", text: $text, axis: .vertical).lineLimit(4...8).accessibilityIdentifier("momentInput")
                        .onChange(of: text) { _, value in if value.count > 300 { text = String(value.prefix(300)) } }
                }
                Section { Text("\(text.count)/300 characters · Saved on this device").font(.caption).foregroundStyle(.secondary) }
            }.navigationTitle("New moment").navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel", systemImage: "xmark") { dismiss() } }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save moment", systemImage: "checkmark") { store.addMoment(text); dismiss() }
                            .buttonStyle(.borderedProminent).disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty).accessibilityIdentifier("saveMoment")
                    }
                }
        }
    }
}
struct MySpaceView: View {
    @Environment(LearningStore.self) private var store
    @State private var resetting = false
    var body: some View {
        NavigationStack {
            List {
                Section { ProgressCard().listRowInsets(EdgeInsets()) }
                Section("Saved expressions") {
                    let saved = Phrase.today.filter { store.state.saved.contains($0.id) }
                    if saved.isEmpty { Text("Save expressions from their detail cards to find them here.").foregroundStyle(.secondary) }
                    ForEach(saved) { phrase in NavigationLink { PhraseDetailView(phrase: phrase) } label: { HStack { DesignIcon(name: phrase.icon, size: 36); Text(phrase.word) } } }
                }
                Section("Your progress") {
                    Text("\(store.state.learned.count) expressions learned · \(store.state.moments.count) moments saved")
                    Button("Reset learning progress", role: .destructive) { resetting = true }
                }
                Section { Text("Your progress, saved expressions, and moments stay on this device. The daily phrase set and five-day streak are demo data.").font(.caption).foregroundStyle(.secondary) }
            }.navigationTitle("My Space")
                .confirmationDialog("Start fresh?", isPresented: $resetting, titleVisibility: .visible) {
                    Button("Reset progress", role: .destructive) { store.resetProgress() }
                } message: { Text("This resets the learned expressions. Your saved expressions and moments will stay.") }
        }
    }
}
