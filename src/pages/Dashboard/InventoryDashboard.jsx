import React, { useState, useEffect } from 'react';
import { Badge, Button, Table, Form, Card, Row, Col } from 'react-bootstrap';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reorderQtys, setReorderQtys] = useState({}); // Track quantities per item

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

      // Fetch both ingredients and menu items
      const [ingredientsResponse, itemsResponse] = await Promise.all([
        fetch('/api/ingredients', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/items', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      ]);

      if (!ingredientsResponse.ok) {
        throw new Error(`Failed to fetch ingredients: ${ingredientsResponse.status}`);
      }

      if (!itemsResponse.ok) {
        throw new Error(`Failed to fetch menu items: ${itemsResponse.status}`);
      }

      const ingredientsData = await ingredientsResponse.json();
      const itemsData = await itemsResponse.json();

      setIngredients(ingredientsData);
      setMenuItems(itemsData);
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
      const currentItem = type === 'ingredient' 
        ? ingredients.find(item => item._id === id)
        : menuItems.find(item => item._id === id);
        
      if (!currentItem) {
        throw new Error('Item not found');
      }

      const newStock = currentItem.currentStock + qty;
      const endpoint = type === 'ingredient' ? `/api/ingredients/${id}` : `/api/items/${id}`;

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
      
      // Update local state based on type
      if (type === 'ingredient') {
        setIngredients(prevItems =>
          prevItems.map(item => {
            if (item._id === id) {
              return { ...item, currentStock: newStock };
            }
            return item;
          })
        );
      } else {
        setMenuItems(prevItems =>
          prevItems.map(item => {
            if (item._id === id) {
              return { ...item, currentStock: newStock };
            }
            return item;
          })
        );
      }

      alert(`Successfully reordered ${qty} units of ${updatedItem.name}.`);
      console.log(`Email/SMS sent: Reordered ${qty} units of ${updatedItem.name}`);
      
      // Clear input
      setReorderQtys(prev => ({ ...prev, [id]: '' }));
      
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert(`Error updating inventory: ${error.message}`);
    }
  };

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
    <div className="container mt-4">
      {/* Header with Go Back Button */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1">Inventory Management</h3>
          <p className="text-muted mb-0">Manage your restaurant's inventory and stock levels</p>
        </div>
        <div className="d-flex gap-2">
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
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-primary">
            <Card.Body>
              <i className="fas fa-utensils text-primary" style={{ fontSize: '2rem' }}></i>
              <h4 className="mt-2 mb-1">{menuItems.length}</h4>
              <p className="text-muted mb-0">Menu Items</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-success">
            <Card.Body>
              <i className="fas fa-carrot text-success" style={{ fontSize: '2rem' }}></i>
              <h4 className="mt-2 mb-1">{ingredients.length}</h4>
              <p className="text-muted mb-0">Ingredients</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-warning">
            <Card.Body>
              <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '2rem' }}></i>
              <h4 className="mt-2 mb-1">
                {menuItems.filter(item => checkLowStock(item)).length + 
                 ingredients.filter(item => checkLowStock(item)).length}
              </h4>
              <p className="text-muted mb-0">Low Stock Items</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-danger">
            <Card.Body>
              <i className="fas fa-times-circle text-danger" style={{ fontSize: '2rem' }}></i>
              <h4 className="mt-2 mb-1">
                {menuItems.filter(item => item.currentStock === 0).length + 
                 ingredients.filter(item => item.currentStock === 0).length}
              </h4>
              <p className="text-muted mb-0">Out of Stock</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Menu Items Section */}
      <Card className="mb-4 shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <i className="fas fa-utensils me-2"></i>
            Menu Items (Finished Products)
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table striped bordered hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Price</th>
                <th>Alert Threshold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map(item => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>
                    <Badge bg="info" className="text-capitalize">{item.category}</Badge>
                  </td>
                  <td>
                    <span className={`fw-bold ${item.currentStock === 0 ? 'text-danger' : item.currentStock <= (item.alertThreshold || 5) ? 'text-warning' : 'text-success'}`}>
                      {item.currentStock}
                    </span>
                  </td>
                  <td>${item.price}</td>
                  <td>{item.alertThreshold || 'N/A'}</td>
                  <td>
                    {checkLowStock(item) && <Badge bg="danger" className="me-1">Low Stock</Badge>}
                    {item.currentStock === 0 && <Badge bg="warning">Out of Stock</Badge>}
                    {!checkLowStock(item) && item.currentStock > 0 && <Badge bg="success">In Stock</Badge>}
                  </td>
                  <td>
                    {checkLowStock(item) && (
                      <Form
                        onSubmit={e => {
                          e.preventDefault();
                          handleReorderSubmit(item._id, 'item');
                        }}
                        className="d-flex align-items-center gap-2"
                      >
                        <Form.Control
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={reorderQtys[item._id] || ''}
                          onChange={e => handleReorderChange(item._id, e.target.value)}
                          style={{ width: '80px' }}
                          className="form-control-sm"
                        />
                        <Button size="sm" variant="success" type="submit" className="d-flex align-items-center gap-1">
                          <i className="fas fa-plus"></i>
                          Add
                        </Button>
                      </Form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Ingredients Section */}
      <Card className="shadow-sm">
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
                    {checkLowStock(item) && (
                      <Form
                        onSubmit={e => {
                          e.preventDefault();
                          handleReorderSubmit(item._id, 'ingredient');
                        }}
                        className="d-flex align-items-center gap-2"
                      >
                        <Form.Control
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={reorderQtys[item._id] || ''}
                          onChange={e => handleReorderChange(item._id, e.target.value)}
                          style={{ width: '80px' }}
                          className="form-control-sm"
                        />
                        <Button size="sm" variant="success" type="submit" className="d-flex align-items-center gap-1">
                          <i className="fas fa-plus"></i>
                          Add
                        </Button>
                      </Form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>  
  );
}
