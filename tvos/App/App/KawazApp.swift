import SwiftUI
import WebKit

@main
struct KawazApp: App {
    var body: some Scene {
        WindowGroup {
            TVWebView()
        }
    }
}

struct TVWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let tvScript = WKUserScript(
            source: "window.__KAWAZ_PLATFORM__ = 'tv';",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(tvScript)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.load(URLRequest(url: URL(string: "https://kawazplus.com")!))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
