const mongoose = require('mongoose');
const connectDB = require('../config/db');

/**
 * Runs `fn(session)` inside a Mongo multi-document transaction when the server
 * supports one (replica set / Atlas). On a standalone dev server the
 * transaction start fails BEFORE any write executes; we then re-run `fn(null)`
 * without a session so single-instance development keeps working.
 * Callers must pass `session` into their queries/saves when provided.
 */
let cachedSupportsTx = null;

async function withTx(fn) {
  // SV-L2: detect standalone at startup instead of regex on error text
  // Fall back to try/catch if support status not yet determined
  let useTx = cachedSupportsTx;
  if (useTx === null) {
    try {
      useTx = connectDB.supportsTransactions();
    } catch {
      useTx = false;
    }
    cachedSupportsTx = useTx;
  }

  if (useTx) {
    let session;
    try {
      session = await mongoose.startSession();
    } catch {
      return fn(null);
    }

    try {
      let result;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } catch (err) {
      // Fallback: if transactions are not supported (e.g. standalone), retry without session
      const msg = String(err.message || err.codeName || '');
      if (/replica set|Transaction numbers|transactions are not supported/i.test(msg)) {
        cachedSupportsTx = false;
        return fn(null);
      }
      throw err;
    } finally {
      session.endSession();
    }
  } else {
    // Standalone: no transactions, run without session
    return fn(null);
  }
}

module.exports = withTx;
