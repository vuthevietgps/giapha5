# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260425-R13`
- Result ID: `RS-20260425-BE-R13`
- Window: `2026-04-25 00:05:34 +07` to `2026-04-25 00:10:44 +07`
- Scope: subscriptions-my ownership drift, billing audit trail for manual confirm and signed gateway success, targeted bug reproduction/fix, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemory replica set-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/subscriptions/billing-report-visibility.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/payments/billing-audit-trail.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand server/test/subscriptions/billing-report-visibility.contract.e2e-spec.ts`
4. `npm run test:e2e -- --runInBand server/test/payments/billing-audit-trail.contract.e2e-spec.ts`
5. `npm run test:e2e -- --runInBand`
6. `npm test -- --runInBand`
7. `npm run build`
8. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-SUBS-005` | `FAILED -> FIXED -> PASSED` | `GET /api/subscriptions/my` originally kept old-family rows after reassignment; after the fix the route became current-family aware while stored rows remained intact |
| `BE-AUDIT-001` | `FAILED -> FIXED -> PASSED` | manual confirm and signed VNPay success originally created no audit rows; after the fix both paths emitted family-scoped payment and subscription audit rows |
| `BE-E2E-001` | `PASSED` | full backend e2e regression ended green with 13 suites and 68 tests |
| `BE-UNIT-001` | `PASSED` | unit regression pack remained green with 4 suites and 39 tests |
| `BE-BUILD-001` | `FAILED -> FIXED -> PASSED` | build caught a type-only return mismatch in the new billing-audit path and passed after the return-type narrowing fix |

## Bugs found

### `BE-SUBS-005`

- Reproduce:
  1. Create free and pending paid subscriptions for a user assigned to family A.
  2. Reassign that same user to family B and log in again so the token reflects the new assignment.
  3. Call `GET /api/subscriptions/my`.
  4. Observe the old implementation still returned family-A subscription rows because it filtered only by `user`.
- Root cause: `getUserSubscriptions()` accepted only `userId` and never intersected results with the caller's current family reach.
- Fix:
  - [subscriptions.controller.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.controller.ts) now passes the full current user into the subscriptions-my service path
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts) now filters owner rows through the caller's current family access instead of blindly returning every row for that user id

### `BE-AUDIT-001`

- Reproduce:
  1. Create a pending bank-transfer payment and manually confirm it through `POST /api/payments/confirm`.
  2. Create a pending VNPay payment and confirm it through a valid signed `GET /api/payments/vnpay-return`.
  3. Query `GET /api/audit?entity=payment&entityId=...` and `GET /api/audit?entity=subscription&entityId=...` as an in-scope manager.
  4. Observe the old implementation returned no audit rows because billing paths had no `AuditService` writes.
- Root cause: billing confirmation and activation logic lived entirely inside subscriptions/payments flows, but neither module wired `AuditService` nor wrote family-scoped audit entries on successful state transitions.
- Fix:
  - [audit.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/audit/audit.service.ts) now accepts an optional mongoose session so billing audit writes can participate in transactional confirm paths
  - [subscriptions.module.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.module.ts) now imports `AuditModule`
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts) now injects `AuditService` and writes family-scoped `payment` and `subscription` audit rows after successful manual confirm and successful signed gateway confirm

## Non-product drift caught during the run

- The first build after the audit changes failed because TypeScript still saw `activateSubscription()` as returning the plain schema type instead of `SubscriptionDocument`. That was a compile-time typing drift, not a new runtime defect.

## Regression reruns

- Targeted reruns:
  - `billing-report-visibility.contract.e2e-spec.ts`: pass after the subscriptions-my drift fix
  - `billing-audit-trail.contract.e2e-spec.ts`: pass after billing audit wiring was added
- Full regression:
  - `npm run test:e2e -- --runInBand`: pass with 13 suites / 68 tests
  - `npm test -- --runInBand`: pass with 4 suites / 39 tests
  - `npm run build`: failed once on audit-path typing drift, then passed on rerun

## Environment notes

- SMTP remained intentionally unavailable at `127.0.0.1:2525`. Mail-service `ECONNREFUSED` logs were expected and did not block the business assertions.
- Existing fault-injection suites still emitted expected forced-failure logs during the full rerun; those logs were part of existing regression coverage and did not indicate new blocked conditions.

## Files updated in this run

- Product code:
  - [audit.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/audit/audit.service.ts)
  - [subscriptions.controller.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.controller.ts)
  - [subscriptions.module.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.module.ts)
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts)
- Tests:
  - [billing-report-visibility.contract.e2e-spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/subscriptions/billing-report-visibility.contract.e2e-spec.ts)
  - [billing-audit-trail.contract.e2e-spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/payments/billing-audit-trail.contract.e2e-spec.ts)
- Tracking:
  - [tests/backend/README.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/README.md)
  - [backend-test-plan.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-plan.md)
  - [backend-test-scenario-matrix.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-scenario-matrix.md)
  - [backend-test-suite-backlog.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-suite-backlog.md)
  - [suite-index.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/suites/suite-index.md)
  - [latest.json](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/artifacts/results/index/latest.json)

## Open risks after R13

- manager/director billing enumeration for reporting is still unresolved on `GET /api/subscriptions/payments`
- billing audit success-path proof exists, but idempotent, rejected, and rolled-back audit behavior is still unexecuted
- mail delivery is still not asserted
- duplicate valid pair unions still lack a DB-level uniqueness guarantee
- public contract still has no dedicated `unions` payload

## Recommended next wave

- `R14`: billing report enumeration plus billing audit idempotency/rollback assertions, then mail delivery
