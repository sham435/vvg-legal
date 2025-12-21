import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ApiKeys from './pages/ApiKeys';
import Analytics from './pages/Analytics';
import MarketingLayout from './pages/marketing/MarketingLayout';
import MarketingOverview from './pages/marketing/MarketingOverview';
import MarketingCalendar from './pages/marketing/MarketingCalendar';
import MarketingAccounts from './pages/marketing/MarketingAccounts';
import PublishDashboard from './pages/PublishDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="publish" element={<PublishDashboard />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="marketing" element={<MarketingLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<MarketingOverview />} />
            <Route path="calendar" element={<MarketingCalendar />} />
            <Route path="accounts" element={<MarketingAccounts />} />

          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
