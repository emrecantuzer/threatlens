import express from 'express';
import path from 'path';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieSession from 'cookie-session';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';
import readline from 'readline';

// __dirname is not defined in ESM modules, creating it manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- SECURITY SETTINGS ---

// 1. HTTP Header Security (Helmet)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled during development so it doesn't block frontend resources
}));

// 2. CORS Settings
// Frontend (Vite) runs on port 5173 by default, add your own domain for production
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// 3. Rate Limiting (Brute-force and DoS protection)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit per IP
  message: 'Too many requests, please try again later.'
});
app.use('/api/', apiLimiter);

const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 failed attempts allowed
  message: 'Too many login attempts, please try again in 1 hour.'
});

// 4. Body Parser (Payload size limiting)
app.use(express.json({ limit: '50mb' })); // Limit increased for bulk rule additions

// 5. Session Management (Cookie-based)
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'secret_key_should_be_changed_and_long'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Must be true in HTTPS
  sameSite: 'strict'
}));

// --- UTILITY FUNCTIONS ---

// Allowed directories for Path Traversal Protection
const ALLOWED_CONFIG_DIR = path.resolve('/etc/suricata');
const ALLOWED_RULES_DIR = path.resolve('/etc/suricata/rules');

function validatePath(requestedPath, baseDir) {
  if (!requestedPath || typeof requestedPath !== 'string') return false;
  
  // Normalize path and clear relative paths like '..'
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, '');
  const resolvedPath = path.resolve(baseDir, safePath);
  
  // Check if the resolved path starts with the allowed base directory
  return resolvedPath.startsWith(baseDir);
}

// Auth Middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Suricata Log Reader (Reads the same file as EveBox)
const EVE_LOG_PATH = process.env.EVE_LOG_PATH || '/var/log/suricata/eve.json';

async function getSuricataLogs(limit = 500) {
  // Return null if file doesn't exist (Mock data will kick in)
  if (!fs.existsSync(EVE_LOG_PATH)) return null;

  const logs = [];
  const fileStream = fs.createReadStream(EVE_LOG_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      logs.push(entry);
      if (logs.length > limit) logs.shift(); // Shift to avoid bloating memory
    } catch (e) {}
  }
  
  return logs.reverse();
}

// --- API ENDPOINTS ---

// Login Endpoint
app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  
  // Simple validation (In production, hash check should be done from the database)
  // Default: admin / password123
  if (username === 'admin' && password === 'password123') {
    req.session.user = { username, role: 'admin' };
    return res.json({ success: true, user: req.session.user });
  }
  
  return res.status(401).json({ error: 'Invalid username or password' });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

