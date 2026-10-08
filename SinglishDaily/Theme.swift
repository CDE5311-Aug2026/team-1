import SwiftUI

enum Theme {
    static let accent = Color("AccentColor")
    static let canvas = Color("Canvas")
    static let peach = Color("Peach")
    static let tile = Color("PeachTile")
    static let ink = Color("Ink")
    static let muted = Color("Muted")
    static let line = Color("Line")
    static let track = Color("ProgressTrack")
    static let chip = Color("Chip")
    static func font(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        let name: String
        switch weight {
        case .bold: name = "Inter-Regular_Bold"
        case .semibold: name = "Inter-Regular_SemiBold"
        case .medium: name = "Inter-Regular_Medium"
        default: name = "Inter-Regular"
        }
        return Font.custom(name, size: size, relativeTo: style)
    }
}
struct DesignIcon: View {
    let name: String
    let size: CGFloat
    var body: some View { Image(name).resizable().scaledToFit().frame(width: size, height: size).accessibilityHidden(true) }
}
struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(Theme.font(13, weight: .semibold, relativeTo: .footnote))
            .padding(.horizontal, 20).padding(.vertical, 8).foregroundStyle(.white)
            .background(Theme.accent.opacity(configuration.isPressed ? 0.75 : 1), in: Capsule())
    }
}
struct CardSurface: ViewModifier {
    var fill: Color = Color(.systemBackground)
    var highlighted = false
    func body(content: Content) -> some View {
        content.background(fill, in: RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).strokeBorder(highlighted ? Theme.accent : Theme.line, lineWidth: highlighted ? 1.5 : 1))
            .shadow(color: .black.opacity(0.04), radius: 5, y: 2)
    }
}
extension View {
    func cardSurface(highlighted: Bool = false) -> some View { modifier(CardSurface(highlighted: highlighted)) }
}
struct ContextChip: View {
    let phrase: Phrase
    var body: some View {
        HStack(spacing: 4) {
            DesignIcon(name: phrase.contextIcon, size: 14)
            Text(phrase.context).font(Theme.font(11, weight: .medium, relativeTo: .caption2)).foregroundStyle(Theme.muted)
        }.padding(.horizontal, 6).padding(.vertical, 4).background(Theme.chip, in: Capsule())
    }
}
struct AudioButton: View {
    let phrase: Phrase
    @Environment(LearningStore.self) private var store
    var body: some View {
        Button { store.speak(phrase) } label: { DesignIcon(name: "Speaker", size: 16).padding(8) }
            .buttonStyle(.plain).background(Theme.chip, in: Circle())
            .accessibilityLabel("Play \(phrase.word)")
    }
}
struct ProgressCard: View {
    var showStart = false
    var start: () -> Void = {}
    @Environment(LearningStore.self) private var store
    var body: some View {
        HStack(spacing: 12) {
            DesignIcon(name: "Sunrise", size: 30).padding(7).background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 9) {
                Text("\(store.state.learned.count) of 3 learned today")
                    .font(Theme.font(showStart ? 14 : 16, weight: .semibold, relativeTo: .subheadline))
                    .lineLimit(1).minimumScaleFactor(0.85)
                    .accessibilityIdentifier("learningProgress")
                HStack(spacing: 4) {
                    ForEach(Phrase.today) { phrase in RoundedRectangle(cornerRadius: 3).fill(store.state.learned.contains(phrase.id) ? Theme.accent : Theme.track).frame(width: 48, height: 10) }
                }.accessibilityHidden(true)
            }.layoutPriority(1)
            Spacer(minLength: 0)
            if showStart { Button(store.state.learned.count == 3 ? "Review" : "Start", action: start).buttonStyle(PrimaryButtonStyle()).accessibilityIdentifier("startLesson") }
        }.padding(12).frame(maxWidth: .infinity, alignment: .leading)
            .background(showStart ? Color.clear : Theme.tile, in: RoundedRectangle(cornerRadius: 16))
    }
}
