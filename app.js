/* ═══════════════════════════════════════════════════════════════
   StudyFlow — Main Application Logic
   State Management: localStorage-backed reactive store pattern
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════ SVG GRADIENT INJECT ═══════════════════════════ */
document.body.insertAdjacentHTML('afterbegin', `
  <svg class="svg-defs" aria-hidden="true">
    <defs>
      <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stop-color="#7c3aed"/>
        <stop offset="100%" stop-color="#06b6d4"/>
      </linearGradient>
    </defs>
  </svg>
`);

/* ══════════════ 1. STATE MANAGEMENT ════════════════════════════

  Architecture: Centralized reactive store using observer pattern.
  - Single source of truth: `AppState` object.
  - Mutations happen only through `dispatch()`.
  - After every dispatch, subscribers are notified and UI re-renders.
  - Data is persisted to localStorage after every mutation.

═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'studyflow_v2';

const SUBJECT_COLORS = [
  '#7c3aed','#8b5cf6','#06b6d4','#0891b2','#10b981',
  '#059669','#f43f5e','#e11d48','#f59e0b','#d97706',
  '#3b82f6','#2563eb','#ec4899','#db2777','#6366f1',
];

const ICON_SVG = {
  check: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  drag: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>`,
  edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  clock: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>`,
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  empty: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
};

/* ─── Default seed data ─── */
function getDefaultData() {
  const today = new Date();
  const fmtDate = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const subjects = [
    { id: 's1', name: 'Mathematics', color: '#7c3aed' },
    { id: 's2', name: 'Computer Science', color: '#06b6d4' },
    { id: 's3', name: 'Literature', color: '#f43f5e' },
    { id: 's4', name: 'Physics', color: '#f59e0b' },
    { id: 's5', name: 'History', color: '#10b981' },
  ];

  const tasks = [
    { id: 't1', title: 'Calculus Problem Set #7',         subjectId: 's1', priority: 'urgent', deadline: fmtDate(-2), completed: false, notes: 'Problems 1–15 from Chapter 8', estTime: 120, createdAt: Date.now() - 10000 },
    { id: 't2', title: 'Binary Search Tree Lab',           subjectId: 's2', priority: 'high',   deadline: fmtDate(0),  completed: false, notes: 'Implement insert, search, delete', estTime: 180, createdAt: Date.now() - 9000 },
    { id: 't3', title: 'Essay: Hamlet Soliloquy Analysis', subjectId: 's3', priority: 'high',   deadline: fmtDate(-1), completed: false, notes: '3–5 pages double-spaced', estTime: 150, createdAt: Date.now() - 8000 },
    { id: 't4', title: 'Newton\'s Laws Problem Sheet',    subjectId: 's4', priority: 'medium', deadline: fmtDate(2),  completed: false, notes: '', estTime: 90, createdAt: Date.now() - 7000 },
    { id: 't5', title: 'Read Chapter 14: Cold War',        subjectId: 's5', priority: 'low',    deadline: fmtDate(3),  completed: false, notes: 'Focus on pp. 340–380', estTime: 60, createdAt: Date.now() - 6000 },
    { id: 't6', title: 'Linear Algebra Quiz Prep',         subjectId: 's1', priority: 'urgent', deadline: fmtDate(0),  completed: false, notes: 'Eigenvalues & eigenvectors', estTime: 100, createdAt: Date.now() - 5000 },
    { id: 't7', title: 'Build REST API Project',           subjectId: 's2', priority: 'medium', deadline: fmtDate(5),  completed: true,  notes: 'Express + MongoDB',  estTime: 240, createdAt: Date.now() - 4000 },
    { id: 't8', title: 'Poetry Annotation Assignment',     subjectId: 's3', priority: 'low',    deadline: fmtDate(4),  completed: false, notes: '', estTime: 45, createdAt: Date.now() - 3000 },
    { id: 't9', title: 'Thermodynamics Worksheet',         subjectId: 's4', priority: 'high',   deadline: fmtDate(-3), completed: false, notes: 'Heat engines section', estTime: 80, createdAt: Date.now() - 2000 },
    { id: 't10', title: 'WWII Timeline Project',           subjectId: 's5', priority: 'medium', deadline: fmtDate(1),  completed: false, notes: 'Interactive timeline using digital tool', estTime: 200, createdAt: Date.now() - 1000 },
  ];

  return { subjects, tasks };
}

/* ─── Load / Save State ─── */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      subjects: state.subjects,
      tasks: state.tasks,
      theme: state.theme,
      sidebarCollapsed: state.sidebarCollapsed,
    }));
  } catch(e) { console.warn('Save failed:', e); }
}

/* ─── Application State ─── */
const persisted = loadState();
const defaultData = getDefaultData();

const AppState = {
  subjects: persisted?.subjects || defaultData.subjects,
  tasks:    persisted?.tasks    || defaultData.tasks,
  theme:    persisted?.theme    || 'dark',
  sidebarCollapsed: persisted?.sidebarCollapsed || false,

  // UI state (not persisted)
  currentView: 'dashboard',
  filterSubject: '',
  filterPriority: '',
  searchQuery: '',
  calendarDate: new Date(),
  draggedTask: null,
  selectedTaskId: null,
  editingSubjectFilter: '',
};

const subscribers = [];
function subscribe(fn) { subscribers.push(fn); }
function notify() { subscribers.forEach(fn => fn(AppState)); }

function dispatch(action) {
  switch (action.type) {
    case 'ADD_TASK':
      AppState.tasks.push(action.task);
      break;
    case 'UPDATE_TASK':
      AppState.tasks = AppState.tasks.map(t => t.id === action.task.id ? action.task : t);
      break;
    case 'DELETE_TASK':
      AppState.tasks = AppState.tasks.filter(t => t.id !== action.id);
      break;
    case 'TOGGLE_TASK':
      AppState.tasks = AppState.tasks.map(t =>
        t.id === action.id ? { ...t, completed: !t.completed } : t
      );
      break;
    case 'MOVE_TASK_PRIORITY':
      AppState.tasks = AppState.tasks.map(t =>
        t.id === action.id ? { ...t, priority: action.priority } : t
      );
      break;
    case 'ADD_SUBJECT':
      AppState.subjects.push(action.subject);
      break;
    case 'SET_THEME':
      AppState.theme = action.theme;
      break;
    case 'SET_VIEW':
      AppState.currentView = action.view;
      break;
    case 'SET_FILTER_SUBJECT':
      AppState.filterSubject = action.value;
      break;
    case 'SET_FILTER_PRIORITY':
      AppState.filterPriority = action.value;
      break;
    case 'SET_SEARCH':
      AppState.searchQuery = action.value;
      break;
    case 'SET_SIDEBAR':
      AppState.sidebarCollapsed = action.collapsed;
      break;
    case 'SET_SELECTED_TASK':
      AppState.selectedTaskId = action.id;
      break;
  }
  saveState(AppState);
  notify();
}

