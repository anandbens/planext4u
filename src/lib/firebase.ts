import { initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from "firebase/auth";

const PUBLISHED_APP_URL = "https://www.planext4u.net";
const FIREBASE_FALLBACK_AUTH_DOMAIN = "p4u-console.firebaseapp.com";
const PLANEXT_HOSTNAMES = ["www.planext4u.net", "planext4u.net"];

const firebaseConfig = {
  apiKey: "AIzaSyDfQ-0baPOXaa31xnQXranIIwvHC2zbmiE",
  authDomain: FIREBASE_FALLBACK_AUTH_DOMAIN,
  projectId: "p4u-console",
  storageBucket: "p4u-console.appspot.com",
  messagingSenderId: "784503032650",
  appId: "1:784503032650:web:8c3d03418db7d594028fb3",
  measurementId: "G-RX9CW0VKL0",
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

const WEB_ALLOWED_HOSTNAMES = ["localhost", "127.0.0.1", "planext4u.lovable.app", ...PLANEXT_HOSTNAMES];

function isAllowedHostname(host: string): boolean {
  if (Capacitor.isNativePlatform()) {
    return true;
  }

  return WEB_ALLOWED_HOSTNAMES.includes(host);
}
const PRODUCTION_URL = PUBLISHED_APP_URL;
const RECAPTCHA_RENDER_TIMEOUT_MS = 4500;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(Object.assign(new Error("Security check timed out. Please try again."), {
        code: "auth/recaptcha-timeout",
      }));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function getAuthorizedFirebaseUrl(): string {
  return `${PRODUCTION_URL}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function redirectToAuthorizedHost(target: string) {
  if (window.self !== window.top) {
    try {
      window.open(target, "_top");
      return;
    } catch {
      // fall through to same-frame navigation
    }
  }

  window.location.replace(target);
}

export function ensureFirebaseHostname(): boolean {
  if (Capacitor.isNativePlatform()) return true;

  const host = window.location.hostname;
  if (isAllowedHostname(host)) return true;

  const target = getAuthorizedFirebaseUrl();
  console.warn(`Firebase Phone Auth blocked on host: ${host}. Redirecting to ${PRODUCTION_URL}.`);
  redirectToAuthorizedHost(target);
  return false;
}

let confirmationResultGlobal: ConfirmationResult | null = null;

function getOrCreateRecaptchaContainer(): HTMLElement {
  const existing = document.getElementById("recaptcha-container");
  if (existing) return existing;
  const el = document.createElement("div");
  el.id = "recaptcha-container";
  document.body.appendChild(el);
  return el;
}

let recaptchaReady: Promise<void> | null = null;

export function setupRecaptcha(): RecaptchaVerifier {
  if (!isAllowedHostname(window.location.hostname)) {
    throw Object.assign(new Error("Phone OTP is only available on the published app."), {
      code: "auth/unauthorized-hostname",
    });
  }

  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch {
      // ignore if already cleared
    }
    (window as any).recaptchaVerifier = null;
    recaptchaReady = null;
  }

  const old = document.getElementById("recaptcha-container");
  if (old) old.remove();
  getOrCreateRecaptchaContainer();

  const verifier = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
    size: "invisible",
  });
  (window as any).recaptchaVerifier = verifier;
  recaptchaReady = verifier.render().then(() => {}).catch(() => {});
  return verifier;
}

export function preRenderRecaptcha() {
  if (Capacitor.isNativePlatform()) return;
  if (!isAllowedHostname(window.location.hostname)) return;
  if ((window as any).recaptchaVerifier) return;
  getOrCreateRecaptchaContainer();
  const verifier = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
    size: "invisible",
  });
  (window as any).recaptchaVerifier = verifier;
  recaptchaReady = verifier.render().then(() => {}).catch(() => {});
}

export async function sendOTP(phoneNumber: string) {
  if (!ensureFirebaseHostname()) {
    throw Object.assign(new Error("Phone OTP is only available on the published app."), {
      code: "auth/unauthorized-hostname",
    });
  }

  const currentPhone = firebaseAuth.currentUser?.phoneNumber?.replace(/\s/g, "");
  if (firebaseAuth.currentUser && currentPhone !== phoneNumber.replace(/\s/g, "")) {
    await signOut(firebaseAuth).catch(() => undefined);
  }

  let appVerifier = (window as any).recaptchaVerifier;
  if (appVerifier && recaptchaReady) {
    await withTimeout(recaptchaReady, RECAPTCHA_RENDER_TIMEOUT_MS);
  } else {
    appVerifier = setupRecaptcha();
    if (recaptchaReady) await withTimeout(recaptchaReady, RECAPTCHA_RENDER_TIMEOUT_MS);
  }

  const result = await signInWithPhoneNumber(firebaseAuth, phoneNumber, appVerifier);
  confirmationResultGlobal = result;
  return result;
}

export async function verifyOTP(otp: string) {
  if (!confirmationResultGlobal) {
    throw new Error("Please send OTP first");
  }
  const result = await confirmationResultGlobal.confirm(otp);
  return result.user;
}

export async function getFirebaseIdToken(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("No Firebase user signed in");
  return user.getIdToken(false);
}

export async function resetPhoneAuth() {
  confirmationResultGlobal = null;
  recaptchaReady = null;
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch {
      // ignore
    }
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
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    (window as any).recaptchaVerifier = null;
  }
  const el = document.getElementById("recaptcha-container");
  if (el) el.remove();
}
