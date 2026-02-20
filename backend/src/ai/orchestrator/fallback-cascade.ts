import { Injectable, Logger } from "@nestjs/common";
import { ProviderConfig } from "./intelligent-router";

@Injectable()
export class FallbackCascade {
  private readonly logger = new Logger(FallbackCascade.name);

  /**
   * Get the next best provider if the primary one fails
   */
  public getFallbackProvider(
    failedProviderName: string,
    availableProviders: ProviderConfig[],
  ): ProviderConfig | null {
    this.logger.warn(
      `Calculating fallback for failed provider: ${failedProviderName}`,
    );

    // Remove the failed provider
    const remaining = availableProviders.filter(
      (p) => p.name !== failedProviderName,
    );

    if (remaining.length === 0) {
      return null;
    }

    // Sort by reliability/quality (simplistic fallback logic for now)
    // In future this could use "latency" or "success_rate" metrics
    remaining.sort((a, b) => b.qualityScore - a.qualityScore);

    const fallback = remaining[0];
    this.logger.log(`Fallback selected: ${fallback.name}`);
    return fallback;
  }
}
