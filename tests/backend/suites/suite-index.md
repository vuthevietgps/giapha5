# Backend Suite Index

## Implemented suites

| Suite ID | Layer | Source | Command | Main coverage | State |
| --- | --- | --- | --- | --- | --- |
| `BE-UNIT-APP-CONTROLLER` | unit | `server/src/app.controller.spec.ts` | `npm test -- --runInBand` | app service/controller smoke | implemented |
| `BE-UNIT-AUTH-PERMISSIONS` | unit | `server/src/auth/permissions.service.spec.ts` | `npm test -- --runInBand` | role permission and family access filtering | implemented |
| `BE-UNIT-MEMBERS-SERVICE` | unit | `server/src/members/members.service.spec.ts` | `npm test -- --runInBand` | root male rule, union validation, parent-role validation, tree build, delete cleanup | implemented |
| `BE-UNIT-FAMILIES-SERVICE` | unit | `server/src/families/families.service.spec.ts` | `npm test -- --runInBand` | public members mixed refs, family cascade mixed refs | implemented |
| `BE-E2E-APP-HEALTH` | smoke e2e | `server/test/app.e2e-spec.ts` | `npm run test:e2e -- --runInBand` | app bootstrap with self-contained Mongo and `/api` route contract | implemented |
| `BE-E2E-AUTH-CONTRACT` | e2e | `server/test/auth/auth.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand` | register side effects, unauth `me`, auth `me`, refresh rotation and token invalidation | implemented |
| `BE-E2E-AUTH-ROLLBACK` | e2e/fault-injection | `server/test/auth/auth-rollback.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand server/test/auth/auth-rollback.contract.e2e-spec.ts` | forced free-subscription failure during register, orphan-write rollback proof, and clean retry with the same payload | implemented |
| `BE-E2E-FAMILY-PUBLIC-SHARE` | e2e | `server/test/families/families-public-share.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand` | toggle-share lifecycle, public family fetch, payload minimization, public members fetch, spouse inference from unions, invalid token, and auth matrix | implemented |
| `BE-E2E-TREE-RELATIONSHIPS` | e2e | `server/test/members/members-tree.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand` | rooted tree contract, child create through union, cross-family spouse denial, reparent cycle/union invariants, `setChildren` invariant plus unsupported-parent-gender rejection, dirty normalize behavior including malformed legacy union idempotency, malformed union write/update rejection, malformed `unionId` consume rejection, valid binary union parent-role enforcement, dependent-parent gender-mutation rejection, and malformed ObjectId contract | implemented |
| `BE-E2E-PAYMENTS-VNPAY` | e2e | `server/test/payments/payments-vnpay.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand server/test/payments/payments-vnpay.contract.e2e-spec.ts` | configured VNPay checkout URL, signed return success/failure, signed verify success/failure, signature rejection, manual confirm family-scope denial, and duplicate callback state idempotency | implemented |
| `BE-E2E-PAYMENTS-CALLBACK-INVARIANTS` | e2e | `server/test/payments/payments-callback-invariants.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand server/test/payments/payments-callback-invariants.contract.e2e-spec.ts` | signed success callback rejection for amount mismatch, method mismatch, non-pending payment state, and non-pending subscription state | implemented |
| `BE-E2E-PAYMENTS-CONFIRM-ATOMICITY` | e2e/fault-injection | `server/test/payments/payments-confirm-atomicity.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand server/test/payments/payments-confirm-atomicity.contract.e2e-spec.ts` | forced activation failure after confirm starts, rollback/compensation proof, retry healing, and concurrent manual-confirm idempotency | implemented |
| `BE-E2E-SUBSCRIPTIONS-MY-DRIFT` | e2e | `server/test/subscriptions/billing-report-visibility.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand server/test/subscriptions/billing-report-visibility.contract.e2e-spec.ts` | reassignment drift revokes old-family rows from `GET /api/subscriptions/my` while stored subscription rows remain intact | implemented |
| `BE-E2E-BILLING-POLICY-DRIFT` | e2e | `server/test/subscriptions/billing-policy-drift.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand server/test/subscriptions/billing-policy-drift.contract.e2e-spec.ts` | creator reassignment revokes old-family payment access and same-family `NHAN_VIEN` / `TRUONG_HO` readers are denied while manager/director access remains available | implemented |
| `BE-E2E-BILLING-AUDIT-TRAIL` | integration/e2e | `server/test/payments/billing-audit-trail.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand server/test/payments/billing-audit-trail.contract.e2e-spec.ts` | manual confirm and signed VNPay success create family-scoped audit rows visible in-scope and hidden out-of-scope | implemented |
| `BE-E2E-SUBSCRIPTIONS-ACCESS` | e2e | `server/test/subscriptions/subscriptions-access.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand` | subscription owner listing, family-scope subscription access, payment-status visibility for owner/manager/outsider, and owner-only `/subscriptions/payments` billing list contract | implemented |
| `BE-E2E-SUBSCRIPTIONS-PAYMENTS-CONTRACT` | e2e | `server/test/subscriptions/subscriptions-payments.contract.e2e-spec.ts` | `npm run test:e2e -- --runInBand` | public plans, invalid-family plan-limit safety, sequential duplicate create reuse, concurrent duplicate create race coverage, bank-transfer payment lifecycle, and bank-transfer confirm idempotency | implemented |

## Planned suites

| Suite ID | Layer | Planned location | Main coverage | State |
| --- | --- | --- | --- | --- |
| `BE-E2E-MEMBER-PLAN-LIMITS` | e2e | `server/test/members/` | invalid family id, expired subscription, and member-cap enforcement | planned |
| `BE-E2E-BILLING-REPORT-VISIBILITY` | e2e | `server/test/subscriptions/` | manager/director billing enumeration semantics and `/api/subscriptions/my` ownership-drift behavior | planned |
| `BE-E2E-MAIL-DELIVERY` | integration | `server/test/mail/` | delivery assertions for verification, reset, and payment confirmation emails | planned |

## Notes

- `server/test` remains the executable e2e home.
- `tests/backend` is the QA tracking and evidence home.
- `server/test/helpers/e2e-app.helper.ts` is the shared bootstrap for self-contained, transaction-capable e2e execution.
- Empty module folders under `server/test` should not be treated as implemented coverage until a real suite file exists.
- Mail delivery assertions, billing report enumeration semantics, billing audit idempotency/rejected-path assertions, DB-level duplicate-pair protection for valid unions, and dedicated public `unions` payload coverage remain open after R13.
