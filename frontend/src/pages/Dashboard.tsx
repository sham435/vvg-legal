import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Eye, DollarSign, Video, Play, RefreshCw } from 'lucide-react';
import { VideoGallery } from '../components/VideoGallery';
import { VideoGenerator } from '../components/VideoGenerator';

function Dashboard() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await apiService.getDashboardStats();
      return response.data.data;
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Failed to load dashboard data</div>;

  return (
    <div className="dashboard p-8">
      <div className="dashboard-header flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <button className="btn btn-primary flex items-center gap-2" onClick={() => refetch()}>
          <RefreshCw size={16} />
          Refresh Stats
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="stat-card bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Video size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Generated Today</p>
              <h2 className="text-2xl font-bold text-white">{stats?.videosGeneratedToday || 0}</h2>
            </div>
          </div>
        </div>

        <div className="stat-card bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Play size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Published Today</p>
              <h2 className="text-2xl font-bold text-white">{stats?.videosPublishedToday || 0}</h2>
            </div>
          </div>
        </div>

        <div className="stat-card bg-gray-900 border border-gray-800 p-6 rounded-xl">
             <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400">
              <Eye size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Views</p>
              <h2 className="text-2xl font-bold text-white">{(stats?.totalViews || 0).toLocaleString()}</h2>
            </div>
          </div>
        </div>

        <div className="stat-card bg-gray-900 border border-gray-800 p-6 rounded-xl">
             <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Est. Revenue</p>
              <h2 className="text-2xl font-bold text-white">${stats?.estimatedRevenue?.toFixed(2) || '0.00'}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Generator */}
        <div className="lg:col-span-1">
            <VideoGenerator />
        </div>

        {/* Right Column: Gallery */}
        <div className="lg:col-span-2">
            <VideoGallery />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
