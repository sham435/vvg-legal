export interface VideoGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  resolution?: string;
  style?: string;
  mood?: string;
  cameraMovement?: string;
  lighting?: string;
  cfgScale?: number;
  steps?: number;
  aspectRatio?: string;
}

export interface VideoEngineResponse {
  success: boolean;
  videoUrl?: string;
  error?: string;
  metadata?: {
    jobId?: string;
    engine?: string;
    engineUsed?: string;
    duration?: number;
    [key: string]: any;
  };
}

export interface VideoJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  videoUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  engine: string;
}
