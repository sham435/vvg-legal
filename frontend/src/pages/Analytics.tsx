import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { BarChart3, TrendingUp } from 'lucide-react';

function Analytics() {
  const { data: platformData } = useQuery({
    queryKey: ['analyticsByPlatform'],
    queryFn: async () => {
      const response = await apiService.getAnalyticsByPlatform();
      return response.data.data;
    },
  });

  return (
    <div>
      <div className="dashboard-header">
        <h1>Analytics</h1>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={24} />
          Performance by Platform
        </h2>

        {platformData && platformData.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {platformData.map((platform: any) => (
              <div
                key={platform.platform}
                style={{
                  padding: '1.5rem',
                  background: '#f8fafc',
                  borderRadius: '12px',
                }}
              >
                <h3 style={{ marginBottom: '1rem', textTransform: 'capitalize' }}>
                  {platform.platform.toLowerCase()}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Videos</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{platform.videos}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Views</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{platform.views.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Likes</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{platform.likes.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
            No analytics data available yet
          </p>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={24} />
          Revenue Tracking
        </h2>
        <p style={{ color: '#64748b' }}>
          Detailed revenue analytics and CPM tracking coming soon.
          Revenue estimates are based on average $2 CPM across all platforms.
        </p>
      </div>
    </div>
  );
}

export default Analytics;
