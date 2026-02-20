import { useState } from 'react';
import { apiService } from '../services/api';
import { Wand2, Loader2 } from 'lucide-react';

export function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    
    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      await apiService.generateVideo(prompt, 5); // Default 5s
      setSuccess(true);
      setPrompt('');
      // We rely on VideoGallery polling to show the new video
    } catch (err: any) {
      setError(err.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl mb-8">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
        <Wand2 className="w-5 h-5 text-purple-400" />
        Manual Generator
      </h2>
      
      <div className="flex flex-col gap-4">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your viral video idea... (e.g., 'A cyberpunk city at night with neon rain')"
          className="w-full bg-gray-950 border border-gray-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none min-h-[100px] resize-none"
        />
        
        <div className="flex justify-between items-center">
            {error && <span className="text-red-400 text-sm">{error}</span>}
            {success && <span className="text-green-400 text-sm">Request queued successfully!</span>}
            {!error && !success && <span></span>} {/* Spacer */}

            <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                    isGenerating || !prompt 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg hover:shadow-purple-500/25'
                }`}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Wand2 className="w-4 h-4" />
                        Generate Video
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
}
