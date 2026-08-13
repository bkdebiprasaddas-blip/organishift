const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const Task = require('../models/task.model');

const DAY = 24 * 60 * 60 * 1000;

const seed = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log(`Seeding database: ${mongoose.connection.name}`);

  // Idempotent: drop-then-create.
  await Promise.all([User.deleteMany({}), Event.deleteMany({}), Task.deleteMany({})]);

  const adminHash = await bcrypt.hash('ChangeMe!123', 10);
  const demoHash = await bcrypt.hash('DemoPass!1', 10);

  const [admin, alice, bob, carol] = await User.create([
    { name: 'Admin', email: 'admin@organishift.dev', passwordHash: adminHash, role: 'admin', isActive: true },
    { name: 'Alice A.', email: 'alice@organishift.dev', passwordHash: demoHash, role: 'user', isActive: true },
    { name: 'Bob B.', email: 'bob@organishift.dev', passwordHash: demoHash, role: 'user', isActive: true },
    { name: 'Carol C.', email: 'carol@organishift.dev', passwordHash: demoHash, role: 'user', isActive: true }
  ]);

  const now = new Date();
  const inDays = (n) => new Date(now.getTime() + n * DAY);

  const [techConf, gala] = await Event.create([
    {
      title: 'Tech Conference 2026',
      description: 'Annual tech conference with talks and workshops.',
      startDate: inDays(14),
      endDate: inDays(15),
      status: 'active',
      createdBy: admin._id
    },
    {
      title: 'Annual Charity Gala',
      description: 'Fundraising gala dinner.',
      startDate: inDays(-7),
      endDate: inDays(-6),
      status: 'completed',
      createdBy: admin._id
    }
  ]);

  await Task.create([
    {
      eventId: techConf._id,
      title: 'Book venue',
      description: 'Secure the main hall.',
      status: 'done',
      priority: 'high',
      assigneeId: alice._id,
      dueDate: inDays(-5),
      completedAt: inDays(-6),
      createdBy: admin._id
    },
    {
      eventId: techConf._id,
      title: 'Invite speakers',
      status: 'in-progress',
      priority: 'high',
      assigneeId: bob._id,
      dueDate: inDays(-2),
      createdBy: admin._id
    },
    {
      eventId: techConf._id,
      title: 'Draft agenda',
      status: 'in-progress',
      priority: 'medium',
      assigneeId: carol._id,
      dueDate: inDays(5),
      createdBy: admin._id
    },
    {
      eventId: techConf._id,
      title: 'Order swag',
      status: 'todo',
      priority: 'low',
      assigneeId: alice._id,
      dueDate: inDays(9),
      createdBy: admin._id
    },
    {
      eventId: gala._id,
      title: 'Sell tickets',
      status: 'done',
      priority: 'high',
      assigneeId: alice._id,
      dueDate: inDays(-10),
      completedAt: inDays(-11),
      createdBy: admin._id
    },
    {
      eventId: gala._id,
      title: 'Send thank-you notes',
      status: 'done',
      priority: 'medium',
      assigneeId: carol._id,
      dueDate: inDays(-3),
      completedAt: inDays(-4),
      createdBy: admin._id
    }
  ]);

  console.log('Seed complete: 1 admin, 3 demo users, 2 events, 6 tasks.');
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
