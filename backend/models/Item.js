const mongoose = require('mongoose');

const recipeIngredientSchema = new mongoose.Schema({
  ingredient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
    required: true,
  },
  name: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    enum: ['g', 'kg', 'l', 'piece', 'unit'],
    required: true,
  },
}, { _id: false });

const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    cost:{
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ['plate', 'sandwich', 'drink', 'burger', 'pizza', 'dessert', 'beverage', 'fries', 'spirits', 'pancakes', 'cake', 'juice'],
      required: true,
    },
    ingredients: [recipeIngredientSchema],

    imageUrl: {
      type: String,
      default: '',
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },

    currentStock: {
      type: Number,
      default: 100,
    },
    alertThreshold: {
      type: Number,
      default: 20,
    },
  },
  {
    timestamps: true,
  }
);

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;