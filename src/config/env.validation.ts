import { plainToInstance } from "class-transformer";
import { IsString, IsNumber, IsOptional, validateSync, IsNotEmpty, MinLength } from "class-validator";

class EnvironmentVariables {
  @IsString()
  @IsOptional()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  @MinLength(1, { message: "JWT_SECRET must not be empty in production" })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  NEWS_API_KEY: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY: string;

  @IsString()
  @IsOptional()
  OPENROUTER_API_KEY: string;

  @IsString()
  @IsOptional()
  VEO_API_KEY: string;

  @IsString()
  @IsOptional()
  LUMA_API_KEY: string;

  @IsString()
  @IsOptional()
  RUNWAY_API_KEY: string;

  @IsString()
  @IsOptional()
  MIDJOURNEY_API_KEY: string;

  @IsString()
  @IsOptional()
  YOUTUBE_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  YOUTUBE_CLIENT_SECRET: string;

  @IsString()
  @IsOptional()
  YOUTUBE_REFRESH_TOKEN: string;

  @IsString()
  @IsOptional()
  TIKTOK_CLIENT_KEY: string;

  @IsString()
  @IsOptional()
  TIKTOK_CLIENT_SECRET: string;

  @IsString()
  @IsOptional()
  TIKTOK_ACCESS_TOKEN: string;

  @IsString()
  @IsOptional()
  INSTAGRAM_ACCESS_TOKEN: string;

  @IsString()
  @IsOptional()
  DISCORD_WEBHOOK_URL: string;

  @IsString()
  @IsOptional()
  S3_BUCKET: string;

  @IsString()
  @IsOptional()
  S3_REGION: string;

  @IsString()
  @IsOptional()
  S3_ACCESS_KEY_ID: string;

  @IsString()
  @IsOptional()
  S3_SECRET_ACCESS_KEY: string;

  @IsString()
  @IsOptional()
  NODE_ENV: string = "development";

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = "http://localhost:5173";
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      const constraints = error.constraints 
        ? Object.values(error.constraints).join(', ')
        : 'Invalid value';
      return `${error.property}: ${constraints}`;
    });
    
    throw new Error(
      `Environment validation failed:\n${errorMessages.join('\n')}`
    );
  }

  return validatedConfig;
}

export function checkRequiredSecrets(): void {
  const requiredInProduction = [
    'JWT_SECRET',
    'DATABASE_URL',
    'REDIS_HOST',
  ];

  const missing = requiredInProduction.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  // Check JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. ' +
      'Generate a strong secret with: openssl rand -base64 32'
    );
  }

  // Warn about development defaults
  if (process.env.NODE_ENV === 'production') {
    const hasDefaults = [
      'JWT_SECRET',
      'DATABASE_URL',
    ].filter(key => {
      const value = process.env[key];
      return value && (
        value.includes('your_') ||
        value.includes('changeme') ||
        value.includes('example')
      );
    });

    if (hasDefaults.length > 0) {
      console.warn(
        `⚠️  WARNING: The following variables appear to have default/example values in production: ${hasDefaults.join(', ')}`
      );
    }
  }
}
