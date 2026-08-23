const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const User = require('../src/models/User');
const EventPlan = require('../src/models/EventPlan');
const PlanningItem = require('../src/models/PlanningItem');
const Event = require('../src/models/Event');
const EventItem = require('../src/models/EventItem');
const env = require('../src/config/env');
const buildTree = require('../src/utils/buildTree');
const planningService = require('../src/services/planningService');
const eventService = require('../src/services/eventService');
const progressService = require('../src/services/progressService');

let adminToken = '';
let managerToken = '';
let memberToken = '';
let adminUser, managerUser, memberUser;

before(async () => {
  const testDbUri = env.MONGO_URI.replace(/\/[^/]+$/, '/organishift_test');
  await mongoose.connect(testDbUri);
});

after(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    EventPlan.deleteMany({}),
    PlanningItem.deleteMany({}),
    Event.deleteMany({}),
    EventItem.deleteMany({})
  ]);

  adminUser = await User.create({
    name: 'Admin Test', email: 'admin@test.com', passwordHash: 'Password123!', role: 'ADMIN'
  });
  managerUser = await User.create({
    name: 'Manager Test', email: 'manager@test.com', passwordHash: 'Password123!', role: 'MANAGER'
  });
  memberUser = await User.create({
    name: 'Member Test', email: 'member@test.com', passwordHash: 'Password123!', role: 'MEMBER'
  });

  adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, env.JWT_SECRET);
  managerToken = jwt.sign({ id: managerUser._id, role: managerUser.role }, env.JWT_SECRET);
  memberToken = jwt.sign({ id: memberUser._id, role: memberUser.role }, env.JWT_SECRET);
});

// ---------- helpers ----------
async function makeLibraryTree() {
  const root = await PlanningItem.create({ title: 'Root', scope: 'LIBRARY', path: ',', level: 0, createdBy: adminUser._id });
  root.path = `,${root._id},`;
  await root.save();
  const child = await PlanningItem.create({ title: 'Child', parentId: root._id, scope: 'LIBRARY', path: `,${root._id},`, level: 1, createdBy: adminUser._id });
  child.path = `,${root._id},${child._id},`;
  await child.save();
  return { root, child };
}

async function makeEventWithTree() {
  const event = await Event.create({
    title: 'Event Test', planId: new mongoose.Types.ObjectId(),
    startDate: new Date('2026-09-01'), createdBy: adminUser._id
  });
  const mk = async (title, parentId, parentPath, level, order, fields = {}) => {
    const it = await EventItem.create({
      eventId: event._id, title, parentId, path: ',', level, order,
      status: 'NOT_STARTED', priority: 'MEDIUM', ...fields
    });
    it.path = `${parentPath}${it._id},`;
    await it.save();
    return it;
  };
  return { event, mk };
}

// ---------- AUTH (T-01…T-03) ----------
test('T-01: health/db connectivity ready', async () => {
  assert.strictEqual(mongoose.connection.readyState, 1);
});

test('T-02: bcrypt hash on save + passwordHash stripped from JSON', async () => {
  const u = await User.findOne({ email: 'admin@test.com' });
  assert.notStrictEqual(u.passwordHash, 'Password123!');
  assert.ok(u.passwordHash.startsWith('$2'));
  assert.strictEqual(u.toJSON().passwordHash, undefined);
  assert.strictEqual(await u.comparePassword('Password123!'), true);
});

test('T-03: wrong password fails comparison (login 401 path)', async () => {
  const u = await User.findOne({ email: 'admin@test.com' });
  assert.strictEqual(await u.comparePassword('WrongPass!'), false);
});

test('T-04: JWT carries id + role only; verify/decode round-trip', () => {
  const decoded = jwt.verify(managerToken, env.JWT_SECRET);
  assert.ok(decoded.id);
  assert.strictEqual(decoded.role, 'MANAGER');
  assert.ok(!('passwordHash' in decoded));
});

// ---------- RBAC (T-21…T-25 behaviour at service layer) ----------
test('T-05: Admin sending assigneeId -> FORBIDDEN (Admin owns structure, not operations)', async () => {
  const { event, mk } = await makeEventWithTree();
  const leaf = await mk('Leaf', null, ',', 0, 0);
  await assert.rejects(
    () => eventService.updateExecutionItem(leaf._id, { assigneeId: memberUser._id }, adminUser),
    err => err.code === 'FORBIDDEN'
  );
});

test('T-06: Member sending priority -> FORBIDDEN', async () => {
  const { mk } = await makeEventWithTree();
  const leaf = await mk('Leaf', null, ',', 0, 0);
  await assert.rejects(
    () => eventService.updateExecutionItem(leaf._id, { priority: 'HIGH' }, memberUser),
    err => err.code === 'FORBIDDEN'
  );
});

