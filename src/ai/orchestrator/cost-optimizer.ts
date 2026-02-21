import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class CostOptimizer {
  private readonly logger = new Logger(CostOptimizer.name);
  private dailyBudget: number = 0; // STACK ALLOCATION: $0
  private currentSpend: number = 0;

  constructor() {}

  /**
   * Check if a generation request is within budget
   */
  public canAfford(estimatedCost: number): boolean {
    // Strict $0 constraint: Only allow if estimated cost is exactly 0
    if (this.dailyBudget === 0 && estimatedCost > 0) {
      this.logger.warn(
        `Zero Budget Constraint Active! Request cost $${estimatedCost} rejected.`,
      );
      return false;
    }

    if (this.currentSpend + estimatedCost > this.dailyBudget) {
      this.logger.warn(
        `Budget exceeded! Daily: ${this.dailyBudget}, Current: ${this.currentSpend}, Request: ${estimatedCost}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Record spending after generation
   */
  public recordSpend(cost: number) {
    this.currentSpend += cost;
    if (cost > 0) {
      this.logger.warn(
        `Alert: Spent $${cost} despite $0 budget! Check provider configuration.`,
      );
    }
    this.logger.debug(
      `Recorded spend: $${cost}. Total today: $${this.currentSpend}`,
    );
  }

  /**
   * Get dynamic cost constraint for a request
   * Returns a max cost per unit to guide the router
   */
  public getOptimizationConstraint(): number {
    if (this.dailyBudget === 0) {
      return 0; // Strict 0 limit
    }

    const budgetRemaining = this.dailyBudget - this.currentSpend;
    if (budgetRemaining < this.dailyBudget * 0.2) {
      return 0.01;
    }
    return Infinity;
  }
}