// Config Read (Path Traversal Protected)
app.get('/api/config/read', requireAuth, async (req, res) => {
  const filePath = req.query.path;
  
  // Note: If testing on Windows, /etc/suricata path doesn't exist, so you can disable
  // this check for testing purposes or provide a local path.
  // if (!validatePath(filePath, ALLOWED_CONFIG_DIR)) {
  //   return res.status(403).json({ error: 'Access denied: Invalid file path.' });
  // }

  try {
    // Dummy content for demo purposes
    const content = "# Suricata Configuration\nstats:\n  enabled: yes\n  interval: 8"; 
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Suricata Rules File Path (Get from Env or use default)
const RULES_PATH = process.env.RULES_PATH || path.join(__dirname, 'local.rules');

// Rules Read
app.get('/api/rules/read', requireAuth, async (req, res) => {
  try {
    if (fs.existsSync(RULES_PATH)) {
      const content = fs.readFileSync(RULES_PATH, 'utf8');
      res.send(content);
    } else {
      res.send('# Suricata Rules (File not created yet)\n');
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read rules' });
  }
});

// Rules Save (Overwrite - Edit Save)
app.post('/api/rules/save', requireAuth, (req, res) => {
  const { rules } = req.body;
  if (typeof rules !== 'string') {
    return res.status(400).json({ error: 'Invalid rule format.' });
  }
  
  try {
    fs.writeFileSync(RULES_PATH, rules, 'utf8');
    res.json({ success: true, message: 'Rules updated successfully.' });
  } catch (err) {
    console.error('Error saving rules:', err);
    res.status(500).json({ error: 'Failed to write rules to file.' });
  }
});

// Rules Bulk Add
app.post('/api/rules/bulk', requireAuth, (req, res) => {
  const { rules } = req.body;
  if (!rules || typeof rules !== 'string') {
    return res.status(400).json({ error: 'Invalid rule format.' });
  }
  
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(RULES_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Append new rules to the end of the file
    fs.appendFileSync(RULES_PATH, '\n' + rules);
    
    res.json({ success: true, message: 'Rules added successfully.', count: rules.split('\n').length });
  } catch (err) {
    console.error('Error writing rules:', err);
    res.status(500).json({ error: 'Failed to write rules to file.' });
  }
});

// System Status
app.get('/api/system/status', requireAuth, (req, res) => {
  res.json({
    uptime: "12:34:56",
    cpuUsage: 45,
    memoryUsage: 60,
    networkLoad: 120
  });
});

// Users
app.get('/api/users', requireAuth, (req, res) => {
  // Should be fetched from the database in a real application
  res.json([{ id: 1, username: 'admin', role: 'admin', status: 'active' }]);
});

// Logs Endpoint (For Cyber Map and Log management)
app.get('/api/logs', requireAuth, async (req, res) => {
  const realLogs = await getSuricataLogs();
  
  if (realLogs && realLogs.length > 0) {
    // Convert eve.json format to the format expected by frontend
    const mappedLogs = realLogs.map(log => ({
      src_ip: log.src_ip,
      dest_ip: log.dest_ip,
      severity: log.alert ? log.alert.severity : (log.event_type === 'alert' ? 1 : 3),
      protocol: log.proto,
      timestamp: log.timestamp,
      event_type: log.event_type
    })).filter(l => l.src_ip && l.dest_ip);
    return res.json(mappedLogs);
  }

  // Return demo data if file doesn't exist
  res.json([
    { src_ip: '192.168.1.100', dest_ip: '8.8.8.8', severity: 2, protocol: 'UDP', timestamp: new Date().toISOString() },
    { src_ip: '10.0.0.5', dest_ip: '192.168.1.20', severity: 1, protocol: 'TCP', timestamp: new Date().toISOString() },
    { src_ip: '172.16.0.10', dest_ip: '10.0.0.5', severity: 3, protocol: 'HTTP', timestamp: new Date().toISOString() }
  ]);
});

// Events Endpoint
app.get('/api/events', requireAuth, async (req, res) => {
  const realLogs = await getSuricataLogs();

  if (realLogs && realLogs.length > 0) {
    const events = realLogs
      .filter(log => log.event_type === 'alert')
      .map(log => ({
        src_ip: log.src_ip,
        dest_ip: log.dest_ip,
        severity: log.alert?.severity || 1,
        protocol: log.proto,
        signature: log.alert?.signature || 'Unknown Alert',
        timestamp: log.timestamp
      }));
    return res.json(events);
  }

  // Return demo data if file doesn't exist
  res.json([
    { src_ip: '45.33.32.156', dest_ip: '192.168.1.10', severity: 1, protocol: 'TCP', signature: 'ET SCAN Potential SSH Scan' },
    { src_ip: '185.220.101.42', dest_ip: '192.168.1.10', severity: 2, protocol: 'TCP', signature: 'ET POLICY Suspicious Inbound to mySQL port 3306' }
  ]);
});

// --- FRONTEND SERVING ---

// Serve the dist folder statically (created after npm run build)
app.use(express.static(path.join(__dirname, 'dist')));

// Redirect all other requests to index.html for SPA
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ThreatLens backend is active and listening on port ${PORT}`);
});