/* ══════════════ 2. HELPERS ══════════════════════════════════ */

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function parseDate(str) {
  // Parse YYYY-MM-DD as local date
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getTaskStatus(task) {
  const today = todayStr();
  if (task.completed) return 'completed';
  if (task.deadline < today) return 'overdue';
  if (task.deadline === today) return 'today';
  return 'upcoming';
}

function getSubjectById(id) {
  return AppState.subjects.find(s => s.id === id) || null;
}

function formatDeadline(dateStr) {
  const today = new Date();
  const target = parseDate(dateStr);
  const diffMs = target - new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0)  return 'Today';
  if (diffDays === 1)  return 'Tomorrow';
  if (diffDays < 7)   return `${diffDays}d left`;
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Good Night 🌙';
  if (h < 12) return 'Good Morning ☀️';
  if (h < 17) return 'Good Afternoon 🌤';
  if (h < 21) return 'Good Evening 🌆';
  return 'Good Night 🌙';
}

function getFilteredTasks() {
  return AppState.tasks.filter(t => {
    const matchSubject  = !AppState.filterSubject  || t.subjectId === AppState.filterSubject;
    const matchPriority = !AppState.filterPriority || t.priority  === AppState.filterPriority;
    const matchSearch   = !AppState.searchQuery    ||
      t.title.toLowerCase().includes(AppState.searchQuery.toLowerCase()) ||
      (getSubjectById(t.subjectId)?.name || '').toLowerCase().includes(AppState.searchQuery.toLowerCase());
    return matchSubject && matchPriority && matchSearch;
  });
}

/* ══════════════ 3. UI HELPERS ══════════════════════════════ */

