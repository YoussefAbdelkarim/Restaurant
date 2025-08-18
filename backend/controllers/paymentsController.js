const Payment = require('../models/Payment');
const User = require('../models/User');
const mongoose = require('mongoose');

const createPayment = async (req, res) => {
  try {
    const { type, userId, itemName, quantity, unitPrice, amount, notes, ingredients } = req.body;

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
      // New multi-ingredient purchase flow
      if (Array.isArray(ingredients) && ingredients.length > 0) {
        // Validate and enrich ingredients
        const enriched = [];
        let totalAmount = 0;
        const Ingredient = require('../models/Ingredient');
        const OldIngredient = require('../models/OldIngredient');
        const snapshots = [];
        for (const line of ingredients) {
          const { ingredientId, quantity: lineQty, unitPrice: linePrice } = line || {};
          if (!ingredientId || !lineQty || !linePrice) {
            return res.status(400).json({ message: 'Each ingredient must include ingredientId, quantity and unitPrice' });
          }

          const ingDoc = await Ingredient.findById(ingredientId);
          if (!ingDoc) {
            return res.status(404).json({ message: `Ingredient not found: ${ingredientId}` });
          }

          const lineAmount = Number(lineQty) * Number(linePrice);
          const oldUnitPrice = Number(ingDoc.pricePerUnit || 0);
          totalAmount += lineAmount;
          enriched.push({
            ingredient: ingDoc._id,
            name: ingDoc.name,
            unit: ingDoc.unit,
            quantity: Number(lineQty),
            unitPrice: Number(linePrice),
            amount: lineAmount
          });

          // Prepare snapshot payload only if ingredient had a non-zero existing unit price
          if (oldUnitPrice > 0) {
            snapshots.push({
              originalIngredient: ingDoc._id,
              name: ingDoc.name,
              unit: ingDoc.unit,
              currentStock: ingDoc.currentStock,
              alertThreshold: ingDoc.alertThreshold,
              purchasedQuantity: Number(lineQty),
              purchasedUnitPrice: oldUnitPrice,
              amount: Number(lineQty) * oldUnitPrice,
            });
          }
        }

        // Insert snapshots first to guarantee they capture the old state
        let insertedSnapshots = [];
        if (snapshots.length) {
          insertedSnapshots = await OldIngredient.insertMany(snapshots, { ordered: true });
        }

        // Create payment document
        const payment = await Payment.create({
          type,
          ingredients: enriched,
          amount: totalAmount,
          notes,
          user: userId || null
        });

        // Update stocks for each ingredient (add quantities) and update analytics
        for (const line of enriched) {
          await Ingredient.findByIdAndUpdate(
            line.ingredient,
            {
              $inc: {
                currentStock: line.quantity,
                totalPurchasedQuantity: line.quantity,
                totalPurchasedAmount: line.amount,
              },
              $set: {
                lastPurchaseUnitPrice: line.unitPrice,
                pricePerUnit: line.unitPrice,
              }
            },
            { new: true }
          );
        }

        // Attach payment id to the snapshots we just inserted
        if (insertedSnapshots.length) {
          await OldIngredient.updateMany(
            { _id: { $in: insertedSnapshots.map(doc => doc._id) } },
            { $set: { payment: payment._id } }
          );
        }

        return res.status(201).json(payment);
      }

      // Legacy single-item purchase flow (backward compatibility)
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
          notes: payment.notes,
          status: payment.status
        };

        if (payment.type === 'salary') {
          formatted.employeeName = payment.user?.name || 'Unknown Employee';
        } else if (payment.type === 'purchase') {
          if (payment.ingredients && payment.ingredients.length) {
            formatted.ingredients = payment.ingredients.map(i => ({
              name: i.name,
              unit: i.unit,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              amount: i.amount
            }));
          } else {
            // legacy
            formatted.itemName = payment.itemName;
            formatted.quantity = payment.quantity;
            formatted.unitPrice = payment.unitPrice;
          }
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
        .select('itemName quantity unitPrice ingredients amount date notes')
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

const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    await Payment.findByIdAndDelete(id);
    
    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'paid'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use "pending" or "paid"' });
    }

    const payment = await Payment.findByIdAndUpdate(
      id, 
      { status }, 
      { new: true }
    ).populate('user', 'name');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const formattedPayment = {
      _id: payment._id,
      type: payment.type,
      amount: payment.amount,
      date: payment.date,
      notes: payment.notes,
      status: payment.status
    };

    if (payment.type === 'salary') {
      formattedPayment.employeeName = payment.user?.name || 'Unknown Employee';
    } else if (payment.type === 'purchase') {
      formattedPayment.itemName = payment.itemName;
      formattedPayment.quantity = payment.quantity;
      formattedPayment.unitPrice = payment.unitPrice;
    }

    res.json(formattedPayment);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { createPayment, getPayments, deletePayment, updatePaymentStatus };