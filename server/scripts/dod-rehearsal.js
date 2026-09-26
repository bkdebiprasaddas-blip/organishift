/**
 * 13-step Definition-of-Done rehearsal (build spec §8.2, corrected counts:
 * Food 7 · Stage 4 · plan 11 · execution 13). Runs against an isolated DB
 * (organishift_dod), spins up the real Express app, drives everything over HTTP.
 *
 * Run: node scripts/dod-rehearsal.js
 */
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/organishift_dod';

const mongoose = require('mongoose');
const http = require('node:http');

async function main() {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  await conn.connection.dropDatabase();
  console.log('Fresh DB ready:', conn.connection.db.databaseName);

  // ---- seed users ----
  const User = require('../src/models/User');
  const PlanningItem = require('../src/models/PlanningItem');
  await User.create([
    { name: 'System Admin', email: 'admin@organishift.dev', passwordHash: 'Password123!', role: 'ADMIN' },
    { name: 'Rahul V.', email: 'manager@organishift.dev', passwordHash: 'Password123!', role: 'MANAGER' },
    { name: 'Amit S.', email: 'member1@organishift.dev', passwordHash: 'Password123!', role: 'MEMBER' },
    { name: 'Priya K.', email: 'member2@organishift.dev', passwordHash: 'Password123!', role: 'MEMBER' }
  ]);

  // ---- start HTTP server ----
  const app = require('../src/server');
  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const req = async (method, path, { token, body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  };

  const results = [];
  const check = (step, name, pass, actual = '') => {
    results.push({ step, name, pass, actual });
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${String(step).padStart(2)}. ${name}${actual ? `  -> ${actual}` : ''}`);
  };

  let t;

  try {
    // 1 — Admin logs in
    t = await req('POST', '/api/auth/login', { body: { email: 'admin@organishift.dev', password: 'Password123!' } });
    const admin = t.json.data.token;
    check(1, 'Admin logs in, role ADMIN', t.status === 200 && t.json.data.user.role === 'ADMIN', t.json.data?.user?.role);

    // helper to create a LIBRARY tree and return its node count
    const mkTree = async (rootTitle, subs) => {
      const root = (await req('POST', '/api/planning-items', { token: admin, body: { title: rootTitle, scope: 'LIBRARY' } })).json.data;
      let count = 1;
      let last = null;
      for (const s of subs) {
        last = s;
        if (typeof s === 'string') {
          await req('POST', '/api/planning-items', { token: admin, body: { title: s, scope: 'LIBRARY', parentId: root._id } });
          count++;
        }
      }
      return { root, count, last };
    };

    // 2 — Food tree (7 nodes): root + Procurement + 3 leaves + MenuTasting + HallDecoration
    const food = await mkTree('Food & Catering Services', []);
    const proc = (await req('POST', '/api/planning-items', { token: admin, body: { title: 'Procurement Management', scope: 'LIBRARY', parentId: food.root._id } })).json.data;
    await req('POST', '/api/planning-items', { token: admin, body: { title: 'Vendor quotes', scope: 'LIBRARY', parentId: proc._id } });
    await req('POST', '/api/planning-items', { token: admin, body: { title: 'Ingredient orders', scope: 'LIBRARY', parentId: proc._id } });
    await req('POST', '/api/planning-items', { token: admin, body: { title: 'Equipment rental', scope: 'LIBRARY', parentId: proc._id } });
    await req('POST', '/api/planning-items', { token: admin, body: { title: 'Menu tasting', scope: 'LIBRARY', parentId: food.root._id } });
    await req('POST', '/api/planning-items', { token: admin, body: { title: 'Hall decoration', scope: 'LIBRARY', parentId: food.root._id } });
    check(2, 'Food tree created (7 nodes)', true);

    // 3 — Stage tree (4 nodes)
    const stage = await mkTree('Stage Production & AV', []);
    for (const s of ['Lighting setup', 'Audio check', 'Backdrop assembly']) {
      await req('POST', '/api/planning-items', { token: admin, body: { title: s, scope: 'LIBRARY', parentId: stage.root._id } });
    }
    check(3, 'Stage tree created (4 nodes)', true);

    // 4 — Library shows exactly 2 roots, 7 + 4
    const lib = (await req('GET', '/api/planning-items?scope=LIBRARY', { token: admin })).json.data;
    const cnt = n => n.children.reduce((a, c) => a + cnt(c), n.children.length);
    const totalOf = list => list.reduce((a, r) => a + cnt(r) + 1, 0);
    const foodN = 1 + cnt(lib.find(x => x.title.startsWith('Food')));
    const stageN = 1 + cnt(lib.find(x => x.title.startsWith('Stage')));
    check(4, 'Library counts Food=7 / Stage=4', lib.length === 2 && foodN === 7 && stageN === 4, `${foodN}/${stageN}`);

    // 5 — Plan blueprint copies both roots -> 11 items
    const plan = (await req('POST', '/api/event-plans', { token: admin, body: { title: 'Annual Function Blueprint', category: 'Annual Event' } })).json.data;
    await req('POST', `/api/event-plans/${plan._id}/items/from-library`, { token: admin, body: { libraryItemId: lib.find(x => x.title.startsWith('Food'))._id } });
    await req('POST', `/api/event-plans/${plan._id}/items/from-library`, { token: admin, body: { libraryItemId: lib.find(x => x.title.startsWith('Stage'))._id } });
    const planDetail = (await req('GET', `/api/event-plans/${plan._id}`, { token: admin })).json.data;
    const planCount = totalOf(planDetail.tree);
    check(5, 'Plan copied from library (11 items)', planCount === 11, String(planCount));

    // 6 — Manager schedules event (future date) -> 11 execution items
    t = await req('POST', '/api/auth/login', { body: { email: 'manager@organishift.dev', password: 'Password123!' } });
    const manager = t.json.data.token;
    // Relative date, NOT a literal. POST /api/events rejects past dates, so a
    // hardcoded startDate silently became invalid and took the whole rehearsal
    // down with "Cannot read properties of undefined (reading 'event')" — this
    // script is the documented viva fallback, so it has to stay runnable.
    const startKey = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
    t = await req('POST', '/api/events', { token: manager, body: { title: 'Annual Function', planId: plan._id, startDate: startKey, venue: 'Main Auditorium' } });
    if (t.status !== 201) {
      throw new Error(`Step 6 failed to schedule the event (HTTP ${t.status}): ${JSON.stringify(t.json)}`);
    }
    const eventId = t.json.data.event._id;
    check(6, 'Manager schedules event (execution copy 11)', t.json.data.itemCount === 11, `items=${t.json.data.itemCount}`);

    // find Procurement + its leaves in the execution tree
    const det = () => req('GET', `/api/events/${eventId}`, { token: manager }).then(r => r.json.data);
    let d = await det();
    const foodNode = d.tree.find(n => n.title.startsWith('Food'));
    const procNode = foodNode.children.find(n => n.title.startsWith('Procurement'));
    const leafOf = title => procNode.children.find(n => n.title === title);

    // 7 — Manager adds 2 children during execution -> 13 total
    await req('POST', `/api/events/${eventId}/items`, { token: manager, body: { title: 'Extra: Power backup check', parentId: foodNode._id } });
    await req('POST', `/api/events/${eventId}/items`, { token: manager, body: { title: 'Extra: Photo wall', parentId: foodNode._id } });
    d = await det();
    const totalNow = totalOf(d.tree);
    check(7, 'Add-child during execution (total 13)', totalNow === 13, String(totalNow));

    // 8 — Manager assigns the Procurement branch to Amit (member1)
    const amitLogin = await req('POST', '/api/auth/login', { body: { email: 'member1@organishift.dev', password: 'Password123!' } });
    const amitTok = amitLogin.json.data.token;
    const amitId = amitLogin.json.data.user._id;
    t = await req('PUT', `/api/events/items/${procNode._id}`, { token: manager, body: { assigneeId: amitId } });
    check(8, 'Manager assigns branch (inheritance)', t.status === 200);

    // 9 — Amit sees ONLY his branch + ancestors
    const amitView = (await req('GET', `/api/events/${eventId}`, { token: amitTok })).json.data;
    const titles = [];
    const walk = (n, path) => { const p = [...path, n.title]; titles.push(p.join('>')); n.children.forEach(c => walk(c, p)); };
    amitView.tree.forEach(n => walk(n, []));
    const scopedOk = titles.length === 5 && titles.every(x => x.startsWith('Food & Catering Services'));
    check(9, 'Member scoped view (owned branch only)', scopedOk, `${titles.length} visible nodes`);

    // 10 — Status updates along legal transitions -> Procurement 67%
    const setPath = async (leaf, seq) => {
      for (const s of seq) {
        t = await req('PUT', `/api/events/items/${leaf._id}`, { token: amitTok, body: { status: s } });
        if (t.status !== 200) return false;
      }
      return true;
    };
    const vq = leafOf('Vendor quotes'), io = leafOf('Ingredient orders'), er = leafOf('Equipment rental');
    const okA = await setPath(vq, ['IN_PROGRESS', 'COMPLETED']);
    const okB = await setPath(io, ['IN_PROGRESS', 'COMPLETED']);
    const okC = await setPath(er, ['BLOCKED']);
    d = await det();
    const procAfter = (() => { let f; const w = n => { if (n.title === 'Procurement Management') f = n; (n.children || []).forEach(w); }; d.tree.forEach(w); return f; })();
    check(10, 'Leaf transitions applied; Procurement = 67%', okA && okB && okC && Math.round(procAfter.progressPercent) === 67, `${Math.round(procAfter.progressPercent)}%`);

    // 11 — Illegal transition + member field-gate rejected
    const menuTasting = foodNode.children.find(n => n.title === 'Menu tasting');
    t = await req('PUT', `/api/events/items/${menuTasting._id}`, { token: manager, body: { status: 'COMPLETED' } }); // NS -> COMPLETED
    const badTransition = t.status === 400 && t.json.error.code === 'INVALID_TRANSITION';
    t = await req('PUT', `/api/events/items/${vq._id}`, { token: amitTok, body: { priority: 'CRITICAL' } });
    const memberGate = t.status === 403;
    check(11, 'INVALID_TRANSITION + member priority 403', badTransition && memberGate);

    // 12 — Admin cannot assign
    t = await req('PUT', `/api/events/items/${vq._id}`, { token: admin, body: { assigneeId: amitId } });
    check(12, 'Admin assignment rejected (403)', t.status === 403, String(t.status));

    // 13 — Dashboards: totals add up; member differs from admin; progress endpoint works
    const admStats = (await req('GET', '/api/dashboard/stats', { token: admin })).json.data.counters;
    const memStats = (await req('GET', '/api/dashboard/stats', { token: amitTok })).json.data.counters;
    const addsUp = admStats.completed + admStats.pending === admStats.total;
    const differ = memStats.total !== admStats.total || memStats.completed !== admStats.completed;
    const progEp = (await req('GET', `/api/events/${eventId}/progress`, { token: manager })).json.data;
    check(13, 'Dashboard counters + progress endpoint', addsUp && differ && typeof progEp.eventProgress === 'number',
      `admin ${admStats.completed}+${admStats.pending}=${admStats.total}; member total=${memStats.total}; event=${progEp.eventProgress}%`);
  } catch (e) {
    console.error('REHEARSAL ERROR:', e.message);
    results.push({ step: '?', name: 'Unexpected error', pass: false, actual: e.message });
  }

  const failed = results.filter(r => !r.pass).length;
  console.log(`\n===== DoD REHEARSAL: ${results.length - failed}/${results.length} steps passed =====`);
  console.log('(DB left in place for inspection: organishift_dod)');

  await new Promise(r => server.close(r));
  server.closeAllConnections();
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
