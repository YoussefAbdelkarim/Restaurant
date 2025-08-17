import React, { useState } from "react";
import { Table, Form, Button, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom"; // <-- import useNavigate

// Dummy data
const dummyPayments = [
  { id: 1, type: "Salary", employeeName: "John Doe", amount: 1200, date: "2025-08-01" },
  { id: 2, type: "Purchase", itemName: "Tomatoes", quantity: 50, unitPrice: 2, amount: 100, notes: "Fresh batch", date: "2025-08-05" },
  { id: 3, type: "Salary", employeeName: "Jane Smith", amount: 1500, date: "2025-08-08" },
  { id: 4, type: "Purchase", itemName: "Cheese", quantity: 20, unitPrice: 5, amount: 100, notes: "Mozzarella", date: "2025-08-10" },
];

export default function Payments() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchClicked, setSearchClicked] = useState(false);

  const navigate = useNavigate(); // <-- initialize navigate

  // Filtered payments
  const filteredPayments = dummyPayments.filter((p) => {
    if (typeFilter !== "All" && p.type !== typeFilter) return false;
    if (dateFilter && p.date !== dateFilter) return false;
    if (searchClicked && searchName) {
      if (p.type === "Salary" && !p.employeeName.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (p.type === "Purchase" && !p.itemName.toLowerCase().includes(searchName.toLowerCase())) return false;
    }
    return true;
  });

  // Calculate totals
  const totalSalary = filteredPayments
    .filter((p) => p.type === "Salary")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPurchase = filteredPayments
    .filter((p) => p.type === "Purchase")
    .reduce((sum, p) => sum + p.amount, 0);

  const grandTotal = totalSalary + totalPurchase;

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
              <tr key={p.id}>
                <td>{p.id}</td>
                <td><span className="fw-bold">{p.type}</span></td>
                <td>
                  {p.type === "Salary" ? (
                    <>Employee: <strong>{p.employeeName}</strong></>
                  ) : (
                    <>
                      Item: <strong>{p.itemName}</strong> <br />
                      Qty: {p.quantity}, Unit Price: ${p.unitPrice} <br />
                      Notes: {p.notes}
                    </>
                  )}
                </td>
                <td>${p.amount}</td>
                <td>{p.date}</td>
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
      <div className="d-flex gap-3 mt-4">
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
