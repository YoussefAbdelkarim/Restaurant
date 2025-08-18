const express = require('express');
const router = express.Router();
const { createPayment, getPayments, deletePayment, updatePaymentStatus } = require('../controllers/paymentsController');
const { protect} = require('../middleWares/authMiddleware');
const allowRoles = require('../middleWares/roleMiddleware');

router.get('/', protect, allowRoles('admin', 'manager', 'accountant'), getPayments);
router.post('/', protect, allowRoles('admin', 'accountant'), createPayment);
router.delete('/:id', protect, allowRoles('admin'), deletePayment);
router.patch('/:id/status', protect, allowRoles('admin', 'accountant'), updatePaymentStatus);
module.exports = router;