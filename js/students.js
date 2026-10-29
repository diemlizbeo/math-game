/* Xử lý danh sách học sinh và lưu trữ cục bộ (localStorage). */
window.PS = window.PS || {};

/** Danh sách lớp để sẵn — giáo viên chỉ cần bấm Bắt đầu (vẫn sửa được trên màn hình chính). */
PS.CLASS_NAME = '8A3';
PS.CLASS_LIST = [
  'Vũ Ngọc Bảo Anh', 'Phạm Hà Anh', 'Khương Vũ Phương Anh', 'Vũ Phương Anh', 'Lê Phương Anh',
  'Nguyễn Kim Anh', 'Khương Vũ Minh Anh', 'Vương Ngọc Anh', 'Hàn Gia Bảo', 'Lê Gia Bảo',
  'Hoàng Gia Bảo', 'Phạm Gia Bảo', 'Hoàng Linh Chi', 'Nguyễn Khánh Chi', 'Đặng Thùy Chi',
  'Đặng Nguyễn Mai Chi', 'Trịnh Kim Chi', 'Lê Sỹ Hậu Đăng', 'Dương Nguyễn Trí Đạt', 'Nguyễn Minh Đức',
  'Nguyễn Hương Giang', 'Vũ Mai Hà', 'Vũ Tuấn Hải', 'Vũ Tuấn Hưng', 'Trần Quốc Khải',
  'Lê Tuấn Khanh', 'Lê Mạnh Khương', 'Nguyễn Trung Kiên', 'Lê Hà Lâm', 'Nguyễn Thảo Ly',
  'Trần Nhật Minh', 'Nguyễn Thị Hà My', 'Lê Diễm My', 'Lê Nhật Nam', 'Nguyễn Bảo Nam',
  'Nguyễn Thành Nam', 'Nguyễn Bảo Nam', 'Đỗ Minh Ngọc', 'Nguyễn Thị Khánh Ngọc', 'Lưu Bình Nguyên'
];

PS.Students = {
  /** Tên gọn: giữ 2 chữ cuối, các chữ đầu viết tắt. "Nguyễn Thị Minh Châu" → "N.T.Minh Châu". */
  shortName: function (full) {
    const words = String(full).normalize('NFC').split(' ').filter(Boolean);
    if (words.length <= 2) return words.join(' ');
    const initials = words.slice(0, -2).map(function (w) { return w.charAt(0).toLocaleUpperCase('vi') + '.'; }).join('');
    return initials + words.slice(-2).join(' ');
  },

  /** Tách văn bản thành danh sách tên: bỏ dòng trống, cắt khoảng trắng thừa. */
  parse: function (text) {
    return String(text || '')
      .split(/\r?\n/)
      .map(function (line) { return line.replace(/\s+/g, ' ').trim(); })
      .filter(function (line) { return line.length > 0; });
  },

  /** Trả về [{ name, count }] cho các tên xuất hiện nhiều hơn một lần (không phân biệt hoa/thường). */
  findDuplicates: function (names) {
    const map = new Map();
    names.forEach(function (n) {
      const key = n.normalize('NFC').toLocaleLowerCase('vi');
      const item = map.get(key) || { name: n, count: 0 };
      item.count++;
      map.set(key, item);
    });
    return Array.from(map.values()).filter(function (x) { return x.count > 1; });
  },

  /**
   * Tạo roster: mỗi học sinh có id riêng (kể cả khi trùng tên), nhãn hiển thị là tên gọn
   * (trùng hẳn họ tên ⇒ viết đầy đủ họ tên + "#1", "#2"; hai tên khác nhau mà viết tắt
   * trùng nhau ⇒ giữ nguyên họ tên đầy đủ để phân biệt) và màu nhân vật.
   */
  buildRoster: function (names) {
    const self = this;
    const key = function (n) { return n.normalize('NFC').toLocaleLowerCase('vi'); };
    const totals = new Map();
    const shortOwners = new Map(); // tên gọn → tập họ tên đầy đủ đang dùng tên gọn đó
    names.forEach(function (n) {
      totals.set(key(n), (totals.get(key(n)) || 0) + 1);
      const s = key(self.shortName(n));
      if (!shortOwners.has(s)) shortOwners.set(s, new Set());
      shortOwners.get(s).add(key(n));
    });
    const seen = new Map();
    return names.map(function (name, i) {
      const k = key(name);
      const nth = (seen.get(k) || 0) + 1;
      seen.set(k, nth);
      const short = self.shortName(name);
      const dup = totals.get(k) > 1;
      const base = dup || shortOwners.get(key(short)).size > 1 ? name : short;
      return {
        id: i,
        name: name,
        label: dup ? base + ' #' + nth : base,
        color: PS.colorFor(i)
      };
    });
  }
};

PS.Storage = {
  KEY: 'penguinSlide.v2', // v2: dùng danh sách lớp 8A3 làm mặc định, bỏ dữ liệu thử cũ
  load: function () {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  save: function (data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) { /* bộ nhớ bị chặn: bỏ qua */ }
  },
  clear: function () {
    try { localStorage.removeItem(this.KEY); } catch (e) { /* bỏ qua */ }
  }
};
