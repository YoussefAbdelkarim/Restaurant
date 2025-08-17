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
                <tr key={index}>
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
                            {menuItem.name} - ${menuItem.price} (Stock: {menuItem.currentStock})
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
                    {orderItem.item && (() => {
                      const menuItem = itemsList.find(item => item._id === orderItem.item);
                      if (menuItem && orderItem.quantity > menuItem.currentStock) {
                        return (
                          <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '5px' }}>
                            ⚠️ Insufficient stock! Only {menuItem.currentStock} available
                          </div>
                        );
                      }
                      return null;
                    })()}
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

        {/* Order Summary */}
        {form.items.some(item => item.item) && (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
            <h6>Order Summary:</h6>
            <div style={{ marginBottom: '10px' }}>
              <strong>Total Items:</strong> {form.items.filter(item => item.item).length}
            </div>
            {(() => {
              const stockWarnings = [];
              let totalValue = 0;
              
              form.items.forEach(orderItem => {
                if (orderItem.item) {
                  const menuItem = itemsList.find(item => item._id === orderItem.item);
                  if (menuItem) {
                    totalValue += menuItem.price * orderItem.quantity;
                    if (orderItem.quantity > menuItem.currentStock) {
                      stockWarnings.push(`${menuItem.name}: ${orderItem.quantity} requested, ${menuItem.currentStock} available`);
                    }
                  }
                }
              });
              
              return (
                <>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Total Value:</strong> ${totalValue.toFixed(2)}
                  </div>
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
