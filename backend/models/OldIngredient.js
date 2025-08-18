const mongoose = require('mongoose');

const oldIngredientSchema = new mongoose.Schema(
  {
    originalIngredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Ingredient name is required'],
      trim: true,
    },
    unit: {
      type: String,
      required: [true, 'Unit is required'],
    },
    currentStock: {
      type: Number,
      default: 0,
    },
    alertThreshold: {
      type: Number,
      default: 0,
    },
    // Optional metadata about the purchase snapshot
    purchasedQuantity: {
      type: Number,
      default: 0,
    },
    purchasedUnitPrice: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
    snapshotDate: {
      type: Date,
      default: Date.now,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OldIngredient', oldIngredientSchema);


