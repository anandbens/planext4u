import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div
        className="flex items-center gap-3 px-4 pb-3 border-b bg-card sticky top-0 z-10 safe-area-top"
      >
        <Link to="/app/login" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">Terms & Conditions</h1>
      </div>
      <div className="max-w-2xl mx-auto p-6 prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-xs">Last updated: April 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using the Planext4u application ("App"), you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree, do not use the App.</p>

        <h2>2. Description of Service</h2>
        <p>Planext4u is a super-app platform that provides e-commerce, property listings, classifieds, social networking, and service bookings. The platform connects customers with vendors and service providers.</p>

        <h2>3. User Accounts</h2>
        <ul>
          <li>You must provide accurate and complete information during registration.</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>Each mobile number may be associated with only one account.</li>
          <li>You must be at least 18 years old to create an account.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
        </ul>

        <h2>4. Orders & Payments</h2>
        <ul>
          <li>All prices are listed in Indian Rupees (INR) unless otherwise stated.</li>
          <li>Payments are processed through secure payment gateways (Razorpay).</li>
          <li>Once an order is confirmed and payment is processed, cancellation is subject to our cancellation policy.</li>
          <li>Planext4u is not responsible for the quality or delivery of products/services provided by third-party vendors.</li>
        </ul>

        <h2>5. Wallet Points & Referrals</h2>
        <ul>
          <li>Wallet points are earned through registration, referrals, and promotional activities.</li>
          <li>Points can be redeemed during checkout subject to maximum redemption limits per product/service.</li>
          <li>Points have no cash value and cannot be transferred or sold.</li>
          <li>Planext4u reserves the right to modify the points program at any time.</li>
        </ul>

        <h2>6. Property Listings</h2>
        <ul>
          <li>Users may post property listings for sale, rent, or PG accommodation.</li>
          <li>All listings are subject to moderation and approval.</li>
          <li>Planext4u does not guarantee the accuracy of property listings and is not a party to any property transaction.</li>
          <li>Users are responsible for verifying property details independently.</li>
        </ul>

        <h2>7. Classified Ads</h2>
        <ul>
          <li>Users may post classified ads for buying and selling goods.</li>
          <li>Prohibited items include illegal goods, weapons, counterfeit items, and regulated substances.</li>
          <li>Planext4u reserves the right to remove any ad without notice.</li>
        </ul>

        <h2>8. Social Features</h2>
        <ul>
          <li>Users must not post content that is abusive, defamatory, obscene, or violates any law.</li>
          <li>Planext4u may moderate and remove content at its discretion.</li>
          <li>Users retain ownership of their content but grant Planext4u a license to display it on the platform.</li>
        </ul>

        <h2>9. Intellectual Property</h2>
        <p>All content, trademarks, logos, and design elements of the App are the property of Planext4u and its licensors. Unauthorized use is prohibited.</p>

        <h2>10. Limitation of Liability</h2>
        <p>Planext4u is provided "as is" without warranties. We shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services.</p>

        <h2>11. Governing Law</h2>
        <p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Coimbatore, Tamil Nadu.</p>

        <h2>12. Changes to Terms</h2>
        <p>We may update these Terms at any time. Continued use of the App constitutes acceptance of the revised Terms.</p>

        <h2>13. Contact</h2>
        <p>For questions about these Terms, contact us at <strong>support@planext4u.com</strong>.</p>
      </div>
    </div>
  );
}
