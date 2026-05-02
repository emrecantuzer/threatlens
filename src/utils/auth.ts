import { User } from '../types/auth';

/**
 * Demo/development auth config from environment.
 * UYARI: Production'da mutlaka gerçek bir backend (JWT/session) kullanın.
 * Kimlik bilgileri .env dosyasında tanımlanmalı, kaynak kodda hardcode EDİLmemelidir.
 */
const getAuthUsers = (): Record<string, { id: string; username: string; password: string; role: 'admin' | 'user'; permissions: string[] }> => {
  try {
    const usersJson = import.meta.env.VITE_AUTH_USERS;
    if (usersJson && typeof usersJson === 'string') {
      return JSON.parse(usersJson);
    }
  } catch {
    console.warn('[Auth] VITE_AUTH_USERS geçersiz JSON');
  }
  // Sadece development modunda ve env yoksa: uyarı ile demo kullanıcılar. Production build'de çalışmaz.
  if (import.meta.env.DEV) {
    console.warn('[Auth] GÜVENLİK: Production için .env dosyasında VITE_AUTH_USERS tanımlayın veya backend auth kullanın.');
    return {
      admin: { id: '1', username: 'admin', password: 'admin', role: 'admin', permissions: ['all'] },
      user: { id: '2', username: 'user', password: 'user', role: 'user', permissions: ['dashboard', 'logs'] }
    };
  }
  return {};
};

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 dakika
const STORAGE_KEY_ATTEMPTS = 'threatlens_login_attempts';
const STORAGE_KEY_LOCKOUT = 'threatlens_lockout_until';

function checkLockout(): boolean {
  const until = localStorage.getItem(STORAGE_KEY_LOCKOUT);
  if (until && Date.now() < parseInt(until, 10)) {
    return true;
  }
  if (until) {
    localStorage.removeItem(STORAGE_KEY_LOCKOUT);
    localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
  }
  return false;
}

function recordFailedAttempt(): void {
  const attempts = parseInt(localStorage.getItem(STORAGE_KEY_ATTEMPTS) || '0', 10) + 1;
  localStorage.setItem(STORAGE_KEY_ATTEMPTS, String(attempts));
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    localStorage.setItem(STORAGE_KEY_LOCKOUT, String(Date.now() + LOCKOUT_MS));
  }
}

function recordSuccess(): void {
  localStorage.removeItem(STORAGE_KEY_ATTEMPTS);
  localStorage.removeItem(STORAGE_KEY_LOCKOUT);
}

export const authenticate = (username: string, password: string): User | null => {
  const trimmedUsername = String(username).trim().slice(0, 64);
  if (!trimmedUsername || !password) return null;
  if (checkLockout()) return null;

  const USERS = getAuthUsers();
  const user = USERS[trimmedUsername];
  if (user && user.password === password) {
    recordSuccess();
    const { password: _, ...userWithoutPassword } = user;
    localStorage.setItem('user', JSON.stringify(userWithoutPassword));
    localStorage.setItem('isAuthenticated', 'true');
    return userWithoutPassword;
  }
  recordFailedAttempt();
  return null;
};

export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

export const hasPermission = (permission: string): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  return user.role === 'admin' || user.permissions.includes(permission);
};