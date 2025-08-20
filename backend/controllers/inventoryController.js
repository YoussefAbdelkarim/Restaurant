const DailyInventory = require('../models/DailyInventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Ingredient = require('../models/Ingredient');

function normalizeDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

async function buildDailyFromNow(date) {
  const start = normalizeDate(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const ingredients = await Ingredient.find();

  // Aggregate transactions for the day by ingredient
  // Narrow by open/close time if present
  let daily = await DailyInventory.findOne({ date: start });
  let from = start;
  let to = end;
  if (daily && daily.openTime) from = daily.openTime;
  if (daily && daily.closeTime) to = daily.closeTime;

  const txs = await InventoryTransaction.aggregate([
    { $match: { date: { $gte: from, $lt: to } } },
    { $group: {
      _id: '$ingredient',
      purchaseQty: { $sum: { $cond: [{ $eq: ['$kind', 'purchase'] }, '$quantity', 0] } },
      disposeQty: { $sum: { $cond: [{ $eq: ['$kind', 'dispose'] }, '$quantity', 0] } },
      usageQty: { $sum: { $cond: [{ $eq: ['$kind', 'usage'] }, '$quantity', 0] } },
    } }
  ]);

  const idToAgg = new Map(txs.map(t => [String(t._id), t]));

  // Try to find an existing daily record
  daily = await DailyInventory.findOne({ date: start });
  const ingredientMap = new Map();
  if (daily) {
    for (const di of daily.ingredients) {
      ingredientMap.set(String(di.ingredient), di);
    }
  }

  // Merge/compose ingredients entries
  const merged = [];
  for (const ing of ingredients) {
    const idStr = String(ing._id);
    const prev = ingredientMap.get(idStr);
    const agg = idToAgg.get(idStr);
    const purchaseQty = agg ? agg.purchaseQty : 0;
    const disposeQty = agg ? agg.disposeQty : 0;
    const usageQty = agg ? agg.usageQty : 0;
    const openQty = prev ? prev.openQty : 0;
    const closeQty = ing.currentStock;
    merged.push({
      ingredient: ing._id,
      name: ing.name,
      unit: ing.unit,
      openQty,
      purchaseQty,
      disposeQty,
      usageQty,
      closeQty,
    });
  }

  if (!daily) {
    daily = await DailyInventory.create({ date: start, ingredients: merged, finalized: false, openTime: null, closeTime: null });
  } else {
    daily.ingredients = merged;
    await daily.save();
  }

  return daily;
}

// Open the day: snapshot open quantities for all ingredients
const openDay = async (req, res) => {
  try {
    const date = normalizeDate(req.body?.date);
    const at = req.body?.time ? new Date(req.body.time) : new Date();
    let daily = await DailyInventory.findOne({ date });
    if (daily && daily.ingredients?.length) {
      if (!daily.openTime) daily.openTime = at;
      await daily.save();
      return res.json(daily);
    }
    const ingredients = await Ingredient.find();
    const entries = ingredients.map(ing => ({
      ingredient: ing._id,
      name: ing.name,
      unit: ing.unit,
      openQty: ing.currentStock,
      purchaseQty: 0,
      disposeQty: 0,
      usageQty: 0,
      closeQty: ing.currentStock,
    }));
    daily = await DailyInventory.findOneAndUpdate(
      { date },
      { $set: { date, ingredients: entries, finalized: false, openTime: at, closeTime: null } },
      { new: true, upsert: true }
    );
    return res.json(daily);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Close the day: compute close quantities and usage
const closeDay = async (req, res) => {
  try {
    const date = normalizeDate(req.body?.date);
    const at = req.body?.time ? new Date(req.body.time) : new Date();
    const start = date;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    let daily = await DailyInventory.findOne({ date: start });
    if (!daily) {
      daily = await openDay({ body: { date: start } }, { json: v => v, status: () => ({ json: v => v }) });
    }

    // Rebuild daily based on current state and transactions, then mark finalized
    daily.closeTime = at;
    await daily.save();
    const rebuilt = await buildDailyFromNow(start);
    rebuilt.finalized = true;
    await rebuilt.save();
    return res.json(rebuilt);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Record a disposal transaction and decrease stock
const disposeIngredient = async (req, res) => {
  try {
    const { ingredientId, quantity, notes } = req.body;
    if (!ingredientId || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'ingredientId and positive quantity are required' });
    }

    const ing = await Ingredient.findById(ingredientId);
    if (!ing) return res.status(404).json({ message: 'Ingredient not found' });
    if (ing.currentStock < quantity) {
      return res.status(400).json({ message: 'Cannot dispose more than current stock' });
    }

    ing.currentStock -= quantity;
    await ing.save();

    await InventoryTransaction.create({
      ingredient: ing._id,
      quantity: Number(quantity),
      operation: 'subtract',
      kind: 'dispose',
      unitPrice: Number(ing.pricePerUnit || 0),
      amount: Number(quantity) * Number(ing.pricePerUnit || 0),
      notes: notes || '',
      date: new Date(),
    });

    return res.json({ message: 'Disposed successfully', ingredient: ing });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get daily report (builds/updates snapshot for the date)
const getDaily = async (req, res) => {
  try {
    const date = normalizeDate(req.query?.date);
    const start = date;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const daily = await buildDailyFromNow(date);

    // Also return raw transactions for the day grouped by kind for UI drilldown
    const txs = await InventoryTransaction.find({ date: { $gte: start, $lt: end } })
      .populate('ingredient', 'name unit')
      .sort({ date: 1 })
      .lean();
    const purchases = txs.filter(t => t.kind === 'purchase');
    const disposals = txs.filter(t => t.kind === 'dispose');
    const usages = txs.filter(t => t.kind === 'usage');
    const adjustments = txs.filter(t => t.kind === 'adjustment');

    return res.json({ ...daily.toObject(), transactions: { purchases, disposals, usages, adjustments } });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { openDay, closeDay, disposeIngredient, getDaily };


