package com.planext4u.rider;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String RIDER_LAUNCH_URL = "https://www.planext4u.net/rider/login?portal=rider";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Force rider portal on first launch only — see vendor MainActivity for rationale.
        if (savedInstanceState == null && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(() -> bridge.getWebView().loadUrl(RIDER_LAUNCH_URL));
        }
    }
}
