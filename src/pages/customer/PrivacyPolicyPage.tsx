import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div
        className="flex items-center gap-3 px-4 pb-3 border-b bg-card sticky top-0 z-10 safe-area-top"
      >
        <Link to="/app/login" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">Privacy Policy</h1>
      </div>
      <div className="max-w-2xl mx-auto p-6 prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-xs">Last updated: April 2026</p>

        <h2>1. Introduction</h2>
        <p>Planext4u ("we", "our", "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share your data when you use our application.</p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li><strong>Account Data:</strong> Name, email address, mobile number, occupation, state, and district.</li>
          <li><strong>Address Data:</strong> Delivery addresses, GPS coordinates, landmarks.</li>
          <li><strong>Transaction Data:</strong> Order details, payment information (processed securely via Razorpay).</li>
          <li><strong>Content:</strong> Posts, comments, photos, and messages shared on social features.</li>
          <li><strong>Property Listings:</strong> Property details, images, and contact information.</li>
          <li><strong>KYC Data:</strong> Identity documents submitted for verification.</li>
        </ul>

        <h3>2.2 Information Collected Automatically</h3>
        <ul>
          <li><strong>Device Information:</strong> Device type, operating system, browser type.</li>
          <li><strong>Location Data:</strong> GPS coordinates when you enable location services.</li>
          <li><strong>Usage Data:</strong> Pages viewed, features used, interaction patterns.</li>
          <li><strong>Log Data:</strong> IP address, timestamps, error logs.</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To create and manage your account.</li>
          <li>To process orders, payments, and deliveries.</li>
          <li>To show relevant products, services, and properties based on your location.</li>
          <li>To enable social features (posts, messaging, follows).</li>
          <li>To send notifications about orders, promotions, and platform updates.</li>
          <li>To process referrals and wallet point transactions.</li>
          <li>To improve our services through analytics.</li>
          <li>To prevent fraud and ensure platform security.</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <ul>
          <li><strong>Vendors:</strong> Your name, delivery address, and order details are shared with vendors to fulfil orders.</li>
          <li><strong>Payment Processors:</strong> Payment data is shared with Razorpay for transaction processing.</li>
          <li><strong>Property Enquiries:</strong> Your contact details may be shared with property owners when you enquire about a listing.</li>
          <li><strong>Legal Requirements:</strong> We may disclose data if required by law or to protect our rights.</li>
          <li>We do <strong>not</strong> sell your personal information to third parties.</li>
        </ul>

        <h2>5. Data Storage & Security</h2>
        <ul>
          <li>Your data is stored on secure cloud servers.</li>
          <li>We use encryption (TLS/SSL) for data in transit.</li>
          <li>Access to personal data is restricted to authorized personnel only.</li>
          <li>We retain your data for as long as your account is active or as required by law.</li>
        </ul>

        <h2>6. Your Rights</h2>
        <ul>
          <li><strong>Access:</strong> You can view your personal data through your profile settings.</li>
          <li><strong>Correction:</strong> You can update your information at any time.</li>
          <li><strong>Deletion:</strong> You can request account deletion by contacting support.</li>
          <li><strong>Data Portability:</strong> You can request a copy of your data.</li>
          <li><strong>Opt-out:</strong> You can opt out of promotional communications.</li>
        </ul>

        <h2>7. Cookies & Tracking</h2>
        <p>We use local storage and session data to maintain your login state and preferences. We do not use third-party tracking cookies for advertising purposes.</p>

        <h2>8. Children's Privacy</h2>
        <p>Our services are not intended for users under 18 years of age. We do not knowingly collect data from minors.</p>

        <h2>9. Third-Party Services</h2>
        <p>Our App may contain links to third-party websites or services. We are not responsible for their privacy practices. We recommend reviewing their privacy policies.</p>

        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy periodically. We will notify you of significant changes through the App or via email.</p>

        <h2>11. Contact Us</h2>
        <p>For privacy-related queries, contact us at:</p>
        <ul>
          <li>Email: <strong>privacy@planext4u.com</strong></li>
          <li>Support: <strong>support@planext4u.com</strong></li>
        </ul>
      </div>
    </div>
  );
}
