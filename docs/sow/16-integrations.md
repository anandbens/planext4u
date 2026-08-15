# 16 — External Integrations

All integrations are implemented as **drivers behind a capability interface**, enabled and configured per country and per environment. Credentials are referenced **by name only** and resolved from the secret store at runtime; no value appears in code, documentation, exports, logs or error messages.

## 1. Payments

### 1.1 Unified driver contract

```text
PaymentDriver
  createIntent(order_ref, amount, currency, customer, methods[], metadata) → intent
  authorize(intent) / capture(intent, amount) → transaction
  charge(...)                          one-shot where the provider has no two-step flow
  refund(transaction, amount, reason) → refund
  verifyWebhook(payload, signature) → event
  fetchStatus(reference) → status        reconciliation and recovery
  createPayout(beneficiary, amount, ref) → payout      (where supported)
  supports() → capabilities              methods, currencies, two-step, payouts, mandates
```

### 1.2 Providers

Razorpay, Stripe, PayPal, Paystack, PhonePe, Paytm, Flutterwave, Midtrans, Cashfree, Mollie, Square and an offline/manual driver (bank transfer, cash on delivery) — twelve-plus adapters implementing the same contract. Each declares its supported methods (cards, UPI, netbanking, wallets, BNPL, bank debit), currencies, countries, two-step support, payout support and webhook event mapping.

### 1.3 Rules

- The client never receives or handles raw card data; hosted checkout or provider SDK tokenisation only. PCI scope stays with the provider.
- **Every payment state change is confirmed by webhook or by an explicit status fetch** — a client-side success callback is never sufficient to mark an order paid.
- Webhooks are signature-verified, replay-protected by provider event id, processed idempotently and asynchronously; raw payloads are retained for reconciliation.
- A reconciliation job compares platform transactions, provider settlement reports and bank credits daily; variances raise operator exceptions.
- Provider routing is configurable per country, method and amount band, with automatic failover to a secondary provider on outage.
- Refunds always reference the original transaction and record reason, actor and bearer.

## 2. Messaging and OTP

- **SMS/OTP driver**: `send(template, to, variables)` plus delivery-receipt handling, with multiple providers and per-country routing, DLT/template registration where mandated, and automatic failover on failure or timeout.
- OTP policy: 6 digits, short TTL, limited attempts, per-number and per-device rate limits, and resend backoff. Verification is server-side only; the code is never returned to the client.
- **Email**: transactional driver with a verified sending domain, DKIM/SPF/DMARC alignment, templated multi-locale content, bounce and complaint handling, and suppression lists.
- **Push**: mobile push driver with per-platform token management, topic and direct sends, collapse keys, silent data pushes and delivery receipts. Device tokens are registered once per session, not on every route change.
- **In-app inbox**: persisted notifications with read state, shared templates.

## 3. WhatsApp and Telegram bots

- **WhatsApp Business API**: pre-approved message templates for order confirmation, packed, out-for-delivery, delivered, cancellation, refund, booking reminders, OTP where permitted, and abandoned-cart nudges. Inbound replies enter a session window enabling free-form support responses routed into the support console. Opt-in is explicit and revocable; opt-outs are honoured immediately.
- **Telegram bot**: operator- and vendor-facing alerts (new order, low stock, SLA breach, payout completed, system alerts) to configured chats or channels, plus simple query commands (order status, daily summary). Vendor and operator chats are linked by a one-time code, never by a raw chat id typed in.
- Both are drivers behind the notification interface, so a channel can be enabled per event type and per recipient preference. Delivery status is recorded per message.

## 4. Maps and geocoding

Google Maps for zone drawing, place autocomplete, geocoding and reverse geocoding, distance matrix and directions, and live tracking display. Behind a `MapsDriver` interface so an alternative provider can be substituted. Keys are restricted by referrer/package and by API; usage is cached and quota-monitored to control cost.

## 5. Identity verification

IDV driver for document capture and verification, face match, and bank-account penny-drop validation, with a manual-review fallback. Verification artefacts are stored as private objects with signed access only, retained per regulation, and never exported in reports.

## 6. ERP and partner sync

Scheduled and event-driven synchronisation of catalogue, inventory, pricing, orders and settlements with an external ERP over a documented adapter: idempotent upserts keyed on an external reference, conflict policy (platform-wins, ERP-wins or field-level), a sync run log with per-record outcomes, and a manual replay tool. Partner-facing outbound webhooks follow `12 §9`.

## 7. Analytics and observability integrations

Product analytics and marketing tags are configuration-driven and consent-gated. Server-side error and performance monitoring is enabled in every environment with release tagging and source maps. No personally identifying data is sent to third-party analytics beyond a pseudonymous identifier.

## 8. Configuration and governance

Each integration exposes: enabled flag, environment, credential names, endpoints, timeouts and retry policy, sandbox toggle, and a health check surfaced on an admin integrations page with last-success timestamps. A failing integration degrades its feature with a specific message and raises an alert; it never takes down an unrelated flow.

## 9. Acceptance criteria

1. Every provider is swappable by configuration with no code change at the call site.
2. No credential value is retrievable from the application, its logs, its exports or its error responses.
3. An order is never marked paid without provider-side confirmation.
4. Daily reconciliation closes with zero unexplained variance.
5. Every outbound customer message respects opt-in state, locale and quiet hours.
