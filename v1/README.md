# Việt Nam — Lá cờ dệt từ tên đất nước

Animation tương tác: **quốc kỳ Việt Nam ghép từ gần 2.000 chữ cái** đánh vần tên
34 tỉnh, thành sau sáp nhập 01/07/2025. Mỗi chữ cái treo trên một sợi chỉ và
đung đưa theo vật lý con lắc — rê chuột qua là gió thổi qua lá cờ.

Lấy cảm hứng từ [world-cup-letter-flags](https://github.com/amirmushichge/world-cup-letter-flags)
của @AmirMushich (cờ các đội World Cup ghép từ tên 26 cầu thủ, treo trên dây với
vật lý Verlet).

## Chạy

```bash
node serve.mjs
# mở http://localhost:4173
```

Hoặc bất kỳ static server nào (cần server vì dùng ES module — mở file trực tiếp sẽ không chạy).

## Tương tác

| Thao tác | Hiệu ứng |
|---|---|
| Rê chuột / vuốt | Gió cục bộ — chữ bay theo con trỏ |
| Chạm vào một chữ | Sáng toàn bộ chữ của tỉnh đó + hiện tên tỉnh (góc phải dưới) |
| Nhấp chuột | Cơn gió tỏa tròn từ điểm nhấp |
| Phím cách | Gió lùa ngang qua cả lá cờ |

## Kỹ thuật

- **Vật lý**: mỗi chữ là một con lắc cứng tích phân Verlet (trọng lực + ràng buộc
  chiều dài dây), bước vật lý cố định 60 Hz độc lập với tần số màn hình.
- **Gió**: trường sóng sin đa tần lan theo cột — lá cờ gợn như vải; thêm gust
  xung toàn cục (phím cách) và xung tỏa tròn (nhấp chuột).
- **Ngôi sao**: đa giác 10 đỉnh, mỗi ô lưới lấy mẫu 5 điểm để quyết định
  vàng/đỏ — ô nằm trọn trong sao sáng hơn ô biên, cho cạnh sao mềm.
- **Hiệu năng**: mỗi cặp (ký tự, màu) được vẽ sẵn vào sprite canvas; mỗi khung
  hình chỉ `drawImage` với `setTransform` (~12fps → 120fps).
- **Màu**: bảng màu sơn mài — nền sơn then `#16100D`, đỏ son `#DA251D`,
  vàng lá `#FFCD00`. Font: Be Vietnam Pro.
- Tôn trọng `prefers-reduced-motion`: tắt gió và màn mở đầu.

## Cấu trúc

- `index.html` — khung trang, tiêu đề, bảng tên tỉnh
- `style.css` — bảng màu, vignette, grain, layout
- `main.js` — vật lý, dựng lưới, render sprite, tương tác
- `data.js` — danh sách 34 tỉnh, thành + dựng chuỗi chữ cái
- `serve.mjs` — static server tối giản (Node, không dependency)
