import { Controller, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { PipelineService, PipelineResult } from "./pipeline.service";

@Controller("pipeline")
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post("trigger")
  @HttpCode(HttpStatus.OK)
  async triggerPipeline(): Promise<PipelineResult> {
    return this.pipelineService.runPipeline();
  }
}