function showToast(message, type = 'info', duration = 3200) {
  const icons = { success: ICON_SVG.success, error: ICON_SVG.error, info: ICON_SVG.info, warning: ICON_SVG.warning };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

function openModal(overlay) {
  overlay.classList.add('open');
  overlay.querySelector('input, select, textarea')?.focus();
  document.body.style.overflow = 'hidden';
}

function closeModal(overlay) {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ══════════════ 4. TASK CARD RENDERER ══════════════════════ */

function buildTaskCard(task) {
  const subject = getSubjectById(task.subjectId);
  const status  = getTaskStatus(task);
  const dlLabel = formatDeadline(task.deadline);
  const isOverdue = status === 'overdue';
  const isToday   = status === 'today';

  const el = document.createElement('div');
  el.className = `task-card${task.completed ? ' completed' : ''}`;
  el.setAttribute('data-id', task.id);
  el.setAttribute('role', 'listitem');
  el.setAttribute('tabindex', '0');
  el.setAttribute('draggable', 'true');
  el.setAttribute('aria-label', `${task.title}, ${task.priority} priority, due ${dlLabel}`);

  el.innerHTML = `
    <div class="task-card-top">
      <span class="drag-handle" aria-hidden="true">${ICON_SVG.drag}</span>
      <div class="task-checkbox${task.completed ? ' checked' : ''}" data-id="${task.id}" role="checkbox"
        aria-checked="${task.completed}" tabindex="-1" title="Mark complete">
        ${ICON_SVG.check}
      </div>
      <div class="task-content">
        <p class="task-title">${escapeHtml(task.title)}</p>
        <div class="task-card-meta">
          ${subject ? `<span class="task-subject-pill" style="border-color:${subject.color}22;color:${subject.color}">${escapeHtml(subject.name)}</span>` : ''}
          <span class="task-deadline ${isOverdue ? 'overdue' : isToday ? 'today' : ''}">
            ${ICON_SVG.clock} ${dlLabel}
          </span>
          <span class="priority-badge p-${task.priority}">${task.priority}</span>
          ${task.estTime ? `<span class="task-deadline" style="margin-left:auto">${ICON_SVG.clock} ~${task.estTime}m</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit-btn" data-id="${task.id}" title="Edit task" aria-label="Edit">
          ${ICON_SVG.edit}
        </button>
        <button class="task-action-btn delete-btn" data-id="${task.id}" title="Delete task" aria-label="Delete">
          ${ICON_SVG.trash}
        </button>
      </div>
    </div>
  `;

  // Checkbox toggle
  el.querySelector('.task-checkbox').addEventListener('click', (e) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_TASK', id: task.id });
    showToast(task.completed ? 'Task marked incomplete' : '✅ Task completed!', 'success');
  });

  // Edit
  el.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openTaskModal(task);
  });

  // Delete
  el.querySelector('.delete-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id);
  });

  // Drag
  el.addEventListener('dragstart', (e) => {
    AppState.draggedTask = task.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
    setTimeout(() => el.classList.add('dragging'), 0);
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    AppState.draggedTask = null;
    document.querySelectorAll('.drag-over').forEach(z => z.classList.remove('drag-over'));
  });

  // Keyboard select
  el.addEventListener('click', () => {
    document.querySelectorAll('.task-card.selected-task').forEach(c => c.classList.remove('selected-task'));
    el.classList.add('selected-task');
    dispatch({ type: 'SET_SELECTED_TASK', id: task.id });
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.querySelector('.task-checkbox').click();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteTask(task.id);
    }
    if (e.key === 'e') openTaskModal(task);
  });

  return el;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════ 5. DASHBOARD VIEW RENDER ══════════════════ */

function renderDashboard() {
  const filtered = getFilteredTasks();
  const today    = todayStr();

  const overdue  = filtered.filter(t => !t.completed && t.deadline < today);
  const todayT   = filtered.filter(t => !t.completed && t.deadline === today);
  const upcoming = filtered.filter(t => !t.completed && t.deadline > today);

  // Stats
  const allTasks = AppState.tasks;
  const completed  = allTasks.filter(t => t.completed).length;
  const todayAll   = allTasks.filter(t => t.deadline === today);
  const todayDone  = todayAll.filter(t => t.completed).length;
  const pct = todayAll.length ? Math.round((todayDone / todayAll.length) * 100) : 0;

  document.getElementById('statTotalVal').textContent   = allTasks.length;
  document.getElementById('statDoneVal').textContent    = completed;
  document.getElementById('statOverdueVal').textContent = AppState.tasks.filter(t => !t.completed && t.deadline < today).length;
  document.getElementById('statTodayVal').textContent   = `${todayDone}/${todayAll.length}`;
  document.getElementById('progressText').textContent   = pct + '%';

  // Progress ring
  const circumference = 2 * Math.PI * 32; // r=32
  const fill = document.getElementById('progressRingFill');
  fill.style.strokeDasharray = circumference;
  fill.style.strokeDashoffset = circumference - (pct / 100) * circumference;

  // Column counts
  document.getElementById('count-overdue').textContent  = overdue.length;
  document.getElementById('count-today').textContent    = todayT.length;
  document.getElementById('count-upcoming').textContent = upcoming.length;

  const renderList = (listId, tasks, emptyMsg) => {
    const el = document.getElementById(listId);
    el.innerHTML = '';
    if (!tasks.length) {
      el.innerHTML = `<div class="empty-state">${ICON_SVG.empty}<p>${emptyMsg}</p></div>`;
    } else {
      tasks.sort((a,b) => {
        const pOrder = { urgent:0, high:1, medium:2, low:3 };
        return (pOrder[a.priority]??9) - (pOrder[b.priority]??9) || a.deadline.localeCompare(b.deadline);
      }).forEach(t => el.appendChild(buildTaskCard(t)));
    }
  };

  renderList('list-overdue',  overdue,  'No overdue tasks 🎉');
  renderList('list-today',    todayT,   'Nothing due today');
  renderList('list-upcoming', upcoming, 'No upcoming tasks');
}

/* ══════════════ 6. PRIORITY BOARD RENDER ══════════════════ */

function renderBoard() {
  const priorities = ['urgent','high','medium','low'];
  const counts = { urgent:0, high:0, medium:0, low:0 };

  priorities.forEach(p => {
    const zone = document.getElementById(`drop-${p}`);
    zone.innerHTML = '';
    const tasks = getFilteredTasks().filter(t => t.priority === p && !t.completed);
    tasks.sort((a,b) => a.deadline.localeCompare(b.deadline));
    tasks.forEach(t => {
      zone.appendChild(buildTaskCard(t));
      counts[p]++;
    });
    if (!tasks.length) {
      zone.innerHTML = `<div class="empty-state" style="padding:20px 16px">${ICON_SVG.empty}<p>No ${p} tasks</p></div>`;
    }
    document.getElementById(`pcount-${p}`).textContent = counts[p];

    // Drop zone events
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain') || AppState.draggedTask;
      if (id) {
        const task = AppState.tasks.find(t => t.id === id);
        if (task && task.priority !== p) {
          dispatch({ type: 'MOVE_TASK_PRIORITY', id, priority: p });
          showToast(`Moved to ${p} priority`, 'info');
        }
      }
    });
  });
}

/* ══════════════ 7. CALENDAR RENDER ════════════════════════ */

let calYear  = AppState.calendarDate.getFullYear();
let calMonth = AppState.calendarDate.getMonth();

function renderCalendar() {
  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  document.getElementById('calMonthLabel').textContent = monthLabel;

  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  // Day headers
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-name';
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  const today = todayStr();

  // Build task map by date
  const taskMap = {};
  AppState.tasks.forEach(t => {
    if (!taskMap[t.deadline]) taskMap[t.deadline] = [];
    taskMap[t.deadline].push(t);
  });

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day';

    let dateStr, dayNum, isOtherMonth = false;

    if (i < firstDay) {
      dayNum = prevDays - firstDay + i + 1;
      const d = new Date(calYear, calMonth-1, dayNum);
      dateStr = d.toISOString().split('T')[0];
      isOtherMonth = true;
    } else if (i >= firstDay + daysInMonth) {
      dayNum = i - firstDay - daysInMonth + 1;
      const d = new Date(calYear, calMonth+1, dayNum);
      dateStr = d.toISOString().split('T')[0];
      isOtherMonth = true;
    } else {
      dayNum = i - firstDay + 1;
      const d = new Date(calYear, calMonth, dayNum);
      dateStr = d.toISOString().split('T')[0];
    }

    if (isOtherMonth) el.classList.add('other-month');
    if (dateStr === today) el.classList.add('today');

    const dayTasks = taskMap[dateStr] || [];

    // Header: Day number + dues badge
    const header = document.createElement('div');
    header.className = 'cal-day-header';

    const numEl = document.createElement('div');
    numEl.className = 'cal-day-num';
    numEl.textContent = dayNum;
    header.appendChild(numEl);

    if (dayTasks.length > 0) {
      const badge = document.createElement('span');
      badge.className = 'cal-dues-badge';
      badge.textContent = `${dayTasks.length} due${dayTasks.length > 1 ? 's' : ''}`;
      header.appendChild(badge);
    }
    el.appendChild(header);

    // List of dues inside cell
    if (dayTasks.length > 0) {
      const duesList = document.createElement('div');
      duesList.className = 'cal-dues-list';

      const maxVisible = 3;
      dayTasks.slice(0, maxVisible).forEach(t => {
        const subj = AppState.subjects.find(s => s.id === t.subjectId) || { name: 'General', color: '#7c3aed' };
        const chip = document.createElement('div');
        chip.className = `cal-due-chip ${t.completed ? 'completed' : ''} prio-${t.priority}`;
        chip.style.borderLeftColor = subj.color;
        chip.title = `${t.title} (${subj.name}) · ${t.priority.toUpperCase()}${t.completed ? ' · Completed' : ''}`;

        const dot = document.createElement('span');
        dot.className = 'chip-dot';
        dot.style.background = subj.color;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'chip-title';
        titleSpan.textContent = t.title;

        chip.appendChild(dot);
        chip.appendChild(titleSpan);

        // Clicking a task chip opens task editor
        chip.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openTaskModal(t);
        });

        duesList.appendChild(chip);
      });

      if (dayTasks.length > maxVisible) {
        const more = document.createElement('div');
        more.className = 'cal-due-more';
        more.textContent = `+${dayTasks.length - maxVisible} more`;
        more.title = dayTasks.slice(maxVisible).map(t => `${t.title} (${t.priority})`).join('\n');
        more.addEventListener('click', (ev) => {
          ev.stopPropagation();
          showToast(`${dayTasks.length} tasks due on ${dateStr}`, 'info');
        });
        duesList.appendChild(more);
      }

      el.appendChild(duesList);
    }

    // Clicking cell opens New Task modal pre-filled with this date!
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('.cal-due-chip')) return;
      openTaskModal(null, dateStr);
    });

    grid.appendChild(el);
  }
}

/* ══════════════ 8. SIDEBAR SUBJECTS RENDER ════════════════ */

function renderSidebar() {
  const list = document.getElementById('subjectsList');
  const filterSel = document.getElementById('filterSubject');
  const taskSubjectSel = document.getElementById('taskSubject');

  // Sidebar subjects
  list.innerHTML = '';
  AppState.subjects.forEach(s => {
    const taskCount = AppState.tasks.filter(t => t.subjectId === s.id && !t.completed).length;
    const item = document.createElement('div');
    item.className = `subject-item${AppState.filterSubject === s.id ? ' active' : ''}`;
    item.innerHTML = `
      <span class="subject-dot" style="background:${s.color}"></span>
      <span>${escapeHtml(s.name)}</span>
      ${taskCount > 0 ? `<span class="task-count">${taskCount}</span>` : ''}
    `;
    item.addEventListener('click', () => {
      const val = AppState.filterSubject === s.id ? '' : s.id;
      dispatch({ type: 'SET_FILTER_SUBJECT', value: val });
      document.getElementById('filterSubject').value = val;
    });
    list.appendChild(item);
  });

  // Filter dropdown
  const curSubject = filterSel.value;
  filterSel.innerHTML = '<option value="">All Subjects</option>';
  AppState.subjects.forEach(s => {
    const opt = new Option(s.name, s.id);
    if (s.id === curSubject) opt.selected = true;
    filterSel.appendChild(opt);
  });

  // Task form subject select
  const curTaskSubject = taskSubjectSel.value;
  taskSubjectSel.innerHTML = '<option value="">Select subject…</option>';
  AppState.subjects.forEach(s => {
    const opt = new Option(s.name, s.id);
    if (s.id === curTaskSubject) opt.selected = true;
    taskSubjectSel.appendChild(opt);
  });
}

/* ══════════════ 9. MASTER RENDER ══════════════════════════ */

function render(state) {
  // Theme
  document.documentElement.setAttribute('data-theme', state.theme);
  const themeLabel = document.querySelector('.theme-label');
  if (themeLabel) themeLabel.textContent = state.theme === 'dark' ? 'Light mode' : 'Dark mode';

  // Sidebar collapse
  const sidebar = document.getElementById('sidebar');
  if (state.sidebarCollapsed) sidebar.classList.add('collapsed');
  else sidebar.classList.remove('collapsed');

  // Views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const activeView = document.getElementById(`view-${state.currentView}`);
  if (activeView) activeView.classList.add('active');

  // Nav items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === state.currentView);
  });

  // Render sidebar
  renderSidebar();

  // Render active view
  switch (state.currentView) {
    case 'dashboard': renderDashboard(); break;
    case 'board':     renderBoard();     break;
    case 'calendar':  renderCalendar();  break;
    case 'tools':     break;
  }
}

/* ══════════════ 10. GREETING & DATE ══════════════════════ */

function updateGreeting() {
  document.getElementById('greeting').textContent = getGreeting();
  document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

/* ══════════════ 11. TASK MODAL LOGIC ═════════════════════ */

function openTaskModal(task = null, defaultDate = null) {
  const modal    = document.getElementById('taskModal');
  const title    = document.getElementById('modalTitle');
  const form     = document.getElementById('taskForm');
  const idInput  = document.getElementById('editTaskId');
  const titleIn  = document.getElementById('taskTitle');
  const subjectIn= document.getElementById('taskSubject');
  const prioIn   = document.getElementById('taskPriority');
  const deadlineIn = document.getElementById('taskDeadline');
  const estIn    = document.getElementById('taskEstTime');
  const notesIn  = document.getElementById('taskNotes');

  form.querySelectorAll('.touched').forEach(el => el.classList.remove('touched'));

  if (task) {
    title.textContent       = 'Edit Task';
    idInput.value           = task.id;
    titleIn.value           = task.title;
    subjectIn.value         = task.subjectId;
    prioIn.value            = task.priority;
    deadlineIn.value        = task.deadline;
    estIn.value             = task.estTime || '';
    notesIn.value           = task.notes || '';
  } else {
    title.textContent = 'New Task';
    idInput.value     = '';
    form.reset();
    deadlineIn.value  = defaultDate || todayStr();
    prioIn.value      = 'medium';
    if (AppState.filterSubject) subjectIn.value = AppState.filterSubject;
  }

  document.getElementById('titleCounter').textContent = `${titleIn.value.length}/120`;
  openModal(modal);
}

/* ══════════════ 12. SUBJECT MODAL LOGIC ═════════════════ */

let selectedColor = SUBJECT_COLORS[0];

function openSubjectModal() {
  const picker = document.getElementById('colorPicker');
  picker.innerHTML = '';
  selectedColor = SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)];

  SUBJECT_COLORS.forEach(c => {
    const swatch = document.createElement('div');
    swatch.className = `color-swatch${c === selectedColor ? ' selected' : ''}`;
    swatch.style.background = c;
    swatch.setAttribute('role','radio');
    swatch.setAttribute('aria-label', c);
    swatch.addEventListener('click', () => {
      selectedColor = c;
      picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
    picker.appendChild(swatch);
  });

  document.getElementById('subjectName').value = '';
  openModal(document.getElementById('subjectModal'));
}

/* ══════════════ 13. DELETE TASK ══════════════════════════ */

function deleteTask(id) {
  const task = AppState.tasks.find(t => t.id === id);
  if (!task) return;
  dispatch({ type: 'DELETE_TASK', id });
  showToast(`Deleted "${task.title}"`, 'warning');
}

/* ══════════════ 14. TOPBAR SCROLL EFFECT ════════════════ */

document.getElementById('pageContent').addEventListener('scroll', (e) => {
  const topbar = document.getElementById('topbar');
  const scrolled = e.target.scrollTop > 10;
  topbar.style.boxShadow = scrolled ? '0 1px 20px rgba(0,0,0,0.25)' : '';
  topbar.style.background = scrolled
    ? (AppState.theme === 'dark' ? 'rgba(11,15,26,0.95)' : 'rgba(248,250,252,0.95)')
    : '';
  topbar.style.backdropFilter = scrolled ? 'blur(20px)' : '';
});

/* ══════════════ 15. EVENT LISTENERS ═════════════════════ */

// ─── Sidebar toggle ───
document.getElementById('sidebarToggle').addEventListener('click', () => {
  dispatch({ type: 'SET_SIDEBAR', collapsed: !AppState.sidebarCollapsed });
});

// ─── Mobile menu ───
const sidebarOverlay = document.createElement('div');
sidebarOverlay.className = 'sidebar-overlay';
document.body.appendChild(sidebarOverlay);

document.getElementById('mobileMenuBtn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  sidebarOverlay.style.display = document.getElementById('sidebar').classList.contains('mobile-open') ? 'block' : 'none';
});
sidebarOverlay.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('mobile-open');
  sidebarOverlay.style.display = 'none';
});

// ─── Theme toggle ───
document.getElementById('themeToggle').addEventListener('click', () => {
  dispatch({ type: 'SET_THEME', theme: AppState.theme === 'dark' ? 'light' : 'dark' });
  showToast(`Switched to ${AppState.theme} mode`, 'info');
});

// ─── Navigation ───
document.querySelectorAll('.nav-item[data-view]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    dispatch({ type: 'SET_VIEW', view: el.dataset.view });
    document.getElementById('sidebar').classList.remove('mobile-open');
    sidebarOverlay.style.display = 'none';
  });
});

// ─── Add Task Button ───
document.getElementById('addTaskBtn').addEventListener('click', () => openTaskModal());

// ─── Task Form Submit ───
document.getElementById('taskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const id      = document.getElementById('editTaskId').value;
  const title   = document.getElementById('taskTitle').value.trim();
  const subject = document.getElementById('taskSubject').value;
  const priority= document.getElementById('taskPriority').value;
  const deadline= document.getElementById('taskDeadline').value;
  const estTime = parseInt(document.getElementById('taskEstTime').value) || null;
  const notes   = document.getElementById('taskNotes').value.trim();

  if (!title || !subject || !deadline) {
    ['taskTitle','taskSubject','taskDeadline'].forEach(fid => {
      const el = document.getElementById(fid);
      if (!el.value) el.classList.add('touched');
    });
    showToast('Please fill in all required fields', 'error');
    return;
  }

  if (id) {
    const existing = AppState.tasks.find(t => t.id === id);
    dispatch({ type: 'UPDATE_TASK', task: { ...existing, title, subjectId: subject, priority, deadline, estTime, notes } });
    showToast('Task updated!', 'success');
  } else {
    dispatch({ type: 'ADD_TASK', task: { id: uid(), title, subjectId: subject, priority, deadline, estTime, notes, completed: false, createdAt: Date.now() } });
    showToast('Task added!', 'success');
  }

  closeModal(document.getElementById('taskModal'));
});

// Title character counter
document.getElementById('taskTitle').addEventListener('input', (e) => {
  document.getElementById('titleCounter').textContent = `${e.target.value.length}/120`;
});

// Mark inputs touched on blur
document.querySelectorAll('#taskForm input, #taskForm select').forEach(el => {
  el.addEventListener('blur', () => { if (!el.value) el.classList.add('touched'); });
  el.addEventListener('input', () => el.classList.remove('touched'));
});

// ─── Task Modal close ───
document.getElementById('modalClose').addEventListener('click', () => closeModal(document.getElementById('taskModal')));
document.getElementById('cancelTaskBtn').addEventListener('click', () => closeModal(document.getElementById('taskModal')));
document.getElementById('taskModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('taskModal')) closeModal(document.getElementById('taskModal'));
});

// ─── Subject Modal ───
document.getElementById('addSubjectBtn').addEventListener('click', openSubjectModal);
document.getElementById('subjectModalClose').addEventListener('click', () => closeModal(document.getElementById('subjectModal')));
document.getElementById('cancelSubjectBtn').addEventListener('click', () => closeModal(document.getElementById('subjectModal')));
document.getElementById('subjectModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('subjectModal')) closeModal(document.getElementById('subjectModal'));
});

document.getElementById('saveSubjectBtn').addEventListener('click', () => {
  const name = document.getElementById('subjectName').value.trim();
  if (!name) { showToast('Please enter a subject name', 'error'); return; }
  if (AppState.subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    showToast('Subject already exists!', 'warning'); return;
  }
  dispatch({ type: 'ADD_SUBJECT', subject: { id: uid(), name, color: selectedColor } });
  closeModal(document.getElementById('subjectModal'));
  showToast(`Subject "${name}" added!`, 'success');
});

// ─── Search ───
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    dispatch({ type: 'SET_SEARCH', value: e.target.value });
  }, 220);
});

// ─── Filters ───
document.getElementById('filterSubject').addEventListener('change', (e) => {
  dispatch({ type: 'SET_FILTER_SUBJECT', value: e.target.value });
});
document.getElementById('filterPriority').addEventListener('change', (e) => {
  dispatch({ type: 'SET_FILTER_PRIORITY', value: e.target.value });
});

// ─── Calendar nav ───
document.getElementById('calPrev').addEventListener('click', () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById('calNext').addEventListener('click', () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

// ─── Shortcuts modal ───
document.querySelector('.shortcuts-hint').addEventListener('click', () => openModal(document.getElementById('shortcutsModal')));
document.getElementById('shortcutsClose').addEventListener('click', () => closeModal(document.getElementById('shortcutsModal')));
document.getElementById('shortcutsModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('shortcutsModal')) closeModal(document.getElementById('shortcutsModal'));
});

/* ══════════════ 16. KEYBOARD SHORTCUTS ═════════════════════ */
document.addEventListener('keydown', (e) => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  const inInput = ['input','textarea','select'].includes(tag);

  // Esc — close any open modal
  if (e.key === 'Escape') {
    ['taskModal','subjectModal','shortcutsModal'].forEach(id => {
      const m = document.getElementById(id);
      if (m.classList.contains('open')) closeModal(m);
    });
    return;
  }

  // ? — shortcuts
  if (e.key === '?' && !inInput) {
    openModal(document.getElementById('shortcutsModal'));
    return;
  }

  // Ctrl+N — new task
  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    openTaskModal();
    return;
  }

  // Ctrl+K — focus search
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
    return;
  }

  // Ctrl+B — toggle sidebar
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault();
    dispatch({ type: 'SET_SIDEBAR', collapsed: !AppState.sidebarCollapsed });
    return;
  }

  // Ctrl+Shift+L — toggle theme
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    dispatch({ type: 'SET_THEME', theme: AppState.theme === 'dark' ? 'light' : 'dark' });
    return;
  }

  // Alt+1/2/3/4 — views
  if (e.altKey && !inInput) {
    if (e.key === '1') { e.preventDefault(); dispatch({ type: 'SET_VIEW', view: 'dashboard' }); }
    if (e.key === '2') { e.preventDefault(); dispatch({ type: 'SET_VIEW', view: 'board' }); }
    if (e.key === '3') { e.preventDefault(); dispatch({ type: 'SET_VIEW', view: 'calendar' }); }
    if (e.key === '4') { e.preventDefault(); dispatch({ type: 'SET_VIEW', view: 'tools' }); }
  }

  // Delete — delete selected task
  if ((e.key === 'Delete') && !inInput && AppState.selectedTaskId) {
    deleteTask(AppState.selectedTaskId);
    AppState.selectedTaskId = null;
  }
});

/* ══════════════ 17. TOAST CONTAINER REF ════════════════════ */
const toastContainer = document.getElementById('toastContainer');

/* ══════════════ 18. INIT ═══════════════════════════════════ */
subscribe(render);
updateGreeting();
setInterval(updateGreeting, 60000);

// Initial render
render(AppState);

// Welcome toast on first load
if (!persisted) {
  setTimeout(() => showToast('Welcome to StudyFlow! 🎓 Press ? for shortcuts', 'info', 5000), 600);
}






/* ═══════════════════════════════════════════════════════════════
   MODULE A: MOTIVATIONAL BANNER
═══════════════════════════════════════════════════════════════ */

const QUOTES = [
  { text: '"The secret of getting ahead is getting started."', author: '— Mark Twain' },
  { text: '"It always seems impossible until it is done."', author: '— Nelson Mandela' },
  { text: '"You don\'t have to be great to start, but you have to start to be great."', author: '— Zig Ziglar' },
  { text: '"An investment in knowledge pays the best interest."', author: '— Benjamin Franklin' },
  { text: '"Success is the sum of small efforts repeated day in and day out."', author: '— Robert Collier' },
  { text: '"The beautiful thing about learning is that nobody can take it away from you."', author: '— B.B. King' },
  { text: '"Study hard, for the well is deep, and our brains are shallow."', author: '— Richard Baxter' },
  { text: '"Education is the most powerful weapon which you can use to change the world."', author: '— Nelson Mandela' },
  { text: '"Don\'t watch the clock; do what it does. Keep going."', author: '— Sam Levenson' },
  { text: '"Push yourself, because no one else is going to do it for you."', author: '— Anonymous' },
  { text: '"Your future is created by what you do today, not tomorrow."', author: '— Robert Kiyosaki' },
  { text: '"Hard work beats talent when talent doesn\'t work hard."', author: '— Tim Notke' },
  { text: '"The expert in anything was once a beginner."', author: '— Helen Hayes' },
  { text: '"Dream big. Study hard. Think for yourself. Love everything."', author: '— Anonymous' },
  { text: '"You are capable of more than you know."', author: '— E. O. Wilson' },
];

let quoteIndex = Math.floor(Math.random() * QUOTES.length);
let quoteRotateInterval;

function showQuote(index) {
  const qEl = document.getElementById('motiQuote');
  const aEl = document.getElementById('motiAuthor');
  if (!qEl || !aEl) return;
  qEl.style.opacity = '0';
  aEl.style.opacity = '0';
  setTimeout(() => {
    qEl.textContent = QUOTES[index].text;
    aEl.textContent = QUOTES[index].author;
    qEl.style.opacity = '1';
    aEl.style.opacity = '1';
  }, 300);
}

function buildParticles() {
  const container = document.getElementById('motiParticles');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#7c3aed','#06b6d4','#f43f5e','#f59e0b','#10b981','#8b5cf6'];
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    p.className = 'moti-particle';
    const size = 8 + Math.random() * 24;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${20 + Math.random() * 60}%;
      background:${colors[i % colors.length]};
      animation-duration:${4 + Math.random() * 6}s;
      animation-delay:${Math.random() * 4}s;
    `;
    container.appendChild(p);
  }
}

function initMotivationalBanner() {
  showQuote(quoteIndex);
  buildParticles();

  quoteRotateInterval = setInterval(() => {
    quoteIndex = (quoteIndex + 1) % QUOTES.length;
    showQuote(quoteIndex);
  }, 15000);

  document.getElementById('motiRefresh')?.addEventListener('click', () => {
    quoteIndex = (quoteIndex + 1) % QUOTES.length;
    showQuote(quoteIndex);
  });
}

/* ═══════════════════════════════════════════════════════════════
   MODULE B: XP / STREAK SYSTEM
═══════════════════════════════════════════════════════════════ */

function calcXP() {
  const done = AppState.tasks.filter(t => t.completed);
  const xp = done.reduce((acc, t) => {
    const bonus = { urgent: 50, high: 35, medium: 20, low: 10 };
    return acc + (bonus[t.priority] || 10);
  }, 0);
  return xp;
}

function calcStreak() {
  // Simple: days with at least 1 completion near today
  const completedDates = new Set(
    AppState.tasks
      .filter(t => t.completed)
      .map(t => new Date(t.createdAt).toISOString().split('T')[0])
  );
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (completedDates.has(ds)) { streak++; d.setDate(d.getDate()-1); }
    else break;
    if (streak > 365) break;
  }
  return streak;
}

