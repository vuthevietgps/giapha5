# Backend Test Plan

## Objective

Provide a strict, traceable backend QA process for this repository without lowering the bar for hard cases.

This plan is aligned to the current backend surface:

- auth
- users
- families
- members
- unions
- posts
- backgrounds
- audit
- subscriptions
- payments

`positions` is currently outside the active backend QA wave unless a dependency forces it into scope.

## Execution policy

- P0 and P1 scenarios are executed before cosmetic or low-risk checks.
- A failing test is treated as a signal to investigate, not as noise to suppress.
- Expected results are not changed just to make the run green.
- Validation, guards, and business rules stay enabled during verification.
- If an environment dependency blocks execution, the scenario is recorded as `BLOCKED`.
- Code review findings that expose an untested production risk must be converted into regression coverage where feasible.

## Test layers

## Layer 1. Build and smoke

- `npm run build`
- self-contained smoke e2e for app bootstrap and route contract

## Layer 2. Unit and service regression

- permissions and role filtering
- member relationship rules
- family public data and cascade behavior

## Layer 3. Business e2e and contract tests

- auth contract
- public share contract
- subscription and payment flows
- plan limit enforcement
- tree relationship flows across API boundaries

## Layer 4. External integration and env-boundary checks

- VNPay sandbox
- mail callbacks or outbound mail assertions
- timezone-sensitive subscription/payment dates

## Evidence policy

- Result artifacts are append-only under `tests/backend/artifacts/results/runs/`.
- Each run must record:
  - local date/time
  - scope
  - environment
  - commands executed
  - scenario or suite result
  - bugs found
  - fix status
  - rerun status
  - open risks

## Current implemented backend automation

- unit: `app.controller.spec.ts`
- unit: `auth/permissions.service.spec.ts`
- unit: `members/members.service.spec.ts`
- unit: `families/families.service.spec.ts`
- e2e smoke: `test/app.e2e-spec.ts`
- e2e auth contract: `test/auth/auth.contract.e2e-spec.ts`
- e2e auth rollback contract: `test/auth/auth-rollback.contract.e2e-spec.ts`
- e2e family public-share contract: `test/families/families-public-share.contract.e2e-spec.ts`
- e2e members tree contract: `test/members/members-tree.contract.e2e-spec.ts`
- e2e payments VNPay contract: `test/payments/payments-vnpay.contract.e2e-spec.ts`
- e2e payments callback invariants contract: `test/payments/payments-callback-invariants.contract.e2e-spec.ts`
- e2e payments confirm atomicity contract: `test/payments/payments-confirm-atomicity.contract.e2e-spec.ts`
- e2e billing policy drift contract: `test/subscriptions/billing-policy-drift.contract.e2e-spec.ts`
- e2e subscriptions-my drift contract: `test/subscriptions/billing-report-visibility.contract.e2e-spec.ts`
- e2e subscriptions access contract: `test/subscriptions/subscriptions-access.contract.e2e-spec.ts`
- e2e subscriptions and payments contract: `test/subscriptions/subscriptions-payments.contract.e2e-spec.ts`
- e2e billing audit trail contract: `test/payments/billing-audit-trail.contract.e2e-spec.ts`
- shared e2e bootstrap helper: `test/helpers/e2e-app.helper.ts`

## Current round summary

Latest recorded execution:

- Run ID: `TR-20260425-R13`
- Result ID: `RS-20260425-BE-R13`
- Evidence: `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260425-R13__backend-subscriptions-my-drift-and-billing-audit-trail__20260425T001044+07/`

What this round did:

- added a dedicated subscriptions-my drift e2e suite that forces reassignment after subscription creation and verifies old-family subscriptions disappear from `GET /api/subscriptions/my`
- added a dedicated billing audit-trail e2e suite that asserts manual confirm and signed VNPay success both create family-scoped audit rows while outsider managers cannot see them
- reproduced a real ownership-drift leak where `GET /api/subscriptions/my` still returned old-family subscription rows after reassignment
- reproduced a real audit gap where manual confirm and signed gateway success changed billing state without any audit rows
- fixed the ownership-drift root cause by making subscriptions-my reads current-family aware instead of filtering on `user` alone
- fixed the audit root cause by wiring `AuditService` into subscriptions, then writing atomic billing audit rows for payment and subscription updates on successful confirm paths
- reran targeted `R13` suites, then reran full backend e2e, unit regression, and backend build

## Exit criteria for a backend QA wave

- all planned P0 scenarios for the wave have a real status
- no open critical defect is mislabeled as passed
- rerun evidence exists for every fix performed in the wave
- suite backlog is updated for gaps that remain

## Open risks after this round

- outbound mail delivery itself is still not asserted in backend e2e; current runs only verify business flow continues when SMTP is unavailable
- owner-only `/api/subscriptions/payments` still leaves manager/director reconciliation and reporting enumeration unresolved
- billing audit success-path proof now exists, but idempotent/rejected/rolled-back audit behavior is still unexecuted
- duplicate valid pair unions are still not prevented by a uniqueness guarantee at the DB layer
- public contract still has no evidence for a dedicated `unions` payload; current completeness relies on spouse inference in `members` response
