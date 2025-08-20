const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Ingredient name is required'],
      unique: true,
      trim: true,
    },
    unit: {
      type: String,
      enum: ['g', 'kg', 'l', 'ml', 'piece', 'unit'],
      required: [true, 'Unit is required'],
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    pricePerUnit: {
      type: Number,
      default: 0,
    },
    // Cumulative purchase tracking for analytics
    totalPurchasedQuantity: {
      type: Number,
      default: 0,
    },
    totalPurchasedAmount: {
      type: Number,
      default: 0,
    },
    lastPurchaseUnitPrice: {
      type: Number,
      default: 0,
    },
    alertThreshold: {
      type: Number,
      default: 0,
    },
    isManuallyOutOfStock: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-increment plugin
ingredientSchema.plugin(AutoIncrement, { inc_field: 'id' });

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;