function initXPSystem() {
  function update() {
    const xp = calcXP();
    const streak = calcStreak();
    const lvl = Math.floor(xp / 100);
    const pct = (xp % 100);
    const fill = document.getElementById('xpFill');
    const pts  = document.getElementById('xpPts');
    const sc   = document.getElementById('streakCount');
    if (fill) fill.style.width = pct + '%';
    if (pts)  pts.textContent = `${xp} XP · Lv.${lvl + 1}`;
    if (sc)   sc.textContent = streak;
  }
  update();
  subscribe(update);
}

/* ═══════════════════════════════════════════════════════════════
   MODULE C: IST CLOCK & HOME QUICK ACTIONS
═══════════════════════════════════════════════════════════════ */

function updateISTClock() {
  const timeEl = document.getElementById('istTime');
  const ampmEl = document.getElementById('istAmpm');
  const dateEl = document.getElementById('istDate');
  if (!timeEl) return;

  const now = new Date();
  const options = { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);

  const hour = parts.find(p => p.type === 'hour')?.value || '12';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  const second = parts.find(p => p.type === 'second')?.value || '00';
  const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || 'AM';

  timeEl.textContent = `${hour}:${minute}:${second}`;
  if (ampmEl) ampmEl.textContent = dayPeriod.toUpperCase();

  const dateOptions = { timeZone: 'Asia/Kolkata', weekday: 'short', month: 'short', day: 'numeric' };
  const dateStr = new Intl.DateTimeFormat('en-US', dateOptions).format(now);
  if (dateEl) dateEl.textContent = dateStr;
}

