/**
 * Path traversal (directory escape) kontrolü.
 * Backend tarafında da mutlaka aynı kontroller yapılmalıdır.
 */
export function isPathSafe(path: string, allowedBasePaths?: string[]): boolean {
  if (!path || typeof path !== 'string') return false;
  const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/');
  if (normalized.includes('..')) return false;
  if (normalized.startsWith('/') && !normalized.startsWith('//')) {
    if (allowedBasePaths?.length) {
      return allowedBasePaths.some(base => normalized.startsWith(base.replace(/\\/g, '/')));
    }
    return true;
  }
  return !normalized.includes('..');
}

export function validatePath(path: string, allowedBasePaths?: string[]): void {
  if (!isPathSafe(path, allowedBasePaths)) {
    throw new Error('Geçersiz dosya yolu: path traversal engellendi');
  }
}
