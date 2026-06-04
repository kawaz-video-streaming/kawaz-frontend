import SwiftUI
import WebKit

@main
struct KawazApp: App {
    var body: some Scene {
        WindowGroup {
            WebView()
                .frame(minWidth: 1024, minHeight: 640)
        }
        .defaultSize(width: 1280, height: 800)
    }
}

struct WebView: NSViewRepresentable {
    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.load(URLRequest(url: URL(string: "https://kawazplus.com")!))
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}
}
