import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

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

export function setupRecaptcha(containerId: string) {
  if (!(window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier = new RecaptchaVerifier(
      firebaseAuth,
      containerId,
      { size: "invisible" }
    );
  }
  return (window as any).recaptchaVerifier;
}

export async function sendOTP(phoneNumber: string) {
  const appVerifier = setupRecaptcha("recaptcha-container");
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

/** Get the Firebase ID token from the currently signed-in user */
export async function getFirebaseIdToken(): Promise<string> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("No Firebase user signed in");
  return user.getIdToken(true);
}

export function clearRecaptcha() {
  if ((window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier.clear();
    (window as any).recaptchaVerifier = null;
  }
  confirmationResultGlobal = null;
}
