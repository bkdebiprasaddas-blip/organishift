const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const EventPlan = require('../models/EventPlan');
const PlanningItem = require('../models/PlanningItem');
const Event = require('../models/Event');
const EventItem = require('../models/EventItem');

async function seed() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('Seed: Connected to DB');

    // Clear existing data for idempotent seed
    await User.deleteMany({});
    await EventPlan.deleteMany({});
    await PlanningItem.deleteMany({});
    await Event.deleteMany({});
    await EventItem.deleteMany({});

    console.log('Seed: Cleared existing collections');

    // 1. Seed Users (4 accounts per §8.1)
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@organishift.dev',
      passwordHash: 'Password123!',
      role: 'ADMIN',
      isActive: true
    });

    const manager = await User.create({
      name: 'Rahul V.', // Manager per DoD scenario
      email: 'manager@organishift.dev',
      passwordHash: 'Password123!',
      role: 'MANAGER',
      isActive: true,
      createdBy: admin._id
    });

    const member1 = await User.create({
      name: 'Amit S.',
      email: 'member1@organishift.dev',
      passwordHash: 'Password123!',
      role: 'MEMBER',
      isActive: true,
      createdBy: admin._id
    });

    const member2 = await User.create({
      name: 'Priya K.',
      email: 'member2@organishift.dev',
      passwordHash: 'Password123!',
      role: 'MEMBER',
      isActive: true,
      createdBy: admin._id
    });

    console.log('Seed: Created 4 user accounts');

    // 2. Seed Library Trees (Food = 7 nodes, Stage = 4 nodes)
    // Food Tree (7 nodes)
    const foodRoot = await PlanningItem.create({
      title: 'Food & Catering Services',
      description: 'Master template for food and beverage logistics',
      scope: 'LIBRARY',
      path: ',',
      level: 0,
      order: 0,
      createdBy: admin._id
    });
    foodRoot.path = `,${foodRoot._id},`;
    await foodRoot.save();

    const proc = await PlanningItem.create({
      title: 'Procurement Management',
      description: 'Sourcing ingredients and renting equipment',
      parentId: foodRoot._id,
      scope: 'LIBRARY',
      path: `,${foodRoot._id},`,
      level: 1,
      order: 0,
      createdBy: admin._id
    });
    proc.path = `,${foodRoot._id},${proc._id},`;
    await proc.save();

    const vQuotes = await PlanningItem.create({
      title: 'Vendor Quote Comparison',
      parentId: proc._id,
      scope: 'LIBRARY',
      path: `,${foodRoot._id},${proc._id},`,
      level: 2,
      order: 0,
      createdBy: admin._id
    });
    vQuotes.path = `,${foodRoot._id},${proc._id},${vQuotes._id},`;
    await vQuotes.save();

    const ingOrders = await PlanningItem.create({
      title: 'Bulk Ingredient Purchase',
      parentId: proc._id,
      scope: 'LIBRARY',
      path: `,${foodRoot._id},${proc._id},`,
      level: 2,
      order: 1,
      createdBy: admin._id
    });
    ingOrders.path = `,${foodRoot._id},${proc._id},${ingOrders._id},`;
    await ingOrders.save();

    const eqRental = await PlanningItem.create({
      title: 'Equipment Rental Contracts',
      parentId: proc._id,
      scope: 'LIBRARY',
      path: `,${foodRoot._id},${proc._id},`,
      level: 2,
      order: 2,
      createdBy: admin._id
    });
    eqRental.path = `,${foodRoot._id},${proc._id},${eqRental._id},`;
    await eqRental.save();

    const menuTast = await PlanningItem.create({
      title: 'VIP Menu Tasting Session',
      parentId: foodRoot._id,
      scope: 'LIBRARY',
      path: `,${foodRoot._id},`,
      level: 1,
      order: 1,
      createdBy: admin._id
    });
    menuTast.path = `,${foodRoot._id},${menuTast._id},`;
    await menuTast.save();

    const hallDeco = await PlanningItem.create({
      title: 'Dining Hall Layout & Setup',
      parentId: foodRoot._id,
      scope: 'LIBRARY',
      path: `,${foodRoot._id},`,
      level: 1,
      order: 2,
      createdBy: admin._id
    });
    hallDeco.path = `,${foodRoot._id},${hallDeco._id},`;
    await hallDeco.save();

    // Stage Tree (4 nodes)
    const stageRoot = await PlanningItem.create({
      title: 'Stage Production & AV',
      description: 'Lighting, audio, and backdrop setup',
      scope: 'LIBRARY',
      path: ',',
      level: 0,
      order: 1,
      createdBy: admin._id
    });
    stageRoot.path = `,${stageRoot._id},`;
    await stageRoot.save();

    const lightSetup = await PlanningItem.create({
      title: 'Lighting Rig Assembly',
      parentId: stageRoot._id,
      scope: 'LIBRARY',
      path: `,${stageRoot._id},`,
      level: 1,
      order: 0,
      createdBy: admin._id
    });
    lightSetup.path = `,${stageRoot._id},${lightSetup._id},`;
    await lightSetup.save();

    const audioCheck = await PlanningItem.create({
      title: 'Sound Check & Mic Setup',
      parentId: stageRoot._id,
      scope: 'LIBRARY',
      path: `,${stageRoot._id},`,
      level: 1,
      order: 1,
      createdBy: admin._id
    });
    audioCheck.path = `,${stageRoot._id},${audioCheck._id},`;
    await audioCheck.save();

    const backdropSetup = await PlanningItem.create({
      title: 'LED Screen Backdrop Setup',
      parentId: stageRoot._id,
      scope: 'LIBRARY',
      path: `,${stageRoot._id},`,
      level: 1,
      order: 2,
      createdBy: admin._id
    });
    backdropSetup.path = `,${stageRoot._id},${backdropSetup._id},`;
    await backdropSetup.save();

    console.log('Seed: Created 2 Library Trees (Food = 7 nodes, Stage = 4 nodes)');

    // 3. Seed Annual Function Plan Blueprint (11 copied nodes)
    const plan = await EventPlan.create({
      title: 'Annual Function 2026 Blueprint',
      description: 'Standard plan blueprint for institutional annual function',
      category: 'Annual Event',
      createdBy: admin._id,
      isTemplate: true
    });

    // Helper map to clone library subtree into planItems
    const libItems = [foodRoot, proc, vQuotes, ingOrders, eqRental, menuTast, hallDeco, stageRoot, lightSetup, audioCheck, backdropSetup];
    const planIdMap = {};

    for (const item of libItems) {
      const parentPlanId = item.parentId ? planIdMap[String(item.parentId)] : null;
      const pItem = await PlanningItem.create({
        title: item.title,
        description: item.description,
        parentId: parentPlanId,
        planId: plan._id,
        scope: 'PLAN',
        path: ',',
        level: item.level,
        order: item.order,
        sourceLibraryItemId: item._id,
        createdBy: admin._id
      });
      
      const parentPath = parentPlanId ? (await PlanningItem.findById(parentPlanId)).path : ',';
      pItem.path = `${parentPath}${pItem._id},`;
      await pItem.save();
      
      planIdMap[String(item._id)] = pItem._id;
    }

    console.log('Seed: Created Annual Function Plan (11 blueprint nodes)');
    console.log('Seed Complete Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed Failed:', err);
    process.exit(1);
  }
}

seed();
