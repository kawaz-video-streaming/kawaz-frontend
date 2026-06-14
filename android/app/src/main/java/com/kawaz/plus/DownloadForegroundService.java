package com.kawaz.plus;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.app.NotificationCompat;
import androidx.webkit.WebViewAssetLoader;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Queue;
import java.util.Set;

public class DownloadForegroundService extends Service {
    private static final String CHANNEL_ID = "kawaz_download";
    private static final int NOTIFICATION_ID = 1001;
    private static final long STOP_DELAY_MS = 15_000;

    static final String ACTION_CANCEL = "kawaz.CANCEL";
    static final String EXTRA_MEDIA_ID = "mediaId";
    static final String EXTRA_URL = "url";
    static final String EXTRA_TOKEN = "token";
    static final String EXTRA_SPECIAL = "special";
    static final String EXTRA_BACKEND_URL = "backendUrl";
    static final String EXTRA_THUMBNAIL_URL = "thumbnailUrl";
    static final String EXTRA_METADATA = "metadata";

    interface DownloadCallback {
        void onProgress(String mediaId, int progress);
        void onComplete(String mediaId, String offlineUri);
        void onError(String mediaId, String message);
    }

    static DownloadCallback callback;

    private WebView downloadWebView;
    private boolean webViewReady = false;

    // Service-owned queue — survives Activity death
    private final Queue<Bundle> downloadQueue = new LinkedList<>();
    private final Set<String> queuedIds = new HashSet<>();
    private String currentMediaId = null;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable stopRunnable = this::stopSelf;

    private final class JSBridge {
        @JavascriptInterface
        public void onProgress(String mediaId, int progress) {
            updateNotification(progress + "%");
            if (callback != null) {
                mainHandler.post(() -> {
                    try { callback.onProgress(mediaId, progress); } catch (Exception ignored) {}
                });
            }
        }

        @JavascriptInterface
        public void onComplete(String mediaId, String offlineUri) {
            mainHandler.post(() -> {
                downloadQueue.poll();
                queuedIds.remove(mediaId);
                currentMediaId = null;
                updateNotification("Complete");
                if (callback != null) {
                    try { callback.onComplete(mediaId, offlineUri); } catch (Exception ignored) {}
                }
                processNextIfIdle();
            });
        }

        @JavascriptInterface
        public void onError(String mediaId, String message) {
            mainHandler.post(() -> {
                downloadQueue.poll();
                queuedIds.remove(mediaId);
                currentMediaId = null;
                boolean isCancelled = "Aborted".equals(message) || "Cancelled".equals(message);
                if (!isCancelled && callback != null) {
                    try { callback.onError(mediaId, message); } catch (Exception ignored) {}
                }
                processNextIfIdle();
            });
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    private void initWebView() {
        downloadWebView = new WebView(getApplicationContext());
        WebSettings settings = downloadWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        downloadWebView.addJavascriptInterface(new JSBridge(), "Android");

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
            .setDomain("localhost")
            .addPathHandler("/download-worker.html", path -> {
                try {
                    InputStream is = getAssets().open("download-worker.html");
                    return new WebResourceResponse("text/html", "UTF-8", is);
                } catch (IOException e) { return null; }
            })
            .addPathHandler("/", path -> {
                try {
                    InputStream is = getAssets().open("public" + path);
                    return new WebResourceResponse(mimeForPath(path), "UTF-8", is);
                } catch (IOException e) { return null; }
            })
            .build();

        downloadWebView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                webViewReady = true;
                processNextIfIdle();
            }
        });

