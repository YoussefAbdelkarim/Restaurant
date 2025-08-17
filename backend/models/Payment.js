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
  itemName: {
    type: String,
    required: function() {
      return this.type === 'purchase';
    }
  },
  quantity: {
    type: Number,
    min: 1,
    required: function() {
      return this.type === 'purchase';
    }
  },
  unitPrice: {
    type: Number,
    min: 0,
    required: function() {
      return this.type === 'purchase';
    }
  },
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
