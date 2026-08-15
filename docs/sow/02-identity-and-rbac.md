# 02 — Identity, Authentication and Access Control

Owned by `identity-svc`, enforced at the gateway and re-checked in every service.

## 1. Identity model

One human = one account, across every vertical. The account is the root aggregate; role membership, portal access and vertical-specific profiles hang off it.

```text
account (uuid)
 ├── credentials      (password hash, phone, email, oauth links)
 ├── account_roles    (many: admin | finance | sales | vendor | customer | rider)
 ├── customer_profile (ecommerce/food/homes/classifieds identity)
 ├── social_profile   (Socio username, handle, privacy)
 ├── vendor_link      (→ vendor-svc vendor id, when approved)
 ├── rider_link       (→ logistics-svc rider id, when approved)
 ├── devices          (push tokens, platform, app version)
 └── addresses        (delivery/service addresses with coordinates)
```

### 1.1 Uniqueness rules (hard invariants)

1. `email` is globally unique across all accounts, case-insensitively normalised.
2. `phone` is globally unique across all accounts, stored in E.164.
3. A phone or email registered on the customer side cannot be re-registered on the vendor or rider side as a *different* account — it must attach a role to the existing account.
4. Socio `username` is globally unique, case-insensitive, immutable window of 30 days after change.
5. Soft-deleted accounts must not block re-registration: on soft delete, unique identifiers are tombstoned by suffixing a deletion marker (`+del.<timestamp>` for email, a reserved prefix for phone) so the constraint holds while the value is freed.

## 2. Roles and permissions

### 2.1 Roles

`admin`, `finance`, `sales`, `vendor`, `customer`, `rider`.

Roles are stored in a **dedicated `account_roles` table**, never as a column on the account or profile record. Nothing in the client may assert a role; role is derived server-side from the token subject on every request.

### 2.2 Permission model

Roles are coarse; authorization is by **permission**, and roles are bundles of permissions. This keeps admin sub-roles (finance, sales) precise without code branching on role names.

| Permission group | Example permissions | admin | finance | sales | vendor | rider | customer |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|
| catalog | `product.read`, `product.write`, `product.approve` | ✔ | – | read | own | – | read |
| orders | `order.read.all`, `order.read.own`, `order.status.write` | ✔ | read | read | own | assigned | own |
| payments | `payment.read`, `refund.issue`, `settlement.run`, `payout.approve` | ✔ | ✔ | – | own read | own read | – |
| promotions | `coupon.write`, `campaign.write`, `banner.write` | ✔ | – | ✔ | own coupons | – | – |
| vendor mgmt | `vendor.approve`, `vendor.kyc.review`, `commission.write` | ✔ | – | ✔ | – | – | – |
| logistics | `rider.approve`, `assignment.override`, `zone.write` | ✔ | – | – | – | – | – |
| content | `cms.write`, `appbuilder.publish`, `moderation.act` | ✔ | – | ✔ | – | – | – |
| reports | `report.read`, `report.export`, `report.statutory` | ✔ | ✔ | limited | own | own | – |
| platform | `settings.write`, `integration.write`, `role.grant` | ✔ | – | – | – | – | – |

The matrix above is the seed; permissions are data, editable by `role.grant` holders, with every change audited.

### 2.3 Enforcement layers

Three layers, all required — defence in depth:

1. **Gateway** — rejects a token whose portal does not match the requested path prefix, and whose abilities do not include the route's declared ability.
2. **Service policy** — Laravel policy classes gate every controller action on a permission, not a role name.
3. **Query scoping** — every repository query for a tenant-scoped resource applies the actor scope as a mandatory clause (a global query scope that must be explicitly, loudly bypassed for admin queries). This replaces the row-level database policies of the reference system: the 524 existing rules are restated as scoping predicates plus policy checks, catalogued per table in `03-data-model.md`.

**Rule:** a query that returns tenant data without an actor scope is a defect, regardless of whether a policy also ran.

## 3. Authentication flows

### 3.1 Email + password
1. `POST /api/v1/auth/login` with `{email, password, portal}`.
2. Rate limited per email and per IP; failures are counted and produce a uniform error (never reveal whether the account exists).
3. Argon2id password hashing. Legacy hashes rehash transparently on successful login.
4. On success, issue a Sanctum personal access token scoped to the portal, with abilities derived from the account's permissions, plus a refresh token.
5. Write a login log row: account, portal, ip, user agent, device, result.

**Target: authenticated home screen within 3 seconds of submit.** This is met by a single bootstrap endpoint (`GET /api/v1/auth/bootstrap`) that returns account, roles, active profiles, wallet balance, unread counts, country/locale config and feature flags in **one** aggregated response, rather than the client issuing a sequence of dependent calls.

### 3.2 Phone + OTP
1. `POST /auth/otp/request` with `{phone, portal}` → SMS provider driver sends a 6-digit code, hashed at rest, TTL 5 minutes, max 5 verification attempts, per-phone and per-IP throttling with progressive backoff.
2. `POST /auth/otp/verify` with `{phone, code, portal}` → on success, same token issuance as 3.1, plus bootstrap.
3. No CAPTCHA is required on the OTP path: abuse is controlled server-side by rate limits, device fingerprinting and the fraud rules engine (`Trust & Safety`), not by an interactive challenge. A challenge is only escalated when the fraud engine scores the attempt as high risk.
4. If the phone is unknown, the response indicates registration is required; it must not silently create an account. **Anonymous sign-up is not permitted anywhere in the platform.**

