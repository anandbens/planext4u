import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBs9GdBSEK8BGjeGypEOjiHF_jkToy-Qlk",
  authDomain: "planext4u-ba50f.firebaseapp.com",
  projectId: "planext4u-ba50f",
  storageBucket: "planext4u-ba50f.firebasestorage.app",
  messagingSenderId: "924127717306",
  appId: "1:924127717306:web:43541de9fce52be5dd1f83",
  measurementId: "G-BVQFEKX1ZL",
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);

let confirmationResultGlobal: ConfirmationResult | null = null;

function ensureRecaptchaContainer(): HTMLElement {
  const existing = document.getElementById("recaptcha-container");
  if (existing) {
    existing.remove();
  }
  const el = document.createElement("div");
  el.id = "recaptcha-container";
  document.body.appendChild(el);
  return el;
}

export function setupRecaptcha(): RecaptchaVerifier {
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch {
      // ignore if already cleared
    }
    (window as any).recaptchaVerifier = null;
  }

  ensureRecaptchaContainer();

  const verifier = new RecaptchaVerifier(firebaseAuth, "recaptcha-container", {
    size: "invisible",
  });
  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

export async function sendOTP(phoneNumber: string) {
  const currentPhone = firebaseAuth.currentUser?.phoneNumber?.replace(/\s/g, "");
  if (firebaseAuth.currentUser && currentPhone !== phoneNumber.replace(/\s/g, "")) {
    await signOut(firebaseAuth).catch(() => undefined);
  }

  const appVerifier = setupRecaptcha();
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
  return user.getIdToken(true);
}

export async function resetPhoneAuth() {
  confirmationResultGlobal = null;
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
