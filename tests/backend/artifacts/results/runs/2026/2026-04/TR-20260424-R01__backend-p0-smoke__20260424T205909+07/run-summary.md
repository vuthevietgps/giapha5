# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R01`
- Result ID: `RS-20260424-BE-R01`
- Window: `2026-04-24 20:51:11 +07` to `2026-04-24 20:59:09 +07`
- Scope: backend build smoke, unit regression, smoke e2e, targeted tree legacy regressions
- Environment: local desktop, PowerShell, `server` package, MongoMemoryServer for smoke e2e, git ref `b7c6794`

## Commands executed

1. `npm test -- --runInBand`
2. `npm run test:e2e -- --runInBand`
3. `npm run build`
4. rerun after fixes:
   - `npm run build`
   - `npm test -- --runInBand`
   - `npm run test:e2e -- --runInBand`

## Real results

| Case ID | Result | Evidence |
| --- | --- | --- |
| `BE-UNIT-001` | `PASSED` | 4 suites, 35 tests passed |
| `BE-E2E-001` | `FAILED -> FIXED -> PASSED` | initial run failed with Mongo auth retries and timeout; rerun passed with self-contained MongoMemoryServer |
| `BE-BUILD-001` | `FAILED -> FIXED -> PASSED` | first build after family service change failed on `Family.id` typing; type-safe fix applied and rerun passed |
| `BE-TREE-001` | `GAP FOUND -> FIXED -> PASSED` | new regression added for union partner refs stored as legacy strings |
| `BE-PUBLIC-001` | `GAP FOUND -> FIXED -> PASSED` | new regression added for public member lookup with mixed family ref storage |
| `BE-FAMILY-001` | `GAP FOUND -> FIXED -> PASSED` | new regression added for family cascade delete with mixed family ref storage |

## Bugs found

### `BE-TINFRA-001`

- Symptom: `npm run test:e2e -- --runInBand` failed because the e2e suite booted `AppModule` against the real Mongo environment and the spec still asserted `GET /` instead of the real `/api` route contract.
- Reproduce:
  - run `npm run test:e2e -- --runInBand`
  - observe `MongooseModule` auth retry errors and timeout in `beforeEach`
- Root cause:
  - smoke e2e was not self-contained
  - route contract drifted from `main.ts` because the global prefix was not applied in the test harness
- Fix:
  - `server/test/app.e2e-spec.ts`
  - switched to `MongoMemoryServer`
  - applied global prefix `api`
  - updated the smoke request from `/` to `/api`
- Status after fix: `PASSED`

### `BE-TREE-001`

- Symptom: member creation with both `father` and `mother` can reject valid legacy data if the related union stores partner refs as strings while the service checks with ObjectIds only.
- Reproduce:
  - store a union in the same family with `partners: [fatherIdAsString, motherIdAsString]`
  - call member creation with `father` and `mother` that resolve through normal ObjectId input
  - old query misses the union and throws the union validation error
- Root cause:
  - `MembersService.validateUnionExists()` used `$all` with ObjectId-only values
- Fix:
  - `server/src/members/members.service.ts`
  - `server/src/members/members.service.spec.ts`
  - changed union lookup to match both `String` and `ObjectId` variants
- Status after fix: `PASSED`

### `BE-PUBLIC-001`

- Symptom: public member lookup and family delete cascade can miss legacy rows when the stored `family` reference type differs between `String` and `ObjectId`.
- Reproduce:
  - store member or union rows with `family` as string while the live family document resolves `_id` as ObjectId
  - call public member lookup or family delete cascade
  - old exact-match filter skips matching legacy rows
- Root cause:
  - exact-match family filters did not account for mixed legacy ref storage
- Fix:
  - `server/src/families/families.service.ts`
  - `server/src/families/families.service.spec.ts`
  - changed public lookup and cascade delete to use mixed-ref matching
- Status after fix: `PASSED`

## Regression reruns

- full unit regression rerun: `PASSED`
- smoke e2e rerun: `PASSED`
- backend build rerun: `PASSED`

## Files updated in this round

- `server/src/members/members.service.ts`
- `server/src/members/members.service.spec.ts`
- `server/src/families/families.service.ts`
- `server/src/families/families.service.spec.ts`
- `server/test/app.e2e-spec.ts`
- `tests/backend/README.md`
- `tests/backend/docs/backend-test-plan.md`
- `tests/backend/docs/backend-test-scenario-matrix.md`
- `tests/backend/docs/backend-test-suite-backlog.md`
- `tests/backend/suites/suite-index.md`
- `tests/backend/artifacts/results/README.md`
- `tests/backend/artifacts/results/index/latest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R01__backend-p0-smoke__20260424T205909+07/manifest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R01__backend-p0-smoke__20260424T205909+07/run-summary.md`

## Open risks

- `GET /api/subscriptions/plans` public contract still needs execution proof
- `GET /api/auth/me` unauth behavior still needs execution proof
- `PlanLimitInterceptor` invalid family handling still needs regression
- payment create, confirm, status, and idempotency still need real suites

## Next recommended backend wave

1. Add `auth` contract e2e for `login`, `refresh`, and unauth `me`
2. Add `subscriptions` public-plan suite
3. Add `payments` lifecycle and idempotency suite
4. Add `members` plan-limit regression
