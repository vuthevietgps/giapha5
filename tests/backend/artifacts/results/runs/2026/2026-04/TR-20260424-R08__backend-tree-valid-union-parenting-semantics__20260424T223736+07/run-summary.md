# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R08`
- Result ID: `RS-20260424-BE-R08`
- Window: `2026-04-24 22:24:41 +07` to `2026-04-24 22:37:36 +07`
- Scope: valid binary union parenting semantics, same-gender and other-gender union rejection, direct father/mother role enforcement, dependent parent gender-mutation rejection, targeted bug reproduction/fix, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemoryServer-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/members/members-tree.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/members/members-tree.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand`
4. `npm test -- --runInBand`
5. `npm run build`
6. `npm run test:e2e -- --runInBand server/test/members/members-tree.contract.e2e-spec.ts`
7. `npm run test:e2e -- --runInBand server/test/members/members-tree.contract.e2e-spec.ts`
8. `npm run test:e2e -- --runInBand`
9. `npm test -- --runInBand`
10. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-TREE-021` | `FAILED -> FIXED -> PASSED` | `reparent` now rejects `unionId` values that point to valid same-gender binary unions and leaves the child unchanged |
| `BE-TREE-022` | `FAILED -> FIXED -> PASSED` | `reparent` now rejects `unionId` values that point to valid binary unions containing `gender='other'` and leaves the child unchanged |
| `BE-TREE-023` | `PASSED` | direct child creation remained blocked when `father`/`mother` roles did not map cleanly to male father and female mother even though a binary union existed |
| `BE-TREE-024` | `PASSED` | direct member update and explicit reparent remained blocked for role-swapped and `other`-gender parent combinations even when a binary union existed |
| `BE-TREE-025` | `FAILED -> FIXED -> PASSED` | member update now rejects changing a referenced father to non-male or a referenced mother to non-female and leaves dependents unchanged |
| `BE-TREE-003` | `PASSED` | reparent cycle prevention remained green |
| `BE-TREE-004` | `PASSED` | rooted tree contract remained green |
| `BE-TREE-005` | `PASSED` | child-create-via-union remained green |
| `BE-TREE-007` | `PASSED` | valid parent-union invariant remained green after R08 role-semantic hardening |
| `BE-TREE-008` | `PASSED` | `setChildren` union invariant remained green after R08 role-semantic hardening |
| `BE-TREE-009` | `PASSED` | dirty cross-family normalize behavior remained green |
| `BE-TREE-015` | `PASSED` | unsupported-parent-gender rejection remained green |
| `BE-TREE-018` | `PASSED` | malformed union create rejection remained green |
| `BE-TREE-019` | `PASSED` | malformed union update rejection remained green |
| `BE-TREE-020` | `PASSED` | malformed `unionId` rejection remained green |
| `BE-E2E-001` | `PASSED` | full backend e2e regression ended green with 6 suites and 45 tests |
| `BE-UNIT-001` | `FAILED -> FIXED -> PASSED` | unit regression pack failed once due mock drift, then reran cleanly with 4 suites and 35 tests |
| `BE-BUILD-001` | `PASSED` | backend build passed on both regression reruns |

## Bugs found this round

### `BE-TREE-021`

- Detection source: new e2e coverage for valid binary union parenting semantics through `reparent`.
- Symptom:
  - `PUT /api/members/:id/reparent` returned `200` when `unionId` pointed to `male+male`, `female+female`, `male+other`, `female+other`, or `other+other` binary unions.
  - old behavior rewrote or partially inferred `father` and `mother` from any first matching male/female pair instead of requiring one valid father and one valid mother.
- Reproduce:
  1. authenticate as a manager of a family
  2. create a binary union with either same-gender partners or at least one `gender='other'`
  3. call `PUT /api/members/:id/reparent` with that `unionId`
  4. old behavior returned `200`
- Root cause:
  - `reparent()` only enforced a binary distinct partner array and then inferred parents from the first male/female found.
  - shared parent validation checked membership and union shape but did not require the binary union to resolve to exactly one male father and one female mother.
- Fix:
  - `server/src/members/members.service.ts`
  - added shared parent-role semantic validation and strict binary-parent resolution so union-backed parenting writes require exactly one male father and one female mother
