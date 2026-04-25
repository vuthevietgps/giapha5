# Checklist Regression, UI, Responsive, Accessibility

## 1. Regression Checklist

### Auth và điều hướng

- [ ] User chưa đăng nhập truy cập route protected bị chuyển về `/login`
- [ ] User đã đăng nhập vào `/login` hoặc `/register` bị chuyển về `/dashboard`
- [ ] Logout xóa session cục bộ và không còn truy cập được route protected
- [ ] Refresh trang khi đã login vẫn giữ phiên hợp lệ
- [ ] Menu sidebar hiển thị đúng theo quyền
- [ ] Mobile drawer mở/đóng bình thường

### CRUD nền tảng

- [ ] Users list tải được dữ liệu và filter hoạt động
- [ ] User form đổi role làm thay đổi field bắt buộc đúng cách
- [ ] Family create/edit/delete hoạt động
- [ ] Position create/edit/delete hoạt động
- [ ] Member create/edit/delete hoạt động
- [ ] Member form load đúng options family, father, mother, spouse, children
- [ ] Upload ảnh thành viên không làm hỏng luồng save

### Dữ liệu và màn hình nghiệp vụ

- [ ] Dashboard load đúng stats và trạng thái gói dịch vụ
- [ ] Posts list mở được dialog tạo bài viết
- [ ] Plans chọn gói paid dẫn đúng sang payment
- [ ] Payment bank transfer hiển thị đủ QR, số tài khoản, nội dung CK
- [ ] Payment callback thành công/thất bại hiển thị đúng CTA
- [ ] Public tree mở được với token hợp lệ
- [ ] Public tree hiển thị error state với token sai/hết hạn
- [ ] Print page load được nền, cây, couplet, decor
- [ ] Export PNG từ tree không bị lỗi runtime
- [ ] Export poster từ print không bị lỗi runtime

### Cây gia phả và public share

- [ ] Đổi family trên tree page làm mới đúng cây, không giữ state sai từ family trước
- [ ] Focus nhánh bằng query param hoạt động lại sau refresh/back/forward
- [ ] Focus vào member nữ không làm sai label spouse hoặc hỏng thao tác thêm con
- [ ] Nút `Tải lại` trên tree thực sự làm mới dữ liệu từ server theo kỳ vọng sản phẩm
- [ ] Retry từ error banner tree tải lại được dữ liệu sau khi backend hồi phục
- [ ] Public tree với token bị thu hồi hiển thị error state rõ ràng
- [ ] Public tree với dữ liệu thiếu spouse/thiếu root không crash

## 2. UI Checklist

- [ ] Tất cả page có tiêu đề chính rõ ràng
- [ ] Không có text vỡ layout ở desktop
- [ ] Không có button/icon bị cắt
- [ ] Snackbar, dialog, loading spinner hiển thị đúng lớp phủ
- [ ] Empty state và error state có thông điệp rõ ràng
- [ ] Confirm dialog delete có tiêu đề và CTA đúng ngữ cảnh
- [ ] Form field lỗi hiển thị sau khi touch/submit sai
- [ ] Không còn nội dung scaffold hoặc text thử nghiệm kiểu `Hello, web`
- [ ] Không có lỗi encoding hiển thị ra UI bản release

## 3. Responsive Checklist

### Mobile

- [ ] Login/register/forgot/reset không bị tràn ngang
- [ ] Sidebar chuyển sang drawer, đóng sau khi chọn menu
- [ ] Table/list quan trọng vẫn đọc được hoặc scroll hợp lý
- [ ] Public tree không vỡ card ở màn nhỏ
- [ ] Payment CTA không chồng lấn
- [ ] Print và tree có hành vi chấp nhận được trên mobile, không crash
- [ ] Context menu tree trên mobile không tràn ra ngoài màn hình
- [ ] HUD/tree toolbar còn dùng được trên viewport hẹp

### Tablet

- [ ] Dashboard cards không chồng lên nhau
- [ ] Form 1 cột hoặc 2 cột hợp lý
- [ ] Dialog không vượt viewport

### Desktop

- [ ] Sidebar fixed và content không bị che
- [ ] Tree/print có đủ không gian thao tác
- [ ] Bảng users/members/families giữ alignment ổn định

## 4. Accessibility Checklist

- [ ] Có thể tab qua các CTA chính theo thứ tự hợp lý
- [ ] Button chỉ có icon phải có nhãn truy cập phù hợp hoặc tooltip dễ hiểu
- [ ] Form field có label rõ ràng
- [ ] Trạng thái loading/error/success đọc được bằng text, không chỉ bằng màu
- [ ] Tương phản text đủ đọc ở banner, badge, chip
- [ ] Dialog mở thì focus nằm trong dialog
- [ ] ESC hoặc hành vi đóng dialog hoạt động nhất quán
- [ ] Không dùng placeholder thay cho label chính
- [ ] Link và button có trạng thái focus nhìn thấy được
- [ ] Button icon-only trên tree/payment/print có `aria-label` hoặc ngữ nghĩa tương đương

## 5. Checklist trước release

- [ ] P0 manual pass
- [ ] P0 automation pass
- [ ] Không còn lỗi console nghiêm trọng ở auth, members, tree, payment
- [ ] Không còn request 4xx/5xx ngoài các case negative đã biết
- [ ] Regression public route và protected route đều pass
