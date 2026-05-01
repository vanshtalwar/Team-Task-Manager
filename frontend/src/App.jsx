import { useEffect, useMemo, useState } from 'react';
import {
  createTask,
  createAdminUser,
  deleteTask,
  fetchAllTasks,
  fetchStats,
  fetchTasks,
  login,
  register,
  updateTask
} from './api';

const emptyTaskForm = {
  title: '',
  description: '',
  dueDate: '',
  priority: 'Medium'
};

const statusOptions = ['Todo', 'In Progress', 'Done'];
const priorityOptions = ['High', 'Medium', 'Low'];

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function App() {
  const [mode, setMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [adminUserForm, setAdminUserForm] = useState({ name: '', email: '', password: '' });
  const [filters, setFilters] = useState({ status: '', priority: '', search: '', page: 1 });
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('task-token');
    const user = localStorage.getItem('task-user');
    return {
      token,
      user: user ? JSON.parse(user) : null
    };
  });
  const [adminView, setAdminView] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState({});

  const taskCountLabel = useMemo(() => {
    return `${pagination.total} task${pagination.total === 1 ? '' : 's'}`;
  }, [pagination.total]);

  useEffect(() => {
    if (!auth.token) {
      return;
    }

    let active = true;

    async function loadData() {
      setLoading(true);
      setError('');

      try {
        const fetchTasksFunc = adminView && auth.user?.role === 'admin' ? fetchAllTasks : fetchTasks;
        const [tasksResponse, statsResponse] = await Promise.all([
          fetchTasksFunc(auth.token, filters),
          fetchStats(auth.token)
        ]);

        if (!active) {
          return;
        }

        setTasks(tasksResponse.tasks || []);
        setPagination(tasksResponse.pagination || pagination);
        setStats(statsResponse.stats || null);
        setDrafts(
          Object.fromEntries(
            (tasksResponse.tasks || []).map((task) => [
              task._id,
              {
                status: task.status,
                priority: task.priority
              }
            ])
          )
        );
      } catch (requestError) {
        if (active) {
          setError(requestError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [auth.token, auth.user?.role, adminView, filters]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const response = mode === 'register' ? await register(authForm) : await login(authForm);
      setAuth({ token: response.token, user: response.user });
      localStorage.setItem('task-token', response.token);
      localStorage.setItem('task-user', JSON.stringify(response.user));
      setNotice(mode === 'register' ? 'Account created successfully.' : 'Logged in successfully.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    setError('');

    try {
      await createTask(auth.token, taskForm);
      setTaskForm(emptyTaskForm);
      const [tasksResponse, statsResponse] = await Promise.all([
        fetchTasks(auth.token, filters),
        fetchStats(auth.token)
      ]);
      setTasks(tasksResponse.tasks || []);
      setPagination(tasksResponse.pagination || pagination);
      setStats(statsResponse.stats || null);
      setNotice('Task created.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleCreateAdminUser(event) {
    event.preventDefault();
    setError('');

    try {
      const response = await createAdminUser(auth.token, adminUserForm);
      setAdminUserForm({ name: '', email: '', password: '' });
      setNotice(response.message || 'Admin user updated successfully.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleTaskSave(taskId) {
    setError('');

    try {
      const draft = drafts[taskId];
      await updateTask(auth.token, taskId, draft);
      const [tasksResponse, statsResponse] = await Promise.all([
        fetchTasks(auth.token, filters),
        fetchStats(auth.token)
      ]);
      setTasks(tasksResponse.tasks || []);
      setPagination(tasksResponse.pagination || pagination);
      setStats(statsResponse.stats || null);
      setNotice('Task updated.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDeleteTask(taskId) {
    setError('');

    try {
      await deleteTask(auth.token, taskId);
      const [tasksResponse, statsResponse] = await Promise.all([
        fetchTasks(auth.token, filters),
        fetchStats(auth.token)
      ]);
      setTasks(tasksResponse.tasks || []);
      setPagination(tasksResponse.pagination || pagination);
      setStats(statsResponse.stats || null);
      setNotice('Task deleted.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem('task-token');
    localStorage.removeItem('task-user');
    setAuth({ token: null, user: null });
    setTasks([]);
    setStats(null);
    setAdminView(false);
    setFilters({ status: '', priority: '', search: '', page: 1 });
    setNotice('Logged out.');
  }

  function updateDraft(taskId, key, value) {
    setDrafts((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] || {}),
        [key]: value
      }
    }));
  }

  function updateFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1
    }));
  }

  if (!auth.token) {
    return (
      <main className="shell auth-shell">
        <section className="hero-card">
          <p className="eyebrow">Smart Task Manager</p>
          <h1>Task control with real workflow logic.</h1>
          <p className="hero-copy">
            Register, manage task state transitions, surface overdue work automatically, and inspect simple analytics.
          </p>
          <div className="hero-badges">
            <span>JWT auth</span>
            <span>Priority sorting</span>
            <span>Overdue logic</span>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-tabs">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
              Login
            </button>
            <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
              Register
            </button>
          </div>

          <form className="stack" onSubmit={handleAuthSubmit}>
            {mode === 'register' ? (
              <label>
                Name
                <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} required />
              </label>
            ) : null}
            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                required
              />
            </label>
            <button className="primary" type="submit">
              {mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {error ? <p className="status error">{error}</p> : null}
          {notice ? <p className="status success">{notice}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="shell dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Welcome back, {auth.user?.name || 'there'}.</h1>
          <p className="muted">
            {auth.user?.role === 'admin' ? (
              <>
                <span className="role-badge">Admin</span> • {adminView ? 'Viewing all tasks' : `${taskCountLabel} loaded`} with priority-first sorting.
              </>
            ) : (
              <>{taskCountLabel} loaded with priority-first sorting.</>
            )}
          </p>
        </div>
        <div className="topbar-actions">
          {auth.user?.role === 'admin' ? (
            <button 
              className={`ghost ${adminView ? 'active' : ''}`} 
              type="button" 
              onClick={() => setAdminView(!adminView)}
            >
              {adminView ? 'My Tasks' : 'All Tasks'}
            </button>
          ) : null}
          <button className="ghost" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Total</span>
          <strong>{stats?.totalTasks ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Completed</span>
          <strong>{stats?.completedTasks ?? 0}</strong>
        </article>
        <article className="stat-card danger">
          <span>Overdue</span>
          <strong>{stats?.overdueTasks ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>High priority</span>
          <strong>{stats?.byPriority?.High ?? 0}</strong>
        </article>
      </section>

      {auth.user?.role === 'admin' ? (
        <section className="panel admin-panel">
          <h2>Create or promote admin</h2>
          <p className="muted">Use this form to create a new admin account or promote an existing user by email.</p>
          <form className="stack" onSubmit={handleCreateAdminUser}>
            <div className="form-row">
              <label>
                Name
                <input
                  value={adminUserForm.name}
                  onChange={(event) => setAdminUserForm({ ...adminUserForm, name: event.target.value })}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={adminUserForm.email}
                  onChange={(event) => setAdminUserForm({ ...adminUserForm, email: event.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              Password
              <input
                type="password"
                value={adminUserForm.password}
                onChange={(event) => setAdminUserForm({ ...adminUserForm, password: event.target.value })}
                placeholder="Required for new admin, optional for promotion"
              />
            </label>
            <button className="primary" type="submit">Save admin user</button>
          </form>
        </section>
      ) : null}

      <section className="content-grid">
        <div className="panel">
          <h2>Add Task</h2>
          <form className="stack" onSubmit={handleCreateTask}>
            <label>
              Title
              <input value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required />
            </label>
            <label>
              Description
              <textarea
                rows="4"
                value={taskForm.description}
                onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
              />
            </label>
            <div className="form-row">
              <label>
                Due date
                <input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} required />
              </label>
              <label>
                Priority
                <select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>
                  {priorityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="primary" type="submit">
              Save task
            </button>
          </form>
        </div>

        <div className="panel">
          <h2>Filters</h2>
          <div className="filters">
            <input
              placeholder="Search title"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select value={filters.priority} onChange={(event) => updateFilter('priority', event.target.value)}>
              <option value="">All priorities</option>
              {priorityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="status error">{error}</p> : null}
          {notice ? <p className="status success">{notice}</p> : null}
          {loading ? <p className="muted">Loading tasks...</p> : null}

          <div className="task-list">
            {tasks.length === 0 && !loading ? <p className="muted">No tasks found.</p> : null}

            {tasks.map((task) => {
              const overdue = task.isOverdue || task.overdue;
              const draft = drafts[task._id] || { status: task.status, priority: task.priority };

              return (
                <article key={task._id} className={`task-card ${overdue ? 'overdue' : ''}`}>
                  <div className="task-head">
                    <div>
                      <h3>{task.title}</h3>
                      {adminView && task.creator ? (
                        <p className="creator-badge">👤 {task.creator.name} ({task.creator.email})</p>
                      ) : null}
                      <p>{task.description || 'No description provided.'}</p>
                    </div>
                    {overdue ? <span className="pill overdue-pill">Overdue</span> : null}
                  </div>

                  <div className="task-meta">
                    <span>Status: {task.status}</span>
                    <span>Priority: {task.priority}</span>
                    <span>Due: {formatDate(task.dueDate)}</span>
                  </div>

                  <div className="form-row">
                    <label>
                      Update status
                      <select value={draft.status} onChange={(event) => updateDraft(task._id, 'status', event.target.value)}>
                        {statusOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Update priority
                      <select value={draft.priority} onChange={(event) => updateDraft(task._id, 'priority', event.target.value)}>
                        {priorityOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="task-actions">
                    <button type="button" className="primary" onClick={() => handleTaskSave(task._id)}>
                      Save
                    </button>
                    <button type="button" className="danger-button" onClick={() => handleDeleteTask(task._id)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="pagination">
            <button type="button" className="ghost" disabled={pagination.page <= 1} onClick={() => updateFilter('page', pagination.page - 1)}>
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button type="button" className="ghost" disabled={pagination.page >= pagination.pages} onClick={() => updateFilter('page', pagination.page + 1)}>
              Next
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
