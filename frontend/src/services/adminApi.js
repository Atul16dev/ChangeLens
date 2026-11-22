/**
 * ChangeLens Admin API Client
 * Interacts with /api/v1/admin endpoints with credentials
 */

const ADMIN_BASE = '/api/v1/admin';

async function adminFetch(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.code = data.error?.code || 'ADMIN_API_ERROR';
    err.statusCode = res.status;
    err.data = data.data || data.error;
    throw err;
  }

  return data;
}

export async function getAdminMe() {
  return adminFetch(`${ADMIN_BASE}/me`);
}

export async function sendAdminInvite({ email, role = 'admin', permissions = {}, expiresInHours = 72 }) {
  return adminFetch(`${ADMIN_BASE}/invites`, {
    method: 'POST',
    body: JSON.stringify({ email, role, permissions, expiresInHours }),
  });
}

export async function listAdminInvites({ status = '', page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));

  const qs = params.toString();
  return adminFetch(`${ADMIN_BASE}/invites${qs ? `?${qs}` : ''}`);
}

export async function revokeAdminInvite(id) {
  return adminFetch(`${ADMIN_BASE}/invites/${id}`, {
    method: 'DELETE',
  });
}

export async function verifyAdminInviteToken(token) {
  return adminFetch(`${ADMIN_BASE}/invites/verify/${encodeURIComponent(token)}`);
}

export async function acceptAdminInvite({ token }) {
  return adminFetch(`${ADMIN_BASE}/invites/accept`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function listAdminUsers({ page = 1, limit = 50, search = '', role = '', status = '' } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  if (search) params.set('search', search);
  if (role) params.set('role', role);
  if (status) params.set('status', status);

  const qs = params.toString();
  return adminFetch(`${ADMIN_BASE}/users${qs ? `?${qs}` : ''}`);
}

export async function updateUserAccess(userId, { role, permissions }) {
  return adminFetch(`${ADMIN_BASE}/users/${userId}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ role, permissions }),
  });
}

export async function revokeUserAccess(userId) {
  return adminFetch(`${ADMIN_BASE}/users/${userId}/access`, {
    method: 'DELETE',
  });
}

export async function banUser(userId, { reason = '' } = {}) {
  return adminFetch(`${ADMIN_BASE}/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function unbanUser(userId) {
  return adminFetch(`${ADMIN_BASE}/users/${userId}/unban`, {
    method: 'POST',
  });
}

export async function getUserActivity(userId) {
  return adminFetch(`${ADMIN_BASE}/users/${userId}/activity`);
}

export async function addUserNote(userId, { text }) {
  return adminFetch(`${ADMIN_BASE}/users/${userId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}
