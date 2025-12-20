import { Outlet, Link, useLocation } from 'react-router-dom';
import { BarChart3, Key } from 'lucide-react';
import './DashboardLayout.css';

function DashboardLayout() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/api-keys', label: 'API Keys', icon: Key },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/marketing', label: 'Marketing', icon: BarChart3 },
  ];

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Viral Video AI</h1>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
