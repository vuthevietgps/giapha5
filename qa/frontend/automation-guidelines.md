# Guideline Tổ Chức Automation Và Naming Conventions

## 1. Mục tiêu automation

- Ưu tiên bảo vệ P0 trước.
- Chỉ tự động hóa những gì ổn định, có thể assert rõ ràng.
- Không cố đưa toàn bộ tree/print vào unit test; các thao tác đồ họa phức tạp nên chia nhỏ giữa integration và manual/E2E.

## 2. Kim tự tháp test đề xuất

- Unit/component: 60-70%
  - validation form
  - permission mapping
  - route guard
  - trạng thái UI theo data
- Integration: 20-30%
  - page + router + mocked service + dialog/snackbar
  - CRUD happy path và negative path
- E2E: 10-15%
  - login
  - role-based navigation
  - member CRUD
  - tree smoke
  - payment/public tree smoke

## 3. Cấu trúc thư mục đề xuất

### Trong `web/src/app`

- Test gần code để dễ bảo trì:
  - `src/app/core/services/auth.service.spec.ts`
  - `src/app/core/services/permission.service.spec.ts`
  - `src/app/app.routes.spec.ts`
  - `src/app/features/auth/login-page.spec.ts`
  - `src/app/features/members/pages/member-form/member-form.spec.ts`
  - `src/app/features/subscription/payment-page.spec.ts`

### Trong `web/testing`

- `web/testing/README.md`
- `web/testing/fixtures/`
- `web/testing/factories/`
- `web/testing/mocks/`
- `web/testing/e2e/`
- `web/testing/e2e/auth/`
- `web/testing/e2e/members/`
- `web/testing/e2e/tree/`
- `web/testing/e2e/payment/`

## 4. Naming conventions

### File test

- Unit/component/integration:
  - `<feature-or-page>.spec.ts`
  - Ví dụ:
    - `login-page.spec.ts`
    - `register-page.spec.ts`
    - `user-form.spec.ts`
    - `tree-page.spec.ts`
- E2E:
  - `<flow>.spec.ts`
  - Ví dụ:
    - `auth-login.spec.ts`
    - `members-create.spec.ts`
    - `payment-bank-transfer.spec.ts`

### Test ID nghiệp vụ

- Định dạng:
  - `FE-<FEATURE>-<PAGE_OR_FLOW>-<NNN>`
- Ví dụ:
  - `FE-AUTH-LOGIN-001`
  - `FE-MEMBER-FORM-003`
  - `FE-PAYMENT-BANK-001`

### `describe` và `it`

- `describe('[Auth][LoginPage]')`
- `it('should redirect to dashboard after successful login')`
- `describe('[Members][MemberForm]')`
- `it('should enable parent selectors after family is selected')`

### `data-testid`

- Định dạng:
  - `<feature>-<page>-<element>-<action>`
- Ví dụ:
  - `auth-login-input-email`
  - `auth-login-input-password`
  - `auth-login-button-submit`
  - `member-form-select-family`
  - `payment-bank-button-check-status`
  - `tree-toolbar-button-export-png`

## 5. Quy ước mock và fixture

- Fixture dữ liệu tĩnh:
  - `family.fixture.ts`
  - `member.fixture.ts`
  - `user.fixture.ts`
  - `payment.fixture.ts`
- Factory cho dữ liệu biến thể:
  - `buildUser()`
  - `buildMember()`
  - `buildPlan()`
- Với HTTP:
  - ưu tiên `HttpTestingController` cho service
  - ưu tiên stub/mock service cho page/component

## 6. Quy tắc chọn loại test

- Dùng unit khi chỉ cần xác minh logic thuần.
- Dùng integration khi cần render UI và mô phỏng tương tác người dùng.
- Dùng E2E khi cần chứng minh luồng xuyên page hoặc xuyên router.
- Không dùng E2E cho mọi nhánh validation nhỏ; giữ E2E ngắn, ổn định, ít phụ thuộc.

## 7. Danh sách automation nên làm trước

1. `auth.service.spec.ts`
2. `permission.service.spec.ts`
3. `app.routes.spec.ts` hoặc test cho `authGuard`
4. `login-page.spec.ts`
5. `register-page.spec.ts`
6. `user-form.spec.ts`
7. `member-form.spec.ts`
8. `payment-page.spec.ts`
9. `payment-callback-page.spec.ts`
10. `public-tree-page.spec.ts`

## 8. Chất lượng assertion

- Assert route thay đổi đúng.
- Assert message lỗi/success đúng.
- Assert element bị disable/enable đúng.
- Assert request chỉ gọi một lần khi submit/loading.
- Assert empty/error/loading states xuất hiện đúng lúc.
- Với tree/print, assert theo tín hiệu UI chính thay vì snapshot quá lớn.

## 9. Điều không nên làm

- Không dựa vào text mơ hồ hoặc selector CSS dài, dễ vỡ.
- Không viết E2E phụ thuộc dữ liệu production-like khó reset.
- Không gom nhiều flow khác nhau vào một test dài.
- Không chỉ test happy path cho payment, auth và permission.
