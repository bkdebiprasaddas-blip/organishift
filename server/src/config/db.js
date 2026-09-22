const mongoose = require('mongoose');
const env = require('./env');

// SV-L2: detect transaction support at startup (avoids regex-based error classification)
let isStandalone = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Check if this is a standalone (non-replica-set) server
    try {
      const admin = conn.connection.db.admin();
      const info = await admin.hello();
      isStandalone = !info.me || (!info.setName && !info.isWritablePrimary);
    } catch {
      // If hello() fails, assume standalone for safety
      isStandalone = true;
    }

    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// SV-L2: exported getter for transaction support
const supportsTransactions = () => !isStandalone;

connectDB.supportsTransactions = supportsTransactions;

module.exports = connectDB;
module.exports.supportsTransactions = supportsTransactions;
