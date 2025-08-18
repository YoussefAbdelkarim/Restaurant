const Item = require('../models/Item');
const Ingredient = require('../models/Ingredient');

class InventoryService {
  // Convert requirement units to ingredient's unit; also normalize legacy units
  static convertToIngredientUnit(requirementUnit, ingredientUnit, quantity) {
    const norm = (u) => {
      const m = String(u || '').toLowerCase();
      if (m === 'grams' || m === 'g') return { u: 'g', factor: 1 };
      if (m === 'kg' || m === 'kilograms') return { u: 'kg', factor: 1 };
      if (m === 'ml' || m === 'milliliters') return { u: 'l', factor: 1/1000 };
      if (m === 'l' || m === 'liters') return { u: 'l', factor: 1 };
      if (m === 'pieces' || m === 'piece') return { u: 'piece', factor: 1 };
      if (m === 'unit' || m === 'units') return { u: 'unit', factor: 1 };
      return { u: m, factor: 1 };
    };
    const req = norm(requirementUnit);
    const ing = norm(ingredientUnit);
    // Convert requirement to canonical base where possible
    let qtyInCanonical = quantity * req.factor;
    // Now convert canonical to ingredient unit
    if (req.u === 'g' && ing.u === 'kg') return qtyInCanonical / 1000;
    if (req.u === 'kg' && ing.u === 'g') return qtyInCanonical * 1000;
    if (req.u === 'l' && ing.u === 'l') return qtyInCanonical;
    if (req.u === 'g' && ing.u === 'g') return qtyInCanonical;
    if (req.u === 'kg' && ing.u === 'kg') return qtyInCanonical;
    if (req.u === 'piece' && ing.u === 'piece') return qtyInCanonical;
    if (req.u === 'unit' && ing.u === 'unit') return qtyInCanonical;
    // If units differ but not convertible with our set, assume the requirement is already in ingredient units
    return quantity;
  }
  /**
   * Process an order and deduct ingredients from inventory
   * @param {Array} orderItems - Array of order items with name, quantity, etc.
   * @returns {Object} - Result with success status and any errors
   */
  static async processOrderInventory(orderItems) {
    const results = {
      success: true,
      errors: [],
      warnings: [],
      processedItems: []
    };

    try {
      for (const orderItem of orderItems) {
        const itemName = orderItem.name;
        const quantity = orderItem.quantity;

        // First, try to find the item in the items table
        let item = await Item.findOne({ 
          name: { $regex: new RegExp(itemName, 'i') } 
        });

        if (item) {
          // Prefer deducting from ingredients via recipe to record usage properly
          const preparationResult = await this.prepareFromIngredients(item.name, quantity);
          if (preparationResult.success) {
            results.processedItems.push({
              name: itemName,
              type: 'prepared',
              quantity: quantity,
              ingredientsUsed: preparationResult.ingredientsUsed
            });
          } else {
            results.errors.push(`Cannot prepare ${quantity}x ${itemName}: ${preparationResult.error}`);
            results.success = false;
          }
        } else {
          // Item doesn't exist, try to prepare from ingredients using predefined ingredient requirements
          const preparationResult = await this.prepareFromIngredients(itemName, quantity);
          if (preparationResult.success) {
            results.processedItems.push({
              name: itemName,
              type: 'prepared',
              quantity: quantity,
              ingredientsUsed: preparationResult.ingredientsUsed
            });
          } else {
            results.errors.push(`Cannot prepare ${quantity}x ${itemName}: ${preparationResult.error}`);
            results.success = false;
          }
        }
      }
    } catch (error) {
      results.success = false;
      results.errors.push(`Inventory processing error: ${error.message}`);
    }

    return results;
  }