function initISTClock() {
  updateISTClock();
  setInterval(updateISTClock, 1000);
}

function initQuickStudyButtons() {
  const launchTimer = (mins = 25) => {
    dispatch({ type: 'SET_VIEW', view: 'tools' });
    const btn = document.getElementById(`preset${mins}`) || document.getElementById('preset25');
    if (btn) btn.click();
    setTimeout(() => {
      document.getElementById('timerPlay')?.click();
      showToast(`🍅 ${mins}m Focus session started!`, 'success');
    }, 150);
  };

  const launchStopwatch = () => {
    dispatch({ type: 'SET_VIEW', view: 'tools' });
    setTimeout(() => {
      document.getElementById('swPlay')?.click();
      showToast('⚡ Stopwatch active!', 'info');
    }, 150);
  };

  // Topbar quick buttons
  document.getElementById('topbarQuickTimer')?.addEventListener('click', () => launchTimer(25));
  document.getElementById('topbarQuickSw')?.addEventListener('click', launchStopwatch);

  // Home page quick buttons
  document.getElementById('homeQuickTimerBtn')?.addEventListener('click', () => launchTimer(25));
  document.getElementById('homeQuickBreakBtn')?.addEventListener('click', () => launchTimer(5));
  document.getElementById('homeQuickSwBtn')?.addEventListener('click', launchStopwatch);
}

