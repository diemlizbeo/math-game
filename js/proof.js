/*
 * Phần "Chứng minh định lý": sắp xếp các thẻ lập luận theo đúng trình tự chứng minh
 * định lý đường trung bình của tam giác (lấy từ "phiếu trò chơi.docx").
 * Đổi chỗ thẻ bằng nút ▲/▼, kéo thả (chuột/cảm ứng), hoặc bấm chọn thẻ rồi bấm số thứ tự để chuyển thẻ tới đó.
 * Mỗi thẻ là một bước chứng minh đầy đủ (lines: từng dòng lập luận, HTML do giáo viên soạn — nội dung tin cậy).
 * Màn hình rộng: danh sách thẻ cuộn bên trong khung riêng (#proof-list), phần còn lại của bố cục đứng yên.
 *
 * Cấu trúc một hàng (render):
 *   li.step-row [.ok | .bad]
 *     button.step-num [.target]     số thứ tự vị trí (1…5) — nằm trên "đường ray" nối các bước;
 *                                   khi đã chọn một thẻ, bấm số để chuyển thẻ đó tới vị trí này
 *     div.step-card [.selected]     bấm để chọn; kéo để đổi chỗ (cảm ứng: nhấn giữ thân thẻ rồi kéo)
 *       span.step-letter            tên thẻ (A…E) để cả lớp gọi tên khi thảo luận;
 *                                   trên cảm ứng kéo được ngay từ đây, không cần nhấn giữ
 *       div.step-text               nội dung lập luận
 *       span.step-status            ✓ / ✕ sau khi kiểm tra (không chỉ dựa vào màu)
 *     div.step-arrows               nút ▲ ▼
 */
window.PS = window.PS || {};

