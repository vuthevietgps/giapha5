# Tài liệu QA API

Bộ tài liệu này dùng cho QA kiểm thử backend NestJS tại `server/` với base path mặc định là `/api`.

## Danh mục

- `api-test-plan.md`: kế hoạch kiểm thử API theo phạm vi, rủi ro và chiến lược thực thi.
- `api-test-matrix.md`: test matrix và checklist theo module/endpoint.
- `api-test-case-template.md`: mẫu test case chi tiết kèm một số case mẫu dùng ngay.
- `api-report-template.md`: mẫu báo cáo kết quả test API.

## Thông tin hệ thống đã xác nhận từ code

- Global prefix: `/api`
- Validation: `ValidationPipe` bật `whitelist`, `forbidNonWhitelisted`, `transform`
- CORS: cho phép `Content-Type`, `Authorization`
- Xác thực/phân quyền chính: `GIAM_DOC`, `QUAN_LY`, `NHAN_VIEN`, `TRUONG_HO`
- Module API chính đã rà soát: `auth`, `users`, `families`, `members`, `unions`, `posts`, `backgrounds`, `audit`, `subscriptions`, `payments`

## Lưu ý dùng tài liệu

- Ưu tiên chạy `P0` trước khi merge hoặc release.
- Khi ghi nhận lỗi, đối chiếu cả `status code`, message lỗi và tác động dữ liệu sau thao tác.
- Với module thanh toán/email, ưu tiên mock hoặc sandbox để tránh side effect ngoài môi trường test.
