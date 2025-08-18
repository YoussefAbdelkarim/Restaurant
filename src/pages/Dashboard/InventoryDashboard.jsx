import React, { useState, useEffect } from 'react';
import { Badge, Button, Table, Form, Card, Row, Col, Modal } from 'react-bootstrap';
// moment not used after removing items section
import { useNavigate } from 'react-router-dom';

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  // Removed menu items management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reorderQtys, setReorderQtys] = useState({}); // Track quantities per item
  
  // Modal states
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  // Removed Add Item modal state
  
  // Form states
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    currentStock: 0,
    unit: '',
    alertThreshold: 5,
    pricePerUnit: 0,
  });
  
  // Removed new item form state

  // Stock management states
  const [stockQtys, setStockQtys] = useState({});

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please login again.');
        return;
      }

      // Fetch ingredients only
      const ingredientsResponse = await fetch('/api/ingredients', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!ingredientsResponse.ok) {
        throw new Error(`Failed to fetch ingredients: ${ingredientsResponse.status}`);
      }

      const ingredientsData = await ingredientsResponse.json();
      setIngredients(ingredientsData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReorderChange = (id, value) => {
    setReorderQtys(prev => ({ ...prev, [id]: value }));
  };

  const handleReorderSubmit = async (id, type = 'ingredient') => {
    const qty = parseInt(reorderQtys[id], 10);
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      // Find the current item to get its current stock
      const currentItem = ingredients.find(item => item._id === id);
        
      if (!currentItem) {
        throw new Error('Item not found');
      }

      const newStock = currentItem.currentStock + qty;
      const endpoint = `/api/ingredients/${id}`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentStock: newStock // Add reorder quantity to current stock
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update inventory: ${response.status}`);
      }

      const updatedItem = await response.json();
      
      // Update local state
      setIngredients(prevItems =>
        prevItems.map(item => {
          if (item._id === id) {
            return { ...item, currentStock: newStock };
          }
          return item;
        })
      );

      alert(`Successfully reordered ${qty} units of ${updatedItem.name}.`);
      console.log(`Email/SMS sent: Reordered ${qty} units of ${updatedItem.name}`);
      
      // Clear input
      setReorderQtys(prev => ({ ...prev, [id]: '' }));
      
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert(`Error updating inventory: ${error.message}`);
    }
  };

  // Stock management functions
  const handleStockChange = (id, value) => {
    setStockQtys(prev => ({ ...prev, [id]: value }));
  };

  const handleStockUpdate = async (id, operation, type = 'ingredient') => {
    const qty = parseInt(stockQtys[id], 10);
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const endpoint = `/api/ingredients/${id}/stock`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity: qty,
          operation: operation
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update stock: ${response.status}`);
      }

      const updatedItem = await response.json();
      
      // Update local state
      setIngredients(prevItems =>
        prevItems.map(item => {
          if (item._id === id) {
            return { ...item, currentStock: updatedItem.currentStock };
          }
          return item;
        })
      );

      alert(`Successfully ${operation === 'add' ? 'added' : 'subtracted'} ${qty} units of ${updatedItem.name}.`);
      
      // Clear input
      setStockQtys(prev => ({ ...prev, [id]: '' }));
      
    } catch (error) {
      console.error('Error updating stock:', error);
      alert(`Error updating stock: ${error.message}`);
    }
  };

  // Delete functions
  const handleDelete = async (id, type = 'ingredient') => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const endpoint = `/api/ingredients/${id}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ${type}: ${response.status}`);
      }

      // Update local state
      setIngredients(prevItems => prevItems.filter(item => item._id !== id));

      alert(`Successfully deleted ${type}.`);
      
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Error deleting ${type}: ${error.message}`);
    }
  };

  // Add new ingredient function
  const handleAddIngredient = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Authentication required. Please login again.');
        return;
      }

      const response = await fetch('/api/ingredients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newIngredient)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to add ingredient: ${response.status}`);
      }

      const addedIngredient = await response.json();
      setIngredients(prev => [...prev, addedIngredient]);
      
      // Reset form and close modal
      setNewIngredient({
        name: '',
        currentStock: 0,
        unit: '',
        alertThreshold: 5,
        pricePerUnit: 0,
      });
      setShowAddIngredient(false);
      
      alert(`Successfully added ingredient: ${addedIngredient.name}`);
      
    } catch (error) {
      console.error('Error adding ingredient:', error);
      alert(`Error adding ingredient: ${error.message}`);
    }
  };

  // removed add item function

  const checkLowStock = (item) => item.currentStock <= item.alertThreshold;

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="mb-0">Inventory Management</h3>
          <Button 
            variant="outline-secondary" 
            onClick={() => navigate('/AdminDashboard')}
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i>
            Go Back
          </Button>
        </div>
        <Card className="text-center py-5">
          <Card.Body>
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Loading...</span>
            </div>
            <h5 className="mt-3 text-muted">Loading inventory data...</h5>
            <p className="text-muted">Please wait while we fetch your inventory information</p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3 className="mb-0">Inventory Management</h3>
          <Button 
            variant="outline-secondary" 
            onClick={() => navigate('/AdminDashboard')}
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i>
            Go Back
          </Button>
        </div>
        <Card className="border-danger">
          <Card.Body className="text-center">
            <i className="fas fa-exclamation-triangle text-danger" style={{ fontSize: '3rem' }}></i>
            <h5 className="mt-3 text-danger">Error Loading Inventory</h5>
            <p className="text-muted">{error}</p>
            <div className="d-flex justify-content-center gap-2">
              <Button 
                variant="outline-danger" 
                onClick={fetchInventory}
                className="d-flex align-items-center gap-2"
              >
                <i className="fas fa-redo"></i>
                Retry
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/AdminDashboard')}
                className="d-flex align-items-center gap-2"
              >
                <i className="fas fa-arrow-left"></i>
                Go Back
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mt-4 mb-5">
      {/* Header with Go Back Button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-2">Inventory Management</h3>
          <p className="text-muted mb-0">Manage your restaurant's inventory and stock levels</p>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="success" 
            onClick={() => setShowAddIngredient(true)}
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-plus"></i>
            Add Ingredient
          </Button>
          {/* Removed Add Item button */}
          <Button 
            variant="outline-primary" 
            onClick={fetchInventory}
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-sync-alt"></i>
            Refresh
          </Button>
          <Button 
            variant="outline-secondary" 
            onClick={() => navigate('/AdminDashboard')}
            className="d-flex align-items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i>
            Go Back
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <Row className="mb-5">
        <Col md={4}>
          <Card className="text-center border-success">
            <Card.Body>
              <i className="fas fa-carrot text-success" style={{ fontSize: '2rem' }}></i>
              <h4 className="mt-2 mb-1">{ingredients.length}</h4>
              <p className="text-muted mb-0">Ingredients</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center border-warning">
            <Card.Body>
              <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '2rem' }}></i>
              <h4 className="mt-2 mb-1">
                {ingredients.filter(item => checkLowStock(item)).length}
              </h4>
              <p className="text-muted mb-0">Low Stock Items</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center border-danger">
            <Card.Body>
              <i className="fas fa-times-circle text-danger" style={{ fontSize: '2rem' }}></i>
              <h4 className="mt-2 mb-1">
                {ingredients.filter(item => item.currentStock === 0).length}
              </h4>
              <p className="text-muted mb-0">Out of Stock</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Menu Items Section removed */}

      {/* Ingredients Section */}
      <Card className="mb-5 shadow-sm">
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0">
            <i className="fas fa-carrot me-2"></i>
            Raw Ingredients
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table striped bordered hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Ingredient Name</th>
                <th>Current Stock</th>
                <th>Unit</th>
                <th>Alert Threshold</th>
                <th>Status</th>
                <th>Stock Management</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map(item => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <span className={`fw-bold ${item.currentStock === 0 ? 'text-danger' : item.currentStock <= item.alertThreshold ? 'text-warning' : 'text-success'}`}>
                      {item.currentStock}
                    </span>
                  </td>
                  <td>
                    <Badge bg="secondary">{item.unit}</Badge>
                  </td>
                  <td>{item.alertThreshold}</td>
                  <td>
                    {checkLowStock(item) && <Badge bg="danger" className="me-1">Low Stock</Badge>}
                    {item.currentStock === 0 && <Badge bg="warning">Out of Stock</Badge>}
                    {!checkLowStock(item) && item.currentStock > 0 && <Badge bg="success">In Stock</Badge>}
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <Form.Control
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={stockQtys[item._id] || ''}
                        onChange={e => handleStockChange(item._id, e.target.value)}
                        style={{ width: '80px' }}
                        className="form-control-sm"
                      />
                      <Button 
                        size="sm" 
                        variant="success" 
                        onClick={() => handleStockUpdate(item._id, 'add', 'ingredient')}
                        className="d-flex align-items-center gap-1"
                        title="Add Stock"
                      >
                        <i className="fas fa-plus"></i>
                        <span className="d-none d-sm-inline">Add</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        onClick={() => handleStockUpdate(item._id, 'subtract', 'ingredient')}
                        className="d-flex align-items-center gap-1"
                        title="Subtract Stock"
                      >
                        <i className="fas fa-minus"></i>
                        <span className="d-none d-sm-inline">Sub</span>
                      </Button>
                    </div>
                  </td>
                  <td>
                    <Button 
                      size="sm" 
                      variant="danger" 
                      onClick={() => handleDelete(item._id, 'ingredient')}
                      className="d-flex align-items-center gap-1"
                    >
                      <i className="fas fa-trash"></i>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Add Ingredient Modal */}
      <Modal show={showAddIngredient} onHide={() => setShowAddIngredient(false)} className="mb-4">
        <Modal.Header closeButton>
          <Modal.Title>Add New Ingredient</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddIngredient}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Ingredient Name</Form.Label>
              <Form.Control
                type="text"
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Current Stock</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={newIngredient.currentStock}
                onChange={(e) => setNewIngredient({...newIngredient, currentStock: parseInt(e.target.value)})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Unit</Form.Label>
              <Form.Select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient({...newIngredient, unit: e.target.value})}
                required
              >
                <option value="">Select Unit</option>
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="l">Liters (l)</option>
                <option value="piece">Piece</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Price per Unit</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={newIngredient.pricePerUnit}
                onChange={(e) => setNewIngredient({...newIngredient, pricePerUnit: parseFloat(e.target.value)})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Alert Threshold</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={newIngredient.alertThreshold}
                onChange={(e) => setNewIngredient({...newIngredient, alertThreshold: parseInt(e.target.value)})}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddIngredient(false)}>
              Cancel
            </Button>
            <Button variant="success" type="submit">
              Add Ingredient
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Add Item Modal removed */}
    </div>  
  );
}
