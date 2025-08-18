const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['salary', 'purchase'],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'salary';
    }
  },
  // Legacy single-item purchase fields (kept for backward compatibility)
  itemName: {
    type: String
  },
  quantity: {
    type: Number,
    min: 1
  },
  unitPrice: {
    type: Number,
    min: 0
  },
  // New multi-ingredient purchase details
  ingredients: [
    {
      ingredient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ingredient',
        required: function() {
          return this.parent()?.type === 'purchase';
        }
      },
      name: {
        type: String
      },
      unit: {
        type: String
      },
      quantity: {
        type: Number,
        min: 1,
        required: function() {
          return this.parent()?.type === 'purchase';
        }
      },
      unitPrice: {
        type: Number,
        min: 0,
        required: function() {
          return this.parent()?.type === 'purchase';
        }
      },
      amount: {
        type: Number,
        min: 0
      }
    }
  ],
  amount: {
    type: Number,
    min: 0,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
