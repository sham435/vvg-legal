export interface Video {
    id: string;
    filename: string;
    prompt: string;
    frames: number;
    status: 'generating' | 'completed' | 'failed' | 'queued' | 'cancelled';
    engine: 'cogvideox' | 'svd' | 'luma' | 'runway';
    created_at: string;
    is_approved?: boolean;
    error?: string;
    params?: any;
}

export interface ProgressState {
    status: string;
    current_step: number;
    total_steps: number;
    percentage: number;
}
