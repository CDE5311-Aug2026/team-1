import XCTest
@testable import SinglishDaily

@MainActor final class LearningStoreTests: XCTestCase {
    private func makeDefaults() -> UserDefaults {
        let name = "SinglishDailyTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: name)!
        defaults.removePersistentDomain(forName: name)
        return defaults
    }
    func testProgressAndSavedPhrasesPersistAcrossStoreInstances() {
        let defaults = makeDefaults()
        let store = LearningStore(defaults: defaults)
        store.markLearned(Phrase.today[0]); store.markLearned(Phrase.today[0])
        store.toggleSaved(Phrase.today[1])
        let restored = LearningStore(defaults: defaults)
        XCTAssertEqual(restored.state.learned, ["chope"])
        XCTAssertEqual(restored.state.saved, ["can"])
        restored.resetProgress()
        XCTAssertTrue(restored.state.learned.isEmpty)
        XCTAssertEqual(restored.state.saved, ["can"])
    }
    func testMomentsRejectEmptyTextAndPersistDeletion() {
        let defaults = makeDefaults()
        let store = LearningStore(defaults: defaults)
        store.addMoment(" \n "); XCTAssertTrue(store.state.moments.isEmpty)
        store.addMoment("  I choped a table!  ")
        XCTAssertEqual(LearningStore(defaults: defaults).state.moments.first?.text, "I choped a table!")
        store.deleteMoments(at: IndexSet(integer: 0))
        XCTAssertTrue(LearningStore(defaults: defaults).state.moments.isEmpty)
    }
    func testDemoAnswersRecognizeKnownExpressions() {
        let store = LearningStore(defaults: makeDefaults())
        XCTAssertTrue(store.answer(to: "What does PAISEH mean?").contains("soft, polite apology"))
        XCTAssertTrue(store.answer(to: "unknown phrase").contains("local demo"))
    }
}
