const express = require('express');
const router = express.Router();
const { openDay, closeDay, disposeIngredient, getDaily } = require('../controllers/inventoryController');
const { protect } = require('../middleWares/authMiddleware');
const allowRoles = require('../middleWares/roleMiddleware');

// allow admin, manager, accountant to manage daily inventory; others can view except cleaner
router.post('/open', protect, allowRoles('admin', 'manager', 'accountant'), openDay);
router.post('/close', protect, allowRoles('admin', 'manager', 'accountant'), closeDay);
router.post('/dispose', protect, allowRoles('admin', 'manager', 'accountant'), disposeIngredient);
router.get('/daily', protect, allowRoles('admin', 'manager', 'accountant', 'cashier', 'waiter', 'co-manager'), getDaily);

module.exports = router;


