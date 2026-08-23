/**
 * OrganiShift DB Viewer
 * Usage:
 *   npm run db                 -> overview: all collections + doc counts
 *   npm run db users           -> pretty-print all docs in a collection
 *   npm run db planningitems 5 -> first 5 docs
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function main() {
  const [collection, limitArg] = process.argv.slice(2);
  await mongoose.connect(process.env.MONGO_URI);

  const db = mongoose.connection.db;

  if (!collection) {
    console.log(`\nDatabase: ${db.databaseName}\n`);
    console.log('Collection'.padEnd(24) + 'Docs');
    console.log('-'.repeat(32));
    const names = (await db.listCollections().toArray()).map(c => c.name).sort();
    for (const name of names) {
      const count = await db.collection(name).countDocuments();
      console.log(name.padEnd(24) + count);
    }
    console.log(`\nTip: node scripts/db.js <collection> [limit]  e.g. node scripts/db.js users`);
  } else {
    const coll = db.collection(collection);
    const count = await coll.countDocuments();
    console.log(`\n${collection} (${count} docs)\n${'='.repeat(40)}`);
    if (count === 0) {
      console.log('(empty)');
    } else {
      const docs = await coll.find({}).limit(Number(limitArg) || 10).toArray();
      docs.forEach((d, i) => {
        const { __v, ...clean } = d;
        delete clean.passwordHash;
        console.log(`[${i + 1}]`, JSON.stringify(clean, null, 2));
      });
      if (count > docs.length) console.log(`\n...and ${count - docs.length} more (pass a bigger limit)`);
    }
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
