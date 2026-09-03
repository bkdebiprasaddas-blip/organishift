const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const mongoose = require('mongoose');

const app = require('../src/server');
const env = require('../src/config/env');
const User = require('../src/models/User');
const PlanningItem = require('../src/models/PlanningItem');
const EventItem = require('../src/models/EventItem');

let server, base;
let adminToken = '', managerToken = '', memberToken = '';

async function req(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

before(async () => {
  const uri = env.MONGO_URI.replace(/\/[^/]+$/, '/organishift_test_http');
  await mongoose.connect(uri);

  await Promise.all([User.deleteMany({}), PlanningItem.deleteMany({})]);
  const admin = await User.create({ name: 'Admin', email: 'a@t.com', passwordHash: 'Secret123', role: 'ADMIN' });
  await User.create({ name: 'Manager', email: 'm@t.com', passwordHash: 'Secret123', role: 'MANAGER' });
  await User.create({ name: 'Member', email: 'u@t.com', passwordHash: 'Secret123', role: 'MEMBER' });
  void admin;

  const jwt = require('jsonwebtoken');
  adminToken = jwt.sign({ id: (await User.findOne({ email: 'a@t.com' }))._id, role: 'ADMIN' }, env.JWT_SECRET);
  managerToken = jwt.sign({ id: (await User.findOne({ email: 'm@t.com' }))._id, role: 'MANAGER' }, env.JWT_SECRET);
  memberToken = jwt.sign({ id: (await User.findOne({ email: 'u@t.com' }))._id, role: 'MEMBER' }, env.JWT_SECRET);

  server = http.createServer(app);
  await new Promise(r => { server.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(r => server.close(r));
  server.closeAllConnections();
  await mongoose.connection.close();
});

test('H-01: health endpoint returns success envelope with db flag', async () => {
  const { status, json } = await req('GET', '/api/health');
  assert.strictEqual(status, 200);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.data.db, true);
});

test('H-02: login success returns token + user and never leaks hash', async () => {
  const { status, json } = await req('POST', '/api/auth/login', {
    body: { email: 'a@t.com', password: 'Secret123' }
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(json.data.token);
  assert.strictEqual(json.data.user.email, 'a@t.com');
  assert.strictEqual(json.data.user.passwordHash, undefined);
});

test('H-03: login with wrong password -> 401 generic UNAUTHORIZED envelope', async () => {
  const { status, json } = await req('POST', '/api/auth/login', {
    body: { email: 'a@t.com', password: 'nope' }
  });
  assert.strictEqual(status, 401);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.error.code, 'UNAUTHORIZED');
  assert.strictEqual(json.error.message, 'Invalid email or password');
});

test('H-04: malformed login payload -> 400 VALIDATION_ERROR with details', async () => {
  const { status, json } = await req('POST', '/api/auth/login', {
    body: { email: 'not-an-email', password: '' }
  });
  assert.strictEqual(status, 400);
  assert.strictEqual(json.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(json.error.details));
});

test('H-05: protected route without token -> 401', async () => {
  const { status, json } = await req('GET', '/api/auth/me');
  assert.strictEqual(status, 401);
  assert.strictEqual(json.success, false);
});

test('H-06: MEMBER on Admin-only user list -> 403 route-level RBAC', async () => {
  const { status, json } = await req('GET', '/api/users', { token: memberToken });
  assert.strictEqual(status, 403);
  assert.strictEqual(json.error.code, 'FORBIDDEN');
});

test('H-07: MANAGER cannot create planning items (Admin owns structure)', async () => {
  const { status, json } = await req('POST', '/api/planning-items', {
    token: managerToken,
    body: { title: 'Nope', scope: 'LIBRARY' }
  });
  assert.strictEqual(status, 403);
  assert.strictEqual(json.error.code, 'FORBIDDEN');
});

test('H-08: ADMIN creates library item via API (201 envelope)', async () => {
  const { status, json } = await req('POST', '/api/planning-items', {
    token: adminToken,
    body: { title: 'HTTP Root', scope: 'LIBRARY' }
  });
  assert.strictEqual(status, 201);
  assert.strictEqual(json.data.title, 'HTTP Root');
  assert.strictEqual(json.data.scope, 'LIBRARY');
});

test('H-09: move under own descendant -> 400 CYCLE_DETECTED over HTTP', async () => {
  const root = (await req('POST', '/api/planning-items', {
    token: adminToken, body: { title: 'Cycle Root', scope: 'LIBRARY' }
  })).json.data;
  await req('POST', '/api/planning-items', {
    token: adminToken, body: { title: 'Cycle Child', scope: 'LIBRARY', parentId: root._id }
  });

  const { status, json } = await req('PUT', `/api/planning-items/${root._id}/move`, {
    token: adminToken,
    body: { newParentId: null }
  });
  // sanity: moving to root is legal; now attempt illegal one
  assert.strictEqual(status, 200);

  const childId = ((await req('GET', '/api/planning-items?scope=LIBRARY', { token: adminToken })).json.data)
    .find(n => n._id === root._id).children[0]._id;

  const bad = await req('PUT', `/api/planning-items/${root._id}/move`, {
    token: adminToken, body: { newParentId: childId }
  });
  assert.strictEqual(bad.status, 400);
  assert.strictEqual(bad.json.error.code, 'CYCLE_DETECTED');
});

test('H-10: scheduling with a past date -> 400 VALIDATION_ERROR', async () => {
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'Past Plan', category: 'T' }
  })).json.data;

  const { status, json } = await req('POST', '/api/events', {
    token: adminToken,
    body: { title: 'Old Event', planId: plan._id, startDate: '2020-01-01' }
  });
  assert.strictEqual(status, 400);
  assert.strictEqual(json.error.code, 'VALIDATION_ERROR');
});

