# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R11`
- Result ID: `RS-20260424-BE-R11`
- Window: `2026-04-24 23:32:58 +07` to `2026-04-24 23:38:46 +07`
- Scope: auth register rollback fault injection, VNPay stored-order callback invariants, targeted bug reproduction/fix, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemory replica set-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/auth/auth-rollback.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/payments/payments-callback-invariants.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand server/test/auth/auth-rollback.contract.e2e-spec.ts`
4. `npm run test:e2e -- --runInBand server/test/payments/payments-callback-invariants.contract.e2e-spec.ts`
5. `npm run test:e2e -- --runInBand`
6. `npm test -- --runInBand`
7. `npm run build`
8. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-AUTH-004` | `FAILED -> FIXED -> PASSED` | forced free-subscription failure originally left orphan family/user writes; after the fix register rolled back cleanly and the same payload could be retried successfully |
| `BE-PAY-018` | `FAILED -> FIXED -> PASSED` | signed VNPay success callbacks originally confirmed on wrong amount, wrong method, and wrong order state; after the fix both return and verify reject those mismatches without mutating payment/subscription state |
| `BE-AUTH-002` | `PASSED` | normal register path remained green after the R11 auth refactor |
| `BE-E2E-001` | `PASSED` | full backend e2e regression ended green with 10 suites and 63 tests |
| `BE-UNIT-001` | `PASSED` | unit regression pack remained green with 4 suites and 35 tests |
| `BE-BUILD-001` | `FAILED -> FIXED -> PASSED` | build caught a type-narrowing regression in the auth rollback fallback path and passed after the narrowing fix |

## Bugs found

### `BE-AUTH-004`

- Reproduce:
  1. Spy `SubscriptionsService.createFreeSubscription()` to throw once during `POST /api/auth/register`.
  2. Call register with a new email and family name.
  3. Observe the old implementation returns `500` but leaves persisted family and user rows behind.
  4. Retry the same payload and hit conflict/dirty-state behavior.
- Root cause: register performed `family -> user -> free subscription -> refresh token` as independent writes with no transaction or cleanup path.
- Fix:
  - [auth.controller.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/auth/auth.controller.ts) now runs register inside a Mongo transaction when available
  - the same controller now has a sequential compensation fallback that deletes created subscription/user/family rows if a downstream write fails on non-transactional environments
  - [auth.module.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/auth/auth.module.ts) now exposes `Subscription` model to support fallback cleanup
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts) now accepts an optional session for free-subscription creation so register can keep the flow atomic

### `BE-PAY-018`

- Reproduce:
  1. Create a pending VNPay payment and send a valid signed success callback with mismatched `vnp_Amount`.
  2. Create a bank-transfer payment and send a valid signed success callback using that `paymentId`.
  3. Create a VNPay payment, mutate payment state to `FAILED`, then send a valid signed success callback.
  4. Create a VNPay payment, mutate linked subscription state away from `PENDING_PAYMENT`, then send a valid signed success callback.
  5. Observe the old implementation returned `success=true` and confirmed the payment because it only checked signature and response code.
- Root cause: callback handling only validated HMAC and `vnp_ResponseCode === '00'`; it never compared callback data with stored payment method, amount, or stored order state before calling `confirmPayment()`.
- Fix:
  - [payments.controller.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/payments/payments.controller.ts) now validates parsed callback amount and calls a stored-order guard before any confirmation path
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts) now exposes `isGatewayConfirmationAllowed()` to enforce stored method, stored amount, and expected payment/subscription states

## Non-product drift caught during the run

- The first build after the auth refactor failed because TypeScript still saw `familyId` as possibly undefined in the compensation path. That was a type-narrowing drift in [auth.controller.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/auth/auth.controller.ts), not a new product bug.

## Regression reruns

- Targeted reruns:
  - `auth-rollback.contract.e2e-spec.ts`: pass after the register rollback fix
  - `payments-callback-invariants.contract.e2e-spec.ts`: pass after callback invariant validation was added
- Full regression:
  - `npm run test:e2e -- --runInBand`: pass with 10 suites / 63 tests
  - `npm test -- --runInBand`: pass with 4 suites / 35 tests
  - `npm run build`: failed once on auth fallback typing drift, then passed on rerun

## Environment notes

- SMTP remained intentionally unavailable at `127.0.0.1:2525`. Mail-service error logs were expected; they did not block the business-flow assertions.

## Files updated in this run

- Product code:
  - [auth.controller.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/auth/auth.controller.ts)
  - [auth.module.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/auth/auth.module.ts)
  - [payments.controller.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/payments/payments.controller.ts)
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts)
- Tests:
  - [auth-rollback.contract.e2e-spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/auth/auth-rollback.contract.e2e-spec.ts)
  - [payments-callback-invariants.contract.e2e-spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/payments/payments-callback-invariants.contract.e2e-spec.ts)
- Tracking:
  - [tests/backend/README.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/README.md)
  - [backend-test-plan.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-plan.md)
  - [backend-test-scenario-matrix.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-scenario-matrix.md)
  - [backend-test-suite-backlog.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-suite-backlog.md)
  - [suite-index.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/suites/suite-index.md)
  - [latest.json](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/artifacts/results/index/latest.json)

## Open risks after R11

- mail delivery is still not asserted
- creator-drift and low-privilege reader policy for billing/payment endpoints is still open
- duplicate valid pair unions still lack a DB-level uniqueness guarantee
- public contract still has no dedicated `unions` payload

## Recommended next wave

- `R12`: billing creator-drift and low-privilege payment-reader policy, then mail delivery assertions
