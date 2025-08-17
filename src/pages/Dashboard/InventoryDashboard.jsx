import React, { useState, useEffect } from 'react';
import { Badge, Button, Table, Form } from 'react-bootstrap';
import moment from 'moment';

export default function InventoryDashboard({ inventory = [] }) {
  const [items, setItems] = useState([]);
  const [reorderQtys, setReorderQtys] = useState({}); // Track quantities per item

  useEffect(() => {
    setItems(inventory || []);
  }, [inventory]);

  const handleReorderChange = (id, value) => {
    setReorderQtys(prev => ({ ...prev, [id]: value }));
  };

  const handleReorderSubmit = (id) => {
    const qty = parseInt(reorderQtys[id], 10);
    if (!qty || qty <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, stock: item.stock + qty };
          alert(`Reordered ${qty} units of ${item.name}.`);
          console.log(`Email/SMS sent: Reordered ${qty} units of ${item.name}`);
          return updatedItem;
        }
        return item;
      })
    );
    setReorderQtys(prev => ({ ...prev, [id]: '' })); // Clear input
  };

  const checkLowStock = (item) => item.stock <= item.threshold;
  const checkExpirySoon = (item) => {
    const daysLeft = moment(item.expiryDate).diff(moment(), 'days');
    return daysLeft <= 7;
  };
  const isExpiryUrgent = (item) => {
    const daysLeft = moment(item.expiryDate).diff(moment(), 'days');
    return daysLeft <= 3;
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-4">Inventory Management </h3>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Item</th>
            <th>Stock</th>
            <th>Threshold</th>
            <th>Expiry Date</th>
            <th>Alerts</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.stock}</td>
              <td>{item.threshold}</td>
              <td style={{ color: isExpiryUrgent(item) ? 'red' : 'inherit' }}>
                {item.expiryDate}
              </td>
              <td>
                {checkLowStock(item) && <Badge bg="danger" className="me-1">Low Stock</Badge>}
                {checkExpirySoon(item) && <Badge bg="warning">Expiring Soon</Badge>}
              </td>
              <td>
                {checkLowStock(item) && (
                  <Form
                    onSubmit={e => {
                      e.preventDefault();
                      handleReorderSubmit(item.id);
                    }}
                    className="d-flex align-items-center gap-2"
                  >
                    <Form.Control
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={reorderQtys[item.id] || ''}
                      onChange={e => handleReorderChange(item.id, e.target.value)}
                      style={{ width: '80px' }}
                    />
                    <Button size="sm" variant="primary" type="submit">
                      Reorder
                    </Button>
                  </Form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>  
  );
}
