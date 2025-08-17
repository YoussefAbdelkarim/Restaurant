const express = require('express');
const router = express.Router();
const ingredientController = require('../controllers/ingredientController');
const { protect } = require('../middleWares/authMiddleware');

router.get('/', protect,ingredientController.getIngredients);
router.post('/', protect,ingredientController.createIngredient);
router.get('/:id', protect,ingredientController.getIngredientById);
router.put('/:id', protect,ingredientController.updateIngredient);
router.delete('/:id',protect,ingredientController.deleteIngredient);

module.exports = router;