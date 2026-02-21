import { Module } from "@nestjs/common";
import { ScriptService } from "./script.service";
import { NewsModule } from "../news/news.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [NewsModule, AiModule],
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptModule {}
