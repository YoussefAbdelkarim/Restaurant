# 🍽️ Reservation System Documentation

## Overview
The reservation system has been successfully integrated into the restaurant management dashboard. This system allows customers to make reservations through the contact form and enables staff to manage these reservations through the admin dashboard.

## 🚀 Features Added

### Backend Components
1. **Reservation Model** (`backend/models/Reservation.js`)
   - Stores customer information (name, email, phone)
   - Reservation details (date, number of guests, comments)
   - Status tracking (pending, confirmed, cancelled, completed)
   - Timestamps and indexing for efficient queries

2. **Reservation Controller** (`backend/controllers/reservationController.js`)
   - CRUD operations for reservations
   - Status management
   - Filtering and search capabilities
   - Statistics and analytics

3. **Reservation Routes** (`backend/routes/reservationRoutes.js`)
   - Public endpoint for creating reservations
   - Protected endpoints for dashboard management
   - Role-based access control

### Frontend Components
1. **Reservations Dashboard** (`src/pages/Dashboard/Reservations.jsx`)
   - Complete reservation management interface
   - Real-time statistics and filtering
   - Status updates and deletion capabilities
   - Responsive design with Bootstrap

2. **Updated Contact Form** (`src/components/ContactForm/ContactForm.jsx`)
   - Now saves reservations to database
   - Error handling and loading states
   - Success confirmation modal

## 📊 Dashboard Features

### Statistics Overview
- Total reservations count
- Total guests count
- Breakdown by status (pending, confirmed, cancelled, completed)

### Filtering Capabilities
- Date range filtering
- Status filtering
- Email search
- Clear filters option

### Management Actions
- View reservation details
- Update reservation status
- Delete reservations
- Export capabilities (ready for future implementation)

## 🔧 API Endpoints

### Public Endpoints
- `POST /api/reservations` - Create new reservation

### Protected Endpoints (Admin/Manager/Waiter)
- `GET /api/reservations` - Get all reservations with filtering
- `GET /api/reservations/:id` - Get specific reservation
- `PATCH /api/reservations/:id/status` - Update reservation status
- `PUT /api/reservations/:id` - Update reservation details
- `DELETE /api/reservations/:id` - Delete reservation (Admin only)
- `GET /api/reservations/stats` - Get reservation statistics

## 🎯 Usage Instructions

### For Customers
1. Navigate to the Contact page
2. Fill out the reservation form with:
   - First and last name
   - Phone number
   - Email address
   - Preferred date and time
   - Number of guests
   - Optional comments
3. Submit the form
4. Receive confirmation modal

### For Staff
1. Login to the admin dashboard
2. Navigate to "Reservations" in the sidebar
3. View all reservations with real-time statistics
4. Use filters to find specific reservations
5. Click "Edit" to update status or "Delete" to remove
6. Monitor reservation trends and capacity

## 🔒 Security & Permissions

### Role-Based Access
- **Admin**: Full access to all reservation operations
- **Manager**: Can view, update status, and manage reservations
- **Waiter**: Can view reservations for customer service
- **Other roles**: No access to reservation management

### Data Validation
- Required field validation
- Date validation (must be in future)
- Email format validation
- Phone number validation
- Guest count validation (minimum 1)

## 📈 Database Schema

```javascript
{
  firstName: String (required),
  lastName: String (required),
  phoneNumber: String (required),
  emailAddress: String (required, lowercase),
  date: Date (required, future date),
  numberOfGuests: Number (required, min: 1),
  comments: String (optional),
  status: String (enum: ['pending', 'confirmed', 'cancelled', 'completed']),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

## 🚀 Getting Started

1. **Start the backend server:**
   ```bash
   npm run start:server
   ```

2. **Start the frontend:**
   ```bash
   npm start
   ```

3. **Access the dashboard:**
   - Login with admin credentials
   - Navigate to "Reservations" in the sidebar

## 🔄 Integration Points

### Existing Systems
- **Contact Form**: Now saves to database instead of just showing modal
- **Dashboard Navigation**: Added "Reservations" menu item
- **Authentication**: Uses existing JWT token system
- **Role Management**: Integrates with existing role-based access

### Future Enhancements
- Email notifications for reservation confirmations
- Calendar view for reservations
- Table management integration
- Customer history tracking
- Automated reminder system

## 🐛 Troubleshooting

### Common Issues
1. **Reservation not saving**: Check if backend server is running
2. **Authentication errors**: Ensure user is logged in with proper role
3. **Date validation errors**: Ensure reservation date is in the future
4. **Database connection**: Verify MongoDB connection in backend

### Error Messages
- "Reservation date must be in the future" - Date validation failed
- "All required fields must be provided" - Missing required information
- "Authentication required" - User not logged in or token expired
- "Valid status is required" - Invalid status value provided

## 📝 Notes
- The reservation system is fully integrated and ready for production use
- All existing functionality remains unchanged
- The system is designed to be scalable and maintainable
- Role-based access ensures data security
- Real-time updates provide immediate feedback to users
