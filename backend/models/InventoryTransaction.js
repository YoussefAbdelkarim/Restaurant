const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    operation: {
      type: String,
      enum: ['add', 'subtract'],
      required: true,
    },
    kind: {
      type: String,
      enum: ['purchase', 'dispose', 'usage', 'adjustment'],
      required: true,
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      default: 0,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    notes: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);


