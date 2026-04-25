# Frontend Testing Workspace

Thư mục này là entrypoint cho automation frontend của Angular app.

## Mục đích

- Chứa fixture, mock, factory và E2E assets dùng lại.
- Giữ phần test support tách khỏi source app nhưng vẫn thuộc workspace frontend.
- Là điểm nối giữa code test trong `web/src/app/**/*.spec.ts` và tài liệu QA trong `qa/frontend/`.

## Tài liệu liên quan

- `../../qa/frontend/README.md`
- `../../qa/frontend/test-plan.md`
- `../../qa/frontend/test-matrix.md`
- `../../qa/frontend/checklists.md`
- `../../qa/frontend/test-case-samples.md`
- `../../qa/frontend/automation-guidelines.md`

## Cấu trúc đề xuất

- `web/testing/fixtures/`
- `web/testing/factories/`
- `web/testing/mocks/`
- `web/testing/e2e/`

## Nguyên tắc ngắn

- Unit/component spec để gần code trong `src/app/**`.
- Dữ liệu dùng lại để trong `web/testing/**`.
- E2E chỉ cover luồng P0/P1, không thay thế toàn bộ regression manual.