(function () {
  const half = '<span class="frac"><span>1</span><span>2</span></span>';
  const frac = function (a, b) { return '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>'; };
  // Biểu thức toán không bị ngắt giữa chừng khi xuống dòng (vd. không tách "AM =" và "MB")
  const m = function (s) { return '<span class="nowrap">' + s + '</span>'; };

  PS.PROOF = {
    task: 'Hãy sắp xếp các bước chứng minh sau theo trình tự hợp lý để hoàn thành bài chứng minh ' +
      'định lý đường trung bình của tam giác.',
    // Thẻ theo thứ tự in trên phiếu (A → E). Mỗi phần tử của lines là một ý trọn vẹn (một dòng);
    // dòng bắt đầu bằng "• " được thụt vào như một ý con.
    steps: [
      {
        id: 'A',
        lines: [
          'Suy ra: ' + m('MN = BP') + ' (tính chất).',
          'và ' + m('BP = ' + half + 'BC') + ' (P là trung điểm của BC).'
        ]
      },
      {
        id: 'B',
        lines: [
          'Lấy P là trung điểm của BC.',
          'Chứng minh tương tự, ta có: ' + m('NP // AB') + '.'
        ]
      },
      {
        id: 'C',
        lines: ['Vậy ' + m('MN = ' + half + 'BC') + ' (điều phải chứng minh).']
      },
      {
        id: 'D',
        lines: [
          'Xét tam giác ABC có M, N lần lượt là trung điểm của AB, AC (gt).',
          'Suy ra: ' + m('AM = MB') + ', ' + m('AN = NC') + ' (tính chất)',
          'nên ' + m(frac('AM', 'MB') + ' = ' + frac('AN', 'NC') + ' (= 1)') + '.',
          'Vậy ' + m('MN // BC') + ' (định lý Thalès đảo).'
        ]
      },
      {
        id: 'E',
        lines: [
          'Xét tứ giác MNPB có:',
          '• ' + m('MN // BP') + ' (chứng minh trên)',
          '• ' + m('NP // MB') + ' (chứng minh trên)',
          'Suy ra: MNPB là hình bình hành (dấu hiệu nhận biết).'
        ]
      }
    ],
    answer: ['D', 'B', 'E', 'A', 'C']
  };

  const $ = function (id) { return document.getElementById(id); };
  const DATA = PS.PROOF;
  const byId = {};
  DATA.steps.forEach(function (s) { byId[s.id] = s; });

  const st = {
    order: DATA.steps.map(function (s) { return s.id; }),
    marks: null, // sau khi kiểm tra: mảng true/false theo từng vị trí
    solved: false,
    revealed: false, // true nếu giáo viên bấm "Xem đáp án"
    tries: 0,
    selected: null // id thẻ đang được chọn (bấm thẻ rồi bấm số thứ tự để chuyển thẻ tới đó)
  };
  let drag = null;

  function isCorrectOrder(order) {
    return order.join('') === DATA.answer.join('');
  }

  function shuffled() {
    let a;
    do {
      a = st.order.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
    } while (isCorrectOrder(a) || a.join('') === st.order.join(''));
    return a;
  }

  // ------------------------------------------------------------------ hiển thị
  function render() {
    const list = $('proof-list');
    list.innerHTML = '';
    list.classList.toggle('solved', st.solved);
    st.order.forEach(function (id, i) {
      const li = document.createElement('li');
      li.className = 'step-row';
      if (st.marks) li.classList.add(st.marks[i] ? 'ok' : 'bad');

      // Số thứ tự là nút: đã chọn một thẻ thì bấm số để chuyển thẻ đó tới vị trí này
      const num = document.createElement('button');
      num.type = 'button';
      num.className = 'step-num';
      num.textContent = i + 1;
      num.disabled = st.solved;
      if (st.selected && !st.solved) {
        num.classList.add('target');
        num.setAttribute('aria-label', 'Chuyển thẻ ' + st.selected + ' tới vị trí ' + (i + 1));
      } else {
        num.setAttribute('aria-label', 'Vị trí ' + (i + 1) + ' — chọn một thẻ trước rồi bấm số để chuyển thẻ tới đây');
      }
      num.onclick = function () { placeAt(i); };

      const card = document.createElement('div');
      card.className = 'step-card';
      if (st.selected === id) card.classList.add('selected');

      const letter = document.createElement('span');
      letter.className = 'step-letter';
      letter.textContent = id;
      letter.setAttribute('aria-label', 'Thẻ ' + id);

      const text = document.createElement('div');
      text.className = 'step-text';
      byId[id].lines.forEach(function (line) {
        const p = document.createElement('p');
        if (line.indexOf('• ') === 0) { p.className = 'sub'; line = line.slice(2); }
        p.innerHTML = line;
        text.appendChild(p);
      });

      card.appendChild(letter);
      card.appendChild(text);

      if (st.marks) {
        const ok = st.marks[i];
        const status = document.createElement('span');
        status.className = 'step-status';
        status.setAttribute('role', 'img');
        status.setAttribute('aria-label', ok ? 'Đúng vị trí' : 'Chưa đúng vị trí');
        status.textContent = ok ? '✓' : '✕';
        card.appendChild(status);
      }

      if (!st.solved) {
        card.title = 'Kéo thả để đổi vị trí, hoặc bấm chọn thẻ rồi bấm số thứ tự';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', st.selected === id ? 'true' : 'false');
        card.setAttribute('aria-label', 'Thẻ ' + id + (st.selected === id ? ' (đang chọn)' : ''));
        card.addEventListener('pointerdown', onPointerDown);
        card.addEventListener('pointermove', onPointerMove);
        card.addEventListener('pointerup', onPointerUp);
        card.addEventListener('pointercancel', onPointerUp);
        // Đang kéo trên cảm ứng: chặn trình duyệt cuộn trang (cần listener không passive)
        card.addEventListener('touchmove', onTouchMove, { passive: false });
        // Nhấn giữ trên điện thoại không bật menu ngữ cảnh / chọn chữ
        card.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(id); }
          else if (e.key === 'Escape' && st.selected) { e.preventDefault(); toggleSelect(st.selected); }
        });
      }

      const arrows = document.createElement('div');
      arrows.className = 'step-arrows';
      arrows.appendChild(arrowBtn('up', i, i === 0));
      arrows.appendChild(arrowBtn('down', i, i === st.order.length - 1));

      li.appendChild(num);
      li.appendChild(card);
      li.appendChild(arrows);
      list.appendChild(li);
    });
    $('btn-proof-check').disabled = st.solved;
    $('btn-proof-reveal').disabled = st.solved;
    fit();
  }

  /**
   * Co nhỏ dần chữ trong thẻ (biến --fit) cho tới khi cả 5 thẻ nằm gọn trong khung, không phải cuộn —
   * để các bé nhìn thấy toàn bộ bài chứng minh cùng lúc. Chỉ áp dụng khi danh sách có vùng cuộn riêng (màn rộng).
   */
  function fit() {
    const list = $('proof-list');
    if (drag || !list.offsetParent) return;
    list.style.removeProperty('--fit');
    if (getComputedStyle(list).overflowY !== 'auto') return;
    let f = 1;
    while (list.scrollHeight > list.clientHeight + 1 && f > 0.62) {
      f = Math.round((f - 0.03) * 100) / 100;
      list.style.setProperty('--fit', f);
    }
  }

  let fitRaf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(fit);
  });

  function arrowBtn(dir, i, edge) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'step-arrow';
    b.dataset.dir = dir;
    b.textContent = dir === 'up' ? '▲' : '▼';
    b.setAttribute('aria-label', 'Chuyển thẻ ' + st.order[i] + (dir === 'up' ? ' lên trên' : ' xuống dưới'));
    b.disabled = edge || st.solved;
    b.onclick = function () { move(i, dir === 'up' ? -1 : 1); };
    return b;
  }

  function setFeedback(kind, text) {
    const fb = $('proof-feedback');
    fb.className = 'feedback' + (kind ? ' ' + kind : '');
    fb.textContent = text || '';
  }

  // ------------------------------------------------------------------ thao tác
  function afterReorder() {
    st.marks = null;
    setFeedback('', '');
  }

  function move(i, delta) {
    const j = i + delta;
    if (st.solved || j < 0 || j >= st.order.length) return;
    const t = st.order[i]; st.order[i] = st.order[j]; st.order[j] = t;
    afterReorder();
    PS.Sound.tick();
    render();
    // Giữ tiêu điểm trên nút vừa bấm (ở vị trí mới) để có thể bấm tiếp bằng bàn phím
    const row = $('proof-list').children[j];
    const btn = row && (row.querySelector('.step-arrow[data-dir="' + (delta < 0 ? 'up' : 'down') + '"]:not(:disabled)') ||
      row.querySelector('.step-arrow:not(:disabled)'));
    if (btn) btn.focus();
  }

  /** Bấm vào thẻ: chọn thẻ đó (bấm lại để bỏ chọn). Sau đó bấm số thứ tự để chuyển thẻ tới vị trí ấy. */
  function toggleSelect(id) {
    if (st.solved) return;
    st.selected = st.selected === id ? null : id;
    PS.Sound.tick();
    render();
    focusCard(id);
  }

  /** Chuyển thẻ đang chọn tới vị trí i (các thẻ khác dồn lên/xuống, giữ nguyên thứ tự). */
  function placeAt(i) {
    if (st.solved || !st.selected) return;
    const id = st.selected;
    const from = st.order.indexOf(id);
    st.selected = null;
    if (from !== i) {
      st.order.splice(from, 1);
      st.order.splice(i, 0, id);
      afterReorder();
    }
    PS.Sound.tick();
    render();
    focusCard(id);
  }

  function focusCard(id) {
    const row = $('proof-list').children[st.order.indexOf(id)];
    const card = row && row.querySelector('.step-card');
    if (card && card.tabIndex >= 0) card.focus({ preventScroll: true });
  }

  function check() {
    if (st.solved) return;
    st.selected = null;
    st.tries++;
    st.marks = st.order.map(function (id, i) { return id === DATA.answer[i]; });
    const n = st.marks.filter(Boolean).length;
    if (n === st.order.length) {
      st.solved = true;
      PS.Sound.fanfare();
      setFeedback('good', '🎉 Chính xác! Thứ tự đúng: ' + DATA.answer.join(' → ') + '. Giỏi lắm!');
    } else {
      PS.Sound.gentle();
      setFeedback('soft', 'Đúng ' + n + '/' + st.order.length + ' vị trí — hãy đổi chỗ các thẻ có dấu ✕ rồi thử lại nhé!');
    }
    render();
  }

  /** Xếp các thẻ về đúng thứ tự: các thẻ đúng thứ tự chính là bài chứng minh hoàn chỉnh. */
  function reveal() {
    if (st.solved) return;
    st.order = DATA.answer.slice();
    st.selected = null;
    st.marks = st.order.map(function () { return true; });
    st.solved = true;
    st.revealed = true;
    PS.Sound.correct();
    setFeedback('info', 'Thứ tự đúng: ' + DATA.answer.join(' → ') + '. Cùng đọc lại bài chứng minh nhé!');
    render();
  }

  function shuffle() {
    st.order = shuffled();
    st.selected = null;
    st.solved = false;
    st.revealed = false;
    st.tries = 0;
    afterReorder();
    PS.Sound.whoosh();
    render();
  }

  // ------------------------------------------------------------------ kéo thả (Pointer Events)
  // Màn rộng: danh sách thẻ tự cuộn bên trong khung; màn hẹp: cả trang cuộn.
  // Vị trí lưu theo toạ độ đã cộng độ cuộn để vẫn đúng khi tự cuộn trong lúc kéo.
  const EDGE = 90; // px: kéo tới gần mép trên/dưới vùng cuộn thì tự cuộn

  /** Vùng đang cuộn: chính danh sách thẻ nếu nó có thanh cuộn riêng, ngược lại là cả trang (null). */
  function getScroller() {
    const list = $('proof-list');
    return getComputedStyle(list).overflowY === 'auto' ? list : null;
  }

  function scrollPos() {
    return drag && drag.scroller ? drag.scroller.scrollTop : window.scrollY;
  }

  // Cảm ứng / bút: chạm ô chữ cái (A…E) thì kéo ngay; chạm thân thẻ thì phải giữ yên HOLD_MS mới kéo,
  // để vuốt nhanh trên thẻ vẫn cuộn được trang. Chạm rồi thả (không kéo) = chọn thẻ.
  const HOLD_MS = 250;
  const SLOP = 10; // px: ngón tay dịch quá mức này trước khi đủ thời gian giữ → coi là cuộn trang

  function onPointerDown(e) {
    if (st.solved || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const cards = Array.prototype.slice.call(document.querySelectorAll('#proof-list .step-card'));
    const from = cards.indexOf(e.currentTarget);
    if (from === -1) return;
    drag = {
      el: e.currentTarget, cards: cards, from: from, to: from, pointerId: e.pointerId,
      downX: e.clientX, downY: e.clientY, clientY: e.clientY,
      armed: false, moved: false, timer: 0, raf: 0
    };
    if (e.pointerType === 'mouse' || e.target.closest('.step-letter')) {
      arm();
    } else {
      drag.timer = setTimeout(function () {
        if (!drag) return;
        arm();
        drag.el.classList.add('dragging'); // "nhấc" thẻ lên để biết đã có thể kéo
        if (navigator.vibrate) navigator.vibrate(15);
      }, HOLD_MS);
    }
  }

  /** Bắt đầu chế độ kéo: đo vị trí các thẻ tại thời điểm này. */
  function arm() {
    const scroller = getScroller();
    const sy = scroller ? scroller.scrollTop : window.scrollY;
    const rects = drag.cards.map(function (c) {
      const r = c.getBoundingClientRect();
      return { top: r.top + sy, bottom: r.bottom + sy, height: r.height };
    });
    // Khoảng dịch chuyển của các thẻ bị đẩy = chiều cao thẻ kéo + khoảng cách giữa hai hàng
    const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 0;
    drag.armed = true;
    drag.scroller = scroller;
    drag.rects = rects;
    drag.startY = drag.clientY + sy;
    drag.shift = rects[drag.from].height + gap;
    try { drag.el.setPointerCapture(drag.pointerId); } catch (err) { /* con trỏ không hợp lệ: vẫn kéo được trong thẻ */ }
  }

  /** Đang kéo trên cảm ứng: không để trình duyệt cuộn trang (nếu không sẽ phát pointercancel và mất thao tác kéo). */
  function onTouchMove(e) {
    if (drag && drag.armed && e.cancelable) e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    drag.clientY = e.clientY;
    if (!drag.armed) {
      // Chưa giữ đủ lâu mà ngón tay đã trượt: người dùng đang cuộn trang → bỏ thao tác
      if (Math.abs(e.clientX - drag.downX) > SLOP || Math.abs(e.clientY - drag.downY) > SLOP) {
        clearTimeout(drag.timer);
        drag = null;
      }
      return;
    }
    if (!drag.moved && Math.abs(e.clientY + scrollPos() - drag.startY) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.el.classList.add('dragging');
      $('proof-list').classList.add('sorting');
      drag.raf = requestAnimationFrame(autoScroll);
    }
    updateDrag();
  }

  function updateDrag() {
    const dy = drag.clientY + scrollPos() - drag.startY;
    drag.el.style.transform = 'translateY(' + dy + 'px)';
    const r0 = drag.rects[drag.from];
    const center = r0.top + r0.height / 2 + dy;
    let to = 0;
    drag.rects.forEach(function (r, i) {
      if (i !== drag.from && center > r.top + r.height / 2) to++;
    });
    drag.to = to;
    drag.cards.forEach(function (c, i) {
      if (i === drag.from) return;
      let s = 0;
      if (drag.from < to && i > drag.from && i <= to) s = -drag.shift;
      else if (drag.from > to && i >= to && i < drag.from) s = drag.shift;
      c.style.transform = s ? 'translateY(' + s + 'px)' : '';
    });
  }

  /** Tự cuộn khi kéo thẻ tới gần mép trên hoặc mép dưới của vùng cuộn (danh sách thẻ hoặc cả trang). */
  function autoScroll() {
    if (!drag) return;
    let top = 0;
    let bottom;
    if (drag.scroller) {
      const r = drag.scroller.getBoundingClientRect();
      top = r.top;
      bottom = r.bottom;
    } else {
      const bar = document.querySelector('.proof-actions').getBoundingClientRect();
      bottom = Math.min(window.innerHeight, bar.top);
    }
    const edge = Math.min(EDGE, (bottom - top) / 4);
    let v = 0;
    if (drag.clientY < top + edge) v = -(top + edge - drag.clientY) / 5;
    else if (drag.clientY > bottom - edge) v = (drag.clientY - (bottom - edge)) / 5;
    if (v) {
      const before = scrollPos();
      v = Math.max(-18, Math.min(18, v));
      if (drag.scroller) drag.scroller.scrollTop += v;
      else window.scrollBy(0, v);
      if (scrollPos() !== before) updateDrag();
    }
    drag.raf = requestAnimationFrame(autoScroll);
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    clearTimeout(d.timer);
    cancelAnimationFrame(d.raf);
    $('proof-list').classList.remove('sorting');
    if (e.type === 'pointerup' && !d.moved) {
      // Bấm / chạm rồi thả mà không kéo: chọn (hoặc bỏ chọn) thẻ
      toggleSelect(st.order[d.from]);
      return;
    }
    if (e.type === 'pointerup' && d.to !== d.from) {
      const id = st.order.splice(d.from, 1)[0];
      st.order.splice(d.to, 0, id);
      st.selected = null;
      afterReorder();
      PS.Sound.tick();
    }
    render();
  }

  // ------------------------------------------------------------------ khởi tạo
  PS.ProofGame = {
    init: function () {
      $('proof-task').textContent = DATA.task;
      $('btn-proof-check').onclick = check;
      $('btn-proof-reveal').onclick = reveal;
      $('btn-proof-shuffle').onclick = shuffle;
      render();
      // Phông chữ tải xong có thể đổi kích thước thẻ → tính lại cho vừa khung
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    },
    /** Gọi mỗi khi mở màn hình để vẽ lại (giữ nguyên tiến độ đang làm). */
    show: function () { render(); }
  };
})();