/*
 * Chọn ngẫu nhiên học sinh.
 *
 * LƯU Ý: Đây là cơ chế random phục vụ hoạt động lớp học, KHÔNG phải hệ thống
 * bốc thăm có chứng nhận.
 *
 * - Người được chọn được lấy mẫu đều (mỗi bạn đủ điều kiện có xác suất như nhau)
 *   bằng crypto.getRandomValues + lấy mẫu loại bỏ (rejection sampling) để tránh lệch modulo.
 * - Kết quả được khóa NGAY KHI bấm chọn, trước khi đếm ngược; hoạt ảnh cuộc đua chỉ
 *   được dựng để khớp với kết quả đã khóa, vị trí hoạt ảnh không ảnh hưởng tới kết quả.
 */
window.PS = window.PS || {};

PS.randomInt = function (n) {
  if (n <= 0) throw new Error('randomInt: n phải > 0');
  const c = window.crypto || window.msCrypto;
  if (c && c.getRandomValues) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    let x;
    do {
      c.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % n;
  }
  return Math.floor(Math.random() * n);
};

PS.Picker = function (ids) {
  this.setRoster(ids || []);
};

PS.Picker.prototype.setRoster = function (ids) {
  this.all = ids.slice();
  this.remaining = ids.slice();
};

/** Danh sách id đủ điều kiện cho lượt này. */
PS.Picker.prototype.eligible = function (noRepeat) {
  return noRepeat ? this.remaining.slice() : this.all.slice();
};

/** true nếu bật hạn chế lặp lại và mọi bạn đều đã có lượt. */
PS.Picker.prototype.isExhausted = function (noRepeat) {
  return !!noRepeat && this.remaining.length === 0;
};

/** Chọn và khóa một id. Khi bật hạn chế lặp lại, id bị loại khỏi vòng hiện tại. */
PS.Picker.prototype.pick = function (noRepeat) {
  const pool = this.eligible(noRepeat);
  if (pool.length === 0) return null;
  const id = pool[PS.randomInt(pool.length)];
  if (noRepeat) {
    this.remaining = this.remaining.filter(function (x) { return x !== id; });
  }
  return id;
};

/** Trả lại một id vào vòng (dùng khi giáo viên dừng cuộc đua trước khi công bố). */
PS.Picker.prototype.unpick = function (id) {
  if (this.all.indexOf(id) !== -1 && this.remaining.indexOf(id) === -1) {
    this.remaining.push(id);
  }
};

/** Bắt đầu vòng mới: mọi bạn đều đủ điều kiện trở lại. */
PS.Picker.prototype.newRound = function () {
  this.remaining = this.all.slice();
};
