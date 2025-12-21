import { useState, useEffect } from 'react';
import { Upload, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { publishService, PublishStatus, CredentialsStatus } from '../services/publishService';
import './Dashboard.css'; // Reusing dashboard styles for consistency

export default function PublishDashboard() {
  const [status, setStatus] = useState<PublishStatus | null>(null);
  const [credentials, setCredentials] = useState<CredentialsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [statusData, credentialsData] = await Promise.all([
        publishService.getStatus(),
        publishService.getCredentials(),
      ]);
      setStatus(statusData);
      setCredentials(credentialsData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (videoId: string) => {
    try {
      await publishService.retryUpload(videoId);
      await fetchData(); // Refresh immediately
      alert('Retry triggered successfully');
    } catch (error) {
      alert('Failed to trigger retry');
    }
  };

  if (loading && !status) return <div className="p-8">Loading...</div>;

  return (
    <div className="dashboard-container">
      <div className="header-actions">
        <h1>Publishing Dashboard</h1>
        <button 
          className="refresh-btn" 
          onClick={fetchData} 
          disabled={refreshing}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Credentials Status Card */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-header">
            <h3>Credentials Status</h3>
          </div>
          <div className="credentials-list" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <div className="credential-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {credentials?.youtube ? <CheckCircle color="green" /> : <XCircle color="red" />}
              <span>YouTube</span>
            </div>
            <div className="credential-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {credentials?.tiktok ? <CheckCircle color="green" /> : <XCircle color="red" />}
              <span>TikTok</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Videos Table */}
      <div className="content-section">
        <h2>Recent Videos</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {status?.videos.map((video) => (
                video.publishLogs.length > 0 ? (
                  video.publishLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(video.createdAt).toLocaleDateString()}</td>
                      <td title={video.title}>{video.title.substring(0, 40)}{video.title.length > 40 ? '...' : ''}</td>
                      <td>{log.platform}</td>
                      <td>
                        <span className={`status-badge status-${log.status.toLowerCase()}`}>
                          {log.status}
                        </span>
                        {log.errorMessage && (
                          <div style={{ fontSize: '0.8em', color: 'red', marginTop: '4px' }}>
                            {log.errorMessage}
                          </div>
                        )}
                      </td>
                      <td>
                        {(log.status === 'FAILED' || log.status === 'PENDING') && (
                          <button 
                            className="action-btn"
                            onClick={() => handleRetry(video.id)}
                            title="Retry Upload"
                          >
                            <Upload size={16} /> Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr key={video.id}>
                     <td>{new Date(video.createdAt).toLocaleDateString()}</td>
                     <td title={video.title}>{video.title.substring(0, 40)}{video.title.length > 40 ? '...' : ''}</td>
                     <td>-</td>
                     <td>No Logs</td>
                     <td>
                        <button 
                            className="action-btn"
                            onClick={() => handleRetry(video.id)}
                            title="Force Upload"
                          >
                            <Upload size={16} /> Force Upload
                          </button>
                     </td>
                  </tr>
                )
              ))}
              {status?.videos.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No videos found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
