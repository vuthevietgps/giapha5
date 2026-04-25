# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R06`
- Result ID: `RS-20260424-BE-R06`
- Window: `2026-04-24 22:03:48 +07` to `2026-04-24 22:07:07 +07`
- Scope: remaining tree/unions edge cases, unsupported parent gender contract, malformed legacy union normalize/idempotency, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemoryServer-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/members/members-tree.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/members/members-tree.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand`
4. `npm test -- --runInBand`
5. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-TREE-015` | `FAILED -> FIXED -> PASSED` | `setChildren` now rejects `gender='other'` instead of silently writing that member into `father` |
| `BE-TREE-016` | `FAILED -> FIXED -> PASSED` | normalize no longer creates a new pair union when a malformed legacy union already contains both partners plus an extra partner |
| `BE-TREE-017` | `FAILED -> FIXED -> PASSED` | normalize no longer creates a new pair union when a malformed legacy union already contains duplicate partner ids |
| `BE-TREE-003` | `PASSED` | reparent cycle prevention remained green |
| `BE-TREE-004` | `PASSED` | rooted tree contract remained green |
| `BE-TREE-005` | `PASSED` | child-create-via-union remained green |
| `BE-TREE-008` | `PASSED` | `setChildren` union invariant remained green after the ambiguous-role fix |
| `BE-TREE-009` | `PASSED` | dirty cross-family normalize behavior remained green after malformed-union hardening |
| `BE-E2E-001` | `PASSED` | full backend e2e regression passed with 6 suites and 31 tests |
| `BE-UNIT-001` | `FAILED -> FIXED -> PASSED` | unit regression pack remained green with 4 suites and 35 tests |
| `BE-BUILD-001` | `PASSED` | backend build passed |

## Bugs found this round

### `BE-TREE-015`

- Detection source: new members-tree e2e coverage for ambiguous parent-role writes.
- Symptom:
  - `PUT /api/members/:id/children` returned `200` and wrote a parent with `gender='other'` into the child's `father` field.
- Reproduce:
  1. create a family member with `gender='other'`
  2. create a child in the same family without assigned parents
  3. call `PUT /api/members/:parentId/children` with that child id
  4. old behavior returned `200` and mutated `father=parentId`
- Root cause:
  - `MembersService.setChildren()` treated every non-`female` parent as the `father` branch, so the endpoint silently coerced `gender='other'` into a binary parent role.
- Fix:
  - `server/src/members/members.service.ts`
  - reject `setChildren` when the parent gender is neither `male` nor `female`
- Ripple assessment:
  - affects genealogy integrity, tree rendering, and any report/audit consumer that trusts `father` and `mother` semantics
  - no direct order, finance, cashflow, payable/receivable, or media impact observed
- Status after fix: `PASSED`

### `BE-TREE-016/017`

- Detection source: new members-tree e2e coverage for malformed legacy union normalize/idempotency.
- Symptom:
  - `POST /api/unions/normalize/:memberId` created a fresh 2-person union even when an existing malformed union already contained both partners, either with an extra partner or with duplicate partner ids.
- Reproduce:
  1. create two spouses in the same family
  2. seed a malformed legacy union containing both partners plus an extra partner, or duplicate one partner id in the union
  3. call `POST /api/unions/normalize/:memberId`
  4. old behavior returned `created` with a new overlapping pair union
- Root cause:
  - `UnionsService.normalizeForMember()` only considered an existing relationship valid when the raw `partners` array had exactly length `2`, so malformed legacy arrays bypassed the duplicate check and amplified dirty data.
- Fix:
  - `server/src/unions/unions.service.ts`
  - canonicalize existing union partner ids before checking whether a relationship already exists, so any union already containing both partners blocks a new pair-union create
- Ripple assessment:
  - affects genealogy consistency, public tree completeness, union-based parenting flows, and audit noise because dirty data could multiply into overlapping unions
  - no direct payment, cashflow, payable/receivable, order, or auth impact observed
- Status after fix: `PASSED`

## Regression reruns

- targeted tree/unions rerun after product fixes: `PASSED` with 1 suite and 15 tests
- full e2e regression rerun: `PASSED` with 6 suites and 31 tests
- unit regression rerun: `PASSED` with 4 suites and 35 tests
- backend build rerun: `PASSED`

## Environment notes

- SMTP remained unavailable in this local run. Mail send attempts logged `ECONNREFUSED 127.0.0.1:2525`.
- This did not block auth/subscription/payment/tree verification because the application continues when mail send fails.
- Mail delivery itself remains open and is not marked pass.

## Files updated in this round

- `server/src/members/members.service.ts`
- `server/src/unions/unions.service.ts`
- `server/test/members/members-tree.contract.e2e-spec.ts`
- `tests/backend/README.md`
- `tests/backend/docs/backend-test-plan.md`
- `tests/backend/docs/backend-test-scenario-matrix.md`
- `tests/backend/docs/backend-test-suite-backlog.md`
- `tests/backend/suites/suite-index.md`
- `tests/backend/artifacts/results/index/latest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R06__backend-tree-unions-remaining-edge-cases__20260424T220707+07/manifest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R06__backend-tree-unions-remaining-edge-cases__20260424T220707+07/run-summary.md`

## Open risks

- union write/update contract still lacks execution proof for exact binary-partner enforcement and may still accept malformed shapes such as `1` partner, `3+` partners, or duplicate partner ids
- `reparent` and other union-consuming flows still lack execution proof when `unionId` points to malformed multi-partner legacy data
- VNPay return and verify flows are still unverified
- register rollback on partial side-effect failure is still unverified
- true payment concurrency/race behavior is still unverified
- billing-history list visibility policy for `GET /api/subscriptions/payments` is still unresolved
- mail delivery behavior is still unverified
- public contract still has no dedicated `unions` payload; completeness currently relies on spouse inference in `members`

## Next recommended backend wave

1. Add union write/consume contract cases for malformed `partners` shape and malformed `unionId` parenting flows
2. Add VNPay signed callback and verify scenarios
3. Add payment concurrency race scenarios
4. Add billing-visibility policy tests for `/api/subscriptions/payments`
