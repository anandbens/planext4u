package com.p4u_customer;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.razorpay.RzpCheckout;

/**
 * Customer Capacitor activity.
 *
 * Razorpay's Capacitor plugin (capacitor-razorpay@1.0.4) was published for the
 * legacy Capacitor 3/4 plugin spec. On Capacitor 5+, plugins are auto-discovered
 * via annotations — but this older plugin must be REGISTERED EXPLICITLY before
 * super.onCreate() runs, otherwise Checkout.open() returns immediately with a
 * blank/dismissed result and the modal never shows on Android. This was the
 * root cause of the "blank screen on APK" symptom in production.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Explicit registration — required for Razorpay's pre-Capacitor-5 plugin.
        registerPlugin(RzpCheckout.class);
        super.onCreate(savedInstanceState);
    }
}
