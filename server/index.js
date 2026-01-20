import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'crypto';
import { config } from './config.js';
import { createStore } from './store.js';
import { createBot } from './bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const store = createStore({ uploadTtlMs: config.uploadTtlMs });

app.use(express.static(publicDir));
app.use(cookieParser());
app.use(express.json());

// Simple CSRF token middleware
const csrfTokens = new Map();

const generateCSRFToken = () => {
  return randomBytes(32).toString('hex');
};

const validateCSRFToken = (req, res, next) => {
  const token = req.headers['x-csrf-token'];
  const sessionId = req.cookies['session-id'];

  if (!sessionId || !token) {
    res.status(403).json({ error: 'CSRF validation failed.' });
    return;
  }

  const tokenData = csrfTokens.get(sessionId);
  if (!tokenData || tokenData.token !== token) {
    res.status(403).json({ error: 'CSRF validation failed.' });
    return;
  }

  next();
};

// Cleanup expired CSRF tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now - data.createdAt > 24 * 60 * 60 * 1000) { // 24 hours
      csrfTokens.delete(sessionId);
    }
  }
}, 60 * 60 * 1000); // Every hour

app.get('/app', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/api/csrf-token', (req, res) => {
  let sessionId = req.cookies['session-id'];

  if (!sessionId) {
    sessionId = randomBytes(16).toString('hex');
    res.cookie('session-id', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    });
  }

  const token = generateCSRFToken();
  csrfTokens.set(sessionId, { token, createdAt: Date.now() });

  res.json({ token });
});

app.post('/api/upload', validateCSRFToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Missing file.' });
    return;
  }

  // Validate MIME type
  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    res.status(400).json({ error: 'Invalid file type. Only PNG, JPEG, GIF, and WebP images are allowed.' });
    return;
  }

  const userId = req.body.userId ? Number(req.body.userId) : null;
  const sourceChatId = req.body.sourceChatId ? Number(req.body.sourceChatId) : null;
  const uploadId = store.saveUpload({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    userId,
    sourceChatId
  });
  res.json({ id: uploadId });
});

app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    console.error('[ERROR] File size limit exceeded:', { url: req.url, size: req.headers['content-length'] });
    res.status(413).json({ error: 'Upload too large. Maximum file size is 10MB.' });
    return;
  }
  console.error('[ERROR] Unexpected server error:', { url: req.url, method: req.method, error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Unexpected server error. Please try again.' });
});

const server = app.listen(config.port, () => {
  console.log(`Server listening on ${config.port}`);
});

const bot = createBot({ config, store });

bot.launch()
  .then(() => {
    console.log('Bot started (long polling).');
  })
  .catch((error) => {
    console.error('Bot failed to start:', error);
  });

const shutdown = async () => {
  await bot.stop('SIGTERM');
  server.close();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

setInterval(store.cleanupUploads, Math.min(config.uploadTtlMs, 5 * 60 * 1000));
