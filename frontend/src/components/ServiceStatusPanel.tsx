import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Globe, Github, Youtube, Facebook } from 'lucide-react';

const COG_API = 'http://localhost:7861';

interface StatusItem {
    status: string;
    last_checked: string | null;
}

interface ServiceStatus {
    [key: string]: StatusItem;
}

export default function ServiceStatusPanel() {
    const [status, setStatus] = useState<ServiceStatus>({});
    const [loading, setLoading] = useState(false);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${COG_API}/status`);
            setStatus(res.data);
        } catch (error) {
            console.error("Failed to fetch status", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const getIcon = (key: string) => {
        switch (key) {
            case 'news_api': return <Globe className="w-5 h-5" />;
            case 'git': return <Github className="w-5 h-5" />;
            case 'youtube': return <Youtube className="w-5 h-5" />;
            case 'meta': return <Facebook className="w-5 h-5" />;
            default: return <Activity className="w-5 h-5" />;
        }
    };

    const getStatusColor = (s: string) => {
        if (s === 'online') return 'text-green-600 bg-green-50';
        if (s === 'offline') return 'text-red-600 bg-red-50';
        return 'text-yellow-600 bg-yellow-50';
    };

    const getStatusIcon = (s: string) => {
        if (s === 'online') return <CheckCircle className="w-4 h-4" />;
        if (s === 'offline') return <XCircle className="w-4 h-4" />;
        return <AlertCircle className="w-4 h-4" />;
    };

    const formatName = (key: string) => {
        return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Service Monitor</h3>
                <button 
                    onClick={fetchStatus} 
                    className={`p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors ${loading ? 'animate-spin' : ''}`}
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(status).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-white shadow-sm text-gray-600`}>
                                {getIcon(key)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">{formatName(key)}</p>
                                <p className="text-xs text-gray-500">
                                    {val.last_checked ? new Date(val.last_checked).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never'}
                                </p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(val.status)}`}>
                            {getStatusIcon(val.status)}
                            <span className="capitalize">{val.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

import { Activity } from 'lucide-react';
