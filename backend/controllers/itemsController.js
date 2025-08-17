const Item = require('../models/Item');
const Ingredient = require('../models/Ingredient');

const createItem = async (req, res) => {
  try {
    const { name, category, price, ingredients, currentStock, alertThreshold } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ message: 'Name, category, price and ingrediants are required' });
    }

    const existingItem = await Item.findOne({ name });
    if (existingItem) {
      return res.status(400).json({ message: 'Item with this name already exists' });
    }

    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        if (!ing.ingredient || !ing.quantity || !ing.unit) {
          return res.status(400).json({ message: 'Each ingredient must have a quantity and unit' });
        }
        const ingredientExists = await Ingredient.findById(ing.ingredient);
        if (!ingredientExists) {
          return res.status(404).json({ message: `Ingredient not found: ${ing.ingredient}` });
        }
      }
    }

    const newItem = new Item({ name, category, price, ingredients, currentStock, alertThreshold });
    await newItem.save();

    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getItems = async (req, res) => {
  try {
    const items = await Item.find({}).populate('ingredients.ingredient', 'name unit');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('ingredients.ingredient', 'name unit');
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const { name, category, price, ingredients } = req.body;

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (name) item.name = name;
    if (category) item.category = category;
    if (price) item.price = price;
    if (ingredients) item.ingredients = ingredients;

    await item.save();

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    await item.deleteOne();
    res.json({ message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem
};