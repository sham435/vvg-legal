import { Controller, Get, Redirect } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      status: "online",
      service: "Viral Video Generator API",
      version: "1.0.0",
      documentation: "http://localhost:3000/api", // assuming Swagger is there or will be
      endpoints: ["/status", "/videos", "/ai", "/trends"],
    };
  }
}
