export type UserRole = 'super_admin' | 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  loginTime: string;
  logoutTime: string | null;
  ipAddress: string;
  userAgent: string;
}

export const ROLE_PERMISSIONS = {
  super_admin: ['all'],
  admin: [
    'dashboard',
    'monitor',
    'logs',
    'events',
    'rules'
  ],
  user: [
    'dashboard',
    'monitor',
    'logs',
    'events'
  ]
} as const;

/** Örnek admin yapısı - backend entegrasyonunda kullanım için. Şifre asla kaynak kodda tutulmamalı. */
export const getDefaultAdminTemplate = (): Omit<User, 'id' | 'createdAt' | 'updatedAt'> => ({
  username: 'admin',
  email: 'admin@threatlens.local',
  role: 'super_admin',
  status: 'active',
  lastLogin: null
});