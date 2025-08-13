import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import navigation hook

const AddOrder = () => {
  const navigate = useNavigate(); // Create navigate function

  const [form, setForm] = useState({
    customerName: "",
    contact: "",
    items: [{ name: "", qty: 1, price: 0 }],
  });

  const handleChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    setForm({ ...form, items: newItems });
  };

  const handleAddItem = () => {
    setForm({
      ...form,
      items: [...form.items, { name: "", qty: 1, price: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const total = form.items.reduce(
    (sum, item) => sum + Number(item.qty) * Number(item.price),
    0
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Order Data:", form);
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-4">Add Order</h3>

      <form onSubmit={handleSubmit}>
        {/* Customer Info */}
        <div className="mb-3">
          <label className="form-label">Customer Name</label>
          <input
            type="text"
            className="form-control"
            value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            placeholder="Enter customer name"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Contact</label>
          <input
            type="text"
            className="form-control"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="Enter contact number"
            required
          />
        </div>

        {/* Order Items Table */}
        <h5 className="mb-3">Order Items</h5>
        <div className="table-responsive">
          <table className="table table-bordered align-middle text-center">
            <thead className="table-dark">
              <tr>
                <th>Item Name</th>
                <th>Quantity</th>
                <th>Price (per unit)</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      value={item.name}
                      onChange={(e) =>
                        handleChange(index, "name", e.target.value)
                      }
                      placeholder="Item name"
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control text-center"
                      value={item.qty}
                      min="1"
                      onChange={(e) =>
                        handleChange(index, "qty", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control text-center"
                      value={item.price}
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        handleChange(index, "price", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td>{(item.qty * item.price).toFixed(2)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Item Button */}
        <button
          type="button"
          className="btn btn-secondary mb-3"
          onClick={handleAddItem}
        >
          + Add Item
        </button>

        {/* Total Price */}
        <h5 className="mb-3">Total: ${total.toFixed(2)}</h5>

        {/* Action Buttons */}
        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">
            Submit Order
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => navigate("/AdminDashboard/orders")} // Navigate to Orders page
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddOrder;
