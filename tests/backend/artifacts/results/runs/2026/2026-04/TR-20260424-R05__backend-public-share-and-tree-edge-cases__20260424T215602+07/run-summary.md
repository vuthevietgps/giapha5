# Backend Run Summary

## Run metadata

- Test Run ID: `TR-20260424-R05`
- Result ID: `RS-20260424-BE-R05`
- Window: `2026-04-24 21:49:30 +07` to `2026-04-24 21:56:02 +07`
- Scope: public-share and tree edge cases, malformed-id contract hardening, full backend regression
- Environment: local desktop, PowerShell, `server` package, MongoMemoryServer-backed e2e, git ref `b7c6794`

## Commands executed

1. `npm run test:e2e -- --runInBand server/test/families/families-public-share.contract.e2e-spec.ts server/test/members/members-tree.contract.e2e-spec.ts`
2. `npm run test:e2e -- --runInBand server/test/families/families-public-share.contract.e2e-spec.ts server/test/members/members-tree.contract.e2e-spec.ts`
3. `npm run test:e2e -- --runInBand`
4. `npm test -- --runInBand`
5. `npm test -- --runInBand`
6. `npm run build`

## Real results

| Case ID | Result | Notes |
| --- | --- | --- |
| `BE-PUBLIC-006` | `FAILED -> FIXED -> PASSED` | public family response no longer leaks `shareToken`, `isPublic`, `contactPhone`, or timestamps |
| `BE-PUBLIC-007` | `FAILED -> FIXED -> PASSED` | public members now include spouse links even when the relationship exists only in a 2-person union |
| `BE-TREE-008` | `PASSED` | `setChildren` rejected parent assignment that would violate the union invariant |
| `BE-TREE-009` | `PASSED` | `normalizeForMember` ignored dirty cross-family spouse backlinks and did not create cross-family unions |
| `BE-TREE-010` | `FAILED -> FIXED -> PASSED` | malformed `GET /api/members/:id` now returns `400` |
| `BE-TREE-011` | `FAILED -> FIXED -> PASSED` | malformed `GET /api/members/tree?family=...` now returns `400` instead of drifting to `404` |
| `BE-TREE-012` | `FAILED -> FIXED -> PASSED` | malformed `PUT /api/members/:id/children` now returns `400` |
| `BE-TREE-013` | `FAILED -> FIXED -> PASSED` | malformed `PUT /api/members/:id/reparent` now returns `400` |
| `BE-TREE-014` | `FAILED -> FIXED -> PASSED` | malformed `GET /api/unions/:id` now returns `400` |
| `BE-PUBLIC-002` | `PASSED` | token revocation remained green |
| `BE-PUBLIC-003` | `PASSED` | valid public token remained green |
| `BE-PUBLIC-004` | `PASSED` | invalid public token remained green |
| `BE-PUBLIC-005` | `PASSED` | toggle-share auth matrix remained green |
| `BE-TREE-003` | `PASSED` | reparent cycle remained green |
| `BE-TREE-004` | `PASSED` | rooted tree contract remained green |
| `BE-TREE-005` | `PASSED` | child-create-via-union remained green |
| `BE-E2E-001` | `PASSED` | full e2e smoke rerun passed |
| `BE-UNIT-001` | `FAILED -> FIXED -> PASSED` | unit pack failed once due outdated family-service mock, then reran cleanly |
| `BE-BUILD-001` | `PASSED` | backend build passed |

## Bugs found this round

### `BE-PUBLIC-006`

- Detection source: new public-share e2e payload-minimization coverage.
- Symptom:
  - `GET /api/families/public/:token` returned raw family fields including `shareToken`, `isPublic`, `contactPhone`, and timestamps.
- Reproduce:
  1. enable public sharing for a family
  2. call `GET /api/families/public/:token`
  3. old behavior returned raw share-management/internal fields in the response body
- Root cause:
  - `findByShareToken()` returned the raw `Family` document and relied on schema `toJSON`, which did not redact public-unsafe fields.
- Fix:
  - `server/src/families/families.service.ts`
  - introduced a minimal public-family serializer and internal `findPublicFamilyRecord()` path so public reads no longer expose admin/share fields
- Ripple assessment:
  - affects public contract and privacy
  - affects alerts/reports/media only indirectly through public-surface data leakage; no direct finance/cashflow/order impact observed
- Status after fix: `PASSED`

### `BE-PUBLIC-007`

