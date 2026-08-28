# Bar 4 Bar — Funnel Audit, Metric Dictionary & CEO Dashboard Spec

**Status:** Phase 0 deliverable (docs only). No analytics aggregation or `AnalyticsEventV2` writers until this document is accepted.

**Baseline HEAD context:** Elite Rollout plan; Growth Metrics today live under admin aggregation in `src/lib/server/admin-metrics.ts` and export helpers in `src/lib/admin-metrics-export.ts`.

---

## 1. Current funnel audit

| Funnel | Already tracked | Material gaps |
|--------|-----------------|---------------|
| **Activation** | Landing attribution, signup, guest-try steps, LOCK steps, first editor open, first AI action, first generated line, `activatedAt` / `USER_ACTIVATED` (tied to first AI via milestones) | Activation favors AI users; no first meaningful saved bar, completed track, audio attachment, release draft, first publish, or first supporter milestones |
| **Retention** | Session dates, 7-day return, active 7/30 days, streaks, achievements | No D1/D7/D30 cohort heatmap, weekly creation retention, return-action breakdown, resurrection/churn cohorts, or source/plan/release segmentation |
| **Referral / sharing** | Referral codes + Ink rewards, first-touch `?ref`, profile/achievement share-card events, post/profile share dialogs | No link-created/copied/opened funnel, anonymous→account stitching, platform/channel attribution, referral activation/paid conversion, K-factor, or downstream release purchases |
| **Purchasing** | Pricing view, subscription checkout start/completion, active subs, Ink-pack revenue, release checkout/purchase/sale, earnings, Stripe Connect, qualified listening | No unified offer-view funnel, abandonment/failure/cancel events, renewal/churn/refund/dispute reporting, cohort LTV, platform net after processing, or release-view → preview → purchase conversion |
| **Artist intelligence** | Supporters, Inner Circle, mutuals, listening, purchases, repeat buyers, top supporters, top songs, sources, Earnings + Insights | No notes/tags, priority model, “why this person matters,” recommended next action, snooze/follow-up, action history, or unified dense workspace |
| **Data quality** | First-party Firebase events + server-authoritative payment/listen signals | Admin aggregation scans raw users/events, mixed denominators, capped event scans, expensive fan-out reads, some revenue parsed from logs |

### Canonical activation (accepted definition)

**Meaningful activation** = first meaningful saved lyric/bar (manual or AI-assisted), persisted on a track sheet.

- Existing `activatedAt` / first-AI activation remains a **legacy diagnostic** only.
- Future metrics must report both: `activation_meaningful` and `activation_first_ai_legacy`.

---

## 2. Metric dictionary

| Metric ID | Definition | Source (today / planned) | Denominator | Cadence | Data-quality notes |
|-----------|------------|--------------------------|-------------|---------|-------------------|
| `signups` | New user docs created | `users` createdAt | — | Daily agg | Invite-gate may suppress raw marketing conversion |
| `activation_meaningful` | First saved bar with non-empty text | Planned `AnalyticsEventV2` + sheet write path | Signups in cohort | Daily / cohort | Not emitted yet |
| `activation_first_ai_legacy` | First AI action / `activatedAt` | `users.activatedAt`, `USER_ACTIVATED`, `firstAiAt` | Signups | Daily | Overstates AI-only activation |
| `wau_creators` | Users with ≥1 creation action in 7d | Planned agg over sheet/save/AI events | — | Daily | Today approximated via active users |
| `d7_retention` | Signup cohort active on day 7 | Planned cohort rollup | Cohort size | Weekly | Not a true heatmap today |
| `k_factor` | Invites accepted × invitee activation / active users | Planned from referrals + activation | WAU | Weekly | Referral count exists; K-factor not computed |
| `gross_receipts` | Sum of paid checkout amounts | Stripe fulfill + dropEarnings / Ink / subs | — | Daily | Mixed sources; reconcile with Stripe |
| `platform_net` | Platform fee − Stripe processing borne by B4B | Planned from fee cents + billing estimate | Gross | Daily | Processing estimate not in drop split UI historically |
| `artist_payout_liability` | Held + unpaid artist net | `dropPayouts` / held sales | — | Daily | Connect state required for “paid” |
| `release_view` | Public release page view | Planned | — | Daily | Partial via listen sources |
| `release_preview` | Preview spin | `recordDropSpin` preview | Views | Daily | Server deduped |
| `release_purchase` | Paid unlock | `drop_purchase` / library grant | Previews | Daily | Idempotent on session |
| `qualified_listen` | ≥80% with proof | Listen proof + pulse | Eligible streams | Daily | Owners excluded |
| `production_gate_status` | Pass/Warn/Blocked | Planned `production:gate` | — | On demand | Phase 6 |

