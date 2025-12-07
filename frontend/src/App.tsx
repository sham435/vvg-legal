import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import TrendingFeed from './pages/TrendingFeed';
import VideoQueue from './pages/VideoQueue';
import Scheduler from './pages/Scheduler';
import ApiKeys from './pages/ApiKeys';
import Analytics from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="trending" element={<TrendingFeed />} />
          <Route path="videos" element={<VideoQueue />} />
          <Route path="scheduler" element={<Scheduler />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
