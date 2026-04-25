# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R03`
- Result ID: `RS-20260424-BE-R03`
- Window: `2026-04-24 21:19:58 +07` to `2026-04-24 21:21:25 +07`
- Scope: subscriptions family-scope access, duplicate payment-create policy, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemoryServer-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand test/subscriptions`
2. `npm run test:e2e -- --runInBand`
3. `npm test -- --runInBand`
4. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-SUBS-003` | `PASSED` | `GET /api/subscriptions/my` returned only the caller subscriptions |
| `BE-SUBS-004` | `PASSED` | family-scoped subscription access returned `200` for in-scope manager and `404` for outsider |
| `BE-PAY-004` | `GAP FOUND -> FIXED -> PASSED` | duplicate `POST /api/payments/create` now reuses the existing pending checkout |
| `BE-PAY-005` | `PASSED` | payment status remained visible to owner and in-scope manager, hidden from outsider |
| `BE-E2E-001` | `PASSED` | app smoke route stayed green |
| `BE-AUTH-001` | `FAILED -> FIXED -> PASSED` | prior auth fix remained green in regression rerun |
| `BE-AUTH-002` | `PASSED` | prior register-side-effect contract remained green |
| `BE-AUTH-003` | `FAILED -> FIXED -> PASSED` | prior refresh-token fix remained green |
| `BE-SUBS-001` | `FAILED -> FIXED -> PASSED` | public plans remained green |
| `BE-SUBS-002` | `PASSED` | active-only sorted plans remained green |
| `BE-PLAN-001` | `FAILED -> FIXED -> PASSED` | invalid family negative path remained green |
| `BE-PAY-001` | `PASSED` | payment lifecycle remained green |
| `BE-PAY-002` | `GAP FOUND -> FIXED -> PASSED` | payment confirm idempotency remained green |
| `BE-PAY-003` | `PASSED` | subscription activation/expiry remained green |
| `BE-UNIT-001` | `PASSED` | 4 unit suites, 35 tests |
| `BE-BUILD-001` | `PASSED` | backend build remained green |

## Bug found this round

### `BE-PAY-004`

- Detection source: inspection plus new e2e coverage for sequential duplicate create.
- Symptom:
  - repeated `POST /api/payments/create` for the same family/plan/method created another pending subscription and another pending payment
- Reproduce:
  1. authenticate as a user allowed to create a paid subscription
  2. call `POST /api/payments/create` with the same `familyId`, `planSlug`, and `method`
  3. repeat the same request before the pending payment is confirmed
  4. old behavior created a second pending subscription/payment pair
- Root cause:
  - `createPaidSubscription()` always inserted new `PENDING_PAYMENT` and `PENDING` rows and never attempted pending reuse
- Fix:
  - `server/src/subscriptions/subscriptions.service.ts`
  - added pending subscription/payment lookup and reuse for the same user/family/plan/method before creating new rows
- Ripple assessment:
  - affects finance and cashflow traceability because duplicate pending records distort billing counts
  - affects payable/receivable and reports because the same intended checkout can appear multiple times
  - affects alerts and admin operations because repeated create actions look like multiple outstanding payments
- Status after fix: `PASSED`

## Regression reruns

- targeted subscriptions regression rerun: `PASSED` with 2 suites and 7 tests
- full e2e regression rerun: `PASSED` with 4 suites and 11 tests
- unit regression rerun: `PASSED` with 4 suites and 35 tests
- backend build rerun: `PASSED`

## Environment notes

- SMTP remained unavailable in this local run. Mail send attempts logged `ECONNREFUSED 127.0.0.1:2525`.
- This did not block subscription/payment/auth business-flow verification because the application continues when mail send fails.
- Mail delivery itself remains open and is not marked pass.

## Files updated in this round

- `server/src/subscriptions/subscriptions.service.ts`
- `server/test/subscriptions/subscriptions-access.contract.e2e-spec.ts`
- `server/test/subscriptions/subscriptions-payments.contract.e2e-spec.ts`
- `tests/backend/README.md`
- `tests/backend/docs/backend-test-plan.md`
- `tests/backend/docs/backend-test-scenario-matrix.md`
- `tests/backend/docs/backend-test-suite-backlog.md`
- `tests/backend/suites/suite-index.md`
- `tests/backend/artifacts/results/README.md`
- `tests/backend/artifacts/results/index/latest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R03__backend-subscriptions-access-and-duplicate-create__20260424T212125+07/manifest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R03__backend-subscriptions-access-and-duplicate-create__20260424T212125+07/run-summary.md`

## Open risks

- VNPay return and verify flows are still unverified
- family public-share and tree relationship e2e are still unverified
- register rollback on partial side-effect failure is still unverified
- true payment concurrency/race behavior is still unverified
- billing-history list visibility policy for `GET /api/subscriptions/payments` is still unresolved
- mail delivery behavior is still unverified

## Next recommended backend wave

1. Add VNPay signed callback and verify scenarios
2. Add public-share and tree relationship API e2e
3. Add payment concurrency race scenarios
4. Add billing-visibility policy tests for `/api/subscriptions/payments`
