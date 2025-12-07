import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Eye, Heart, DollarSign, Video, Play, RefreshCw } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await apiService.getDashboardStats();
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: recentVideos } = useQuery({
    queryKey: ['recentVideos'],
    queryFn: async () => {
      const response = await apiService.getRecentVideos();
      return response.data.data;
    },
  });

  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">Failed to load dashboard data</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => refetch()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#6366f1' }}>
            <Video size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Videos Generated Today</p>
            <h2 className="stat-value">{stats?.videosGeneratedToday || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b981' }}>
            <Play size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Videos Published Today</p>
            <h2 className="stat-value">{stats?.videosPublishedToday || 0}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b' }}>
            <Eye size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Views</p>
            <h2 className="stat-value">{(stats?.totalViews || 0).toLocaleString()}</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef4444' }}>
            <Heart size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Likes</p>
            <h2 className="stat-value">{(stats?.totalLikes || 0).toLocaleString()}</h2>
          </div>
        </div>

        <div className="stat-card revenue">
          <div className="stat-icon" style={{ background: '#8b5cf6' }}>
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <p className="stat-label">Estimated Revenue</p>
            <h2 className="stat-value">${stats?.estimatedRevenue?.toFixed(2) || '0.00'}</h2>
          </div>
        </div>
      </div>

      {/* Recent Videos */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Recent Videos</h2>
        
        {recentVideos && recentVideos.length > 0 ? (
          <div className="videos-list">
            {recentVideos.map((video: any) => (
              <div key={video.id} className="video-item">
                <div>
                  <h3>{video.title}</h3>
                  <p className="video-meta">
                    {new Date(video.createdAt).toLocaleDateString()} • {video.status}
                  </p>
                </div>
                <div className="video-platforms">
                  {video.platforms.map((platform: any, idx: number) => (
                    <span key={idx} className="platform-badge">
                      {platform.platform}: {platform.views} views
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b' }}>No videos generated yet</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
