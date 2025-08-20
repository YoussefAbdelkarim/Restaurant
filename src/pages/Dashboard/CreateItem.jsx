import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateItem() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('plate');
  const [isAvailable, setIsAvailable] = useState(true);
  const [steps, setSteps] = useState(['']);
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState([{ ingredient: '', quantity: '', unit: '' }]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required.');
      setLoading(false);
      return;
    }
    fetch('/api/ingredients', { headers: { Authorization: `Bearer ${token}` }})
      .then(res => { if (!res.ok) throw new Error('Failed to fetch ingredients'); return res.json(); })
      .then(data => setAllIngredients(data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAddStep = () => setSteps(prev => [...prev, '']);
  const handleStepChange = (idx, val) => {
    const next = [...steps];
    next[idx] = val;
    setSteps(next);
  };
  const removeStep = (idx) => setSteps(prev => prev.filter((_, i) => i !== idx));

  const handleAddIng = () => setIngredients(prev => [...prev, { ingredient: '', quantity: '', unit: '' }]);
  const handleIngChange = (idx, field, val) => {
    const next = [...ingredients];
    next[idx][field] = val;
    // When selecting ingredient id, default unit
    if (field === 'ingredient') {
      const found = allIngredients.find(a => a._id === val);
      if (found) next[idx].unit = found.unit;
    }
    setIngredients(next);
  };
  const removeIng = (idx) => setIngredients(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert('Authentication required.');

    // Validate ingredients
    for (const r of ingredients) {
      if (!r.ingredient || !r.quantity || !r.unit) {
        return alert('Each ingredient must be selected and have quantity and unit');
      }
    }

    const payload = {
      name: name.trim(),
      category,
      price: Number(price || 0),
      isAvailable,
      ingredients: ingredients.map(r => ({
        ingredient: r.ingredient,
        quantity: Number(r.quantity),
        unit: r.unit,
      })),
      steps: steps.filter(s => s && s.trim().length > 0),
      instructions,
    };

    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create item');
      }
      await res.json();
      alert('Item created');
      navigate('/AdminDashboard/menu');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="container p-3">Loading...</div>;
  if (error) return <div className="container p-3" style={{color:'red'}}>Error: {error}</div>;

  return (
    <div className="container p-3">
      <h3>Create Item</h3>
      <form onSubmit={handleSubmit} style={{maxWidth: 700}}>
        <div className="mb-2">
          <label>Name</label>
          <input className="form-control" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="mb-2">
          <label>Price</label>
          <input className="form-control" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
        </div>
        <div className="mb-2">
          <label>Category</label>
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            {['plate','sandwich','drink','burger','pizza','dessert','beverage','fries','spirits','pancakes','cake','juice'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="mb-2 form-check">
          <input id="avail" className="form-check-input" type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} />
          <label className="form-check-label" htmlFor="avail">Available</label>
        </div>

        <div className="mb-3">
          <label>Ingredients</label>
          {ingredients.map((r, idx) => (
            <div key={idx} className="d-flex gap-2 mb-2">
              <select className="form-select" style={{minWidth: 220}} value={r.ingredient} onChange={e => handleIngChange(idx, 'ingredient', e.target.value)} required>
                <option value="">Select ingredient</option>
                {allIngredients.map(ai => (
                  <option key={ai._id} value={ai._id}>{ai.name} ({ai.unit})</option>
                ))}
              </select>
              <input className="form-control" type="number" min="0" placeholder="Qty" value={r.quantity} onChange={e => handleIngChange(idx, 'quantity', e.target.value)} required />
              <input className="form-control" placeholder="Unit" value={r.unit} onChange={e => handleIngChange(idx, 'unit', e.target.value)} required />
              <button type="button" className="btn btn-outline-danger" onClick={() => removeIng(idx)}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn btn-outline-primary" onClick={handleAddIng}>+ Add ingredient</button>
        </div>

        <div className="mb-3">
          <label>Steps (optional)</label>
          {steps.map((s, idx) => (
            <div key={idx} className="d-flex gap-2 mb-2">
              <input className="form-control" value={s} onChange={e => handleStepChange(idx, e.target.value)} placeholder={`Step ${idx+1}`} />
              <button type="button" className="btn btn-outline-danger" onClick={() => removeStep(idx)}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn btn-outline-secondary" onClick={handleAddStep}>+ Add step</button>
        </div>

        <div className="mb-3">
          <label>Instructions (optional)</label>
          <textarea className="form-control" rows={4} value={instructions} onChange={e => setInstructions(e.target.value)} />
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-success">Save</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/AdminDashboard/menu')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}