test('T-07: Member cannot re-open COMPLETED even when owner', async () => {
  const { mk } = await makeEventWithTree();
  const leaf = await mk('Leaf', null, ',', 0, 0, {
    status: 'COMPLETED', assigneeId: memberUser._id
  });
  await assert.rejects(
    () => eventService.updateExecutionItem(leaf._id, { status: 'IN_PROGRESS' }, memberUser),
    err => err.code === 'FORBIDDEN'
  );
  // Manager MAY re-open
  const ok = await eventService.updateExecutionItem(String(leaf._id), { status: 'IN_PROGRESS' }, managerUser);
  assert.strictEqual(ok.status, 'IN_PROGRESS');
});

// ---------- TREE (T-05…T-10) ----------
test('T-08: move into own subtree -> CYCLE_DETECTED, nothing changes', async () => {
  const { root, child } = await makeLibraryTree();
  const beforePath = root.path;
  await assert.rejects(
    () => planningService.moveItem(root._id, child._id),
    err => err.code === 'CYCLE_DETECTED'
  );
  const fresh = await PlanningItem.findById(root._id);
  assert.strictEqual(fresh.path, beforePath);
  assert.strictEqual(fresh.parentId, null);
});

test('T-09: valid move re-paths the subtree atomically', async () => {
  const a = await PlanningItem.create({ title: 'A', scope: 'LIBRARY', path: ',', level: 0, createdBy: adminUser._id });
  a.path = `,${a._id},`;
  await a.save();
  const b = await PlanningItem.create({ title: 'B', scope: 'LIBRARY', path: ',', level: 0, createdBy: adminUser._id });
  b.path = `,${b._id},`;
  await b.save();
  const b1 = await PlanningItem.create({ title: 'B1', parentId: b._id, scope: 'LIBRARY', path: `,${b._id},`, level: 1, createdBy: adminUser._id });
  b1.path = `,${b._id},${b1._id},`;
  await b1.save();

  const moved = await planningService.moveItem(b._id, a._id);
  assert.strictEqual(moved.level, 1);
  assert.ok(moved.path.startsWith(`,${a._id},`));
  const freshB1 = await PlanningItem.findById(b1._id);
  assert.strictEqual(freshB1.level, 2);
  assert.ok(freshB1.path.startsWith(`,${a._id},${b._id},`));
});

test('T-10: deleteSubtree cascades — no orphans left', async () => {
  const { root, child } = await makeLibraryTree();
  const res = await planningService.deleteSubtree(root._id);
  assert.strictEqual(res.deletedCount, 2);
  assert.strictEqual(await PlanningItem.countDocuments({ _id: { $in: [root._id, child._id] } }), 0);
});

test('T-11: buildTree O(n) — missing-parent node surfaces as root', () => {
  const flat = [
    { _id: 'r', parentId: null, title: 'R', order: 1 },
    { _id: 'x', parentId: 'ghost', title: 'Orphan', order: 0 },
    { _id: 'c', parentId: 'r', title: 'C', order: 0 }
  ];
  const tree = buildTree(flat.map(f => ({ ...f, toObject: undefined })));
  // orphan + real root both surface
  const titles = tree.map(n => n.title).sort();
  assert.deepStrictEqual(titles, ['Orphan', 'R']);
  const r = tree.find(n => n.title === 'R');
  assert.strictEqual(r.children.length, 1);
});

// ---------- SCOPE GUARD ----------
test('T-12: createItem with parent from another scope rejected', async () => {
  const { root } = await makeLibraryTree();
  await assert.rejects(
    () => planningService.createItem(
      { title: 'X', scope: 'PLAN', parentId: String(root._id) },
      adminUser._id
    ),
    err => err.code === 'VALIDATION_ERROR'
  );
});

// ---------- CLONE (T-12/T-24 behaviour) ----------
test('T-13: scheduleFromPlan clones full blueprint — counts, defaults, isolation', async () => {
  const plan = await EventPlan.create({ title: 'Plan Test', category: 'C', createdBy: adminUser._id });
  const pRoot = await PlanningItem.create({ title: 'PRoot', scope: 'PLAN', planId: plan._id, path: ',', level: 0, createdBy: adminUser._id });
  pRoot.path = `,${pRoot._id},`;
  await pRoot.save();
  const pLeaf = await PlanningItem.create({ title: 'PLeaf', scope: 'PLAN', planId: plan._id, parentId: pRoot._id, path: `,${pRoot._id},`, level: 1, createdBy: adminUser._id });
  pLeaf.path = `,${pRoot._id},${pLeaf._id},`;
  await pLeaf.save();

  const { event, itemCount } = await eventService.scheduleFromPlan(
    { title: 'Scheduled E', planId: String(plan._id), startDate: '2026-09-10' },
    adminUser._id
  );

  assert.strictEqual(itemCount, 2);
  const items = await EventItem.find({ eventId: event._id });
  assert.strictEqual(items.length, 2);
  items.forEach(i => {
    assert.strictEqual(i.status, 'NOT_STARTED');
    assert.strictEqual(i.priority, 'MEDIUM');
    assert.strictEqual(i.progressPercent, 0);
    assert.ok(i.sourcePlanningItemId); // trace preserved
  });
  // library untouched / master-plan untouched
  assert.strictEqual((await PlanningItem.findById(pLeaf._id)).title, 'PLeaf');
});

