const Item = require('../models/Item');
const Ingredient = require('../models/Ingredient');

const createItem = async (req, res) => {
  try {
    const { name, category, price, ingredients, currentStock, alertThreshold, steps, instructions, isAvailable } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({ message: 'Name, category, and price are required' });
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
        // Enforce unit to match the inventory ingredient's unit for consistency
        ing.unit = ing.unit || ingredientExists.unit;
        // Optional: default name to ingredient name for display
        if (!ing.name) ing.name = ingredientExists.name;
      }
    }

    const newItem = new Item({ 
      name, 
      category, 
      price, 
      ingredients: ingredients || [], 
      isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
      currentStock: currentStock || 0, 
      alertThreshold: alertThreshold || 20,
      steps: Array.isArray(steps) ? steps : [],
      instructions: typeof instructions === 'string' ? instructions : ''
    });
    await newItem.save();

    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getItems = async (req, res) => {
  try {
    const items = await Item.find({}).populate('ingredients.ingredient', 'name unit');
    // Normalize ingredients to always include name/unit for frontend display
    const normalized = items.map(it => {
      const obj = it.toObject();
      obj.ingredients = (obj.ingredients || []).map(r => ({
        ingredient: r.ingredient?._id || r.ingredient,
        name: r.name || r.ingredient?.name || '',
        unit: r.unit || r.ingredient?.unit || '',
        quantity: r.quantity
      }));
      return obj;
    });
    res.json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
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
    const { name, category, price, ingredients, steps, instructions, isAvailable } = req.body;

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (name) item.name = name;
    if (category) item.category = category;
    if (price !== undefined) item.price = price;
    if (typeof isAvailable === 'boolean') item.isAvailable = isAvailable;
    if (Array.isArray(ingredients)) {
      // Validate provided ingredients
      for (const ing of ingredients) {
        if (!ing.ingredient || !ing.quantity || !ing.unit) {
          return res.status(400).json({ message: 'Each ingredient must have a quantity and unit' });
        }
        const ingredientExists = await Ingredient.findById(ing.ingredient);
        if (!ingredientExists) {
          return res.status(404).json({ message: `Ingredient not found: ${ing.ingredient}` });
        }
        ing.unit = ing.unit || ingredientExists.unit;
        if (!ing.name) ing.name = ingredientExists.name;
      }
      item.ingredients = ingredients;
    }
    if (Array.isArray(steps)) item.steps = steps;
    if (typeof instructions === 'string') item.instructions = instructions;

    await item.save();

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateItemStock = async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'
    
    if (!quantity || !operation) {
      return res.status(400).json({ message: 'Quantity and operation are required' });
    }

    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    let newStock;
    if (operation === 'add') {
      newStock = item.currentStock + quantity;
    } else if (operation === 'subtract') {
      newStock = item.currentStock - quantity;
      if (newStock < 0) {
        return res.status(400).json({ message: 'Cannot subtract more than current stock' });
      }
    } else {
      return res.status(400).json({ message: 'Operation must be "add" or "subtract"' });
    }

    item.currentStock = newStock;
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
  updateItemStock,
  deleteItem
};