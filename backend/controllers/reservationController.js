const Reservation = require('../models/Reservation');

// Get all reservations with optional filtering
exports.getReservations = async (req, res) => {
  try {
    const { startDate, endDate, status, email } = req.query;
    let filter = {};

    // Date range filter
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Email filter
    if (email) {
      filter.emailAddress = { $regex: new RegExp(email, 'i') };
    }

    const reservations = await Reservation.find(filter)
      .sort({ date: 1, createdAt: -1 });

    res.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get reservation by ID
exports.getReservationById = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }
    res.json(reservation);
  } catch (error) {
    console.error('Error fetching reservation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new reservation
exports.createReservation = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phoneNumber,
      emailAddress,
      date,
      numberOfGuests,
      comments
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !emailAddress || !date || !numberOfGuests) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Validate date is in the future
    const reservationDate = new Date(date);
    const now = new Date();
    if (reservationDate <= now) {
      return res.status(400).json({ message: 'Reservation date must be in the future' });
    }

    // Validate number of guests
    if (numberOfGuests < 1) {
      return res.status(400).json({ message: 'Number of guests must be at least 1' });
    }

    const newReservation = new Reservation({
      firstName,
      lastName,
      phoneNumber,
      emailAddress,
      date: reservationDate,
      numberOfGuests,
      comments: comments || ''
    });

    const savedReservation = await newReservation.save();
    res.status(201).json(savedReservation);
  } catch (error) {
    console.error('Error creating reservation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update reservation status
exports.updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    const reservation = await Reservation.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update reservation details
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove status from update data if present (use separate endpoint for status)
    delete updateData.status;

    const reservation = await Reservation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json(reservation);
  } catch (error) {
    console.error('Error updating reservation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete reservation
exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found' });
    }

    res.json({ message: 'Reservation deleted successfully' });
  } catch (error) {
    console.error('Error deleting reservation:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get reservation statistics
exports.getReservationStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};

    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Reservation.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalGuests: { $sum: '$numberOfGuests' }
        }
      }
    ]);

    const totalReservations = await Reservation.countDocuments(dateFilter);
    const totalGuests = await Reservation.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$numberOfGuests' } } }
    ]);

    res.json({
      totalReservations,
      totalGuests: totalGuests[0]?.total || 0,
      byStatus: stats
    });
  } catch (error) {
    console.error('Error fetching reservation stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
