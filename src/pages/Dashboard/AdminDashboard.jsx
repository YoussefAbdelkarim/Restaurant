import { NavLink, Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AI from './AI';
import Statistics from "./Statistics/Statistics";
import Orders from './Orders';
import AddOrder from './AddOrder';
import CreateEmployee from './CreateEmployee';
import ManageMenu from './ManageMenu';
import CreateItem from './CreateItem';
import ViewEmployees from './ViewEmployees';
import InventoryDashboard from './InventoryDashboard';
import CreateIngredient from './CreateIngredient';
import Payments from './payments';
import AddPayment from './AddPayment';
import { FaBars, FaTimes } from "react-icons/fa";
import DailyInventory from './DailyInventory';

function SidebarItem({ to, children }) {
  const [hover, setHover] = useState(false);

  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'block',
        padding: '0.5rem 1rem',
        borderRadius: '0.25rem',
        fontWeight: '600',
        textDecoration: 'none',
        color: isActive ? 'black' : '#000',
        backgroundColor: isActive ? '#ffc300' : hover ? '#ffc40098' : '',
        transition: 'all 0.3s ease',
      })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </NavLink>
  );
}


export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const role = (typeof window !== 'undefined' && localStorage.getItem('role')) || '';

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <div className="bg-light border-end" style={{ width: isOpen ? '250px' : '60px', transition: '0.3s' }}>
        <div className="p-3">
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            marginBottom: '15px',
            color: '#333'
          }}
          aria-label="Toggle Sidebar"
        >
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>

          {isOpen && (
            <>
              <h5 className="fw-bold" style={{ color: '#000000ff' }}>Dashboard</h5>

              <ul className="nav flex-column">
                {[
                  { name: 'AI', to: '/AdminDashboard/ai' },
                  { name: 'Statistics', to: '/AdminDashboard/statistics' },
                  { name: 'Employees', to: '/AdminDashboard/viewEmployees' },
                  { name: 'Menu', to: '/AdminDashboard/menu' },
                  { name: 'Orders', to: '/AdminDashboard/orders' },
                    
                  { name: 'Inventory', to: '/AdminDashboard/inventory' }, 
                  { name: 'Payments', to: '/AdminDashboard/payments' },
                  { name: 'Daily Inventory', to: '/AdminDashboard/daily' },        
                ]
                  // hide all dashboard entries if cleaner
                  .filter(item => role !== 'cleaner')
                  .map(({ name, to }) => (
                  <li className="nav-item mb-2" key={name}>
                    <SidebarItem to={to}>{name}</SidebarItem>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="flex-grow-1">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: '1px solid #6c757d',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            color: '#6c757d',
            fontSize: '14px',
            marginTop: '20px',
            marginLeft: '20px'
          }}
        >
          ← Go Back
        </button>

        <div>
          <Routes>
            {role !== 'cleaner' && <Route path="ai" element={<AI />} />}
            {role !== 'cleaner' && <Route path="statistics" element={<Statistics />} />}
            {role !== 'cleaner' && <Route path="ViewEmployees" element={<ViewEmployees />} />}
            {role !== 'cleaner' && <Route path="CreateEmployee" element={<CreateEmployee />} />}
            {role !== 'cleaner' && <Route path="menu" element={<ManageMenu />} />}
            {role !== 'cleaner' && <Route path="menu/create" element={<CreateItem />} />}
            {role !== 'cleaner' && <Route path="orders" element={<Orders />} />}
            {role !== 'cleaner' && <Route path="addOrder" element={<AddOrder />} />}
            
            {role !== 'cleaner' && <Route path="inventory" element={<InventoryDashboard />} />}
            {role !== 'cleaner' && <Route path="inventory/create" element={<CreateIngredient />} />}
            {role !== 'cleaner' && <Route path="payments" element={<Payments />} />}
            {role !== 'cleaner' && <Route path="addPayment" element={<AddPayment />} />}
            {role !== 'cleaner' && <Route path="daily" element={<DailyInventory />} />}
          </Routes>
        </div>
      </div>  
    </div>
  );
}
