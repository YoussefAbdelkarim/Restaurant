import React, { useState, useEffect } from "react";
import { Table, Form, Button, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchClicked, setSearchClicked] = useState(false);

  const navigate = useNavigate();

  // Fetch payments from API
  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please login again.');
        return;
      }

      const response = await fetch('/api/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.status}`);
      }

      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtered payments
  const filteredPayments = payments.filter((p) => {
    if (typeFilter !== "All" && p.type !== typeFilter.toLowerCase()) return false;
    if (dateFilter) {
      const paymentDate = new Date(p.date).toISOString().split('T')[0];
      if (paymentDate !== dateFilter) return false;
    }
    if (searchClicked && searchName) {
      if (p.type === "salary" && !p.employeeName?.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (p.type === "purchase" && !p.itemName?.toLowerCase().includes(searchName.toLowerCase())) return false;
    }
    return true;
  });

  // Calculate totals
  const totalSalary = filteredPayments
    .filter((p) => p.type === "salary")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPurchase = filteredPayments
    .filter((p) => p.type === "purchase")
    .reduce((sum, p) => sum + p.amount, 0);

  const grandTotal = totalSalary + totalPurchase;

  if (loading) {
    return (
      <div className="container">
        <div className="text-center mt-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading payments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger mt-3" role="alert">
          <h4 className="alert-heading">Error Loading Payments</h4>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={fetchPayments}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h3 className="mb-4 fw-bold d-flex justify-content-between align-items-center">
        Payments Management
        <Button variant="success" onClick={() => navigate("/AdminDashboard/addPayment")}>
          + Add Payment
        </Button>
      </h3>

      {/* Filters */}
      <div className="d-flex flex-wrap gap-3 mb-4">
        <Form.Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: "200px" }}
        >
          <option value="All">All Types</option>
          <option value="Salary">Salary</option>
          <option value="Purchase">Purchase</option>
        </Form.Select>

        <Form.Control
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{ width: "200px" }}
        />

        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Search by Name"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            style={{ width: "200px" }}
          />
          <Button onClick={() => setSearchClicked(true)} variant="primary">Search</Button>
          <Button onClick={() => { setSearchName(""); setSearchClicked(false); }} variant="secondary">Clear</Button>
        </div>
      </div>

      {/* Payments Table */}
      <Table bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Details</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredPayments.length > 0 ? (
            filteredPayments.map((p) => (
              <tr key={p._id}>
                <td>{p._id}</td>
                <td><span className="fw-bold">{p.type}</span></td>
                <td>
                  {p.type === "salary" ? (
                    <>Employee: <strong>{p.employeeName || 'Unknown'}</strong></>
                  ) : (
                    <>
                      Item: <strong>{p.itemName || 'Unknown'}</strong> <br />
                      Qty: {p.quantity || 0}, Unit Price: ${p.unitPrice || 0} <br />
                      Notes: {p.notes || 'N/A'}
                    </>
                  )}
                </td>
                <td>${p.amount}</td>
                <td>{new Date(p.date).toLocaleDateString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="text-center text-muted">No payments found</td>
            </tr>
          )}
        </tbody>
      </Table>

      {/* Totals Section */}
      <div className="d-flex gap-3 mt-4 mb-5">
        <Card className="p-3 shadow-sm" style={{ minWidth: "200px" }}>
          <h6 className="text-muted">Total Salary</h6>
          <h5 className="fw-bold text-success">${totalSalary}</h5>
        </Card>
        <Card className="p-3 shadow-sm" style={{ minWidth: "200px" }}>
          <h6 className="text-muted">Total Purchase</h6>
          <h5 className="fw-bold text-primary">${totalPurchase}</h5>
        </Card>
        <Card className="p-3 shadow-sm" style={{ minWidth: "200px" }}>
          <h6 className="text-muted">Grand Total</h6>
          <h5 className="fw-bold text-dark">${grandTotal}</h5>
        </Card>
      </div>
    </div>
  );
}
