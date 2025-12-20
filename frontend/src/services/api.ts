import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
    
  updateVideo: (filename: string, updates: any) =>
    api.post('/scheduler/video/update', { filename, updates }),

  // Analytics
  getDashboardStats: () => api.get('/analytics/dashboard'),
  
  getAnalyticsByPlatform: () => api.get('/analytics/by-platform'),
  
  getRecentVideos: () => api.get('/analytics/recent-videos'),
  
  syncAnalytics: () => api.post('/analytics/sync'),

  // Videos
  getVideos: () => api.get('/video'),
  
  publishVideo: (videoId: string, platforms: string[]) =>
    api.post('/upload', { videoId, platforms }),

  // Settings
  settings: {
    get: async () => {
      const response = await api.get('/settings');
      return response.data;
    },
    update: async (settings: any) => {
      const response = await api.put('/settings', settings);
      return response.data;
    },
    toggleService: (service: string, enabled: boolean) => api.post('/settings/toggle-service', { service, enabled }),
    testConnection: (service: string) => 
      api.post('/settings/test-connection', { service }),
    getApiKeys: () => api.get('http://localhost:3000/api-keys'),
    updateApiKeys: (keys: Record<string, string>) => api.post('/settings/keys', keys),
  },
  system: {
    getStatus: async () => {
        const response = await api.get('/system/status');
        return response.data;
    },
    control: async (target: string, action: 'start' | 'stop' | 'restart') => {
        const response = await api.post('/system/control', { target, action });
        return response.data;
    },
    startAll: async () => {
        const response = await api.post('/system/start-all');
        return response.data;
    },
    stopAll: async () => {
        const response = await api.post('/system/stop-all');
        return response.data;
    },
    restartAll: () => api.post('/system/restart-all'),
  },
  
  marketing: {
    getOverview: () => api.get('http://localhost:3000/marketing/overview'),
    getCalendar: () => api.get('http://localhost:5173/marketing/calendar'),
    getAccounts: () => api.get('/marketing/accounts'),
    toggleAccount: (platform: string) => api.post(`/marketing/accounts/${platform}/toggle`),
  },

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

export default apiService;