// ---------- PROGRESS (T-14…T-17 area) ----------
test('T-14: child-average roll-up matches worked example (rounded ints)', async () => {
  const { event, mk } = await makeEventWithTree();
  const food = await mk('Food', null, ',', 0, 0, { status: 'IN_PROGRESS' });
  const proc = await mk('Procurement', food._id, food.path, 1, 0, { status: 'IN_PROGRESS' });
  await mk('L1', proc._id, proc.path, 2, 0, { status: 'COMPLETED' });
  await mk('L2', proc._id, proc.path, 2, 1, { status: 'COMPLETED' });
  await mk('L3', proc._id, proc.path, 2, 2, { status: 'BLOCKED' });   // Procurement = (100+100+0)/3 = 66.67 -> 67
  const cat = await mk('Catering', food._id, food.path, 1, 1, { status: 'IN_PROGRESS' });
  await mk('L4', cat._id, cat.path, 2, 0, { status: 'IN_PROGRESS' });
  await mk('L5', cat._id, cat.path, 2, 1, { status: 'COMPLETED' });   // Catering = 75
  const stage = await mk('Stage', food._id, food.path, 1, 2, { status: 'IN_PROGRESS' });
  await mk('L6', stage._id, stage.path, 2, 0, { status: 'COMPLETED' });
  await mk('L7', stage._id, stage.path, 2, 1, { status: 'IN_PROGRESS' });
  await mk('L8', stage._id, stage.path, 2, 2, { status: 'NOT_STARTED' }); // Stage = 50

  const res = await progressService.recalculate(event._id);

  const procDoc = await EventItem.findById(proc._id);
  assert.strictEqual(procDoc.progressPercent, 67);
  // event = average of roots = round((66.67 + 75 + 50)/3) = 64
  assert.strictEqual(res.eventProgress, 64);
  const evFresh = await Event.findById(event._id);
  assert.strictEqual(evFresh.progressPercent, 64);
});

// ---------- TRANSITIONS + FIELD GATES (T-16…T-22) ----------
test('T-15: status change on a parent -> NOT_A_LEAF', async () => {
  const { mk } = await makeEventWithTree();
  const parent = await mk('Parent', null, ',', 0, 0, { status: 'IN_PROGRESS' });
  await mk('ChildLeaf', parent._id, parent.path, 1, 0);
  await assert.rejects(
    () => eventService.updateExecutionItem(parent._id, { status: 'BLOCKED' }, managerUser),
    err => err.code === 'NOT_A_LEAF'
  );
});

test('T-16: illegal transition NOT_STARTED -> COMPLETED -> INVALID_TRANSITION', async () => {
  const { mk } = await makeEventWithTree();
  const leaf = await mk('Leaf', null, ',', 0, 0);
  await assert.rejects(
    () => eventService.updateExecutionItem(leaf._id, { status: 'COMPLETED' }, managerUser),
    err => err.code === 'INVALID_TRANSITION'
  );
});

test('T-17: legal transition BLOCKED -> IN_PROGRESS succeeds for owner-role', async () => {
  const { mk } = await makeEventWithTree();
  const leaf = await mk('Leaf', null, ',', 0, 0, { status: 'BLOCKED', assigneeId: memberUser._id });
  const out = await eventService.updateExecutionItem(String(leaf._id), { status: 'IN_PROGRESS' }, managerUser);
  assert.strictEqual(out.status, 'IN_PROGRESS');
});

// ---------- MEMBER SCOPED VISIBILITY (OPEN-5) ----------
test('T-18: member sees owned branch (assigned node + descendants) + ancestors, not other branches', async () => {
  const { event, mk } = await makeEventWithTree();
  const scopeItemsForMember = require('../src/utils/scopeItemsForMember');
  const ownedBranch = await mk('OwnedBranch', null, ',', 0, 0, { assigneeId: memberUser._id });
  const leafA = await mk('A', ownedBranch._id, ownedBranch.path, 1, 0);
  const leafB = await mk('B', ownedBranch._id, ownedBranch.path, 1, 1);
  const other = await mk('OtherBranch', null, ',', 0, 1);

  let items = await EventItem.find({ eventId: event._id }).populate('assigneeId', 'name role');
  items = scopeItemsForMember(items, memberUser._id);

  const ids = items.map(i => String(i._id)).sort();
  assert.deepStrictEqual(ids, [ownedBranch, leafA, leafB].map(i => String(i._id)).sort());
  assert.ok(!ids.includes(String(other._id)));
});
