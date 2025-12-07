import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Power, Settings as SettingsIcon } from 'lucide-react';
import { useState } from 'react';

function Scheduler() {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['schedulerSettings'],
    queryFn: async () => {
      const response = await apiService.getSchedulerSettings();
      return response.data.data;
    },
  });

  const [localSettings, setLocalSettings] = useState({
    enableAutoGeneration: false,
    requireManualApproval: true,
  });

  const updateMutation = useMutation({
    mutationFn: (newSettings: any) => apiService.updateSchedulerSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulerSettings'] });
    },
  });

  // Update local state when data loads
  if (settings && !updateMutation.isPending) {
    if (
      localSettings.enableAutoGeneration !== settings.enableAutoGeneration ||
      localSettings.requireManualApproval !== settings.requireManualApproval
    ) {
      setLocalSettings({
        enableAutoGeneration: settings.enableAutoGeneration,
        requireManualApproval: settings.requireManualApproval,
      });
    }
  }

  const handleSave = () => {
    updateMutation.mutate(localSettings);
  };

  if (isLoading) {
    return <div className="loading">Loading settings...</div>;
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>Scheduler Settings</h1>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={24} />
          Automation Configuration
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Auto Generation Toggle */}
          <div style={{
            padding: '1.5rem',
            background: localSettings.enableAutoGeneration ? '#dcfce7' : '#fee2e2',
            borderRadius: '12px',
            border: `2px solid ${localSettings.enableAutoGeneration ? '#10b981' : '#ef4444'}`,
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <div style={{
                width: '48px',
                height: '24px',
                background: localSettings.enableAutoGeneration ? '#10b981' : '#e5e7eb',
                borderRadius: '12px',
                position: 'relative',
                transition: 'background 0.2s',
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  background: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: localSettings.enableAutoGeneration ? '26px' : '2px',
                  transition: 'left 0.2s',
                }}></div>
                <input
                  type="checkbox"
                  checked={localSettings.enableAutoGeneration}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, enableAutoGeneration: e.target.checked })
                  }
                  style={{ display: 'none' }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  <Power size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  Enable Automatic Generation
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Generate videos automatically every hour from trending topics
                </div>
              </div>
            </label>
          </div>

          {/* Manual Approval Toggle */}
          <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <div style={{
                width: '48px',
                height: '24px',
                background: localSettings.requireManualApproval ? '#6366f1' : '#e5e7eb',
                borderRadius: '12px',
                position: 'relative',
                transition: 'background 0.2s',
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  background: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: localSettings.requireManualApproval ? '26px' : '2px',
                  transition: 'left 0.2s',
                }}></div>
                <input
                  type="checkbox"
                  checked={localSettings.requireManualApproval}
                  onChange={(e) =>
                    setLocalSettings({ ...localSettings, requireManualApproval: e.target.checked })
                  }
                  style={{ display: 'none' }}
                />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  Require Manual Approval
                </div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                  Videos wait for approval before auto publishing to platforms
                </div>
              </div>
            </label>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            style={{ alignSelf: 'flex-start' }}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>

          {updateMutation.isSuccess && (
            <div style={{ padding: '1rem', background: '#dcfce7', color: '#15803d', borderRadius: '8px' }}>
              ✓ Settings saved successfully
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Scheduler;
