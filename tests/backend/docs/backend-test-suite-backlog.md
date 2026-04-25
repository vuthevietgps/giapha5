# Backend Test Suite Backlog

This file tracks missing suites that are needed to move backend QA from smoke-level confidence to release confidence.

| Suite ID | Priority | Target | Type | Why it is needed | First cases to add | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| `BE-SUITE-AUTH-CONTRACT` | P0 | `auth` | e2e | auth routes have contract risk around `me`, `refresh`, and register side effects | unauth `GET /api/auth/me`, login, refresh rotation, register creates free subscription | implemented |
| `BE-SUITE-AUTH-ROLLBACK` | P1 | `auth` | e2e/fault-injection | register currently performs multi-step writes and must not leave orphan family/user rows when downstream work fails | force free-subscription failure, assert no family/user/subscription writes remain, retry same payload | implemented |
| `BE-SUITE-SUBSCRIPTIONS-PUBLIC` | P0 | `subscriptions` | e2e | public/private access split is easy to break with middleware + guard interaction | unauth `GET /api/subscriptions/plans`, auth `GET /api/subscriptions/my`, family scope denial | implemented |
| `BE-SUITE-PAYMENTS-LIFECYCLE` | P0 | `payments` | e2e | payment creation, confirmation, and status are business-critical and currently uncovered | create bank transfer, duplicate create reuse, concurrent duplicate create reuse, confirm once, confirm twice, status ownership | implemented |
| `BE-SUITE-PAYMENTS-VNPAY-RETURN-VERIFY` | P1 | `payments` | e2e | default VNPay flow uses frontend callback plus backend verify, so signed callback and verify semantics must be proven | create VNPay URL, signed return success/failure, invalid signatures, signed verify success/failure, manual confirm family scope, replay idempotency | implemented |
| `BE-SUITE-PAYMENTS-CALLBACK-INVARIANTS` | P1 | `payments` | e2e | signed gateway success alone is not enough; stored amount, stored method, and expected pending state must match before confirm | mismatched amount, mismatched method, non-pending payment, non-pending subscription | implemented |
| `BE-SUITE-PAYMENTS-CONFIRM-ATOMICITY` | P1 | `payments` + `subscriptions` | e2e/fault-injection | payment confirmation crosses collections and must not leave a half-applied state when activation fails mid-flight | force activation failure after payment save, verify retry healing, verify concurrent confirm idempotency | implemented |
| `BE-SUITE-BILLING-VISIBILITY` | P1 | `subscriptions` + `payments` | e2e | billing list and payment-status routes expose different visibility models that must be documented with execution proof | `GET /api/subscriptions/payments`, owner-only rows, same-family manager gap vs `payments/status`, outsider denial | implemented |
| `BE-SUITE-SUBSCRIPTIONS-MY-DRIFT` | P1 | `subscriptions` | e2e | owner-scoped subscription listing must not keep old-family rows after the user's family assignment changes | reassignment drift on `GET /api/subscriptions/my` | implemented |
| `BE-SUITE-MEMBER-PLAN-LIMIT` | P1 | `members` + `subscriptions` | unit/e2e | interceptor path can fail before normal validation and affects member creation | invalid family id, expired subscription, member limit reached | partially covered |
| `BE-SUITE-TREE-RELATIONSHIP-E2E` | P0 | `members` + `unions` | e2e | tree behavior needs API-level proof beyond service-only assertions | create child with union, spouse symmetry, reparent cycle, delete cleanup | implemented |
| `BE-SUITE-FAMILY-PUBLIC-SHARE` | P0 | `families` | e2e | public share token and public members are externally visible contract | toggle share on/off, fetch public family, fetch public members, revoked token | implemented |
| `BE-SUITE-FAMILY-CASCADE` | P1 | `families` | unit/e2e | delete cascade must remain safe for legacy mixed ref data | delete family and prove member/union cleanup | partially covered |
| `BE-SUITE-BILLING-POLICY-DRIFT` | P1 | `subscriptions` + `payments` | e2e | current billing list is owner-only and payment-status is family-readable; creator-drift and low-privilege reader policy needed explicit proof | creator moved to another family still reads old payment, same-family `NHAN_VIEN`/`TRUONG_HO` payment-status contract | implemented |
| `BE-SUITE-BILLING-REPORT-VISIBILITY` | P1 | `subscriptions` + `payments` | e2e | after the R12 and R13 lock-downs, reporting and reconciliation semantics are still unresolved because manager/director users cannot enumerate in-scope billing rows from the owner-only list route | manager/director billing enumeration on `GET /api/subscriptions/payments` | planned |
| `BE-SUITE-BILLING-AUDIT-TRAIL` | P2 | `payments` + `audit` | integration/e2e | payment confirmation and gateway success change financial state and need family-scoped audit proof | manual confirm audit log, VNPay success audit log, family-scoped audit visibility | implemented |
| `BE-SUITE-MAIL-DELIVERY-CONTRACT` | P2 | `mail` | integration | current e2e only proves auth/payment flows survive SMTP failure | verification email, password reset email, payment confirmation email dispatch | planned |

## Backlog notes from this round

- The repo now has a shared self-contained replica-set e2e bootstrap helper plus implemented auth, auth-rollback, family public-share, members tree, subscriptions-access, subscriptions-payments, payments callback-invariants, payments confirm-atomicity, and dedicated VNPay contract suites.
- R07 consumed the malformed union write/update and malformed `unionId` consume coverage that had remained open after R06.
- R08 consumed valid binary union parenting semantics and the adjacent dependent-parent gender-mutation risk inside the existing tree relationship suite.
- R09 consumed signed VNPay return/verify coverage and manual confirm family-scope access inside the new payments VNPay suite.
- R10 consumed true concurrent duplicate-create coverage, payment-confirm half-applied fault injection with retry healing, concurrent manual-confirm idempotency, and the owner-only billing-list contract for `GET /api/subscriptions/payments`.
- R11 consumed auth register rollback and signed VNPay stored-order invariant validation.
- R12 consumed billing creator-drift revocation and low-privilege same-family payment-reader denial while keeping manager/director payment-status access green.
- R13 consumed subscriptions-my ownership-drift revocation and success-path billing audit-trail coverage for manual confirm plus signed VNPay success.
- The next highest-value additions are billing report enumeration semantics, billing audit idempotency/rejected-path assertions, mail-delivery assertions, and DB-level duplicate-pair protection for unions.
- Do not remove or weaken legacy mixed-ref regression now that those cases are covered.