---

## 3. CEO command deck wireframe

Replace the single long Growth Metrics page with a dense, responsive **CEO command deck**.

### Executive strip (always visible)

Signups · Meaningful activation · WAU creators · D7 retention · Referral K · Gross receipts · Platform net · Artist payout liability · Production-gate status.

### Tabs

1. **Activation** — stages + conversion + Δ vs prior period; filters: source, guest-try/LOCK entry, first action
2. **Retention** — D1/D7/D30 and W1/W4 heatmaps; resurrection/churn
3. **Referral / Sharing** — artifact → channel → open → signup → activation → listen → purchase
4. **Subscriptions** — offer view → checkout start → complete → renew/churn
5. **Ink** — pack views → checkout → revenue
6. **Music Purchases** — view → preview → purchase; GMV; fees; held

### Drawers / panels

- **Cohorts:** signup-week heatmaps; segment by acquisition source, plan, guest-try/LOCK, first action, release usage
- **Revenue:** subs, renewals, Ink, release GMV, platform fees, Stripe processing (B4B), artist net, held, refunds/disputes, cohort LTV
- **Data health:** last aggregation, incomplete history, schema versions, capped queries, Stripe reconciliation, metric definitions

### Privacy

No lyrics, private CRM notes, raw emails, or unnecessary PII in CEO analytics.

### Rollout

| Mode | Behavior |
|------|----------|
| `legacy` | Current Growth Metrics page |
| `v2` | CEO command deck |
| `off` | Hide entry; reject new aggregate mutations; historical docs retained |

---

## 4. AnalyticsEventV2 inventory (fields only — no writers yet)

```ts
type AnalyticsEventV2 = {
  v: 2;
  eventId: string;
  name: string; // e.g. activation.meaningful_bar_saved
  at: string; // ISO
  anonId?: string;
  sessionId?: string;
  userId?: string; // omit when anonymous-only
  source?: string; // landing, scene, share, song, …
  surface?: string; // ui surface id
  entity?: { type: string; id: string };
  campaignCode?: string; // share attribution — never raw peer UIDs
  meta?: Record<string, string | number | boolean | null>; // privacy-safe only
};
```

### Priority event names (planned)

- `activation.meaningful_bar_saved`
- `activation.first_ai_legacy` (diagnostic)
- `retention.session_day`
- `share.artifact_created` / `share.channel_selected` / `share.link_opened`
- `referral.signup` / `referral.rewarded`
- `commerce.offer_viewed` / `commerce.checkout_started` / `commerce.checkout_completed` / `commerce.checkout_canceled` / `commerce.purchase_failed`
- `release.view` / `release.preview` / `release.purchase`
- `listen.qualified`
- `room.rsvp` / `room.attend` / `room.complete` (Release Room)

Storage: append-only raw collection + server-owned `analyticsDaily/*` and `analyticsCohorts/*`. Backfill dry-run by default.

---

## 5. Acceptance gate

Phase 2 (aggregates + CEO V2 UI) starts only after explicit acceptance of this document’s:

1. Canonical activation definition  
2. Metric dictionary rows  
3. CEO wireframe + privacy rules  
4. Event inventory field list  

Correctness P0 (sticky rail, preview repair, House notice, counters, fee UI) may ship without this acceptance.