/* ═══════════════════════════════════════════════════════════════
   MODULE D: POMODORO TIMER
═══════════════════════════════════════════════════════════════ */

function initTimer() {
  const CIRCUMFERENCE = 552.92; // 2π×88
  let totalSecs    = 25 * 60;
  let remainSecs   = totalSecs;
  let timerRunning = false;
  let timerInterval;
  let sessionCount = 1;
  let isBreak      = false;
  let completedSessions = 0;

  const playBtn    = document.getElementById('timerPlay');
  const resetBtn   = document.getElementById('timerReset');
  const skipBtn    = document.getElementById('timerSkip');
  const dispEl     = document.getElementById('timerDisplay');
  const labelEl    = document.getElementById('timerLabel');
  const sessionEl  = document.getElementById('timerSession');
  const ringFill   = document.getElementById('timerRingFill');
  const timerCard  = document.querySelector('.timer-card');
  const customRow  = document.getElementById('customTimeRow');

  function updateDisplay() {
    if (!dispEl) return;
    const m = Math.floor(remainSecs / 60);
    const s = remainSecs % 60;
    dispEl.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    // Ring
    const pct = remainSecs / totalSecs;
    const offset = CIRCUMFERENCE * (1 - pct);
    if (ringFill) ringFill.style.strokeDashoffset = offset;

    // Break mode color
    if (isBreak) {
      ringFill?.classList.add('break-mode');
      playBtn?.classList.add('break-play');
      playBtn?.classList.remove('running');
      labelEl && (labelEl.textContent = sessionCount === 4 ? 'Long Break 🌿' : 'Short Break ☕');
    } else {
      ringFill?.classList.remove('break-mode');
      labelEl && (labelEl.textContent = 'Focus Time 🎯');
    }
    sessionEl && (sessionEl.textContent = `Session ${sessionCount}`);
  }

  function updateDots() {
    document.querySelectorAll('.s-dot').forEach((dot, i) => {
      dot.className = 's-dot';
      if (i < completedSessions % 4) dot.classList.add('done');
      if (i === (completedSessions % 4) && !isBreak) dot.classList.add('active');
    });
  }

  function setPreset(mins, secs = 0) {
    clearInterval(timerInterval);
    timerRunning = false;
    totalSecs  = mins * 60 + secs;
    remainSecs = totalSecs;
    if (playBtn) { playBtn.textContent = '▶ Start'; playBtn.classList.remove('running','break-play'); }
    ringFill?.classList.remove('pulsing');
    timerCard?.classList.remove('alarming');
    updateDisplay();
  }

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      isBreak = false;
      const mins = parseInt(btn.dataset.mins);
      if (mins === 0) {
        customRow.style.display = 'flex';
        return;
      }
      customRow.style.display = 'none';
      setPreset(mins);
    });
  });

  document.getElementById('btnSetCustom')?.addEventListener('click', () => {
    const m = parseInt(document.getElementById('customMins').value) || 0;
    const s = parseInt(document.getElementById('customSecs').value) || 0;
    if (m + s === 0) { showToast('Please enter a valid time', 'error'); return; }
    customRow.style.display = 'none';
    isBreak = false;
    setPreset(m, s);
  });

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const play = (freq, start, dur) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = freq;
        o.type = 'sine';
        g.gain.setValueAtTime(0.4, ctx.currentTime + start);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        o.start(ctx.currentTime + start);
        o.stop(ctx.currentTime + start + dur);
      };
      play(880, 0,    0.15);
      play(1100, 0.2, 0.15);
      play(1320, 0.4, 0.3);
    } catch(e) {}
  }

  function onTimerComplete() {
    clearInterval(timerInterval);
    timerRunning = false;
    beep();
    ringFill?.classList.add('pulsing');
    timerCard?.classList.add('alarming');

    if (!isBreak) {
      completedSessions++;
      updateDots();
      const isLong = completedSessions % 4 === 0;
      isBreak   = true;
      totalSecs = (isLong ? 15 : 5) * 60;
      remainSecs = totalSecs;
      showToast(isLong ? '🎉 4 sessions done! Take a long break!' : '✅ Focus done! Take a short break.', 'success', 5000);
      fireConfetti();
      // Auto-set break preset highlight
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(isLong ? 'preset15' : 'preset5')?.classList.add('active');
    } else {
      isBreak   = false;
      sessionCount++;
      totalSecs = 25 * 60;
      remainSecs = totalSecs;
      showToast('⏰ Break over! Time to focus!', 'info', 4000);
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('preset25')?.classList.add('active');
    }

    if (playBtn) { playBtn.textContent = '▶ Start'; playBtn.classList.remove('running','break-play'); }
    updateDisplay();
  }

  playBtn?.addEventListener('click', () => {
    timerCard?.classList.remove('alarming');
    ringFill?.classList.remove('pulsing');
    if (timerRunning) {
      clearInterval(timerInterval);
      timerRunning = false;
      playBtn.textContent = '▶ Resume';
      playBtn.classList.remove('running');
    } else {
      if (remainSecs <= 0) { setPreset(isBreak ? (sessionCount%4===0?15:5) : 25); }
      timerRunning = true;
      playBtn.textContent = '⏸ Pause';
      playBtn.classList.add('running');
      ringFill?.classList.add('pulsing');
      timerInterval = setInterval(() => {
        remainSecs--;
        updateDisplay();
        if (remainSecs <= 0) onTimerComplete();
      }, 1000);
    }
  });

  resetBtn?.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerRunning = false;
    timerCard?.classList.remove('alarming');
    ringFill?.classList.remove('pulsing');
    remainSecs = totalSecs;
    isBreak    = false;
    if (playBtn) { playBtn.textContent = '▶ Start'; playBtn.classList.remove('running','break-play'); }
    updateDisplay();
  });

  skipBtn?.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerRunning = false;
    onTimerComplete();
  });

  updateDisplay();
  updateDots();
}

