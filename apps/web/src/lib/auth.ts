const API_BASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || '')
    : (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

export interface Admin {
  id: string;
  username: string;
}

export interface LoginResponse {
  success: true;
  admin: Admin;
}

/**
 * Login with superadmin credentials. Sets HttpOnly session cookie on success.
 */
export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: 'Login failed' }));
    throw new Error(err.message || `Login failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Logout — clears the session cookie.
 */
export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {
    /* best-effort */
  });
}

/**
 * Check current session. Returns admin info if authenticated, null otherwise.
 */
export async function getCurrentAdmin(): Promise<Admin | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.admin as Admin;
  } catch {
    return null;
  }
}