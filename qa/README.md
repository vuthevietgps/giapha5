# QA Workspace

## Mục đích

`qa/` là nơi team QA và dev cùng dùng để:

- quản lý kế hoạch test tổng thể;
- chuẩn hóa template test case, test run, test result, daily report, bug summary, release sign-off;
- theo dõi traceability giữa yêu cầu, testcase, kết quả và defect;
- lưu kết quả test và evidence theo chu kỳ phát hành.

Khung này được thiết kế để dùng ngay với hiện trạng repo còn ít tài liệu QA. Nó ưu tiên Markdown, dễ review qua Git, dễ copy thành file thực tế cho từng đợt test.

## Cấu trúc thư mục

Phần dưới đây mô tả khung QA chung được seed trong đợt này. `qa/` có thể còn thêm thư mục chuyên biệt khác do agent hoặc team khác quản lý.

```text
qa/
|-- README.md
|-- MASTER_TEST_PLAN.md
|-- api/
|   |-- README.md
|   |-- api-test-plan.md
|   |-- api-test-matrix.md
|   |-- api-test-case-template.md
|   `-- api-report-template.md
|-- frontend/
|   |-- README.md
|   |-- test-plan.md
|   |-- test-matrix.md
|   |-- checklists.md
|   |-- test-case-samples.md
|   `-- automation-guidelines.md
|-- templates/
|   |-- BUG_SUMMARY_TEMPLATE.md
|   |-- DAILY_QA_REPORT_TEMPLATE.md
|   |-- RELEASE_SIGNOFF_TEMPLATE.md
|   |-- TEST_CASE_TEMPLATE.md
|   |-- TEST_RESULT_TEMPLATE.md
|   |-- TEST_RUN_TEMPLATE.md
|   `-- TRACEABILITY_MATRIX_TEMPLATE.md
|-- reports/
|   |-- README.md
|   |-- daily/
|   |   `-- README.md
|   `-- releases/
|       `-- README.md
|-- results/
|   |-- README.md
|   |-- evidence/
|   |   `-- README.md
|   `-- executions/
|       `-- README.md
`-- traceability/
    |-- README.md
    `-- TRACEABILITY_MATRIX.md
```

Lưu ý:

- `qa/api/**` là bộ kế hoạch và matrix cho backend/API.
- `qa/frontend/**` là bộ kế hoạch và matrix cho Angular frontend.
- `qa/templates/**` giữ vai trò template chuẩn dùng chung cho cả hai nhánh test.
- Nếu sau này cần chia nhỏ thêm theo bề mặt test như mobile, security, performance, có thể thêm thư mục con riêng sau khi thống nhất naming.

## Quy ước dùng nhanh

### 1. Định danh

- Requirement: `RQ-<AREA>-<NNN>`
- Test case: `TC-<AREA>-<NNN>`
- Test run: `TR-<YYYYMMDD>-<RELEASE/CYCLE>`
- Test result: `RS-<YYYYMMDD>-<SESSION>`
- Daily report: `<YYYY-MM-DD>-qa-daily-report.md`
- Release sign-off: `<release>-qa-signoff.md`

Ví dụ:

- `RQ-AUTH-001`
- `TC-TREE-012`
- `TR-20260424-RC1`
- `2026-04-24-qa-daily-report.md`

### 2. Cách team vận hành

1. Cập nhật `qa/traceability/TRACEABILITY_MATRIX.md` trước khi viết testcase mới hoặc khi scope thay đổi.
2. Chọn nhánh tài liệu phù hợp:
   - API: `qa/api/`
   - Frontend: `qa/frontend/`
3. Tạo testcase từ `qa/templates/TEST_CASE_TEMPLATE.md` hoặc dùng catalog/test case mẫu trong từng nhánh.
4. Tạo file test run cho đợt test từ `qa/templates/TEST_RUN_TEMPLATE.md`.
5. Ghi kết quả chi tiết bằng `qa/templates/TEST_RESULT_TEMPLATE.md` và lưu evidence tương ứng trong `qa/results/evidence/`.
6. Nếu có nhu cầu automation, tổ chức code test theo:
   - Backend: `server/test/`
   - Frontend: `web/testing/`
7. Tổng hợp hằng ngày bằng `qa/templates/DAILY_QA_REPORT_TEMPLATE.md`.
8. Trước khi chốt release, dùng `qa/templates/BUG_SUMMARY_TEMPLATE.md` và `qa/templates/RELEASE_SIGNOFF_TEMPLATE.md`.

### 3. Nguyên tắc cập nhật

- Mỗi defect phải có bước tái hiện rõ, môi trường, build, dữ liệu test và bằng chứng.
- Mỗi testcase phải map được về ít nhất một `RQ-*`.
- Không đánh dấu `Passed` nếu chưa có kết quả thực thi trong cycle hiện tại.
- `Blocked` chỉ dùng khi bị chặn thực sự bởi môi trường, dữ liệu, quyền truy cập hoặc bug nền.
- Evidence nên đặt tên bám ID testcase hoặc defect, ví dụ: `TC-AUTH-003-login-error.png`.

## Gợi ý quy trình tối thiểu cho mỗi cycle

### Chuẩn bị

- rà scope từ backlog, release note, ticket và thay đổi code;
- cập nhật traceability;
- xác định smoke list và regression list;
- chốt môi trường, tài khoản, seed data, owner xử lý blocker.

### Thực thi

- chạy smoke trước;
- nếu smoke ổn, mở rộng sang functional/regression;
- defect nghiêm trọng phải được phản ánh ngay vào daily report;
- testcase chưa rõ expected result phải được làm rõ trước khi chạy tiếp.

### Chốt cycle

- cập nhật bug summary;
- đánh giá residual risk;
- phát hành sign-off với quyết định rõ: `Go`, `Go with risk`, hoặc `No-Go`.

## Phạm vi khởi tạo của bộ khung này

Khung QA hiện tại được seed dựa trên:

- chức năng mô tả trong `README.md`;
- danh sách ưu tiên/rủi ro trong `docs/review-backlog.md`.

Do repo chưa có catalogue yêu cầu chính thức, traceability hiện tại là bản khởi tạo để team tiếp tục bóc tách chi tiết.
