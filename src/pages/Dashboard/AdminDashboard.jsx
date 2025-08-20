import { NavLink, Routes, Route } from 'react-router-dom';

import { useState } from 'react';
import AI from './AI';
import Statistics from "./Statistics/Statistics";
import Orders from './Orders';
import AddOrder from './AddOrder';

import CreateEmployee from './CreateEmployee';
import ManageMenu from './ManageMenu';
import ViewEmployees from './ViewEmployees';
<<<<<<< Updated upstream
 
import AnalyticsDashboard from './AnalyticsDashboard';
=======

>>>>>>> Stashed changes
import InventoryDashboard from './InventoryDashboard';
import { dummyOrders, dummyInventory } from './DummyData';
import Payments from './payments';
import AddPayment from './AddPayment';
<<<<<<< Updated upstream
=======
import { FaBars, FaTimes } from "react-icons/fa";
import DailyInventory from './DailyInventory';
import Customer from './customer';
>>>>>>> Stashed changes
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
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      <div className="bg-light border-end" style={{ width: isOpen ? '250px' : '60px', transition: '0.3s' }}>
        <div className="p-3">
         <button
  onClick={() => setIsOpen(!isOpen)}
  className={`hamburger ${isOpen ? 'open' : ''}`}
  aria-label="Toggle Sidebar"
>
  <span></span>
  <span></span>
  <span></span>
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
    { name: 'Analytics', to: '/AdminDashboard/analytics' },       
    { name: 'Inventory', to: '/AdminDashboard/inventory' }, 
    { name: 'Payments', to: '/AdminDashboard/payments' },        
  ].map(({ name, to }) => (
    <li className="nav-item mb-2" key={name}>
      <SidebarItem to={to}>{name}</SidebarItem>
    </li>
  ))}
</ul>


<<<<<<< Updated upstream
=======
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
                   { name: 'Customers', to: '/AdminDashboard/customer' },
                ]
                  // hide all dashboard entries if cleaner
                  .filter(item => role !== 'cleaner')
                  .map(({ name, to }) => (
                  <li className="nav-item mb-2" key={name}>
                    <SidebarItem to={to}>{name}</SidebarItem>
                  </li>
                ))}
              </ul>
>>>>>>> Stashed changes
            </>
          )}
        </div>
      </div>

      <div className="flex-grow-1 p-4">
        <Routes>
          <Route path="ai" element={<AI />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="ViewEmployees" element={<ViewEmployees />} />
          <Route path="CreateEmployee" element={<CreateEmployee />} /> 
          <Route path="menu" element={<ManageMenu />} />
          <Route path="orders" element={<Orders />} /> 
          <Route path="addOrder" element={<AddOrder />} />
          <Route path="analytics" element={<AnalyticsDashboard orders={dummyOrders} />} />
           <Route path="inventory" element={<InventoryDashboard inventory={dummyInventory} />} />
           <Route path="payments" element={<Payments />} />
           <Route path="addPayment" element={<AddPayment />} />

<<<<<<< Updated upstream
        </Routes>
=======
        <div>
          <Routes>
            {role !== 'cleaner' && <Route path="ai" element={<AI />} />}
            {role !== 'cleaner' && <Route path="statistics" element={<Statistics />} />}
            {role !== 'cleaner' && <Route path="ViewEmployees" element={<ViewEmployees />} />}
            {role !== 'cleaner' && <Route path="CreateEmployee" element={<CreateEmployee />} />}
            {role !== 'cleaner' && <Route path="menu" element={<ManageMenu />} />}
            {role !== 'cleaner' && <Route path="orders" element={<Orders />} />}
            {role !== 'cleaner' && <Route path="addOrder" element={<AddOrder />} />}
          
            {role !== 'cleaner' && <Route path="inventory" element={<InventoryDashboard />} />}
            {role !== 'cleaner' && <Route path="payments" element={<Payments />} />}
            {role !== 'cleaner' && <Route path="addPayment" element={<AddPayment />} />}
            {role !== 'cleaner' && <Route path="daily" element={<DailyInventory />} />}
            {role !== 'cleaner' && <Route path="customer" element={<Customer />} />}
          </Routes>
        </div>
>>>>>>> Stashed changes
      </div>  
    </div>
  );
}
