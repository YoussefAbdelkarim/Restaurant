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
  const [ingredientsInventory, setIngredientsInventory] = useState([]);

  // Simple unit conversion to align recipe requirement with inventory unit
  const convertToInventoryUnit = (requirementUnit, inventoryUnit, quantity) => {
    if (!requirementUnit || !inventoryUnit) return quantity;
    const baseInfo = (u) => {
      switch ((u || '').toLowerCase()) {
        case 'g': return { base: 'g', factor: 1 };
        case 'kg': return { base: 'g', factor: 1000 };
        case 'ml': return { base: 'ml', factor: 1 };
        case 'l': return { base: 'ml', factor: 1000 };
        case 'piece': return { base: 'piece', factor: 1 };
        case 'unit': return { base: 'unit', factor: 1 };
        default: return { base: (u || '').toLowerCase(), factor: 1 };
      }
    };
    const req = baseInfo(requirementUnit);
    const inv = baseInfo(inventoryUnit);
    if (req.base !== inv.base) return quantity; // not convertible; assume already aligned
    return (quantity * req.factor) / inv.factor;
  };

  // Fetch available menu items and inventory ingredients (from backend)
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
      } catch (error) {
        console.error("Error fetching items:", error);
        setError(error.message);
      }
    };

    const fetchIngredients = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/ingredients', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch ingredients');
        const data = await res.json();
        setIngredientsInventory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching ingredients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
    fetchIngredients();
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
    // Also block if any ingredient is missing or insufficient in aggregate
    const aggregateShortages = (() => {
      const invById = new Map(ingredientsInventory.map(ing => [String(ing._id), ing]));
      const invByName = new Map(ingredientsInventory.map(ing => [String(ing.name || '').trim().toLowerCase(), ing]));
      const required = [];
      for (const orderItem of form.items) {
        if (!orderItem.item) continue;
        const menuItem = itemsList.find(it => it._id === orderItem.item);
        if (!menuItem || !Array.isArray(menuItem.ingredients)) continue;
        for (const r of menuItem.ingredients) {
          const rawNeed = Number(r.quantity || 0) * Number(orderItem.quantity || 0);
          const idKey = r.ingredient ? String(r.ingredient) : null;
          const nameKey = String(r.name || '').trim().toLowerCase();
          required.push({ idKey, nameKey, rawNeed, reqUnit: r.unit, displayName: r.name || nameKey });
        }
      }
      const messages = [];
      for (const req of required) {
        const invRow = (req.idKey && invById.get(req.idKey)) || invByName.get(req.nameKey);
        if (!invRow) {
          messages.push(`You don't have ${req.displayName} in inventory.`);
        } else {
          const have = Number(invRow.currentStock || 0);
          const unit = invRow.unit || '';
          if (invRow.isManuallyOutOfStock) {
            messages.push(`${invRow.name} is flagged Out of Stock.`);
            continue;
          }
          const need = convertToInventoryUnit(req.reqUnit, unit, req.rawNeed);
          if (have <= 0) {
            messages.push(`You have 0 ${unit} of ${invRow.name}.`);
          } else if (have < need) {
            messages.push(`Not enough ${invRow.name}: need ${need} ${unit}, have ${have} ${unit}.`);
          }
        }
      }
      return messages;
    })();

    const allErrors = [...validationErrors, ...aggregateShortages];
    if (allErrors.length > 0) {
      alert(`Cannot fulfill order due to insufficient inventory:\n${allErrors.join('\n')}`);
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
                      const inventoryById = new Map(ingredientsInventory.map(ing => [String(ing._id), ing]));
                      const inventoryByName = new Map(ingredientsInventory.map(ing => [String(ing.name || '').trim().toLowerCase(), ing]));
                      const shortages = [];
                      for (const r of menuItem.ingredients) {
                        const ingName = String(r.name || '').trim();
                        const key = ingName.toLowerCase();
                        const rawNeed = Number(r.quantity || 0) * Number(orderItem.quantity || 0);
                        const invRow = (r.ingredient && inventoryById.get(String(r.ingredient))) || inventoryByName.get(key);
                        if (!invRow) {
                          shortages.push(`You don't have ${ingName} in inventory.`);
                        } else {
                          const have = Number(invRow.currentStock || 0);
                          const need = convertToInventoryUnit(r.unit, invRow.unit, rawNeed);
                          if (invRow.isManuallyOutOfStock) {
                            shortages.push(`${ingName} is flagged Out of Stock.`);
                          } else if (have <= 0) {
                            shortages.push(`You have 0 ${invRow.unit || ''} of ${ingName}.`);
                          } else if (have < need) {
                            shortages.push(`Not enough ${ingName}: need ${need} ${invRow.unit || ''}, have ${have} ${invRow.unit || ''}.`);
                          }
                        }
                      }
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
                              {shortages.length > 0 && (
                                <div style={{ color: 'red', marginTop: '8px' }}>
                                  {shortages.map((msg, i) => (
                                    <div key={i}>{msg}</div>
                                  ))}
                                </div>
                              )}
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
          {(() => {
            // Compute disabled state and tooltip once for consistent logic and styling
            const invById = new Map(ingredientsInventory.map(ing => [String(ing._id), ing]));
            const invByName = new Map(ingredientsInventory.map(ing => [String(ing.name || '').trim().toLowerCase(), ing]));
            const required = [];
            for (const orderItem of form.items) {
              if (!orderItem.item) continue;
              const menuItem = itemsList.find(it => it._id === orderItem.item);
              if (!menuItem || !Array.isArray(menuItem.ingredients)) continue;
              for (const r of menuItem.ingredients) {
                const idKey = r.ingredient ? String(r.ingredient) : null;
                const nameKey = String(r.name || '').trim().toLowerCase();
                const rawNeed = Number(r.quantity || 0) * Number(orderItem.quantity || 0);
                required.push({ idKey, nameKey, rawNeed, reqUnit: r.unit, displayName: r.name || nameKey });
              }
            }
            let disabled = loading;
            const msgs = [];
            for (const req of required) {
              const invRow = (req.idKey && invById.get(req.idKey)) || invByName.get(req.nameKey);
              if (!invRow) {
                disabled = true;
                msgs.push(`Missing: ${req.displayName}`);
              } else {
                const have = Number(invRow.currentStock || 0);
                const unit = invRow.unit || '';
                const need = convertToInventoryUnit(req.reqUnit, unit, req.rawNeed);
                if (invRow.isManuallyOutOfStock) {
                  disabled = true;
                  msgs.push(`${invRow.name} is OOS`);
                } else if (have <= 0) {
                  disabled = true;
                  msgs.push(`0 ${unit} of ${invRow.name}`);
                } else if (have < need) {
                  disabled = true;
                  msgs.push(`Need ${need} ${unit} ${invRow.name}, have ${have}`);
                }
              }
            }
            const title = msgs.length ? msgs.join('; ') : undefined;
            const style = disabled
              ? { backgroundColor: '#9e9e9e', color: 'white', cursor: 'not-allowed', opacity: 0.6 }
              : { backgroundColor: 'green', color: 'white', cursor: 'pointer' };
            return (
              <>
                <button type="submit" style={style} disabled={disabled} title={title}>Save</button>
                <button type="button" onClick={() => navigate("/AdminDashboard/orders")}>
                  Cancel
                </button>
              </>
            );
          })()}
        </div>
      </form>
    </div>
  );
};

export default AddOrder;