test('H-11: unknown API route -> 404 JSON envelope (never HTML)', async () => {
  const { status, json } = await req('GET', '/api/does-not-exist');
  assert.strictEqual(status, 404);
  assert.strictEqual(json.success, false);
  assert.strictEqual(json.error.code, 'NOT_FOUND');
});

// ---- Improvement cycle IMP-A6 (2026-08-24): coverage gaps closed below ----

async function makeLibraryBranch(title) {
  const root = (await req('POST', '/api/planning-items', {
    token: adminToken, body: { title: `${title} Root`, scope: 'LIBRARY' }
  })).json.data;
  await req('POST', '/api/planning-items', {
    token: adminToken, body: { title: `${title} Child`, scope: 'LIBRARY', parentId: root._id }
  });
  return root._id;
}

test('H-12: updatePlan happy path + too-short title -> 400 VALIDATION_ERROR', async () => {
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'Updatable Plan' }
  })).json.data;

  const ok = await req('PUT', `/api/event-plans/${plan._id}`, {
    token: adminToken, body: { title: 'Renamed Plan', category: 'Sports' }
  });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.json.data.title, 'Renamed Plan');

  const bad = await req('PUT', `/api/event-plans/${plan._id}`, {
    token: adminToken, body: { title: 'ab' }
  });
  assert.strictEqual(bad.status, 400);
  assert.strictEqual(bad.json.error.code, 'VALIDATION_ERROR');
});

test('H-13: malformed ObjectId param -> 400 INVALID_ID (never 500)', async () => {
  const { status, json } = await req('GET', '/api/event-plans/not-an-object-id', { token: adminToken });
  assert.strictEqual(status, 400);
  assert.strictEqual(json.error.code, 'INVALID_ID');
});

test('H-14: whitespace-only execution item title -> 400 VALIDATION_ERROR (schema validation)', async () => {
  const libRoot = await makeLibraryBranch('Ws');
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'WS Plan' }
  })).json.data;
  const future = '2030-06-01';
  const event = (await req('POST', '/api/events', {
    token: managerToken, body: { title: 'WS Event', planId: plan._id, startDate: future }
  })).json.data;

  const { status, json } = await req('POST', `/api/events/${event.event._id}/items`, {
    token: managerToken, body: { title: '   ' }
  });
  assert.strictEqual(status, 400);
  assert.strictEqual(json.error.code, 'VALIDATION_ERROR');
  void libRoot;
});

test('H-15: addExecutionItem invalid priority -> 400; valid -> 201 + progress recalculated', async () => {
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'Item Plan' }
  })).json.data;
  const event = (await req('POST', '/api/events', {
    token: managerToken,
    body: { title: 'Item Event', planId: plan._id, startDate: '2030-07-01' }
  })).json.data;
  const eventId = event.event._id;

  const badPrio = await req('POST', `/api/events/${eventId}/items`, {
    token: managerToken, body: { title: 'Leaf A', priority: 'URGENT' }
  });
  assert.strictEqual(badPrio.status, 400);
  assert.strictEqual(badPrio.json.error.code, 'VALIDATION_ERROR');

  const ok = await req('POST', `/api/events/${eventId}/items`, {
    token: managerToken,
    body: { title: 'Leaf A', priority: 'HIGH', dueDate: '2030-07-10', assigneeId: undefined }
  });
  assert.strictEqual(ok.status, 201);
  assert.strictEqual(ok.json.data.priority, 'HIGH');
  assert.strictEqual(ok.json.data.status, 'NOT_STARTED');

  const progress = (await req('GET', `/api/events/${eventId}/progress`, { token: adminToken })).json.data;
  assert.strictEqual(typeof progress.eventProgress, 'number');
  assert.ok(progress.tree.length >= 1);
});

