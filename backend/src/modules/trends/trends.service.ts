import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { PrismaService } from "../../common/prisma/prisma.service";

interface TrendingNewsItem {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
}

@Injectable()
export class TrendsService {
  private readonly logger = new Logger(TrendsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Fetch trending topics from NewsAPI
   */
  async fetchFromNewsAPI(): Promise<TrendingNewsItem[]> {
    try {
      const apiKey = this.config.get<string>("NEWS_API_KEY");
      if (!apiKey) {
        this.logger.warn("NEWS_API_KEY not configured");
        return [];
      }

      const response = await axios.get("https://newsapi.org/v2/top-headlines", {
        params: {
          country: "us",
          pageSize: 10,
          apiKey,
        },
      });

      return response.data.articles.map((article: any) => ({
        title: article.title,
        description: article.description || "",
        source: "newsapi",
        url: article.url,
        publishedAt: article.publishedAt,
      }));
    } catch (error) {
      this.logger.error("Failed to fetch from NewsAPI", error);
      return [];
    }
  }

  /**
   * Calculate viral potential score for a topic
   */
  private calculateViralScore(topic: TrendingNewsItem): number {
    let score = 50; // Base score

    // Keywords that increase viral potential
    const viralKeywords = [
      "shocking",
      "incident",
      "dramatic",
      "breaking",
      "viral",
      "trending",
      "amazing",
      "unbelievable",
      "caught on camera",
      "dubai",
      "celebrity",
      "accident",
      "rescue",
      "miracle",
    ];

    const titleLower = topic.title.toLowerCase();
    const descLower = (topic.description || "").toLowerCase();

    viralKeywords.forEach((keyword) => {
      if (titleLower.includes(keyword) || descLower.includes(keyword)) {
        score += 10;
      }
    });

    // Shorter titles tend to be more clickable
    if (topic.title.length < 60) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Save trending topics to database
   */
  async saveTrendingTopics(): Promise<number> {
    const topics = await this.fetchFromNewsAPI();

    if (topics.length === 0) {
      this.logger.warn("No trending topics fetched");
      return 0;
    }

    let savedCount = 0;

    for (const topic of topics) {
      try {
        // Check if already exists
        const existing = await this.prisma.trendingTopic.findFirst({
          where: {
            title: topic.title,
            source: topic.source,
          },
        });

        if (!existing) {
          await this.prisma.trendingTopic.create({
            data: {
              title: topic.title,
              description: topic.description,
              source: topic.source,
              url: topic.url,
              score: this.calculateViralScore(topic),
              category: "news",
            },
          });
          savedCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to save topic: ${topic.title}`, error);
      }
    }

    this.logger.log(`Saved ${savedCount} new trending topics`);
    return savedCount;
  }

  /**
   * Get best unused trending topic
   */
  async getBestUnusedTopic() {
    return this.prisma.trendingTopic.findFirst({
      where: {
        used: false,
      },
      orderBy: [{ score: "desc" }, { fetchedAt: "desc" }],
    });
  }

  /**
   * Mark topic as used
   */
  async markTopicAsUsed(topicId: string) {
    return this.prisma.trendingTopic.update({
      where: { id: topicId },
      data: { used: true },
    });
  }

  /**
   * Get all trending topics (for dashboard)
   */
  async getAllTopics(limit = 20, includeUsed = false) {
    return this.prisma.trendingTopic.findMany({
      where: includeUsed ? {} : { used: false },
      orderBy: [{ score: "desc" }, { fetchedAt: "desc" }],
      take: limit,
    });
  }
}
