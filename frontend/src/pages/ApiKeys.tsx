import { Key, AlertCircle } from 'lucide-react';

function ApiKeys() {
  return (
    <div>
      <div className="dashboard-header">
        <h1>API Keys Configuration</h1>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
          <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
            <strong>Security Note:</strong> API keys should be configured in the backend .env file.
            This page is for reference and connection testing only. Never expose API keys in the frontend.
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={24} />
          Required API Keys
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {[
            { name: 'NewsAPI', required: true, purpose: 'Fetch trending news' },
            { name: 'OpenAI', required: true, purpose: 'Generate video scripts' },
            { name: 'Luma Dream Machine', required: true, purpose: 'Primary video generation' },
            { name: 'Runway Gen-3', required: false, purpose: 'Fallback video generation' },
            { name: 'Midjourney/Ideogram', required: false, purpose: 'Thumbnail generation' },
            { name: 'YouTube Data API', required: true, purpose: 'Upload to YouTube' },
            { name: 'TikTok API', required: false, purpose: 'Upload to TikTok' },
            { name: 'Instagram Graph API', required: false, purpose: 'Upload to Instagram' },
            { name: 'Discord Webhook', required: false, purpose: 'Notifications' },
          ].map((api) => (
            <div
              key={api.name}
              style={{
                padding: '1.25rem',
                background: '#f8fafc',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>
                  {api.name}
                  {api.required && (
                    <span style={{
                      marginLeft: '0.5rem',
                      padding: '0.125rem 0.5rem',
                      background: '#fee2e2',
                      color: '#991b1b',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>
                      REQUIRED
                    </span>
                  )}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{api.purpose}</p>
              </div>
              <button className="btn" style={{ background: '#e5e7eb', color: '#374151' }}>
                Test Connection
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.875rem', color: '#1e40af' }}>
            📝 <strong>Setup Guide:</strong> Edit <code>/backend/.env</code> file with your API keys.
            Use the <code>.env.example</code> as a template.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ApiKeys;
