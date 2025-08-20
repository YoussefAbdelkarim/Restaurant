/*
  Remove zero-stock ingredients that are not referenced by any item recipe.
  Usage: node backend/scripts/cleanupZeroStockIngredients.js
*/

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const connectDB = require('../config/db');
const Ingredient = require('../models/Ingredient');
const Item = require('../models/Item');

(async function run() {
  try {
    await connectDB();
    const items = await Item.find({}, { 'ingredients.ingredient': 1 }).lean();
    const referenced = new Set();
    for (const it of items) {
      for (const r of (it.ingredients || [])) {
        if (r.ingredient) referenced.add(String(r.ingredient));
      }
    }

    const all = await Ingredient.find({ currentStock: { $lte: 0 } }).lean();
    const toDelete = all.filter(doc => !referenced.has(String(doc._id)));

    if (!toDelete.length) {
      console.log('No zero-stock unreferenced ingredients to remove.');
      process.exit(0);
    }

    const ids = toDelete.map(d => d._id);
    const res = await Ingredient.deleteMany({ _id: { $in: ids } });
    console.log(`Deleted ${res.deletedCount} zero-stock unreferenced ingredient(s).`);
    process.exit(0);
  } catch (e) {
    console.error('Cleanup failed:', e.message);
    process.exit(1);
  }
})();


