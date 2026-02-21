import { Module } from "@nestjs/common";
import { VyroService } from "./vyro.service";

@Module({
  providers: [VyroService],
  exports: [VyroService],
})
export class VyroModule {}
