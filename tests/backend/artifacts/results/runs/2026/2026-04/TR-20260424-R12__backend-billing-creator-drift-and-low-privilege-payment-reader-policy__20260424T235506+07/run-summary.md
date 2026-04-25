# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R12`
- Result ID: `RS-20260424-BE-R12`
- Window: `2026-04-24 23:51:42 +07` to `2026-04-24 23:55:06 +07`
- Scope: billing creator-drift visibility, low-privilege same-family payment-reader policy, targeted bug reproduction/fix, billing regression rerun, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemory replica set-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/subscriptions/billing-policy-drift.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/subscriptions/billing-policy-drift.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand server/test/subscriptions/billing-policy-drift.contract.e2e-spec.ts server/test/subscriptions/subscriptions-access.contract.e2e-spec.ts`
4. `npm run test:e2e -- --runInBand`
5. `npm test -- --runInBand`
6. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-PAY-020` | `FAILED -> FIXED -> PASSED` | a reassigned payment creator originally kept reading the old-family payment by id and still listed the old-family billing row; after the fix both reads were revoked |
| `BE-PAY-021` | `FAILED -> FIXED -> PASSED` | same-family `NHAN_VIEN` and `TRUONG_HO` users originally read another user's payment status by id; after the fix only the in-scope owner, manager, and director remained readable |
| `BE-PAY-005` | `PASSED` | owner and in-scope manager payment-status visibility remained green, and director visibility was now explicitly proven |
| `BE-PAY-007` | `PASSED` | owner-only billing-list enumeration remained green for in-scope owners, while creator-drift revocation was enforced separately |
| `BE-E2E-001` | `PASSED` | full backend e2e regression ended green with 11 suites and 65 tests |
| `BE-UNIT-001` | `PASSED` | unit regression pack stayed green with 4 suites and 39 tests |
| `BE-BUILD-001` | `PASSED` | backend build stayed green after the billing-access refactor |

## Bugs found

### `BE-PAY-020`

- Reproduce:
  1. Create a pending bank-transfer payment as a `NHAN_VIEN` assigned to family A.
  2. Reassign that same user to family B and log in again so the token reflects the new assignment.
  3. Call `GET /api/payments/status?paymentId=...` and `GET /api/subscriptions/payments`.
  4. Observe the old implementation still returned the old-family payment because owner checks ignored current family scope and the billing list filtered only by `payment.user`.
- Root cause: billing reads reused generic family access or user ownership independently, but had no dedicated policy that combined owner identity with current family scope.
- Fix:
  - [permissions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/auth/permissions.service.ts) now exposes `canAccessBilling()` so billing reads use a dedicated elevated-reader rule instead of generic family readability
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts) now enforces that billing-list rows and payment-status reads must pass the dedicated billing rule, revoking stale owner access after reassignment
  - [subscriptions.controller.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.controller.ts) now passes the full current user context into the billing-list service path

### `BE-PAY-021`

- Reproduce:
  1. Create a payment in family A for user X.
  2. Log in as another same-family `NHAN_VIEN` and as a same-family `TRUONG_HO`.
  3. Call `GET /api/payments/status?paymentId=...`.
  4. Observe the old implementation returned `200` because low-privilege family users already passed `members.read` and the service accepted any `canAccessFamily()` actor.
- Root cause: `GET /api/payments/status` piggybacked on generic `members.read` plus `canAccessFamily()`, which is broader than billing visibility should be.
- Fix:
  - [permissions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/auth/permissions.service.ts) now distinguishes elevated billing readers (`GIAM_DOC`, `QUAN_LY`) from low-privilege same-family users
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts) now allows payment-status reads only for the current in-scope owner or elevated billing readers

## Regression reruns

- Targeted reruns:
  - `billing-policy-drift.contract.e2e-spec.ts`: failed first, then passed after the billing-access fix
  - `billing-policy-drift.contract.e2e-spec.ts` + `subscriptions-access.contract.e2e-spec.ts`: pass after the fix
- Full regression:
  - `npm run test:e2e -- --runInBand`: pass with 11 suites / 65 tests
  - `npm test -- --runInBand`: pass with 4 suites / 39 tests
  - `npm run build`: pass

## Environment notes

- SMTP remained intentionally unavailable at `127.0.0.1:2525`. Mail-service `ECONNREFUSED` logs were expected and did not block billing assertions.
- Fault-injection suites still emitted expected forced-failure logs during the full rerun; those were part of existing regression coverage and did not represent new blocked conditions.

## Files updated in this run

- Product code:
  - [permissions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/auth/permissions.service.ts)
  - [subscriptions.controller.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.controller.ts)
  - [subscriptions.service.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/subscriptions/subscriptions.service.ts)
- Tests:
  - [permissions.service.spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/src/auth/permissions.service.spec.ts)
  - [billing-policy-drift.contract.e2e-spec.ts](C:/Users/PC/Documents/code/giapha5-version7/server/test/subscriptions/billing-policy-drift.contract.e2e-spec.ts)
- Tracking:
  - [tests/backend/README.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/README.md)
  - [backend-test-plan.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-plan.md)
  - [backend-test-scenario-matrix.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-scenario-matrix.md)
  - [backend-test-suite-backlog.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/docs/backend-test-suite-backlog.md)
  - [suite-index.md](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/suites/suite-index.md)
  - [latest.json](C:/Users/PC/Documents/code/giapha5-version7/tests/backend/artifacts/results/index/latest.json)

## Open risks after R12

- mail delivery is still not asserted
- owner-only `/api/subscriptions/payments` still leaves manager/director reconciliation and reporting enumeration unresolved
- `/api/subscriptions/my` ownership-drift semantics are still unexecuted
- billing state changes still have no audit-trail execution proof and appear to lack dedicated audit logging by inspection
- duplicate valid pair unions still lack a DB-level uniqueness guarantee
- public contract still has no dedicated `unions` payload

## Recommended next wave

- `R13`: billing report enumeration and audit-trail assertions, then mail delivery
