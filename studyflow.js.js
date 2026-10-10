(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const TASKS_KEY = 'studyflow.tasks.v1';
  const THEME_KEY = 'studyflow.theme';

  function load(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  /* ---------- Data ---------- */
  function seed() {
    const t = today();
    return [
      { id: 1, title: 'Data Structures assignment', course: 'Data Structures', due: iso(t), priority: 'High', done: false },
      { id: 2, title: 'Tutoring lesson plan', course: 'Tutoring', due: iso(addDays(t, 1)), priority: 'Low', done: false },
      { id: 3, title: 'Database quiz revision', course: 'Databases', due: iso(addDays(t, 2)), priority: 'Medium', done: false },
      { id: 4, title: 'Group project slides', course: 'Software Engineering', due: iso(addDays(t, 4)), priority: 'Medium', done: false },
      { id: 5, title: 'Calculus worksheet', course: 'Mathematics', due: iso(addDays(t, -2)), priority: 'Medium', done: true }
    ];
  }

  let tasks = load(TASKS_KEY, null);
  if (!Array.isArray(tasks)) { tasks = seed(); save(TASKS_KEY, tasks); }
  let weekOffset = 0;

  /* ---------- Views ---------- */
  const views = ['dashboard', 'add', 'planner'];

  function show(name) {
    if (views.indexOf(name) === -1) name = 'dashboard';
    views.forEach((v) => { $('#view-' + v).hidden = v !== name; });
    $$('[data-view]').forEach((b) => {
      if (b.classList.contains('link') || b.closest('.tabbar')) {
        b.classList.toggle('active', b.dataset.view === name);
      }
    });
    if (name === 'add') resetForm();
    if (name === 'dashboard') renderDashboard();
    if (name === 'planner') renderPlanner();
    window.scrollTo(0, 0);
  }

  function go(name) {
    if (location.hash !== '#' + name) location.hash = name; else show(name);
  }

  window.addEventListener('hashchange', () => show(location.hash.slice(1)));

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) { e.preventDefault(); go(b.dataset.view); }
  });

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  /* ---------- Dashboard ---------- */
  function whenLabel(dueStr) {
    const diff = Math.round((parse(dueStr) - today()) / 86400000);
    if (diff < 0) return { text: 'Overdue', over: true };
    if (diff === 0) return { text: 'Today', over: false };
    if (diff === 1) return { text: 'Tomorrow', over: false };
    const d = parse(dueStr);
    return { text: DAYS[d.getDay()] + ' ' + d.getDate(), over: false };
  }

  function renderDashboard() {
    const t = today();
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    $('#greeting').textContent = part + ', Ayesha!';
    $('#todayLabel').textContent = DAYS[t.getDay()] + ', ' + t.getDate() + ' ' + MONTHS[t.getMonth()] + ' ' + t.getFullYear();

    const open = tasks.filter((x) => !x.done).sort((a, b) => a.due.localeCompare(b.due));
    const weekEnd = iso(addDays(t, 6));

    $('#statToday').textContent = open.filter((x) => x.due === iso(t)).length;
    $('#statWeek').textContent = open.filter((x) => x.due <= weekEnd).length;
    $('#statDone').textContent = tasks.filter((x) => x.done).length;

    const list = $('#taskList');
    list.textContent = '';
    const shown = open.filter((x) => x.due <= weekEnd);
    $('#emptyMsg').hidden = shown.length > 0;

    shown.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'task';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.setAttribute('aria-label', 'Mark "' + task.title + '" as done');
      cb.addEventListener('change', () => {
        task.done = true;
        save(TASKS_KEY, tasks);
        toast('Nice work! Task completed ✅');
        renderDashboard();
      });

      const body = document.createElement('div');
      body.className = 'task-body';
      const title = document.createElement('div');
      title.className = 'task-title';
      title.textContent = task.title;
      const meta = document.createElement('div');
      meta.className = 'task-meta';
      meta.textContent = task.course;
      body.append(title, meta);

      const tag = document.createElement('span');
      tag.className = 'tag ' + task.priority;
      tag.textContent = task.priority;

      const w = whenLabel(task.due);
      const when = document.createElement('span');
      when.className = 'when' + (w.over ? ' over' : '');
      when.textContent = w.text;

      const del = document.createElement('button');
      del.className = 'del';
      del.type = 'button';
      del.textContent = '✕';
      del.setAttribute('aria-label', 'Delete "' + task.title + '"');
      del.addEventListener('click', () => {
        tasks = tasks.filter((x) => x.id !== task.id);
        save(TASKS_KEY, tasks);
        toast('Task deleted');
        renderDashboard();
      });

      li.append(cb, body, tag, when, del);
      list.appendChild(li);
    });

    renderPlan(open);
  }

  function renderPlan(open) {
    const plan = $('#planList');
    plan.textContent = '';
    const slots = [['6:00 PM', open[0]], ['8:00 PM', open[1]]];
    slots.forEach((s) => {
      const li = document.createElement('li');
      const time = document.createElement('b');
      time.textContent = s[0];
      const text = document.createElement('span');
      if (s[1]) { text.textContent = 'Work on: ' + s[1].title; li.append(time, text); }
      else { li.className = 'free'; text.textContent = 'Free slot'; li.append(time, text); }
      plan.appendChild(li);
    });
    const free = document.createElement('li');
    free.className = 'free';
    const ft = document.createElement('b');
    ft.textContent = '9:30 PM';
    const fs = document.createElement('span');
    fs.textContent = 'Free time. Rest up! 😴';
    free.append(ft, fs);
    plan.appendChild(free);
  }

  /* ---------- Add task form ---------- */
  function resetForm() {
    $('#taskForm').reset();
    $('#fDue').min = iso(today());
    $('#fDue').value = iso(addDays(today(), 1));
    $('#errTitle').hidden = true;
    $('#errDue').hidden = true;
  }

  $('#taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('#fTitle').value.trim();
    const due = $('#fDue').value;
    $('#errTitle').hidden = !!title;
    $('#errDue').hidden = !!due;
    if (!title || !due) return;

    const priority = ($('input[name="priority"]:checked') || {}).value || 'Medium';
    tasks.push({
      id: Date.now(),
      title: title,
      course: $('#fCourse').value,
      due: due,
      priority: priority,
      remind: $('#fRemind').checked,
      notes: $('#fNotes').value.trim(),
      done: false
    });
    save(TASKS_KEY, tasks);
    toast('Task saved ✨');
    go('dashboard');
  });

  /* ---------- Planner ---------- */
  function renderPlanner() {
    const t = today();
    const mondayShift = (t.getDay() + 6) % 7;
    const start = addDays(t, -mondayShift + weekOffset * 7);
    const end = addDays(start, 6);
    $('#weekLabel').textContent = 'Week of ' + start.getDate() + ' ' + MONTHS[start.getMonth()] +
      ' – ' + end.getDate() + ' ' + MONTHS[end.getMonth()];

    const grid = $('#week');
    grid.textContent = '';

    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const dow = d.getDay();
      const col = document.createElement('div');
      col.className = 'day' + (iso(d) === iso(t) ? ' today' : '');

      const head = document.createElement('div');
      head.className = 'day-head';
      head.textContent = DAYS[dow];
      const num = document.createElement('b');
      num.textContent = d.getDate();
      head.appendChild(num);
      col.appendChild(head);

      const add = (cls, text) => {
        const b = document.createElement('div');
        b.className = 'block ' + cls;
        b.textContent = text;
        col.appendChild(b);
      };

      if (dow >= 1 && dow <= 4) add('class', 'Classes');
      if (dow === 2 || dow === 5) add('work', 'Tutoring');
      if (dow === 1 || dow === 3 || dow === 4 || dow === 6) add('study', 'Study');
      tasks.filter((x) => !x.done && x.due === iso(d)).forEach((x) => add('due', 'Due: ' + x.title));
      if (dow === 0) add('free', 'Free day');

      grid.appendChild(col);
    }
  }

  $('#prevWeek').addEventListener('click', () => { weekOffset--; renderPlanner(); });
  $('#nextWeek').addEventListener('click', () => { weekOffset++; renderPlanner(); });
  $('#thisWeek').addEventListener('click', () => { weekOffset = 0; renderPlanner(); });

  /* ---------- Theme ---------- */
  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    $('#themeToggle').textContent = mode === 'dark' ? '☀️' : '🌙';
  }
  const savedTheme = load(THEME_KEY, null) ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  $('#themeToggle').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    save(THEME_KEY, next);
  });

  /* ---------- Start ---------- */
  show(location.hash.slice(1) || 'dashboard');
})();
