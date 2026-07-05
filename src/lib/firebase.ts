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
const SIGN_IN_WITH_PHONE_TIMEOUT_MS = 15000;
const MAX_OTP_ATTEMPTS = 2;

export function otpLog(step: string, meta: Record<string, unknown> = {}) {
  try {
    // eslint-disable-next-line no-console
    console.log(`[OTP ${new Date().toISOString()}] ${step}`, meta);
  } catch {
    // ignore
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, code = "auth/recaptcha-timeout", message = "Security check timed out. Please try again."): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(Object.assign(new Error(message), { code }));
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

const TRANSIENT_OTP_CODES = new Set([
  "auth/network-request-failed",
  "auth/internal-error",
  "auth/timeout",
  "auth/captcha-check-failed",
  "auth/recaptcha-timeout",
  "auth/otp-signin-timeout",
  "auth/web-storage-unsupported",
]);

function isTransientOtpError(err: any): boolean {
  if (!err) return false;
  const code = err.code || "";
  if (TRANSIENT_OTP_CODES.has(code)) return true;
  const msg = String(err.message || "").toLowerCase();
  return msg.includes("network") || msg.includes("timeout") || msg.includes("captcha");
}

function sleep(ms: number) {
  return new Promise((r) => window.setTimeout(r, ms));
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

export async function sendOTP(phoneNumber: string, opts: { rebuildRecaptcha?: boolean } = {}) {
  const t0 = performance.now();
  otpLog("sendOTP:start", { phone: phoneNumber.slice(0, 3) + "***", rebuild: !!opts.rebuildRecaptcha });

  if (!ensureFirebaseHostname()) {
    throw Object.assign(new Error("Phone OTP is only available on the published app."), {
      code: "auth/unauthorized-hostname",
    });
  }

  const currentPhone = firebaseAuth.currentUser?.phoneNumber?.replace(/\s/g, "");
  if (firebaseAuth.currentUser && currentPhone !== phoneNumber.replace(/\s/g, "")) {
    otpLog("sendOTP:signOutStale", {});
    await signOut(firebaseAuth).catch(() => undefined);
  }

  // Rebuild reCAPTCHA on retries to recover from captcha-check-failed / timeout.
  if (opts.rebuildRecaptcha) {
    otpLog("sendOTP:recaptchaRebuild", {});
    try {
      if ((window as any).recaptchaVerifier) (window as any).recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    (window as any).recaptchaVerifier = null;
    recaptchaReady = null;
    const el = document.getElementById("recaptcha-container");
    if (el) el.remove();
  }

  let appVerifier = (window as any).recaptchaVerifier;
  try {
    if (appVerifier && recaptchaReady) {
      otpLog("sendOTP:recaptchaWaitExisting", {});
      await withTimeout(recaptchaReady, RECAPTCHA_RENDER_TIMEOUT_MS);
    } else {
      otpLog("sendOTP:recaptchaSetup", {});
      appVerifier = setupRecaptcha();
      if (recaptchaReady) await withTimeout(recaptchaReady, RECAPTCHA_RENDER_TIMEOUT_MS);
    }
  } catch (e: any) {
    otpLog("sendOTP:recaptchaError", { code: e?.code, msg: e?.message });
    throw e;
  }

  otpLog("sendOTP:signInWithPhoneNumber", { elapsedMs: Math.round(performance.now() - t0) });
  try {
    const result = await withTimeout(
      signInWithPhoneNumber(firebaseAuth, phoneNumber, appVerifier),
      SIGN_IN_WITH_PHONE_TIMEOUT_MS,
      "auth/otp-signin-timeout",
      "OTP request timed out. Please try again.",
    );
    confirmationResultGlobal = result;
    otpLog("sendOTP:success", { elapsedMs: Math.round(performance.now() - t0) });
    return result;
  } catch (e: any) {
    otpLog("sendOTP:error", { code: e?.code, msg: e?.message, elapsedMs: Math.round(performance.now() - t0) });
    throw e;
  }
}

/**
 * Send OTP with exponential backoff retry when Firebase / reCAPTCHA errors
 * are transient. On each retry, reCAPTCHA is torn down and rebuilt so a
 * stale captcha token never blocks delivery indefinitely.
 */
export async function sendOTPWithRetry(
  phoneNumber: string,
  opts: { maxAttempts?: number; onAttempt?: (attempt: number, err?: any) => void } = {},
) {
  const maxAttempts = opts.maxAttempts ?? MAX_OTP_ATTEMPTS;
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      opts.onAttempt?.(attempt);
      otpLog("sendOTPWithRetry:attempt", { attempt, maxAttempts });
      return await sendOTP(phoneNumber, { rebuildRecaptcha: attempt > 1 });
    } catch (err: any) {
      lastError = err;
      opts.onAttempt?.(attempt, err);
      otpLog("sendOTPWithRetry:attemptFailed", { attempt, code: err?.code, msg: err?.message });
      if (attempt >= maxAttempts) break;
      if (!isTransientOtpError(err)) break;
      const backoff = Math.min(1500 * 2 ** (attempt - 1), 4000);
      otpLog("sendOTPWithRetry:backoff", { attempt, backoff });
      await sleep(backoff);
    }
  }
  throw lastError;
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
