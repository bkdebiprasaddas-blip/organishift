const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Resolve NODE_ENV once. The old JWT guard below compared against
// process.env.NODE_ENV directly, so an UNSET NODE_ENV (the most common way to
// deploy by accident) failed the `!== 'development'` check and fell through to
// the hardcoded dev secret. Anything JWT signing does must key off this.
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_TEST = NODE_ENV === 'test';

function resolveJwtSecret() {
  const s = process.env.JWT_SECRET;

  if (s) {
    // Refuse a placeholder that would otherwise be used verbatim in production.
    const PLACEHOLDERS = new Set([
      'replace-with-a-long-random-secret',
      'dev-only-insecure-secret-change-me',
      'changeme',
      'secret'
    ]);
    if (NODE_ENV === 'production' && PLACEHOLDERS.has(s.trim().toLowerCase())) {
      throw new Error('JWT_SECRET is set to a placeholder value. Generate a real secret, e.g. `node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"`');
    }
    if (s.length < 16) {
      throw new Error(`JWT_SECRET must be at least 16 characters (got ${s.length})`);
    }
    return s;
  }

  // Fail CLOSED. A missing secret must never silently become a predictable one,
  // because that value is public in the repository and lets anyone forge an
  // ADMIN token. Opting into the insecure dev fallback is now explicit.
  if (IS_TEST) return 'test-only-insecure-secret';
  if (NODE_ENV === 'development' && process.env.ALLOW_INSECURE_DEV_SECRET === 'true') {
    return 'dev-only-insecure-secret-change-me';
  }
  throw new Error(
    'JWT_SECRET must be set. Generate one with:\n' +
    '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"\n' +
    'For local development only, set ALLOW_INSECURE_DEV_SECRET=true to use a known dev secret.'
  );
}

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/organishift',
  JWT_SECRET: resolveJwtSecret(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  NODE_ENV,
  IS_TEST,
  // Number of trusted reverse proxies in front of the app (usually 1). Left
  // unset by default so local development is unaffected. See server.js.
  TRUST_PROXY: process.env.TRUST_PROXY || ''
};
