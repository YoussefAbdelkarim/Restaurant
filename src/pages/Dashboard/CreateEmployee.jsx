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
    salary: '' // added salary field
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/create', formData);
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
          <input 
            type="text" 
            name="role" 
            placeholder="Role" 
            value={formData.role} 
            onChange={handleChange} 
          />
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
