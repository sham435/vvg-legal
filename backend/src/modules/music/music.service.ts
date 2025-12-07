import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);
  private readonly fastApiUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    // Default to internal docker service name 'fastapi' port 8000
    // But allow override via env for local dev (e.g. localhost:8000)
    // In docker-compose, the service name 'fastapi' resolves to the IP.
    this.fastApiUrl = this.config.get<string>('MUSIC_SERVICE_URL', 'http://fastapi:8000');
  }

  async search(query: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.fastApiUrl}/search`, {
          params: { q: query },
        }),
      );
      return data;
    } catch (error) {
      this.logger.error(`Music search failed for query: ${query}`, error.message);
      // Return empty or fallback
      return { results: [], error: 'Music service unavailable' };
    }
  }

  async download(songId: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(`${this.fastApiUrl}/download/${songId}`),
      );
      return data;
    } catch (error) {
      this.logger.error(`Music download failed for ID: ${songId}`, error.message);
      throw error;
    }
  }
}
