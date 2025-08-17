const Order = require('../models/Order');
const Item = require('../models/Item');
const InventoryService = require('../services/inventoryService');

exports.createOrder = async (req, res) => {
  try {
    const { items, status } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }

    let totalPrice = 0;
    const orderItems = [];

    // Process each item and calculate total price
    for (const ordered of items) {
      let itemData;
      
      // Try to find item by ID first
      if (ordered.item) {
        itemData = await Item.findById(ordered.item);
      }
      
      // If not found by ID, try to find by name
      if (!itemData && ordered.name) {
        itemData = await Item.findOne({ 
          name: { $regex: new RegExp(ordered.name, 'i') } 
        });
      }

      // If still no item found, we'll create a virtual item for pricing
      if (!itemData) {
        // Use a default price or get from recipe if available
        const defaultPrice = ordered.priceAtSale || 0;
        totalPrice += defaultPrice * ordered.quantity;
        
        orderItems.push({
          item: null, // No item ID since it doesn't exist
          name: ordered.name,
          quantity: ordered.quantity,
          priceAtSale: defaultPrice
        });
      } else {
        const priceAtSale = itemData.price;
        totalPrice += priceAtSale * ordered.quantity;

        orderItems.push({
          item: itemData._id,
          name: itemData.name,
          quantity: ordered.quantity,
          priceAtSale
        });
      }
    }

    // Process inventory before creating the order
    const inventoryResult = await InventoryService.processOrderInventory(orderItems);
    
    if (!inventoryResult.success) {
      return res.status(400).json({ 
        message: 'Cannot fulfill order due to insufficient inventory',
        errors: inventoryResult.errors
      });
    }

    const newOrder = new Order({
      items: orderItems,
      totalPrice,
      status: status || 'paid'
    });

    const savedOrder = await newOrder.save();
    
    // Return order with inventory processing details
    res.status(201).json({
      order: savedOrder,
      inventory: {
        processed: inventoryResult.processedItems,
        warnings: inventoryResult.warnings
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const orders = await Order.find(filter).sort({ date: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (status) {
      order.status = status;
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await order.deleteOne();
    res.json({ message: 'Order deleted' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};