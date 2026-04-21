package com.p4u.p4u_vendor;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.razorpay.RzpCheckout;

public class MainActivity extends BridgeActivity {
    private static final String VENDOR_LAUNCH_URL = "https://www.planext4u.net/vendor/login?portal=vendor";
    private static final int RC_RUNTIME_PERMS = 4321;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Explicit Razorpay plugin registration (capacitor-razorpay@1.0.4 is pre-Capacitor-5 spec).
        registerPlugin(RzpCheckout.class);
        super.onCreate(savedInstanceState);

        // Proactively request runtime mic/camera perms for WebRTC calls.
        String[] perms = new String[]{ Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA };
        boolean missing = false;
        for (String p : perms) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                missing = true; break;
            }
        }
        if (missing) ActivityCompat.requestPermissions(this, perms, RC_RUNTIME_PERMS);

        // Grant getUserMedia requests originating from the WebView (required for
        // navigator.mediaDevices.getUserMedia inside Capacitor on Android).
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    request.grant(request.getResources());
                }
            });
        }

        // Only force the initial vendor URL on the very first launch.
        if (savedInstanceState == null && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(() -> bridge.getWebView().loadUrl(VENDOR_LAUNCH_URL));
        }
    }
}
