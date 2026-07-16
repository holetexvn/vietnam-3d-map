// 34 đơn vị hành chính cấp tỉnh của Việt Nam sau sáp nhập 01/07/2025.
// type: 'city' = thành phố trực thuộc trung ương, 'province' = tỉnh.
export const PROVINCES = [
  { name: 'Hà Nội', type: 'city' },
  { name: 'Hải Phòng', type: 'city' },
  { name: 'Huế', type: 'city' },
  { name: 'Đà Nẵng', type: 'city' },
  { name: 'Hồ Chí Minh', type: 'city' },
  { name: 'Cần Thơ', type: 'city' },
  { name: 'Tuyên Quang', type: 'province' },
  { name: 'Cao Bằng', type: 'province' },
  { name: 'Lai Châu', type: 'province' },
  { name: 'Lào Cai', type: 'province' },
  { name: 'Thái Nguyên', type: 'province' },
  { name: 'Điện Biên', type: 'province' },
  { name: 'Lạng Sơn', type: 'province' },
  { name: 'Sơn La', type: 'province' },
  { name: 'Phú Thọ', type: 'province' },
  { name: 'Bắc Ninh', type: 'province' },
  { name: 'Quảng Ninh', type: 'province' },
  { name: 'Hưng Yên', type: 'province' },
  { name: 'Ninh Bình', type: 'province' },
  { name: 'Thanh Hóa', type: 'province' },
  { name: 'Nghệ An', type: 'province' },
  { name: 'Hà Tĩnh', type: 'province' },
  { name: 'Quảng Trị', type: 'province' },
  { name: 'Quảng Ngãi', type: 'province' },
  { name: 'Gia Lai', type: 'province' },
  { name: 'Khánh Hòa', type: 'province' },
  { name: 'Đắk Lắk', type: 'province' },
  { name: 'Lâm Đồng', type: 'province' },
  { name: 'Đồng Nai', type: 'province' },
  { name: 'Tây Ninh', type: 'province' },
  { name: 'Vĩnh Long', type: 'province' },
  { name: 'Đồng Tháp', type: 'province' },
  { name: 'An Giang', type: 'province' },
  { name: 'Cà Mau', type: 'province' },
];

// Chuỗi chữ cái liên tục dệt nên lá cờ. Mỗi phần tử nhớ nó thuộc tỉnh nào.
export function buildLetterSequence() {
  const seq = [];
  for (let p = 0; p < PROVINCES.length; p++) {
    for (const ch of PROVINCES[p].name.toUpperCase()) {
      if (ch === ' ' || ch === '.') continue;
      seq.push({ ch, province: p });
    }
  }
  return seq;
}
