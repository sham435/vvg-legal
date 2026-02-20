import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Download, Clock, Film } from 'lucide-react';

export function VideoGallery() {
  const { data: videos, isLoading, isError } = useQuery({
    queryKey: ['videos'],
    queryFn: async () => {
      const res = await apiService.getVideos();
      return res.data;
    },
    refetchInterval: 10000, // Refresh every 10s to see new gens
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading videos...</div>;
  if (isError) return <div className="p-8 text-center text-red-500">Failed to load videos</div>;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Film className="w-6 h-6 text-purple-500" />
        Video Gallery
      </h2>
      
      {(!videos || videos.length === 0) ? (
        <div className="text-center p-12 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-400">No videos generated yet. Start the machine!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((vid: any, idx: number) => (
            <div key={idx} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-purple-500/50 transition-all shadow-lg pb-4">
              {/* Video Player or Thumbnail */}
              <div className="aspect-video bg-black relative group">
                {vid.videoUrl || vid.localPath ? (
                   <video 
                     src={vid.videoUrl || `http://localhost:3000/${vid.localPath}`} 
                     controls 
                     className="w-full h-full object-cover"
                     poster={vid.thumbnail} // If we had one
                   />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-gray-600">
                     Processing...
                   </div>
                )}
              </div>

              {/* Info */}
              <div className="px-4 pt-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-white line-clamp-2 text-sm" title={vid.prompt}>
                        {vid.prompt}
                    </h3>
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        {vid.engine}
                    </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400 mt-4">
                    <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(vid.createdAt).toLocaleTimeString()}
                    </span>
                    {vid.duration && <span>{vid.duration}s</span>}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 mt-4">
                    <a 
                        href={vid.videoUrl || vid.localPath} 
                        download 
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 py-2 rounded text-sm font-medium transition-colors"
                    >
                        <Download size={14} /> Download
                    </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
