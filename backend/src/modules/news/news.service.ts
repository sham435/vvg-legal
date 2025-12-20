import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { AxiosResponse } from "axios";
import { map, firstValueFrom } from "rxjs";

export interface Article {
  title: string;
  description: string;
  url: string;
  content?: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.apiKey = this.config.get<string>("NEWS_API_KEY");
    this.endpoint = this.config.get<string>("NEWS_API_ENDPOINT");
    if (!this.apiKey) {
      throw new Error("NEWS_API_KEY not configured");
    }
    if (!this.endpoint) {
      throw new Error("NEWS_API_ENDPOINT not configured");
    }
  }

  async fetchTopHeadlines(
    country: string = "us",
    category?: string,
  ): Promise<Article[]> {
    const params: any = { apiKey: this.apiKey, country };
    if (category) params.category = category;
    try {
      const response$: Promise<AxiosResponse<any>> = firstValueFrom(
        this.http.get(this.endpoint, { params }).pipe(map((res) => res)),
      );
      const { data } = await response$;
      if (!data || !data.articles) {
        this.logger.warn("No articles returned from News API");
        return [];
      }
      return data.articles.map((a: any) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        content: a.content,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch news", error);
      throw error;
    }
  }
}
