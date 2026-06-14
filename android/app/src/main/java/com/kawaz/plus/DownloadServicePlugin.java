package com.kawaz.plus;

import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DownloadService")
public class DownloadServicePlugin extends Plugin {
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        DownloadForegroundService.callback = new DownloadForegroundService.DownloadCallback() {
            @Override
            public void onProgress(String mediaId, int progress) {
                mainHandler.post(() -> {
                    try {
                        JSObject data = new JSObject();
                        data.put("mediaId", mediaId);
                        data.put("progress", progress);
                        notifyListeners("downloadProgress", data);
                    } catch (Exception ignored) {}
                });
            }

            @Override
            public void onComplete(String mediaId, String offlineUri) {
                mainHandler.post(() -> {
                    try {
                        JSObject data = new JSObject();
                        data.put("mediaId", mediaId);
                        data.put("offlineUri", offlineUri);
                        notifyListeners("downloadComplete", data);
                    } catch (Exception ignored) {}
                });
            }

            @Override
            public void onError(String mediaId, String message) {
                mainHandler.post(() -> {
                    try {
                        JSObject data = new JSObject();
                        data.put("mediaId", mediaId);
                        data.put("message", message);
                        notifyListeners("downloadError", data);
                    } catch (Exception ignored) {}
                });
            }
        };
    }

    @PluginMethod
    public void startDownload(PluginCall call) {
        String mediaId = call.getString("mediaId");
        String url = call.getString("url");
        String token = call.getString("token");
        String backendUrl = call.getString("backendUrl", "");
        String thumbnailUrl = call.getString("thumbnailUrl", "");
        boolean special = Boolean.TRUE.equals(call.getBoolean("special", false));
        JSObject metaObj = call.getObject("metadata");
        String metadataJson = metaObj != null ? metaObj.toString() : "{}";

        Intent intent = new Intent(getContext(), DownloadForegroundService.class);
        intent.putExtra(DownloadForegroundService.EXTRA_MEDIA_ID, mediaId);
        intent.putExtra(DownloadForegroundService.EXTRA_URL, url);
        intent.putExtra(DownloadForegroundService.EXTRA_TOKEN, token);
        intent.putExtra(DownloadForegroundService.EXTRA_SPECIAL, special);
        intent.putExtra(DownloadForegroundService.EXTRA_BACKEND_URL, backendUrl);
        intent.putExtra(DownloadForegroundService.EXTRA_THUMBNAIL_URL, thumbnailUrl);
        intent.putExtra(DownloadForegroundService.EXTRA_METADATA, metadataJson);

        getContext().startForegroundService(intent);

        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).setDownloadActive(true);
        }

        call.resolve();
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        String mediaId = call.getString("mediaId");
        if (mediaId == null) { call.reject("mediaId required"); return; }

        Intent intent = new Intent(getContext(), DownloadForegroundService.class);
        intent.setAction(DownloadForegroundService.ACTION_CANCEL);
        intent.putExtra(DownloadForegroundService.EXTRA_MEDIA_ID, mediaId);
        getContext().startService(intent);

        call.resolve();
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        getContext().stopService(new Intent(getContext(), DownloadForegroundService.class));
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).setDownloadActive(false);
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        DownloadForegroundService.callback = null;
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).setDownloadActive(false);
        }
    }
}
