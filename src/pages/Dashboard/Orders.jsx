import { useNavigate } from 'react-router-dom';
import { Badge } from 'react-bootstrap';

const dummyOrders = [
  {
    id: 1,
    customerName: 'John Doe',
    contact: '+1 234 567 890',
    items: [
      { name: 'Pizza', quantity: 2, price: 10 },
      { name: 'Drink', quantity: 1, price: 3 }
    ],
    totalPrice: 23,
    date: '2025-08-12 14:30',
    status: 'Pending'
  },
  {
    id: 2,
    customerName: 'Sarah Smith',
    contact: '+1 987 654 321',
    items: [
      { name: 'Burger', quantity: 1, price: 8 },
      { name: 'Fries', quantity: 2, price: 3 }
    ],
    totalPrice: 14,
    date: '2025-08-11 19:15',
    status: 'Completed'
  }
];

export default function Orders() {
  const navigate = useNavigate();

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Preparing': return 'info';
      case 'Completed': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="orders-page" style={{ padding: 0 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="fw-bold m-0">Orders</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/AdminDashboard/addOrder')}
        >
          ➕ Add Order
        </button>
      </div>

      <table className="table table-hover align-middle">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>Customer</th>
            <th>Contact</th>
            <th>Items</th>
            <th>Total Price ($)</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {dummyOrders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.customerName}</td>
              <td>{order.contact}</td>
              <td>
                {order.items.map((item, i) => (
                  <div key={i}>
                    {item.name} <span className="text-muted">x{item.quantity}</span>
                  </div>
                ))}
              </td>
              <td>${order.totalPrice}</td>
              <td>{order.date}</td>
              <td>
                <Badge bg={getStatusVariant(order.status)}>{order.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
