const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
}

export function register(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function login(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function createAdminUser(token, payload) {
  return request('/auth/admin-users', {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export function fetchTasks(token, params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, value);
    }
  });

  return request(`/tasks${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, {
    token
  });
}

export function fetchStats(token) {
  return request('/tasks/stats', { token });
}

export function fetchAllTasks(token, params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, value);
    }
  });

  return request(`/tasks/admin/all${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, {
    token
  });
}

export function createTask(token, payload) {
  return request('/tasks', {
    method: 'POST',
    token,
    body: JSON.stringify(payload)
  });
}

export function updateTask(token, taskId, payload) {
  return request(`/tasks/${taskId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload)
  });
}

export function deleteTask(token, taskId) {
  return request(`/tasks/${taskId}`, {
    method: 'DELETE',
    token
  });
}