test('H-16: updateEvent rejects bad status enum -> 400; legal ONGOING->DONE -> 200', async () => {
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'Status Plan' }
  })).json.data;
  const event = (await req('POST', '/api/events', {
    token: managerToken,
    body: { title: 'Status Event', planId: plan._id, startDate: '2030-08-01' }
  })).json.data;
  const id = event.event._id;

  const badStatus = await req('PUT', `/api/events/${id}`, {
    token: managerToken, body: { status: 'XYZ' }
  });
  assert.strictEqual(badStatus.status, 400);
  assert.strictEqual(badStatus.json.error.code, 'VALIDATION_ERROR');

  const ongoing = await req('PUT', `/api/events/${id}`, {
    token: managerToken, body: { status: 'ONGOING' }
  });
  assert.strictEqual(ongoing.status, 200);
  assert.strictEqual(ongoing.json.data.status, 'ONGOING');

  const done = await req('PUT', `/api/events/${id}`, {
    token: managerToken, body: { status: 'DONE' }
  });
  assert.strictEqual(done.status, 200);
  assert.strictEqual(done.json.data.status, 'DONE');
});

test('H-17: GET /api/events?from=&to= date filtering works', async () => {
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'Filter Plan' }
  })).json.data;
  await req('POST', '/api/events', {
    token: managerToken,
    body: { title: 'July Event', planId: plan._id, startDate: '2030-07-15' }
  });
  await req('POST', '/api/events', {
    token: managerToken,
    body: { title: 'Dec Event', planId: plan._id, startDate: '2030-12-15' }
  });

  const all = (await req('GET', '/api/events', { token: memberToken })).json.data;
  assert.ok(Array.isArray(all) && all.length >= 2);

  const filtered = (await req(
    'GET',
    '/api/events?from=2030-07-01&to=2030-07-31',
    { token: memberToken }
  )).json.data;
  assert.ok(filtered.every(e => e.startDate >= '2030-07' && e.startDate < '2030-08'));
  assert.ok(filtered.length >= 1);
});

test('H-18: deleteEvent cascades — zero orphan execution items remain', async () => {
  const EventItem = require('../src/models/EventItem');
  const libRoot = await makeLibraryBranch('DelEv');
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'Cascade Plan' }
  })).json.data;
  await req('POST', `/api/event-plans/${plan._id}/items/from-library`, {
    token: adminToken, body: { libraryItemId: libRoot }
  });
  const event = (await req('POST', '/api/events', {
    token: managerToken,
    body: { title: 'Doomed Event', planId: plan._id, startDate: '2030-09-01' }
  })).json.data;
  const eventId = event.event._id;
  const before = await EventItem.countDocuments({ eventId });
  assert.ok(before > 0);

  const del = await req('DELETE', `/api/events/${eventId}`, { token: adminToken });
  assert.strictEqual(del.status, 200);

  const after = await EventItem.countDocuments({ eventId: eventId });
  assert.strictEqual(after, 0);
  const gone = await req('GET', `/api/events/${eventId}`, { token: adminToken });
  assert.strictEqual(gone.status, 404);
});

test('H-19: copyFromLibrary over HTTP copies branch into plan; unknown library id -> 404', async () => {
  const libRoot = await makeLibraryBranch('Copy');
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'Copy Target Plan' }
  })).json.data;

  const missing = await req('POST', `/api/event-plans/${plan._id}/items/from-library`, {
    token: adminToken, body: { libraryItemId: libRoot.replace(/.$/, c => c === '0' ? '1' : '0') }
  });
  assert.ok([404].includes(missing.status));

  const copy = await req('POST', `/api/event-plans/${plan._id}/items/from-library`, {
    token: adminToken, body: { libraryItemId: libRoot }
  });
  assert.strictEqual(copy.status, 201);
  assert.strictEqual(copy.json.data.copiedCount, 2);

  const detail = (await req('GET', `/api/event-plans/${plan._id}`, { token: adminToken })).json.data;
  assert.strictEqual(detail.tree.length, 1);
  assert.strictEqual(detail.tree[0].children.length, 1);
});

