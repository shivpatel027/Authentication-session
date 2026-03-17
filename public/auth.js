const API = 'http://localhost:3000';

// Get stored auth data
function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}
function getAccessToken() { return localStorage.getItem('accessToken'); }
function getRefreshToken() { return localStorage.getItem('refreshToken'); }
function getRole() { return localStorage.getItem('role'); }

// Redirect if not logged in
function requireAuth(requiredRole = null) {
  const token = getAccessToken();
  const role = getRole();
  if (!token) { window.location.href = '/login'; return false; }
  if (requiredRole && role !== requiredRole) { window.location.href = '/dashboard'; return false; }
  return true;
}

// Try to refresh access token using refresh token
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API}/users/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) throw new Error('Refresh failed');
    const data = await res.json();
    localStorage.setItem('accessToken', data.accessToken);
    return data.accessToken;
  } catch {
    logout();
    return null;
  }
}

// Authenticated fetch — auto-retries with refreshed token on 401
async function authFetch(url, options = {}) {
  let token = getAccessToken();
  const doFetch = (t) => fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}`, ...(options.headers || {}) }
  });

  let res = await doFetch(token);
  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) return null;
    res = await doFetch(token);
  }
  return res;
}

// Logout
async function logout() {
  const refreshToken = getRefreshToken();
  const token = getAccessToken();
  try {
    if (token && refreshToken) {
      await fetch(`${API}/users/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ refreshToken })
      });
    }
  } catch {}
  localStorage.clear();
  window.location.href = '/login';
}