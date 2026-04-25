# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R07`
- Result ID: `RS-20260424-BE-R07`
- Window: `2026-04-24 22:12:33 +07` to `2026-04-24 22:20:24 +07`
- Scope: malformed union write contract, malformed union consume contract, binary-partner enforcement, targeted bug reproduction/fix, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemoryServer-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/members/members-tree.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/members/members-tree.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand`
4. `npm test -- --runInBand`
5. `npm run build`
6. `npm test -- --runInBand`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-TREE-018` | `FAILED -> FIXED -> PASSED` | union create now rejects single-partner and `3+` distinct-partner payloads and does not persist malformed records |
| `BE-TREE-019` | `FAILED -> FIXED -> PASSED` | union update now rejects malformed partner arrays and leaves stored partners unchanged |
| `BE-TREE-020` | `FAILED -> FIXED -> PASSED` | `reparent` now rejects malformed `unionId` payloads for `3+` and duplicate-partner legacy unions without rewriting `father`/`mother` |
| `BE-TREE-003` | `PASSED` | reparent cycle prevention remained green |
| `BE-TREE-004` | `PASSED` | rooted tree contract remained green |
| `BE-TREE-005` | `PASSED` | child-create-via-union remained green |
| `BE-TREE-007` | `PASSED` | valid parent-union invariant remained green after binary-union enforcement |
| `BE-TREE-008` | `PASSED` | `setChildren` union invariant remained green after binary-union enforcement |
| `BE-TREE-009` | `PASSED` | dirty cross-family normalize behavior remained green |
| `BE-TREE-015` | `PASSED` | unsupported-parent-gender rejection remained green |
| `BE-TREE-016` | `PASSED` | malformed `3+` partner normalize idempotency remained green |
| `BE-TREE-017` | `PASSED` | malformed duplicate-partner normalize idempotency remained green |
| `BE-E2E-001` | `PASSED` | full backend e2e regression passed with 6 suites and 38 tests |
| `BE-UNIT-001` | `FAILED -> FIXED -> PASSED` | unit regression pack failed once due mock drift, then reran cleanly with 4 suites and 35 tests |
| `BE-BUILD-001` | `PASSED` | backend build passed |

## Bugs found this round

### `BE-TREE-018`

- Detection source: new e2e coverage for malformed union write create contract.
- Symptom:
  - `POST /api/unions` returned `201` and persisted a union with only one partner.
  - `POST /api/unions` also returned `201` for `3+` distinct partners in the same family.
- Reproduce:
  1. authenticate as a manager of a family
  2. call `POST /api/unions` with `partners: [A]`
  3. old behavior returned `201`
  4. repeat with `partners: [A, B, C]`
  5. old behavior again returned `201`
- Root cause:
  - union DTO and schema only required `partners.length >= 1`, and the service only checked family membership before persisting the raw array.
- Fix:
  - `server/src/unions/dto/create-union.dto.ts`
  - `server/src/unions/schemas/union.schema.ts`
  - `server/src/unions/unions.service.ts`
  - supported writes now require exactly `2` distinct partner ids at validation and service levels
- Ripple assessment:
  - affects genealogy integrity, public tree semantics, and any downstream consumer that assumes a binary union
  - no direct order, finance, cashflow, payable/receivable, or media impact observed
- Status after fix: `PASSED`

### `BE-TREE-019`

- Detection source: new e2e coverage for malformed union update contract.
- Symptom:
  - `PATCH /api/unions/:id` returned `200` and rewrote a valid union into a `3+` distinct-partner shape.
- Reproduce:
  1. create a valid 2-partner union
  2. call `PATCH /api/unions/:id` with `partners: [A, B, C]`
  3. old behavior returned `200` and mutated stored partners
- Root cause:
  - update path inherited the same permissive `partners` contract as create and did not enforce a binary distinct pair before persistence.
- Fix:
  - `server/src/unions/dto/create-union.dto.ts`
  - `server/src/unions/schemas/union.schema.ts`
  - `server/src/unions/unions.service.ts`
  - update path now enforces exactly `2` distinct partners and rejects malformed writes before mutation
- Ripple assessment:
  - affects genealogy integrity, audit quality, and any report built from union topology
  - no direct finance/cashflow/order impact observed
