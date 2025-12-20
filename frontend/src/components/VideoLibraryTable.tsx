import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, RefreshCw, Download, CheckCircle, XCircle, Maximize2, X } from 'lucide-react';
import { Video as VideoType } from '../types';
import { apiService } from '../services/api';

const COG_API = 'http://localhost:7861';
const SVD_API = 'http://localhost:7860';

export default function VideoLibraryTable() {
    const [videos, setVideos] = useState<VideoType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);

    const fetchVideos = async () => {
        try {
            // Fetch from NestJS backend
            const res = await apiService.getVideos();
            setVideos(res.data);
        } catch (error) {
            console.error("Failed to fetch videos", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideos();
        const interval = setInterval(fetchVideos, 5000); // Poll for updates
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (filename: string) => {
        if (!confirm("Delete this video?")) return;
        try {
            await axios.post(`${COG_API}/delete_video`, { filename });
            fetchVideos();
            if (selectedVideo?.filename === filename) setSelectedVideo(null);
        } catch (e) {
            alert("Failed to delete");
        }
    };

    const handleRegenerate = async (video: VideoType) => {
        try {
            const api = video.engine === 'svd' ? SVD_API : COG_API;
            await axios.post(`${api}/regenerate`, { filename: video.filename });
            alert(`Regeneration started on ${video.engine}`);
            fetchVideos();
        } catch (e) {
            alert("Failed to regenerate");
        }
    };

    const toggleApproval = async (video: VideoType) => {
        const newStatus = !video.is_approved;
        try {
            await apiService.updateVideo(video.filename, { is_approved: newStatus });
            // Optimistic update
            setVideos(prev => prev.map(v => v.filename === video.filename ? { ...v, is_approved: newStatus } : v));
            if (selectedVideo?.filename === video.filename) {
                setSelectedVideo(prev => prev ? { ...prev, is_approved: newStatus } : null);
            }
        } catch (e) {
            alert("Failed to update status");
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Video Library</h2>
                <button onClick={fetchVideos} className="p-2 hover:bg-gray-100 rounded-lg">
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600 font-medium">
                        <tr>
                            <th className="px-6 py-4">Preview</th>
                            <th className="px-6 py-4">Prompt / Source</th>
                            <th className="px-6 py-4">Engine</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Scheduled</th>
                            <th className="px-6 py-4">Created</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {videos.map((video) => (
                            <tr key={video.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="w-24 h-14 bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer"
                                         onClick={() => video.status === 'completed' && setSelectedVideo(video)}>
                                        {video.status === 'completed' ? (
                                             <div className="w-full h-full relative">
                                                <video 
                                                    src={`${COG_API}/outputs/${video.filename}`} 
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition flex items-center justify-center">
                                                    <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition" />
                                                </div>
                                             </div>
                                        ) : video.status === 'failed' ? (
                                            <div className="w-full h-full flex items-center justify-center bg-red-50 group-hover:bg-red-100 transition-colors">
                                                <XCircle className="w-6 h-6 text-red-400" />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-medium text-gray-900 truncate max-w-xs">{video.prompt}</p>
                                    <p className="text-xs text-gray-500">{video.frames} frames</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${video.engine === 'cogvideox' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {video.engine}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${video.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                          video.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {video.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {video.status === 'completed' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleApproval(video); }}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border
                                                ${video.is_approved 
                                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            {video.is_approved ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                            {video.is_approved ? 'Enabled' : 'Disabled'}
                                        </button>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-xs">
                                    {new Date(video.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => handleDelete(video.filename)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {videos.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    No videos generated yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Manual Check Player Modal */}
            {selectedVideo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedVideo(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="relative aspect-video bg-black">
                            <video 
                                src={`${COG_API}/outputs/${selectedVideo.filename}`} 
                                controls 
                                autoPlay 
                                className="w-full h-full"
                            />
                            <button 
                                onClick={() => setSelectedVideo(null)}
                                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Video Preview</h3>
                                    <p className="text-gray-600 font-medium">{selectedVideo.prompt}</p>
                                    <p className="text-sm text-gray-400 mt-1">Generated by {selectedVideo.engine} • {selectedVideo.frames} frames</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <a 
                                        href={`${COG_API}/outputs/${selectedVideo.filename}`} 
                                        download 
                                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm transition"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium text-gray-500">Scheduling Status:</span>
                                    <button 
                                        onClick={() => toggleApproval(selectedVideo)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                                            ${selectedVideo.is_approved 
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        {selectedVideo.is_approved ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        {selectedVideo.is_approved ? 'Enabled for Scheduling' : 'Disabled / Review Needed'}
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={() => handleRegenerate(selectedVideo)}
                                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium text-sm transition"
                                    >
                                        Regenerate
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(selectedVideo.filename)}
                                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm transition"
                                    >
                                        Delete Video
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
