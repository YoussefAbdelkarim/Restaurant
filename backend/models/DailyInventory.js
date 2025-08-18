const mongoose = require('mongoose');

const dailyIngredientSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    name: String,
    unit: String,
    openQty: { type: Number, default: 0 },
    purchaseQty: { type: Number, default: 0 },
    disposeQty: { type: Number, default: 0 },
    usageQty: { type: Number, default: 0 },
    closeQty: { type: Number, default: 0 },
  },
  { _id: false }
);

const dailyInventorySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, index: true },
    ingredients: [dailyIngredientSchema],
    finalized: { type: Boolean, default: false },
  },
  { timestamps: true }
);

dailyInventorySchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('DailyInventory', dailyInventorySchema);