### 3.3 Google OAuth
1. Client obtains an authorization code with a redirect URI that is a full, same-origin public URL (site root or `/auth/callback`). It must never point at a protected route; the intended destination is stored separately and applied after the session is established.
2. `POST /auth/oauth/google` exchanges the code server-side, verifies the ID token signature, issuer and audience, and matches on verified email.
3. If the email matches an existing account, the Google identity is **linked** to it, subject to the uniqueness rules. If not, registration is required — OAuth alone does not create an account without the mandatory profile fields.

### 3.4 Password setup and reset
- Accounts created administratively (vendors created by an operator, imported riders) start with `password_set = false` and are forced through an inline password-setup flow at first login before any other screen renders.
- Reset uses a single-use, 30-minute, hashed token delivered by email or SMS. Using it invalidates all existing sessions for that account.

### 3.5 Token lifecycle
| Property | Value |
|---|---|
| Access token | Sanctum PAT, 24 h TTL, portal-scoped, ability-scoped |
| Refresh token | 30 days, rotating, single-use, family-invalidated on reuse detection |
| Storage (web) | Per-portal key so a customer session cannot satisfy an admin request |
| Storage (native) | Platform secure storage (Keychain / Keystore) |
| Revocation | On password change, reset, role change, account deactivation, or device removal |
| Logout | Revokes the presented token; "logout everywhere" revokes the token family |

## 4. Portal isolation

Each portal has its own token realm. Requirements:
- The token records the portal it was minted for; the gateway rejects cross-portal use with `403`, never a redirect.
- Web clients store tokens under portal-specific keys so multiple portals can be open in one browser without collision.
- Path-prefix routing (`/app`, `/vendor`, `/rider`, `/admin`) is respected by the SPA shell: a deep link into a portal the visitor is not authenticated for lands on that portal's login, preserving the intended destination — it must never redirect to a different portal's home.
- **Public routes are exempt from portal redirection.** `/register/*`, `/franchise/*`, `/app/cms/:slug` and share pages must render for anonymous visitors without any portal bounce. This is a known regression class and requires an explicit allowlist test.
- Native apps may be built from one codebase but each ships pinned to a single portal; a portal override must not be reachable from the customer build.

## 5. Multi-factor and step-up authentication

Step-up (re-authentication or OTP) is mandatory before: changing password, changing phone or email, adding or changing bank account details, approving a payout or settlement run, granting a role, and deleting an account. Step-up produces a short-lived elevated claim (10 minutes) checked by the relevant policies.

## 6. Account lifecycle

| State | Meaning | Effects |
|---|---|---|
| `pending_verification` | Registered, contact not yet verified | Login allowed, transactions blocked |
| `active` | Normal | Full access per roles |
| `deactivated` | Self-service pause | Login blocked with a reactivation path; data retained |
| `suspended` | Operator action | Login blocked; reason recorded and audited |
| `deletion_requested` | User requested erasure | Grace window, then soft delete |
| `deleted` | Soft deleted | Identifiers tombstoned, PII redacted, financial records retained per statutory retention |

Self-service deactivation and deletion are required in the customer and vendor portals. Every transition writes an audit record with actor, reason and timestamp.

## 7. Vendor and rider identity

- A vendor application is submitted publicly or created by an operator. Approval attaches the `vendor` role to the account and creates the vendor record in `vendor-svc`. Operator-created vendors bypass the "submitted" review state but must still complete KYC before transacting.
- A rider registers, uploads KYC, and is approved by an operator; approval attaches the `rider` role and creates the rider record in `logistics-svc`.
- Attaching a supply-side role never removes the `customer` role: the same person can shop and sell.

## 8. Device registry and push identity

Devices register once per session, not on every app open or route change. The registration is throttled client-side with a session marker and server-side by an upsert keyed on `(account_id, device_id)`. Stored: platform, app version, push token, locale, last seen. Push tokens are rotated on receipt of a provider invalidation and pruned after 90 days of inactivity.

## 9. Abuse, fraud and rate limiting

The Trust & Safety context evaluates rules against authentication and transaction events: device fingerprint reuse, velocity of OTP requests, geographic impossibility, blacklisted identifiers, and coupon-abuse signals. Outcomes are `allow`, `challenge`, `throttle` or `block`, each recorded as an evaluation with the matched rule for later review. Rules are data-driven and editable by admins with `settings.write`.

Baseline limits (configurable):

| Action | Limit |
|---|---|
| OTP request | 3 per phone per 10 min, 10 per IP per hour |
| OTP verify | 5 attempts per code, then invalidate |
| Password login | 5 per account per 15 min, then progressive lockout |
| Password reset request | 3 per account per hour |
| Registration | 5 per IP per hour |
| Authenticated API (general) | 600 req/min per token |
| Write endpoints | 60 req/min per token |

## 10. Test requirements

The following must be covered by automated tests and re-run on every release:
1. A customer token is rejected on `/admin/*` and `/vendor/*`.
2. A vendor cannot read another vendor's orders, products, settlements or bank details through any endpoint or filter parameter.
3. A rider can read only assignments allocated to them.
4. A soft-deleted account's email and phone can be re-registered.
5. Public registration and CMS routes render anonymously without redirect, on every portal host.
6. Role change immediately invalidates existing tokens.
7. Every list endpoint returns an actor-scoped result set when called with each role.
