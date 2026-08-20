# Monetization overview

**Current economy:** see [STRIPE_SETUP.md](./STRIPE_SETUP.md) and [MONETIZATION_DEEP_DIVE.md](./MONETIZATION_DEEP_DIVE.md).

| Tier | Storage | Residency Ink | Price |
|------|---------|---------------|-------|
| **Visitor** | Cloud (limited) | 250 signup + 150/mo (pool caps at 400) · all Ink-priced AI incl. 9 Creative Effects | Free |
| **Pro Monthly** | Cloud | 1,777/mo | $7.77/mo |
| **Pro Yearly** | Cloud | 3,444/mo | $53.28/yr |

Permanent Ink packs and Yearly Pro pack discounts are documented in STRIPE_SETUP.

## First Drops

First Drops are paid, buy-once in-app audio releases. There is no free checkout: the minimum fixed or pay-what-you-want amount is **$1.99**.

| Fan price | Platform fee | Artist share before Stripe payout timing |
|-----------|--------------|------------------------------------------|
| $1.99–$2.99 | 25% | 75% |
| $3.00–$4.99 | 15% | 85% |
| $5.00+ | 10% | 90% |

Stripe card processing is paid by the platform under the current destination-charge implementation. Keep the minimum and tiered fee constants in `src/lib/drop-commerce.ts` aligned with checkout validation and user-facing copy.
