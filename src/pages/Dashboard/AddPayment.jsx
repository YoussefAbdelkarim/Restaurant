import React, { useState, useEffect } from "react";
import { Form, Button, Card, Row, Col, Modal } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";

export default function AddPayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentType, setPaymentType] = useState("salary");
  const [users, setUsers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [newIngredient, setNewIngredient] = useState({ name: '', unit: '', currentStock: 0, alertThreshold: 5, pricePerUnit: 0 });

  // Initialize from navigation state (e.g., Restock button from Inventory)
  useEffect(() => {
    const state = location.state || {};
    if (state.initPaymentType === 'purchase') {
      setPaymentType('purchase');
      setFormData(prev => {
        const baseLines = (prev.purchaseIngredients && prev.purchaseIngredients.length)
          ? prev.purchaseIngredients
          : [{ ingredientId: '', quantity: '', unitPrice: '' }];
        if (state.preselectIngredientId) {
          baseLines[0] = { ...baseLines[0], ingredientId: state.preselectIngredientId };
        }
        return { ...prev, purchaseIngredients: baseLines };
      });
    }
  }, [location.state]);

  // Fetch users for salary payments
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Authentication required. Please login again.');
          return;
        }

        const response = await fetch('/api/auth', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch users: ${response.status}`);
        }

        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        alert(`Error fetching users: ${error.message}`);
      }
    };

    const fetchIngredients = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/ingredients', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const list = await res.json();
          setIngredients(list);
        }
      } catch (err) {
        console.error('Error fetching ingredients:', err);
      }
    };

    fetchUsers();
    fetchIngredients();
  }, []);
  const [formData, setFormData] = useState({
    date: "",
    userId: "",
    amount: "",
    salaryType: "",
    // purchase legacy fields retained for compatibility
    itemName: "",
    quantity: "",
    unitPrice: "",
    // new multi-ingredient purchase
    purchaseIngredients: [
      // { ingredientId: '', quantity: '', unitPrice: '' }
    ],
    notes: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (paymentType === "purchase" && (name === "quantity" || name === "unitPrice")) {
      const qty = name === "quantity" ? value : formData.quantity;
      const price = name === "unitPrice" ? value : formData.unitPrice;
      const amount = qty && price ? parseFloat(qty) * parseFloat(price) : "";
      setFormData({ ...formData, [name]: value, amount });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addPurchaseLine = () => {
    setFormData(prev => ({
      ...prev,
      purchaseIngredients: [...prev.purchaseIngredients, { ingredientId: '', quantity: '', unitPrice: '' }]
    }));
  };

  const removePurchaseLine = (index) => {
    setFormData(prev => ({
      ...prev,
      purchaseIngredients: prev.purchaseIngredients.filter((_, i) => i !== index)
    }));
  };

  const handlePurchaseLineChange = (index, field, value) => {
    setFormData(prev => {
      const next = [...prev.purchaseIngredients];
      next[index] = { ...next[index], [field]: value };
      // recalc amount as sum of lines
      const total = next.reduce((sum, line) => {
        const q = parseFloat(line.quantity);
        const p = parseFloat(line.unitPrice);
        return sum + (isNaN(q) || isNaN(p) ? 0 : q * p);
      }, 0);
      return { ...prev, purchaseIngredients: next, amount: total ? Number(total.toFixed(2)) : '' };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const paymentData = {
        type: paymentType,
        date: formData.date,
        amount: parseFloat(formData.amount),
        notes: formData.notes || ''
      };

      if (paymentType === "salary") {
        // For salary payments, we need the userId
        paymentData.userId = formData.userId;
        paymentData.salaryType = formData.salaryType;
      } else {
        // For purchase payments (multi-ingredient)
        if (formData.purchaseIngredients && formData.purchaseIngredients.length) {
          paymentData.ingredients = formData.purchaseIngredients
            .filter(l => l.ingredientId && l.quantity && l.unitPrice)
            .map(l => ({
              ingredientId: l.ingredientId,
              quantity: parseFloat(l.quantity),
              unitPrice: parseFloat(l.unitPrice)
            }));
        } else {
          // fallback legacy fields if user used old inputs
          paymentData.itemName = formData.itemName;
          paymentData.quantity = parseInt(formData.quantity);
          paymentData.unitPrice = parseFloat(formData.unitPrice);
        }
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to add payment: ${response.status}`);
      }

      alert('Payment added successfully!');
      navigate("/AdminDashboard/payments");
    } catch (error) {
      console.error('Error adding payment:', error);
      alert(`Error adding payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4 mb-5">
      <Card className="p-4 shadow rounded-3">
      <h3 className="mb-4">Add Payment</h3>
      <Form onSubmit={handleSubmit}>
        {/* Payment Type */}
        <Form.Group className="mb-3">
          <Form.Label>Payment Type</Form.Label>
          <Form.Select
            value={paymentType}
            onChange={(e) => {
              const val = e.target.value;
              setPaymentType(val);
              if (val === 'purchase' && formData.purchaseIngredients.length === 0) {
                setFormData(prev => ({ ...prev, purchaseIngredients: [{ ingredientId: '', quantity: '', unitPrice: '' }] }));
              }
            }}
          >
            <option value="salary">Salary</option>
            <option value="purchase">Purchase</option>
          </Form.Select>
        </Form.Group>

        {/* Common: Date */}
        <Form.Group className="mb-3">
          <Form.Label>Date</Form.Label>
          <Form.Control
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </Form.Group>

        {/* Salary Fields */}
        {paymentType === "salary" && (
          <>
            <Form.Group className="mb-3">
              <Form.Label>Employee</Form.Label>
              <Form.Select
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                required
              >
                <option value="">Select Employee</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.name} - {user.role}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Amount</Form.Label>
                  <Form.Control
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Control
                    type="text"
                    name="salaryType"
                    value={formData.salaryType}
                    onChange={handleChange}
                    placeholder="Cash, Bank Transfer, etc."
                  />
                </Form.Group>
              </Col>
            </Row>
          </>
        )}

        {/* Purchase Fields */}
        {paymentType === "purchase" && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Form.Label className="mb-0">Ingredients (select existing)</Form.Label>
              <Button variant="success" size="sm" onClick={() => setShowAddIngredient(true)}>
                Add Ingredient
              </Button>
            </div>
            <div className="text-muted mb-3">
              If the ingredient you want is not listed, click "Add Ingredient" to create it, then come back and select it.
            </div>
            {formData.purchaseIngredients.map((line, idx) => (
              <Row className="align-items-end" key={idx}>
                <Col md={5} className="mb-3">
                  <Form.Label>Ingredient</Form.Label>
                  <Form.Select
                    value={line.ingredientId}
                    onChange={(e) => handlePurchaseLineChange(idx, 'ingredientId', e.target.value)}
                    required
                  >
                    <option value="">Select ingredient</option>
                    {ingredients.map(ing => (
                      <option key={ing._id} value={ing._id}>
                        {ing.name} ({ing.unit}) - Stock: {ing.currentStock}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={2} className="mb-3">
                  <Form.Label>Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => handlePurchaseLineChange(idx, 'quantity', e.target.value)}
                    required
                  />
                </Col>
                <Col md={3} className="mb-3">
                  <Form.Label>Unit Price</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => handlePurchaseLineChange(idx, 'unitPrice', e.target.value)}
                    required
                  />
                </Col>
                <Col md={2} className="mb-3">
                  <Button variant="outline-danger" onClick={() => removePurchaseLine(idx)}>
                    Remove
                  </Button>
                </Col>
              </Row>
            ))}
            <div className="mb-3">
              <Button variant="outline-primary" onClick={addPurchaseLine}>+ Add Ingredient Line</Button>
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Total Amount</Form.Label>
              <Form.Control type="number" name="amount" value={formData.amount} readOnly />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
              />
            </Form.Group>
          </>
        )}

        <div className="d-flex gap-2">
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading}
          >
            {loading ? 'Adding Payment...' : 'Add Payment'}
          </Button>

          <Button 
            variant="secondary" 
            onClick={() => navigate("/AdminDashboard/payments")}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </Form>
    </Card>
    {/* Add Ingredient Modal */}
    <Modal show={showAddIngredient} onHide={() => setShowAddIngredient(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Add New Ingredient</Modal.Title>
      </Modal.Header>
      <Form onSubmit={async (e) => {
        e.preventDefault();
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            alert('Authentication required. Please login again.');
            return;
          }
          const res = await fetch('/api/ingredients', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newIngredient)
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to add ingredient');
          }
          const added = await res.json();
          setIngredients(prev => [...prev, added]);
          setNewIngredient({ name: '', unit: '', currentStock: 0, alertThreshold: 5, pricePerUnit: 0 });
          setShowAddIngredient(false);
          alert(`Successfully added ingredient: ${added.name}`);
        } catch (err) {
          console.error(err);
          alert(err.message);
        }
      }}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Ingredient Name</Form.Label>
            <Form.Control
              type="text"
              value={newIngredient.name}
              onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Current Stock</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={newIngredient.currentStock}
              onChange={(e) => setNewIngredient({ ...newIngredient, currentStock: parseFloat(e.target.value) })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Price per Unit</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={newIngredient.pricePerUnit}
              onChange={(e) => setNewIngredient({ ...newIngredient, pricePerUnit: parseFloat(e.target.value) })}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Unit</Form.Label>
            <Form.Select
              value={newIngredient.unit}
              onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
              required
            >
              <option value="">Select Unit</option>
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="ml">Milliliters (ml)</option>
              <option value="l">Liters (l)</option>
              <option value="piece">Piece</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Alert Threshold</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={newIngredient.alertThreshold}
              onChange={(e) => setNewIngredient({ ...newIngredient, alertThreshold: parseFloat(e.target.value) })}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddIngredient(false)}>Cancel</Button>
          <Button variant="success" type="submit">Add Ingredient</Button>
        </Modal.Footer>
      </Form>
    </Modal>
    </div>
  );
}
