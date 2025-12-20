import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Calendar, Settings } from 'lucide-react';

export default function MarketingLayout() {
  const location = useLocation();

  // Redirect to overview if at root marketing path
  if (location.pathname === '/marketing' || location.pathname === '/marketing/') {
    return <Navigate to="calendar" replace />;
  }

  const tabs = [
    { path: 'calendar', label: 'Calendar', icon: Calendar },
    { path: 'accounts', label: 'Accounts', icon: Settings },
  ];

  return (
    <div className="min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketing Center</h1>
        <p className="text-gray-500">Manage campaigns and analyze performance.</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
