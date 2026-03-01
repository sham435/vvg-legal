import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(maxRetries = 5, delayMs = 3000): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        
        // Verify connection with a simple query
        await this.$queryRaw`SELECT 1`;
        
        // Check SSL status
        const sslResult = await this.$queryRaw<[{ ssl: string }]>`SHOW ssl`;
        const sslEnabled = sslResult[0]?.ssl === 'on';
        
        this.logger.log(`✅ Database connected (SSL: ${sslEnabled ? 'enabled' : 'disabled'})`);
        return;
      } catch (error: any) {
        this.logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          this.logger.log(`Retrying in ${delayMs / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 1.5; // Exponential backoff
        }
      }
    }
    
    this.logger.error("❌ Database connection failed after all retries");
    throw new Error("Failed to connect to database after multiple attempts");
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