- Detection source: new public-share e2e spouse-only-in-union coverage.
- Symptom:
  - public members response omitted spouse links when the relationship existed only in `unions`, which left the public tree incomplete.
- Reproduce:
  1. seed two members in the same family without `member.spouse`
  2. create a 2-person union linking them
  3. call `GET /api/families/public/:token/members`
  4. old behavior returned both members without spouse links
- Root cause:
  - `getPublicMembers()` read only member fields and never materialized spouse relationships from unions, while the frontend public tree relied on spouse links in the members payload.
- Fix:
  - `server/src/families/families.service.ts`
  - public members serialization now infers spouse links from 2-person unions when explicit member-level spouse references are absent
- Ripple assessment:
  - affects public tree rendering and genealogy completeness
  - no direct payment, cashflow, payable/receivable, order, or auth impact observed
- Status after fix: `PASSED`

### `BE-TREE-010/011/012/013/014`

- Detection source: new malformed-id e2e coverage across members/unions routes.
- Symptom:
  - malformed ids produced `500 CastError` on `members/:id`, `members/:id/children`, `members/:id/reparent`, and `unions/:id`
  - malformed `family` query on `members/tree` drifted to `404` through permission logic instead of explicit validation
- Reproduce:
  1. authenticate as a family manager
  2. call the affected endpoints with `not-a-valid-object-id`
  3. old behavior returned `500` or contract-drift `404`
- Root cause:
  - controllers accepted raw param/query ids and some inline bodies without MongoId parsing/DTO validation before service calls reached Mongoose `findById(...)`
- Fix:
  - `server/src/common/pipes/parse-mongo-id.pipe.ts`
  - `server/src/members/members.controller.ts`
  - `server/src/unions/unions.controller.ts`
  - `server/src/members/dto/set-children.dto.ts`
  - `server/src/members/dto/reparent-member.dto.ts`
  - added explicit param/query MongoId parsing and DTO validation for edge routes so malformed ids now return `400`
- Ripple assessment:
  - affects public contract quality, auth boundary clarity, and operational alerts because 500s pollute error monitoring
  - no direct finance/cashflow/order impact observed
- Status after fix: `PASSED`

## Regression reruns

- targeted family/tree edge-case rerun after product fixes: `PASSED` with 2 suites and 17 tests
- full e2e regression rerun: `PASSED` with 6 suites and 28 tests
- unit regression rerun: `FAILED -> FIXED -> PASSED` with 4 suites and 35 tests
- backend build rerun: `PASSED`

## Environment notes

- SMTP remained unavailable in this local run. Mail send attempts logged `ECONNREFUSED 127.0.0.1:2525`.
- This did not block auth/subscription/payment/public/tree verification because the application continues when mail send fails.
- Mail delivery itself remains open and is not marked pass.

## Files updated in this round

- `server/src/common/pipes/parse-mongo-id.pipe.ts`
- `server/src/families/families.service.ts`
- `server/src/members/members.controller.ts`
- `server/src/members/dto/reparent-member.dto.ts`
- `server/src/members/dto/set-children.dto.ts`
- `server/src/unions/unions.controller.ts`
- `server/src/families/families.service.spec.ts`
- `server/test/families/families-public-share.contract.e2e-spec.ts`
- `server/test/members/members-tree.contract.e2e-spec.ts`
- `tests/backend/README.md`
- `tests/backend/docs/backend-test-plan.md`
- `tests/backend/docs/backend-test-scenario-matrix.md`
- `tests/backend/docs/backend-test-suite-backlog.md`
- `tests/backend/suites/suite-index.md`
- `tests/backend/artifacts/results/index/latest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R05__backend-public-share-and-tree-edge-cases__20260424T215602+07/manifest.json`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260424-R05__backend-public-share-and-tree-edge-cases__20260424T215602+07/run-summary.md`

## Open risks

- VNPay return and verify flows are still unverified
- register rollback on partial side-effect failure is still unverified
- true payment concurrency/race behavior is still unverified
- billing-history list visibility policy for `GET /api/subscriptions/payments` is still unresolved
- `setChildren` with parent `gender='other'` is still unverified
- malformed legacy unions with `3+` or duplicate partners are still unverified
- mail delivery behavior is still unverified

## Next recommended backend wave

1. Add VNPay signed callback and verify scenarios
2. Add remaining tree/union dirty-data edge cases for unsupported parent gender and malformed legacy unions
3. Add payment concurrency race scenarios
4. Add billing-visibility policy tests for `/api/subscriptions/payments`
