# Backend Test Hub

This directory is the canonical backend QA tracking layer.
Executable backend tests still live in:

- `server/src/**/*.spec.ts`
- `server/test/**/*.e2e-spec.ts`

This hub exists so QA and engineering can track:

- what is planned
- what is implemented
- what was actually run
- what failed
- what was fixed
- what is still open

## Structure

- `docs/backend-test-plan.md`: current backend strategy and execution rules
- `docs/backend-test-scenario-matrix.md`: scenario-level status and latest evidence
- `docs/backend-test-suite-backlog.md`: missing or planned suites
- `suites/suite-index.md`: implemented and planned suite catalog
- `artifacts/results/`: append-only run artifacts and indexes

## Rules

- Do not overwrite old result artifacts.
- If a run fails and is fixed, keep the failed state in history and record the rerun outcome as `FAILED -> FIXED -> PASSED`.
- If a scenario cannot be executed because of environment or dependency issues, mark it `BLOCKED`.
- Do not mark unexecuted or partially verified scenarios as `PASSED`.

## Current implemented automation

- 4 unit suites under `server/src`
- 13 self-contained e2e suites under `server/test`
- 1 shared e2e bootstrap helper under `server/test/helpers/e2e-app.helper.ts`

Latest recorded run:

- `TR-20260425-R13`
- `tests/backend/artifacts/results/runs/2026/2026-04/TR-20260425-R13__backend-subscriptions-my-drift-and-billing-audit-trail__20260425T001044+07/`

Everything else in the backend matrix should be treated as planned or open risk until it is executed and recorded in `artifacts/results/`.
