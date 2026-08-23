const mongoose = require('mongoose');

/**
 * Runs `fn(session)` inside a Mongo multi-document transaction when the server
 * supports one (replica set / Atlas). On a standalone dev server the
 * transaction start fails BEFORE any write executes; we then re-run `fn(null)`
 * without a session so single-instance development keeps working.
 * Callers must pass `session` into their queries/saves when provided.
 */
async function withTx(fn) {
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
    const msg = String(err.message || err.codeName || '');
    if (/replica set|Transaction numbers|transactions are not supported/i.test(msg)) {
      return fn(null);
    }
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = withTx;
