const Ingredient = require('../models/Ingredient');

const createIngredient = async (req, res) => {
  const { name, unit, currentStock, alertThreshold, pricePerUnit } = req.body;

  if (!name || !unit) {
    return res.status(400).json({ message: 'Name and unit are required' });
  }

  try {
    const ingredient = await Ingredient.create({ 
      name, 
      unit, 
      currentStock: currentStock || 0, 
      alertThreshold: alertThreshold || 0,
      pricePerUnit: pricePerUnit || 0,
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
    if (operation === 'add') ingredient.isManuallyOutOfStock = false;
    await ingredient.save();

    // Record inventory transaction for manual stock changes
    try {
      const InventoryTransaction = require('../models/InventoryTransaction');
      const tx = {
        ingredient: ingredient._id,
        quantity: Number(quantity),
        operation: operation === 'add' ? 'add' : 'subtract',
        kind: operation === 'add' ? 'adjustment' : 'dispose',
        unitPrice: Number(ingredient.pricePerUnit || 0),
        amount: Number(ingredient.pricePerUnit || 0) * Number(quantity || 0),
        date: new Date(),
        notes: operation === 'add' ? 'Manual add via Inventory page' : 'Manual dispose via Inventory page',
      };
      await InventoryTransaction.create(tx);
    } catch (e) {
      // non-fatal
    }

    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleManualOutOfStock = async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found' });
    ingredient.isManuallyOutOfStock = !ingredient.isManuallyOutOfStock;
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
  toggleManualOutOfStock,
  deleteIngredient,
};