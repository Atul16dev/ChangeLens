/**
 * ChangeLens Authentication API Client
 * Sends credentialed requests (cookies included) to /api/v1/auth
 */

const AUTH_BASE = '/api/v1/auth';

async function authFetch(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    ...options,
    credentials: 'include', // Crucial for HttpOnly session cookies
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error?.message || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.code = data.error?.code || 'AUTH_ERROR';
    err.statusCode = res.status;
    err.data = data.data || data.error;
    throw err;
  }

  return data;
}

export async function registerUser({ name, email, password, confirmPassword }) {
  return authFetch(`${AUTH_BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({ name, email, password, confirmPassword }),
  });
}

export async function verifyEmailOtp({ email, otp }) {
  return authFetch(`${AUTH_BASE}/verify-email`, {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function resendVerificationOtp({ email }) {
  return authFetch(`${AUTH_BASE}/resend-verification-otp`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function loginUser({ email, password }) {
  return authFetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutUser() {
  return authFetch(`${AUTH_BASE}/logout`, {
    method: 'POST',
  });
}

export async function getCurrentUser() {
  return authFetch(`${AUTH_BASE}/me`, {
    method: 'GET',
  });
}

export async function updateUserProfile(payload) {
  return authFetch(`${AUTH_BASE}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword({ email }) {
  return authFetch(`${AUTH_BASE}/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetOtp({ email, otp }) {
  return authFetch(`${AUTH_BASE}/verify-reset-otp`, {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
}

export async function resetPassword({ email, resetToken, newPassword, confirmPassword }) {
  return authFetch(`${AUTH_BASE}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ email, resetToken, newPassword, confirmPassword }),
  });
}
