
# Bar 4 Bar: Monetization Strategy

## The Strategy: "The Toolbox Model"

We provide the workspace for free and charge for the "materials" (AI power) and "connectivity" (Cloud Sync).

### 1. Tiers & Connectivity

| Tier | Price | Features |
| :--- | :--- | :--- |
| **Local Artist** | Free | **Local storage only**, full editor access, 125 starting Ink. |
| **Studio Pro (Monthly)** | $7.77/mo | **Secure Cloud Sync**, 1,100 Monthly Ink Refill, Professional Discounts. |
| **Studio Pro (Yearly)** | $64/yr ($5.33/mo) | **Secure Cloud Sync**, 2,000 Monthly Ink Refill, **Save 40%**. |

### 2. "Ink" Packs (One-time purchases)

Users can refill their Ink at any time. Studio Pro members receive a "Professional Discount" on all packs.

| Item | Ink | Standard Price | **Pro Price** |
| :--- | :--- | :--- | :--- |
| **Starter Pack** | 1,000 | $4.99 | **$2.99** |
| **Artist Bundle** | 3,500 | $14.99 | **$9.99** |
| **Studio Vault** | 10,000 | $39.99 | **$24.99** |

### 3. Sustainability Plan (Owner Protection)
- **Zero Loss on Free Users**: Free tier uses browser `localStorage`. No database read/write costs for the owner.
- **AI Overhead**: We use Gemini 2.5 Flash. 2,000 Ink (400 lines) costs the owner approx **$0.04** in API fees.
- **Profit Margin**: At $7.77/mo, the profit margin per active Pro user remains very high.
- **Cloud Costs**: Firestore operations for Pro users are negligible (<$0.01/mo). The subscription covers this 100x over.
