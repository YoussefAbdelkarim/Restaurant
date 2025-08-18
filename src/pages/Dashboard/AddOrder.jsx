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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch available menu items (from backend)
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        const res = await fetch("/api/items", {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        
        if (!res.ok) throw new Error("Failed to fetch menu items");
        const data = await res.json();
        setItemsList(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching items:", error);
        setError(error.message);
        setLoading(false);
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

  // Validate order quantities against available stock
  const validateOrderQuantities = () => {
    const errors = [];
    
    form.items.forEach((orderItem, index) => {
      if (orderItem.item) {
        const menuItem = itemsList.find(item => item._id === orderItem.item);
        if (menuItem) {
          if (orderItem.quantity > menuItem.currentStock) {
            errors.push(`${menuItem.name}: Requested ${orderItem.quantity}, but only ${menuItem.currentStock} available`);
          }
        }
      }
    });
    
    return errors;
  };

  // Submit order to backend
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    const validationErrors = validateOrderQuantities();
    if (validationErrors.length > 0) {
      alert(`Cannot fulfill order due to insufficient inventory:\n${validationErrors.join('\n')}`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create order");
      }

      alert("Order added successfully!");
      navigate("/AdminDashboard/orders");
    } catch (error) {
      console.error("Error adding order:", error);
      alert(`Error adding order: ${error.message}`);
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
        
        {loading && <p>Loading menu items...</p>}
        {error && <p style={{color: 'red'}}>Error: {error}</p>}
        
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
                <React.Fragment key={index}>
                  <tr>
                    <td>
                      <select
                        value={orderItem.item}
                        onChange={(e) =>
                          handleChange(index, "item", e.target.value)
                        }
                        required
                        disabled={loading}
                      >
                        <option value="">{loading ? 'Loading...' : 'Select Item'}</option>
                        {itemsList.map((menuItem) => (
                          <option key={menuItem._id} value={menuItem._id}>
                            {menuItem.name} - ${menuItem.price}
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
                  {orderItem.item && (() => {
                    const menuItem = itemsList.find(item => item._id === orderItem.item);
                    if (menuItem && Array.isArray(menuItem.ingredients) && menuItem.ingredients.length) {
                      return (
                        <tr>
                          <td colSpan="3" style={{ background: '#fafafa' }}>
                            <div style={{ fontSize: '0.9rem' }}>
                              <strong>Ingredients required:</strong>
                              <div style={{ marginTop: '6px' }}>
                                {menuItem.ingredients.map((r, i) => (
                                  <div key={i}>- {r.name}: {r.quantity * orderItem.quantity} {r.unit}</div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })()}
                </React.Fragment>
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

        {/* Order Summary + Recipe Costs */}
        {form.items.some(item => item.item) && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <h6>Order Summary:</h6>
            <div style={{ marginBottom: '10px' }}>
              <strong>Total Items:</strong> {form.items.filter(item => item.item).length}
            </div>
            {(() => {
              const stockWarnings = [];
              let totalValue = 0;
              const recipeLines = [];
              
              form.items.forEach(orderItem => {
                if (orderItem.item) {
                  const menuItem = itemsList.find(item => item._id === orderItem.item);
                  if (menuItem) {
                    totalValue += menuItem.price * orderItem.quantity;
                    // Build recipe details per item
                    if (Array.isArray(menuItem.ingredients) && menuItem.ingredients.length) {
                      const lines = menuItem.ingredients.map(r => {
                        const name = r.name || (r.ingredient && `Ingredient ${r.ingredient}`) || 'ingredient';
                        const qty = r.quantity * orderItem.quantity;
                        return `- ${name}: ${qty} ${r.unit}`;
                      });
                      recipeLines.push({ name: menuItem.name, qty: orderItem.quantity, lines });
                    }
                  }
                }
              });
              
              return (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Total Value:</strong> ${totalValue.toFixed(2)}
                  </div>
                  {recipeLines.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>Ingredient Costs (per order):</strong>
                      <div style={{ marginTop: '6px' }}>
                        {recipeLines.map((r, idx) => (
                          <div key={idx} style={{ marginBottom: '6px' }}>
                            {r.name} x{r.qty}
                            <div style={{ marginLeft: '12px', fontSize: '0.9rem' }}>
                              {r.lines.map((l, i) => (<div key={i}>{l}</div>))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {stockWarnings.length > 0 && (
                    <div style={{ color: 'red', fontSize: '0.9rem' }}>
                      <strong>Stock Warnings:</strong>
                      {stockWarnings.map((warning, index) => (
                        <div key={index}>• {warning}</div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

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
