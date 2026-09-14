import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, User as UserIcon, Bell, Settings, LogOut, PlusSquare } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={24} /> },
    { name: 'Explore', path: '/explore', icon: <Compass size={24} /> },
    { name: 'Notifications', path: '/notifications', icon: <Bell size={24} /> },
    { name: 'Profile', path: '/profile', icon: <UserIcon size={24} /> },
    { name: 'Admin', path: '/admin', icon: <Settings size={24} /> },
  ];

  return (
    <div className="layout-container">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <Link to="/">SocialWave</Link>
        </div>
        <ul className="sidebar-nav">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link to={item.path} className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}>
                {item.icon}
                <span className="nav-label">{item.name}</span>
              </Link>
            </li>
          ))}
          <li className="nav-logout">
            <button onClick={handleLogout} className="nav-link logout-btn">
              <LogOut size={24} />
              <span className="nav-label">Logout</span>
            </button>
          </li>
        </ul>
      </nav>
      
      <main className="main-content">
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav">
        {navItems.slice(0, 4).map((item) => (
          <Link key={item.path} to={item.path} className={`mobile-nav-link ${location.pathname === item.path ? 'active' : ''}`}>
            {item.icon}
          </Link>
        ))}
      </nav>
    </div>
  );
}
