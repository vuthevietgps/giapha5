# Backend Result Artifacts

All backend result artifacts are append-only.

## Rules

- Each run gets its own folder under `runs/YYYY/YYYY-MM/`.
- Do not overwrite old run folders.
- Use `index/latest.json` only as a pointer to the latest recorded run.
- Human-readable detail goes into `run-summary.md`.
- Machine-readable metadata goes into `manifest.json`.

## Current latest run

- `TR-20260425-R13`
