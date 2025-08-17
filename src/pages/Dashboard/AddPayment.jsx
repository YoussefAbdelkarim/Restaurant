import React, { useState } from "react";
import { Form, Button, Card, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function AddPayment({ onAddPayment }) {
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState("salary");
  const [formData, setFormData] = useState({
    date: "",
    employeeName: "",
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

  const handleSubmit = (e) => {
    e.preventDefault();

    const newPayment = {
      type: paymentType === "salary" ? "Salary" : "Purchase",
      date: formData.date,
      ...(paymentType === "salary"
        ? {
            employeeName: formData.employeeName,
            amount: formData.amount,
            salaryType: formData.salaryType
          }
        : {
            itemName: formData.itemName,
            quantity: formData.quantity,
            unitPrice: formData.unitPrice,
            amount: formData.amount,
            notes: formData.notes
          })
    };

    onAddPayment(newPayment);
    navigate("/AdminDashboard/payments");
  };

  return (
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
              <Form.Label>Employee Name</Form.Label>
              <Form.Control
                type="text"
                name="employeeName"
                value={formData.employeeName}
                onChange={handleChange}
                required
              />
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

        <Button type="submit" variant="primary">Add Payment</Button>

         <Button variant="success" onClick={() => navigate("/AdminDashboard/payments")}>
                 Cancel
                </Button>
      </Form>
    </Card>
  );
}
