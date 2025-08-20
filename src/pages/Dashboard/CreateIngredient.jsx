import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateIngredient() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    currentStock: 0,
    unit: '',
    pricePerUnit: 0,
    alertThreshold: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Authentication required.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          currentStock: Number(form.currentStock || 0),
          unit: form.unit,
          pricePerUnit: Number(form.pricePerUnit || 0),
          alertThreshold: Number(form.alertThreshold || 0),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to add ingredient');
      }

      await res.json();
      alert('Ingredient added');
      navigate('/AdminDashboard/inventory');
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Add New Ingredient</h3>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate('/AdminDashboard/inventory')}
        >
          ← Back to Inventory
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 720 }}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Ingredient Name</label>
            <input
              className="form-control"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Current Stock</label>
            <input
              className="form-control"
              type="number"
              min="0"
              value={form.currentStock}
              onChange={e => handleChange('currentStock', e.target.value)}
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Unit</label>
            <select
              className="form-select"
              value={form.unit}
              onChange={e => handleChange('unit', e.target.value)}
              required
            >
              <option value="">Select Unit</option>
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="ml">Milliliters (ml)</option>
              <option value="l">Liters (l)</option>
              <option value="piece">Piece</option>
              <option value="unit">Unit</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Price per Unit</label>
            <input
              className="form-control"
              type="number"
              min="0"
              step="0.01"
              value={form.pricePerUnit}
              onChange={e => handleChange('pricePerUnit', e.target.value)}
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Alert Threshold</label>
            <input
              className="form-control"
              type="number"
              min="1"
              value={form.alertThreshold}
              onChange={e => handleChange('alertThreshold', e.target.value)}
              required
            />
          </div>
          
        </div>

        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-success" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/AdminDashboard/inventory')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}


