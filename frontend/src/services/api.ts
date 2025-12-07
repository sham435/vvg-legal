import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API endpoints
export const apiService = {
  // Auth
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),

  // Trends
  fetchTrends: () => api.post('/trends/fetch'),
  getTrends: (limit?: number, includeUsed?: boolean) =>
    api.get('/trends', { params: { limit, includeUsed } }),
  
  // Scheduler
  triggerGeneration: (topicId?: string) =>
    api.post('/scheduler/trigger', { topicId }),
  
  getSchedulerSettings: () => api.get('/scheduler/settings'),
  
  updateSchedulerSettings: (settings: any) =>
    api.post('/scheduler/settings', settings),

  // Analytics
  getDashboardStats: () => api.get('/analytics/dashboard'),
  
  getAnalyticsByPlatform: () => api.get('/analytics/by-platform'),
  
  getRecentVideos: () => api.get('/analytics/recent-videos'),
  
  syncAnalytics: () => api.post('/analytics/sync'),

  // Videos
  getVideos: () => api.get('/videos'),
  
  publishVideo: (videoId: string, platforms: string[]) =>
    api.post('/upload', { videoId, platforms }),

  // Settings
  getSettings: () => api.get('/settings'),
  
  updateSettings: (settings: any) => api.post('/settings', settings),

  // YouTube
  publishToYoutube: (videoId: string) =>
    api.post('/youtube/publish', { videoId }),

  // TikTok
  publishToTiktok: (videoId: string) =>
    api.post('/tiktok/publish', { videoId }),

  // Instagram
  publishToInstagram: (videoId: string) =>
    api.post('/instagram/publish', { videoId }),
};

export default api;
