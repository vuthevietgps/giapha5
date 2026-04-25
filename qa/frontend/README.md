# QA Frontend

Tài liệu này bao phủ kiểm thử frontend cho Angular app trong `web/`, tập trung vào các luồng đang hiện diện trong code:

- Auth: `login`, `register`, `forgot-password`, `reset-password`, `verify-email`
- Điều hướng và phân quyền: `authGuard`, sidebar theo quyền, logout, redirect
- Dashboard
- Families, Members, Member Tree, Branch, Branch Calendar, Calendar
- Public Tree (`/share/:token`)
- Printing (`/print`)
- Posts
- Users
- Positions
- Subscription và Payment

## Hiện trạng test

Baseline hiện tại rất mỏng:

- `web/src/app/app.spec.ts`: smoke test mặc định, còn dấu vết scaffold `Hello, web`
- `web/src/app/features/families/services/family.spec.ts`: chỉ kiểm tra tạo service
- `web/src/app/features/users/services/user.spec.ts`: chỉ kiểm tra tạo service

Điều này có nghĩa phần lớn rủi ro frontend hiện vẫn chưa được tự động hóa.

## Bộ tài liệu

- [Kế hoạch test](./test-plan.md)
- [Test matrix theo feature/page](./test-matrix.md)
- [Checklist regression, UI, responsive, accessibility](./checklists.md)
- [Mẫu test case chi tiết](./test-case-samples.md)
- [Guideline automation và naming conventions](./automation-guidelines.md)

## Ghi chú phạm vi

- Tài liệu này chỉ bám vào frontend Angular hiện có trong `web/src/app/**`.
- Không giả định backend đã ổn định tuyệt đối; các case lỗi API, empty state và permission denial được xem là bắt buộc.
- Các route có trong `app.routes.ts` được dùng làm nguồn sự thật cho coverage theo page.
