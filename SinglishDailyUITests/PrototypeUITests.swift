import XCTest

final class PrototypeUITests: XCTestCase {
    private var app: XCUIApplication!
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing", "--reset-state"]
        app.launch()
    }
    func testCompleteLessonsAndPersistProgress() {
        XCTAssertTrue(app.buttons["startLesson"].waitForExistence(timeout: 10))
        capture("Home")
        app.buttons["startLesson"].tap()
        capture("Lesson")
        for _ in 0..<3 {
            let button = app.buttons["nextLesson"]
            if !button.isHittable { app.swipeUp() }
            button.tap()
        }
        XCTAssertTrue(app.staticTexts["Can! You did it."].waitForExistence(timeout: 5))
        app.terminate(); app.launchArguments = ["--ui-testing"]; app.launch()
        XCTAssertTrue(app.staticTexts["3 of 3 learned today"].waitForExistence(timeout: 5))
    }
    func testSaveExpressionAndAsk() {
        app.buttons["detail-chope"].tap()
        let save = app.buttons["saveExpression"]
        XCTAssertTrue(save.waitForExistence(timeout: 5))
        if !save.isHittable { app.swipeUp() }
        save.tap()
        app.buttons["markLearned"].tap()
        app.tabBars.buttons["My Space"].tap()
        XCTAssertTrue(app.staticTexts["Chope"].waitForExistence(timeout: 5))
        app.tabBars.buttons["Ask"].tap()
        let input = app.textFields["questionInput"].exists ? app.textFields["questionInput"] : app.textViews["questionInput"]
        input.tap(); input.typeText("What does paiseh mean?")
        app.buttons["askSubmit"].tap()
        XCTAssertTrue(app.staticTexts["answerText"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["answerText"].label.contains("soft, polite apology"))
    }
    func testCreateMoment() {
        app.tabBars.buttons["Moments"].tap()
        app.buttons["newMoment"].tap()
        let input = app.textFields["momentInput"].exists ? app.textFields["momentInput"] : app.textViews["momentInput"]
        XCTAssertTrue(input.waitForExistence(timeout: 5))
        input.tap(); input.typeText("I choped a table today!")
        app.buttons["saveMoment"].tap()
        XCTAssertTrue(app.staticTexts["I choped a table today!"].waitForExistence(timeout: 5))
    }
    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name; attachment.lifetime = .keepAlways
        add(attachment)
    }
}