/* ═══════════════════════════════════════════════════════════════
   MODULE E: STOPWATCH
═══════════════════════════════════════════════════════════════ */

function initStopwatch() {
  const CIRCUMFERENCE = 439.82; // 2π×70
  let elapsed   = 0;   // ms
  let running   = false;
  let startTime = 0;
  let rafId;
  let laps      = [];
  let lapStart  = 0;

  const mainEl   = document.getElementById('swMain');
  const msEl     = document.getElementById('swMs');
  const playBtn  = document.getElementById('swPlay');
  const resetBtn = document.getElementById('swReset');
  const lapBtn   = document.getElementById('swLap');
  const arcFill  = document.getElementById('swArcFill');
  const lapsList = document.getElementById('lapsList');
  const lapsHeader = document.getElementById('lapsHeader');

  function fmtMs(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return { main: `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`, ms: `.${String(cs).padStart(2,'0')}` };
  }

  function updateArc(ms) {
    // One full rotation = 60 seconds
    const pct = (ms % 60000) / 60000;
    const offset = CIRCUMFERENCE * (1 - pct);
    if (arcFill) arcFill.style.strokeDashoffset = offset;
  }

  function tick() {
    if (!running) return;
    elapsed = Date.now() - startTime;
    const f = fmtMs(elapsed);
    if (mainEl) mainEl.textContent = f.main;
    if (msEl)   msEl.textContent = f.ms;
    updateArc(elapsed);
    rafId = requestAnimationFrame(tick);
  }

  function renderLaps() {
    if (!lapsList) return;
    lapsList.innerHTML = '';
    if (laps.length === 0) { lapsHeader && (lapsHeader.style.display = 'none'); return; }
    lapsHeader && (lapsHeader.style.display = 'grid');

    const times = laps.map(l => l.lapMs);
    const best  = Math.min(...times);
    const worst = Math.max(...times);

    [...laps].reverse().forEach(lap => {
      const row = document.createElement('div');
      row.className = 'lap-item';
      if (lap.lapMs === best && laps.length > 1)  row.classList.add('best');
      if (lap.lapMs === worst && laps.length > 1) row.classList.add('worst');

      const fl = fmtMs(lap.lapMs);
      const ft = fmtMs(lap.totalMs);
      row.innerHTML = `
        <span class="lap-num">${lap.n}</span>
        <span class="lap-time">${fl.main}${fl.ms}</span>
        <span class="lap-total">${ft.main}${ft.ms}</span>
      `;
      lapsList.appendChild(row);
    });
  }

  playBtn?.addEventListener('click', () => {
    if (running) {
      running = false;
      cancelAnimationFrame(rafId);
      elapsed = Date.now() - startTime;
      playBtn.textContent = '▶ Resume';
      playBtn.classList.remove('running');
      if (lapBtn) lapBtn.disabled = false;
    } else {
      startTime = Date.now() - elapsed;
      lapStart  = lapStart || startTime;
      running = true;
      playBtn.textContent = '⏸ Pause';
      playBtn.classList.add('running');
      if (lapBtn) lapBtn.disabled = false;
      tick();
    }
  });

  resetBtn?.addEventListener('click', () => {
    running = false;
    cancelAnimationFrame(rafId);
    elapsed = 0;
    laps = [];
    lapStart = 0;
    if (mainEl) mainEl.textContent = '00:00';
    if (msEl)   msEl.textContent = '.00';
    if (arcFill) arcFill.style.strokeDashoffset = CIRCUMFERENCE;
    if (lapBtn) { lapBtn.disabled = true; }
    if (playBtn) { playBtn.textContent = '▶ Start'; playBtn.classList.remove('running'); }
    renderLaps();
  });

  lapBtn?.addEventListener('click', () => {
    if (!running && elapsed === 0) return;
    const now = Date.now();
    const lapMs   = now - (lapStart || startTime);
    const totalMs = now - (startTime - elapsed + elapsed); // = elapsed
    const actualTotal = elapsed;
    laps.push({ n: laps.length + 1, lapMs, totalMs: actualTotal });
    lapStart = now;
    renderLaps();
  });

  // Initialize arc
  if (arcFill) arcFill.style.strokeDashoffset = CIRCUMFERENCE;
}

