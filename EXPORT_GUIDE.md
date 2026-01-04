# Hướng dẫn xuất file cây gia phả chất lượng cao

## 📋 Tổng quan

Hệ thống cung cấp 2 chế độ xuất file:

### 1. **Xuất theo kích thước thực (KHUYẾN NGHỊ cho in ấn)** ⭐
- Giữ nguyên **tỉ lệ 1:1** so với màn hình hiện tại
- Không scale, không fit - chính xác tuyệt đối
- Xuất ở DPI cao để in nét

### 2. **Xuất theo khổ giấy chuẩn**
- Scale để fit vào khổ A4, A3, hoặc 2:1
- Có thể bị co/dãn để vừa khung
- Phù hợp khi muốn kích thước cố định

---

## 🎯 Các tùy chọn xuất file

### **Xuất theo kích thước thực - 300 DPI** (Tốt nhất)
```
Kích thước output = Kích thước màn hình × 3.125
Ví dụ: 2000×1000 px → 6250×3125 px @ 300 DPI
```
✅ **Dùng cho:**
- In giấy A4, A3, A2, A1, A0
- In khổ lớn 1-2 mét
- Chất lượng sắc nét, không vỡ

**Hướng dẫn:**
1. Điều chỉnh cây trên màn hình đến kích thước/tỉ lệ mong muốn
2. Zoom, pan để bố cục đẹp
3. Thêm đủ decor, text, câu đối
4. Bấm **"Xuất theo kích thước thực (300 DPI)"**
5. File PNG sẽ có kích thước = màn hình × 3.125

### **Xuất theo kích thước thực - 600 DPI** (Siêu nét)
```
Kích thước output = Kích thước màn hình × 6.25
Ví dụ: 2000×1000 px → 12500×6250 px @ 600 DPI
```
✅ **Dùng cho:**
- In giấy khổ lớn (A0, 2m×1m)
- Yêu cầu chất lượng cực cao
- In trên canvas, vải, gỗ

⚠️ **Lưu ý:** File rất nặng (có thể 20-50 MB)

### **HQ 2:1 - 18670×9500 px**
- Kích thước cố định tỉ lệ 2:1
- Scale để fit vào khung
- Dùng cho in khổ cực lớn (2m × 1m)

### **A4 / A3 (300 DPI)**
- Scale để fit vào khổ giấy chuẩn
- A4: 2480×3508 px (dọc) / 3508×2480 px (ngang)
- A3: 3508×4961 px (dọc) / 4961×3508 px (ngang)

---

## 💡 Quy trình khuyến nghị

### Bước 1: Thiết kế trên màn hình
1. Chọn dòng họ từ dropdown
2. Điều chỉnh **"Top padding"** để hạ cây xuống (tránh bị cắt phần đầu)
3. Zoom/Pan để cây vừa với viewport
4. Thêm background nếu cần
5. Thêm decor (scroll, rồng)
6. Thêm text/câu đối
7. Di chuyển/scale các layer cho đẹp

### Bước 2: Kiểm tra trước khi xuất
- ✅ Tất cả text hiển thị rõ ràng
- ✅ Connections (đường nối) vẽ đúng
- ✅ Không bị cắt xén phần nào
- ✅ Background/decor đã load xong (không còn loading)

### Bước 3: Xuất file
1. Bấm nút **"Tải xuống"**
2. Chọn **"Xuất theo kích thước thực (300 DPI)"**
3. Đợi 5-10 giây
4. File PNG sẽ tự động tải xuống

### Bước 4: Kiểm tra file xuất
- Mở file bằng trình xem ảnh
- Zoom 100% để xem độ nét
- Kiểm tra text có sắc nét không
- Nếu mờ → thử export 600 DPI

---

## 🖨️ Hướng dẫn in ấn

### In A4 (210×297 mm)
```
File cần: 2480×3508 px @ 300 DPI
Hoặc: xuất theo kích thước thực, resize khi in
```

### In A3 (297×420 mm)
```
File cần: 3508×4961 px @ 300 DPI
Hoặc: xuất theo kích thước thực, resize khi in
```

### In khổ lớn (1-2 mét)
```
Option 1: Xuất "theo kích thước thực 600 DPI"
Option 2: Xuất "HQ 2:1" 18670×9500 px
```

**Đưa file cho tiệm in:**
- Nói rõ muốn in khổ bao nhiêu (VD: 1.5m × 0.75m)
- Giữ nguyên tỉ lệ - không stretch
- In ở 300 DPI trở lên
- Chất liệu: giấy ảnh, canvas, hoặc decal

---

## 🔧 Troubleshooting

### File quá nặng (>50 MB)
➡️ Dùng 300 DPI thay vì 600 DPI

### Text bị mờ/vỡ
➡️ Kiểm tra font đã load xong chưa
➡️ Thử export 600 DPI

### Bị cắt xén phần đầu/cuối
➡️ Tăng "Top padding"
➡️ Zoom out trước khi export

### Background không xuất
➡️ Đợi background load xong (thấy ảnh rõ)
➡️ Kiểm tra CORS (nếu ảnh từ link ngoài)

### Decor/rồng không xuất
➡️ Đợi ảnh load xong trước khi export
➡️ Thử refresh trang và load lại

---

## 📐 Tính toán kích thước

### DPI là gì?
DPI = Dots Per Inch = Số điểm ảnh trên 1 inch

**96 DPI:** Màn hình máy tính (mặc định)
**300 DPI:** Chuẩn in ấn (khuyến nghị)
**600 DPI:** In chất lượng cao (poster, canvas)

### Công thức chuyển đổi
```
Pixel @ 96 DPI → 300 DPI: nhân × 3.125
Pixel @ 96 DPI → 600 DPI: nhân × 6.25

Ví dụ:
2000px @ 96 DPI = 2000 / 96 × 25.4 = 529 mm = 52.9 cm
2000px @ 300 DPI = 2000 / 300 × 25.4 = 169 mm = 16.9 cm
```

### Bảng quy đổi nhanh
| Kích thước màn hình | 300 DPI | 600 DPI | In được khổ |
|---------------------|---------|---------|-------------|
| 2000×1000 px | 6250×3125 px | 12500×6250 px | ~50×25 cm |
| 3000×1500 px | 9375×4688 px | 18750×9375 px | ~75×37 cm |
| 4000×2000 px | 12500×6250 px | 25000×12500 px | ~100×50 cm |

---

## 🎨 Best Practices

### 1. Thiết kế với tỉ lệ 2:1
- Giữ `paperWidth = 2000`, `paperHeight = 1000`
- Hoặc bất kỳ tỉ lệ 2:1 nào (3000×1500, 4000×2000)
- Phù hợp cho banner, cuốn tranh ngang

### 2. Dùng SVG connections
- Hiện tại đã dùng SVG → tốt rồi
- Đường nối không bị vỡ khi scale

### 3. Font chất lượng
- Dùng font .otf/.ttf thay vì web font
- Tránh font bitmap

### 4. Test trước khi in hàng loạt
- Export 1 file nhỏ, in thử A4
- Kiểm tra độ nét, màu sắc
- Sau đó mới export full size

---

## 🚀 Tương lai (Roadmap)

### Có thể implement sau:
- [ ] Export SVG vector (không giới hạn kích thước)
- [ ] Export PDF (dễ in, đa trang)
- [ ] Batch export (xuất nhiều dòng họ cùng lúc)
- [ ] Print preview dialog
- [ ] Watermark option

---

**Tóm lại:** Dùng **"Xuất theo kích thước thực (300 DPI)"** là tốt nhất cho in ấn! 🎯
