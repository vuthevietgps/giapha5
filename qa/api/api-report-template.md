# Mẫu Report API

## 1. Thông tin chung

| Mục | Nội dung |
| --- | --- |
| Dự án | GiaPha5 backend |
| Build/Commit | |
| Môi trường | QA / Staging / Local |
| Người test | |
| Thời gian test | |
| Phạm vi | Auth, Users, Families, Members, Unions, Posts, Backgrounds, Audit, Subscriptions, Payments |

## 2. Tóm tắt kết quả

| Chỉ số | Giá trị |
| --- | --- |
| Tổng số test case | |
| Passed | |
| Failed | |
| Blocked | |
| Not Run | |
| Tỉ lệ pass | |

## 3. Kết quả theo module

| Module | Passed | Failed | Blocked | Ghi chú |
| --- | --- | --- | --- | --- |
| Auth | | | | |
| Users | | | | |
| Families | | | | |
| Members | | | | |
| Unions | | | | |
| Posts | | | | |
| Backgrounds | | | | |
| Audit | | | | |
| Subscriptions | | | | |
| Payments | | | | |

## 4. Danh sách lỗi

| Bug ID | Mức độ | Module | API | Mô tả ngắn | Tái hiện | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- |
| | Critical/High/Medium/Low | | | | Yes/No | Open/Fixed/Retest |

## 5. Rủi ro và lưu ý

- Rủi ro còn lại:
  -
- Phần chưa test hoặc bị chặn:
  -
- Phụ thuộc môi trường ngoài:
  - Mail service
  - VNPay/sandbox thanh toán

## 6. Kết luận đề xuất

- `Ready for retest`
- `Ready for release with known issues`
- `Not ready for release`

## 7. Mẫu nhận xét ngắn

> Đã hoàn tất regression API cho build `___`. Các flow `P0` của `auth`, `families`, `members`, `subscriptions/payments` đã chạy. Hiện còn `__` lỗi mức `High`, trong đó lỗi ảnh hưởng release là `__`. Khuyến nghị `__`.
