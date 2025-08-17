import React, { useState, useEffect } from "react";
import { Form, Button, Card, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function AddPayment() {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState("salary");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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

    fetchUsers();
  }, []);
  const [formData, setFormData] = useState({
    date: "",
    userId: "",
    amount: "",
    salaryType: "",
    itemName: "",
    quantity: "",
    unitPrice: "",
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
        // For purchase payments
        paymentData.itemName = formData.itemName;
        paymentData.quantity = parseInt(formData.quantity);
        paymentData.unitPrice = parseFloat(formData.unitPrice);
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
            onChange={(e) => setPaymentType(e.target.value)}
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
            <Form.Group className="mb-3">
              <Form.Label>Item Name</Form.Label>
              <Form.Control
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Quantity</Form.Label>
                  <Form.Control
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Unit Price</Form.Label>
                  <Form.Control
                    type="number"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
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
    </div>
  );
}
