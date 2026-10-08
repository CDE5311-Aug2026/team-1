import Foundation
import Observation
import AVFoundation

struct Phrase: Identifiable, Hashable {
    let id: String
    let word: String
    let pronunciation: String
    let context: String
    let icon: String
    let contextIcon: String
    let meaning: String
    let example: String
    let tip: String

    static let today: [Phrase] = [
        Phrase(id: "chope", word: "Chope", pronunciation: "/chohp/", context: "Hawker centre · lunch", icon: "Chair", contextIcon: "Bowl", meaning: "Save a seat, often with a tissue packet on the table.", example: "“I chope a table first, you go order.”", tip: "Leave a tissue packet on an empty table to reserve your seat while you order."),
        Phrase(id: "can", word: "Can or not?", pronunciation: "", context: "Team chat · work", icon: "Think", contextIcon: "Work", meaning: "Is it possible or OK? Reply “Can!” or “Cannot lah.”", example: "“Meet at six, can or not?” “Can!”", tip: "Use it as a friendly, informal way to check whether something works for someone."),
        Phrase(id: "paiseh", word: "Paiseh", pronunciation: "/pie-seh/", context: "MRT · crowded train", icon: "Grim", contextIcon: "Metro", meaning: "Sorry or embarrassed — a soft, polite apology.", example: "“Paiseh, can I squeeze past?”", tip: "A warm way to apologise for a small inconvenience or say you feel shy.")
    ]
}

struct Moment: Identifiable, Codable, Equatable {
    let id: UUID
    let text: String
    let date: Date
}

struct LearningState: Codable {
    var learned: Set<String> = []
    var saved: Set<String> = []
    var moments: [Moment] = []
}

enum AppTab: String, CaseIterable, Identifiable {
    case today = "Today", ask = "Ask", community = "Community", moments = "Moments", mySpace = "My Space"
    var id: String { rawValue }
    var asset: String { self == .mySpace ? "MySpace" : rawValue }
}

@MainActor @Observable final class LearningStore {
    private(set) var state: LearningState
    private let defaults: UserDefaults
    private let key = "singlish.learning.v1"
    private let speaker = AVSpeechSynthesizer()

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        if let data = defaults.data(forKey: key), let stored = try? JSONDecoder().decode(LearningState.self, from: data) {
            state = stored
        } else {
            state = LearningState()
        }
    }
    func markLearned(_ phrase: Phrase) { state.learned.insert(phrase.id); persist() }
    func toggleSaved(_ phrase: Phrase) {
        if state.saved.contains(phrase.id) { state.saved.remove(phrase.id) }
        else { state.saved.insert(phrase.id) }
        persist()
    }
    func addMoment(_ text: String) {
        let cleaned = String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(300))
        guard !cleaned.isEmpty else { return }
        state.moments.insert(Moment(id: UUID(), text: cleaned, date: Date()), at: 0)
        persist()
    }
    func deleteMoments(at offsets: IndexSet) {
        for index in offsets.sorted(by: >) where state.moments.indices.contains(index) { state.moments.remove(at: index) }
        persist()
    }
    func resetProgress() { state.learned = []; persist() }
    func speak(_ phrase: Phrase) {
        speaker.stopSpeaking(at: .immediate)
        let utterance = AVSpeechUtterance(string: phrase.word)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-SG") ?? AVSpeechSynthesisVoice(language: "en-GB")
        utterance.rate = 0.42
        speaker.speak(utterance)
    }
    func answer(to question: String) -> String {
        let input = question.lowercased()
        if let phrase = Phrase.today.first(where: { input.contains($0.word.lowercased()) || input.contains($0.id) }) {
            return "\(phrase.word): \(phrase.meaning)\n\n\(phrase.example)"
        }
        return "Try asking about “chope”, “can or not?” or “paiseh”. This local demo knows today's three expressions."
    }
    private func persist() { if let data = try? JSONEncoder().encode(state) { defaults.set(data, forKey: key) } }
}
