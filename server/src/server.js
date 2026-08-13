const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

(async () => {
  await connectDB();
  app.listen(env.PORT, () => {
    console.log(`OrganiShift API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
})().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
