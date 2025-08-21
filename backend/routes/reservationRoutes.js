const express = require('express');
const router = express.Router();
const {
  getReservations,
  getReservationById,
  createReservation,
  updateReservationStatus,
  updateReservation,
  deleteReservation,
  getReservationStats
} = require('../controllers/reservationController');
const { protect } = require('../middleWares/authMiddleware');
const allowRoles = require('../middleWares/roleMiddleware');

// Public route for creating reservations (from contact form)
router.post('/', createReservation);

// Protected routes for dashboard management
router.get('/', protect, allowRoles('admin', 'manager', 'waiter'), getReservations);
router.get('/stats', protect, allowRoles('admin', 'manager'), getReservationStats);
router.get('/:id', protect, allowRoles('admin', 'manager', 'waiter'), getReservationById);
router.patch('/:id/status', protect, allowRoles('admin', 'manager'), updateReservationStatus);
router.put('/:id', protect, allowRoles('admin', 'manager'), updateReservation);
router.delete('/:id', protect, allowRoles('admin'), deleteReservation);

module.exports = router;