test('H-20: deletePlan cascades — plan gone, its PLAN-scope items removed', async () => {
  const PlanningItem = require('../src/models/PlanningItem');
  const libRoot = await makeLibraryBranch('DelPlan');
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'Doomed Plan' }
  })).json.data;
  await req('POST', `/api/event-plans/${plan._id}/items/from-library`, {
    token: adminToken, body: { libraryItemId: libRoot }
  });

  const del = await req('DELETE', `/api/event-plans/${plan._id}`, { token: adminToken });
  assert.strictEqual(del.status, 200);

  const gone = await req('GET', `/api/event-plans/${plan._id}`, { token: adminToken });
  assert.strictEqual(gone.status, 404);
  const leftovers = await PlanningItem.countDocuments({ planId: plan._id, scope: 'PLAN' });
  assert.strictEqual(leftovers, 0);
});

// ---------- SV-M13: plan deletion blocked when events reference it ----------
test('SV-M13: deletePlan with scheduled events -> 409 CONFLICT', async () => {
  const Event = require('../src/models/Event');
  const libRoot = await makeLibraryBranch('BlockPlan');
  const plan = (await req('POST', '/api/event-plans', {
    token: adminToken, body: { title: 'Protected Plan' }
  })).json.data;
  await req('POST', `/api/event-plans/${plan._id}/items/from-library`, {
    token: adminToken, body: { libraryItemId: libRoot }
  });
  // Schedule a real event from this plan
  await req('POST', '/api/events', {
    token: adminToken,
    body: { title: 'Event from Protected Plan', planId: plan._id, startDate: '2026-09-20' }
  });

  const del = await req('DELETE', `/api/event-plans/${plan._id}`, { token: adminToken });
  assert.strictEqual(del.status, 409);
  assert.strictEqual(del.json.error.code, 'CONFLICT');
  assert.ok(del.json.error.message.includes('scheduled event'));

  // Plan still exists
  const after = await req('GET', `/api/event-plans/${plan._id}`, { token: adminToken });
  assert.strictEqual(after.status, 200);
});

test('H-21: users lifecycle — create 201, duplicate 409, update role, deactivate blocks login', async () => {
  const created = await req('POST', '/api/users', {
    token: adminToken,
    body: { name: 'Temp User', email: 'temp@t.com', password: 'Temp12345', role: 'MEMBER' }
  });
  assert.strictEqual(created.status, 201);
  assert.strictEqual(created.json.data.passwordHash, undefined);
  const uid = created.json.data._id;

  const dup = await req('POST', '/api/users', {
    token: adminToken,
    body: { name: 'Dup User', email: 'temp@t.com', password: 'Temp12345' }
  });
  assert.strictEqual(dup.status, 409);

  const promoted = await req('PUT', `/api/users/${uid}`, {
    token: adminToken, body: { role: 'MANAGER' }
  });
  assert.strictEqual(promoted.status, 200);
  assert.strictEqual(promoted.json.data.role, 'MANAGER');

  const deactivated = await req('DELETE', `/api/users/${uid}`, { token: adminToken });
  assert.strictEqual(deactivated.status, 200);

  const loginDead = await req('POST', '/api/auth/login', {
    body: { email: 'temp@t.com', password: 'Temp12345' }
  });
  assert.strictEqual(loginDead.status, 401);
});

test('H-22: dashboard stats endpoint returns success envelope with counter fields', async () => {
  const { status, json } = await req('GET', '/api/dashboard/stats', { token: adminToken });
  assert.strictEqual(status, 200);
  assert.strictEqual(json.success, true);
  assert.ok(typeof json.data === 'object');
  assert.ok(!JSON.stringify(json.data).includes('passwordHash'));
});

// ---------- SV-L6: move body validation ----------
test('SV-L6: move with missing newParentId -> 400', async () => {
  const libRoot = await makeLibraryBranch('MoveTest');
  const res = await req('PUT', `/api/planning-items/${libRoot}/move`, {
    token: adminToken,
    body: {}
  });
  assert.strictEqual(res.status, 400);
});

// ---------- SV-L14: assigneeId must reference existing active user ----------
test('SV-L14: assign execution item to nonexistent user -> 400', async () => {
  const Event = require('../src/models/Event');
  const jwt2 = require('jsonwebtoken');
  const adminUid = jwt2.verify(adminToken, env.JWT_SECRET).id;
  const event = await Event.create({ title: 'Test', planId: new mongoose.Types.ObjectId(), startDate: new Date('2026-09-01'), createdBy: adminUid });
  const leaf = await EventItem.create({ eventId: event._id, title: 'Leaf', path: ',', level: 0, order: 0, status: 'NOT_STARTED' });

  const res = await req('PUT', `/api/events/items/${leaf._id}`, {
    token: managerToken,
    body: { assigneeId: new mongoose.Types.ObjectId().toString() }
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.json.error.code, 'VALIDATION_ERROR');
});