- Ripple assessment:
  - affects genealogy integrity, tree rendering, public-share correctness, audit history, and reporting derived from parent-child topology
  - no direct order, finance, cashflow, payable/receivable, alerts, media, or auth contract impact was observed in the reruns
- Status after fix: `PASSED`

### `BE-TREE-025`

- Detection source: adjacent e2e coverage added after code inspection of the same parenting invariant.
- Symptom:
  - `PUT /api/members/:id` returned `200` when changing a member already referenced as `father` to `female/other` or a member already referenced as `mother` to `male/other`.
  - old behavior left dependent children pointing at a parent whose stored gender no longer matched the role.
- Reproduce:
  1. seed a valid `male+female` union and a child referencing those members as `father` and `mother`
  2. call `PUT /api/members/:fatherId` with `gender: 'female'` or `gender: 'other'`
  3. or call `PUT /api/members/:motherId` with `gender: 'male'` or `gender: 'other'`
  4. old behavior returned `200` and persisted the invalidating gender change
- Root cause:
  - member update validated the edited member's own parent fields, but did not validate back-references from existing children already using that member as `father` or `mother`.
- Fix:
  - `server/src/members/members.service.ts`
  - added update-time dependent-parent role validation so a referenced father cannot become non-male and a referenced mother cannot become non-female while links still exist
- Ripple assessment:
  - affects genealogy integrity, tree rendering, audit accuracy, and any reports or exports that assume parent role semantics are consistent
  - no direct order, finance, cashflow, payable/receivable, alerts, media, or auth contract impact was observed in the reruns
- Status after fix: `PASSED`

## Harness issues observed during execution

- The first unit rerun failed because `members.service.spec.ts` did not yet mock the new `memberModel.find().select().lean().exec()` query path introduced by `validateParentRoleSemantics()`.
- This was a test harness drift in `server/src/members/members.service.spec.ts`, not a product bug. The mock was updated and the unit pack reran green.

## Regression reruns

- targeted tree semantics rerun after the first product fix: `PASSED` with 1 suite and 27 tests
- first full e2e regression rerun in the wave: `PASSED` with 6 suites and 43 tests
- first unit regression rerun: `FAILED -> FIXED -> PASSED` with 4 suites and 35 tests
- first backend build rerun: `PASSED`
- targeted dependent-parent gender rerun after the second product fix: `PASSED` with 1 suite and 29 tests
- final full e2e regression rerun: `PASSED` with 6 suites and 45 tests
- final unit regression rerun: `PASSED` with 4 suites and 35 tests
- final backend build rerun: `PASSED`

## Environment notes

- SMTP remained unavailable in this local run. Mail send attempts logged `ECONNREFUSED 127.0.0.1:2525`.
- This did not block auth/subscription/payment/tree verification because the application continues when mail send fails.
- Mail delivery itself remains open and is not marked pass.

## Files updated in this round

- `server/src/members/members.service.ts`
- `server/src/members/members.service.spec.ts`
- `server/test/members/members-tree.contract.e2e-spec.ts`
- `tests/backend/README.md`
- `tests/backend/docs/backend-test-plan.md`
- `tests/backend/docs/backend-test-scenario-matrix.md`
- `tests/backend/docs/backend-test-suite-backlog.md`
- `tests/backend/suites/suite-index.md`
- `tests/backend/artifacts/results/index/latest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R08__backend-tree-valid-union-parenting-semantics__20260424T223736+07/manifest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R08__backend-tree-valid-union-parenting-semantics__20260424T223736+07/run-summary.md`

## Open risks

- duplicate valid pair unions are still not prevented by a uniqueness guarantee at the DB layer
- VNPay return and verify flows are still unverified
- register rollback on partial side-effect failure is still unverified
- true payment concurrency/race behavior is still unverified
- billing-history list visibility policy for `GET /api/subscriptions/payments` is still unresolved
- mail delivery behavior is still unverified
- public contract still has no dedicated `unions` payload; completeness currently relies on spouse inference in `members`

## Next recommended backend wave

1. Add VNPay signed callback and verify scenarios
2. Add payment concurrency race scenarios
3. Add billing-visibility policy tests for `/api/subscriptions/payments`
4. Add rollback/fault-injection scenarios for auth registration side effects
5. Add DB-level duplicate-pair protection checks for unions