- Status after fix: `PASSED`

### `BE-TREE-020`

- Detection source: new e2e coverage for malformed union consume contract in `reparent`.
- Symptom:
  - `PUT /api/members/:id/reparent` returned `200` when `unionId` pointed to a malformed legacy union with `3+` partners or duplicate partner ids.
  - old behavior inferred `father` and `mother` from the first male/female found and rewrote the child graph.
- Reproduce:
  1. seed a malformed legacy union via raw insert, either `[A, B, C]` or `[A, B, B]`
  2. call `PUT /api/members/:id/reparent` with that `unionId`
  3. old behavior returned `200` and rewrote `father`/`mother`
- Root cause:
  - `reparent()` trusted any loaded union and only checked whether a male/female pair could be inferred, while `validateUnionExists()` accepted any union containing both ids regardless of malformed partner shape.
- Fix:
  - `server/src/members/members.service.ts`
  - union-backed parenting flows now require a binary distinct union shape before inferring parents or accepting the parent-union invariant
- Ripple assessment:
  - affects genealogy consistency, tree rendering, audit accuracy, and public-tree spouse/parent coherence
  - no direct payment, cashflow, payable/receivable, order, or auth impact observed
- Status after fix: `PASSED`

## Harness issues observed during execution

- The first targeted suite run also surfaced two false failures in pre-existing cases because the initial test data accidentally created an editable union from the same members used by the “no union” invariants.
- This was a test setup contamination in `server/test/members/members-tree.contract.e2e-spec.ts`, not a product bug. The setup was corrected by moving the editable union onto dedicated members before product fixes were evaluated.
- The first unit rerun failed because `members.service.spec.ts` still mocked `unionModel.findOne()` while the service now uses `unionModel.find()` to evaluate valid binary unions. The mock was updated and the unit pack reran green.

## Regression reruns

- targeted tree/unions rerun after product fixes: `PASSED` with 1 suite and 22 tests
- full e2e regression rerun: `PASSED` with 6 suites and 38 tests
- unit regression rerun: `FAILED -> FIXED -> PASSED` with 4 suites and 35 tests
- backend build rerun: `PASSED`

## Environment notes

- SMTP remained unavailable in this local run. Mail send attempts logged `ECONNREFUSED 127.0.0.1:2525`.
- This did not block auth/subscription/payment/tree verification because the application continues when mail send fails.
- Mail delivery itself remains open and is not marked pass.

## Files updated in this round

- `server/src/members/members.service.ts`
- `server/src/unions/dto/create-union.dto.ts`
- `server/src/unions/schemas/union.schema.ts`
- `server/src/unions/unions.service.ts`
- `server/src/members/members.service.spec.ts`
- `server/test/members/members-tree.contract.e2e-spec.ts`
- `tests/backend/README.md`
- `tests/backend/docs/backend-test-plan.md`
- `tests/backend/docs/backend-test-scenario-matrix.md`
- `tests/backend/docs/backend-test-suite-backlog.md`
- `tests/backend/suites/suite-index.md`
- `tests/backend/artifacts/results/index/latest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R07__backend-tree-malformed-union-write-consume-contracts__20260424T222024+07/manifest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R07__backend-tree-malformed-union-write-consume-contracts__20260424T222024+07/run-summary.md`

## Open risks

- valid 2-partner unions whose genders do not map cleanly to one `father` and one `mother` still lack execution proof for `reparent` and related tree flows
- duplicate valid pair unions are still not prevented by a uniqueness guarantee at the DB layer
- VNPay return and verify flows are still unverified
- register rollback on partial side-effect failure is still unverified
- true payment concurrency/race behavior is still unverified
- billing-history list visibility policy for `GET /api/subscriptions/payments` is still unresolved
- mail delivery behavior is still unverified
- public contract still has no dedicated `unions` payload; completeness currently relies on spouse inference in `members`

## Next recommended backend wave

1. Add valid-but-ambiguous union parenting cases for `reparent` and related tree flows
2. Add VNPay signed callback and verify scenarios
3. Add payment concurrency race scenarios
4. Add billing-visibility policy tests for `/api/subscriptions/payments`
