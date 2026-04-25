# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R10`
- Result ID: `RS-20260424-BE-R10`
- Window: `2026-04-24 23:13:24 +07` to `2026-04-24 23:20:25 +07`
- Scope: payment confirm atomicity fault injection, parallel duplicate-create race, concurrent manual-confirm idempotency, billing visibility contract for `GET /api/subscriptions/payments`, targeted bug reproduction/fix, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemory replica set-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/payments/payments-confirm-atomicity.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/subscriptions/subscriptions-access.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand server/test/payments/payments-confirm-atomicity.contract.e2e-spec.ts`
4. `npm run test:e2e -- --runInBand server/test/subscriptions/subscriptions-access.contract.e2e-spec.ts`
5. `npm run test:e2e -- --runInBand server/test/subscriptions/subscriptions-payments.contract.e2e-spec.ts`
6. `npm run test:e2e -- --runInBand server/test/subscriptions/subscriptions-payments.contract.e2e-spec.ts`
7. `npm run test:e2e -- --runInBand server/test/payments/payments-confirm-atomicity.contract.e2e-spec.ts`
8. `npm run test:e2e -- --runInBand server/test/subscriptions/subscriptions-payments.contract.e2e-spec.ts server/test/subscriptions/subscriptions-access.contract.e2e-spec.ts`
9. `npm run test:e2e -- --runInBand`
10. `npm test -- --runInBand`
11. `npm run build`
12. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-PAY-006` | `FAILED -> FIXED -> PASSED` | parallel `POST /api/payments/create` originally returned different `paymentId` and `subscriptionId` values for the same pending upgrade; after the fix the race reuses one pending checkout |
| `BE-PAY-007` | `PASSED` | `GET /api/subscriptions/payments` returned only caller-owned payments; the same-family manager saw no other-user billing rows and the outsider saw only outsider-owned rows |
| `BE-PAY-017` | `FAILED -> FIXED -> PASSED` | forced activation failure originally left payment `SUCCESS`; after the fix the first confirm rolled back cleanly and a retry healed the subscription |
| `BE-PAY-019` | `PASSED` | concurrent manual confirms ended with one successful payment and one active subscription without double-activation drift |
| `BE-PAY-001` | `PASSED` | bank-transfer create/confirm lifecycle remained green after R10 fixes |
| `BE-PAY-002` | `PASSED` | bank-transfer confirm idempotency remained green after R10 fixes |
| `BE-PAY-004` | `PASSED` | sequential duplicate create reuse remained green after the new concurrency fix |
| `BE-PAY-005` | `PASSED` | payment-status visibility remained green while billing-list enumeration stayed owner-only |
| `BE-SUBS-003` | `PASSED` | owner-only subscription list remained green with the expanded access test setup |
| `BE-SUBS-004` | `PASSED` | family-scoped active-subscription access remained green |
| `BE-E2E-001` | `PASSED` | full backend e2e regression ended green with 8 suites and 58 tests |
| `BE-UNIT-001` | `PASSED` | unit regression pack remained green with 4 suites and 35 tests |
| `BE-BUILD-001` | `FAILED -> FIXED -> PASSED` | build caught a post-refactor typing regression in the new session helper and passed after the helper signature was corrected |

## Bugs found

### `BE-PAY-006`

- Reproduce:
  1. Seed one user and one family with a free subscription.
  2. Fire two identical `POST /api/payments/create` bank-transfer requests in parallel for the same `familyId + planSlug`.
  3. Observe two different `paymentId` and `subscriptionId` values.
- Root cause: `createPaidSubscription()` used a read-then-insert flow without a persistence invariant for pending subscriptions/payments, so parallel requests could both miss the pending rows and create duplicates.
- Fix:
  - added a unique partial index on pending subscriptions in [subscription.schema.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/schemas/subscription.schema.ts)
  - added a unique partial index on pending payments in [payment.schema.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/schemas/payment.schema.ts)
  - changed [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts) to catch duplicate-key writes and requery the existing pending checkout instead of creating a second one

### `BE-PAY-017`

- Reproduce:
  1. Create a pending bank-transfer payment.
  2. Force `activateSubscription()` to throw once after confirmation starts.
  3. Call `POST /api/payments/confirm`.
  4. Observe the old implementation returned `500` but still left payment `SUCCESS` and the subscription `PENDING_PAYMENT`.
- Root cause: `confirmPayment()` saved payment success before subscription activation and had no transaction or compensation path, so a mid-flight activation error left a half-applied cross-collection state.
- Fix:
  - refactored [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts) to run confirmation inside a Mongo transaction when available
  - added a sequential compensation fallback for environments without transaction support
  - upgraded [e2e-app.helper.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/helpers/e2e-app.helper.ts) to use a replica set-backed in-memory Mongo so transaction coverage is exercised in e2e

## Non-product drift caught during the run

- The first access-suite rerun failed because the expanded setup now gave the outsider user a paid subscription as well as a free subscription. The expected length in [subscriptions-access.contract.e2e-spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/subscriptions/subscriptions-access.contract.e2e-spec.ts) was updated to match the new fixture state.
- The first post-fix build failed on a TypeScript helper signature in [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts). The helper typing was corrected and the build rerun passed.

## Regression reruns

- Targeted reruns:
  - `payments-confirm-atomicity.contract.e2e-spec.ts`: pass after the confirm fix
  - `subscriptions-payments.contract.e2e-spec.ts`: fail on real concurrency bug, then pass after the duplicate-create fix
  - `subscriptions-access.contract.e2e-spec.ts`: pass after test-fixture expectation correction
- Full regression:
  - `npm run test:e2e -- --runInBand`: pass with 8 suites / 58 tests
  - `npm test -- --runInBand`: pass with 4 suites / 35 tests
  - `npm run build`: failed once on TypeScript helper drift, then passed on rerun

## Environment notes

- SMTP remained intentionally unavailable at `127.0.0.1:2525`. Mail-service error logs were expected; they did not block the business-flow assertions.

## Files updated in this run

- Product code:
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts)
  - [subscription.schema.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/schemas/subscription.schema.ts)
  - [payment.schema.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/schemas/payment.schema.ts)
  - [e2e-app.helper.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/helpers/e2e-app.helper.ts)
- Tests:
  - [payments-confirm-atomicity.contract.e2e-spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/payments/payments-confirm-atomicity.contract.e2e-spec.ts)
  - [subscriptions-payments.contract.e2e-spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/subscriptions/subscriptions-payments.contract.e2e-spec.ts)
  - [subscriptions-access.contract.e2e-spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/subscriptions/subscriptions-access.contract.e2e-spec.ts)
- Tracking:
  - [tests/backend/README.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/README.md)
  - [backend-test-plan.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-plan.md)
  - [backend-test-scenario-matrix.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-scenario-matrix.md)
  - [backend-test-suite-backlog.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-suite-backlog.md)
  - [suite-index.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/suites/suite-index.md)
  - [latest.json](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/artifacts/results/index/latest.json)

## Open risks after R10

- register rollback on partial side-effect failure has still not been executed
- mail delivery is still not asserted
- VNPay callback invariant validation for stored amount/method/pending-state is still open
- billing/report policy beyond the current owner-only billing-list contract is still open for creator-drift behavior and low-privilege family readers
- duplicate valid pair unions still lack a DB-level uniqueness guarantee
- public contract still has no dedicated `unions` payload

## Recommended next wave

- `R11`: auth rollback + VNPay stored-order invariants
