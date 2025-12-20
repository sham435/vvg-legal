import { Module } from "@nestjs/common";
import { ScriptService } from "./script.service";
import { NewsModule } from "../news/news.module";

@Module({
  imports: [NewsModule],
  providers: [ScriptService],
  exports: [ScriptService],
})
export class ScriptModule {}
