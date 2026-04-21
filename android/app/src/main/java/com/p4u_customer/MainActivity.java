package com.p4u_customer;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.razorpay.RzpCheckout;

/**
 * Customer Capacitor activity.
 *
 * 1) Razorpay's Capacitor plugin (capacitor-razorpay@1.0.4) is pre-Capacitor-5
 *    and must be REGISTERED EXPLICITLY before super.onCreate().
 *
 * 2) WebRTC (1-to-1 voice/video calls in Socio DMs) calls navigator.mediaDevices
 *    .getUserMedia() from JS. Capacitor's WebView denies this by default — even
 *    when Android RECORD_AUDIO/CAMERA permissions are granted at OS level — until
 *    we override WebChromeClient.onPermissionRequest() to grant the WebView itself.
 *    Without this override the user sees "Microphone access denied" no matter what.
 */
public class MainActivity extends BridgeActivity {
    private static final int RC_RUNTIME_PERMS = 4321;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Explicit registration — required for Razorpay's pre-Capacitor-5 plugin.
        registerPlugin(RzpCheckout.class);
        super.onCreate(savedInstanceState);

        // Proactively request RECORD_AUDIO / CAMERA so first-time call attempts
        // don't fail silently. Re-prompts only if not yet granted.
        requestRuntimePermissionsIfNeeded();

        // Allow JS getUserMedia to succeed inside the Capacitor WebView.
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(this.bridge));
        }
    }

    private void requestRuntimePermissionsIfNeeded() {
        String[] perms = new String[]{ Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA };
        boolean missing = false;
        for (String p : perms) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
                missing = true; break;
            }
        }
        if (missing) ActivityCompat.requestPermissions(this, perms, RC_RUNTIME_PERMS);
    }

    /** Grants getUserMedia permission requests originating from the WebView. */
    static class BridgeWebChromeClient extends com.getcapacitor.BridgeWebChromeClient {
        BridgeWebChromeClient(com.getcapacitor.Bridge bridge) { super(bridge); }
        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            request.grant(request.getResources());
        }
    }
}
