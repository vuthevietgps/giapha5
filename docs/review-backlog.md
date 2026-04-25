# Review Backlog

Backlog nay duoc tach tu dot review he thong, uu tien theo muc do rui ro san pham va tenant boundary.

## P0

- [x] Chot race condition refresh token va retry 401 tren frontend auth.
- [x] Khoa tenant boundary cho `posts`, `subscriptions`, `payments`, `users/:id`, `audit`.
- [x] Giu vung family-scope cho cac module da sua truoc do (`members`, `families`, `unions`).

## P1

- [x] Scope `backgrounds` theo `family` o backend va frontend.
- [x] Dua quan ly anh nen tren tree, print, backgrounds page ve dung context dong ho.
- [x] Thay `confirm/alert` trong cay gia pha, in an, backgrounds, va cac trang list quan tri bang dialog/snackbar.
- [x] Lam phang cac warning build frontend (`NG8011` tren auth pages, `html2canvas` CommonJS).
- [x] Cai thien mobile UX cua tree toolbar, action menu, va public share page.

## P2

- [x] Dong bo logic `root/spouse/levels` cua public share voi cay noi bo.
- [ ] Tiep tuc can chinh visual parity cua public share neu muon gan hon layout cay noi bo.
- [x] Bo sung HUD dieu huong, zoom, scale node va affordance node ro rang hon trong tree.
- [x] Can chinh permission UX cho posts va cac CTA read-only.
- [x] Don placeholder/debug traces con sot (`family-form works!`, debug log layout).
- [x] Giam data public share ve nhung truong dang dung tren UI.
- [x] Don noti marketing `alert()` o landing page de dong nhat UX toan site.
