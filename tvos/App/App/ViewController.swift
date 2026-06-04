import UIKit
import WebKit

class ViewController: UIViewController {
    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        // Signal the React app to activate TV navigation and layout
        let tvScript = WKUserScript(
            source: "window.__KAWAZ_PLATFORM__ = 'tv';",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        config.userContentController.addUserScript(tvScript)

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(webView)

        let url = URL(string: "https://kawazplus.com")!
        webView.load(URLRequest(url: url))
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        webView.becomeFirstResponder()
    }
}
