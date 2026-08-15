# 13 — Events, Messaging and Async Processing

## 1. Broker topology

- A durable, partitioned event broker (Kafka or an equivalent with the same guarantees) is the backbone for cross-service integration.
- Topics are named `<domain>.<entity>.<event>.v<major>`, e.g. `orders.order.confirmed.v1`.
- Partition key is the aggregate id (order id, account id, listing id) so per-aggregate ordering is guaranteed.
- Retention: 7 days for operational topics, 30 days for audit and analytics topics, compacted topics for reference data replicas.
- Every topic has a registered schema and an owning service; consumers are registered in a catalogue with their consumer group and lag alert threshold.

## 2. Event envelope

```json
{
  "event_id": "01J...",
  "event_type": "orders.order.confirmed",
  "version": 1,
  "occurred_at": "2026-08-15T10:00:00Z",
  "producer": "orders-svc",
  "aggregate": { "type": "order", "id": "01J..." },
  "correlation_id": "01J...",
  "causation_id": "01J...",
  "actor": { "type": "customer", "id": "01J..." },
  "tenant": { "country": "IN" },
  "data": { }
}
```

Rules: events describe **facts that happened**, never commands. `data` carries the minimum needed by consumers plus stable ids; consumers fetch detail from the owning service or their replica. Schemas evolve additively; a breaking change publishes a new major topic and both run during the migration window.

## 3. Event catalogue (representative)

| Domain | Events |
|---|---|
| Identity | `account.registered`, `account.verified`, `account.deactivated`, `account.deleted`, `wallet.credited`, `wallet.debited`, `wallet.expired` |
| Catalog | `product.approved`, `product.updated`, `product.archived`, `inventory.reserved`, `inventory.committed`, `inventory.released`, `inventory.low` |
| Orders | `order.created`, `order.confirmed`, `order.status_changed`, `order.cancelled`, `order.delivered`, `order.completed`, `order.returned` |
| Payments | `payment.authorized`, `payment.captured`, `payment.failed`, `payment.refunded`, `chargeback.received`, `invoice.generated`, `credit_note.issued` |
| Promotions | `coupon.reserved`, `coupon.committed`, `coupon.released`, `coupon.rolled_back`, `campaign.activated` |
| Vendor | `vendor.application_submitted`, `vendor.approved`, `vendor.suspended`, `settlement.generated`, `payout.initiated`, `payout.settled` |
| Franchise | `franchise.registered`, `franchise.payment_captured`, `franchise.approved`, `franchise.updated` |
| Food | `food_order.placed`, `restaurant.accepted`, `order.ready`, `food_order.delivered` |
| Logistics | `delivery.created`, `assignment.offered`, `assignment.accepted`, `assignment.reassigned`, `delivery.picked_up`, `delivery.completed`, `geofence.entered` |
| Homes | `property.published`, `property.expired`, `enquiry.created`, `visit.scheduled` |
| Socio | `post.published`, `post.edited`, `comment.created`, `follow.created`, `message.sent`, `content.flagged` |
| Classifieds | `ad.published`, `ad.expired`, `ad.sold` |
| Services | `booking.confirmed`, `booking.started`, `booking.completed`, `booking.cancelled` |
| Trust & safety | `report.created`, `moderation.decided`, `fraud.flagged` |
| Platform | `config.changed`, `audit.recorded` |

## 4. Delivery guarantees

- **At-least-once** delivery is the baseline; every consumer must be **idempotent**, keyed on `event_id` in a processed-events table with a retention window.
- **Transactional outbox**: a service writes its state change and the outbound event in one database transaction; a relay publishes from the outbox and marks it sent. Direct publishing inside a request path is not permitted for state-changing events.
- **Inbox pattern** for consumers whose processing has side effects outside the database.
- **Retries**: exponential backoff with jitter, bounded attempts, then the dead-letter topic. Every DLQ topic has an admin replay tool and an alert on non-zero depth.
- **Poison-message isolation**: a repeatedly failing message must never block its partition beyond the retry budget.

## 5. Sagas

