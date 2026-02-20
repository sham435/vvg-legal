import { Catch, ArgumentsHost, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { Logger } from "@nestjs/common";

@Catch()
export class ProductionExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger("ProductionError");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Log detailed error for monitoring
    this.logger.error("Production Error:", {
      exception,
      timestamp: new Date().toISOString(),
      path: request.url,
    });

    // User-friendly response
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred. Our team has been notified.",
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.id, // Assuming request ID is middleware-driven
    });
  }
}
