# Traceability Matrix

Ma trận này là bản khởi tạo ở mức tổng quan để team bắt đầu map coverage. Trạng thái hiện tại phản ánh mức sẵn sàng tài liệu, không khẳng định rằng hệ thống đã được test đầy đủ.

| Requirement ID | Mô tả yêu cầu/rủi ro | Nguồn yêu cầu | Module | Test Case ID | Test Run/Test Result mới nhất | Defect liên quan | Owner | Coverage status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `RQ-AUTH-001` | Người dùng đăng nhập, duy trì phiên và xử lý refresh token/401 đúng | `README.md`, `docs/review-backlog.md` | Auth | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-ACCESS-001` | Phân quyền và tenant/family boundary không cho truy cập sai phạm vi | `docs/review-backlog.md` | Auth, Users, Posts, Payments, Audit | Chưa tạo | Chưa có | Chưa tổng hợp | QA + Dev | Planned |
| `RQ-FAMILY-001` | CRUD dòng họ hoạt động đúng và dữ liệu thuộc đúng family | `README.md` | Families | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-MEMBER-001` | CRUD thành viên, tìm kiếm, lọc và dữ liệu hiển thị đúng | `README.md` | Members | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-UNION-001` | Tạo/xóa quan hệ hôn phối không làm sai cấu trúc dữ liệu liên quan | `README.md` | Unions | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-TREE-001` | Cây gia phả render đúng, zoom/pan/HUD/layout hoạt động ổn định | `README.md`, `docs/review-backlog.md` | Tree | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-PUBLIC-001` | Public share hiển thị đúng dữ liệu được phép công khai và giữ logic layout cần thiết | `docs/review-backlog.md` | Public share | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-BG-001` | Ảnh nền được upload/list/delete đúng và scope theo family | `README.md`, `docs/review-backlog.md` | Backgrounds | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-PRINT-001` | In/export cây ra PNG đúng khổ giấy, orientation và nội dung hiển thị | `README.md` | Printing/Export | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-POST-001` | Quản lý posts đúng quyền và UX read-only không gây thao tác sai | `docs/review-backlog.md` | Posts | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-USERS-001` | Quản trị user hoạt động đúng quyền và dữ liệu hiển thị nhất quán | `README.md` | Users | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-AUDIT-001` | Audit ghi nhận và truy xuất đúng phạm vi cần thiết | `README.md`, `docs/review-backlog.md` | Audit | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
| `RQ-MOBILE-001` | Luồng chính usable trên mobile ở các màn tree toolbar, action menu, public share | `docs/review-backlog.md` | Responsive UX | Chưa tạo | Chưa có | Chưa tổng hợp | QA | Planned |
