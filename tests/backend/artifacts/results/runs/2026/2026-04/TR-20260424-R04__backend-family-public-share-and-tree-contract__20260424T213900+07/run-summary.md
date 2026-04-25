# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R04`
- Result ID: `RS-20260424-BE-R04`
- Window: `2026-04-24 21:31:58 +07` to `2026-04-24 21:39:00 +07`
- Scope: family public-share contract, members tree relationship contract, targeted bug reproduction/fix, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemoryServer-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/families/families-public-share.contract.e2e-spec.ts server/test/members/members-tree.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/families/families-public-share.contract.e2e-spec.ts server/test/members/members-tree.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand`
4. `npm test -- --runInBand`
5. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-PUBLIC-002` | `PASSED` | disabling public share revoked the token for both public endpoints |
| `BE-PUBLIC-003` | `PASSED` | valid token served both public family and public members without JWT |
| `BE-PUBLIC-004` | `PASSED` | invalid token returned `404` for family and members |
| `BE-PUBLIC-005` | `PASSED` | toggle-share stayed protected across `401`, `403`, and `404` cases |
| `BE-TREE-003` | `PASSED` | reparent cycle was rejected with `400` |
| `BE-TREE-004` | `PASSED` | rooted tree contract returned expected root/child graph and blocked outsider family access |
| `BE-TREE-005` | `PASSED` | child creation with an existing union succeeded through the API |
| `BE-TREE-006` | `FAILED -> FIXED -> PASSED` | cross-family spouse assignment is now rejected and no longer mutates the outsider member |
| `BE-TREE-007` | `FAILED -> FIXED -> PASSED` | reparent now rejects father/mother pairs that do not belong to a union |
| `BE-E2E-001` | `PASSED` | smoke route stayed green in full regression |
| `BE-AUTH-001` | `FAILED -> FIXED -> PASSED` | prior unauth `me` fix remained green in regression rerun |
| `BE-AUTH-002` | `PASSED` | register-side-effect contract remained green |
| `BE-AUTH-003` | `FAILED -> FIXED -> PASSED` | prior refresh-token fix remained green |
| `BE-SUBS-001` | `FAILED -> FIXED -> PASSED` | public plans remained green |
| `BE-SUBS-002` | `PASSED` | active-only sorted plans remained green |
| `BE-SUBS-003` | `PASSED` | owner-only subscription list remained green |
| `BE-SUBS-004` | `PASSED` | family-scope subscription access remained green |
| `BE-PLAN-001` | `FAILED -> FIXED -> PASSED` | invalid-family negative path remained green |
| `BE-PAY-001` | `PASSED` | payment lifecycle remained green |
| `BE-PAY-002` | `GAP FOUND -> FIXED -> PASSED` | payment confirm idempotency remained green |
| `BE-PAY-003` | `PASSED` | subscription activation/expiry remained green |
| `BE-PAY-004` | `GAP FOUND -> FIXED -> PASSED` | duplicate payment-create reuse remained green |
| `BE-PAY-005` | `PASSED` | payment status visibility remained green |
| `BE-UNIT-001` | `PASSED` | 4 unit suites, 35 tests |
| `BE-BUILD-001` | `PASSED` | backend build stayed green |

## Bugs found this round

### `BE-TREE-006`

- Detection source: new members-tree e2e coverage.
- Symptom:
  - `PUT /api/members/:id` accepted `spouse` from another family and then wrote reciprocal spouse state into the out-of-scope target member.
- Reproduce:
  1. authenticate as a manager for family A
  2. prepare member X in family A and member Y in family B
  3. call `PUT /api/members/:memberXId` with `{ "spouse": "<memberYId>" }`
  4. old behavior returned `200` and mutated member Y despite family-scope mismatch
- Root cause:
  - `members.create/update` validated same-family only for `father/mother`, not for `spouse`, while `update()` also forced spouse symmetry on the target member.
- Fix:
  - `server/src/members/members.service.ts`
  - same-family validation now includes `spouse`, spouse symmetry cleanup now matches legacy refs, and delete/cleanup paths were hardened for mixed reference storage
- Ripple assessment:
  - affects auth and access-boundary integrity because an in-scope user could mutate out-of-scope family data
  - affects public tree, genealogy reports, and any relationship-based exports because cross-family spouse links corrupt graph integrity
  - no direct payment, cashflow, payable/receivable, or order impact was observed
- Status after fix: `PASSED`

### `BE-TREE-007`

- Detection source: new members-tree e2e coverage.
- Symptom:
  - `PUT /api/members/:id/reparent` accepted a `fatherId + motherId` pair that did not belong to any union and rewired the child anyway.
- Reproduce:
  1. authenticate as a manager for family A
  2. prepare child C in family A and two candidate parents P1/P2 in family A with no union between them
  3. call `PUT /api/members/:childId/reparent` with both parent ids
  4. old behavior returned `200` and rewrote parent links despite missing union
- Root cause:
  - `reparent()` enforced same-family and cycle checks but never applied the union invariant already used by `create/update`.
- Fix:
  - `server/src/members/members.service.ts`
  - added shared parent-union invariant validation and applied it to `reparent()`
  - extended the same invariant to `setChildren()` so the sibling mutation path does not bypass the same rule
  - `server/src/unions/unions.service.ts`
  - `normalizeForMember()` now filters partner candidates by family to avoid creating bad unions from dirty cross-family relationship data
- Ripple assessment:
  - affects genealogy correctness, public tree rendering, internal reports, and admin alerts that depend on parentage consistency
  - no direct payment, cashflow, payable/receivable, or order impact was observed
- Status after fix: `PASSED`

## Regression reruns

- targeted family/tree rerun after fixes: `PASSED` with 2 suites and 8 tests
- full e2e regression rerun: `PASSED` with 6 suites and 19 tests
- unit regression rerun: `PASSED` with 4 suites and 35 tests
- backend build rerun: `PASSED`

## Environment notes

- SMTP remained unavailable in this local run. Mail send attempts logged `ECONNREFUSED 127.0.0.1:2525`.
- This did not block auth/subscription/payment/tree/public-share business-flow verification because the application continues when mail send fails.
- Mail delivery itself remains open and is not marked pass.

## Files updated in this round

- `server/src/members/members.service.ts`
- `server/src/unions/unions.service.ts`
- `server/test/families/families-public-share.contract.e2e-spec.ts`
- `server/test/members/members-tree.contract.e2e-spec.ts`
- `tests/backend/README.md`
- `tests/backend/docs/backend-test-plan.md`
- `tests/backend/docs/backend-test-scenario-matrix.md`
- `tests/backend/docs/backend-test-suite-backlog.md`
- `tests/backend/suites/suite-index.md`
- `tests/backend/artifacts/results/index/latest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R04__backend-family-public-share-and-tree-contract__20260424T213900+07/manifest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R04__backend-family-public-share-and-tree-contract__20260424T213900+07/run-summary.md`

## Open risks

- VNPay return and verify flows are still unverified
- register rollback on partial side-effect failure is still unverified
- true payment concurrency/race behavior is still unverified
- billing-history list visibility policy for `GET /api/subscriptions/payments` is still unresolved
- public family payload minimization is still unverified
- direct execution proof for `setChildren` union-invariant and `normalizeForMember` dirty-data behavior is still missing
- invalid ObjectId handling across tree endpoints is still unverified
- mail delivery behavior is still unverified

## Next recommended backend wave

1. Add VNPay signed callback and verify scenarios
2. Add invalid-id and dirty-data edge cases for `members/unions/families public`
3. Add payment concurrency race scenarios
4. Add billing-visibility policy tests for `/api/subscriptions/payments`