/* ═══════════════════════════════════════════════════════════════
   MODULE F: CONFETTI CANNON
═══════════════════════════════════════════════════════════════ */

function fireConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const COLORS = ['#7c3aed','#8b5cf6','#06b6d4','#f43f5e','#f59e0b','#10b981','#ec4899','#3b82f6'];
  const particles = [];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: canvas.width  * Math.random(),
      y: -20 - Math.random() * 100,
      w: 6 + Math.random() * 10,
      h: 4 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      vx: (Math.random() - 0.5) * 4,
      vy: 3 + Math.random() * 6,
      vr: (Math.random() - 0.5) * 12,
      opacity: 1,
    });
  }

  let frame;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    particles.forEach(p => {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.15; // gravity
      p.rotation += p.vr;
      if (p.y > canvas.height * 0.7) p.opacity -= 0.03;
      if (p.opacity <= 0) return;
      alive = true;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (alive) frame = requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  cancelAnimationFrame(frame);
  draw();
}

// Trigger confetti when a task is completed
const _origDispatch = dispatch;
subscribe((state) => {
  // lightweight: detect XP increase as proxy for task completion
});
// Hook directly: patch TOGGLE_TASK to fire confetti
const originalDispatch = dispatch;
// Override toggle in checkbox click — already handled in buildTaskCard
// We check via a lightweight proxy on the subscribe:
let _prevDoneCount = AppState.tasks.filter(t => t.completed).length;
subscribe((state) => {
  const nowDone = state.tasks.filter(t => t.completed).length;
  if (nowDone > _prevDoneCount) fireConfetti();
  _prevDoneCount = nowDone;
});

/* ══════════════ 19. TOOLS INITIALIZATION ══════════════════════ */
initMotivationalBanner();
initXPSystem();
initISTClock();
initQuickStudyButtons();
initTimer();
initStopwatch();

console.info(`
  ╔══════════════════════════════╗
  ║  StudyFlow — State Manager   ║
  ╠══════════════════════════════╣
  ║  Pattern: Observer Store     ║
  ║  Persistence: localStorage   ║
  ║  Key: ${STORAGE_KEY.padEnd(18)}║
  ╚══════════════════════════════╝
  Tasks loaded: ${AppState.tasks.length}
  Subjects: ${AppState.subjects.length}
  Tools: Clocks ✓ Timer ✓ Stopwatch ✓
`);


