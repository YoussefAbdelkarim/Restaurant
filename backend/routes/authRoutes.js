const express = require('express');
const router = express.Router();
const { createUser, loginUser, getUsers, getUserById,getUsersByStatus, updateUser, deleteUser } = require('../controllers/authController');
const { protect } = require('../middleWares/authMiddleware');
const allowRoles = require('../middleWares/roleMiddleware');


router.get('/', protect, allowRoles('admin'), getUsers);               
router.get('/:id', protect, allowRoles('admin'), getUserById);  
router.get('/status', protect, allowRoles('admin'), getUsersByStatus);
router.post('/create', protect,allowRoles('admin'), createUser);     
router.put('/:id', protect, allowRoles('admin'), updateUser);         
router.delete('/:id', protect, allowRoles('admin'), deleteUser);      


router.post('/login', loginUser);

module.exports = router;
    