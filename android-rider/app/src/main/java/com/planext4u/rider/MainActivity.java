package com.planext4u.rider;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.razorpay.RzpCheckout;

public class MainActivity extends BridgeActivity {
    private static final String RIDER_LAUNCH_URL = "https://www.planext4u.net/rider/login?portal=rider";
    private static final int RC_RUNTIME_PERMS = 4321;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Explicit Razorpay plugin registration — see vendor MainActivity comment.
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

        // Grant WebView getUserMedia requests (required for WebRTC on Android).
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    request.grant(request.getResources());
                }
            });
        }

        // Force rider portal on first launch only — see vendor MainActivity for rationale.
        if (savedInstanceState == null && bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().post(() -> bridge.getWebView().loadUrl(RIDER_LAUNCH_URL));
        }
    }
}
