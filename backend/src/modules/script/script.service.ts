import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NewsService, Article } from '../news/news.service';

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);
  private readonly openAiKey: string;

  constructor(private readonly config: ConfigService, private readonly newsService: NewsService) {
    this.openAiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!this.openAiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
  }

  /**
   * Generate a concise video script from a news article.
   * The script is a short paragraph (~30‑60 words) suitable for feeding into a video generation model.
   */
  async generateScriptFromArticle(article: Article): Promise<string> {
    const prompt = `Write a short, engaging video script (30-60 words) based on the following news article. Include a hook, the main point, and a call‑to‑action.\n\nTitle: ${article.title}\nDescription: ${article.description}\nContent: ${article.content ?? ''}`;
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openAiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const result = response.data?.choices?.[0]?.message?.content?.trim();
      return result || '';
    } catch (error) {
      this.logger.error('Failed to generate script via OpenAI', error);
      throw error;
    }
  }
}
