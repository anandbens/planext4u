import { ArrowLeft, Mail, Shield, Trash2, UserX } from "lucide-react";
import { Link } from "react-router-dom";

export default function AccountDeletionPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 pb-3 border-b bg-card sticky top-0 z-10 safe-area-top">
        <Link to="/app/login" className="p-1" aria-label="Back to login">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Account Deletion</h1>
      </div>

      <div className="max-w-2xl mx-auto p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-primary" />
              Planext4U Account Deletion
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              This page explains how P4U-Users of <strong>Planext4U</strong> can request deletion of their account and personal data.
              Planext4U is operated by <strong>PLANEXT4U ALL SOLUTIONS INDIA PRIVATE LIMITED</strong>.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
              <UserX className="h-5 w-5 text-destructive" />
              How to request account deletion
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground leading-relaxed">
              <li>Open the Planext4U app and sign in to your P4U-User account.</li>
              <li>Go to <strong>Account Ownership & Control</strong> in your profile/settings menu.</li>
              <li>Choose <strong>Delete Account</strong> and read the on-screen information.</li>
              <li>Confirm the deletion request. Your account and associated user-generated content will be queued for removal.</li>
            </ol>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              If you are unable to sign in, you can also request deletion by emailing us at{" "}
              <a
                href="mailto:support@planext4u.com"
                className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                support@planext4u.com
              </a>{" "}
              from the email address registered with your account. Please include your registered mobile number and a clear statement that you want your account deleted.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3">
              <Trash2 className="h-5 w-5 text-warning" />
              What is deleted
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-2">
              When your deletion request is processed, the following data is removed:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground leading-relaxed">
              <li>Your profile information (name, email, phone, avatar/profile photo, date of birth, etc.).</li>
              <li>Photos, videos, posts, reels, stories and comments published on Socio.</li>
              <li>Likes, follows, follower lists and other social-graph data.</li>
              <li>Saved addresses, wishlists, cart items and preference settings.</li>
              <li>Other user-generated content that is not legally or contractually required to be retained.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3">Data we may retain</h3>
            <p className="text-muted-foreground leading-relaxed mb-2">
              Some information may be kept for a limited period to meet legal, regulatory, audit, fraud-prevention, payment or settlement obligations:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground leading-relaxed">
              <li>Order, invoice, payment and settlement records.</li>
              <li>Transaction and tax-related data required by applicable laws.</li>
              <li>Fraud-prevention, security and dispute-resolution records.</li>
              <li>Audit logs documenting account changes and deletion requests.</li>
            </ul>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              These records are retained for up to <strong>90 days</strong> before being permanently deleted, unless a longer retention period is required by law or a valid legal process.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-lg font-bold mb-3">Contact us</h3>
            <p className="text-muted-foreground leading-relaxed">
              For questions about account deletion or data practices, contact{" "}
              <a
                href="mailto:support@planext4u.com"
                className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                support@planext4u.com
              </a>
              .
            </p>
          </section>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              For more details on how we handle your data, please read our{" "}
              <Link to="/app/privacy" className="text-primary font-medium hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
