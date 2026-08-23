/**
 * Creates a complete "Ganesh Chaturthi Ayojan" Event Plan blueprint.
 * - Removes the stray flat Ganpati LIBRARY items created by mistake.
 * - Builds a full hierarchical PLAN-scope tree (path/level/order computed).
 * Run: node scripts/create-ganpati-plan.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const User = require('../src/models/User');
const EventPlan = require('../src/models/EventPlan');
const PlanningItem = require('../src/models/PlanningItem');

const BLUEPRINT = {
  title: 'Ganesh Chaturthi Ayojan',
  branches: [
    {
      title: '1. Pre-Festival Preparation',
      children: [
        {
          title: 'Committee Formation & Permissions',
          children: ['Organizing committee & role assignment', 'Police & municipal permissions', 'Venue / ground booking confirmation']
        },
        {
          title: 'Budget & Sponsorship',
          children: ['Estimated budget draft & approval', 'Sponsor outreach & agreements', 'Donation collection counters setup']
        },
        {
          title: 'Vendor Finalization',
          children: ['Decoration vendor contract', 'Sound & lighting vendor', 'Prasad / catering vendor', 'Idol artisan ordering']
        }
      ]
    },
    {
      title: '2. Ganesh Sthapana (Day 0)',
      children: [
        { title: 'Idol Delivery & Quality Check' },
        {
          title: 'Mandap Construction & Decoration',
          children: ['Mandap frame erection', 'Backdrop theme installation', 'Floral decoration']
        },
        {
          title: 'Pranapratishtha Ceremony',
          children: ['Priest / pandit arrangement', 'Puja samagri checklist', 'Muhurat timing coordination', 'Kalash sthapana rituals']
        },
        { title: 'Inaugural Aarti & Welcome' }
      ]
    },
    {
      title: '3. Daily Rituals (Day 1-9)',
      children: [
        { title: 'Kakad Aarti (Morning 6 AM)' },
        { title: 'Madhyahna Pooja (Noon)' },
        { title: 'Sandhya Aarti (Evening 7 PM)' },
        { title: 'Shej Aarti (Night 10 PM)' },
        {
          title: 'Daily Bhog & Naivedya',
          children: ['Modak preparation', 'Fruit & dry-fruits offering', 'Prasad distribution queue']
        },
        { title: 'Pooja Samagri Daily Stock Check' }
      ]
    },
    {
      title: '4. Cultural Programs',
      children: [
        { title: 'Bhajan & Kirtan Evenings' },
        { title: 'Dhol-Tasha Pathak Performance' },
        {
          title: 'Children Competitions',
          children: ['Rangoli competition', 'Drawing & essay contest', 'Prize distribution ceremony']
        },
        { title: 'Guest Artist Coordination' },
        { title: 'Stage & Mic Schedule Management' }
      ]
    },
    {
      title: '5. Decoration & Infrastructure',
      children: [
        { title: 'Theme & Backdrop Design' },
        { title: 'Lighting Arrangement' },
        { title: 'Sound System Setup & Testing' },
        { title: 'Seating & Shamiani Tents' },
        { title: 'Entrance Arch & Signage' },
        { title: 'Generator / Power Backup' }
      ]
    },
    {
      title: '6. Security & Crowd Management',
      children: [
        { title: 'Volunteer Deployment Roster' },
        { title: 'Barricades & Queue Lanes' },
        { title: 'CCTV & Surveillance Point' },
        { title: 'First-Aid Station & Ambulance Tie-up' },
        { title: 'Fire Extinguishers Placement' },
        { title: 'Lost & Found Desk' }
      ]
    },
    {
      title: '7. Mahaprasad (Community Feast)',
      children: [
        { title: 'Menu Planning & Quantities' },
        { title: 'Cooking Team & Kitchen Setup' },
        { title: 'Serving Counter Arrangement' },
        { title: 'Water Stations' },
        { title: 'Hygiene & Waste Management' }
      ]
    },
    {
      title: '8. Visarjan (Immersion)',
      children: [
        { title: 'Visarjan Date & Muhurat Finalization' },
        { title: 'Procession Route Permission' },
        { title: 'Dhol-Tasha & Lezim Groups Booking' },
        { title: 'Truck / Trolley Reservation' },
        { title: 'Utthapana (Farewell) Aarti' },
        { title: 'Nirmalya Collection & Disposal' },
        { title: 'Post-Visarjan Site Cleanup' }
      ]
    }
  ]
};

async function insertTree(branches, planId, parentId, parentPath, level, createdBy) {
  let count = 0;
  let order = 0;
  for (const branch of branches) {
    const item = new PlanningItem({
      title: branch.title,
      parentId: parentId || null,
      planId,
      scope: 'PLAN',
      path: ',',
      level,
      order: order++,
      createdBy
    });
    item.path = `${parentPath}${item._id},`;
    await item.save();
    count++;

    if (branch.children && branch.children.length > 0) {
      const titles = branch.children.map(c => (typeof c === 'string' ? { title: c } : c));
      count += await insertTree(titles, planId, item._id, item.path, level + 1, createdBy);
    }
  }
  return count;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected:', mongoose.connection.db.databaseName);

  const admin = await User.findOne({ email: 'admin@organishift.dev' });
  if (!admin) throw new Error('Admin user not found — run seed first');

  // 1. Cleanup: remove the stray flat Ganpati LIBRARY items from the earlier attempt
  const strayTitles = [
    'Ganpati Chaturthi Festival Planning',
    'Pranapratishtha & Sthapana',
    'Daily Pooja & Aarti Schedule',
    'Prasad & Bhog Preparation',
    'Cultural Programs & Events',
    'Decoration & Venue Setup',
    'Security & Crowd Management',
    'Visarjan Procession Planning',
    'Volunteer & Staff Coordination',
    'Budget & Finance Management'
  ];
  const del = await PlanningItem.deleteMany({ scope: 'LIBRARY', title: { $in: strayTitles } });
  console.log(`Cleanup: removed ${del.deletedCount} stray library items`);

  // 2. Remove any previous partial attempt of this plan
  const oldPlans = await EventPlan.find({ title: BLUEPRINT.title });
  for (const p of oldPlans) {
    await PlanningItem.deleteMany({ planId: p._id, scope: 'PLAN' });
    await p.deleteOne();
  }

  // 3. Create the EventPlan
  const plan = new EventPlan({
    title: BLUEPRINT.title,
    description: 'Complete 10-day festival management blueprint — sthapana to visarjan',
    category: 'Festival',
    isTemplate: true,
    createdBy: admin._id
  });
  await plan.save();
  console.log(`Created plan: ${plan.title} (${plan._id})`);

  // 4. Build the full tree
  const total = await insertTree(BLUEPRINT.branches, plan._id, null, ',', 0, admin._id);

  const saved = await PlanningItem.countDocuments({ planId: plan._id, scope: 'PLAN' });
  console.log(`Blueprint nodes inserted: ${total} (verified in DB: ${saved})`);
  console.log('Done.');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
