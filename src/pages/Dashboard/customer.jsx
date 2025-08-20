import React from "react";

const Customer = () => {
  // Dummy Data
  const customers = [
    {
      id: 1,
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+1 555-123-4567",
      date: "2025-08-10",
      guests: 2,
      comment: "Table near the window, please.",
    },
    {
      id: 2,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane.smith@example.com",
      phone: "+1 555-987-6543",
      date: "2025-08-12",
      guests: 4,
      comment: "Celebrating a birthday 🎉",
    },
    {
      id: 3,
      firstName: "Ali",
      lastName: "Hassan",
      email: "ali.hassan@example.com",
      phone: "+961 70 123 456",
      date: "2025-08-14",
      guests: 3,
      comment: "No peanuts, allergy.",
    },
  ];

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ marginBottom: "20px" }}>Customer Reservations</h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f4f4f4", textAlign: "left" }}>
            <th style={thStyle}>First Name</th>
            <th style={thStyle}>Last Name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Phone</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Guests</th>
            <th style={thStyle}>Comment</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((cust) => (
            <tr key={cust.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={tdStyle}>{cust.firstName}</td>
              <td style={tdStyle}>{cust.lastName}</td>
              <td style={tdStyle}>{cust.email}</td>
              <td style={tdStyle}>{cust.phone}</td>
              <td style={tdStyle}>{cust.date}</td>
              <td style={tdStyle}>{cust.guests}</td>
              <td style={tdStyle}>{cust.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Styling
const thStyle = {
  padding: "12px",
  borderBottom: "2px solid #ddd",
};

const tdStyle = {
  padding: "10px",
};

export default Customer;
