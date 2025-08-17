import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AddOrder.css";

const AddOrder = () => {
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = useState({
    status: "paid", // default value
    items: [{ item: "", quantity: 1 }]
  });

  // List of menu items (fetched from backend)
  const [itemsList, setItemsList] = useState([]);

  // Fetch available menu items (from backend)
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/items"); // <-- backend endpoint
        if (!res.ok) throw new Error("Failed to fetch menu items");
        const data = await res.json();
        setItemsList(data);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    fetchItems();
  }, []);

  // Handle input changes for order items
  const handleChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    setForm({ ...form, items: newItems });
  };

  // Add a new row for another item
  const handleAddItem = () => {
    setForm({
      ...form,
      items: [...form.items, { item: "", quantity: 1 }]
    });
  };

  // Remove a row
  const handleRemoveItem = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  // Submit order to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!res.ok) throw new Error("Failed to create order");

      alert("Order added successfully!");
      navigate("/AdminDashboard/orders");
    } catch (error) {
      console.error("Error adding order:", error);
      alert("Error adding order");
    }
  };

  return (
    <div className="add-order-container">
      <h3 className="add-order-title">Add Order</h3>

      <form onSubmit={handleSubmit}>
        {/* Payment Status */}
        <div className="form-group">
          <label><h5>Payment Status</h5></label>
          <div className="status-options">
            {["Canceled", "paid", "pending"].map((status) => (
              <label key={status} style={{ marginRight: "10px" }}>
                <input
                  type="radio"
                  name="status"
                  value={status}
                  className="custom-radio"
                  checked={form.status === status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                />
                {status}
              </label>
            ))}
          </div>
        </div>

        {/* Order Items Table */}
        <h5 className="mb-3">Order Items</h5>
        <div className="table-responsive">
          <table className="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((orderItem, index) => (
                <tr key={index}>
                  <td>
                    <select
                      value={orderItem.item}
                      onChange={(e) =>
                        handleChange(index, "item", e.target.value)
                      }
                      required
                    >
                      <option value="">Select Item</option>
                      {itemsList.map((menuItem) => (
                        <option key={menuItem._id} value={menuItem._id}>
                          {menuItem.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={orderItem.quantity}
                      min="1"
                      onChange={(e) =>
                        handleChange(index, "quantity", e.target.value)
                      }
                      required
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-remove"
                      onClick={() => handleRemoveItem(index)}
                      style={{
                        backgroundColor: "#ed3131ff",
                        border: "none",
                        cursor: "pointer"
                      }}
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
          className="btn btn-add-item"
          onClick={handleAddItem}
        >
          + Add Item
        </button>

        {/* Submit & Cancel Buttons */}
        <div className="modal-buttons">
          <button
            type="submit"
            style={{ backgroundColor: "green", color: "white" }}
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => navigate("/AdminDashboard/orders")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddOrder;
