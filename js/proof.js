/*
 * Phần "Chứng minh định lý": sắp xếp các thẻ lập luận theo đúng trình tự chứng minh
 * định lý đường trung bình của tam giác (lấy từ "phiếu trò chơi.docx").
 * Đổi chỗ thẻ bằng nút ▲/▼ hoặc kéo thả (chuột/cảm ứng).
 * Các trường card/detail là HTML do giáo viên soạn (nội dung tin cậy).
 */
window.PS = window.PS || {};

(function () {
  const half = '<span class="frac"><span>1</span><span>2</span></span>';
  const frac = function (a, b) { return '<span class="frac"><span>' + a + '</span><span>' + b + '</span></span>'; };

  PS.PROOF = {
    task: 'Hãy sắp xếp các bước chứng minh sau theo trình tự hợp lý để hoàn thành bài chứng minh ' +
      'định lý đường trung bình của tam giác.',
    // Thẻ theo thứ tự in trên phiếu (A → E)
    steps: [
      {
        id: 'A',
        card: 'MN = BP và BP = ' + half + 'BC',
        detail: ['Suy ra: MN = BP (tính chất)', 'và BP = ' + half + 'BC (P là trung điểm của BC)']
      },
      {
        id: 'B',
        card: 'Lấy P là trung điểm BC, chứng minh NP // AB',
        detail: ['Lấy điểm P là trung điểm của BC,', 'chứng minh tương tự ta có: NP // AB']
      },
      {
        id: 'C',
        card: 'Kết luận MN = ' + half + 'BC',
        detail: ['Vậy MN = ' + half + 'BC (điều phải chứng minh).']
      },
      {
        id: 'D',
        card: 'Từ giả thiết, áp dụng Thalès đảo suy ra MN // BC',
        detail: [
          'Xét tam giác ABC có: M, N lần lượt là trung điểm của AB, AC (gt)',
          'suy ra: AM = MB, AN = NC (tính chất)',
          'nên ' + frac('AM', 'MB') + ' = ' + frac('AN', 'NC') + ' (= 1)',
          'Vậy MN // BC (theo định lý Thalès đảo)'
        ]
      },
      {
        id: 'E',
        card: 'MNPB là hình bình hành',
        detail: [
          'Xét tứ giác MNPB có:',
          'MN // BP (chứng minh trên)',
          'NP // MB (chứng minh trên)',
          'Suy ra: MNPB là hình bình hành (dấu hiệu nhận biết)'
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
    tries: 0
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

      const num = document.createElement('span');
      num.className = 'step-num';
      num.textContent = i + 1;

      const card = document.createElement('div');
      card.className = 'step-card';
      const letter = document.createElement('span');
      letter.className = 'step-letter';
      letter.textContent = id;
      const text = document.createElement('span');
      text.className = 'step-text';
      text.innerHTML = byId[id].card;
      card.appendChild(letter);
      card.appendChild(text);
      if (!st.solved) {
        card.title = 'Kéo thả để đổi vị trí';
        card.addEventListener('pointerdown', onPointerDown);
        card.addEventListener('pointermove', onPointerMove);
        card.addEventListener('pointerup', onPointerUp);
        card.addEventListener('pointercancel', onPointerUp);
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
    $('proof-solution').hidden = !st.solved;
  }

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

  function renderSolution() {
    const tbody = $('proof-table-body');
    tbody.innerHTML = '';
    DATA.answer.forEach(function (id, i) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.scope = 'row';
      th.textContent = i + 1;
      const td = document.createElement('td');
      const tag = document.createElement('span');
      tag.className = 'step-letter';
      tag.textContent = id;
      td.appendChild(tag);
      byId[id].detail.forEach(function (line) {
        const p = document.createElement('p');
        p.innerHTML = line;
        td.appendChild(p);
      });
      tr.appendChild(th);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
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

  function check() {
    if (st.solved) return;
    st.tries++;
    st.marks = st.order.map(function (id, i) { return id === DATA.answer[i]; });
    const n = st.marks.filter(Boolean).length;
    if (n === st.order.length) {
      st.solved = true;
      PS.Sound.fanfare();
      setFeedback('good', '🎉 Chính xác! Thứ tự đúng: ' + DATA.answer.join(' → ') + '. Giỏi lắm!');
    } else {
      PS.Sound.gentle();
      setFeedback('soft', 'Đúng ' + n + '/' + st.order.length + ' vị trí — hãy đổi chỗ các thẻ màu cam rồi thử lại nhé!');
    }
    render();
  }

  function reveal() {
    if (st.solved) return;
    st.order = DATA.answer.slice();
    st.marks = st.order.map(function () { return true; });
    st.solved = true;
    st.revealed = true;
    PS.Sound.correct();
    setFeedback('info', 'Thứ tự đúng: ' + DATA.answer.join(' → ') + '. Cùng xem lại bài chứng minh nhé!');
    render();
  }

  function shuffle() {
    st.order = shuffled();
    st.solved = false;
    st.revealed = false;
    st.tries = 0;
    afterReorder();
    PS.Sound.whoosh();
    render();
  }

  // ------------------------------------------------------------------ kéo thả (Pointer Events)
  function onPointerDown(e) {
    if (st.solved || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const cards = Array.prototype.slice.call(document.querySelectorAll('#proof-list .step-card'));
    const from = cards.indexOf(e.currentTarget);
    if (from === -1) return;
    const rects = cards.map(function (c) { return c.getBoundingClientRect(); });
    // Khoảng dịch chuyển của các thẻ bị đẩy = chiều cao thẻ kéo + khoảng cách giữa hai hàng
    const gap = rects.length > 1 ? rects[1].top - rects[0].bottom : 0;
    drag = {
      el: e.currentTarget, cards: cards, rects: rects, from: from, to: from,
      startY: e.clientY, pointerId: e.pointerId, moved: false,
      shift: rects[from].height + gap
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* con trỏ không hợp lệ: vẫn kéo được trong thẻ */ }
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dy) < 6) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.el.classList.add('dragging');
      $('proof-list').classList.add('sorting');
    }
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

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    $('proof-list').classList.remove('sorting');
    if (e.type === 'pointerup' && d.moved && d.to !== d.from) {
      const id = st.order.splice(d.from, 1)[0];
      st.order.splice(d.to, 0, id);
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
      renderSolution();
      render();
    },
    /** Gọi mỗi khi mở màn hình để vẽ lại (giữ nguyên tiến độ đang làm). */
    show: function () { render(); }
  };
})();
