const Item = require('../models/Item');
const Ingredient = require('../models/Ingredient');

class InventoryService {
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
          // Item exists in items table, check if we have enough stock
          if (item.currentStock >= quantity) {
            // Deduct from item stock
            item.currentStock -= quantity;
            await item.save();
            
            results.processedItems.push({
              name: itemName,
              type: 'item',
              quantity: quantity,
              stockReduced: true,
              previousStock: item.currentStock + quantity,
              newStock: item.currentStock
            });
          } else {
            // Not enough stock, try to prepare from ingredients
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
      // Define ingredient requirements for common dishes
      const dishRequirements = this.getDishIngredientRequirements(itemName);
      
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
      const ingredient = await Ingredient.findOne({ 
        name: { $regex: new RegExp(requirement.name, 'i') } 
      });
      
      if (!ingredient) {
        missingIngredients.push(`${requirement.name} (not found in inventory)`);
        continue;
      }

      const requiredQuantity = requirement.quantity * quantity;
      if (ingredient.currentStock < requiredQuantity) {
        missingIngredients.push(`${requirement.name} (need ${requiredQuantity} ${requirement.unit}, have ${ingredient.currentStock} ${ingredient.unit})`);
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
        const ingredient = await Ingredient.findOne({ 
          name: { $regex: new RegExp(requirement.name, 'i') } 
        });
        
        if (!ingredient) {
          return {
            success: false,
            error: `Ingredient ${requirement.name} not found`
          };
        }

        const requiredQuantity = requirement.quantity * quantity;
        
        if (ingredient.currentStock < requiredQuantity) {
          return {
            success: false,
            error: `Insufficient stock for ${requirement.name}`
          };
        }

        // Deduct the ingredient
        ingredient.currentStock -= requiredQuantity;
        await ingredient.save();

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
