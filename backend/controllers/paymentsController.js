const Payment = require('../models/Payment');
const User = require('../models/User');
const mongoose = require('mongoose');

const createPayment = async (req, res) => {
  try {
    const { type, userId, itemName, quantity, unitPrice, amount, notes } = req.body;

    if (type === 'salary') {
      const employee = await User.findById(userId);
      if (!employee) {
        return res.status(404).json({ message: 'User not found' });
      }

      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const totalThisMonth = await Payment.aggregate([
        {
          $match: {
            type: 'salary',
            user: new mongoose.Types.ObjectId(userId),
            date: { $gte: firstDay, $lte: lastDay }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const alreadyPaid = totalThisMonth.length ? totalThisMonth[0].total : 0;
      const newTotal = alreadyPaid + amount;

      if (newTotal > employee.monthlySalary) {
        return res.status(400).json({
          message: `Payment exceeds monthly salary. Already paid: ${alreadyPaid}, Monthly salary: ${employee.monthlySalary}`
        });
      }

      const payment = await Payment.create({
        type,
        user: userId,
        amount,
        notes
      });

      employee.recievedPayments = newTotal;
      await employee.save();

      return res.status(201).json(payment);
    }

    if (type === 'purchase') {
      const totalAmount = quantity * unitPrice;

      const payment = await Payment.create({
        type,
        itemName,
        quantity,
        unitPrice,
        amount: totalAmount,
        notes,
        user: userId || null 
      });

      return res.status(201).json(payment);
    }

    return res.status(400).json({ message: 'Invalid payment type' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;

    // If no type specified, return all payments
    if (!type) {
      const filter = {};
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const payments = await Payment.find(filter)
        .populate('user', 'name')
        .sort({ date: -1 });

      const formattedPayments = payments.map(payment => {
        const formatted = {
          _id: payment._id,
          type: payment.type,
          amount: payment.amount,
          date: payment.date,
          notes: payment.notes
        };

        if (payment.type === 'salary') {
          formatted.employeeName = payment.user?.name || 'Unknown Employee';
        } else if (payment.type === 'purchase') {
          formatted.itemName = payment.itemName;
          formatted.quantity = payment.quantity;
          formatted.unitPrice = payment.unitPrice;
        }

        return formatted;
      });

      return res.json(formattedPayments);
    }

    if (type === 'salary') {
      const users = await User.find({}, 'name role monthlySalary active recievedPayments')
        .sort({ name: 1 });

      const result = users.map(u => {
        const paid = u.recievedPayments ?? 0;
        const salary = u.monthlySalary ?? 0;

        return {
          userId: u._id,
          name: u.name,
          role: u.role,
          active: u.active,
          monthlySalary: salary,
          totalPaidThisMonth: paid,
          remainingThisMonth: Math.max(salary - paid, 0),
          percentagePaid: salary ? Math.min(Math.round((paid / salary) * 100), 100) : 0
        };
      });

      return res.json(result);
    }

    if (type === 'purchase') {
      const filter = { type: 'purchase' };
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      } else {
        const now = new Date();
        filter.date = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
        };
      }

      const purchases = await Payment.find(filter)
        .select('itemName quantity unitPrice amount date notes')
        .sort({ date: -1 });

      const total = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);

      return res.json({
        total,
        count: purchases.length,
        purchases
      });
    }

    return res.status(400).json({ message: 'Invalid type. Use "salary" or "purchase".' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { createPayment, getPayments };