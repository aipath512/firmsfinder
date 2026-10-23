# New Company Phone — A2A + Stripe (staging implementation)

Service ID: `ff.new-company.phone.v1`. Price: **€0.50 per successfully eligible phone lookup**, one Stripe Checkout payment per CUI. The phone is disclosed only after a server-verified `checkout.session.completed` webhook with `payment_status=paid`, matching order ID, session ID, currency EUR, and amount 50 cents. A completed browser redirect is **not** payment proof.

## Important deployment blockers
1. This is a proposed implementation, **not live**. Verify legal right to redistribute ANAF-derived contact numbers, data-subject protections, registration-date provenance, and Stripe account setup before production.
2. The D1 `ff_company_registration` table is intentionally empty. Populate **only** with verified official incorporation dates (YYYY-MM-DD), source and verification date. Without it the service refuses to sell.
3. API authentication currently uses a single shared `A2A_API_KEY` for a controlled pilot. Production requires buyer-specific authentication, order ownership, rate limiting, replay protection and authorization policy.
4. Implement refund/reconciliation for paid-but-undeliverable orders and Stripe disputes, event replay monitoring, payment method fees/taxes and fiscal documents before production.
5. Stripe minimum charge depends on account/currency/method; confirm that 0.50 EUR Checkout payments are accepted on your account.
6. The phone field is a **candidate**, not independently verified. No phone is included in quote or Checkout metadata.

## Install (in this folder)
```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put A2A_API_KEY
npx wrangler deploy
```
Configure a Stripe webhook for `https://<worker-domain>/a2a/new-company-phone/stripe-webhook` listening to `checkout.session.completed`. Do not put secrets in GitHub or `wrangler.toml`. Run staging tests with Stripe test-mode keys and webhook signing secret. The frontend should redirect to `checkout_url` only after buyer approval.

## Endpoints
- `POST /a2a/new-company-phone/quote` with Bearer token and `{"cui":12345678}`: eligibility and availability, no phone disclosure.
- `POST /a2a/new-company-phone/checkout`: returns order ID and Stripe Checkout URL.
- `GET /a2a/new-company-phone/orders/{order_id}`: paid-order delivery only.
- `POST /a2a/new-company-phone/stripe-webhook`: signature-verified Stripe webhook.
- `GET /health`: service liveness, **not** readiness or payment proof.

## Required checks
- Test unauthorized access, missing registration date, old company, no candidate phone, Stripe cancelled payment, failed payment, forged webhook, webhook retries, duplicate checkout and duplicate delivery.
- Verify no contact disclosure before payment, idempotent fulfillment, and one charge per accepted order.
- Confirm D1 registration dates and contact source under separate data-governance approval.
- Do not claim deployed, production ready, A2A protocol compliant, or payment enabled until verified.
