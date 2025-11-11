# Member Tree – Hướng dẫn nhanh cho dev

Mục tiêu: hiển thị cây gia phả theo đời, vẽ nhánh từ giữa avatar của mẹ, và đồng màu cho các con cùng mẹ. Code được tách nhỏ để dễ bảo trì.

## Hai loại quan hệ (cốt lõi)

- Mẹ–Con: 1→N, rẽ nhánh. Chỉ theo mẹ để sinh nhánh. Con chỉ thuộc về đúng mẹ của nó.
- Vợ–Chồng: N↔N, gom hub. Nhiều vợ/chồng được gom hiển thị trong cùng một hộp (hub), không tạo nhánh riêng.

Triển khai hiện tại bám chặt các nguyên tắc này:

- `tree-data.util.ts`: con chỉ được chọn khi `child.mother` thuộc tập các mẹ của cặp (mẹ chính + `extraWives`). Khi tạo cặp con, luôn gán `linkVia='mother'` và `motherIdUsed=child.mother`.
- `tree-connections-simple.util.ts`: nhóm đường theo `motherIdUsed` và vẽ trunk từ đúng tâm avatar người mẹ đó. Không fallback sang “vợ đầu”.
- Hubs vợ/chồng: sử dụng `maleHubKey`/`femaleHubKey`, `extraWives`/`extraHusbands`, `hideInHub` để gom spouse trong hộp.

## Sơ đồ các file chính

- `member-tree.ts` + `member-tree.html` + `member-tree.scss`
  - Component chính (standalone) để load dữ liệu, tính layout, đo vị trí avatar mẹ, và render.
- `tree-data.util.ts`
  - Xây dựng các “cặp” (Couple) theo tầng đời từ danh sách Member + Unions.
  - Hỗ trợ nhiều vợ/chồng: lấy từ `spouse`, `unions`, và suy luận từ con (father/mother). Tuy nhiên nhánh chỉ theo mẹ.
- `tree-layout.util.ts`
  - Tính toán toạ độ (x, y, width, height) cho từng cặp theo từng đời.
- `tree-connections-simple.util.ts`
  - Tạo các đường nối cha/mẹ → con.
  - Mỗi nhóm con chung mẹ có 1 “trunk” riêng, màu thống nhất, và nhánh xuất phát từ giữa avatar mẹ.
- `tree-connections.util.ts` (legacy)
  - Bản mở rộng/học thuật hơn, hiện không dùng; giữ lại để tham khảo.

## Dòng chảy dữ liệu

1) Component tải Members và Unions của 1 Family.
2) `buildGenerations` gom thành `levels: Couple[][]` (đời 0, đời 1, …).
3) `computeLayout` tính toạ độ các hộp theo từng đời.
4) Component đo center của avatar các bà mẹ trong DOM (`measureWifeCenterRatios`).
5) `computeConnectionsSimple` tạo đường nối, trunk xuất phát đúng giữa avatar mẹ, và set màu đồng bộ cho các con cùng mẹ.

## Chỉnh sửa ở đâu?

- Quy tắc đời/gom cặp (mẹ–con 1→N; vợ–chồng N↔N gom hub): `tree-data.util.ts`
- Thứ tự sắp xếp con (theo ngày sinh…): `tree-data.util.ts` (tìm phần sort theo `dob`).
- Kích thước, khoảng cách hộp: `member-tree.ts` (hàm `estimateCoupleBoxes`) và `member-tree.scss`.
- Canh hàng, canh cột theo đời: `tree-layout.util.ts` (các GAP_X/GAP_Y đưa từ component).
- Màu theo mẹ + nhánh SVG: `tree-connections-simple.util.ts`.
- Điểm nối xuất phát từ giữa avatar mẹ: `member-tree.ts` (hàm `measureWifeCenterRatios`) và dùng ở `tree-connections-simple.util.ts`.

## API sử dụng

- GET `/members/by-family/:familyId` – lấy danh sách thành viên theo dòng họ.
- GET `/unions?family=...` – lấy các union để biết nhiều vợ/chồng.

Lưu ý: Nếu chưa tạo Union, code vẫn SUY LUẬN vợ/chồng từ con (father + mother). Khuyến nghị tạo Union để dữ liệu rõ ràng hơn.

## Mẹo debug nhanh

- Không thấy màu/trunk đúng mẹ: kiểm tra `motherIdUsed` của cặp con trong `levels` (log tạm) và đảm bảo DOM có `[data-mother-id]` trên phần tử vợ.
- Nhánh chưa xuất phát giữa avatar: kiểm tra `measureWifeCenterRatios()` có trả về tỉ lệ (0..1) cho mẹ tương ứng.
- Bị overlap: tăng `GAP_X`, `GAP_Y` trong `member-tree.ts`.

## Thành phần đơn giản để tham khảo

- `member-tree-simple.component.ts`: phiên bản đơn giản All-in-one cho việc thử nghiệm/đọc hiểu nhanh.

---
Gợi ý: khi cần thay đổi lớn, hãy viết test nhỏ cho các util (đặc biệt sort/nhóm) trước rồi mới chỉnh layout/render.