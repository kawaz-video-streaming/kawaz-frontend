package com.kawaz.plus;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DownloadService")
public class DownloadServicePlugin extends Plugin {

    @PluginMethod
    public void setActive(PluginCall call) {
        boolean active = Boolean.TRUE.equals(call.getBoolean("active", false));
        if (getActivity() instanceof MainActivity) {
            ((MainActivity) getActivity()).setDownloadActive(active);
        }
        call.resolve();
    }
}
