const DailyInventory = require('../models/DailyInventory');
const InventoryTransaction = require('../models/InventoryTransaction');
const Ingredient = require('../models/Ingredient');

function normalizeDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  // Service day starts at 02:00 local time
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 2, 0, 0, 0);
}

async function buildDailyFromNow(date) {
  const start = normalizeDate(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const ingredients = await Ingredient.find();

  // Aggregate transactions for the day by ingredient
  const txs = await InventoryTransaction.aggregate([
    { $match: { date: { $gte: start, $lt: end } } },
    { $group: {
      _id: '$ingredient',
      purchaseQty: { $sum: { $cond: [{ $eq: ['$kind', 'purchase'] }, '$quantity', 0] } },
      disposeQty: { $sum: { $cond: [{ $eq: ['$kind', 'dispose'] }, '$quantity', 0] } },
      usageQty: { $sum: { $cond: [{ $eq: ['$kind', 'usage'] }, '$quantity', 0] } },
    } }
  ]);

  const idToAgg = new Map(txs.map(t => [String(t._id), t]));

  // Try to find an existing daily record
  let daily = await DailyInventory.findOne({ date: start });
  if (daily && daily.finalized) {
    return daily;
  }
  const ingredientMap = new Map();
  if (daily) {
    for (const di of daily.ingredients) {
      ingredientMap.set(String(di.ingredient), di);
    }
  }

  // Merge/compose ingredients entries
  const merged = [];
  // If there is no daily yet, we need to compute Open for the first time
  // Prefer previous day's finalized close; otherwise, derive open from current stock and today's net transactions
  let prevCloseMap = null;
  if (!daily) {
    const prev = new Date(start);
    prev.setDate(prev.getDate() - 1);
    const prevDaily = await DailyInventory.findOne({ date: prev, finalized: true });
    if (prevDaily) {
      prevCloseMap = new Map(prevDaily.ingredients.map(di => [String(di.ingredient), di.closeQty]));
    } else {
      prevCloseMap = new Map();
    }
  }

  for (const ing of ingredients) {
    const idStr = String(ing._id);
    const prev = ingredientMap.get(idStr);
    const agg = idToAgg.get(idStr);
    const purchaseQty = agg ? agg.purchaseQty : 0;
    const disposeQty = agg ? agg.disposeQty : 0;
    const usageQty = agg ? agg.usageQty : 0;
    let openQty;
    if (prev) {
      openQty = prev.openQty;
      // Backfill: if a prior snapshot had openQty at 0 (or unset) and there have been no
      // transactions today yet, initialize open from currentStock so the Open column reflects
      // the start-of-day inventory status.
      if (
        (openQty === 0 || openQty === undefined || openQty === null) &&
        purchaseQty === 0 && disposeQty === 0 && usageQty === 0 &&
        (Number(ing.currentStock) || 0) > 0
      ) {
        openQty = Number(ing.currentStock) || 0;
      }
    } else if (prevCloseMap) {
      if (prevCloseMap.has(idStr)) {
        openQty = Number(prevCloseMap.get(idStr)) || 0;
      } else {
        // Derive opening from current stock by reversing today's net transactions
        // open = currentStock - purchases + disposals + usage
        openQty = Math.max((Number(ing.currentStock) || 0) - purchaseQty + disposeQty + usageQty, 0);
      }
    } else {
      openQty = 0;
    }
    const closeQty = Math.max(openQty + purchaseQty - disposeQty - usageQty, 0);
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
    daily = await DailyInventory.create({ date: start, ingredients: merged, finalized: false });
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
    let daily = await DailyInventory.findOne({ date });
    if (daily && daily.ingredients?.length) {
      return res.json(daily);
    }
    const ingredients = await Ingredient.find();
    // Determine previous day's close as today's open when available
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    const prevDaily = await DailyInventory.findOne({ date: prev, finalized: true });
    const prevMap = new Map();
    if (prevDaily) {
      for (const di of prevDaily.ingredients) {
        prevMap.set(String(di.ingredient), di.closeQty || 0);
      }
    }
    const entries = ingredients.map(ing => {
      const prevClose = prevMap.get(String(ing._id));
      const opening = typeof prevClose === 'number' ? prevClose : ing.currentStock;
      return {
        ingredient: ing._id,
        name: ing.name,
        unit: ing.unit,
        openQty: opening,
        purchaseQty: 0,
        disposeQty: 0,
        usageQty: 0,
        closeQty: opening,
      };
    });
    daily = await DailyInventory.findOneAndUpdate(
      { date },
      { $set: { date, ingredients: entries, finalized: false } },
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
    const start = date;
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    let daily = await DailyInventory.findOne({ date: start });
    if (!daily) {
      // If day wasn't explicitly opened, create an opening snapshot first
      await DailyInventory.create({ date: start, ingredients: [], finalized: false });
      daily = await DailyInventory.findOne({ date: start });
    }

    // Rebuild daily based on current state and transactions, then mark finalized
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
    const todayStart = normalizeDate(new Date());
    const existing = await DailyInventory.findOne({ date });

    let daily;
    if (existing && existing.finalized) {
      daily = existing;
    } else {
      daily = await buildDailyFromNow(date);
      // Auto-finalize past days (date strictly before today's service day start)
      if (date.getTime() < todayStart.getTime()) {
        if (!daily.finalized) {
          daily.finalized = true;
          await daily.save();
        }
      }
    }

    return res.json(daily);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { openDay, closeDay, disposeIngredient, getDaily };


