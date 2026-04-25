# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R09`
- Result ID: `RS-20260424-BE-R09`
- Window: `2026-04-24 22:51:05 +07` to `2026-04-24 23:00:18 +07`
- Scope: payments VNPay return/verify contract, signed callback success/failure semantics, signature rejection, manual confirm family-scope enforcement, callback replay idempotency, targeted bug reproduction/fix, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemoryServer-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/payments/payments-vnpay.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/payments/payments-vnpay.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand server/test/payments/payments-vnpay.contract.e2e-spec.ts`
4. `npm run test:e2e -- --runInBand server/test/payments/payments-vnpay.contract.e2e-spec.ts`
5. `npm run test:e2e -- --runInBand server/test/payments/payments-vnpay.contract.e2e-spec.ts`
6. `npm run test:e2e -- --runInBand server/test/payments/payments-vnpay.contract.e2e-spec.ts`
7. `npm run test:e2e -- --runInBand`
8. `npm test -- --runInBand`
9. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-PAY-008` | `PASSED` | configured VNPay create path returned a signed checkout URL and left payment/subscription pending |
| `BE-PAY-009` | `PASSED` | invalid signed `vnpay-return` callbacks returned failure and left payment/subscription state unchanged |
| `BE-PAY-010` | `PASSED` | signed failed `vnpay-return` callbacks returned failure and did not activate the paid subscription |
| `BE-PAY-011` | `PASSED` | signed successful `vnpay-return` callbacks confirmed payment, persisted `transactionId`, and activated the paid subscription |
| `BE-PAY-012` | `FAILED -> FIXED -> PASSED` | `vnpay-verify` now confirms payment and activates the subscription when frontend callback is the only callback path that runs |
| `BE-PAY-013` | `PASSED` | signed failed `vnpay-verify` calls returned failure and did not activate the paid subscription |
| `BE-PAY-014` | `PASSED` | invalid signed `vnpay-verify` calls returned failure and left payment/subscription unchanged |
| `BE-PAY-015` | `FAILED -> FIXED -> PASSED` | out-of-scope family managers can no longer confirm foreign `paymentId` values through `POST /api/payments/confirm` |
| `BE-PAY-016` | `PASSED` | duplicate successful signed `vnpay-return` callbacks remained idempotent for payment/subscription state and preserved the first `transactionId` |
| `BE-PAY-001` | `PASSED` | bank-transfer payment lifecycle remained green in full regression rerun |
| `BE-PAY-002` | `PASSED` | bank-transfer confirm idempotency remained green in full regression rerun |
| `BE-PAY-005` | `PASSED` | payment status visibility remained green in full regression rerun |
| `BE-E2E-001` | `PASSED` | full backend e2e regression ended green with 7 suites and 54 tests |
| `BE-UNIT-001` | `PASSED` | unit regression pack remained green with 4 suites and 35 tests |
| `BE-BUILD-001` | `PASSED` | backend build passed |

## Bugs found this round

### `BE-PAY-012`

- Detection source: new e2e coverage for the default VNPay frontend callback plus backend verify path.
- Symptom:
  - `GET /api/payments/vnpay-verify` returned `{ success: true }` for a valid signed `vnp_ResponseCode='00'`.
  - the linked payment stayed `PENDING` and the linked subscription stayed `PENDING_PAYMENT`.
- Reproduce:
  1. configure VNPay and create a pending VNPay payment
  2. build a valid signed success query with `vnp_TxnRef = paymentId`
  3. call `GET /api/payments/vnpay-verify`
  4. old behavior returned success but did not persist confirmation state
- Root cause:
  - only `vnpay-return` called `confirmPayment()`
  - `vnpay-verify` only rechecked the signature and `vnp_ResponseCode`, even though the default `VNPAY_RETURN_URL` points to the frontend callback page
- Fix:
  - `server/src/payments/payments.controller.ts`
  - both `vnpay-return` and `vnpay-verify` now flow through the same signed callback handler and confirm successful payments
- Ripple assessment:
  - affects subscriptions, payment status, dashboard upgrade state, finance reporting, and user-visible success messaging
  - no order, cashflow, payable/receivable, alerts, media, or auth regressions were observed in reruns
