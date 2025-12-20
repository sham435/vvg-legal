import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  NotFoundException,
} from "@nestjs/common";
import { Response } from "express";
import { join } from "path";
import { existsSync } from "fs";

@Catch(NotFoundException)
export class SpaFallbackFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // If it's an API call, let it 404 naturally
    if (request.url.startsWith("/api")) {
      return response.status(404).json({
        statusCode: 404,
        message: `Cannot ${request.method} ${request.url}`,
        error: "Not Found",
      });
    }

    // For everything else, serve index.html (SPA Fallback)
    // __dirname in dist/src/common/filters -> ../../../../.. -> root -> frontend/dist
    const indexHtml = join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "frontend",
      "dist",
      "index.html",
    );

    if (existsSync(indexHtml)) {
      return response.sendFile(indexHtml);
    }

    // Fallback using CWD - assume we are in project root
    const cwdIndex = join(process.cwd(), "frontend", "dist", "index.html");
    if (existsSync(cwdIndex)) {
      return response.sendFile(cwdIndex);
    }

    // If absolutely can't find it, return 404
    return response.status(404).send("SPA Index Not Found");
  }
}
