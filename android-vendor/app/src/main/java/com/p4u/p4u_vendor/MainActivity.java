package com.p4u.p4u_vendor;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String VENDOR_LAUNCH_URL = "https://www.planext4u.net/vendor/login?portal=vendor";
    private boolean hasForcedInitialUrl = false;

    @Override
    public void onStart() {
        super.onStart();

        if (hasForcedInitialUrl || bridge == null || bridge.getWebView() == null) {
            return;
        }

        hasForcedInitialUrl = true;
        bridge.getWebView().post(() -> bridge.getWebView().loadUrl(VENDOR_LAUNCH_URL));
    }
}
