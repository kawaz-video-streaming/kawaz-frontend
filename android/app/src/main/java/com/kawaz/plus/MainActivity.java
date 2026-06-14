package com.kawaz.plus;

import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean downloadActive = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemBarsPlugin.class);
        registerPlugin(DownloadServicePlugin.class);
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getBridge().getWebView().setRendererPriorityPolicy(
                WebView.RENDERER_PRIORITY_IMPORTANT, true
            );
        }
    }

    public void setDownloadActive(boolean active) {
        downloadActive = active;
    }

    @Override
    public void onPause() {
        super.onPause();
        // Capacitor pauses WebView JS timers on background; keep them running during active downloads
        if (downloadActive) {
            getBridge().getWebView().resumeTimers();
        }
    }
}