  /**
   * Prepare an item from ingredients using predefined ingredient requirements
   * @param {string} itemName - Name of the item to prepare
   * @param {number} quantity - Quantity to prepare
   * @returns {Object} - Result with success status and ingredients used
   */
  static async prepareFromIngredients(itemName, quantity) {
    try {
      // Try to read recipe from Items collection first
      const itemDoc = await Item.findOne({ name: { $regex: new RegExp(itemName, 'i') } });
      let dishRequirements = null;
      if (itemDoc && Array.isArray(itemDoc.ingredients) && itemDoc.ingredients.length) {
        dishRequirements = itemDoc.ingredients.map(r => ({
          name: r.name || undefined,
          ingredientId: r.ingredient,
          quantity: r.quantity,
          unit: r.unit,
        }));
      }
      if (!dishRequirements) {
        // Fallback to predefined mapping
        dishRequirements = this.getDishIngredientRequirements(itemName);
      }
      
      if (!dishRequirements) {
        return {
          success: false,
          error: `No ingredient requirements defined for ${itemName}. Please add this dish to the items table or define its ingredient requirements.`
        };
      }

      // Check if we have enough ingredients
      const ingredientCheck = await this.checkIngredientAvailability(dishRequirements, quantity);
      
      if (!ingredientCheck.available) {
        return {
          success: false,
          error: `Insufficient ingredients: ${ingredientCheck.missingIngredients.join(', ')}`
        };
      }

      // Deduct ingredients from inventory
      const deductionResult = await this.deductIngredients(dishRequirements, quantity);
      
      if (deductionResult.success) {
        return {
          success: true,
          ingredientsUsed: deductionResult.ingredientsUsed
        };
      } else {
        return {
          success: false,
          error: deductionResult.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Ingredient processing error: ${error.message}`
      };
    }
  }

  /**
   * Get ingredient requirements for common dishes
   * @param {string} dishName - Name of the dish
   * @returns {Array|null} - Array of ingredient requirements or null if not defined
   */
  static getDishIngredientRequirements(dishName) {
    const dishNameLower = dishName.toLowerCase();
    
    // Define ingredient requirements for common dishes based on available inventory
    const requirements = {
      'french fries': [
        { name: 'Potatoes', quantity: 2, unit: 'piece' }
      ],
      'fries': [
        { name: 'Potatoes', quantity: 2, unit: 'piece' }
      ],
      'cheeseburger': [
        { name: 'Beef Patty', quantity: 1, unit: 'kg' },
        { name: 'Cheese', quantity: 100, unit: 'g' },
        { name: 'Tomato', quantity: 0.1, unit: 'kg' }
      ],
      'hamburger': [
        { name: 'Beef Patty', quantity: 1, unit: 'kg' },
        { name: 'Tomato', quantity: 0.1, unit: 'kg' }
      ],
      'pizza margherita': [
        { name: 'Tomato Sauce', quantity: 200, unit: 'ml' },
        { name: 'Cheese', quantity: 150, unit: 'g' },
        { name: 'Tomato', quantity: 0.2, unit: 'kg' }
      ],
      'pepperoni pizza': [
        { name: 'Tomato Sauce', quantity: 200, unit: 'ml' },
        { name: 'Cheese', quantity: 150, unit: 'g' },
        { name: 'pepperonni', quantity: 100, unit: 'g' },
        { name: 'Tomato', quantity: 0.2, unit: 'kg' }
      ],
      'sausage pizza': [
        { name: 'Tomato Sauce', quantity: 200, unit: 'ml' },
        { name: 'Cheese', quantity: 150, unit: 'g' },
        { name: 'sausage', quantity: 100, unit: 'g' },
        { name: 'Tomato', quantity: 0.2, unit: 'kg' }
      ],
      'mushroom pizza': [
        { name: 'Tomato Sauce', quantity: 200, unit: 'ml' },
        { name: 'Cheese', quantity: 150, unit: 'g' },
        { name: 'mushrooms', quantity: 100, unit: 'g' },
        { name: 'Tomato', quantity: 0.2, unit: 'kg' }
      ],
      'bacon burger': [
        { name: 'Beef Patty', quantity: 1, unit: 'kg' },
        { name: 'smoked bacon', quantity: 100, unit: 'g' },
        { name: 'Cheese', quantity: 100, unit: 'g' },
        { name: 'Tomato', quantity: 0.1, unit: 'kg' }
      ]
    };

    // Find matching dish (case-insensitive)
    for (const [dish, reqs] of Object.entries(requirements)) {
      if (dishNameLower.includes(dish) || dish.includes(dishNameLower)) {
        return reqs;
      }
    }

    return null;
  }

  /**
   * Check if we have enough ingredients to prepare a dish
   * @param {Array} dishRequirements - Array of required ingredients
   * @param {number} quantity - Quantity to prepare
   * @returns {Object} - Result with availability status
   */
  static async checkIngredientAvailability(dishRequirements, quantity) {
    const missingIngredients = [];

    for (const requirement of dishRequirements) {
      let ingredient = null;
      if (requirement.ingredientId) {
        ingredient = await Ingredient.findById(requirement.ingredientId);
      }
      if (!ingredient && requirement.name) {
        ingredient = await Ingredient.findOne({ 
          name: { $regex: new RegExp(requirement.name, 'i') } 
        });
      }
      
      if (!ingredient) {
        missingIngredients.push(`${requirement.name} (not found in inventory)`);
        continue;
      }

      const requiredQuantityRaw = requirement.quantity * quantity;
      const requiredQuantity = this.convertToIngredientUnit(requirement.unit, ingredient.unit, requiredQuantityRaw);
      if (ingredient.currentStock < requiredQuantity) {
        missingIngredients.push(`${requirement.name} (need ${requiredQuantity} ${ingredient.unit}, have ${ingredient.currentStock} ${ingredient.unit})`);
      }
    }

    return {
      available: missingIngredients.length === 0,
      missingIngredients
    };
  }

  /**
   * Deduct ingredients from inventory
   * @param {Array} dishRequirements - Array of required ingredients
   * @param {number} quantity - Quantity to prepare
   * @returns {Object} - Result with deduction status
   */
  static async deductIngredients(dishRequirements, quantity) {
    const ingredientsUsed = [];

    try {
      for (const requirement of dishRequirements) {
        let ingredient = null;
        if (requirement.ingredientId) {
          ingredient = await Ingredient.findById(requirement.ingredientId);
        }
        if (!ingredient && requirement.name) {
          ingredient = await Ingredient.findOne({ 
            name: { $regex: new RegExp(requirement.name, 'i') } 
          });
        }
        
        if (!ingredient) {
          return {
            success: false,
            error: `Ingredient ${requirement.name} not found`
          };
        }

        const requiredQuantity = this.convertToIngredientUnit(requirement.unit, ingredient.unit, requirement.quantity * quantity);
        
        if (ingredient.currentStock < requiredQuantity) {
          return {
            success: false,
            error: `Insufficient stock for ${requirement.name}`
          };
        }

        // Deduct the ingredient and log usage transaction
        ingredient.currentStock -= requiredQuantity;
        await ingredient.save();
        try {
          const InventoryTransaction = require('../models/InventoryTransaction');
          await InventoryTransaction.create({
            ingredient: ingredient._id,
            quantity: requiredQuantity,
            operation: 'subtract',
            kind: 'usage',
            unitPrice: Number(ingredient.pricePerUnit || 0),
            amount: Number(ingredient.pricePerUnit || 0) * requiredQuantity,
            date: new Date(),
            notes: `Used for preparing ${quantity}x ${dishName}`,
          });
        } catch (e) {
          // non-fatal
        }

        ingredientsUsed.push({
          name: ingredient.name,
          quantity: requiredQuantity,
          unit: ingredient.unit,
          previousStock: ingredient.currentStock + requiredQuantity,
          newStock: ingredient.currentStock
        });
      }

      return {
        success: true,
        ingredientsUsed
      };
    } catch (error) {
      return {
        success: false,
        error: `Deduction error: ${error.message}`
      };
    }
  }

  /**
   * Get current inventory status for all ingredients
   * @returns {Array} - Array of ingredients with their current stock
   */
  static async getInventoryStatus() {
    try {
      const ingredients = await Ingredient.find({}).sort({ name: 1 });
      return ingredients.map(ingredient => ({
        id: ingredient._id,
        name: ingredient.name,
        currentStock: ingredient.currentStock,
        unit: ingredient.unit,
        alertThreshold: ingredient.alertThreshold,
        status: ingredient.currentStock <= ingredient.alertThreshold ? 'low' : 'ok'
      }));
    } catch (error) {
      throw new Error(`Failed to get inventory status: ${error.message}`);
    }
  }

  /**
   * Add or update ingredient requirements for a dish
   * @param {string} dishName - Name of the dish
   * @param {Array} requirements - Array of ingredient requirements
   */
  static addDishRequirements(dishName, requirements) {
    // This method can be used to dynamically add dish requirements
    // For now, we'll keep it simple with predefined requirements
    console.log(`Adding requirements for ${dishName}:`, requirements);
  }
}

module.exports = InventoryService;
