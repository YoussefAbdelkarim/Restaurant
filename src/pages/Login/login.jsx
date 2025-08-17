import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminLogin() {
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      // Authenticate with the provided credentials
      const response = await axios.post('/api/auth/login', {
        phoneNumber: phoneNumber,
        password: password
      });

      if (response.data.token) {
        // Store the JWT token
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('adminLoggedIn', 'true');
        navigate('/AdminDashboard');
      } else {
        setErrorMsg('Login failed - no token received');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMsg('Login failed. Please check your credentials.');
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleLogin} style={styles.form}>
        <h2>Admin Login</h2>

        {errorMsg && <p style={styles.error}>{errorMsg}</p>}

        <input
          type="tel"
          placeholder="Phone Number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        <button type="submit" style={styles.button}>Login</button>
        
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#666', marginTop: '10px' }}>
          <p>Test Credentials:</p>
          <p>Phone: 1234567890 | Password: password123</p>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh',
    backgroundColor: '#f8f9fa',
  },
  form: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.8rem',
    fontSize: '1rem',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  button: {
    backgroundColor: '#28a745',
    color: 'white',
    padding: '0.8rem',
    fontSize: '1rem',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    fontSize: '0.9rem',
  }
};

export default AdminLogin;
