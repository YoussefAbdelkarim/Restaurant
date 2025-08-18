const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '1d', 
  });
};

const createUser = async (req, res) => {
  const { name, DOB, phoneNumber, password } = req.body;
  // accept either monthlySalary or salary from client
  const monthlySalary = Number(req.body.monthlySalary ?? req.body.salary ?? 0) || 0;
  let role = req.body.role;

  if (!name || !phoneNumber || !password) {
    return res.status(400).json({ message: 'Please enter all required fields' });
  }

  // validate role to allowed set or default to 'cashier'
  const allowedRoles = ['admin', 'accountant', 'cashier', 'manager', 'co-manager', 'waiter', 'cleaner'];
  if (!role || !allowedRoles.includes(role)) {
    role = 'cashier';
  }

  try {
    const userExists = await User.findOne({ phoneNumber });
    if (userExists) {
      return res.status(400).json({ message: 'Employee with this phone number already exists' });
    }

    const user = await User.create({
      name,
      DOB,
      phoneNumber,
      password,
      role,
      monthlySalary,
    });

    if (user) {
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        token: generateToken(user._id),
        status: user.status,
      });
    }

    return res.status(400).json({ message: 'Invalid employee data.' });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') || 'Validation error' });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Duplicate field value (phone number must be unique).' });
    }
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const loginUser = async (req, res) => {
  const { phoneNumber, password } = req.body;

  if (!phoneNumber || !password) {
    return res.status(400).json({ message: 'Please enter all required fields.' });
  }

  try {
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(401).json({ message: 'Invalid phone number or password.' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'Login forbidden: Inactive account.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid phone number or password.' });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      phoneNumber: user.phoneNumber,
      role: user.role,
      token: generateToken(user._id),
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find(); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Employee not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getUsersByStatus = async (req, res) => {
  const { active } = req.query; // b3ato ya amma  ?active=true aw ?active=false bl api
  if (active === undefined) {
    return res.status(400).json({ message: 'Active status query is required' });
  }

  const isActive = active === 'true'; 
  const users = await User.find({ active: isActive }).select('-password');
  res.json(users);
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!user|| !user.active) return res.status(404).json({ message: 'Employee not found or the Employee is not active any more.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'employee not found.' });
    res.json({ message: 'Employee deactivated.', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createUser,
  loginUser,
  getUsers,
  getUserById,
  getUsersByStatus,
  updateUser,
  deleteUser,
};