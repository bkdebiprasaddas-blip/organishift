const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');

process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/organishift_test';
process.env.JWT_SECRET = 'acceptance-test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user.model');
const Event = require('../src/models/event.model');
const Task = require('../src/models/task.model');

let adminToken;
let userToken;
let assigneeToken;
let adminId;
let userId;
let assigneeId;
let eventId;
let taskId;
let progressEventId;

const login = async (email, password) => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  assert.strictEqual(res.status, 200, 'login should succeed');
  return res.body.data.token;
};

before(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Task.deleteMany({})]);

  const hash = await bcrypt.hash('Passw0rd!', 10);
  const [admin, normal, assignee] = await User.create([
    { name: 'Test Admin', email: 'admin@test.dev', passwordHash: hash, role: 'admin' },
    { name: 'Normal User', email: 'user@test.dev', passwordHash: hash, role: 'user' },
    { name: 'Assignee User', email: 'assignee@test.dev', passwordHash: hash, role: 'user' }
  ]);
  adminId = admin._id.toString();
  userId = normal._id.toString();
  assigneeId = assignee._id.toString();

  adminToken = await login('admin@test.dev', 'Passw0rd!');
  userToken = await login('user@test.dev', 'Passw0rd!');
  assigneeToken = await login('assignee@test.dev', 'Passw0rd!');
});

after(async () => {
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Task.deleteMany({})]);
  await mongoose.disconnect();
});

describe('Auth', () => {
  test('register issues a token and a user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'New Person',
      email: 'newperson@test.dev',
      password: 'Secret1!a'
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.token, 'token should be issued');
    assert.strictEqual(res.body.data.user.role, 'user');
    assert.strictEqual(res.body.data.user.passwordHash, undefined, 'passwordHash must never be returned');
    await User.deleteOne({ email: 'newperson@test.dev' });
  });

  test('register rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Weak Pass',
      email: 'weak@test.dev',
      password: 'short'
    });
    assert.strictEqual(res.status, 400);
  });

  test('login with wrong password -> 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.dev', password: 'wrong-pass' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('me with valid token returns profile', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.email, 'admin@test.dev');
    assert.strictEqual(res.body.data.user.passwordHash, undefined);
  });

  test('me with invalid token -> 401', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    assert.strictEqual(res.status, 401);
  });

  test('me with no token -> 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.strictEqual(res.status, 401);
  });
});

