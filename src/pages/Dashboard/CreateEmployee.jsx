import React, { useState } from 'react';
import axios from 'axios'; 
import { useNavigate } from 'react-router-dom';
import './CreateEmployee.css';

const CreateEmployee = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    DOB: '',
    phoneNumber: '',
    password: '',
    role: '',
    salary: '' // monthly salary
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please login again.');
        navigate('/login');
        return;
      }

      const payload = {
        ...formData,
        monthlySalary: formData.salary ? Number(formData.salary) : 0,
      };
      const res = await axios.post('/api/auth/create', payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.status === 201 || res.status === 200) {
        alert('User created successfully!');
        setFormData({
          name: '',
          DOB: '',
          phoneNumber: '',
          password: '',
          role: '',
          salary: '' // reset salary field
        });
      } else {
        alert('Error creating user.');
      }
    } catch (err) {
      console.error('Error:', err);
      alert(err.response?.data?.message || 'Something went wrong.');
    }
  };

  return (
    <div className="manage-menu-container create-employee-container">
      <h2 className="manage-menu-title">Create Employee</h2>
      <form onSubmit={handleSubmit} className="create-employee-form">
        <label>
          Name:
          <input 
            type="text" 
            name="name" 
            placeholder="Name" 
            value={formData.name} 
            onChange={handleChange} 
            required 
          />
        </label>

        <label>
          Date of Birth:
          <input 
            type="date" 
            name="DOB" 
            placeholder="Date of Birth" 
            value={formData.DOB} 
            onChange={handleChange} 
          />
        </label>

        <label>
          Phone Number:
          <input 
            type="tel" 
            name="phoneNumber" 
            placeholder="Phone Number" 
            value={formData.phoneNumber} 
            onChange={handleChange} 
            required 
          />
        </label>

        <label>
          Password:
          <input 
            type="password" 
            name="password" 
            placeholder="Password" 
            value={formData.password} 
            onChange={handleChange} 
            required 
          />
        </label>

        <label>
          Role:
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
          >
            <option value="">Select role</option>
            <option value="co-manager">co-manager</option>
            <option value="cashier">cashier</option>
            <option value="waiter">waiter</option>
            <option value="cleaner">cleaner</option>
            <option value="manager">manager</option>
            <option value="accountant">accountant</option>
          </select>
        </label>

        <label>
          Salary:
          <input 
            type="number" 
            name="salary" 
            placeholder="Salary" 
            value={formData.salary} 
            onChange={handleChange} 
            required 
            min="0"
          />
        </label>

        <div className="form-buttons">
          <button type="submit" className="add-item-btn">Create Employee</button>
          <button 
            type="button"
            className="view-employees-btn"
            onClick={() => navigate('/AdminDashboard/viewEmployees')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEmployee;
