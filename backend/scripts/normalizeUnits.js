/*
  Normalize ingredient units in DB and fix specific ingredients.
  - Maps synonyms to allowed set: g, kg, l, ml, piece, unit
  - Forces:
    • smoked bacon → piece
    • beef patty → piece
    • salt → g
*/

require('dotenv').config();
const connectDB = require('../config/db');
const Ingredient = require('../models/Ingredient');
const { normalizeUnit } = require('../services/unitUtils');

// Uses shared normalizeUnit from services

async function run() {
  await connectDB();
  let updatedCount = 0;

  const all = await Ingredient.find({});
  for (const ing of all) {
    const name = String(ing.name || '').trim();
    let desiredUnit = normalizeUnit(ing.unit);

    if (/^smoked\s*bacon$/i.test(name)) desiredUnit = 'piece';
    if (/^beef\s*patty$/i.test(name)) desiredUnit = 'piece';
    if (/^salt$/i.test(name)) desiredUnit = 'g';

    // Common liquids to ml
    if (/oil|water|milk|juice|syrup|sauce|olive/i.test(name)) {
      // Convert liters to ml if needed
      if (ing.unit === 'l' && typeof ing.currentStock === 'number') {
        ing.currentStock = ing.currentStock * 1000;
      }
      desiredUnit = 'ml';
    }

    if (ing.unit !== desiredUnit) {
      console.log(`Updating ${name}: ${ing.unit} -> ${desiredUnit}`);
      ing.unit = desiredUnit;
      try {
        await ing.save();
        updatedCount += 1;
      } catch (err) {
        console.error(`Failed to update ${name}:`, err.message);
      }
    }
  }

  console.log(`Finished. Updated ${updatedCount} ingredient(s).`);
  process.exit(0);
}

run().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});


