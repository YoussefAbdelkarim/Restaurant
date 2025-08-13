import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ViewEmployees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch employees from database
  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/auth'); // adjust endpoint
      setEmployees(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Delete employee
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await axios.delete(`/api/auth/${id}`);
        setEmployees(employees.filter(employee => employee.id !== id));
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  // Edit employee
  const handleEdit = async (id) => {
    const newName = prompt('Enter new name:');
    if (newName) {
      try {
        const updatedEmployee = { name: newName }; // can add more fields
        await axios.put(`/api/employees/${id}`, updatedEmployee);
        setEmployees(employees.map(employee =>
          employee.id === id ? { ...employee, ...updatedEmployee } : employee
        ));
      } catch (error) {
        console.error('Error updating employee:', error);
      }
    }
  };

  if (loading) return <p>Loading employees...</p>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>Employees List</h2>
        <button 
          onClick={() => navigate('/AdminDashboard/createEmployee')}
          style={{ backgroundColor: 'blue', color: 'white', padding: '10px 20px', border: 'none', cursor: 'pointer' }}
        >
          Add Employee
        </button>
      </div>

      <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th>Name</th>
            <th>DOB</th>
            <th>Phone Number</th>
            <th>Password</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>No employees found</td>
            </tr>
          ) : (
            employees.map(employee => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>{employee.DOB}</td>
                <td>{employee.phoneNumber}</td>
                <td>{employee.password}</td>
                <td>{employee.role}</td>
                <td>
                  <button onClick={() => handleEdit(employee.id)} style={{ marginRight: '10px' }}>
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(employee.id)} 
                    style={{ backgroundColor: 'red', color: 'white' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ViewEmployees;
