import { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Zap } from 'lucide-react';
import { ProgressState } from '../types';

const COG_API = 'http://localhost:7861';

export default function LiveStatusPanel() {
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await axios.get(`${COG_API}/progress`);
                setProgress(res.data);
                setError(false);
            } catch (e) {
                setError(true);
            }
        };
        
        fetchProgress();
        const interval = setInterval(fetchProgress, 1000);
        return () => clearInterval(interval);
    }, []);

    if (error) {
        return (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 rounded-lg">
                        <Activity className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">System Offline</h3>
                        <p className="text-sm text-gray-500">Backend not reachable</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!progress) return null;

    const isGenerating = progress.status === 'generating';

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${isGenerating ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                        <Zap className={`w-6 h-6 ${isGenerating ? 'text-indigo-600 animate-pulse' : 'text-gray-500'}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">CogVideoX Status</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                             {progress.status.toUpperCase()}
                             {isGenerating && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
                        </p>
                    </div>
                </div>
                {isGenerating && (
                    <div className="text-right">
                        <span className="text-2xl font-bold text-indigo-600">{progress.percentage}%</span>
                        <p className="text-xs text-gray-500">Step {progress.current_step} / {progress.total_steps}</p>
                    </div>
                )}
            </div>
            
            {isGenerating && (
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
            )}
        </div>
    );
}