        downloadWebView.loadUrl("https://localhost/download-worker.html");
    }

    private static String mimeForPath(String path) {
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".wasm")) return "application/wasm";
        return "application/octet-stream";
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = buildNotification("Downloading media", "");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROCESSING);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        // WebView must be created after startForeground — initialising it in a non-foreground
        // service crashes on modern Android (especially Samsung One UI).
        if (downloadWebView == null) {
            initWebView();
        }

        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_CANCEL.equals(action)) {
                String mediaId = intent.getStringExtra(EXTRA_MEDIA_ID);
                if (mediaId != null) handleCancel(mediaId);
            } else if (intent.hasExtra(EXTRA_MEDIA_ID)) {
                String mediaId = intent.getStringExtra(EXTRA_MEDIA_ID);
                if (mediaId != null && !queuedIds.contains(mediaId)) {
                    cancelStop();
                    Bundle bundle = new Bundle();
                    bundle.putString(EXTRA_MEDIA_ID, mediaId);
                    bundle.putString(EXTRA_URL, intent.getStringExtra(EXTRA_URL));
                    bundle.putString(EXTRA_TOKEN, intent.getStringExtra(EXTRA_TOKEN));
                    bundle.putBoolean(EXTRA_SPECIAL, intent.getBooleanExtra(EXTRA_SPECIAL, false));
                    bundle.putString(EXTRA_BACKEND_URL, intent.getStringExtra(EXTRA_BACKEND_URL));
                    bundle.putString(EXTRA_THUMBNAIL_URL, intent.getStringExtra(EXTRA_THUMBNAIL_URL));
                    bundle.putString(EXTRA_METADATA, intent.getStringExtra(EXTRA_METADATA));
                    downloadQueue.add(bundle);
                    queuedIds.add(mediaId);
                    processNextIfIdle();
                }
            }
        }

        return START_NOT_STICKY;
    }

    private void processNextIfIdle() {
        if (currentMediaId != null || downloadQueue.isEmpty() || !webViewReady) return;

        Bundle bundle = downloadQueue.peek();
        if (bundle == null) return;

        String mediaId = bundle.getString(EXTRA_MEDIA_ID);
        String url = bundle.getString(EXTRA_URL);
        String token = bundle.getString(EXTRA_TOKEN);
        boolean special = bundle.getBoolean(EXTRA_SPECIAL, false);
        String backendUrl = bundle.getString(EXTRA_BACKEND_URL, "");
        String thumbnailUrl = bundle.getString(EXTRA_THUMBNAIL_URL);
        String metadata = bundle.getString(EXTRA_METADATA, "{}");

        if (mediaId == null || url == null || token == null) {
            downloadQueue.poll();
            processNextIfIdle();
            return;
        }

        currentMediaId = mediaId;

        // Signal to JS that this item is now active
        if (callback != null) {
            final String id = mediaId;
            try { callback.onProgress(id, 0); } catch (Exception ignored) {}
        }

        String thumbJs = thumbnailUrl != null ? jsStr(thumbnailUrl) : "undefined";
        String js = "window.__m=" + metadata + ";" +
            "window.__m._thumbnailUrl=" + thumbJs + ";" +
            "window.startDownload(" +
            jsStr(mediaId) + "," +
            jsStr(url) + "," +
            jsStr(token) + "," +
            (special ? "true" : "false") + "," +
            jsStr(backendUrl) + "," +
            "window.__m);";

        downloadWebView.post(() -> downloadWebView.evaluateJavascript(js, null));
    }

    private void handleCancel(String mediaId) {
        if (mediaId.equals(currentMediaId)) {
            // Abort active download — JSBridge.onError will fire and call processNextIfIdle
            if (downloadWebView != null) {
                String js = "window.cancelDownload(" + jsStr(mediaId) + ");";
                downloadWebView.post(() -> downloadWebView.evaluateJavascript(js, null));
            }
        } else if (queuedIds.contains(mediaId)) {
            // Remove pending item from queue without starting it
            downloadQueue.removeIf(b -> mediaId.equals(b.getString(EXTRA_MEDIA_ID)));
            queuedIds.remove(mediaId);
            if (downloadQueue.isEmpty() && currentMediaId == null) scheduleStop();
        }
    }

    private static String jsStr(String s) {
        if (s == null) return "null";
        return "'" + s.replace("\\", "\\\\").replace("'", "\\'")
            .replace("\n", "\\n").replace("\r", "\\r") + "'";
    }

    private void scheduleStop() {
        mainHandler.removeCallbacks(stopRunnable);
        mainHandler.postDelayed(stopRunnable, STOP_DELAY_MS);
    }

    private void cancelStop() {
        mainHandler.removeCallbacks(stopRunnable);
    }

    private Notification buildNotification(String title, String text) {
        Intent openApp = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, openApp, PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification("Downloading media", text));
    }

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "Media Downloads", NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Shows progress while downloading media for offline playback");
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacks(stopRunnable);
        if (downloadWebView != null) {
            downloadWebView.destroy();
            downloadWebView = null;
        }
        super.onDestroy();
    }
}
