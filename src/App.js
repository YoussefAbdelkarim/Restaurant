import './App.css';
import { NavLink, Routes, Route, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUtensils } from '@fortawesome/free-solid-svg-icons';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Home from './pages/Home/Home';
import Menu from './pages/Menu/Menu';
import About from './pages/About/About';
import Contact from './pages/Contact/Contact';
import AdminLogin from './pages/Login/login';
import AdminDashboard from './pages/Dashboard/AdminDashboard';
import AssistantComponent from './components/AssistantComponent/AssistantComponent';

function App() {
  const location = useLocation();
  const isAdminPage = location.pathname.includes('/AdminDashboard');

  return (
    <div id='app'>
      {/* Render Navbar ONLY if NOT on admin pages */}
      {!isAdminPage && (
        <Navbar expand='lg' className='fixed-top bg-body-tertiary shadow'>
          <Container>
            <Navbar.Brand>
              <NavLink to='/' className='navbar-brand text-success d-flex align-items-center'>
                <FontAwesomeIcon
                  icon={faUtensils}
                  size='xl'
                  className="text-danger"
                  style={{ marginRight: '10px' }}
                />
                <span
                  className="nav-link text-uppercase text-center fw-semibold"
                  style={{ color: '#000000ff', lineHeight: '1', display: 'inline-block' }}
                >
                  Flavor
                  <span style={{ color: '#ffc300', display: 'block', lineHeight: '1' }}>Hub</span>
                </span>
              </NavLink>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls='basic-navbar-nav' />
            <Navbar.Collapse className='text-center' id='basiv-navbar-nav'>
              <Nav className='me-auto justify-content-center w-100'>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `nav-link text-uppercase text-center fw-semibold ${isActive ? "active-link" : ""}`
                  }
                >
                  Home
                </NavLink>

                <NavLink
                  to="/menu"
                  className={({ isActive }) =>
                    `nav-link text-uppercase text-center fw-semibold ${isActive ? "active-link" : ""}`
                  }
                >
                  Menu
                </NavLink>

                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `nav-link text-uppercase text-center fw-semibold ${isActive ? "active-link" : ""}`
                  }
                >
                  About
                </NavLink>
              </Nav>
              <NavLink to='/contact'>
                <button type='button' className='custom-btn'>
                  Book a table
                </button>
              </NavLink>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}

      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/menu' element={<Menu />} />
        <Route path='/about' element={<About />} />
        <Route path='/contact' element={<Contact />} />
        <Route path='/login' element={<AdminLogin />} />
        {/* Add wildcard * to allow nested routing inside AdminDashboard */}
        <Route path='/AdminDashboard/*' element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}

export default App;
