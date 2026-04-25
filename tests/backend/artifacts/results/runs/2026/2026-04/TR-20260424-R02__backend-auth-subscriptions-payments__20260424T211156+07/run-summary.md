# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R02`
- Result ID: `RS-20260424-BE-R02`
- Window: `2026-04-24 21:06 +07` to `2026-04-24 21:11:56 +07`
- Scope: auth contract, subscriptions public contract, payment lifecycle/idempotency, member plan-limit negative path, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemoryServer-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand`
2. `npm run build`
3. `npm run test:e2e -- --runInBand`
4. `npm run test:e2e -- --runInBand test/auth/auth.contract.e2e-spec.ts`
5. `npm run test:e2e -- --runInBand`
6. `npm test -- --runInBand`
7. `npm run build`

## Execution history

### Phase 1: new suite harness correction

- First full e2e execution failed before product assertions because the new suites imported `supertest` with the wrong form and threw `TypeError: request is not a function`.
- Action taken:
  - `server/test/auth/auth.contract.e2e-spec.ts`
  - `server/test/subscriptions/subscriptions-payments.contract.e2e-spec.ts`
  - corrected the `supertest` import and reran e2e
- This was a test harness defect, not a product pass/fail signal.

### Phase 2: product failures exposed by real execution

Observed failures on real product behavior:

- `GET /api/auth/me` without token returned `200` instead of `401`
- `GET /api/subscriptions/plans` returned `401` though middleware intended it to be public
- `POST /api/members` with invalid `family` returned `500` due interceptor-side BSON/ObjectId construction
- old refresh token remained reusable after refresh rotation

### Phase 3: fixes and reruns

- targeted auth rerun: `PASSED`
- full e2e rerun: `PASSED`
- unit regression rerun: `PASSED`
- build rerun: `PASSED`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-AUTH-001` | `FAILED -> FIXED -> PASSED` | `GET /api/auth/me` now guarded and rejects anonymous requests |
| `BE-AUTH-002` | `PASSED` | register creates family head user and free subscription |
| `BE-AUTH-003` | `FAILED -> FIXED -> PASSED` | refresh rotation now invalidates the prior token and keeps compatibility for legacy bcrypt-stored rows |
| `BE-SUBS-001` | `FAILED -> FIXED -> PASSED` | public plans endpoint now genuinely bypasses permission guard |
| `BE-SUBS-002` | `PASSED` | plans remained active-only and sorted |
| `BE-PLAN-001` | `FAILED -> FIXED -> PASSED` | invalid `family` returns normal `400` instead of crashing with `500` |
| `BE-PAY-001` | `PASSED` | bank-transfer payment create, status, confirm, and post-confirm status passed |
| `BE-PAY-002` | `GAP FOUND -> FIXED -> PASSED` | repeat confirm no longer mutates transaction id or subscription activation window |
| `BE-PAY-003` | `PASSED` | paid subscription becomes sole active subscription for the family |
| `BE-E2E-001` | `PASSED` | smoke `/api` route contract still green |
| `BE-UNIT-001` | `PASSED` | 4 suites, 35 tests |
| `BE-BUILD-001` | `PASSED` | backend build stayed green |

## Bugs found

### `BE-AUTH-001`

- Symptom: `GET /api/auth/me` returned `200` with null user instead of rejecting.
- Reproduce:
  - call `GET /api/auth/me` without `Authorization`
  - observe `200 OK`
- Root cause:
  - endpoint had no guard and simply returned `@CurrentUser()`
- Fix:
  - `server/src/auth/auth.controller.ts`
  - added `JwtAuthGuard` to `GET /api/auth/me`
- Ripple assessment:
  - affects session integrity for frontend/mobile auth flows
  - can hide expired or missing session state from client UX
- Status after fix: `PASSED`

### `BE-SUBS-001`

- Symptom: `GET /api/subscriptions/plans` returned `401` for anonymous users.
- Reproduce:
  - call `GET /api/subscriptions/plans` without token
  - observe `401 Unauthorized`
- Root cause:
  - middleware allowed the path, but the controller applied `PermissionsGuard` at class level
- Fix:
  - `server/src/subscriptions/subscriptions.controller.ts`
  - removed class-level guard and applied guard only to protected routes