Long-running cross-service transactions are orchestrated, with the orchestrator owning the saga state machine and persisting each step.

### 5.1 Checkout saga (`orders-svc`)

| Step | Action | Compensation |
|---|---|---|
| 1 | Validate cart and serviceability | — |
| 2 | Reserve inventory | Release inventory |
| 3 | Reserve coupon | Release coupon |
| 4 | Compute and freeze totals | — |
| 5 | Debit wallet points | Credit points back with original expiry |
| 6 | Authorize/capture payment | Refund payment |
| 7 | Confirm order, commit inventory and coupon | Cancel order, reverse commits |
| 8 | Emit `order.confirmed` | — |

Each step is idempotent and time-bounded; a stalled saga is resumed or compensated by a reaper.

### 5.2 Other sagas
Refund/return (reverse pickup → inspection → refund → points reversal → credit note), vendor payout (aggregate → statement → payout → bank confirmation → reconcile), franchise registration (create → payment → receipt generation → notification), booking cancellation (fee computation → refund → slot release → notify).

## 6. Redis usage

| Purpose | Pattern |
|---|---|
| Cache | `cache:{service}:{entity}:{id}:{version}`; TTLs: reference data 24 h, catalogue 5–15 min, personalised 60 s, resolved app layouts 10 min with event invalidation |
| Locks | `lock:{resource}` via a distributed lock with fencing tokens for stock, slot capacity, coupon counters and dispatch assignment |
| Rate limiting | Sliding-window counters per token, IP, phone number and endpoint class |
| Queues | Laravel queue backend for non-critical async work |
| Sessions and presence | Realtime gateway presence and connection registry |
| Idempotency | Stored request/response pairs keyed by `Idempotency-Key`, TTL 24 h |

Cache invalidation is event-driven; time-based expiry alone is not sufficient for prices, stock or published layouts. Caches are never the source of truth for money.

## 7. Queue jobs (Laravel)

Named queues with distinct workers and priorities: `critical` (payments, order transitions), `default`, `media`, `notifications`, `search-index`, `reports`, `low`.

Job standards: small serialisable payloads carrying ids not objects; explicit `tries`, `backoff`, `timeout` and `uniqueId`; idempotent execution; structured failure logging with the correlation id; and a `failed_jobs` review surface in admin.

## 8. Scheduled commands

| Cadence | Job |
|---|---|
| Every minute | Coupon and slot reservation reaper; dispatch SLA sweep; stalled saga resume |
| Every 5 minutes | Search index delta sync; cache warm for hot layouts; payment status polling for pending intents |
| Every 15 minutes | Abandoned cart nudges; ad pacing recalculation |
| Hourly | Analytics hourly rollups; DLQ depth report; provider health checks |
| Daily | Settlement batch generation; points expiry; listing and ad expiry with reminders; inventory reconciliation; statement and report generation; backup verification; document-expiry alerts |
| Weekly | Full search reindex verification; cohort recomputation; data retention pruning |
| Monthly | Statutory report preparation; archival to cold storage |

Every scheduled command is singleton-locked across instances, records a run history with duration and outcome, and alerts on missed or overrunning runs.

## 9. Read models and replicas

Services that need another service's data for querying maintain a **local replica** built from compacted topics (e.g. `orders-svc` holds a minimal product name/price/vendor projection; reporting holds denormalised order facts). Replicas are eventually consistent, carry a `synced_at`, and are rebuildable from the topic. Displaying a stale replica value where money is decided is not permitted — those reads call the owning service.

## 10. Observability

Every event carries `correlation_id` and `causation_id`, propagated from the originating HTTP request and into logs, traces and downstream events, so a single order can be reconstructed end-to-end across services. Consumer lag, DLQ depth, saga stall count and outbox backlog are first-class alerts.

## 11. Acceptance criteria

1. Replaying any topic from the start leaves consumer state unchanged (idempotency proven).
2. No state change is published without a matching outbox row committed in the same transaction.
3. Every saga has an automated test for each compensation path.
4. A single order id traces across all touched services in the tracing tool.
5. DLQ messages are replayable from admin without a deployment.