describe('Roles', () => {
  test('user PATCH /users/:id -> 403', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ isActive: false });
    assert.strictEqual(res.status, 403);
  });

  test('user GET /users -> 403', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${userToken}`);
    assert.strictEqual(res.status, 403);
  });

  test('admin GET /users lists users without passwordHash', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.users.length >= 3);
    assert.strictEqual(res.body.data.users[0].passwordHash, undefined);
  });

  test('admin can update a user role', async () => {
    const res = await request(app)
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'user' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.user.role, 'user');
  });

  test('cannot deactivate the only active admin', async () => {
    const res = await request(app)
      .patch(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    assert.strictEqual(res.status, 400);
  });
});

describe('Events', () => {
  test('user POST /events -> 403', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'User event' });
    assert.strictEqual(res.status, 403);
  });

  test('admin creates an event', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Launch Party', description: 'Product launch', status: 'active' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.event.title, 'Launch Party');
    eventId = res.body.data.event._id;
  });

  test('admin can edit the event', async () => {
    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.event.status, 'completed');
  });

  test('event detail returns progress 0% when no tasks', async () => {
    const res = await request(app).get(`/api/events/${eventId}`).set('Authorization', `Bearer ${userToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.event.progress, 0);
    assert.deepStrictEqual(res.body.data.tasks, []);
  });

  test('invalid event id -> 404', async () => {
    const res = await request(app)
      .get('/api/events/000000000000000000000000')
      .set('Authorization', `Bearer ${userToken}`);
    assert.strictEqual(res.status, 404);
  });

  test('malformed body -> 400', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'x' });
    assert.strictEqual(res.status, 400);
  });

  test('admin deletes event and cascades tasks', async () => {
    const event = await Event.create({ title: 'To Delete', createdBy: adminId });
    const task = await Task.create({ eventId: event._id, title: 'Doomed task', createdBy: adminId });
    const res = await request(app)
      .delete(`/api/events/${event._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.status, 204);
    assert.strictEqual(await Event.findById(event._id), null);
    assert.strictEqual(await Task.findById(task._id), null, 'tasks must be cascade-deleted');
  });
});

describe('Tasks', () => {
  test('admin creates tasks for an event', async () => {
    const event = await Event.create({ title: 'Progress Event', createdBy: adminId });
    progressEventId = event._id.toString();
    for (let i = 0; i < 4; i += 1) {
      const res = await request(app)
        .post(`/api/events/${event._id}/tasks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: `Task ${i + 1}`, priority: 'medium', assigneeId, dueDate: '2027-01-01T00:00:00.000Z' });
      assert.strictEqual(res.status, 201);
    }
  });

  test('non-assignee user cannot PATCH task status -> 403', async () => {
    const task = await Task.findOne({ eventId: progressEventId });
    taskId = task._id.toString();
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: 'done' });
    assert.strictEqual(res.status, 403);
  });

  test('assignee can transition status; done sets completedAt', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${assigneeToken}`)
      .send({ status: 'done' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.task.status, 'done');
    assert.ok(res.body.data.task.completedAt, 'completedAt should be set when done');
  });

  test('progress: 2 of 4 done -> 50%', async () => {
    const second = await Task.findOne({ eventId: progressEventId, _id: { $ne: taskId } });
    const res = await request(app)
      .patch(`/api/tasks/${second._id}`)
      .set('Authorization', `Bearer ${assigneeToken}`)
      .send({ status: 'done' });
    assert.strictEqual(res.status, 200);

    const detail = await request(app)
      .get(`/api/events/${progressEventId}`)
      .set('Authorization', `Bearer ${userToken}`);
    assert.strictEqual(detail.body.data.event.progress, 50);
  });

  test('assignee cannot edit fields other than status', async () => {
    const todoTask = await Task.findOne({ eventId: progressEventId, status: 'todo' });
    const res = await request(app)
      .patch(`/api/tasks/${todoTask._id}`)
      .set('Authorization', `Bearer ${assigneeToken}`)
      .send({ title: 'Hijacked title' });
    assert.strictEqual(res.status, 200);
    const fresh = await Task.findById(todoTask._id);
    assert.notStrictEqual(fresh.title, 'Hijacked title', 'non-admin must not edit title');
  });

  test('user cannot delete a task -> 403', async () => {
    const res = await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${userToken}`);
    assert.strictEqual(res.status, 403);
  });
});

describe('Reports', () => {
  test('user GET /reports -> 403', async () => {
    const res = await request(app).get('/api/reports/workload').set('Authorization', `Bearer ${userToken}`);
    assert.strictEqual(res.status, 403);
  });

  test('event progress report includes done/total and percent', async () => {
    const res = await request(app).get('/api/reports/events').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.status, 200);
    const row = res.body.data.rows.find((r) => r.title === 'Progress Event');
    assert.ok(row, 'Progress Event should appear in report');
    assert.strictEqual(row.totalTasks, 4);
    assert.strictEqual(row.doneTasks, 2);
    assert.strictEqual(row.progress, 50);
  });

  test('workload report counts per assignee including overdue', async () => {
    const res = await request(app).get('/api/reports/workload').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.status, 200);
    const row = res.body.data.rows.find((r) => r.user._id === assigneeId);
    assert.ok(row, 'assignee should appear in workload');
    assert.strictEqual(row.totalTasks, 4);
    assert.strictEqual(row.done, 2);
  });

  test('overdue report lists tasks past due not done', async () => {
    const overdue = await Task.create({
      eventId: progressEventId,
      title: 'Overdue task',
      createdBy: adminId,
      assigneeId,
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24)
    });
    const res = await request(app).get('/api/reports/overdue').set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.status, 200);
    const ids = res.body.data.tasks.map((t) => t._id.toString());
    assert.ok(ids.includes(overdue._id.toString()), 'overdue task should appear');
  });
});

describe('Security', () => {
  test('rate limit triggers after 100 requests per IP', async () => {
    let limited = null;
    for (let i = 0; i < 101; i += 1) {
      const res = await request(app).get('/api/health');
      if (res.status === 429) {
        limited = res;
        break;
      }
    }
    assert.ok(limited, 'expected a 429 after exceeding the rate limit');
  });
});
