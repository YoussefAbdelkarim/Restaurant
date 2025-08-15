const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleWares/authMiddleware');

router.get('/',protect, orderController.getOrders);
router.post('/',protect, orderController.createOrder);
router.get('/:id',protect, orderController.getOrderById);
router.put('/:id',protect, orderController.updateOrder);
router.delete('/:id',protect, orderController.deleteOrder);

module.exports = router;