import { useState, useEffect } from 'react';
import { Save, RefreshCw, Eye, EyeOff, Key } from 'lucide-react';
import api from '../services/api';

export default function ApiKeys() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await api.settings.getApiKeys();
      setKeys(response.data.data || {});
    } catch (error) {
      console.error('Failed to load keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Only send keys that have values and are strictly not masked (if we were editing masked ones)
      // But here we are just sending the current state. 
      // Note: If the user didn't edit a masked key, we shouldn't send it back effectively?
      // Actually the backend just updates what we send. 
      // If we send "sk-***...", the backend might save that literally if we aren't careful?
      // The current UI shows masked values. If user saves, we should only send CHANGED values.
      // For now, let's assume the user edits the field to a NEW value.
      
      const payload: Record<string, string> = {};
      Object.entries(keys).forEach(([k, v]) => {
          if (!v.includes('***')) {
              payload[k] = v;
          }
      });

      if (Object.keys(payload).length > 0) {
        await api.settings.updateApiKeys(payload);
        await loadKeys(); // Reload to get fresh masked values
        alert('Settings saved successfully!');
      } else {
        alert('No changes to save (masked keys are ignored).');
      }

    } catch (error) {
      console.error('Failed to save keys:', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleShow = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Key className="w-6 h-6" />
          API Configuration
        </h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid gap-6">
        {Object.entries(keys).map(([key, value]) => (
          <div key={key} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">{key}</label>
            <div className="relative">
              <input
                type={showKeys[key] ? "text" : "password"}
                value={value}
                onChange={(e) => setKeys(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
              />
              <button
                onClick={() => toggleShow(key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
        {Object.keys(keys).length === 0 && (
            <div className="text-gray-500 text-center py-10">No API Keys found in .env</div>
        )}
      </div>
    </div>
  );
}
