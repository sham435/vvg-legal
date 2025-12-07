import { useQuery, useMutation } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';

function TrendingFeed() {
  const [includeUsed, setIncludeUsed] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trends', includeUsed],
    queryFn: async () => {
      const response = await apiService.getTrends(20, includeUsed);
      return response.data.data;
    },
  });

  const fetchMutation = useMutation({
    mutationFn: () => apiService.fetchTrends(),
    onSuccess: () => {
      refetch();
    },
  });

  const triggerMutation = useMutation({
    mutationFn: (topicId: string) => apiService.triggerGeneration(topicId),
  });

  return (
    <div>
      <div className="dashboard-header">
        <h1>Trending Topics</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={() => fetchMutation.mutate()}
            disabled={fetchMutation.isPending}
          >
            <RefreshCw size={16} />
            {fetchMutation.isPending ? 'Fetching...' : 'Fetch New Trends'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={includeUsed}
            onChange={(e) => setIncludeUsed(e.target.checked)}
          />
          Show used topics
        </label>
      </div>

      {isLoading ? (
        <div className="loading">Loading trends...</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {data && data.length > 0 ? (
            data.map((topic: any) => (
              <div key={topic.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3>{topic.title}</h3>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: topic.used ? '#e5e7eb' : '#dcfce7',
                        color: topic.used ? '#6b7280' : '#15803d',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        {topic.used ? 'Used' : 'Available'}
                      </span>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        Score: {topic.score}
                      </span>
                    </div>
                    <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>
                      {topic.description || 'No description'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Source: {topic.source} • {new Date(topic.fetchedAt).toLocaleString()}
                    </p>
                  </div>
                  
                  {!topic.used && (
                    <button
                      className="btn btn-primary"
                      onClick={() => triggerMutation.mutate(topic.id)}
                      disabled={triggerMutation.isPending}
                    >
                      <Sparkles size={16} />
                      Generate Video
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="card">
              <p style={{ color: '#64748b', textAlign: 'center' }}>
                No trending topics yet. Click "Fetch New Trends" to get started!
              </p>
            </div>
          )}
        </div>
      )}

      {triggerMutation.isSuccess && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: '#10b981',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}>
          ✓ Video generation started!
        </div>
      )}
    </div>
  );
}

export default TrendingFeed;
