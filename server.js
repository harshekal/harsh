import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import {
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, chmodSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(scryptCallback);
const root = dirname(fileURLToPath(import.meta.url));
const categories = [
  'theft',
  'assault',
  'cheating',
  'robbery',
  'threat',
  'trespass',
  'damage',
  'other',
];
const publicFiles = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/dashboard.html', ['dashboard.html', 'text/html']],
  ['/auth.css', ['auth.css', 'text/css']],
  ['/dashboard.css', ['dashboard.css', 'text/css']],
  ['/auth.js', ['auth.js', 'text/javascript']],
  ['/dashboard.js', ['dashboard.js', 'text/javascript']],
  ['/api.js', ['api.js', 'text/javascript']],
]);

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function text(value, label, minimum, maximum) {
  if (
    typeof value !== 'string' ||
    value.trim().length < minimum ||
    value.length > maximum
  ) {
    fail(400, `${label} must contain ${minimum}-${maximum} characters.`);
  }
  return value.trim();
}

function emailAddress(value) {
  const email = text(value, 'Email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail(400, 'Enter a valid email address.');
  return email;
}

function passwordValue(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128) {
    fail(400, 'Password must contain 12-128 characters.');
  }
  return value;
}

export function openStore(
  path = process.env.FIR_DB_PATH || join(root, 'data', 'fir.sqlite'),
) {
  if (path !== ':memory:')
    mkdirSync(dirname(resolve(path)), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  if (path !== ':memory:') chmodSync(path, 0o600);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('citizen', 'admin')), salt TEXT NOT NULL, hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL,
      review TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'submitted',
      version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, saved_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS cases_owner ON cases(owner_id);
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL, case_id TEXT, created_at TEXT NOT NULL
    );
  `);
  return db;
}

export async function createAccount(db, input, role = 'citizen') {
  const name = text(input.name, 'Name', 2, 100);
  const email = emailAddress(input.email);
  const password = passwordValue(input.password);
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  const user = { id: randomUUID(), name, email, role };
  try {
    db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)').run(
      user.id,
      name,
      email,
      role,
      salt,
      hash,
    );
  } catch (error) {
    if (
      error.code?.startsWith('ERR_SQLITE') &&
      db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    ) {
      fail(409, 'An account with this email already exists.');
    }
    throw error;
  }
  return user;
}

function validateCase(input) {
  const date = text(input.date, 'Incident date', 10, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date > new Date().toISOString().slice(0, 10)
  ) {
    fail(400, 'Enter a valid incident date that is not in the future.');
  }
  if (!categories.includes(input.category))
    fail(400, 'Select a valid incident category.');
  if (
    ![input.weapon, input.threats].every((value) =>
      ['yes', 'no', 'unknown'].includes(value),
    )
  ) {
    fail(400, 'Select a valid weapon and threat response.');
  }
  return {
    caseId: text(input.caseId || 'Not provided', 'Case reference', 1, 100),
    date,
    location: text(input.location, 'Location', 2, 300),
    category: input.category,
    description: text(input.description, 'Description', 10, 10000),
    weapon: input.weapon,
    threats: input.threats,
    injury: text(
      input.injury || 'Not provided',
      'Injury / property details',
      1,
      2000,
    ),
  };
}

async function body(request) {
  if (request.headers['content-type']?.split(';')[0] !== 'application/json')
    fail(415, 'JSON is required.');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32768) fail(413, 'Request is too large.');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== 'object' || Array.isArray(value))
      fail(400, 'Invalid JSON object.');
    return value;
  } catch {
    fail(400, 'Invalid JSON object.');
  }
}

export function createApplication({
  db = openStore(),
  origin,
  secureCookies = false,
} = {}) {
  const attempts = new Map();
  const dummySalt = randomBytes(16).toString('hex');
  const dummyHash = randomBytes(64);
  const sessionHash = (token) =>
    createHash('sha256').update(token).digest('hex');
  const audit = (user, action, caseId = null) =>
    db
      .prepare(
        'INSERT INTO audit (actor_id, action, case_id, created_at) VALUES (?, ?, ?, ?)',
      )
      .run(user.id, action, caseId, new Date().toISOString());

  function authenticate(request) {
    const token = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('fir_session='))
      ?.slice(12);
    if (!token) fail(401, 'Please sign in to continue.');
    const user = db
      .prepare(
        `SELECT users.id, name, email, role FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE token = ? AND expires > ?`,
      )
      .get(sessionHash(token), Date.now());
    if (!user) fail(401, 'Your session has expired. Please sign in again.');
    if (
      request.headers['x-fir-user'] &&
      request.headers['x-fir-user'] !== user.id
    ) {
      fail(401, 'The signed-in account changed. Please reload.');
    }
    return { user, token: sessionHash(token) };
  }

  function limit(request) {
    const now = Date.now();
    for (const [key, entry] of attempts)
      if (entry.until <= now) attempts.delete(key);
    const key = request.socket.remoteAddress;
    const entry = attempts.get(key) || {
      count: 0,
      until: now + 15 * 60 * 1000,
    };
    if (++entry.count > 30)
      fail(429, 'Too many authentication attempts. Try again in 15 minutes.');
    attempts.set(key, entry);
  }

  function serialize(row) {
    return {
      ...JSON.parse(row.data),
      id: row.id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      review: JSON.parse(row.review),
      status: row.status,
      version: row.version,
      createdAt: row.created_at,
      savedAt: row.saved_at,
    };
  }

  const selectCases = `SELECT cases.*, users.name AS owner_name, users.email AS owner_email
    FROM cases JOIN users ON users.id = cases.owner_id`;
  function authorizedCase(id, user) {
    const row = db
      .prepare(`${selectCases} WHERE cases.id = ? AND deleted_at IS NULL`)
      .get(id);
    if (!row || (user.role !== 'admin' && row.owner_id !== user.id))
      fail(404, 'Case not found.');
    return row;
  }

  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    const send = (status, data) => {
      response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
      });
      response.end(JSON.stringify(data));
    };
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const expectedOrigin =
        origin || `http://localhost:${server.address().port}`;
      if (request.headers.host !== new URL(expectedOrigin).host)
        fail(403, 'Unrecognized host.');
      if (
        !['GET', 'HEAD'].includes(request.method) &&
        request.headers.origin !== expectedOrigin
      ) {
        fail(403, 'Cross-origin requests are not allowed.');
      }
      if (!pathname.startsWith('/api/')) {
        const asset = publicFiles.get(pathname);
        if (!asset || !['GET', 'HEAD'].includes(request.method))
          fail(404, 'Not found.');
        if (pathname === '/dashboard.html') {
          try {
            authenticate(request);
          } catch {
            response.writeHead(302, { Location: '/index.html' });
            response.end();
            return;
          }
        }
        response.writeHead(200, {
          'Content-Type': `${asset[1]}; charset=utf-8`,
        });
        response.end(
          request.method === 'HEAD'
            ? undefined
            : readFileSync(join(root, asset[0])),
        );
        return;
      }
      if (
        request.method === 'POST' &&
        ['/api/register', '/api/login'].includes(pathname)
      ) {
        limit(request);
        const input = await body(request);
        if (pathname === '/api/register') {
          if (input.role && input.role !== 'citizen')
            fail(
              403,
              'Police accounts must be provisioned by the server operator.',
            );
          const user = await createAccount(db, input);
          audit(user, 'register');
          send(201, { user });
          return;
        }
        const email = emailAddress(input.email);
        if (typeof input.password !== 'string' || input.password.length > 128)
          fail(401, 'Email or password incorrect.');
        const account = db
          .prepare('SELECT * FROM users WHERE email = ?')
          .get(email);
        const candidate = await scrypt(
          input.password,
          account?.salt || dummySalt,
          64,
        );
        if (
          !timingSafeEqual(
            candidate,
            account ? Buffer.from(account.hash, 'hex') : dummyHash,
          ) ||
          !account
        ) {
          fail(401, 'Email or password incorrect.');
        }
        const token = randomBytes(32).toString('hex');
        const duration = input.remember === true ? 7 * 86400 : 8 * 3600;
        db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Date.now());
        db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(
          sessionHash(token),
          account.id,
          Date.now() + duration * 1000,
        );
        response.setHeader(
          'Set-Cookie',
          `fir_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${duration}${secureCookies ? '; Secure' : ''}`,
        );
        audit(account, 'login');
        send(200, {
          user: {
            id: account.id,
            name: account.name,
            email: account.email,
            role: account.role,
          },
        });
        return;
      }
      const { user, token } = authenticate(request);
      if (pathname === '/api/me' && request.method === 'GET')
        return send(200, { user });
      if (pathname === '/api/logout' && request.method === 'POST') {
        await body(request);
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        response.setHeader(
          'Set-Cookie',
          `fir_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookies ? '; Secure' : ''}`,
        );
        return send(200, { message: 'Signed out.' });
      }
      if (pathname === '/api/cases' && request.method === 'GET') {
        const rows =
          user.role === 'admin'
            ? db
                .prepare(
                  `${selectCases} WHERE deleted_at IS NULL ORDER BY saved_at DESC`,
                )
                .all()
            : db
                .prepare(
                  `${selectCases} WHERE deleted_at IS NULL AND owner_id = ? ORDER BY saved_at DESC`,
                )
                .all(user.id);
        return send(200, { cases: rows.map(serialize) });
      }
      if (pathname === '/api/cases' && request.method === 'POST') {
        const input = await body(request);
        const data = validateCase(input);
        const id = randomUUID();
        const now = new Date().toISOString();
        db.prepare(
          'INSERT INTO cases (id, owner_id, data, created_at, saved_at) VALUES (?, ?, ?, ?, ?)',
        ).run(id, user.id, JSON.stringify(data), now, now);
        audit(user, 'create', id);
        return send(201, { case: serialize(authorizedCase(id, user)) });
      }
      const match = pathname.match(/^\/api\/cases\/([a-f0-9-]+)(\/review)?$/);
      if (!match) fail(404, 'Not found.');
      const id = match[1];
      let row = authorizedCase(id, user);
      if (request.method === 'GET' && !match[2])
        return send(200, { case: serialize(row) });
      if (!['PUT', 'PATCH', 'DELETE'].includes(request.method))
        fail(405, 'Method not allowed.');
      const input = await body(request);
      row = authorizedCase(id, user);
      if (input.version !== row.version)
        fail(409, 'This case changed. Reload it before saving.');
      if (request.method === 'PATCH' && match[2]) {
        if (user.role !== 'admin')
          fail(403, 'Only police administrators can review cases.');
        if (!['submitted', 'under_review', 'closed'].includes(input.status))
          fail(400, 'Invalid case status.');
        if (!Array.isArray(input.review) || input.review.length > 20)
          fail(400, 'Invalid review.');
        const review = input.review.map((entry) => ({
          id: text(entry.id, 'Review ID', 1, 60),
          selected: entry.selected === true,
          note: text(entry.note || '', 'Review note', 0, 2000),
        }));
        db.prepare(
          'UPDATE cases SET review = ?, status = ?, version = version + 1, saved_at = ? WHERE id = ?',
        ).run(
          JSON.stringify(review),
          input.status,
          new Date().toISOString(),
          id,
        );
        audit(user, 'review', id);
      } else if (request.method === 'PUT' && !match[2]) {
        if (user.role !== 'citizen' || row.owner_id !== user.id)
          fail(403, 'Police review cannot alter a citizen report.');
        if (row.status !== 'submitted')
          fail(
            409,
            'Reviewed reports cannot be edited. Contact the police administrator.',
          );
        const data = validateCase(input);
        db.prepare(
          'UPDATE cases SET data = ?, version = version + 1, saved_at = ? WHERE id = ?',
        ).run(JSON.stringify(data), new Date().toISOString(), id);
        audit(user, 'update', id);
      } else if (request.method === 'DELETE' && !match[2]) {
        if (user.role !== 'admin' && row.status !== 'submitted')
          fail(
            409,
            'Reviewed reports cannot be removed. Contact the police administrator.',
          );
        db.prepare(
          'UPDATE cases SET deleted_at = ?, version = version + 1 WHERE id = ?',
        ).run(new Date().toISOString(), id);
        audit(user, 'archive', id);
        return send(200, { message: 'Case archived.' });
      } else fail(405, 'Method not allowed.');
      return send(200, { case: serialize(authorizedCase(id, user)) });
    } catch (error) {
      if (!error.status)
        console.error('Request failed:', error.code || error.name);
      send(error.status || 500, {
        error: error.status ? error.message : 'Server error. Please try again.',
      });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 3000);
  const origin = process.env.APP_ORIGIN || `http://localhost:${port}`;
  const server = createApplication({
    origin,
    secureCookies: origin.startsWith('https://'),
  });
  server.listen(port, process.env.HOST || '127.0.0.1', () =>
    console.log(`FIR portal: ${origin}`),
  );
}
