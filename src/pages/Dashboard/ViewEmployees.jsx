import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ViewEmployees.css';

const ViewEmployees = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    _id: '',
    name: '',
    DOB: '',
    phoneNumber: '',
    password: '',
    role: '',
    salary: ''
  });

  // Fetch employees from backend
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('Authentication required. Please login again.');
          navigate('/login');
          return;
        }
        const response = await axios.get('/api/auth', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmployees(response.data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };
    fetchEmployees();
  }, []);

  // Open edit form
  const handleEdit = (employee) => {
    setEditFormData({
      _id: employee._id,
      name: employee.name || '',
      DOB: employee.DOB ? employee.DOB.split('T')[0] : '',
      phoneNumber: employee.phoneNumber || '',
      role: employee.role || '',
      salary: employee.monthlySalary ?? ''
    });
    setShowEditForm(true);
  };

  // Handle input change in edit form
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  // Submit edited employee to backend
  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = { ...editFormData };
      delete payload.password; // do not send password here
      const { data } = await axios.put(`/api/auth/${editFormData._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(prev => prev.map(emp => (emp._id === editFormData._id ? data : emp)));
      setShowEditForm(false);
    } catch (error) {
      console.error('Error updating employee:', error);
    }
  };

  // Delete employee
  const handleDelete = async (_id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/auth/${_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // reflect deactivation (active=false) by either removing from list or updating flag
        setEmployees(prev => prev.filter(emp => emp._id !== _id));
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  return (
    <div className="manage-menu-container">
      <div className="top-bar">
        <h2 className="manage-menu-title">Employees List</h2>
        <button 
          onClick={() => navigate('/AdminDashboard/createEmployee')}
          className="add-item-btn"
        >
          + Add Employee
        </button>
      </div>

      <table className="employees-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>DOB</th>
            <th>Phone Number</th>
            <th>Role</th>
            <th>Salary</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.length > 0 ? employees.map(employee => (
            <tr key={employee._id}>
              <td>{employee.name}</td>
              <td>{employee.DOB ? new Date(employee.DOB).toLocaleDateString() : ''}</td>
              <td>{employee.phoneNumber}</td>
              <td>{employee.role}</td>
              <td>{employee.monthlySalary ?? ''}</td>
              <td className="dish-buttons">
                <button onClick={() => handleEdit(employee)} className="edit">Edit</button>
                <button onClick={() => handleDelete(employee._id)} className="delete">Delete</button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>No employees found</td>
            </tr>
          )}
        </tbody>
      </table>

      {showEditForm && (
        <div className="modal-back" onClick={() => setShowEditForm(false)}>
          <form
            className="modal-cont"
            onClick={e => e.stopPropagation()}
            onSubmit={handleEditItemSubmit}
          >
            <div className="modal-head">
              <h2 style={{color: 'green'}}>Edit Employee</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowEditForm(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <label>
              Name:
              <input
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleEditInputChange}
                required
                autoFocus
              />
            </label>

            <label>
              Date of Birth:
              <input
                type="date"
                name="DOB"
                value={editFormData.DOB}
                onChange={handleEditInputChange}
                required
              />
            </label>

            <label>
              Phone Number:
              <input
                type="text"
                name="phoneNumber"
                value={editFormData.phoneNumber}
                onChange={handleEditInputChange}
                required
              />
            </label>

            {/* Remove password edit from here to avoid accidental resets */}

            <label>
              Role:
              <select name="role" value={editFormData.role} onChange={handleEditInputChange} required>
                <option value="">Select role</option>
                <option value="co-manager">co-manager</option>
                <option value="cashier">cashier</option>
                <option value="waiter">waiter</option>
                <option value="cleaner">cleaner</option>
                <option value="manager">manager</option>
                <option value="accountant">accountant</option>
              </select>
            </label>

            <div className="modal-buttons">
              <button type="submit" style={{ backgroundColor: 'green', color: 'white' }}>
                Save
              </button>
              <button type="button" onClick={() => setShowEditForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ViewEmployees;