- Ripple assessment:
  - affects subscription discovery, onboarding, and payment funnel entry points
  - can break public pricing UI and upgrade UX
- Status after fix: `PASSED`

### `BE-PLAN-001`

- Symptom: invalid `family` payload on `POST /api/members` returned `500`.
- Reproduce:
  - send member create payload with `family: "not-a-valid-object-id"`
  - observe interceptor-side BSON/ObjectId exception before DTO validation
- Root cause:
  - `PlanLimitInterceptor` constructed `new Types.ObjectId(familyId)` before checking validity
- Fix:
  - `server/src/auth/plan-limit.interceptor.ts`
  - only constructs `ObjectId` when `familyId` is valid
- Ripple assessment:
  - affects member creation stability
  - pollutes auth/payment/plan-upgrade user journeys with wrong server-side failure mode
- Status after fix: `PASSED`

### `BE-AUTH-003`

- Symptom: old refresh token remained reusable after successful refresh.
- Reproduce:
  - obtain refresh token
  - call `POST /api/auth/refresh`
  - call `POST /api/auth/refresh` again with the old token
  - old token was still accepted
- Root cause:
  - refresh tokens were stored with bcrypt
  - bcrypt only considers the first 72 bytes, while JWT refresh tokens are longer and can differ only after that boundary
- Fix:
  - `server/src/auth/auth.controller.ts`
  - switched refresh-token storage to full-token `sha256` digest
  - retained compatibility with legacy bcrypt-stored refresh hashes during verification
- Ripple assessment:
  - affects auth security, concurrent sessions, session revocation, and auditability
- Status after fix: `PASSED`

### `BE-PAY-002`

- Detection source: tightened idempotency assertion before release, then fixed before final rerun.
- Risk:
  - duplicate payment confirmation could overwrite `transactionId` and re-run subscription activation timing
- Fix:
  - `server/src/subscriptions/subscriptions.service.ts`
  - confirmation now returns existing successful payment without mutating state
- Ripple assessment:
  - affects finance, cashflow traceability, reports, and alert integrity under callback retries or manual reconfirm
- Status after fix: `PASSED`

## Environment notes

- SMTP was intentionally unavailable in this local run. Mail send attempts logged `ECONNREFUSED 127.0.0.1:2525`.
- This did not block auth/payment business-flow verification because the application already swallows outbound mail errors.
- Mail delivery behavior itself remains unverified and is tracked as an open risk rather than a pass.

## Regression reruns

- full e2e regression rerun: `PASSED` with 3 suites and 7 tests
- unit regression rerun: `PASSED` with 4 suites and 35 tests
- backend build rerun: `PASSED`

## Files updated in this round

- `server/src/auth/auth.controller.ts`
- `server/src/auth/plan-limit.interceptor.ts`
- `server/src/subscriptions/subscriptions.controller.ts`
- `server/src/subscriptions/subscriptions.service.ts`
- `server/test/helpers/e2e-app.helper.ts`
- `server/test/app.e2e-spec.ts`
- `server/test/auth/auth.contract.e2e-spec.ts`
- `server/test/subscriptions/subscriptions-payments.contract.e2e-spec.ts`
- `tests/backend/README.md`
- `tests/backend/docs/backend-test-plan.md`
- `tests/backend/docs/backend-test-scenario-matrix.md`
- `tests/backend/docs/backend-test-suite-backlog.md`
- `tests/backend/suites/suite-index.md`
- `tests/backend/artifacts/results/README.md`
- `tests/backend/artifacts/results/index/latest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R02__backend-auth-subscriptions-payments__20260424T211156+07/manifest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R02__backend-auth-subscriptions-payments__20260424T211156+07/run-summary.md`

## Open risks

- duplicate `POST /api/payments/create` behavior is still unverified
- subscription family-scope access paths are still unverified
- VNPay return and verify flows are still unverified
- register rollback on partial failure is still unverified
- mail delivery behavior is still unverified

## Next recommended backend wave

1. Add family-scoped subscription access tests for `my` and `family/:familyId`
2. Add duplicate `payments/create` and ownership/visibility assertions
3. Add VNPay signed callback and verify scenarios
4. Add tree/public-share API e2e coverage
