import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { PipelineService, PipelineResult } from "./pipeline.service";
import { Article } from "../news/news.service";

@Controller("pipeline")
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post("trigger")
  @HttpCode(HttpStatus.OK)
  async triggerPipeline(@Body() article?: Article): Promise<PipelineResult> {
    return this.pipelineService.runPipeline(article);
  }
}
