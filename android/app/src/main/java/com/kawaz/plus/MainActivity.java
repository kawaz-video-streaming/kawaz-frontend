package com.kawaz.plus;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean downloadActive = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemBarsPlugin.class);
        registerPlugin(DownloadServicePlugin.class);
        super.onCreate(savedInstanceState);
    }

    public void setDownloadActive(boolean active) {
        downloadActive = active;
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Capacitor pauses WebView JS timers on background; keep them running during active downloads
        if (downloadActive) {
            getBridge().getWebView().resumeTimers();
        }
    }
}