- Status after fix: `PASSED`

### `BE-PAY-015`

- Detection source: code-review finding converted into e2e regression in the same payments wave.
- Symptom:
  - `POST /api/payments/confirm` returned `200` when called by a manager who only had access to a different family.
  - the foreign payment moved to `SUCCESS`.
- Reproduce:
  1. create a pending payment for family A
  2. authenticate as a `QUAN_LY` who only manages family B
  3. call `POST /api/payments/confirm` with family A's `paymentId`
  4. old behavior returned `200` and confirmed the foreign payment
- Root cause:
  - manual confirmation path used `users:update` authorization only and did not pass user context into family-scope payment confirmation logic
  - `SubscriptionsService.confirmPayment()` had no optional access check
- Fix:
  - `server/src/payments/payments.controller.ts`
  - `server/src/subscriptions/subscriptions.service.ts`
  - manual confirm now passes `currentUser`, and confirmation enforces family access when user context exists
- Ripple assessment:
  - affects payment administration, finance integrity, cashflow history, and cross-family authorization boundaries
  - no regression was observed in public VNPay callbacks because gateway callbacks still confirm without a user context
- Status after fix: `PASSED`

## Harness issues observed during execution

- The first targeted run showed two false failures on invalid-signature cases because the helper accidentally recomputed a valid signature after the test tried to tamper it.
- This was a test harness issue in `server/test/payments/payments-vnpay.contract.e2e-spec.ts`, not a product bug. The invalid-signature helper was corrected before product evaluation continued.

## Regression reruns

- targeted VNPay suite, first run: `FAILED` with 3 failing tests
- targeted VNPay suite after harness correction: `FAILED` with 1 failing product test
- targeted VNPay suite after callback-path fix: `PASSED` with 6 tests
- targeted VNPay suite after adding failed-verify and callback-replay cases: `PASSED` with 8 tests
- targeted VNPay suite after adding manual confirm access case: `FAILED` with 1 failing product test
- targeted VNPay suite after confirm-access fix: `PASSED` with 9 tests
- full e2e regression rerun: `PASSED` with 7 suites and 54 tests
- unit regression rerun: `PASSED` with 4 suites and 35 tests
- backend build rerun: `PASSED`

## Environment notes

- SMTP remained unavailable in this local run. Mail send attempts logged `ECONNREFUSED 127.0.0.1:2525`.
- This did not block payment, auth, subscription, family, or tree verification because the application continues when mail send fails.
- Mail delivery itself remains open and is not marked pass.

## Files updated in this round

- `server/src/payments/payments.controller.ts`
- `server/src/subscriptions/subscriptions.service.ts`
- `server/test/payments/payments-vnpay.contract.e2e-spec.ts`
- `tests/backend/README.md`
- `tests/backend/docs/backend-test-plan.md`
- `tests/backend/docs/backend-test-scenario-matrix.md`
- `tests/backend/docs/backend-test-suite-backlog.md`
- `tests/backend/suites/suite-index.md`
- `tests/backend/artifacts/results/README.md`
- `tests/backend/artifacts/results/index/latest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R09__backend-payments-vnpay-return-verify__20260424T230018+07/manifest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R09__backend-payments-vnpay-return-verify__20260424T230018+07/run-summary.md`

## Open risks

- register rollback on partial side-effect failure is still unverified
- true payment concurrency/race behavior is still unverified
- billing-history list visibility policy for `GET /api/subscriptions/payments` is still unresolved
- VNPay callbacks still lack execution proof for stored amount/method/state invariant validation before confirmation
- payment confirmation still lacks fault-injection proof for the half-applied payment-success/subscription-pending state
- mail delivery behavior is still unverified
- public contract still has no dedicated `unions` payload; completeness currently relies on spouse inference in `members`
- duplicate valid pair unions are still not prevented by a uniqueness guarantee at the DB layer

## Next recommended backend wave

1. Add payment concurrency race scenarios
2. Add billing-visibility policy tests for `/api/subscriptions/payments`
3. Add fault-injection scenarios for `confirmPayment()` atomicity and retry healing
4. Add auth registration rollback scenarios
5. Add VNPay stored-order invariant checks for amount/method/state validation
