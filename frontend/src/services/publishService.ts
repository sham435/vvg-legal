export interface PublishStatus {
  lastUpdated: string;
  videos: VideoPublishStatus[];
}

export interface VideoPublishStatus {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  publishLogs: PublishLog[];
}

export interface PublishLog {
  id: string;
  platform: string;
  status: string;
  errorMessage?: string;
  publishedAt?: string;
}

export interface CredentialsStatus {
  youtube: boolean;
  tiktok: boolean;
  instagram: boolean;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const publishService = {
  async getStatus(): Promise<PublishStatus> {
    const response = await fetch(`${API_URL}/publish/status`);
    if (!response.ok) throw new Error('Failed to fetch publish status');
    return response.json();
  },

  async getCredentials(): Promise<CredentialsStatus> {
    const response = await fetch(`${API_URL}/publish/credentials`);
    if (!response.ok) throw new Error('Failed to fetch credentials status');
    return response.json();
  },

  async retryUpload(videoId: string): Promise<void> {
    const response = await fetch(`${API_URL}/publish/${videoId}/retry`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to retry upload');
  },

  async updateMetadata(videoId: string, data: { title?: string; description?: string; tags?: string[] }): Promise<void> {
    const response = await fetch(`${API_URL}/publish/${videoId}/metadata`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update metadata');
  },
};
