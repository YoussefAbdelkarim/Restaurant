import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from 'react-bootstrap';
import axios from 'axios';
import './Orders.css';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    items: [],
    status: '',
    _id: ''
  });

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Preparing': return 'info';
      case 'Completed': return 'success';
      case 'paid': return 'primary';
      case 'Canceld': return 'danger';
      default: return 'secondary';
    }
  };

  // Fetch all orders from backend
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/orders'); // Replace with your API
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Open modal with order data
  const handleRowClick = (order) => {
    setEditFormData(order);
    setShowEditForm(true);
  };

  // Handle modal input changes
  const handleEditInputChange = (e, index) => {
    const { name, value } = e.target;
    if (name === 'status') {
      setEditFormData({ ...editFormData, status: value });
    } else if (name === 'quantity') {
      const newItems = [...editFormData.items];
      newItems[index].quantity = Number(value);
      setEditFormData({ ...editFormData, items: newItems });
    }
  };

  // Update order in backend
  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/orders/${editFormData._id}`, editFormData);
      setOrders(prevOrders =>
        prevOrders.map(order => (order._id === editFormData._id ? editFormData : order))
      );
      setShowEditForm(false);
      alert('Order updated successfully!');
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  };

  // Optional: delete order
  const handleDelete = async (_id) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await axios.delete(`http://localhost:5000/api/orders/${_id}`);
        setOrders(prevOrders => prevOrders.filter(order => order._id !== _id));
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order');
      }
    }
  };

  // Filter orders by date and/or status
  const handleFilter = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:5000/api/orders?';
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      url = url.endsWith('&') ? url.slice(0, -1) : url;

      const res = await axios.get(url);
      setOrders(res.data);
    } catch (error) {
      console.error(error);
      alert('Error fetching filtered orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="orders-page"><p>Loading orders...</p></div>;

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h2 className="orders-title">Orders</h2>
        <button className="add-order-btn" onClick={() => navigate('/AdminDashboard/addOrder')}>
          ➕ Add Order
        </button>
      </div>

      {/* Filters */}
      <div className="date-filter" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Payment Statuses</option>
          <option value="Pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="Canceld">Canceld</option>
        </select>
        <button onClick={handleFilter} className="btn btn-filter">Filter</button>
      </div>

      {/* Orders Table */}
      <table className="orders-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Items</th>
            <th>Total Price ($)</th>
            <th>Payment Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.length > 0 ? orders.map((order, index) => (
            <tr key={order._id} className="clickable-row">
              <td>{index + 1}</td>
              <td>
                {order.items.map((item, i) => (
                  <div key={i}>{item.name} <span className="text-muted">x{item.quantity}</span></div>
                ))}
              </td>
              <td>${order.totalPrice}</td>
              <td><Badge bg={getStatusVariant(order.status)}>{order.status}</Badge></td>
              <td>
                <button onClick={() => handleRowClick(order)} className="edit">Edit</button>
                <button onClick={() => handleDelete(order._id)} className="delete">Delete</button>
              </td>
            </tr>
          )) : (
            <tr><td colSpan="5">No orders found</td></tr>
          )}
        </tbody>
      </table>

      {/* Edit Order Modal */}
      {showEditForm && (
        <div className="modal-back" onClick={() => setShowEditForm(false)}>
          <form className="modal-cont" onClick={(e) => e.stopPropagation()} onSubmit={handleEditItemSubmit}>
            <div className="modal-head">
              <h2>Edit Order</h2>
              <button type="button" className="modal-close-btn" onClick={() => setShowEditForm(false)}>&times;</button>
            </div>

            {editFormData.items.map((item, index) => (
              <div key={index} style={{ marginBottom: '10px' }}>
                <label>Item: <strong>{item.name}</strong></label>
                <input type="number" name="quantity" value={item.quantity} min="1"
                  onChange={(e) => handleEditInputChange(e, index)}
                  style={{ width: '60px', marginLeft: '10px' }}
                />
              </div>
            ))}

            <label>Status:
              <select name="status" value={editFormData.status} onChange={handleEditInputChange} style={{ marginLeft: '10px' }}>
                <option value="Pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="Canceld">Canceld</option>
              </select>
            </label>

            <div className="modal-buttons" style={{ marginTop: '15px' }}>
              <button type="submit" style={{ backgroundColor: 'green', color: 'white', marginRight: '10px' }}>Save</button>
              <button type="button" onClick={() => setShowEditForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 
