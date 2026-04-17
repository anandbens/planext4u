package com.p4u.p4u_vendor;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String VENDOR_LAUNCH_URL = "https://www.planext4u.net/vendor/login?portal=vendor";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Only force the initial vendor URL on the very first launch of this Activity
        // instance (i.e. when there is no saved state). Doing this in onStart() would
        // re-fire every time the activity returns from background (e.g. after the
        // SMS auto-fill / OTP popup steals focus), kicking the user back to the
        // login screen even after a successful OTP login.
        if (savedInstanceState == null && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(() -> bridge.getWebView().loadUrl(VENDOR_LAUNCH_URL));
        }
    }
}
