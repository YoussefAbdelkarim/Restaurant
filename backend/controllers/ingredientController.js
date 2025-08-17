const Ingredient = require('../models/Ingredient');

const createIngredient = async (req, res) => {
  const { name, unit, currentStock, alertThreshold } = req.body;

  if (!name || !unit) {
    return res.status(400).json({ message: 'Name and unit are required' });
  }

  try {
    const ingredient = await Ingredient.create({ 
      name, 
      unit, 
      currentStock: currentStock || 0, 
      alertThreshold: alertThreshold || 0 
    });
    res.status(201).json(ingredient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find();
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getIngredientById = async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found' });
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found' });
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateIngredientStock = async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'
    
    if (!quantity || !operation) {
      return res.status(400).json({ message: 'Quantity and operation are required' });
    }

    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }

    let newStock;
    if (operation === 'add') {
      newStock = ingredient.currentStock + quantity;
    } else if (operation === 'subtract') {
      newStock = ingredient.currentStock - quantity;
      if (newStock < 0) {
        return res.status(400).json({ message: 'Cannot subtract more than current stock' });
      }
    } else {
      return res.status(400).json({ message: 'Operation must be "add" or "subtract"' });
    }

    ingredient.currentStock = newStock;
    await ingredient.save();

    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndDelete(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found' });
    res.json({ message: 'Ingredient deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createIngredient,
  getIngredients,
  getIngredientById,
  updateIngredient,
  updateIngredientStock,
  deleteIngredient,
};