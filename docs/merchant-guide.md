# Merchant Guide

This guide walks you through the complete merchant workflow on the platform:

1. [Create a plan](#1-create-a-plan)
2. [Share the plan link](#2-share-the-plan-link)
3. [Monitor subscribers](#3-monitor-subscribers)
4. [Charge subscribers](#4-charge-subscribers)
5. [Deactivate a plan](#5-deactivate-a-plan)

By the end you will know how to publish a subscription plan, get subscribers onto it, and collect payments.

---

## Before you start

You need:

- A connected wallet (the wallet you will receive payments into).
- A supported token balance if you intend to charge in that token.
- Access to the merchant dashboard.

> **Tip:** The onboarding checklist in the dashboard is a quick UI reminder of these steps. This document is the full reference.

---

## 1. Create a plan

A plan defines **what** you charge, **how often**, and **in which token**.

```
 Dashboard → Plans → "New plan"
 ┌──────────────────────────────────────────────┐
 │  New plan                                     │
 │                                               │
 │  Name        [ Pro Tier                  ]    │
 │  Token       [ USDC ▾ ]  (token choice)       │
 │  Interval    [ Monthly ▾ ] (billing period)   │
 │  Cap         [ 12 ]  max charges / subscriber │
 │                                               │
 │              [ Cancel ]   [ Create plan ]     │
 └──────────────────────────────────────────────┘
```

### Token choice

Pick the token subscribers will pay in. Choose a token that:

- Your subscribers already hold and trust.
- Has stable value if you want predictable revenue (e.g. a stablecoin).
- Is supported by the platform (shown in the token dropdown).

The token is fixed for the life of the plan. To charge in a different token, create a new plan.

### Interval

The interval is how often a charge may occur. Common choices:

| Interval | Use case |
|----------|----------|
| Weekly   | Short commitments, trials |
| Monthly  | Most SaaS / memberships |
| Yearly   | Annual discounts |

The interval sets the **minimum** time between charges. You cannot charge a subscriber twice within one interval.

### Cap

The cap is the **maximum number of charges** a subscriber can ever incur on this plan. It protects subscribers from open-ended billing.

- `Cap = 12` with a monthly interval ≈ a one-year commitment.
- A higher cap means a longer potential subscription.
- Once a subscriber reaches the cap, no further charges are possible on that plan.

### Confirm

Click **Create plan**. The plan is created in a draft/active state and gets a unique **plan link**.

```
 Plan created ✓
 ┌──────────────────────────────────────────────┐
 │  Pro Tier                                     │
 │  Token: USDC   Interval: Monthly   Cap: 12    │
 │                                               │
 │  Share link:                                  │
 │  https://app.example.com/plan/0xabc…123       │
 │                                               │
 │              [ Copy link ]                    │
 └──────────────────────────────────────────────┘
```

---

## 2. Share the plan link

The plan link is how subscribers find and join your plan. Anyone with the link can open it, review the terms, and subscribe.

```
 You                         Subscriber
  │                              │
  │  copy plan link              │
  ├─────────────────────────────▶│
  │                              │  open link
  │                              │  review token / interval / cap
  │                              │  approve + subscribe
  │◀─────────────────────────────┤
  │        new subscriber!       │
```

Ways to share:

- Paste the link in your website, docs, or pricing page.
- Send it directly to customers over email or chat.
- Post it wherever your audience is.

> **Note:** The link is public. Treat it like a signup URL — anyone who has it can subscribe. You control who can *charge*, not who can *join*.

---

## 3. Monitor subscribers

Once people subscribe, they appear in the plan's subscriber list.

```
 Dashboard → Plans → Pro Tier → Subscribers
 ┌───────────────────────────────────────────────────────────┐
 │  Subscriber        Status     Charges   Next charge        │
 │  0xdef…456         Active     3 / 12    in 6 days          │
 │  0x789…abc         Active     1 / 12    in 21 days         │
 │  0x111…222         At cap     12 / 12   —                  │
 │  0x333…444         Cancelled  2 / 12    —                  │
 └───────────────────────────────────────────────────────────┘
```

For each subscriber you can see:

- **Status** — Active, At cap, or Cancelled.
- **Charges** — how many charges have been made against the cap.
- **Next charge** — the earliest date the next charge is allowed (interval-based).

Use this view to:

- Confirm new signups are landing.
- See who is approaching their cap.
- Spot cancellations.

---

## 4. Charge subscribers

When a subscriber is due, you charge them. A charge:

- Moves the plan's token amount from the subscriber to your wallet.
- Counts against the subscriber's cap.
- Cannot happen more often than the interval allows.

```
 Dashboard → Plans → Pro Tier → Subscribers → [ Charge ]
 ┌──────────────────────────────────────────────┐
 │  Charge 0xdef…456                             │
 │                                               │
 │  Amount     100 USDC                          │
 │  Charges    3 / 12  →  4 / 12                 │
 │  Next charge allowed: now ✓                   │
 │                                               │
 │              [ Cancel ]   [ Charge now ]      │
 └──────────────────────────────────────────────┘
```

### Rules to remember

- **Interval gate:** if the subscriber was charged recently, the charge button is disabled until the interval elapses.
- **Cap gate:** if the subscriber is at their cap, no charge is possible.
- **Cancelled subscribers** cannot be charged.

### Bulk charging

To charge many due subscribers at once, select them in the subscriber list and choose **Charge selected**. The platform charges each eligible subscriber and reports any that were skipped (interval not elapsed, at cap, or cancelled).

```
 Charging 3 subscribers…
 ✓ 0xdef…456   charged (4 / 12)
 ✓ 0x789…abc   charged (2 / 12)
 ✗ 0x111…222   skipped — at cap
```

---

## 5. Deactivate a plan

Deactivating stops new subscribers from joining and prevents further charges on the plan. Existing subscribers are not charged again.

```
 Dashboard → Plans → Pro Tier → [ Deactivate ]
 ┌──────────────────────────────────────────────┐
 │  Deactivate "Pro Tier"?                       │
 │                                               │
 │  • New subscribers cannot join                │
 │  • No further charges will be made            │
 │  • Existing subscriber history is kept        │
 │                                               │
 │              [ Cancel ]   [ Deactivate ]      │
 └──────────────────────────────────────────────┘
```

After deactivation:

- The plan link no longer accepts new subscribers.
- The charge action is disabled for all subscribers on the plan.
- Subscriber and charge history remain visible for your records.

> **Note:** Deactivation is not the same as deleting. To offer the same terms again later, create a new plan and share its new link.

---

## Workflow at a glance

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │ Create plan  │──▶│ Share link   │──▶│ Subscribers  │
 │ token/       │   │ (public URL) │   │ join         │
 │ interval/cap │   └──────────────┘   └──────┬───────┘
 └──────────────┘                             │
                                              ▼
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │ Deactivate   │◀──│ Charge       │◀──│ Monitor      │
 │ plan         │   │ (interval +  │   │ subscribers  │
 │              │   │  cap gated)  │   │              │
 └──────────────┘   └──────────────┘   └──────────────┘
```

---

## FAQ

**Can I change the token, interval, or cap after creating a plan?**
These terms are fixed per plan. Create a new plan with the new terms and share its link.

**What happens when a subscriber hits the cap?**
They are marked **At cap** and cannot be charged again on that plan. They can subscribe to a new plan if you create one.

**Can I charge a subscriber early?**
No. Charges are gated by the interval. Wait until the next charge date.

**Do I need to charge manually?**
You can charge individually or in bulk from the subscriber list. Either way, the interval and cap rules apply.

**How do subscribers cancel?**
Subscribers can cancel from their side; cancelled subscribers appear in your list and cannot be charged.

---

For help with the dashboard itself, see the [/help](/help) page.