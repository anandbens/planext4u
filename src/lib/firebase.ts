import { initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

const PUBLISHED_APP_URL = "https://www.planext4u.net";
const FIREBASE_FALLBACK_AUTH_DOMAIN = "p4u-console.firebaseapp.com";
const PLANEXT_HOSTNAMES = ["www.planext4u.net", "planext4u.net"];

const currentHostname = typeof window !== "undefined" ? window.location.hostname : "";
const isLocalhost = currentHostname === "localhost" || currentHostname === "127.0.0.1";
const useCustomAuthDomain = PLANEXT_HOSTNAMES.includes(currentHostname);

const firebaseConfig = {
  apiKey: "AIzaSyDfQ-0baPOXaa31xnQXranIIwvHC2zbmiE",
  authDomain: isLocalhost ? FIREBASE_FALLBACK_AUTH_DOMAIN : (useCustomAuthDomain ? currentHostname : FIREBASE_FALLBACK_AUTH_DOMAIN),
  projectId: "p4u-console",
  storageBucket: "p4u-console.appspot.com",
  messagingSenderId: "784503032650",
  appId: "1:784503032650:web:8c3d03418db7d594028fb3",
  measurementId: "G-RX9CW0VKL0",
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

const IS_NATIVE = Capacitor.isNativePlatform();

const WEB_ALLOWED_HOSTNAMES = ["localhost", "127.0.0.1", "planext4u.lovable.app", ...PLANEXT_HOSTNAMES];

function isAllowedHostname(host: string): boolean {
  if (IS_NATIVE) return true;
  return WEB_ALLOWED_HOSTNAMES.includes(host);
}
const PRODUCTION_URL = PUBLISHED_APP_URL;

function getAuthorizedFirebaseUrl(): string {
  return `${PRODUCTION_URL}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function redirectToAuthorizedHost(target: string) {
  if (window.self !== window.top) {
    try {
      window.open(target, "_top");
      return;
    } catch {
      // fall through
    }
  }
  window.location.replace(target);
}

export function ensureFirebaseHostname(): boolean {
  // Native (Capacitor) uses the native Firebase SDK via
  // @capacitor-firebase/authentication — no reCAPTCHA, no hostname check.
  if (IS_NATIVE) return true;

  const host = window.location.hostname;
  if (isAllowedHostname(host)) return true;

  const target = getAuthorizedFirebaseUrl();
  console.warn(`Firebase Phone Auth blocked on host: ${host}. Redirecting to ${PRODUCTION_URL}.`);
  redirectToAuthorizedHost(target);
  return false;
}

// ---------------- Web (reCAPTCHA) path ----------------

let confirmationResultGlobal: ConfirmationResult | null = null;
let recaptchaReady: Promise<void> | null = null;

// ---------------- Native path ----------------
// The native plugin returns a verificationId via the phoneCodeSent event;
// we cache the latest one and use it in confirmVerificationCode.
let nativeVerificationId: string | null = null;
let nativePhoneListenerAttached = false;

async function ensureNativePhoneListener() {
  if (nativePhoneListenerAttached) return;
  nativePhoneListenerAttached = true;
  await FirebaseAuthentication.addListener("phoneVerificationCompleted", async (event: any) => {
    // Android SMS auto-retrieval fast-path: the plugin signs the user in
    // automatically. Store any verificationId in case caller still wants it.
    if (event?.verificationId) nativeVerificationId = event.verificationId;
  });
  await FirebaseAuthentication.addListener("phoneCodeSent", (event: any) => {
    if (event?.verificationId) nativeVerificationId = event.verificationId;
  });
  await FirebaseAuthentication.addListener("phoneVerificationFailed", (event: any) => {
    console.warn("[firebase-native] phoneVerificationFailed", event);
  });
}

function getOrCreateRecaptchaContainer(): HTMLElement {
  const existing = document.getElementById("recaptcha-container");
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = "recaptcha-container";
  document.body.appendChild(el);
  return el;
}

export function setupRecaptcha(): RecaptchaVerifier {
  if (IS_NATIVE) {
    throw new Error("setupRecaptcha is not used on native platforms");
  }
  if (!isAllowedHostname(window.location.hostname)) {
    throw Object.assign(new Error("Phone OTP is only available on the published app."), {
      code: "auth/unauthorized-hostname",
    });
  }

  if ((window as any).recaptchaVerifier) {
    try { (window as any).recaptchaVerifier.clear(); } catch { /* ignore */ }
    (window as any).recaptchaVerifier = null;
    recaptchaReady = null;
  }

  const old = document.getElementById("recaptcha-container");
  if (old) old.remove();
  getOrCreateRecaptchaContainer();

  const verifier = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", { size: "invisible" });
  (window as any).recaptchaVerifier = verifier;
  recaptchaReady = verifier.render().then(() => {}).catch(() => {});
  return verifier;
}

/**
 * Pre-render reCAPTCHA (web only). No-op on native.
 */
export function preRenderRecaptcha() {
  if (IS_NATIVE) return;
  if (!isAllowedHostname(window.location.hostname)) return;
  if ((window as any).recaptchaVerifier) return;
  getOrCreateRecaptchaContainer();
  const verifier = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", { size: "invisible" });
  (window as any).recaptchaVerifier = verifier;
  recaptchaReady = verifier.render().then(() => {}).catch(() => {});
}

export async function sendOTP(phoneNumber: string) {
  if (!ensureFirebaseHostname()) {
    throw Object.assign(new Error("Phone OTP is only available on the published app."), {
      code: "auth/unauthorized-hostname",
    });
  }

  if (IS_NATIVE) {
    // Sign out any lingering native session for a different phone
    try {
      const cur = await FirebaseAuthentication.getCurrentUser();
      if (cur?.user?.phoneNumber && cur.user.phoneNumber.replace(/\s/g, "") !== phoneNumber.replace(/\s/g, "")) {
        await FirebaseAuthentication.signOut().catch(() => undefined);
      }
    } catch { /* ignore */ }

    await ensureNativePhoneListener();
    nativeVerificationId = null;

    // Fires SMS via Play Integrity (Android) or APNs silent push (iOS).
    // No reCAPTCHA. On Android, SMS Retriever auto-fills the OTP when
    // the app signature matches the SMS hash.
    await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber });
    return { verificationId: nativeVerificationId } as any;
  }

  // Web path
  const currentPhone = firebaseAuth.currentUser?.phoneNumber?.replace(/\s/g, "");
  if (firebaseAuth.currentUser && currentPhone !== phoneNumber.replace(/\s/g, "")) {
    await signOut(firebaseAuth).catch(() => undefined);
  }

  let appVerifier = (window as any).recaptchaVerifier;
  if (appVerifier && recaptchaReady) {
    await recaptchaReady;
  } else {
    appVerifier = setupRecaptcha();
    if (recaptchaReady) await recaptchaReady;
  }

  const result = await signInWithPhoneNumber(firebaseAuth, phoneNumber, appVerifier);
  confirmationResultGlobal = result;
  return result;
}

export async function verifyOTP(otp: string) {
  if (IS_NATIVE) {
    // Native plugin may have already signed the user in via auto-retrieval.
    const cur = await FirebaseAuthentication.getCurrentUser().catch(() => null);
    if (cur?.user) return cur.user;

    if (!nativeVerificationId) {
      throw new Error("Please send OTP first");
    }
    await FirebaseAuthentication.confirmVerificationCode({
      verificationId: nativeVerificationId,
      verificationCode: otp,
    });
    const after = await FirebaseAuthentication.getCurrentUser();
    if (!after?.user) throw new Error("Verification failed");
    return after.user;
  }

  if (!confirmationResultGlobal) throw new Error("Please send OTP first");
  const result = await confirmationResultGlobal.confirm(otp);
  return result.user;
}

export async function getFirebaseIdToken(): Promise<string> {
  if (IS_NATIVE) {
    // Native plugin returns the current user's ID token directly — no
    // forced refresh (Firebase just minted one during confirm).
    const res = await FirebaseAuthentication.getIdToken({ forceRefresh: false });
    if (!res?.token) throw new Error("No Firebase user signed in");
    return res.token;
  }
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("No Firebase user signed in");
  return user.getIdToken(false);
}

export async function resetPhoneAuth() {
  confirmationResultGlobal = null;
  recaptchaReady = null;
  nativeVerificationId = null;
  if (IS_NATIVE) {
    await FirebaseAuthentication.signOut().catch(() => undefined);
    return;
  }
  if ((window as any).recaptchaVerifier) {
    try { (window as any).recaptchaVerifier.clear(); } catch { /* ignore */ }
    (window as any).recaptchaVerifier = null;
  }
  const el = document.getElementById("recaptcha-container");
  if (el) el.remove();
  if (firebaseAuth.currentUser) {
    await signOut(firebaseAuth).catch(() => undefined);
  }
}

export function clearRecaptcha() {
  confirmationResultGlobal = null;
  recaptchaReady = null;
  nativeVerificationId = null;
  if (IS_NATIVE) return; // nothing to tear down natively
  if ((window as any).recaptchaVerifier) {
    try { (window as any).recaptchaVerifier.clear(); } catch { /* ignore */ }
    (window as any).recaptchaVerifier = null;
  }
  const el = document.getElementById("recaptcha-container");
  if (el) el.remove();
}
