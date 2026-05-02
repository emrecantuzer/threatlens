# Security Documentation

This documentation contains security measures and integration recommendations in ThreatLens.

## Applied Security Fixes

### 1. Authentication (auth.ts)
- **Hardcoded credentials removed** – User credentials are now loaded from the `.env` file (`VITE_AUTH_USERS`) or only in development mode (with a warning)
- **Brute force protection** – 5-minute lockout after 5 failed attempts
- **Input validation** – Username is trimmed and length limits are applied
- **Production** – No one can log in if env is missing during build

### 2. YAML Deserialization (yamlService.ts)
- **FAILSAFE_SCHEMA** – Secure schema is used against `yaml.load()` arbitrary code execution vulnerability
- **js-yaml 4.1.1+** – Package updated for known vulnerabilities

### 3. SQL Injection (backend/userService.ts)
- **Column allowlist** – `updateUser` and `getUsers` use only allowed columns

### 4. Path Traversal (ruleFileService, yamlService)
- **Path validation** – Paths containing `../` are rejected

## Integration Recommendations

### 5. Backend Integration (Completed)
- **Node.js Server** – A secure backend layer was created with the `server.js` file.
- **Security Headers** – HTTP header security was provided with the `helmet` package.
- **Rate Limiting** – Rate limiting was introduced for API endpoints.
- **Path Validation** – `path.resolve` and `startsWith` controls were implemented on the backend for file reading operations.
- **Session Auth** – Secure session management was added with `cookie-session`.

### Mandatory for Production
1. **Backend Authentication** – Use a real auth system based on JWT or session
2. **HTTPS** – All traffic must be encrypted
3. **Password hashing** – with bcrypt/argon2; plain text should never be stored
4. **Rate limiting** – On API and login endpoints
5. **CORS** – Only allow trusted origins

### .env Configuration
```bash
cp .env.example .env
# Update VITE_AUTH_USERS in the .env file
```

### Backend Path Doğrulama
`/api/rules/read`, `/api/config/read` vb. endpoint'lerde path parametresini mutlaka doğrulayın:
- İzin verilen base path'ler dışına çıkışı engelleyin
- `path.resolve()` + `startsWith(allowedDir)` kontrolü yapın

### Database
- `data/threatlens.db` dosyası hassas veri içerebilir; `.gitignore`'a ekleyin
- Production'da güçlü veritabanı kullanıcı şifreleri kullanın
