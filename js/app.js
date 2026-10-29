/*
 * Điều phối ứng dụng: máy trạng thái setup → ready → countdown → racing → result (→ ready …).
 * Tên học sinh luôn được hiển thị bằng textContent / canvas fillText (không chèn HTML).
 */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  const DURATIONS = [10, 15, 20, 25, 30];
  const QUESTIONS = PS.QUESTIONS;
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  const saved = PS.Storage.load();

  const state = {
    phase: 'setup',
    roster: [],
    appliedText: saved && typeof saved.text === 'string' ? saved.text : '',
    settings: Object.assign(
      { duration: 20, sound: true, noRepeat: true },
      saved && saved.settings ? saved.settings : {}
    ),
    editingList: false,
    picker: new PS.Picker([]),
    inProgress: false,
    qIndex: 0,
    qState: [], // theo từng câu: { studentId, chosen, revealed }
    race: null,
    lockedWinner: null,
    countdownTimer: null,
    lastHud: 0
  };
  if (DURATIONS.indexOf(state.settings.duration) === -1) state.settings.duration = 20;
  state.settings.reducedMotion = true; // luôn giảm chuyển động (không còn nút bật/tắt)
  state.settings.noRepeat = true; // luôn hạn chế lặp lại: ai đã được chọn thì chờ cả lớp có lượt

  // ------------------------------------------------------------------ tiện ích
  function setPhase(phase) {
    state.phase = phase;
    document.body.dataset.phase = phase;
    const screen = phase === 'setup' ? 'setup'
      : phase === 'ready' ? 'quiz'
      : phase === 'finished' ? 'finish'
      : 'race';
    ['setup', 'quiz', 'race', 'finish'].forEach(function (s) {
      $('screen-' + s).hidden = s !== screen;
    });
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3200);
  }

  /** Hộp thoại xác nhận. Trả về Promise<boolean>. */
  function confirmBox(title, text, okLabel, cancelLabel) {
    return new Promise(function (resolve) {
      const modal = $('modal');
      $('modal-title').textContent = title;
      $('modal-text').textContent = text;
      $('modal-ok').textContent = okLabel || 'Đồng ý';
      $('modal-cancel').textContent = cancelLabel || 'Hủy';
      $('modal-cancel').hidden = cancelLabel === null;
      modal.hidden = false;
      const prevFocus = document.activeElement;
      $('modal-ok').focus();
      function close(v) {
        modal.hidden = true;
        $('modal-ok').onclick = $('modal-cancel').onclick = null;
        document.removeEventListener('keydown', onKey, true);
        if (prevFocus && prevFocus.focus) prevFocus.focus();
        resolve(v);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
      }
      document.addEventListener('keydown', onKey, true);
      $('modal-ok').onclick = function () { close(true); };
      $('modal-cancel').onclick = function () { close(false); };
    });
  }

  function studentById(id) {
    for (let i = 0; i < state.roster.length; i++) if (state.roster[i].id === id) return state.roster[i];
    return null;
  }

  /** Họ tên đầy đủ để hiển thị ngoài đường đua; bạn trùng hẳn họ tên vẫn giữ số "#1", "#2". */
  function fullName(st) {
    return st.label.indexOf(st.name) === 0 ? st.label : st.name;
  }

  function persist() {
    PS.Storage.save({ text: state.appliedText, settings: state.settings });
  }

  // ------------------------------------------------------------------ màn hình chính
  function isPresetList(names) {
    return names.join('\n') === PS.CLASS_LIST.join('\n');
  }

  function updateListStatus() {
    const names = PS.Students.parse($('student-input').value);
    document.querySelectorAll('.js-student-count').forEach(function (el) {
      el.textContent = names.length + ' bạn';
      el.classList.toggle('empty', names.length === 0);
    });
    renderRosterGrid(names);
  }

  /** Lưới danh sách lớp: số thứ tự, họ tên đầy đủ và tên sẽ hiện trên đường đua (cùng màu chim). */
  function renderRosterGrid(names) {
    const ol = $('roster-grid');
    ol.innerHTML = '';
    PS.Students.buildRoster(names).forEach(function (r, i) {
      const li = document.createElement('li');
      li.style.setProperty('--c', r.color);
      const num = document.createElement('span');
      num.className = 'r-num';
      num.textContent = String(i + 1).padStart(2, '0');
      const text = document.createElement('span');
      text.className = 'r-text';
      const full = document.createElement('b');
      full.textContent = r.name;
      const tag = document.createElement('small');
      tag.textContent = '🐧 ' + r.label;
      text.appendChild(full);
      text.appendChild(tag);
      li.appendChild(num);
      li.appendChild(text);
      ol.appendChild(li);
    });
    if (!names.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Chưa có bạn nào — bấm “Sửa danh sách” để nhập.';
      ol.appendChild(li);
    }
  }

  function setListEditing(on) {
    state.editingList = on;
    $('list-editor').hidden = !on;
    $('roster-grid').hidden = on;
    $('btn-edit-list').hidden = on;
    $('btn-class-ok').hidden = on;
    $('btn-clear-list').hidden = !on;
    $('btn-done-list').hidden = !on;
    if (on) $('student-input').focus();
    else updateListStatus();
  }

  let classModalReturn = null;
  function openClassModal(edit) {
    classModalReturn = document.activeElement;
    $('class-modal').hidden = false;
    setListEditing(!!edit);
    if (!edit) $('btn-class-ok').focus();
  }

  function closeClassModal() {
    if ($('class-modal').hidden) return;
    if (state.editingList) setListEditing(false);
    $('class-modal').hidden = true;
    if (classModalReturn && classModalReturn.focus) classModalReturn.focus();
  }

  function renderDurationChips() {
    const wrap = $('duration-chips');
    wrap.innerHTML = '';
    DURATIONS.forEach(function (d) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(state.settings.duration === d));
      b.textContent = d + ' giây';
      b.onclick = function () { setDuration(d); };
      wrap.appendChild(b);
    });
  }

  function setDuration(d) {
    if (DURATIONS.indexOf(d) === -1) return;
    state.settings.duration = d;
    persist();
    renderDurationChips();
  }

  function applySettingsUI() {
    $('opt-sound').checked = state.settings.sound;
    PS.Sound.setEnabled(state.settings.sound);
    document.body.classList.toggle('reduced', state.settings.reducedMotion);
    document.querySelectorAll('[data-action="sound"]').forEach(function (b) {
      b.textContent = state.settings.sound ? '🔊' : '🔇';
      b.setAttribute('aria-pressed', String(state.settings.sound));
    });
  }

  async function startGame(resume) {
    const text = $('student-input').value;
    const names = PS.Students.parse(text);
    if (names.length === 0) {
      toast('Hãy nhập ít nhất một tên học sinh.');
      openClassModal(true);
      return;
    }
    const dups = PS.Students.findDuplicates(names);
    // Danh sách lớp để sẵn đã biết có 2 bạn trùng họ tên ⇒ không hỏi lại mỗi lần bắt đầu
    if (dups.length && !isPresetList(names)) {
      const ok = await confirmBox(
        'Danh sách có tên trùng',
        'Các tên: ' + dups.map(function (d) { return d.name + ' (' + d.count + ' lần)'; }).join(', ') +
          '. Nếu đây là các bạn khác nhau, tên sẽ được đánh số #1, #2… Tiếp tục?',
        'Vẫn tiếp tục', 'Sửa lại danh sách'
      );
      if (!ok) { openClassModal(true); return; }
    }
    closeClassModal();

    const normalized = names.join('\n');
    const rosterChanged = normalized !== PS.Students.parse(state.appliedText).join('\n') || state.roster.length === 0;
    state.appliedText = normalized;
    $('student-input').value = normalized;
    updateListStatus();
    persist();

    // "Bắt đầu" = ván mới (mọi bạn đủ điều kiện lại); "Tiếp tục" giữ vòng chọn nếu danh sách không đổi
    if (rosterChanged || !resume) {
      state.roster = PS.Students.buildRoster(names);
      state.picker.setRoster(state.roster.map(function (r) { return r.id; }));
      if (resume) toast('Danh sách đã thay đổi — vòng chọn được bắt đầu lại.');
    }
    if (!resume || rosterChanged) {
      state.qIndex = 0;
      state.qState = QUESTIONS.map(function () { return { studentId: null, chosen: null, revealed: false }; });
    }
    state.inProgress = true;
    PS.Sound.unlock();
    setPhase('ready');
    renderQuestion(); // vào màn Câu 1 trước; giáo viên bấm "Chọn bạn trả lời" để bắt đầu đua
  }

  /** Câu chưa có người trả lời ⇒ vào cuộc đua chọn bạn trước; có rồi ⇒ hiện câu hỏi. */
  function showQuestionOrPick() {
    renderQuestion();
    if (state.qState[state.qIndex].studentId == null) pickStudent();
  }

  function isLocked() {
    return state.qState[state.qIndex].studentId == null;
  }

  // ------------------------------------------------------------------ màn hình câu hỏi
  function renderDots() {
    const nav = $('q-dots');
    nav.innerHTML = '';
    QUESTIONS.forEach(function (q, i) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'q-dot' + (i === state.qIndex ? ' current' : '') + (state.qState[i].revealed ? ' done' : '');
      b.textContent = i + 1;
      b.setAttribute('aria-label', 'Câu ' + (i + 1));
      if (i === state.qIndex) b.setAttribute('aria-current', 'step');
      b.onclick = function () { goTo(i); };
      nav.appendChild(b);
    });
  }

  function renderAnswerer() {
    const qs = state.qState[state.qIndex];
    const st = qs.studentId == null ? null : studentById(qs.studentId);
    $('answerer-name').textContent = st ? fullName(st) : 'Chưa chọn';
    $('answerer-name').classList.toggle('empty', !st);
    $('answerer-name').title = st ? st.name : '';
    PS.drawAvatar($('answerer-avatar'), st ? st.color : null);
    $('btn-pick').textContent = st ? '🐧 CHỌN BẠN KHÁC' : '🐧 CHỌN BẠN TRẢ LỜI';
  }

  function renderQuestion() {
    const q = QUESTIONS[state.qIndex];
    const qs = state.qState[state.qIndex];
    const locked = isLocked();
    $('q-label').textContent = 'Câu ' + (state.qIndex + 1) + '/' + QUESTIONS.length;

    // Chưa chọn được bạn trả lời: không đưa nội dung câu hỏi lên màn hình
    $('q-locked').hidden = !locked;
    document.querySelector('.quiz-layout').classList.toggle('locked', locked);
    document.querySelector('.q-body').hidden = locked;
    $('btn-reset-q').hidden = locked;
    $('q-locked-title').textContent = 'Câu ' + (state.qIndex + 1) + ' đang chờ…';
    $('btn-reveal').disabled = locked || qs.revealed;
    $('btn-prev').disabled = state.qIndex === 0;
    $('btn-next').textContent = state.qIndex === QUESTIONS.length - 1 ? 'Kết thúc 🏁' : 'Câu tiếp →';
    renderDots();
    if (locked) {
      $('q-text').innerHTML = '';
      $('q-options').innerHTML = '';
      $('q-img').removeAttribute('src');
      $('q-feedback').className = 'feedback';
      $('q-feedback').textContent = '';
      $('q-solution').hidden = true;
      return;
    }
    $('q-text').innerHTML = q.text;

    const fig = $('q-figure');
    if (q.figure) {
      $('q-img').src = q.figure;
      $('q-img').alt = q.figureAlt || 'Hình minh họa';
      fig.hidden = false;
    } else {
      fig.hidden = true;
      $('q-img').removeAttribute('src');
    }

    const opts = $('q-options');
    opts.innerHTML = '';
    $('q-open').hidden = q.type !== 'open';
    if (q.type === 'choice') {
      q.options.forEach(function (html, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'option';
        const letter = document.createElement('span');
        letter.className = 'opt-letter';
        letter.textContent = LETTERS[i];
        const body = document.createElement('span');
        body.className = 'opt-text';
        body.innerHTML = html;
        b.appendChild(letter);
        b.appendChild(body);
        if (qs.revealed) {
          if (i === q.answer) b.classList.add('correct');
          else if (i === qs.chosen) b.classList.add('wrong');
          else b.classList.add('dim');
          b.disabled = true;
        }
        b.onclick = function () { chooseOption(i); };
        opts.appendChild(b);
      });
    }

    // Phản hồi + lời giải
    const fb = $('q-feedback');
    fb.className = 'feedback';
    fb.textContent = '';
    if (qs.revealed) {
      if (q.type === 'open') {
        fb.classList.add('info');
        fb.textContent = 'Đáp án: ' + q.answerText;
      } else if (qs.chosen === null) {
        fb.classList.add('info');
        fb.textContent = 'Đáp án đúng: ' + LETTERS[q.answer];
      } else if (qs.chosen === q.answer) {
        fb.classList.add('good');
        fb.textContent = '🎉 Chính xác! Giỏi lắm!';
      } else {
        fb.classList.add('soft');
        fb.textContent = 'Chưa đúng rồi — đáp án đúng là ' + LETTERS[q.answer] + '. Cùng xem lời giải nhé!';
      }
    }
    const sol = $('q-solution');
    sol.hidden = !qs.revealed;
    if (qs.revealed) {
      const body = $('q-solution-body');
      body.innerHTML = '';
      q.solution.forEach(function (line) {
        const p = document.createElement('p');
        p.innerHTML = line;
        body.appendChild(p);
      });
      if (q.note) {
        const p = document.createElement('p');
        p.className = 'note';
        const b = document.createElement('strong');
        b.textContent = q.note.label + ': ';
        p.appendChild(b);
        p.appendChild(document.createTextNode(q.note.text));
        body.appendChild(p);
      }
    }

    renderAnswerer();
  }

  function chooseOption(i) {
    if (state.phase !== 'ready' || isLocked()) return;
    const q = QUESTIONS[state.qIndex];
    const qs = state.qState[state.qIndex];
    if (qs.revealed) return;
    qs.chosen = i;
    qs.revealed = true;
    if (i === q.answer) PS.Sound.correct(); else PS.Sound.gentle();
    renderQuestion();
    $('q-solution').scrollIntoView({ behavior: state.settings.reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  }

  function reveal() {
    const qs = state.qState[state.qIndex];
    if (state.phase !== 'ready' || isLocked() || qs.revealed) return;
    qs.revealed = true;
    PS.Sound.correct();
    renderQuestion();
  }

  /** Chuyển câu. autoPick: câu chưa có người trả lời thì vào cuộc đua chọn bạn ngay. */
  function goTo(i, autoPick) {
    if (state.phase !== 'ready') return;
    state.qIndex = Math.max(0, Math.min(QUESTIONS.length - 1, i));
    if (autoPick) showQuestionOrPick(); else renderQuestion();
  }

  // ------------------------------------------------------------------ cuộc đua
  async function pickStudent() {
    if (state.phase !== 'ready') return; // chặn bấm nhiều lần
    if (state.roster.length === 0) { toast('Chưa có danh sách học sinh.'); return; }
    if (state.picker.isExhausted(state.settings.noRepeat)) {
      const ok = await confirmBox(
        'Tất cả các bạn đã có lượt!',
        'Cả ' + state.roster.length + ' bạn đều đã được chọn trong vòng này. Bắt đầu vòng mới (mọi bạn đều có thể được chọn lại)?',
        'Bắt đầu vòng mới', 'Hủy'
      );
      if (!ok) return;
      state.picker.newRound();
      toast('Đã bắt đầu vòng mới.');
    }
    if (state.phase !== 'ready') return;

    // KHÓA kết quả ngay tại đây — trước khi đếm ngược, độc lập với hoạt ảnh.
    state.lockedWinner = state.picker.pick(state.settings.noRepeat);
    setPhase('countdown');
    $('result').hidden = true;
    $('race-status').textContent = 'Chuẩn bị';
    $('race-time').textContent = formatTime(state.settings.duration * 1000);
    $('race-leaders').innerHTML = '';
    $('btn-stop').hidden = false;

    if (state.race) state.race.destroy();
    state.lastLeader = null;
    state.lastWhoosh = 0;
    state.lastTickSec = null;
    state.race = new PS.Race($('race-canvas'), state.roster, {
      minimap: $('race-minimap'),
      winnerId: state.lockedWinner,
      durationMs: state.settings.duration * 1000,
      reducedMotion: state.settings.reducedMotion,
      onTick: onRaceTick,
      onFinish: onRaceFinish
    });
    runCountdown();
  }

  function runCountdown() {
    const el = $('countdown');
    const num = $('countdown-num');
    const steps = ['3', '2', '1', 'BẮT ĐẦU!'];
    let k = 0;
    el.hidden = false;
    function step() {
      if (state.phase !== 'countdown') return;
      if (k < steps.length) {
        num.textContent = steps[k];
        num.classList.toggle('go', k === 3);
        num.classList.remove('pop');
        void num.offsetWidth; // khởi động lại animation CSS
        num.classList.add('pop');
        if (k < 3) PS.Sound.beep(); else PS.Sound.go();
        if (k === 3) {
          setPhase('racing');
          $('race-status').textContent = 'Đang đua';
          state.race.start();
          PS.Sound.startMusic(false);
          state.countdownTimer = setTimeout(function () { el.hidden = true; }, 700);
          return;
        }
        k++;
        state.countdownTimer = setTimeout(step, 850);
      }
    }
    step();
  }

  function formatTime(ms) {
    const s = Math.ceil(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function onRaceTick(info) {
    $('race-time').textContent = formatTime(info.remainingMs);
    const now = performance.now();
    if (info.sprint && !state.sprintShown) {
      state.sprintShown = true;
      $('race-status').textContent = '🔥 Nước rút!';
      $('race-status').classList.add('sprint');
      PS.Sound.riser();
      PS.Sound.startMusic(true);
    }
    // Tiếng "vút" khi đổi người dẫn đầu (giới hạn tần suất cho đỡ ồn)
    const leader = info.ranking[0];
    if (state.lastLeader !== null && leader !== state.lastLeader && now - state.lastWhoosh > 700) {
      PS.Sound.whoosh();
      state.lastWhoosh = now;
    }
    state.lastLeader = leader;
    // Tích tắc 3 giây cuối
    const sec = Math.ceil(info.remainingMs / 1000);
    if (sec <= 3 && sec >= 1 && sec !== state.lastTickSec) {
      state.lastTickSec = sec;
      PS.Sound.tick();
    }
    if (now - state.lastHud < 250) return;
    state.lastHud = now;
    const ol = $('race-leaders');
    ol.innerHTML = '';
    info.ranking.slice(0, 3).forEach(function (id, i) {
      const st = studentById(id);
      const li = document.createElement('li');
      li.style.setProperty('--c', st.color);
      const n = document.createElement('span');
      n.className = 'rank';
      n.textContent = i + 1;
      li.appendChild(n);
      li.appendChild(document.createTextNode(st.label));
      ol.appendChild(li);
    });
  }

  function onRaceFinish() {
    if (state.phase !== 'racing') return;
    state.sprintShown = false;
    $('race-status').classList.remove('sprint');
    $('race-status').textContent = 'Về đích!';
    $('race-time').textContent = '00:00';
    $('btn-stop').hidden = true;
    const st = studentById(state.lockedWinner);
    setPhase('result');
    // Họ tên đầy đủ là tên chính; tên trên đường đua chỉ là gợi ý nhỏ bên dưới
    $('result-name').textContent = st.name;
    $('result-short').textContent = st.label !== st.name ? '🐧 ' + st.label : '';
    $('result-msg').textContent = 'Mời bạn trả lời Câu ' + (state.qIndex + 1) + ' — chinh phục thử thách Toán học nào!';
    PS.drawAvatar($('result-avatar'), st.color, { happy: true });
    $('result').hidden = false;
    $('btn-answer').focus();
    PS.Sound.fanfare();
    if (!state.settings.reducedMotion) confetti($('confetti'));
  }

  async function stopRace() {
    if (state.phase !== 'countdown' && state.phase !== 'racing') return;
    const ok = await confirmBox('Dừng cuộc đua?', 'Kết quả lượt này sẽ bị hủy và chưa ai được chọn.', 'Dừng cuộc đua', 'Tiếp tục đua');
    if (!ok || (state.phase !== 'countdown' && state.phase !== 'racing')) return;
    // Trả lại người đã khóa vào vòng vì chưa công bố
    state.picker.unpick(state.lockedWinner);
    state.lockedWinner = null;
    teardownRace();
    setPhase('ready');
    renderQuestion();
  }

  function teardownRace() {
    clearTimeout(state.countdownTimer);
    PS.Sound.stopMusic();
    if (state.race) { state.race.destroy(); state.race = null; }
    $('countdown').hidden = true;
    $('result').hidden = true;
    $('race-status').classList.remove('sprint');
    state.sprintShown = false;
  }

  function acceptAnswerer() {
    if (state.phase !== 'result') return;
    state.qState[state.qIndex].studentId = state.lockedWinner;
    teardownRace();
    setPhase('ready');
    renderQuestion();
  }

  function raceAgain() {
    if (state.phase !== 'result') return;
    teardownRace();
    setPhase('ready');
    renderQuestion();
    pickStudent();
  }

  function backToSetup() {
    if (state.phase === 'countdown' || state.phase === 'racing') return;
    teardownRace();
    $('btn-continue').hidden = !state.inProgress;
    setPhase('setup');
    $('student-input').value = state.appliedText || $('student-input').value;
    updateListStatus();
  }

  // ------------------------------------------------------------------ hoàn thành
  function showFinish() {
    const ul = $('summary');
    ul.innerHTML = '';
    QUESTIONS.forEach(function (q, i) {
      const qs = state.qState[i];
      const li = document.createElement('li');
      const st = qs.studentId == null ? null : studentById(qs.studentId);
      const head = document.createElement('strong');
      head.textContent = 'Câu ' + (i + 1) + ': ';
      li.appendChild(head);
      li.appendChild(document.createTextNode(st ? '🐧 ' + fullName(st) : 'Cả lớp'));
      // Trắc nghiệm: sao khi chọn đúng. Tự luận: bạn đã lên trả lời thì được sao.
      const star = q.type === 'open' ? !!st : qs.revealed && qs.chosen === q.answer;
      if (star) {
        li.appendChild(document.createTextNode(' ⭐'));
      }
      ul.appendChild(li);
    });
    PS.drawAvatar($('finish-avatar'), PS.COLORS[0], { happy: true });
    setPhase('finished');
  }

  // ------------------------------------------------------------------ hiệu ứng pháo giấy
  function confetti(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth;
    const H = canvas.height = canvas.clientHeight;
    const colors = ['#ffd54f', '#ff7043', '#4fc3f7', '#ab47bc', '#66bb6a', '#ec407a', '#ffffff'];
    const parts = [];
    for (let i = 0; i < 140; i++) {
      parts.push({
        x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.45,
        vx: (Math.random() - 0.5) * 900, vy: -Math.random() * 700 - 200,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 10,
        w: 6 + Math.random() * 8, h: 4 + Math.random() * 5, c: colors[i % colors.length]
      });
    }
    const t0 = performance.now();
    let last = t0;
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      parts.forEach(function (p) {
        p.vy += 900 * dt;
        p.vx *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (now - t0 < 3000 && state.phase === 'result') requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ gắn sự kiện
  function toggleSound() {
    state.settings.sound = !state.settings.sound;
    persist();
    applySettingsUI();
    if (state.settings.sound && state.phase === 'racing') PS.Sound.startMusic(!!state.sprintShown);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  function init() {
    document.querySelectorAll('.js-class-name').forEach(function (el) { el.textContent = PS.CLASS_NAME; });
    $('student-input').value = state.appliedText || PS.CLASS_LIST.join('\n');
    $('student-input').addEventListener('input', updateListStatus);
    $('btn-class').onclick = function () { openClassModal(false); };
    $('btn-class-close').onclick = closeClassModal;
    $('btn-class-ok').onclick = closeClassModal;
    $('class-modal').addEventListener('click', function (e) { if (e.target === e.currentTarget) closeClassModal(); });
    $('btn-edit-list').onclick = function () { setListEditing(true); };
    $('btn-done-list').onclick = function () { setListEditing(false); };
    $('btn-clear-list').onclick = function () { $('student-input').value = ''; updateListStatus(); $('student-input').focus(); };

    $('opt-sound').onchange = function (e) { state.settings.sound = e.target.checked; persist(); applySettingsUI(); };

    $('btn-start').onclick = function () { startGame(false); };
    $('btn-continue').onclick = function () { startGame(true); };

    $('btn-pick').onclick = pickStudent;
    $('btn-pick-locked').onclick = pickStudent;
    $('btn-reveal').onclick = reveal;
    $('btn-prev').onclick = function () { goTo(state.qIndex - 1); };
    $('btn-next').onclick = function () {
      if (state.qIndex === QUESTIONS.length - 1) showFinish(); else goTo(state.qIndex + 1, true);
    };
    $('btn-reset-q').onclick = function () {
      state.qState[state.qIndex] = { studentId: null, chosen: null, revealed: false };
      renderQuestion();
    };
    $('btn-to-setup').onclick = backToSetup;

    $('btn-stop').onclick = stopRace;
    $('btn-answer').onclick = acceptAnswerer;
    $('btn-again').onclick = raceAgain;
    $('btn-result-setup').onclick = backToSetup;

    $('btn-replay').onclick = function () {
      state.qIndex = 0;
      state.qState = QUESTIONS.map(function () { return { studentId: null, chosen: null, revealed: false }; });
      setPhase('ready');
      renderQuestion();
    };
    $('btn-finish-setup').onclick = function () { state.inProgress = false; backToSetup(); };

    document.querySelectorAll('[data-action="sound"]').forEach(function (b) { b.onclick = toggleSound; });
    document.querySelectorAll('[data-action="fullscreen"]').forEach(function (b) { b.onclick = toggleFullscreen; });
    document.addEventListener('fullscreenchange', function () {
      document.querySelectorAll('.btn[data-action="fullscreen"]').forEach(function (b) {
        b.textContent = document.fullscreenElement ? '✕ Thoát toàn màn hình' : '⛶ Toàn màn hình';
      });
    });

    // Phím tắt trên màn hình câu hỏi: ← → chuyển câu, A–D chọn đáp án
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('modal').hidden && !$('class-modal').hidden) { closeClassModal(); return; }
      if (!$('modal').hidden || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (state.phase === 'ready') {
        if (e.key === 'ArrowRight') goTo(state.qIndex + 1);
        else if (e.key === 'ArrowLeft') goTo(state.qIndex - 1);
        else {
          const idx = LETTERS.indexOf(e.key.toUpperCase());
          const q = QUESTIONS[state.qIndex];
          if (idx !== -1 && q.type === 'choice' && idx < q.options.length) chooseOption(idx);
        }
      }
    });

    renderDurationChips();
    applySettingsUI();
    updateListStatus();
    PS.drawAvatar($('hero-penguin'), PS.COLORS[0], { happy: false });
    setPhase('setup');
  }

  init();
})();
