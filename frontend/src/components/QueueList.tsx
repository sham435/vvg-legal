import { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowUp, X, List, Clock } from 'lucide-react';
import { Video } from '../types';

const COG_API = 'http://localhost:7861';

export default function QueueList() {
    const [queue, setQueue] = useState<Video[]>([]);

    const fetchQueue = async () => {
        try {
            const res = await axios.get(`${COG_API}/videos`);
            const allVideos: Video[] = res.data;
            // Filter only queued and sort by created_at
            const queued = allVideos
                .filter(v => v.status === 'queued')
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            
            setQueue(queued);
        } catch (error) {
            console.error("Failed to fetch queue", error);
        } finally {
            // setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 3000); // Poll faster for queue
        return () => clearInterval(interval);
    }, []);

    const handlePromote = async (filename: string) => {
        try {
            await axios.post(`${COG_API}/queue/promote`, { filename });
            fetchQueue();
        } catch (e) {
            alert("Failed to promote job");
        }
    };

    const handleCancel = async (filename: string) => {
        if (!confirm("Remove this job from queue?")) return;
        try {
            await axios.post(`${COG_API}/queue/cancel`, { filename });
            fetchQueue();
        } catch (e) {
            alert("Failed to cancel job");
        }
    };

    if (queue.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center text-gray-400 gap-2">
                <List className="w-5 h-5" />
                <span>Queue is empty</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Pending Jobs ({queue.length})
                </h3>
            </div>
            
            <div className="divide-y divide-gray-100">
                {queue.map((job, index) => (
                    <div key={job.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full font-bold text-gray-500 text-xs">
                                #{index + 1}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 truncate max-w-md">{job.prompt}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{job.engine}</span>
                                    <span>•</span>
                                    <span>{job.frames} frames</span>
                                    <span>•</span>
                                    <span>{new Date(job.created_at).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {index > 0 && (
                                <button 
                                    onClick={() => handlePromote(job.filename)}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    title="Move to Top"
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </button>
                            )}
                            <button 
                                onClick={() => handleCancel(job.filename)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Cancel Job"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
