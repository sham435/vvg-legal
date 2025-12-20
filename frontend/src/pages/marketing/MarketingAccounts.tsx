import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function MarketingAccounts() {
  const [connected, setConnected] = useState<Record<string, boolean>>({
    youtube: false,
    tiktok: false,
    instagram: false,
    facebook: false,
    twitter: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      try {
        const response = await api.marketing.getAccounts();
        setConnected(response.data);
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading accounts...</div>;

  const toggleConnection = async (platform: string) => {
    try {
      // Optimistic update
      setConnected(prev => ({ ...prev, [platform]: !prev[platform] }));
      await api.marketing.toggleAccount(platform);
    } catch (error) {
      console.error('Failed to toggle account:', error);
      // Revert on failure
      setConnected(prev => ({ ...prev, [platform]: !prev[platform] }));
    }
  };

  const accounts = [
    { id: 'youtube', name: 'YouTube', color: 'bg-red-600', icon: 'YT' },
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-600', icon: 'IG' },
    { id: 'tiktok', name: 'TikTok', color: 'bg-black', icon: 'TT' },
    { id: 'facebook', name: 'Facebook', color: 'bg-blue-600', icon: 'FB' },
    { id: 'twitter', name: 'X / Twitter', color: 'bg-gray-900', icon: 'X' },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Connected Accounts</h2>
        <p className="text-sm text-gray-500 mb-6">Manage your social media connections and permissions.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map(account => {
            const isConnected = connected[account.id];
            return (
              <div key={account.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${account.color} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                    {account.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{account.name}</h3>
                    <p className={`text-xs ${isConnected ? 'text-green-600' : 'text-gray-500'}`}>
                      {isConnected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleConnection(account.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border
                    ${isConnected 
                      ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' 
                      : 'bg-indigo-600 border-transparent text-white hover:bg-indigo-700'}`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 flex items-start gap-4">
        <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
           <Plus className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-indigo-900">Add Custom Platform</h3>
          <p className="text-sm text-indigo-700 mt-1 max-w-xl">
            Need to connect a platform not listed here? You can configure custom webhooks and API endpoints in the Developer Settings.
          </p>
          <button className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
            Configure Webhooks
          </button>
        </div>
      </div>
    </div>
  );
}
